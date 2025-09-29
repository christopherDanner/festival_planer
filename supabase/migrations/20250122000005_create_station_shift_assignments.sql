-- Create station_shift_assignments table
CREATE TABLE IF NOT EXISTS station_shift_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(festival_id, station_id, shift_id)
);

-- Add RLS policies
ALTER TABLE station_shift_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read station shift assignments
CREATE POLICY "Users can read station shift assignments for their festivals" ON station_shift_assignments
    FOR SELECT USING (
        festival_id IN (
            SELECT id FROM festivals WHERE user_id = auth.uid()
        )
    );

-- Policy for authenticated users to insert station shift assignments
CREATE POLICY "Users can insert station shift assignments for their festivals" ON station_shift_assignments
    FOR INSERT WITH CHECK (
        festival_id IN (
            SELECT id FROM festivals WHERE user_id = auth.uid()
        )
    );

-- Policy for authenticated users to update station shift assignments
CREATE POLICY "Users can update station shift assignments for their festivals" ON station_shift_assignments
    FOR UPDATE USING (
        festival_id IN (
            SELECT id FROM festivals WHERE user_id = auth.uid()
        )
    );

-- Policy for authenticated users to delete station shift assignments
CREATE POLICY "Users can delete station shift assignments for their festivals" ON station_shift_assignments
    FOR DELETE USING (
        festival_id IN (
            SELECT id FROM festivals WHERE user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_station_shift_assignments_festival_id ON station_shift_assignments(festival_id);
CREATE INDEX idx_station_shift_assignments_station_id ON station_shift_assignments(station_id);
CREATE INDEX idx_station_shift_assignments_shift_id ON station_shift_assignments(shift_id);
