-- Remover políticas antigas se existirem para evitar duplicação
DROP POLICY IF EXISTS "Admins podem ver tudo" ON public.transactions;
DROP POLICY IF EXISTS "Admins podem ver utilizadores" ON public.users;

-- Criar política que permite a Administradores e Donos verem TODAS as transações em Realtime
CREATE POLICY "Admins podem ver tudo" 
ON public.transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role IN ('admin', 'super_admin') OR is_admin = true)
  )
);

-- Criar política que permite a Administradores e Donos verem TODOS os utilizadores em Realtime
CREATE POLICY "Admins podem ver utilizadores" 
ON public.users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role IN ('admin', 'super_admin') OR is_admin = true)
  )
);
