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

// Test seed data
const testCheckliste = [
  { id: 1, task: "Genehmigung beim Amt beantragen", completed: true, dueDate: "2024-05-15", category: "Behörden" },
  { id: 2, task: "Versicherung abschließen", completed: true, dueDate: "2024-05-20", category: "Versicherung" },
  { id: 3, task: "Zelt und Bühne organisieren", completed: false, dueDate: "2024-06-01", category: "Ausstattung" },
  { id: 4, task: "Getränke bestellen", completed: false, dueDate: "2024-06-05", category: "Verpflegung" },
  { id: 5, task: "Musik/DJ buchen", completed: true, dueDate: "2024-05-25", category: "Entertainment" },
  { id: 6, task: "Flyer und Plakate drucken", completed: false, dueDate: "2024-06-10", category: "Marketing" },
  { id: 7, task: "Helfer einteilen", completed: false, dueDate: "2024-06-12", category: "Personal" },
  { id: 8, task: "Sicherheitsdienst organisieren", completed: false, dueDate: "2024-06-01", category: "Sicherheit" },
];

const testEinteilung = [
  { 
    id: 1, 
    bereich: "Kassa", 
    zeit: "Samstag 16:00-20:00", 
    personen: ["Maria Huber", "Johann Steiner"], 
    bedarf: 2,
    status: "complete" 
  },
  { 
    id: 2, 
    bereich: "Kassa", 
    zeit: "Samstag 20:00-24:00", 
    personen: ["Franz Wimmer"], 
    bedarf: 2,
    status: "incomplete" 
  },
  { 
    id: 3, 
    bereich: "Grill", 
    zeit: "Sonntag 11:00-15:00", 
    personen: ["Peter Maier", "Klaus Weber", "Anna Schmidt"], 
    bedarf: 3,
    status: "complete" 
  },
  { 
    id: 4, 
    bereich: "Ausschank", 
    zeit: "Sonntag 15:00-19:00", 
    personen: ["Lisa Bauer"], 
    bedarf: 2,
    status: "incomplete" 
  },
];

const testRessourcen = [
  { id: 1, item: "Bier (Fass 50l)", menge: "12", einheit: "Stück", status: "bestellt", lieferant: "Brauerei Stainz", kosten: "€ 1.200" },
  { id: 2, item: "Würstel", menge: "500", einheit: "Stück", status: "offen", lieferant: "Fleischerei Huber", kosten: "€ 850" },
  { id: 3, item: "Garnituren (Tisch + 2 Bänke)", menge: "20", einheit: "Sets", status: "bestellt", lieferant: "Zeltverleih Graz", kosten: "€ 400" },
  { id: 4, item: "Zelt 10x20m", menge: "1", einheit: "Stück", status: "bestellt", lieferant: "Zeltverleih Graz", kosten: "€ 800" },
  { id: 5, item: "Geschirr (Teller, Besteck)", menge: "300", einheit: "Sets", status: "offen", lieferant: "Gastro Service", kosten: "€ 180" },
  { id: 6, item: "Servietten", menge: "1000", einheit: "Stück", status: "bestellt", lieferant: "Papierhaus", kosten: "€ 45" },
];

export default function FestivalResults() {
  const navigate = useNavigate();
  const [festivalData, setFestivalData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("currentFestival");
    if (stored) {
      setFestivalData(JSON.parse(stored));
    } else {
      // Fallback test data if no festival in localStorage
      setFestivalData({
        type: "feuerwehr",
        startDate: "2024-06-15",
        endDate: "2024-06-16",
        visitorCount: "large"
      });
    }
  }, []);

  const completedTasks = testCheckliste.filter(task => task.completed).length;
  const totalTasks = testCheckliste.length;
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

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
                  {testCheckliste.map((task) => (
                    <div key={task.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      {task.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
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
                  {testEinteilung.map((schicht) => (
                    <div key={schicht.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{schicht.bereich}</h3>
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
                  {testRessourcen.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.item}</h3>
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