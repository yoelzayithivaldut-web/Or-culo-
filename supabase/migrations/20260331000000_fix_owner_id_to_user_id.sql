-- 1. Rename users to profiles if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
      ALTER TABLE public.users RENAME TO profiles;
    ELSE
      RAISE NOTICE 'Table public.users exists but public.profiles already exists. Skipping rename.';
    END IF;
  END IF;
END $$;

-- 2. Create profiles table if it doesn't exist
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  onboarding_completed boolean default false,
  address text,
  phone text,
  education_level text,
  main_genre text,
  writing_goal text,
  plan text default 'free',
  role text default 'user',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure profiles table has all required columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name') THEN
    ALTER TABLE public.profiles ADD COLUMN display_name text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed boolean default false;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'address') THEN
    ALTER TABLE public.profiles ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'education_level') THEN
    ALTER TABLE public.profiles ADD COLUMN education_level text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'main_genre') THEN
    ALTER TABLE public.profiles ADD COLUMN main_genre text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'writing_goal') THEN
    ALTER TABLE public.profiles ADD COLUMN writing_goal text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan') THEN
    ALTER TABLE public.profiles ADD COLUMN plan text default 'free';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text default 'user';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
  END IF;
END $$;

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

-- Set up Row Level Security (RLS) for profiles
alter table profiles enable row level security;

drop policy if exists "Profiles are viewable by owner or admin" on profiles;
create policy "Profiles are viewable by owner or admin"
  on profiles for select
  using ( auth.uid() = id or public.is_admin() );

drop policy if exists "Profiles can be inserted by owner" on profiles;
create policy "Profiles can be inserted by owner"
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Profiles can be updated by owner or admin" on profiles;
create policy "Profiles can be updated by owner or admin"
  on profiles for update
  using ( auth.uid() = id or public.is_admin() );

-- 3. Create books table if it doesn't exist
create table if not exists books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  author text,
  genre text,
  synopsis text,
  content text,
  status text default 'writing',
  language text default 'pt-BR',
  cover_url text,
  back_cover_url text,
  back_cover_text text,
  progress integer default 0,
  type text default 'book',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure books table has all required columns (for existing tables)
DO $$ 
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Checking books table structure...';
  -- Rename owner_id to user_id if it exists
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'owner_id') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'user_id') THEN
      RAISE NOTICE 'Renaming owner_id to user_id in books table...';
      -- Dynamically find and drop any foreign key constraints on owner_id
      FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'books' AND column_name = 'owner_id'
      ) LOOP
        EXECUTE 'ALTER TABLE public.books DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
      END LOOP;
      
      ALTER TABLE public.books RENAME COLUMN owner_id TO user_id;
    ELSE
      RAISE NOTICE 'Column owner_id exists but user_id already exists in books table. Skipping rename.';
    END IF;
  END IF;
  
  -- Ensure user_id column exists
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'user_id') THEN
    ALTER TABLE public.books ADD COLUMN user_id uuid;
  END IF;

  -- Ensure user_id has the correct foreign key constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'books' AND constraint_type = 'FOREIGN KEY' 
    AND constraint_name = 'books_user_id_fkey'
  ) THEN
    ALTER TABLE public.books ADD CONSTRAINT books_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'title') THEN
    ALTER TABLE public.books ADD COLUMN title text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'author') THEN
    ALTER TABLE public.books ADD COLUMN author text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'genre') THEN
    ALTER TABLE public.books ADD COLUMN genre text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'synopsis') THEN
    ALTER TABLE public.books ADD COLUMN synopsis text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'content') THEN
    ALTER TABLE public.books ADD COLUMN content text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'status') THEN
    ALTER TABLE public.books ADD COLUMN status text default 'writing';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'language') THEN
    ALTER TABLE public.books ADD COLUMN language text default 'pt-BR';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'cover_url') THEN
    ALTER TABLE public.books ADD COLUMN cover_url text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'back_cover_url') THEN
    ALTER TABLE public.books ADD COLUMN back_cover_url text;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'back_cover_text') THEN
    ALTER TABLE public.books ADD COLUMN back_cover_text text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'progress') THEN
    ALTER TABLE public.books ADD COLUMN progress integer default 0;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'type') THEN
    ALTER TABLE public.books ADD COLUMN type text default 'book';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'updated_at') THEN
    ALTER TABLE public.books ADD COLUMN updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
  END IF;
