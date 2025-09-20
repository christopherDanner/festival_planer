-- Fix RLS for creating organizations so authenticated users can insert
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Recreate INSERT policy explicitly for authenticated users
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);