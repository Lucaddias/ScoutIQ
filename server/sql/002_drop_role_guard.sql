-- ============================================================================
-- Migração 002 — Remove o trigger guard_profile_role
-- ----------------------------------------------------------------------------
-- O trigger `trg_guard_profile_role` autorizava mudanças de `profiles.role`
-- com base em `auth.uid()` e `current_user_role()` — funções do Supabase Auth.
--
-- Na nova arquitetura o servidor acessa o banco com a chave service_role (sem
-- sessão de usuário), então `auth.uid()` é sempre NULL e o trigger bloquearia
-- TODA alteração de role, inclusive as legítimas feitas por um admin via Express.
--
-- A autorização de quem pode trocar role passa a ser feita na API
-- (middleware requireRole('admin') / regra de auto-upgrade no controller).
-- Por isso o trigger é removido. A função guard_profile_role() também é
-- descartada por não ter mais uso.
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_role();

COMMIT;
