-- Add tax rate and price type to festival_materials
ALTER TABLE festival_materials ADD COLUMN IF NOT EXISTS tax_rate NUMERIC;
ALTER TABLE festival_materials ADD COLUMN IF NOT EXISTS price_is_net BOOLEAN NOT NULL DEFAULT true;
