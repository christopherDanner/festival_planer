-- Create festival_materials table for material/order tracking per festival
CREATE TABLE IF NOT EXISTS festival_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  supplier TEXT,
  unit TEXT NOT NULL DEFAULT 'Stück',
  packaging_unit TEXT,
  amount_per_packaging NUMERIC,
  ordered_quantity NUMERIC NOT NULL DEFAULT 0,
  actual_quantity NUMERIC,
  unit_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE festival_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own festival materials"
  ON festival_materials
  FOR ALL
  USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_festival_materials_festival_id ON festival_materials(festival_id);
CREATE INDEX idx_festival_materials_station_id ON festival_materials(station_id);
CREATE INDEX idx_festival_materials_supplier ON festival_materials(supplier);
