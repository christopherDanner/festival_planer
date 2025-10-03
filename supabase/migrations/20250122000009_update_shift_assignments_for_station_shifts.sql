-- Update shift_assignments table to reference station_shifts instead of shifts
-- First, add the new column
ALTER TABLE shift_assignments ADD COLUMN station_shift_id UUID REFERENCES station_shifts(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX idx_shift_assignments_station_shift_id ON shift_assignments(station_shift_id);

-- Note: We'll keep the old shift_id column for now to maintain compatibility
-- In a future migration, we can remove it after data migration
