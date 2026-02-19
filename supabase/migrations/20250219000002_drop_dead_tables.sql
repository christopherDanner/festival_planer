-- Drop tables that are no longer used after the station_shifts migration
DROP TABLE IF EXISTS member_preferences CASCADE;
DROP TABLE IF EXISTS magic_links CASCADE;
DROP TABLE IF EXISTS station_shift_assignments CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
