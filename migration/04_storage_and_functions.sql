-- 04_storage_and_functions.sql
-- Storage buckets and helper functions.

-- Create storage buckets if they don't exist
-- Note: Buckets are usually managed via UI or API, but here are the SQL snippets for visibility.
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true) 
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('attachments', 'attachments', true) 
on conflict (id) do nothing;

-- Function to handle updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to profiles and tasks
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();
