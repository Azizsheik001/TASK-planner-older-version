-- 01_extensions_and_teams.sql
-- Base setup for the AGS Task Planner on the company Supabase account.

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Create departments table
create table if not exists public.departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create teams table
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone default null
);

-- Create sub_teams table
create table if not exists public.sub_teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone default null
);
