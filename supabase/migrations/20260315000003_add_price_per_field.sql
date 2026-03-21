ALTER TABLE festival_materials ADD COLUMN IF NOT EXISTS price_per TEXT NOT NULL DEFAULT 'packaging';
