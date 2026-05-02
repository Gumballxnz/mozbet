-- 1. Assegurar que a publicação supabase_realtime existe (padrão no Supabase)
BEGIN;

-- 2. Adicionar as tabelas críticas ao Realtime (se ainda não estiverem)
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

COMMIT;

-- NOTA: Se receber um erro dizendo "table is already in publication", pode ignorar esse erro específico. Isso significa que a tabela já estava ativada.
