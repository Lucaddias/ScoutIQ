-- ============================================================================
-- Migração 001 — Autenticação própria (substitui o Supabase Auth)
-- ----------------------------------------------------------------------------
-- Objetivo: deixar o Supabase como banco de dados puro. As credenciais passam a
-- viver em `profiles.password_hash` e o `profiles.id` deixa de depender de
-- `auth.users`. As tabelas que referenciavam `auth.users` (relatorios, propostas)
-- passam a referenciar `profiles`.
--
-- Os 11 perfis existentes são preservados (os ids não mudam), mas como não têm
-- `password_hash`, precisarão definir uma senha (re-cadastro ou reset) para logar.
--
-- O RLS continua LIGADO de propósito: o servidor usa a chave service_role, que
-- ignora o RLS; mantê-lo ativo é defesa extra caso a chave anon vaze.
-- ============================================================================

BEGIN;

-- 1) Coluna de hash da senha (bcrypt) ----------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash text;

-- 2) E-mail único e obrigatório (usado como identificador de login) ----------
--    Falha aqui indica e-mails duplicados/nulos a serem resolvidos antes.
ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- 3) profiles.id passa a se autogerar e não depende mais de auth.users -------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4) Repontar FKs que apontavam para auth.users → profiles -------------------
--    ON DELETE SET NULL: apagar um perfil não apaga relatórios/propostas.
ALTER TABLE public.relatorios
  DROP CONSTRAINT IF EXISTS relatorios_user_id_fkey;
ALTER TABLE public.relatorios
  ADD CONSTRAINT relatorios_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.propostas
  DROP CONSTRAINT IF EXISTS propostas_user_id_fkey;
ALTER TABLE public.propostas
  ADD CONSTRAINT propostas_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMIT;
