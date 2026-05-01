-- 1. Adicionar o campo para reter saldo na tabela users (se não existir)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS balance_retained BOOLEAN DEFAULT false;

-- 2. Criar a tabela de notificações (Ponto vermelho e mensagens do site)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Pode ser UUID do utilizador ou a string 'global'
    message TEXT NOT NULL,
    type TEXT DEFAULT 'alert',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Ativar RLS (Row Level Security) para a nova tabela
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso às notificações
-- Os utilizadores apenas podem ler as notificações globais ('global') ou as enviadas para o seu user_id
CREATE POLICY "Users can read own or global notifications"
ON public.notifications FOR SELECT
USING (auth.uid()::text = user_id OR user_id = 'global');

-- Admin ou Service Role pode inserir/apagar notificações (bypass RLS ou role específica se aplicável)
CREATE POLICY "Service Role full access"
ON public.notifications FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Ativar REALTIME para que a aplicação consiga escutar as notificações via Socket
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
