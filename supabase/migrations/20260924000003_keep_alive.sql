-- Daily keep-alive: free Supabase projects pause after about a week without activity.
-- The Netlify scheduled function calls keep_alive() once a day. It does one tiny read and
-- records when it ran, so we can check it is working. It returns nothing private.

create table public.heartbeat (
  id integer primary key default 1 check (id = 1),
  last_ping_at timestamptz not null default now(),
  pings integer not null default 0
);
alter table public.heartbeat enable row level security;
-- No policies: clients can't read or write it directly.

create or replace function public.keep_alive()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_one boolean;
begin
  select exists (select id from public.profiles limit 1) into found_one;
  insert into public.heartbeat (id, last_ping_at, pings) values (1, now(), 1)
  on conflict (id) do update set last_ping_at = now(), pings = public.heartbeat.pings + 1;
  return found_one;
end;
$$;

revoke execute on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
