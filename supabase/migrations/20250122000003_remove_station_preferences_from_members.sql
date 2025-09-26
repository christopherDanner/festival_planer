-- Remove station_preferences column from members table
-- This data is now stored in festival_member_preferences table
ALTER TABLE public.members DROP COLUMN IF EXISTS station_preferences;
