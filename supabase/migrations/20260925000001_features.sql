-- Round two: streak bonuses, appeals, coupons, special days, iCloud album link, push
-- notifications and milestone badges. Secrets (VAPID keys, push secret) live in Vault and
-- are created outside migrations so they never reach git.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- Tables and columns
-- ---------------------------------------------------------------------------

-- Streak bonuses: one per Sydney day, e.g. 'streak:2026-09-25'.
alter table public.transactions add column bonus_key text unique;

-- Coupons: claimed -> used (Nikita is cashing it in, maybe on a date) -> delivered.
alter table public.redemptions drop constraint redemptions_status_check;
alter table public.redemptions
  add constraint redemptions_status_check check (status in ('claimed', 'used', 'delivered')),
  add column used_at timestamptz,
  add column scheduled_for date;

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 100),
  from_level text not null check (from_level in ('good_boy', 'ok_boy', 'thin_ice', 'bad_boy')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  reply text check (reply is null or char_length(reply) <= 80),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index appeals_one_pending on public.appeals ((true)) where status = 'pending';
create index appeals_created_by_idx on public.appeals (created_by);
create index appeals_created_at_idx on public.appeals (created_at desc);

create table public.special_days (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  kind text not null default 'other'
    check (kind in ('birthday_jagath', 'birthday_nikita', 'anniversary', 'first_talk', 'first_date', 'other')),
  month integer not null check (month between 1 and 12),
  day integer not null check (day between 1 and 31),
  year integer check (year is null or year between 1990 and 2100),
  created_at timestamptz not null default now()
);

insert into public.special_days (name, kind, month, day, year) values
  ('Jagath''s birthday', 'birthday_jagath', 3, 2, 2010),
  ('Nikita''s birthday', 'birthday_nikita', 12, 11, 2009),
  ('Our anniversary', 'anniversary', 7, 16, 2026),
  ('First time we talked', 'first_talk', 1, 22, 2026),
  ('Our first date', 'first_date', 7, 9, 2026);

-- Small shared settings edited in the app (the iCloud shared album link).
create table public.app_settings (
  key text primary key check (key in ('icloud_album')),
  value text check (value is null or char_length(value) <= 300),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Badges each person has already celebrated.
alter table public.seen add column badges_seen text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.appeals enable row level security;
alter table public.special_days enable row level security;
alter table public.app_settings enable row level security;
alter table public.push_subscriptions enable row level security;
revoke all on public.appeals, public.special_days, public.app_settings, public.push_subscriptions from anon;

create policy "members read appeals" on public.appeals
  for select to authenticated using ((select public.my_role()) is not null);
create policy "jagath makes appeals" on public.appeals
  for insert to authenticated
  with check ((select public.my_role()) = 'jagath' and created_by = (select auth.uid()) and status = 'pending');

create policy "members read special days" on public.special_days
  for select to authenticated using ((select public.my_role()) is not null);
create policy "members add special days" on public.special_days
  for insert to authenticated with check ((select public.my_role()) is not null);
create policy "members edit special days" on public.special_days
  for update to authenticated
  using ((select public.my_role()) is not null)
  with check ((select public.my_role()) is not null);
create policy "members delete special days" on public.special_days
  for delete to authenticated using ((select public.my_role()) is not null);

create policy "members read settings" on public.app_settings
  for select to authenticated using ((select public.my_role()) is not null);
create policy "members add settings" on public.app_settings
  for insert to authenticated with check ((select public.my_role()) is not null);
create policy "members edit settings" on public.app_settings
  for update to authenticated
  using ((select public.my_role()) is not null)
  with check ((select public.my_role()) is not null);

create policy "read own push subscriptions" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "delete own push subscriptions" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Streaks and adding points
-- ---------------------------------------------------------------------------

-- Days in a row (Sydney time) with points added. A streak is still alive until the end of
-- the day after its last day.
create or replace function public.streak_info()
returns table (current_streak integer, best_streak integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with days as (
    select distinct (created_at at time zone 'Australia/Sydney')::date as d
    from public.transactions where type = 'earn'
  ), runs as (
    select max(d) as last_day, count(*)::integer as n
    from (select d, d - (row_number() over (order by d))::integer as grp from days) g
    group by grp
  )
  select
    coalesce((select n from runs
              where last_day >= (now() at time zone 'Australia/Sydney')::date - 1
              order by last_day desc limit 1), 0),
    coalesce((select max(n) from runs), 0);
$$;

-- Adds points and, when today makes a 3, 7, 14, 30, 60, 100 or 365 day streak, a bonus.
create or replace function public.add_points(p_label text, p_points integer, p_note text default null)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_streak integer;
  v_bonus integer;
  v_bonus_id uuid;
  v_day date := (now() at time zone 'Australia/Sydney')::date;
begin
  if public.my_role() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  insert into public.transactions (type, points, label, note, added_by)
  values ('earn', p_points, trim(p_label), nullif(trim(coalesce(p_note, '')), ''), (select auth.uid()))
  returning id into v_id;

  select current_streak into v_streak from public.streak_info();
  v_bonus := case v_streak
    when 3 then 5 when 7 then 20 when 14 then 40 when 30 then 100
    when 60 then 150 when 100 then 250 when 365 then 500 else 0 end;

  if v_bonus > 0 then
    insert into public.transactions (type, points, label, added_by, bonus_key)
    values ('earn', v_bonus, v_streak || ' day streak bonus', (select auth.uid()), 'streak:' || v_day)
    on conflict (bonus_key) do nothing
    returning id into v_bonus_id;
  end if;

  return json_build_object(
    'id', v_id,
    'bonus_id', v_bonus_id,
    'bonus_points', case when v_bonus_id is null then 0 else v_bonus end,
    'streak', v_streak
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Coupons and appeals
-- ---------------------------------------------------------------------------

create or replace function public.use_coupon(p_id uuid, p_date date default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.my_role() is distinct from 'nikita' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.redemptions
  set status = 'used', used_at = now(), scheduled_for = p_date
  where id = p_id and status = 'claimed';
  if not found then
    raise exception 'coupon_not_ready' using errcode = 'P0002';
  end if;
end;
$$;

-- Nikita accepts (Jagath moves up one level) or denies an appeal. Returns the new level.
create or replace function public.decide_appeal(p_id uuid, p_accept boolean, p_reply text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
  v_target text;
  v_reply text := nullif(trim(coalesce(p_reply, '')), '');
begin
  if public.my_role() is distinct from 'nikita' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.appeals
  set status = case when p_accept then 'accepted' else 'denied' end, reply = v_reply, decided_at = now()
  where id = p_id and status = 'pending';
  if not found then
    raise exception 'appeal_gone' using errcode = 'P0002';
  end if;

  if not p_accept then
    return null;
  end if;

  select level into v_current from public.behaviour_levels order by created_at desc limit 1;
  v_target := case coalesce(v_current, 'good_boy')
    when 'bad_boy' then 'thin_ice'
    when 'thin_ice' then 'ok_boy'
    else 'good_boy' end;
  if v_target is distinct from v_current then
    insert into public.behaviour_levels (level, note, set_by)
    values (v_target, coalesce(v_reply, 'Appeal accepted'), (select auth.uid()));
  end if;
  return v_target;
end;
$$;

-- ---------------------------------------------------------------------------
-- Push notifications
-- ---------------------------------------------------------------------------

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.my_role() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- A phone can only belong to one of us at a time.
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth);
end;
$$;

-- Public VAPID key the phones subscribe with.
create or replace function public.push_public_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public';
$$;

-- Everything the push Edge Function needs. Only the service role can call this.
create or replace function public.push_config()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_object_agg(name, decrypted_secret)
  from vault.decrypted_secrets
  where name in ('push_secret', 'vapid_public', 'vapid_private', 'vapid_subject');
$$;

-- Queue one notification to one person's phones. Never blocks the write that triggered it.
create or replace function public.send_push(p_user uuid, p_title text, p_body text, p_url text default '/')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if p_user is null or not exists (select 1 from public.push_subscriptions where user_id = p_user) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('user_id', p_user, 'title', p_title, 'body', coalesce(p_body, ''), 'url', coalesce(p_url, '/')),
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 8000
  );
exception when others then
  raise warning 'send_push failed: %', sqlerrm;
end;
$$;

create or replace function public.user_with_role(p_role public.app_role)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles where role = p_role;
$$;

create or replace function public.level_label(p_level text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_level
    when 'good_boy' then 'Mommy' || chr(8217) || 's Good Boy'
    when 'ok_boy' then 'ok boy'
    when 'thin_ice' then 'thin ice'
    when 'bad_boy' then 'bad boy'
    else p_level end;
$$;

create or replace function public.send_test_push()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.my_role() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform public.send_push((select auth.uid()), 'Hiii ' || chr(9786) || chr(65039), 'Notifications are on', '/settings');
end;
$$;

-- Triggers that turn changes into notifications for the other person.

create or replace function public.push_on_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_adder public.app_role;
  v_other uuid;
begin
  select role into v_adder from public.profiles where id = new.added_by;
  select id into v_other from public.profiles where id <> new.added_by limit 1;
  if new.type = 'spend' then
    perform public.send_push(public.user_with_role('jagath'), 'Nikita got a reward', new.label, '/my-rewards');
  elsif new.bonus_key is not null then
    perform public.send_push(v_other, 'STREAK BONUS +' || new.points, new.label, '/');
  elsif v_adder = 'jagath' then
    perform public.send_push(v_other,
      case when new.points >= 50 then 'OMG +' || new.points || ' ' || chr(129401) else 'YAY +' || new.points end,
      new.label || coalesce(', ' || new.note, ''), '/');
  else
    perform public.send_push(v_other, 'Nikita added +' || new.points, new.label || coalesce(', ' || new.note, ''), '/');
  end if;
  return null;
end;
$$;
create trigger push_on_transaction after insert on public.transactions
  for each row execute function public.push_on_transaction();

create or replace function public.push_on_level()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.send_push(public.user_with_role('jagath'),
    'Nikita moved u to ' || public.level_label(new.level), coalesce(new.note, ''), '/chart');
  return null;
end;
$$;
create trigger push_on_level after insert on public.behaviour_levels
  for each row execute function public.push_on_level();

create or replace function public.push_on_appeal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.send_push(public.user_with_role('nikita'), 'Jagath wants to move up', new.text, '/chart');
  elsif new.status is distinct from old.status and new.status = 'accepted' then
    perform public.send_push(public.user_with_role('jagath'), 'Appeal accepted ' || chr(9786) || chr(65039), coalesce(new.reply, ''), '/chart');
  elsif new.status is distinct from old.status and new.status = 'denied' then
    perform public.send_push(public.user_with_role('jagath'), 'Nice try :(', coalesce(new.reply, 'Appeal denied'), '/chart');
  end if;
  return null;
end;
$$;
create trigger push_on_appeal after insert or update on public.appeals
  for each row execute function public.push_on_appeal();

create or replace function public.push_on_redemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  select label into v_label from public.transactions where id = new.transaction_id;
  if new.status = 'used' then
    perform public.send_push(public.user_with_role('jagath'), 'Nikita is using a coupon',
      coalesce(v_label, 'Reward') || coalesce(' on ' || to_char(new.scheduled_for, 'FMDD Mon'), ''), '/my-rewards');
  elsif new.status = 'delivered' then
    perform public.send_push(public.user_with_role('nikita'), 'Its done ' || chr(9786) || chr(65039), coalesce(v_label, ''), '/my-rewards');
  end if;
  return null;
end;
$$;
create trigger push_on_redemption after update on public.redemptions
  for each row execute function public.push_on_redemption();

create or replace function public.push_on_wish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.send_push(public.user_with_role('jagath'), 'Nikita wished for something', new.text, '/shop');
  return null;
end;
$$;
create trigger push_on_wish after insert on public.wishes
  for each row execute function public.push_on_wish();

create or replace function public.push_on_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active and (tg_op = 'INSERT' or not old.active) then
    perform public.send_push(public.user_with_role('nikita'), 'New in the shop', new.name, '/shop');
  end if;
  return null;
end;
$$;
create trigger push_on_reward after insert or update of active on public.rewards
  for each row execute function public.push_on_reward();

-- Every morning (7am Sydney in winter, 8am in summer): special days and the monthly recap.
create or replace function public.daily_push()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Australia/Sydney')::date;
  v_j uuid := public.user_with_role('jagath');
  v_n uuid := public.user_with_role('nikita');
  r record;
  v_smile text := chr(9786) || chr(65039);
begin
  for r in
    select * from public.special_days
    where month = extract(month from v_today) and day = extract(day from v_today)
  loop
    if r.kind = 'birthday_nikita' then
      perform public.send_push(v_n, 'HAPPY BIRTHDAY NIKITAAA ' || chr(129401), 'Open the app', '/');
      perform public.send_push(v_j, 'Its Nikita' || chr(8217) || 's birthday today ' || v_smile, 'Dont forget', '/');
    elsif r.kind = 'birthday_jagath' then
      perform public.send_push(v_j, 'HAPPY BIRTHDAY JAGATH ' || v_smile, 'Open the app', '/');
      perform public.send_push(v_n, 'Its Jagath' || chr(8217) || 's birthday today ' || v_smile, 'Dont forget', '/');
    elsif r.kind = 'anniversary' then
      perform public.send_push(v_j, 'HAPPY ANNIVERSARY ' || chr(129401), r.name, '/');
      perform public.send_push(v_n, 'HAPPY ANNIVERSARY ' || chr(129401), r.name, '/');
    else
      perform public.send_push(v_j, r.name || ' ' || v_smile, 'Its today', '/');
      perform public.send_push(v_n, r.name || ' ' || v_smile, 'Its today', '/');
    end if;
  end loop;

  if extract(day from v_today) = 1 then
    perform public.send_push(v_n, 'Ur monthly recap is ready ' || v_smile, 'See how last month went', '/recap');
    perform public.send_push(v_j, 'Ur monthly recap is ready ' || v_smile, 'See how last month went', '/recap');
  end if;
end;
$$;

select cron.schedule('daily-push', '0 21 * * *', 'select public.daily_push()');

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  public.streak_info(), public.add_points(text, integer, text), public.use_coupon(uuid, date),
  public.decide_appeal(uuid, boolean, text), public.save_push_subscription(text, text, text),
  public.push_public_key(), public.push_config(), public.send_push(uuid, text, text, text),
  public.user_with_role(public.app_role), public.level_label(text), public.send_test_push(),
  public.push_on_transaction(), public.push_on_level(), public.push_on_appeal(),
  public.push_on_redemption(), public.push_on_wish(), public.push_on_reward(), public.daily_push()
from public, anon, authenticated;

grant execute on function
  public.streak_info(), public.add_points(text, integer, text), public.use_coupon(uuid, date),
  public.decide_appeal(uuid, boolean, text), public.save_push_subscription(text, text, text),
  public.push_public_key(), public.send_test_push(), public.level_label(text)
to authenticated;
grant execute on function public.push_config() to service_role;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.appeals, public.special_days, public.app_settings;
