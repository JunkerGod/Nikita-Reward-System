-- Nikita's Rewards: tables, helpers, Row Level Security, storage and realtime.
-- Only the two accounts that have a row in public.profiles can read or write anything.

create type public.app_role as enum ('jagath', 'nikita');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role public.app_role not null unique,
  goal_reward_id uuid,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  icon text not null default 'star',
  points integer not null check (points between 1 and 500),
  category text not null default 'small' check (category in ('small', 'medium', 'big')),
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  icon text not null default 'gift',
  price integer not null check (price between 1 and 10000),
  description text check (description is null or char_length(description) <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_goal_reward_id_fkey
  foreign key (goal_reward_id) references public.rewards (id) on delete set null;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('earn', 'spend')),
  points integer not null,
  label text not null check (char_length(label) between 1 and 80),
  note text check (note is null or char_length(note) <= 200),
  added_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  reward_id uuid references public.rewards (id) on delete set null,
  constraint transactions_points_range check (
    (type = 'earn' and points between 1 and 500)
    or (type = 'spend' and points between 1 and 10000)
  )
);
create index transactions_created_at_idx on public.transactions (created_at desc);
create index transactions_added_by_idx on public.transactions (added_by);
create index transactions_reward_id_idx on public.transactions (reward_id);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid references public.rewards (id) on delete set null,
  transaction_id uuid not null unique references public.transactions (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  status text not null default 'claimed' check (status in ('claimed', 'delivered')),
  delivered_at timestamptz
);
create index redemptions_reward_id_idx on public.redemptions (reward_id);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 100),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'added', 'dismissed'))
);
create index wishes_created_by_idx on public.wishes (created_by);

create table public.behaviour_levels (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('good_boy', 'ok_boy', 'thin_ice', 'bad_boy')),
  note text check (note is null or char_length(note) <= 80),
  set_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index behaviour_levels_created_at_idx on public.behaviour_levels (created_at desc);
create index behaviour_levels_set_by_idx on public.behaviour_levels (set_by);

create table public.face_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  kind text not null check (kind in ('nikita_happy', 'nikita_sad', 'jagath')),
  uploaded_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index face_photos_uploaded_by_idx on public.face_photos (uploaded_by);

create table public.seen (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen_transaction_at timestamptz,
  last_seen_behaviour_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The caller's role, or null for anyone who is not one of the two accounts.
create or replace function public.my_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

-- The balance is always the sum of every transaction. It can never go below zero.
create or replace function public.check_balance_not_negative()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select coalesce(sum(case when type = 'earn' then points else -points end), 0)
    from public.transactions
  ) < 0 then
    raise exception 'balance_negative' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

create trigger transactions_balance_guard
  after insert or delete on public.transactions
  for each statement execute function public.check_balance_not_negative();

