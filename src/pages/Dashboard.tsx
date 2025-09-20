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
  Clock
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
            <h1 className="text-3xl font-bold">Feuerwehrfest 2024</h1>
            <p className="text-muted-foreground">15. - 16. Juni 2024 • 300-800 Besucher erwartet</p>
          </div>
          <Badge variant="secondary" className="px-4 py-2">
            <Clock className="h-4 w-4 mr-2" />
            42 Tage bis zum Fest
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">12/20</p>
                  <p className="text-sm text-muted-foreground">Aufgaben erledigt</p>
                </div>
              </div>
              <Progress value={60} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">24/35</p>
                  <p className="text-sm text-muted-foreground">Personen eingeteilt</p>
                </div>
              </div>
              <Progress value={69} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">8/15</p>
                  <p className="text-sm text-muted-foreground">Bestellungen bestätigt</p>
                </div>
              </div>
              <Progress value={53} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-muted-foreground">Offene Punkte</p>
                </div>
              </div>
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