END $$;

-- Set up RLS for books
alter table books enable row level security;

drop policy if exists "Users can view their own books." on books;
create policy "Users can view their own books."
  on books for select
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Users can insert their own books." on books;
create policy "Users can insert their own books."
  on books for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own books." on books;
create policy "Users can update their own books."
  on books for update
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Users can delete their own books." on books;
create policy "Users can delete their own books."
  on books for delete
  using ( auth.uid() = user_id or public.is_admin() );

-- 4. Create clients table if it doesn't exist
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  email text,
  notes text,
  phone text,
  status text default 'active',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure clients table has all required columns (for existing tables)
DO $$ 
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Checking clients table structure...';
  -- Rename owner_id to user_id if it exists
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'owner_id') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'user_id') THEN
      RAISE NOTICE 'Renaming owner_id to user_id in clients table...';
      -- Dynamically find and drop any foreign key constraints on owner_id
      FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'clients' AND column_name = 'owner_id'
      ) LOOP
        EXECUTE 'ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
      END LOOP;
      
      ALTER TABLE public.clients RENAME COLUMN owner_id TO user_id;
    ELSE
      RAISE NOTICE 'Column owner_id exists but user_id already exists in clients table. Skipping rename.';
    END IF;
  END IF;

  -- Ensure user_id column exists
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'user_id') THEN
    ALTER TABLE public.clients ADD COLUMN user_id uuid;
  END IF;

  -- Ensure user_id has the correct foreign key constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'clients' AND constraint_type = 'FOREIGN KEY' 
    AND constraint_name = 'clients_user_id_fkey'
  ) THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'name') THEN
    ALTER TABLE public.clients ADD COLUMN name text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'email') THEN
    ALTER TABLE public.clients ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'notes') THEN
    ALTER TABLE public.clients ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'phone') THEN
    ALTER TABLE public.clients ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'status') THEN
    ALTER TABLE public.clients ADD COLUMN status text default 'active';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'updated_at') THEN
    ALTER TABLE public.clients ADD COLUMN updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
  END IF;
END $$;

-- Set up RLS for clients
alter table clients enable row level security;

drop policy if exists "Users can view their own clients." on clients;
create policy "Users can view their own clients."
  on clients for select
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Users can insert their own clients." on clients;
create policy "Users can insert their own clients."
  on clients for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own clients." on clients;
create policy "Users can update their own clients."
  on clients for update
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Users can delete their own clients." on clients;
create policy "Users can delete their own clients."
  on clients for delete
  using ( auth.uid() = user_id or public.is_admin() );

-- 5. Create a trigger to handle new user profiles
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

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Populate profiles for existing users
DO $$
BEGIN
  RAISE NOTICE 'Populating profiles for existing users...';
  INSERT INTO public.profiles (id, email, display_name, onboarding_completed, role, plan)
  SELECT 
    id, 
    email, 
    coalesce(raw_user_meta_data->>'full_name', email, 'Escritor'),
    case when email in ('word.intelligence@gmail.com', 'yoelzayithivaldut@gmail.com') then true else false end,
    case when email in ('word.intelligence@gmail.com', 'yoelzayithivaldut@gmail.com') then 'admin' else 'user' end,
    case when email in ('word.intelligence@gmail.com', 'yoelzayithivaldut@gmail.com') then 'premium' else 'free' end
  FROM auth.users
  ON CONFLICT (id) DO NOTHING;
END $$;

-- 6. Grant permissions
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

DO $$ 
BEGIN
  RAISE NOTICE 'Migration script finished successfully!';
END $$;
