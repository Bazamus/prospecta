-- ============================================
-- Migration 002: ai_config activo → estado
-- ============================================

ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS estado text DEFAULT 'guardada';
UPDATE ai_config SET estado = CASE WHEN activo = true THEN 'principal' ELSE 'guardada' END;
ALTER TABLE ai_config ADD CONSTRAINT ai_config_estado_check CHECK (estado IN ('principal', 'guardada'));
ALTER TABLE ai_config ALTER COLUMN estado SET NOT NULL;
DROP INDEX IF EXISTS idx_ai_config_activo;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_config_principal ON ai_config (estado) WHERE estado = 'principal';
ALTER TABLE ai_config DROP COLUMN IF EXISTS activo;
