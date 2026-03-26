-- Migration 003: Nichos configurables
CREATE TABLE IF NOT EXISTS nichos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  color text DEFAULT '#6B7280',
  activo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO nichos (nombre, slug, color) VALUES
  ('Climatización', 'climatizacion', '#10B981'),
  ('Instalaciones', 'instalaciones', '#3B82F6'),
  ('Energía', 'energia', '#F59E0B'),
  ('Otro', 'otro', '#6B7280')
ON CONFLICT (slug) DO NOTHING;

-- Remove hardcoded CHECK constraints on nicho columns
-- (run manually: SELECT conname FROM pg_constraint WHERE conrelid = 'prospects'::regclass AND conname LIKE '%nicho%')
