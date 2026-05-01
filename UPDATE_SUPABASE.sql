-- ======================================================================================
-- 🚀 SCRIPT DE ATUALIZAÇÃO DO SUPABASE: MOZBET BACKEND V2
-- Copie e cole todo este código no "SQL Editor" do seu painel Supabase e clique em "Run".
-- ======================================================================================

-- 1. Tabela de Memória do Suporte (Retenção de 90 dias)
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para buscas rápidas pelo histórico do utilizador
CREATE INDEX IF NOT EXISTS support_messages_user_id_idx ON public.support_messages (user_id);

-- Configurar RLS (Row Level Security) - Só o próprio utilizador e o backend podem ler/escrever
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilizadores podem ver as suas próprias mensagens"
ON public.support_messages FOR SELECT
USING (auth.uid() = user_id);

-- O Backend (com Service Key) bypassa o RLS automaticamente.

-- 2. Limpeza automática de mensagens com mais de 90 dias
-- Extensão pg_cron necessária (geralmente ativada por defeito no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar limpeza todos os dias à meia-noite
SELECT cron.schedule(
    'limpar-historico-suporte',
    '0 0 * * *',
    $$ DELETE FROM public.support_messages WHERE created_at < NOW() - INTERVAL '90 days'; $$
);

-- ======================================================================================
-- FIM DO SCRIPT
-- ======================================================================================
