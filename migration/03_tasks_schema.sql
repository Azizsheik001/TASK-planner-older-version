-- 03_tasks_schema.sql
-- Main task management table.

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  start_date date,
  due_date date,
  priority text default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  status text default 'Todo' check (status in ('Todo', 'In Progress', 'Completed')),
  budget numeric,
  extended_due_dates date[] default '{}'::date[],
  team_id uuid references public.teams(id) on delete set null,
  sub_team_id uuid references public.sub_teams(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone default null,
  attachment_url text,
  attachments jsonb[] default '{}'::jsonb[],
  assigned_by text,
  progress_status text,
  progress_report text,
  timer_start timestamp with time zone,
  hours numeric default 0,
  extended_due_date_1 date,
  extended_due_date_2 date
);
