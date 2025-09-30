-- Add end_date column to shifts table for multi-day shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN shifts.end_date IS 'Optional end date for multi-day shifts. If NULL, shift ends on the same day as start_date.';
