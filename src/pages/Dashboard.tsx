import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { 
  Calendar, 
  Users, 
  ClipboardList, 
  ShoppingCart, 
  Smartphone, 
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  ArrowRight
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <Navigation />
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Meine Feste</h1>
            <p className="text-muted-foreground">Übersicht aller geplanten Veranstaltungen</p>
          </div>
          <Button 
            variant="festival" 
            onClick={() => navigate("/")}
            className="px-6"
          >
            <Clock className="h-4 w-4 mr-2" />
            + Neues Fest
          </Button>
        </div>

        {/* Aktuelle Feste */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card 
            className="hover:shadow-festival transition-shadow cursor-pointer"
            onClick={() => navigate("/festival-results")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Feuerwehrfest 2024</CardTitle>
                  <CardDescription>15. - 16. Juni 2024 • 300-800 Besucher</CardDescription>
                </div>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  42 Tage
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">60%</p>
                  <p className="text-xs text-muted-foreground">Aufgaben</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">87%</p>
                  <p className="text-xs text-muted-foreground">Personal</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent">67%</p>
                  <p className="text-xs text-muted-foreground">Bestellungen</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Fest verwalten
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-festival transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Musikfest Herbst</CardTitle>
                  <CardDescription>12. Oktober 2024 • 100-300 Besucher</CardDescription>
                </div>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  159 Tage
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">25%</p>
                  <p className="text-xs text-muted-foreground">Aufgaben</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">0%</p>
                  <p className="text-xs text-muted-foreground">Personal</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">0%</p>
                  <p className="text-xs text-muted-foreground">Bestellungen</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Fest verwalten
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-festival transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                Personen & Einteilung
              </CardTitle>
              <CardDescription>
                Verwalte dein Team und teile Schichten ein
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Kassa Samstag 18-22h</span>
                  <Badge variant="destructive">1 fehlt</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Grill Sonntag 12-16h</span>
                  <Badge variant="secondary">Vollständig</Badge>
                </div>
                <Button variant="festival" className="w-full mt-4">
                  Einteilung öffnen
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-festival transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <ShoppingCart className="h-6 w-6 text-primary" />
                Bestellungen & Ressourcen
              </CardTitle>
              <CardDescription>
                Plane und bestelle alle benötigten Materialien
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Getränke</span>
                  <Badge variant="secondary">Bestellt</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Garnituren</span>
                  <Badge variant="destructive">Offen</Badge>
                </div>
                <Button variant="festival" className="w-full mt-4">
                  Bestellungen verwalten
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-festival transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Smartphone className="h-6 w-6 text-primary" />
                Kellner & Kassa
              </CardTitle>
              <CardDescription>
                Mobile Bestellung und Kassenführung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Optimiert für Smartphones und Tablets
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/mobile-waiter")}
                  >
                    Kellner-Modus
                  </Button>
                  <Button variant="outline" size="sm">
                    Kassa-Modus
                  </Button>
                </div>
                <Button 
                  variant="festival" 
                  className="w-full"
                  onClick={() => navigate("/mobile-waiter")}
                >
                  Mobile Ansicht
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nächste Aufgaben */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6" />
              Nächste Aufgaben
            </CardTitle>
            <CardDescription>
              Was steht als nächstes an?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <AlertCircle className="h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="font-medium">Getränke bei Brauerei bestellen</p>
                  <p className="text-sm text-muted-foreground">Fällig in 3 Tagen</p>
                </div>
                <Button variant="outline" size="sm">Erledigen</Button>
              </div>
              
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <AlertCircle className="h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="font-medium">Kassa Samstag 20-22h: 1 Person fehlt</p>
                  <p className="text-sm text-muted-foreground">Schicht unterbesetzt</p>
                </div>
                <Button variant="outline" size="sm">Zuteilen</Button>
              </div>

              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Plakate drucken lassen</p>
                  <p className="text-sm text-muted-foreground">Fällig in 1 Woche</p>
                </div>
                <Button variant="outline" size="sm">Planen</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}