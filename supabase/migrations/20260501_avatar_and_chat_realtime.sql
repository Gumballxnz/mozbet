-- ============================================
-- MOZBET — Migração: Avatar no Servidor + Realtime Chat
-- Executar no Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- ============================================

-- 1. Adicionar coluna avatar_url na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- 2. Habilitar Realtime na tabela chat_messages (para mensagens aparecerem em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 3. Verificar se a tabela chat_messages existe (caso contrário, criar)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'message' CHECK (type IN ('message', 'win_announcement', 'system', 'fake_user')),
  metadata JSONB DEFAULT NULL,
  avatar TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índice para performance de leitura do chat
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- 5. RLS (Row Level Security) para chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler o chat (público)
CREATE POLICY IF NOT EXISTS "chat_read_all" ON chat_messages FOR SELECT USING (true);

-- Apenas o próprio utilizador pode inserir as suas mensagens
CREATE POLICY IF NOT EXISTS "chat_insert_own" ON chat_messages FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id IS NOT NULL);
