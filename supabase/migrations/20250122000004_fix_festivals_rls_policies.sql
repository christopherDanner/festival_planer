-- Fix RLS policies for festivals table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their festivals" ON public.festivals;
DROP POLICY IF EXISTS "Users can create their festivals" ON public.festivals;
DROP POLICY IF EXISTS "Users can update their festivals" ON public.festivals;
DROP POLICY IF EXISTS "Users can delete their festivals" ON public.festivals;

-- Create new RLS policies for festivals
CREATE POLICY "Users can view their festivals" 
ON public.festivals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their festivals" 
ON public.festivals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their festivals" 
ON public.festivals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their festivals" 
ON public.festivals 
FOR DELETE 
USING (auth.uid() = user_id);
