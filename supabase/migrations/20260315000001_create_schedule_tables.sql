-- Create schedule tables for festival timeline planning

-- 1. Schedule Days
CREATE TABLE IF NOT EXISTS schedule_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  label TEXT,
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(festival_id, date)
);

ALTER TABLE schedule_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedule days"
  ON schedule_days
  FOR ALL
  USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

CREATE INDEX idx_schedule_days_festival_id ON schedule_days(festival_id);

-- 2. Schedule Phases
CREATE TABLE IF NOT EXISTS schedule_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_day_id UUID NOT NULL REFERENCES schedule_days(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE schedule_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedule phases"
  ON schedule_phases
  FOR ALL
  USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

CREATE INDEX idx_schedule_phases_schedule_day_id ON schedule_phases(schedule_day_id);
CREATE INDEX idx_schedule_phases_festival_id ON schedule_phases(festival_id);

-- 3. Schedule Entries
CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_phase_id UUID NOT NULL REFERENCES schedule_phases(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'program')),
  start_time TIME,
  end_time TIME,
  responsible_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('open', 'done') OR status IS NULL),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedule entries"
  ON schedule_entries
  FOR ALL
  USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

CREATE INDEX idx_schedule_entries_schedule_phase_id ON schedule_entries(schedule_phase_id);
CREATE INDEX idx_schedule_entries_festival_id ON schedule_entries(festival_id);
CREATE INDEX idx_schedule_entries_responsible_member_id ON schedule_entries(responsible_member_id);
