ALTER TABLE festivals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_festivals_deleted_at ON festivals (deleted_at);