create or replace function public.get_stats()
returns table (balance integer, total_earned integer, total_spent integer, week_earned integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(case when type = 'earn' then points else -points end), 0)::integer,
    coalesce(sum(points) filter (where type = 'earn'), 0)::integer,
    coalesce(sum(points) filter (where type = 'spend'), 0)::integer,
    coalesce(sum(points) filter (
      where type = 'earn'
        and created_at >= (date_trunc('week', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney')
    ), 0)::integer
  from public.transactions;
$$;

-- Redeeming is one atomic step: check the balance, add the spend, create the redemption.
-- The price is copied onto the transaction, so later price changes never touch past redemptions.
create or replace function public.redeem_reward(p_reward_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward public.rewards%rowtype;
  v_balance integer;
  v_tx uuid;
  v_redemption uuid;
begin
  if public.my_role() is distinct from 'nikita' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('nikitas_rewards_balance'));

  select * into v_reward from public.rewards where id = p_reward_id and active;
  if not found then
    raise exception 'reward_not_found' using errcode = 'P0002';
  end if;

  select coalesce(sum(case when type = 'earn' then points else -points end), 0)
    into v_balance from public.transactions;
  if v_balance < v_reward.price then
    raise exception 'not_enough_points' using errcode = 'P0001';
  end if;

  insert into public.transactions (type, points, label, added_by, reward_id)
  values ('spend', v_reward.price, v_reward.name, (select auth.uid()), v_reward.id)
  returning id into v_tx;

  insert into public.redemptions (reward_id, transaction_id)
  values (v_reward.id, v_tx)
  returning id into v_redemption;

  return v_redemption;
end;
$$;

-- Nikita pins one reward as her "Saving for" goal (null clears it).
create or replace function public.set_goal(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.my_role() is distinct from 'nikita' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.profiles set goal_reward_id = p_reward_id where role = 'nikita';
end;
$$;

-- Public sign ups are off: new auth users can only be created by an admin who sets
-- app.allow_user_create = 'on' in the same transaction.
create or replace function public.block_public_signups()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.allow_user_create', true), '') <> 'on' then
    raise exception 'Sign ups are closed';
  end if;
  return new;
end;
$$;

create trigger block_public_signups
  before insert on auth.users
  for each row execute function public.block_public_signups();

-- ---------------------------------------------------------------------------
-- Grants: nothing for anonymous visitors
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.my_role() to authenticated;
grant execute on function public.get_stats() to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
grant execute on function public.set_goal(uuid) to authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.rewards enable row level security;
alter table public.transactions enable row level security;
alter table public.redemptions enable row level security;
alter table public.wishes enable row level security;
alter table public.behaviour_levels enable row level security;
alter table public.face_photos enable row level security;
alter table public.seen enable row level security;

-- profiles: read only. Goals change through set_goal().
create policy "members read profiles" on public.profiles
  for select to authenticated using ((select public.my_role()) is not null);

-- activities: both of us manage them.
create policy "members read activities" on public.activities
  for select to authenticated using ((select public.my_role()) is not null);
create policy "members add activities" on public.activities
  for insert to authenticated with check ((select public.my_role()) is not null);
create policy "members edit activities" on public.activities
  for update to authenticated
  using ((select public.my_role()) is not null)
  with check ((select public.my_role()) is not null);
create policy "members delete activities" on public.activities
  for delete to authenticated using ((select public.my_role()) is not null);

-- rewards: both read, only Jagath writes.
create policy "members read rewards" on public.rewards
  for select to authenticated using ((select public.my_role()) is not null);
create policy "jagath adds rewards" on public.rewards
  for insert to authenticated with check ((select public.my_role()) = 'jagath');
create policy "jagath edits rewards" on public.rewards
  for update to authenticated
  using ((select public.my_role()) = 'jagath')
  with check ((select public.my_role()) = 'jagath');
create policy "jagath deletes rewards" on public.rewards
  for delete to authenticated using ((select public.my_role()) = 'jagath');

-- transactions: both read, add points and delete. Spends only come from redeem_reward().
create policy "members read transactions" on public.transactions
  for select to authenticated using ((select public.my_role()) is not null);
create policy "members add points" on public.transactions
  for insert to authenticated
  with check (
    (select public.my_role()) is not null
    and type = 'earn'
    and reward_id is null
    and added_by = (select auth.uid())
  );
create policy "members delete transactions" on public.transactions
  for delete to authenticated using ((select public.my_role()) is not null);

-- redemptions: both read, only Jagath marks delivered. Created by redeem_reward().
create policy "members read redemptions" on public.redemptions
  for select to authenticated using ((select public.my_role()) is not null);
create policy "jagath updates redemptions" on public.redemptions
  for update to authenticated
  using ((select public.my_role()) = 'jagath')
  with check ((select public.my_role()) = 'jagath');

-- wishes: both read and add, only Jagath resolves them.
create policy "members read wishes" on public.wishes
  for select to authenticated using ((select public.my_role()) is not null);
create policy "members add wishes" on public.wishes
  for insert to authenticated
  with check ((select public.my_role()) is not null and created_by = (select auth.uid()));
create policy "jagath updates wishes" on public.wishes
  for update to authenticated
  using ((select public.my_role()) = 'jagath')
  with check ((select public.my_role()) = 'jagath');
create policy "jagath deletes wishes" on public.wishes
  for delete to authenticated using ((select public.my_role()) = 'jagath');

-- behaviour chart: both read, only Nikita sets the level.
create policy "members read behaviour" on public.behaviour_levels
  for select to authenticated using ((select public.my_role()) is not null);
create policy "nikita sets behaviour" on public.behaviour_levels
  for insert to authenticated
  with check ((select public.my_role()) = 'nikita' and set_by = (select auth.uid()));

-- face photos: both of us.
create policy "members read face photos" on public.face_photos
  for select to authenticated using ((select public.my_role()) is not null);
create policy "members add face photos" on public.face_photos
  for insert to authenticated
  with check ((select public.my_role()) is not null and uploaded_by = (select auth.uid()));
create policy "members delete face photos" on public.face_photos
  for delete to authenticated using ((select public.my_role()) is not null);

-- seen: each person manages their own row.
create policy "read own seen" on public.seen
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.my_role()) is not null);
create policy "add own seen" on public.seen
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.my_role()) is not null);
create policy "update own seen" on public.seen
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.my_role()) is not null);

-- ---------------------------------------------------------------------------
-- Storage: private bucket for face photos, signed URLs only
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('faces', 'faces', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']);

create policy "members read faces" on storage.objects
  for select to authenticated
  using (bucket_id = 'faces' and (select public.my_role()) is not null);
create policy "members upload faces" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'faces' and (select public.my_role()) is not null);
create policy "members delete faces" on storage.objects
  for delete to authenticated
  using (bucket_id = 'faces' and (select public.my_role()) is not null);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.transactions,
  public.rewards,
  public.wishes,
  public.behaviour_levels,
  public.redemptions,
  public.profiles,
  public.activities,
  public.face_photos;
