-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Members can view organization membership" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON public.organization_members;

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
    AND organization_members.user_id = user_is_org_member.user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_org_admin(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
    AND organization_members.user_id = user_is_org_admin.user_id
    AND role = 'admin'
  );
$$;

-- Create new policies using the security definer functions
CREATE POLICY "Members can view organization membership"
ON public.organization_members
FOR SELECT
USING (public.user_is_org_member(organization_id));

CREATE POLICY "Organization admins can manage members"
ON public.organization_members
FOR ALL
USING (public.user_is_org_admin(organization_id));