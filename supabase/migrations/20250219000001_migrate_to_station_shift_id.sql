-- Migration: Switch shift_assignments from shift_id to station_shift_id
-- The app currently stores station_shift UUIDs in the shift_id column.
-- This migration adds station_shift_id, copies data, then drops shift_id.

-- 1. Add the new column
ALTER TABLE shift_assignments ADD COLUMN station_shift_id uuid;

-- 2. Copy shift_id → station_shift_id where a matching station_shift exists
UPDATE shift_assignments
SET station_shift_id = shift_id
WHERE EXISTS (SELECT 1 FROM station_shifts ss WHERE ss.id = shift_id);

-- 3. Delete orphaned rows that don't match any station_shift
DELETE FROM shift_assignments WHERE station_shift_id IS NULL;

-- 4. Make station_shift_id NOT NULL and add FK
ALTER TABLE shift_assignments ALTER COLUMN station_shift_id SET NOT NULL;
ALTER TABLE shift_assignments ADD CONSTRAINT fk_shift_assignments_station_shift
    FOREIGN KEY (station_shift_id) REFERENCES station_shifts(id) ON DELETE CASCADE;

-- 5. Drop the old FK constraint and column
ALTER TABLE shift_assignments DROP CONSTRAINT IF EXISTS fk_shift_assignments_shift;
ALTER TABLE shift_assignments DROP COLUMN IF EXISTS shift_id;

-- 6. Also drop festival_member_id column (unused)
ALTER TABLE shift_assignments DROP COLUMN IF EXISTS festival_member_id;

-- 7. Clean up phantom shifts (shifts table rows whose IDs match station_shifts)
DELETE FROM shifts s WHERE EXISTS (SELECT 1 FROM station_shifts ss WHERE ss.id = s.id);
