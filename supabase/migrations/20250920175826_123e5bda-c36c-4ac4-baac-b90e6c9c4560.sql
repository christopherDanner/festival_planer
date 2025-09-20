-- Create festivals table
CREATE TABLE public.festivals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feuerwehr', 'musik', 'kirtag', 'wein', 'weihnachten')),
  start_date DATE NOT NULL,
  end_date DATE,
  visitor_count TEXT NOT NULL CHECK (visitor_count IN ('small', 'medium', 'large', 'xlarge')),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist_items table
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  due_date DATE NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('green', 'yellow', 'red')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create station_assignments table
CREATE TABLE public.station_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  bereich TEXT NOT NULL,
  zeit TEXT NOT NULL,
  personen TEXT[] NOT NULL DEFAULT '{}',
  bedarf INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('complete', 'incomplete')) DEFAULT 'incomplete',
  priority TEXT NOT NULL CHECK (priority IN ('green', 'yellow', 'red')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resources table
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  menge TEXT NOT NULL,
  einheit TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('bestellt', 'offen')) DEFAULT 'offen',
  lieferant TEXT NOT NULL,
  kosten TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('green', 'yellow', 'red')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for festivals
CREATE POLICY "Users can view their own festivals" 
ON public.festivals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own festivals" 
ON public.festivals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own festivals" 
ON public.festivals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own festivals" 
ON public.festivals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for checklist_items
CREATE POLICY "Users can view checklist items for their festivals" 
ON public.checklist_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.festivals 
  WHERE festivals.id = checklist_items.festival_id 
  AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can modify checklist items for their festivals" 
ON public.checklist_items 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.festivals 
  WHERE festivals.id = checklist_items.festival_id 
  AND festivals.user_id = auth.uid()
));

-- Create RLS policies for station_assignments
CREATE POLICY "Users can view station assignments for their festivals" 
ON public.station_assignments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.festivals 
  WHERE festivals.id = station_assignments.festival_id 
  AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can modify station assignments for their festivals" 
ON public.station_assignments 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.festivals 
  WHERE festivals.id = station_assignments.festival_id 
  AND festivals.user_id = auth.uid()
));

-- Create RLS policies for resources
CREATE POLICY "Users can view resources for their festivals" 
ON public.resources 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.festivals 
  WHERE festivals.id = resources.festival_id 
  AND festivals.user_id = auth.uid()
));

CREATE POLICY "Users can modify resources for their festivals" 
ON public.resources 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.festivals 
  WHERE festivals.id = resources.festival_id 
  AND festivals.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on festivals
CREATE TRIGGER update_festivals_updated_at
  BEFORE UPDATE ON public.festivals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();