-- Create festival_member_preferences table for festival-specific station preferences
CREATE TABLE public.festival_member_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  station_preferences TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(festival_id, member_id)
);

-- Enable RLS
ALTER TABLE public.festival_member_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for festival_member_preferences
CREATE POLICY "Users can view preferences for their festivals" 
ON public.festival_member_preferences 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.festivals 
  WHERE festivals.id = festival_member_preferences.festival_id 
  AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can manage preferences for their festivals" 
ON public.festival_member_preferences 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.festivals 
  WHERE festivals.id = festival_member_preferences.festival_id 
  AND festivals.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_festival_member_preferences_updated_at
BEFORE UPDATE ON public.festival_member_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_festival_member_preferences_festival ON public.festival_member_preferences(festival_id);
CREATE INDEX idx_festival_member_preferences_member ON public.festival_member_preferences(member_id);
CREATE INDEX idx_festival_member_preferences_festival_member ON public.festival_member_preferences(festival_id, member_id);
