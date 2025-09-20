import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { 
  CheckCircle2, 
  Circle, 
  Users, 
  ShoppingCart,
  Calendar,
  Clock,
  AlertCircle,
  Plus,
  Edit
} from "lucide-react";
import { generateFestivalPlan, type ChecklistItem, type StationAssignment, type Resource } from "@/lib/festivalPlanGenerator";

export default function FestivalResults() {
  const navigate = useNavigate();
  const [festivalData, setFestivalData] = useState<any>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [stations, setStations] = useState<StationAssignment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("currentFestival");
    let data;
    if (stored) {
      data = JSON.parse(stored);
    } else {
      // Fallback test data if no festival in localStorage
      data = {
        type: "feuerwehr",
        startDate: "2024-06-15",
        endDate: "2024-06-16",
        visitorCount: "large"
      };
    }
    
    setFestivalData(data);
    
    // Generate AI-based plans
    const generatedPlan = generateFestivalPlan(data);
    setChecklist(generatedPlan.checklist);
    setStations(generatedPlan.stations);
    setResources(generatedPlan.resources);
  }, []);

  const completedTasks = checklist.filter(task => task.completed).length;
  const totalTasks = checklist.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getPriorityColor = (priority: 'green' | 'yellow' | 'red') => {
    switch (priority) {
      case 'green': return 'text-green-500';
      case 'yellow': return 'text-yellow-500';
      case 'red': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityIcon = (priority: 'green' | 'yellow' | 'red') => {
    return <div className={`w-2 h-2 rounded-full ${priority === 'green' ? 'bg-green-500' : priority === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />;
  };

  const getFestivalTypeName = (type: string) => {
    const types: { [key: string]: string } = {
      feuerwehr: "Feuerwehrfest",
      musik: "Musikfest",
      kirtag: "Dorf-/Kirtag",
      wein: "Weinfest",
      weihnachten: "Weihnachtsmarkt"
    };
    return types[type] || "Fest";
  };

  const getVisitorRange = (range: string) => {
    const ranges: { [key: string]: string } = {
      small: "< 100 Besucher",
      medium: "100-300 Besucher",
      large: "300-800 Besucher",
      xlarge: "> 800 Besucher"
    };
    return ranges[range] || "Unbekannt";
  };

  if (!festivalData) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <Navigation />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{getFestivalTypeName(festivalData.type)} 2024</h1>
            <p className="text-muted-foreground">
              {new Date(festivalData.startDate).toLocaleDateString('de-AT')} 
              {festivalData.endDate && festivalData.endDate !== festivalData.startDate && 
                ` - ${new Date(festivalData.endDate).toLocaleDateString('de-AT')}`
              } • {getVisitorRange(festivalData.visitorCount)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
            >
              <Calendar className="h-4 w-4" />
              Zum Dashboard
            </Button>
            <Button 
              variant="festival"
              onClick={() => navigate("/")}
            >
              <Plus className="h-4 w-4" />
              Neues Fest
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                  <p className="text-sm text-muted-foreground">Aufgaben erledigt</p>
                </div>
              </div>
              <Progress value={completionPercentage} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">7/8</p>
                  <p className="text-sm text-muted-foreground">Schichten besetzt</p>
                </div>
              </div>
              <Progress value={87} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">4/6</p>
                  <p className="text-sm text-muted-foreground">Bestellungen abgeschlossen</p>
                </div>
              </div>
              <Progress value={67} className="mt-4" />
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="checkliste" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="checkliste">Checkliste</TabsTrigger>
            <TabsTrigger value="einteilung">Einteilung</TabsTrigger>
            <TabsTrigger value="ressourcen">Ressourcen</TabsTrigger>
          </TabsList>

          <TabsContent value="checkliste">
            <Card>
              <CardHeader>
                <CardTitle>Aufgaben-Checkliste</CardTitle>
                <CardDescription>
                  Alle wichtigen Aufgaben für dein {getFestivalTypeName(festivalData.type)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {checklist.map((task) => (
                    <div key={task.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(task.priority)}
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.task}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="secondary">{task.category}</Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Fällig: {new Date(task.dueDate).toLocaleDateString('de-AT')}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="einteilung">
            <Card>
              <CardHeader>
                <CardTitle>Personen-Einteilung</CardTitle>
                <CardDescription>
                  Schichtpläne und Personalzuteilung
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stations.map((schicht) => (
                    <div key={schicht.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(schicht.priority)}
                            <h3 className="font-semibold">{schicht.bereich}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{schicht.zeit}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {schicht.status === 'complete' ? (
                            <Badge variant="secondary">Vollständig</Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {schicht.bedarf - schicht.personen.length} fehlt
                            </Badge>
                          )}
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        {schicht.personen.map((person, index) => (
                          <Badge key={index} variant="outline">{person}</Badge>
                        ))}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {schicht.personen.length} von {schicht.bedarf} Personen eingeteilt
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ressourcen">
            <Card>
              <CardHeader>
                <CardTitle>Ressourcen & Bestellungen</CardTitle>
                <CardDescription>
                  Übersicht aller benötigten Materialien und Bestellungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resources.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getPriorityIcon(item.priority)}
                            <h3 className="font-semibold">{item.item}</h3>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Menge: {item.menge} {item.einheit}</span>
                            <span>Lieferant: {item.lieferant}</span>
                            <span className="font-medium text-foreground">{item.kosten}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'bestellt' ? (
                            <Badge variant="secondary">Bestellt</Badge>
                          ) : (
                            <Badge variant="destructive">Offen</Badge>
                          )}
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}