-- Add shift_preferences column to festival_member_preferences table
ALTER TABLE public.festival_member_preferences 
ADD COLUMN shift_preferences TEXT[] DEFAULT '{}';

-- Add index for better performance
CREATE INDEX idx_festival_member_preferences_shift_preferences 
ON public.festival_member_preferences USING GIN (shift_preferences);
