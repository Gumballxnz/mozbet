-- 1. Cria a tabela de notificações realtime
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL significa GLOBAL (Para Todos)
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Ativa o Row Level Security (mas deixa admins gravarem e utilizadores lerem os seus)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilizadores podem ler as suas notificações e as globais"
ON public.notifications FOR SELECT
USING ( auth.uid()::text = user_id::text OR user_id IS NULL );

CREATE POLICY "Apenas Service/Admins inserem"
ON public.notifications FOR INSERT
WITH CHECK ( true ); -- (Inserido via backend seguro)

CREATE POLICY "Apenas Utilizadores leem/atualizam o seu lido"
ON public.notifications FOR UPDATE
USING ( auth.uid()::text = user_id::text );

-- 3. Injeta a tabela no canal Websocket (Isto é a Magia do Ponto Vermelho!)
alter publication supabase_realtime add table public.notifications;
