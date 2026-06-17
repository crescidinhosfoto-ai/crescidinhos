-- Tabelas necessárias para o Agente WhatsApp Crescidinhos
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/uuorxycrxadhjbrebrlg/sql

-- Perfil do agente (system prompt gerado pela análise de estilo)
CREATE TABLE IF NOT EXISTS perfil_agente (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  system_prompt text NOT NULL,
  analise text,
  versao integer DEFAULT 1,
  ativo boolean DEFAULT true,        -- este perfil é o principal
  agente_ligado boolean DEFAULT false, -- agente está respondendo automaticamente
  criado_em timestamptz DEFAULT now()
);

-- Histórico de conversas do WhatsApp
CREATE TABLE IF NOT EXISTS conversas_whatsapp (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_telefone text NOT NULL,
  mensagem text NOT NULL,
  remetente text NOT NULL CHECK (remetente IN ('cliente', 'agente', 'thais')),
  precisa_atencao boolean DEFAULT false, -- agente sinalizou para Thais olhar
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversas_telefone ON conversas_whatsapp (numero_telefone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perfil_ativo ON perfil_agente (ativo, criado_em DESC);

-- RLS: permite leitura pública (chave publicável já restringe escrita perigosa)
ALTER TABLE perfil_agente ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura_publica_perfil" ON perfil_agente FOR SELECT USING (true);
CREATE POLICY "escrita_publica_perfil" ON perfil_agente FOR ALL USING (true);
CREATE POLICY "leitura_publica_conversas" ON conversas_whatsapp FOR SELECT USING (true);
CREATE POLICY "escrita_publica_conversas" ON conversas_whatsapp FOR ALL USING (true);
