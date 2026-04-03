-- SCRIPT DE MIGRAÇÃO SUPABASE - ORÁCULO
-- Este script garante que a estrutura do banco de dados esteja correta.
-- Pode ser executado múltiplas vezes sem causar erros (idempotente).

-- 0. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ 
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'INICIANDO MIGRAÇÃO DO BANCO DE DADOS...';
  RAISE NOTICE '=========================================';
END $$;

-- 1. Renomear users para profiles se necessário
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
      ALTER TABLE public.users RENAME TO profiles;
      RAISE NOTICE 'Tabela users renomeada para profiles.';
    ELSE
      RAISE NOTICE 'Tabela public.users existe mas public.profiles já existe. Pulando renomeação.';
    END IF;
  END IF;
END $$;

-- 2. Garantir que a tabela profiles existe
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  display_name text,
  onboarding_completed boolean DEFAULT false,
  role text DEFAULT 'user',
  plan text DEFAULT 'free',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas na tabela profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user';
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan') THEN
    ALTER TABLE public.profiles ADD COLUMN plan text DEFAULT 'free';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;

-- 3. Garantir estrutura da tabela books
DO $$ 
BEGIN
  -- Criar tabela se não existir
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'books') THEN
    CREATE TABLE public.books (
      id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      title text NOT NULL,
      genre text,
      author text,
      synopsis text,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      status text DEFAULT 'writing',
      content text,
      language text DEFAULT 'pt-BR',
      cover_url text,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    RAISE NOTICE 'Tabela books criada com sucesso';
  ELSE
    -- Tabela existe, verificar colunas
    
    -- 1. Renomear owner_id para user_id se existir
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'owner_id') 
       AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'user_id') THEN
      
      -- Tentar dropar constraint antiga
      ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_owner_id_fkey;
      ALTER TABLE public.books RENAME COLUMN owner_id TO user_id;
      RAISE NOTICE 'Coluna owner_id renomeada para user_id na tabela books';
    END IF;

    -- 2. Adicionar user_id se não existir
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'user_id') THEN
      ALTER TABLE public.books ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE 'Coluna user_id adicionada na tabela books';
    END IF;
    
    -- 3. Garantir que user_id tenha a constraint correta se já existia mas sem constraint
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'books' AND constraint_type = 'FOREIGN KEY' AND (constraint_name = 'books_user_id_fkey' OR constraint_name = 'books_owner_id_fkey')
    ) THEN
      ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_user_id_fkey;
      ALTER TABLE public.books ADD CONSTRAINT books_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 4. Garantir estrutura da tabela clients
DO $$ 
BEGIN
  -- Criar tabela se não existir
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
    CREATE TABLE public.clients (
      id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      name text NOT NULL,
      email text,
      notes text,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    RAISE NOTICE 'Tabela clients criada com sucesso';
  ELSE
    -- Tabela existe, verificar colunas
    
    -- 1. Renomear owner_id para user_id se existir
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'owner_id') 
       AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'user_id') THEN
      
      -- Tentar dropar constraint antiga
      ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_owner_id_fkey;
      ALTER TABLE public.clients RENAME COLUMN owner_id TO user_id;
      RAISE NOTICE 'Coluna owner_id renomeada para user_id na tabela clients';
    END IF;

    -- 2. Adicionar user_id se não existir
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'user_id') THEN
      ALTER TABLE public.clients ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE 'Coluna user_id adicionada na tabela clients';
    END IF;

    -- 3. Garantir que user_id tenha a constraint correta
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'clients' AND constraint_type = 'FOREIGN KEY' AND (constraint_name = 'clients_user_id_fkey' OR constraint_name = 'clients_owner_id_fkey')
    ) THEN
      ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;
      ALTER TABLE public.clients ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 5. Configurar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas para evitar conflitos
DO $$ 
BEGIN
  -- Profiles
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles are viewable by owner or admin" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles can be inserted by owner" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles can be updated by owner or admin" ON public.profiles;
  
  -- Books
  DROP POLICY IF EXISTS "Users can view their own books" ON public.books;
  DROP POLICY IF EXISTS "Users can create their own books" ON public.books;
  DROP POLICY IF EXISTS "Users can update their own books" ON public.books;
  DROP POLICY IF EXISTS "Users can delete their own books" ON public.books;
  DROP POLICY IF EXISTS "Users can view their own books." ON public.books;
  DROP POLICY IF EXISTS "Users can insert their own books." ON public.books;
  DROP POLICY IF EXISTS "Users can update their own books." ON public.books;
  DROP POLICY IF EXISTS "Users can delete their own books." ON public.books;
  
  -- Clients
  DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
  DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
  DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
  DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
  DROP POLICY IF EXISTS "Users can view their own clients." ON public.clients;
  DROP POLICY IF EXISTS "Users can insert their own clients." ON public.clients;
  DROP POLICY IF EXISTS "Users can update their own clients." ON public.clients;
  DROP POLICY IF EXISTS "Users can delete their own clients." ON public.clients;
END $$;

-- Criar novas políticas
-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Books
CREATE POLICY "Users can view their own books" ON public.books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own books" ON public.books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own books" ON public.books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own books" ON public.books FOR DELETE USING (auth.uid() = user_id);

-- Clients
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- 6. Função e Trigger para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin := (new.email = 'yoelzayithivaldut@gmail.com' OR new.email = 'word.intelligence@gmail.com');
  
  INSERT INTO public.profiles (id, email, display_name, role, plan, onboarding_completed)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Escritor'), 
    CASE WHEN is_admin THEN 'admin' ELSE 'user' END, 
    CASE WHEN is_admin THEN 'premium' ELSE 'free' END,
    CASE WHEN is_admin THEN true ELSE false END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    role = CASE WHEN is_admin THEN 'admin' ELSE public.profiles.role END,
    plan = CASE WHEN is_admin THEN 'premium' ELSE public.profiles.plan END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Popular profiles para usuários existentes
INSERT INTO public.profiles (id, email, role, plan)
SELECT id, email, 'user', 'free'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 8. Permissões finais
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '=========================================';
END $$;

COMMIT;
