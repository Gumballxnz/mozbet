-- 1. Criar a coluna 'role' na tabela users se ainda não existir
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user';

-- 2. Migrar administradores antigos. 
-- Todos os atuais 'is_admin = true' passam a ser 'super_admin' (Donos) temporariamente.
-- Depois, através do próprio painel admin, você (dono) pode despromover quem quiser para 'admin' ou 'user'.
UPDATE public.users SET role = 'super_admin' WHERE is_admin = true;
