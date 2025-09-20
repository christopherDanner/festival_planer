import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FestivalWizard from "@/components/FestivalWizard";
import Navigation from "@/components/Navigation";
import heroImage from "@/assets/hero-festival.jpg";
import { 
  Calendar, 
  Users, 
  ClipboardList, 
  Smartphone, 
  CheckCircle,
  ArrowRight,
  Tent,
  Music,
  Beer
} from "lucide-react";

export default function Index() {
  const [showWizard, setShowWizard] = useState(false);
  const navigate = useNavigate();

  if (showWizard) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Button 
              variant="ghost" 
              onClick={() => setShowWizard(false)}
              className="mb-4"
            >
              ← Zurück zur Startseite
            </Button>
            <h1 className="text-3xl font-bold mb-2">Neues Fest erstellen</h1>
            <p className="text-muted-foreground">In 3 einfachen Schritten zu deinem Festplan</p>
          </div>
          <FestivalWizard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center text-white">
            <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20">
              <Tent className="h-4 w-4 mr-2" />
              Für österreichische Vereine
            </Badge>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              Fest-Planer
              <span className="block text-accent">Österreich</span>
            </h1>
            
            <p className="text-xl lg:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
              Die einfachste Art, Vereinsfeste zu planen. Von der ersten Idee bis zur Abrechnung – alles in einer App.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="festival"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-4"
              >
                Jetzt anmelden
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setShowWizard(true)}
                className="text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Demo ansehen
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Alles was du für dein Fest brauchst
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Von der Planung bis zur Nachbereitung – speziell für österreichische Vereine entwickelt
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="shadow-card hover:shadow-festival transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Smart Planning</CardTitle>
                <CardDescription>
                  Automatische Checklisten und Ressourcen-Vorschläge basierend auf deinem Festtyp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Feuerwehr-, Musik- & Dorffest Templates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Zeitgesteuerte Erinnerungen
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    KI-basierte Mengenplanung
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-festival transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Personen-Einteilung</CardTitle>
                <CardDescription>
                  Drag & Drop Schichtplanung mit Ampel-System für optimale Übersicht
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Excel/CSV Import
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Automatische Fairness-Verteilung
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    PDF-Export für Aushang
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-festival transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Mobile Kassa</CardTitle>
                <CardDescription>
                  Kellner-App und Stationen-Übersicht für reibungslosen Ablauf während dem Fest
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Touch-optimierte Bedienung
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Echtzeit Bestellweiterleitung
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Automatische Bon-Erstellung
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Das sagen unsere Vereine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Music className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Musikverein Stainz</p>
                    <p className="text-sm text-muted-foreground">Steiermark</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "Früher haben wir Tage mit Excel-Listen verbracht. Jetzt haben wir unseren Schichtplan in einer Stunde fertig!"
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Tent className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">FF Wöllersdorf</p>
                    <p className="text-sm text-muted-foreground">Niederösterreich</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "Die Kellner-App funktioniert perfekt auf unseren alten Tablets. Endlich kein Papier-Chaos mehr!"
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Beer className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Gemeinde Hallein</p>
                    <p className="text-sm text-muted-foreground">Salzburg</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "Unser Stadtfest war noch nie so gut organisiert. Die automatischen KI-Vorschläge waren sehr hilfreich."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Bereit für dein nächstes Fest?
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Starte jetzt und erstelle deinen ersten Festplan in unter einer Minute.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate("/auth")}
            className="text-lg px-8 py-4"
          >
            Jetzt kostenlos anmelden
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}