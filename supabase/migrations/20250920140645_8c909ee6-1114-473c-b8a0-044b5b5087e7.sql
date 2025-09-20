-- Drop all unnecessary tables and functions for current app state

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions  
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.user_is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.user_is_org_admin(uuid, uuid);

-- Drop tables (in correct order due to dependencies)
DROP TABLE IF EXISTS public.organization_members;
DROP TABLE IF EXISTS public.organizations;
DROP TABLE IF EXISTS public.profiles;