-- Rename users table to profiles if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    ALTER TABLE public.users RENAME TO profiles;
  END IF;
END $$;

-- Update the handle_new_user function to use the new table name
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_admin boolean;
begin
  is_admin := (new.email = 'word.intelligence@gmail.com' or new.email = 'yoelzayithivaldut@gmail.com');

  insert into public.profiles (id, email, display_name, onboarding_completed, role, plan)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Escritor'),
    case when is_admin then true else false end,
    case when is_admin then 'admin' else 'user' end,
    case when is_admin then 'premium' else 'free' end
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    role = case when is_admin then 'admin' else public.profiles.role end,
    plan = case when is_admin then 'premium' else public.profiles.plan end;
  return new;
end;
$$ language plpgsql security definer;

-- Function to check if the current user is an admin without recursion
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Update RLS policies to use the new table name
alter table public.profiles enable row level security;

-- Drop old policies if they exist (they should have been renamed automatically but let's be safe)
drop policy if exists "Users can only read their own data" on public.profiles;
drop policy if exists "Users can insert their own data" on public.profiles;
drop policy if exists "Users can update their own data" on public.profiles;
drop policy if exists "Profiles are viewable by owner or admin" on public.profiles;
drop policy if exists "Profiles can be updated by owner or admin" on public.profiles;

create policy "Profiles are viewable by owner or admin"
  on public.profiles for select
  using ( auth.uid() = id or public.is_admin() );

create policy "Profiles can be inserted by owner"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Profiles can be updated by owner or admin"
  on public.profiles for update
  using ( auth.uid() = id or public.is_admin() );

-- Update RLS policies for books to use profiles
drop policy if exists "Users can view their own books." on public.books;
create policy "Users can view their own books."
  on public.books for select
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Users can update their own books." on public.books;
create policy "Users can update their own books."
  on public.books for update
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Users can delete their own books." on public.books;
create policy "Users can delete their own books."
  on public.books for delete
  using ( auth.uid() = user_id or public.is_admin() );

-- Update RLS policies for clients to use profiles
drop policy if exists "Users can view their own clients." on public.clients;
create policy "Users can view their own clients."
  on public.clients for select
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Users can update their own clients." on public.clients;
create policy "Users can update their own clients."
  on public.clients for update
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Users can delete their own clients." on public.clients;
create policy "Users can delete their own clients."
  on public.clients for delete
  using ( auth.uid() = user_id or public.is_admin() );

-- Update foreign key references in other tables
alter table public.books drop constraint if exists books_owner_id_fkey;
alter table public.books drop constraint if exists books_user_id_fkey;
alter table public.books add constraint books_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.clients drop constraint if exists clients_owner_id_fkey;
alter table public.clients drop constraint if exists clients_user_id_fkey;
alter table public.clients add constraint clients_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
