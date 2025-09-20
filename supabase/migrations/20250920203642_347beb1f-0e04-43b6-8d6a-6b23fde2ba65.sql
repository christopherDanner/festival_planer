-- Create members table for the entire organization
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- References the organization owner
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  tags TEXT[] DEFAULT '{}', -- Skills/roles like "Grill", "Kassa", "Sanitäter"
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create policies for members
CREATE POLICY "Users can view their own members" 
ON public.members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own members" 
ON public.members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own members" 
ON public.members 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own members" 
ON public.members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create junction table for member assignments to stations
CREATE TABLE public.station_member_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL,
  member_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(station_id, member_id)
);

-- Enable RLS on assignments
ALTER TABLE public.station_member_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for assignments (check through station ownership)
CREATE POLICY "Users can manage assignments for their stations" 
ON public.station_member_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 
  FROM station_assignments sa
  JOIN festivals f ON sa.festival_id = f.id
  WHERE sa.id = station_id AND f.user_id = auth.uid()
));

-- Add indexes for better performance
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_tags ON public.members USING GIN(tags);
CREATE INDEX idx_members_active ON public.members(user_id, is_active);
CREATE INDEX idx_station_member_assignments_station ON public.station_member_assignments(station_id);
CREATE INDEX idx_station_member_assignments_member ON public.station_member_assignments(member_id);