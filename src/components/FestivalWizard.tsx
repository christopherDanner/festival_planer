import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createFestival } from "@/lib/festivalService";
import { Calendar, MapPin, Users, Flame, Music, Grape, Church, Snowflake, PartyPopper, Disc3, Building } from "lucide-react";

interface FestivalWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

const festivalTypes = [
  { id: "feuerwehr", name: "Feuerwehrfest", icon: Flame, color: "bg-red-500" },
  { id: "musik", name: "Musikfest", icon: Music, color: "bg-blue-500" },
  { id: "ball", name: "Ball", icon: PartyPopper, color: "bg-purple-500" },
  { id: "disco", name: "Disco", icon: Disc3, color: "bg-pink-500" },
  { id: "kirtag", name: "Dorffest/Kirtag", icon: Church, color: "bg-green-500" },
  { id: "wein", name: "Weinfest", icon: Grape, color: "bg-purple-600" },
  { id: "weihnachten", name: "Weihnachtsmarkt", icon: Snowflake, color: "bg-blue-300" },
  { id: "other", name: "Sonstiges", icon: Building, color: "bg-gray-500" },
];

const visitorRanges = [
  { id: "small", label: "< 100 Besucher", range: "<100" },
  { id: "medium", label: "100 - 300 Besucher", range: "100-300" },
  { id: "large", label: "300 - 800 Besucher", range: "300-800" },
  { id: "xlarge", label: "> 800 Besucher", range: ">800" },
];

export default function FestivalWizard({ onClose, onComplete }: FestivalWizardProps) {
  const [step, setStep] = useState(1);
  const [festivalName, setFestivalName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [festivalType, setFestivalType] = useState("");
  const [visitorCount, setVisitorCount] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleBasicInfoSubmit = () => {
    if (festivalName && location && startDate) {
      setStep(2);
    }
  };

  const handleTypeSubmit = () => {
    setStep(3);
  };

  const handleComplete = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (festivalName && location && startDate && visitorCount) {
      // Navigate to preview instead of creating festival directly
      const festivalData = {
        name: festivalName,
        location,
        startDate,
        endDate: endDate !== startDate ? endDate : undefined,
        type: festivalType,
        visitorCount
      };

      // Pass data to preview component
      navigate('/festival-preview', { 
        state: { festivalData } 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Neues Fest erstellen</h1>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {num}
                </div>
                {num < 3 && <div className={`w-12 h-0.5 ${step > num ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {step === 1 && "Grundinformationen"}
                {step === 2 && "Festtyp (optional)"}
                {step === 3 && "Erwartete Besucherzahl"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Name, Datum und Ort Ihres Festes"}
                {step === 2 && "Wählen Sie einen Festtyp für bessere Vorschläge"}
                {step === 3 && "Die Besucherzahl hilft bei der Ressourcenplanung"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="festivalName">Name des Festes</Label>
                      <Input
                        id="festivalName"
                        type="text"
                        placeholder="z.B. Sommerfest 2024"
                        value={festivalName}
                        onChange={(e) => setFestivalName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="location">Ort</Label>
                      <Input
                        id="location"
                        type="text"
                        placeholder="z.B. Gemeindezentrum, Festplatz"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Startdatum</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">Enddatum (optional)</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleBasicInfoSubmit} 
                    className="w-full"
                    disabled={!festivalName || !location || !startDate}
                  >
                    Weiter
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {festivalTypes.map((type) => (
                      <Button
                        key={type.id}
                        variant={festivalType === type.id ? "default" : "outline"}
                        className="h-24 flex flex-col gap-2 hover:border-primary"
                        onClick={() => setFestivalType(type.id)}
                      >
                        <type.icon className="h-8 w-8" />
                        <span className="font-medium">{type.name}</span>
                      </Button>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Zurück
                    </Button>
                    <Button onClick={handleTypeSubmit} className="flex-1">
                      {festivalType ? "Weiter" : "Überspringen"}
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visitorRanges.map((range) => (
                      <Button
                        key={range.id}
                        variant={visitorCount === range.id ? "default" : "outline"}
                        className="h-20 flex flex-col gap-2 hover:border-primary"
                        onClick={() => setVisitorCount(range.id)}
                      >
                        <Users className="h-6 w-6" />
                        <span className="font-medium">{range.label}</span>
                      </Button>
                    ))}
                  </div>
                  
                  {visitorCount && (
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(2)}>
                        Zurück
                      </Button>
                      <Button 
                        onClick={handleComplete}
                        className="w-full"
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? 'Erstelle Plan...' : 'Fest erstellen'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}