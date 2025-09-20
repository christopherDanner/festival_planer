-- Drop and recreate the organizations policies to fix RLS issues
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Organization admins can update" ON public.organizations;

-- Allow authenticated users to create organizations
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view organizations they belong to (via profiles or organization_members)
CREATE POLICY "Users can view organizations they belong to"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND organization_id IS NOT NULL
  )
  OR
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow organization admins to update organizations
CREATE POLICY "Organization admins can update"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.user_is_org_admin(id));