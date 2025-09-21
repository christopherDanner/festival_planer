import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generateFestivalPlan, FestivalData } from "@/lib/festivalPlanGenerator";
import { createFestival } from "@/lib/festivalService";
import { getMembers } from "@/lib/memberService";
import { Calendar, Users, Check, X, Edit, Lightbulb } from "lucide-react";

interface FestivalPreviewProps {
  festivalData: FestivalData;
  onBack: () => void;
}

export default function FestivalPreview({ festivalData, onBack }: FestivalPreviewProps) {
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [useAISuggestions, setUseAISuggestions] = useState(true);
  const [generateShiftPlan, setGenerateShiftPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadPreviewData();
  }, [user]);

  const loadPreviewData = async () => {
    try {
      // Load existing members
      const membersData = await getMembers();
      setMembers(membersData);
      
      // Generate preview plan
      const plan = generateFestivalPlan(festivalData, membersData);
      setGeneratedPlan(plan);
      
      // Auto-enable shift plan generation if members exist
      if (membersData.length > 0) {
        setGenerateShiftPlan(true);
      }
    } catch (error: any) {
      toast({
        title: "Fehler beim Laden der Vorschau",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFestival = async () => {
    if (!user) return;
    
    setCreating(true);
    try {
      const festivalId = await createFestival(festivalData, user.id);
      
      toast({
        title: "Fest erfolgreich erstellt!",
        description: "Ihr Festplan wurde generiert.",
      });

      navigate(`/festival-results?id=${festivalId}`);
    } catch (error: any) {
      toast({
        title: "Fehler beim Erstellen des Festes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateEmpty = async () => {
    if (!user) return;
    
    setCreating(true);
    try {
      // Create festival with empty plan
      const emptyData = { ...festivalData, type: undefined };
      const festivalId = await createFestival(emptyData, user.id);
      
      toast({
        title: "Leeres Fest erstellt!",
        description: "Sie können nun alle Daten manuell hinzufügen.",
      });

      navigate(`/festival-results?id=${festivalId}`);
    } catch (error: any) {
      toast({
        title: "Fehler beim Erstellen des Festes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'red': return 'destructive';
      case 'yellow': return 'default';
      case 'green': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-6 w-6 animate-pulse text-primary" />
          <p>Generiere Vorschläge mit KI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Festplan-Vorschau</h1>
            <p className="text-muted-foreground">
              {festivalData.name} | {new Date(festivalData.startDate).toLocaleDateString('de-AT')}
              {festivalData.endDate && festivalData.endDate !== festivalData.startDate && 
                ` bis ${new Date(festivalData.endDate).toLocaleDateString('de-AT')}`}
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            Zurück bearbeiten
          </Button>
        </div>

        {/* Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              KI-Vorschläge & Einstellungen
            </CardTitle>
            <CardDescription>
              Entscheiden Sie, wie Ihr Fest erstellt werden soll
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-suggestions">KI-Vorschläge verwenden</Label>
                <p className="text-sm text-muted-foreground">
                  Übernehmen Sie die generierten Aufgaben, Stationen und Ressourcen
                </p>
              </div>
              <Switch
                id="ai-suggestions"
                checked={useAISuggestions}
                onCheckedChange={setUseAISuggestions}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="shift-plan">Schichtplan automatisch befüllen</Label>
                <p className="text-sm text-muted-foreground">
                  {members.length > 0 
                    ? `${members.length} Mitglieder gefunden - automatisch einteilen?`
                    : "Keine Mitglieder vorhanden - Schichtplan bleibt leer"
                  }
                </p>
              </div>
              <Switch
                id="shift-plan"
                checked={generateShiftPlan}
                onCheckedChange={setGenerateShiftPlan}
                disabled={members.length === 0}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleCreateFestival}
                disabled={creating}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {creating ? 'Erstelle...' : 'Mit Vorschlägen erstellen'}
              </Button>
              <Button 
                variant="outline"
                onClick={handleCreateEmpty}
                disabled={creating}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Leer starten
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Tabs */}
        {useAISuggestions && generatedPlan && (
          <Tabs defaultValue="checkliste" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="checkliste">Aufgaben ({generatedPlan.checklist?.length || 0})</TabsTrigger>
              <TabsTrigger value="stationen">Stationen ({generatedPlan.shiftStations?.length || 0})</TabsTrigger>
              <TabsTrigger value="ressourcen">Ressourcen ({generatedPlan.resources?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="checkliste">
              <Card>
                <CardHeader>
                  <CardTitle>Generierte Aufgaben-Checkliste</CardTitle>
                  <CardDescription>
                    Diese Aufgaben werden für Ihr Fest vorgeschlagen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {generatedPlan.checklist?.map((item: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg bg-card">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.task}</span>
                            <Badge variant={getPriorityColor(item.priority)}>
                              {item.priority === 'red' ? 'Wichtig' : 
                               item.priority === 'yellow' ? 'Mittel' : 'Niedrig'}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground space-x-4">
                            <span>Fällig: {new Date(item.dueDate).toLocaleDateString('de-AT')}</span>
                            <span>Kategorie: {item.category}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stationen">
              <Card>
                <CardHeader>
                  <CardTitle>Generierte Stationen</CardTitle>
                  <CardDescription>
                    Diese Stationen werden für Ihr Fest angelegt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {generatedPlan.shiftStations?.map((station: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{station.name}</h4>
                            <Badge variant="outline">
                              <Users className="h-3 w-3 mr-1" />
                              {station.required_people} Personen
                            </Badge>
                          </div>
                          {station.description && (
                            <p className="text-sm text-muted-foreground">{station.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ressourcen">
              <Card>
                <CardHeader>
                  <CardTitle>Generierte Ressourcen</CardTitle>
                  <CardDescription>
                    Diese Materialien werden als Bedarf erfasst
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {generatedPlan.resources?.map((resource: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{resource.item}</h4>
                            <Badge variant={getPriorityColor(resource.priority)}>
                              {resource.priority === 'red' ? 'Wichtig' : 
                               resource.priority === 'yellow' ? 'Mittel' : 'Niedrig'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Menge:</p>
                              <p className="text-muted-foreground">{resource.menge} {resource.einheit}</p>
                            </div>
                            <div>
                              <p className="font-medium">Geschätzte Kosten:</p>
                              <p className="text-muted-foreground">{resource.kosten}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}