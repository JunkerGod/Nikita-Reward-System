-- Nikita's Adventure: saved progress for each player and small app-point rewards for Nikita.

create table public.game_saves (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

create policy "own save read" on public.game_saves
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.my_role()) is not null);
create policy "own save insert" on public.game_saves
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.my_role()) is not null);
create policy "own save update" on public.game_saves
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.game_saves to authenticated;

-- Rewards: each key pays once. game:clear:<level> 5, game:star:<level>:<star> 2, game:finish 25.
-- At most 30 game points a day (Sydney time); anything over waits until tomorrow.
create or replace function public.game_reward(p_key text, p_note text default null)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_points integer;
  v_today integer;
  v_day date := (now() at time zone 'Australia/Sydney')::date;
  v_id uuid;
begin
  if public.my_role() is distinct from 'nikita' then
    return json_build_object('status', 'not_allowed', 'points', 0);
  end if;

  if p_key ~ '^game:clear:[1-7]$' then
    v_points := 5;
  elsif p_key ~ '^game:star:[1-7]:[1-3]$' then
    v_points := 2;
  elsif p_key = 'game:finish' then
    v_points := 25;
  else
    raise exception 'bad_key' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('nikitas_rewards_game'));

  if exists (select 1 from public.transactions where bonus_key = p_key) then
    return json_build_object('status', 'duplicate', 'points', 0);
  end if;

  select coalesce(sum(points), 0) into v_today
  from public.transactions
  where bonus_key like 'game:%'
    and (created_at at time zone 'Australia/Sydney')::date = v_day;

  if v_today + v_points > 30 then
    return json_build_object('status', 'capped', 'points', 0);
  end if;

  insert into public.transactions (type, points, label, note, added_by, bonus_key)
  values ('earn', v_points, 'Nikita''s Adventure', left(nullif(trim(p_note), ''), 120), (select auth.uid()), p_key)
  on conflict (bonus_key) do nothing
  returning id into v_id;

  if v_id is null then
    return json_build_object('status', 'duplicate', 'points', 0);
  end if;
  return json_build_object('status', 'awarded', 'points', v_points);
end;
$$;

revoke all on function public.game_reward(text, text) from public, anon;
grant execute on function public.game_reward(text, text) to authenticated;

-- Game points should not keep a streak alive on their own.
create or replace function public.streak_info()
returns table (current_streak integer, best_streak integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with days as (
    select distinct (created_at at time zone 'Australia/Sydney')::date as d
    from public.transactions
    where type = 'earn' and (bonus_key is null or bonus_key not like 'game:%')
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

-- Tell Jagath when Nikita earns game points (not as a streak bonus).
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
  elsif new.bonus_key like 'game:star:%' then
    null; -- stars are small, no need to buzz his phone for each one
  elsif new.bonus_key like 'game:%' then
    perform public.send_push(v_other, 'Nikita''s Adventure +' || new.points, coalesce(new.note, 'She''s playing ' || chr(9786) || chr(65039)), '/history');
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
