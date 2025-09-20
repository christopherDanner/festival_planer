-- Drop all unnecessary tables and functions for current app state
-- Need to use CASCADE to handle dependencies

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Drop tables (this will also drop their triggers)
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.user_is_org_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_is_org_admin(uuid, uuid) CASCADE;