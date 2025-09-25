-- Create station_shifts table to replace the global shifts system
CREATE TABLE public.station_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL,
  festival_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.station_shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for station_shifts
CREATE POLICY "Users can view station shifts for their festivals" 
ON public.station_shifts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM festivals 
  WHERE festivals.id = station_shifts.festival_id 
  AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can manage station shifts for their festivals" 
ON public.station_shifts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM festivals 
  WHERE festivals.id = station_shifts.festival_id 
  AND festivals.user_id = auth.uid()
));

-- Add foreign key constraint
ALTER TABLE public.station_shifts 
ADD CONSTRAINT station_shifts_station_id_fkey 
FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE CASCADE;

-- Add trigger for updated_at
CREATE TRIGGER update_station_shifts_updated_at
BEFORE UPDATE ON public.station_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data: create station shifts for each shift-station combination
INSERT INTO public.station_shifts (station_id, festival_id, name, start_date, start_time, end_time)
SELECT 
  stations.id as station_id,
  stations.festival_id,
  shifts.name,
  shifts.start_date,
  shifts.start_time,
  shifts.end_time
FROM public.stations
CROSS JOIN public.shifts
WHERE stations.festival_id = shifts.festival_id;

-- Update shift_assignments to reference station_shifts instead of separate shift_id and station_id
ALTER TABLE public.shift_assignments 
ADD COLUMN station_shift_id UUID;

-- Update existing assignments to reference the new station_shifts
UPDATE public.shift_assignments 
SET station_shift_id = station_shifts.id
FROM public.station_shifts
WHERE station_shifts.station_id = shift_assignments.station_id
AND station_shifts.festival_id = shift_assignments.festival_id
AND EXISTS (
  SELECT 1 FROM public.shifts 
  WHERE shifts.id = shift_assignments.shift_id 
  AND shifts.name = station_shifts.name 
  AND shifts.start_date = station_shifts.start_date
  AND shifts.start_time = station_shifts.start_time
  AND shifts.end_time = station_shifts.end_time
);

-- Make station_shift_id required
ALTER TABLE public.shift_assignments 
ALTER COLUMN station_shift_id SET NOT NULL;

-- Add foreign key for station_shift_id
ALTER TABLE public.shift_assignments 
ADD CONSTRAINT shift_assignments_station_shift_id_fkey 
FOREIGN KEY (station_shift_id) REFERENCES public.station_shifts(id) ON DELETE CASCADE;

-- Remove old columns from shift_assignments
ALTER TABLE public.shift_assignments 
DROP COLUMN shift_id,
DROP COLUMN station_id;

-- Drop the old shifts table
DROP TABLE public.shifts;