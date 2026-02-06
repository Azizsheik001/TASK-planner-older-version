-- 02_auth_and_profiles.sql
-- Refactor user credentials to use Supabase Auth (auth.users).
-- All credential-related logic is handled by Supabase Auth.
-- The profiles table stores user information linked by ID to auth.users.

-- Create profiles table in public schema
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text unique not null,
  role text default 'User' check (role in ('Admin', 'Operational Admin', 'Department Admin', 'User')),
  department_id uuid references public.departments(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  sub_team_ids uuid[] default '{}'::uuid[],
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone default null
);

-- Row Level Security for profiles
alter table public.profiles enable row level security;

-- Trigger to automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', coalesce(new.raw_user_meta_data->>'role', 'User'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
