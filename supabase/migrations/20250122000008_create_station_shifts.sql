-- Create station_shifts table for station-specific shifts
CREATE TABLE IF NOT EXISTS station_shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_date DATE,
    end_time TIME NOT NULL,
    required_people INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE station_shifts ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read station shifts
CREATE POLICY "Users can read station shifts for their festivals" ON station_shifts
    FOR SELECT USING (
        festival_id IN (
            SELECT id FROM festivals WHERE user_id = auth.uid()
        )
    );

-- Policy for authenticated users to insert station shifts
CREATE POLICY "Users can insert station shifts for their festivals" ON station_shifts
    FOR INSERT WITH CHECK (
        festival_id IN (
            SELECT id FROM festivals WHERE user_id = auth.uid()
        )
    );

-- Policy for authenticated users to update station shifts
CREATE POLICY "Users can update station shifts for their festivals" ON station_shifts
    FOR UPDATE USING (
        festival_id IN (
            SELECT id FROM festivals WHERE user_id = auth.uid()
        )
    );

-- Policy for authenticated users to delete station shifts
CREATE POLICY "Users can delete station shifts for their festivals" ON station_shifts
    FOR DELETE USING (
        festival_id IN (
            SELECT id FROM festivals WHERE user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_station_shifts_festival_id ON station_shifts(festival_id);
CREATE INDEX idx_station_shifts_station_id ON station_shifts(station_id);
CREATE INDEX idx_station_shifts_start_date ON station_shifts(start_date);
