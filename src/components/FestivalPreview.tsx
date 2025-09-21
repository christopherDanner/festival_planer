import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generateFestivalPlan, FestivalData } from "@/lib/festivalPlanGenerator";
import { createFestival } from "@/lib/festivalService";
import { getMembers } from "@/lib/memberService";
import { Users, Check, X, Edit, Lightbulb, Plus, Trash2 } from "lucide-react";

interface FestivalPreviewProps {
  festivalData: FestivalData;
  onBack: () => void;
}

export default function FestivalPreview({ festivalData, onBack }: FestivalPreviewProps) {
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [editableStations, setEditableStations] = useState<any[]>([]);
  const [editableShifts, setEditableShifts] = useState<any[]>([]);
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
      
      // Set editable copies of stations and shifts
      setEditableStations(plan.shiftStations || []);
      setEditableShifts(plan.shifts || []);
      
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
      // Create festival with edited data
      const updatedData = {
        ...festivalData,
        customStations: useAISuggestions ? editableStations : undefined,
        customShifts: useAISuggestions ? editableShifts : undefined
      };
      
      const festivalId = await createFestival(updatedData, user.id);
      
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

  const addStation = () => {
    const newStation = {
      name: "Neue Station",
      description: "",
      required_people: 1
    };
    setEditableStations([...editableStations, newStation]);
  };

  const updateStation = (index: number, field: string, value: any) => {
    const updated = [...editableStations];
    updated[index] = { ...updated[index], [field]: value };
    setEditableStations(updated);
  };

  const removeStation = (index: number) => {
    const updated = editableStations.filter((_, i) => i !== index);
    setEditableStations(updated);
  };

  const addShift = () => {
    const newShift = {
      name: "Neue Schicht",
      start_time: "09:00",
      end_time: "12:00",
      date: festivalData.startDate
    };
    setEditableShifts([...editableShifts, newShift]);
  };

  const updateShift = (index: number, field: string, value: any) => {
    const updated = [...editableShifts];
    updated[index] = { ...updated[index], [field]: value };
    setEditableShifts(updated);
  };

  const removeShift = (index: number) => {
    const updated = editableShifts.filter((_, i) => i !== index);
    setEditableShifts(updated);
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
        {useAISuggestions && (
          <Tabs defaultValue="stationen" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stationen">Stationen ({editableStations.length})</TabsTrigger>
              <TabsTrigger value="schichten">Schichten ({editableShifts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="stationen">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Stationen bearbeiten</CardTitle>
                      <CardDescription>
                        Bearbeiten Sie die vorgeschlagenen Stationen oder fügen Sie neue hinzu
                      </CardDescription>
                    </div>
                    <Button onClick={addStation} size="sm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Neue Station
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {editableStations.map((station, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Input
                              value={station.name}
                              onChange={(e) => updateStation(index, 'name', e.target.value)}
                              placeholder="Stationsname"
                              className="font-medium"
                            />
                            <Button
                              onClick={() => removeStation(index)}
                              size="sm"
                              variant="destructive"
                              className="ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Textarea
                            value={station.description || ''}
                            onChange={(e) => updateStation(index, 'description', e.target.value)}
                            placeholder="Beschreibung (optional)"
                            className="text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`people-${index}`} className="text-sm">
                              Benötigte Personen:
                            </Label>
                            <Input
                              id={`people-${index}`}
                              type="number"
                              min="1"
                              value={station.required_people}
                              onChange={(e) => updateStation(index, 'required_people', parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                    {editableStations.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Noch keine Stationen vorhanden. Fügen Sie eine neue Station hinzu.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schichten">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Schichten bearbeiten</CardTitle>
                      <CardDescription>
                        Bearbeiten Sie die vorgeschlagenen Schichten oder fügen Sie neue hinzu
                      </CardDescription>
                    </div>
                    <Button onClick={addShift} size="sm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Neue Schicht
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {editableShifts.map((shift, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Input
                              value={shift.name}
                              onChange={(e) => updateShift(index, 'name', e.target.value)}
                              placeholder="Schichtname"
                              className="font-medium"
                            />
                            <Button
                              onClick={() => removeShift(index)}
                              size="sm"
                              variant="destructive"
                              className="ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label htmlFor={`date-${index}`} className="text-sm">Datum</Label>
                              <Input
                                id={`date-${index}`}
                                type="date"
                                value={shift.date || festivalData.startDate}
                                onChange={(e) => updateShift(index, 'date', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`start-${index}`} className="text-sm">Von</Label>
                              <Input
                                id={`start-${index}`}
                                type="time"
                                value={shift.start_time}
                                onChange={(e) => updateShift(index, 'start_time', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`end-${index}`} className="text-sm">Bis</Label>
                              <Input
                                id={`end-${index}`}
                                type="time"
                                value={shift.end_time}
                                onChange={(e) => updateShift(index, 'end_time', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {editableShifts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Noch keine Schichten vorhanden. Fügen Sie eine neue Schicht hinzu.
                      </p>
                    )}
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