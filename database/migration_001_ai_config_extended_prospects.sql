-- ============================================
-- Migration 001: ai_config + extended prospects
-- ============================================

-- Tabla de configuración de proveedor IA
CREATE TABLE IF NOT EXISTS ai_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    text NOT NULL CHECK (provider IN ('anthropic', 'openai', 'openrouter', 'mistral', 'deepseek')),
  model       text NOT NULL,
  api_key     text NOT NULL,
  api_url     text,
  activo      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Solo un proveedor activo a la vez (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_config_activo ON ai_config (activo) WHERE activo = true;

-- Columnas extendidas en prospects (datos de ficha Google Maps)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS horario text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS categoria_google text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS ficha_reclamada boolean DEFAULT false;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS url_maps text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS imagen_url text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS resenas_texto text;
