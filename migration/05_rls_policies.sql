-- 05_rls_policies.sql
-- Row Level Security policies for all public tables.

-- Enable RLS on all tables
alter table public.teams enable row level security;
alter table public.sub_teams enable row level security;
alter table public.tasks enable row level security;

-- PROFILES POLICIES
create policy "Users can view their own profile and profiles in their team"
on public.profiles for select
to authenticated
using (
  auth.uid() = id or 
  team_id = (select team_id from public.profiles where id = auth.uid())
);

create policy "Admins can manage all profiles"
on public.profiles for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('Admin', 'Operational Admin')
  )
);

-- TEAMS POLICIES
create policy "Everyone authenticated can view teams"
on public.teams for select
to authenticated
using (true);

create policy "Admins can manage teams"
on public.teams for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('Admin', 'Operational Admin')
  )
);

-- SUB_TEAMS POLICIES
create policy "Everyone authenticated can view sub_teams"
on public.sub_teams for select
to authenticated
using (true);

-- TASKS POLICIES
create policy "Users can view tasks assigned to them or their team"
on public.tasks for select
to authenticated
using (
  assignee_id = auth.uid() or
  team_id = (select team_id from public.profiles where id = auth.uid()) or
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('Admin', 'Operational Admin')
  )
);

create policy "Users can insert tasks"
on public.tasks for insert
to authenticated
with check (true);

create policy "Admins and owners can update tasks"
on public.tasks for update
to authenticated
using (
  assignee_id = auth.uid() or
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('Admin', 'Operational Admin', 'Department Admin')
  )
);

create policy "Admins can delete tasks"
on public.tasks for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('Admin', 'Operational Admin')
  )
);
