-- Create festival_members table for festival-specific member lists
CREATE TABLE public.festival_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_id UUID NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    station_preferences TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on festival_members
ALTER TABLE public.festival_members ENABLE ROW LEVEL SECURITY;

-- Create policies for festival_members
CREATE POLICY "Users can view festival members for their festivals" 
ON public.festival_members 
FOR SELECT 
USING (EXISTS (
    SELECT 1 
    FROM festivals 
    WHERE festivals.id = festival_members.festival_id 
    AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can manage festival members for their festivals" 
ON public.festival_members 
FOR ALL 
USING (EXISTS (
    SELECT 1 
    FROM festivals 
    WHERE festivals.id = festival_members.festival_id 
    AND festivals.user_id = auth.uid()
));

-- Add foreign key constraint
ALTER TABLE public.festival_members 
ADD CONSTRAINT fk_festival_members_festival_id 
FOREIGN KEY (festival_id) REFERENCES public.festivals(id) ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_festival_members_updated_at
BEFORE UPDATE ON public.festival_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update shift_assignments to reference festival_members instead of members
-- First, add a festival_member_id column
ALTER TABLE public.shift_assignments 
ADD COLUMN festival_member_id UUID;

-- Update the RLS policies for shift_assignments to work with festival_members
DROP POLICY "Users can view assignments for their festivals" ON public.shift_assignments;
DROP POLICY "Users can manage assignments for their festivals" ON public.shift_assignments;

CREATE POLICY "Users can view assignments for their festivals" 
ON public.shift_assignments 
FOR SELECT 
USING (EXISTS (
    SELECT 1 
    FROM festivals 
    WHERE festivals.id = shift_assignments.festival_id 
    AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can manage assignments for their festivals" 
ON public.shift_assignments 
FOR ALL 
USING (EXISTS (
    SELECT 1 
    FROM festivals 
    WHERE festivals.id = shift_assignments.festival_id 
    AND festivals.user_id = auth.uid()
));

-- Update station_member_assignments to work with festival_members
-- Drop the old table and recreate it to reference festival_members
DROP TABLE public.station_member_assignments;

CREATE TABLE public.station_member_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id UUID NOT NULL,
    festival_member_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the new station_member_assignments
ALTER TABLE public.station_member_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage assignments for their stations" 
ON public.station_member_assignments 
FOR ALL 
USING (EXISTS (
    SELECT 1 
    FROM station_assignments sa
    JOIN festivals f ON sa.festival_id = f.id
    WHERE sa.id = station_member_assignments.station_id 
    AND f.user_id = auth.uid()
));

-- Add foreign key constraints
ALTER TABLE public.station_member_assignments 
ADD CONSTRAINT fk_station_member_assignments_station_id 
FOREIGN KEY (station_id) REFERENCES public.station_assignments(id) ON DELETE CASCADE;

ALTER TABLE public.station_member_assignments 
ADD CONSTRAINT fk_station_member_assignments_festival_member_id 
FOREIGN KEY (festival_member_id) REFERENCES public.festival_members(id) ON DELETE CASCADE;