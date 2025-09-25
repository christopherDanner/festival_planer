-- Add station preferences to members table
ALTER TABLE public.members 
ADD COLUMN station_preferences text[] DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.members.station_preferences IS 'Array of station IDs that the member prefers to work at';