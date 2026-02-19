-- Neue Tabelle: Direkte Mitglieder-Zuweisung zu Stationen (ohne Schicht)
CREATE TABLE station_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(station_id, member_id)
);

ALTER TABLE station_members ENABLE ROW LEVEL SECURITY;

-- RLS: Nur eigene Daten (über festival → user_id)
CREATE POLICY "Users can manage their own station members"
    ON station_members FOR ALL
    USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

-- Verantwortliche Person pro Station
ALTER TABLE stations ADD COLUMN responsible_member_id UUID REFERENCES members(id) ON DELETE SET NULL;
