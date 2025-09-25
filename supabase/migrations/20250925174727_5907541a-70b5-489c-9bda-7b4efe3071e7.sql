-- Revert database to match reverted code - recreate original shifts structure

-- First, recreate the original shifts table
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on shifts table
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shifts
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

-- Add foreign key constraint
ALTER TABLE public.shifts 
ADD CONSTRAINT fk_shifts_festival 
FOREIGN KEY (festival_id) REFERENCES festivals(id);

-- Add trigger for updated_at
CREATE TRIGGER update_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Now update shift_assignments table to use the original structure
-- Add back shift_id and station_id columns
ALTER TABLE public.shift_assignments 
ADD COLUMN shift_id UUID,
ADD COLUMN station_id UUID;

-- Add foreign key constraints
ALTER TABLE public.shift_assignments 
ADD CONSTRAINT fk_shift_assignments_shift 
FOREIGN KEY (shift_id) REFERENCES shifts(id);

ALTER TABLE public.shift_assignments 
ADD CONSTRAINT fk_shift_assignments_station 
FOREIGN KEY (station_id) REFERENCES stations(id);

-- Remove the station_shift_id column
ALTER TABLE public.shift_assignments 
DROP COLUMN station_shift_id;

-- Drop the station_shifts table
DROP TABLE public.station_shifts;