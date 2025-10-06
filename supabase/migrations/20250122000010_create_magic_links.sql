-- Create magic_links table
CREATE TABLE IF NOT EXISTS magic_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES members(id),
    UNIQUE(festival_id, member_id)
);

-- Create member_preferences table for storing preferences submitted via magic links
CREATE TABLE IF NOT EXISTS member_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    magic_link_id UUID REFERENCES magic_links(id) ON DELETE SET NULL,
    station_preferences JSONB DEFAULT '[]'::jsonb,
    shift_preferences JSONB DEFAULT '[]'::jsonb,
    min_shifts INTEGER NOT NULL DEFAULT 1,
    max_shifts INTEGER NOT NULL DEFAULT 3,
    availability_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(festival_id, member_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_magic_links_festival ON magic_links(festival_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_member ON magic_links(member_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);

CREATE INDEX IF NOT EXISTS idx_member_preferences_festival ON member_preferences(festival_id);
CREATE INDEX IF NOT EXISTS idx_member_preferences_member ON member_preferences(member_id);
CREATE INDEX IF NOT EXISTS idx_member_preferences_submitted ON member_preferences(submitted_at);

-- Add RLS policies
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_preferences ENABLE ROW LEVEL SECURITY;

-- Magic links can be read by anyone with the token (for the form)
CREATE POLICY "Magic links are readable with token" ON magic_links
    FOR SELECT USING (true);

-- Magic links can be managed by festival organizers
CREATE POLICY "Magic links manageable by organizers" ON magic_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM festivals f 
            WHERE f.id = magic_links.festival_id 
            AND f.user_id = auth.uid()
        )
    );

-- Member preferences can be read by festival organizers
CREATE POLICY "Member preferences readable by organizers" ON member_preferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM festivals f 
            WHERE f.id = member_preferences.festival_id 
            AND f.user_id = auth.uid()
        )
    );

-- Member preferences can be inserted/updated by the member themselves
CREATE POLICY "Member preferences writable by member" ON member_preferences
    FOR ALL USING (
        member_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM festivals f 
            WHERE f.id = member_preferences.festival_id 
            AND f.user_id = auth.uid()
        )
    );
