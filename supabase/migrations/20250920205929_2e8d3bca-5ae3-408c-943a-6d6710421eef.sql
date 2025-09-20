-- Create shifts table for time periods
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stations table to properly define work stations
CREATE TABLE public.stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL,
  name TEXT NOT NULL,
  required_people INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shift assignments table (junction table)
CREATE TABLE public.shift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL,
  shift_id UUID NOT NULL,
  station_id UUID NOT NULL,
  member_id UUID,
  position INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for shifts
CREATE POLICY "Users can view shifts for their festivals" 
ON public.shifts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM festivals 
  WHERE festivals.id = shifts.festival_id 
  AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can manage shifts for their festivals" 
ON public.shifts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM festivals 
  WHERE festivals.id = shifts.festival_id 
  AND festivals.user_id = auth.uid()
));

-- Create policies for stations
CREATE POLICY "Users can view stations for their festivals" 
ON public.stations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM festivals 
  WHERE festivals.id = stations.festival_id 
  AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can manage stations for their festivals" 
ON public.stations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM festivals 
  WHERE festivals.id = stations.festival_id 
  AND festivals.user_id = auth.uid()
));

-- Create policies for shift assignments
CREATE POLICY "Users can view assignments for their festivals" 
ON public.shift_assignments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM festivals 
  WHERE festivals.id = shift_assignments.festival_id 
  AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can manage assignments for their festivals" 
ON public.shift_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM festivals 
  WHERE festivals.id = shift_assignments.festival_id 
  AND festivals.user_id = auth.uid()
));

-- Add foreign key constraints
ALTER TABLE public.shifts 
ADD CONSTRAINT fk_shifts_festival 
FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;

ALTER TABLE public.stations 
ADD CONSTRAINT fk_stations_festival 
FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;

ALTER TABLE public.shift_assignments 
ADD CONSTRAINT fk_shift_assignments_festival 
FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;

ALTER TABLE public.shift_assignments 
ADD CONSTRAINT fk_shift_assignments_shift 
FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;

ALTER TABLE public.shift_assignments 
ADD CONSTRAINT fk_shift_assignments_station 
FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE CASCADE;

ALTER TABLE public.shift_assignments 
ADD CONSTRAINT fk_shift_assignments_member 
FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stations_updated_at
BEFORE UPDATE ON public.stations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_assignments_updated_at
BEFORE UPDATE ON public.shift_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_shifts_festival_id ON public.shifts(festival_id);
CREATE INDEX idx_stations_festival_id ON public.stations(festival_id);
CREATE INDEX idx_shift_assignments_festival_id ON public.shift_assignments(festival_id);
CREATE INDEX idx_shift_assignments_shift_id ON public.shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_station_id ON public.shift_assignments(station_id);
CREATE INDEX idx_shift_assignments_member_id ON public.shift_assignments(member_id);