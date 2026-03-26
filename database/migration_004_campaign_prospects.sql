-- Migration 004: Many-to-many campaigns ↔ prospects
CREATE TABLE IF NOT EXISTS campaign_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, prospect_id)
);
CREATE INDEX IF NOT EXISTS idx_cp_campaign ON campaign_prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_prospect ON campaign_prospects(prospect_id);

-- Migrate existing direct campaign_id assignments
INSERT INTO campaign_prospects (campaign_id, prospect_id)
SELECT campaign_id, id FROM prospects WHERE campaign_id IS NOT NULL
ON CONFLICT DO NOTHING;
