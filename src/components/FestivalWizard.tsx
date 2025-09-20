import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createFestival } from "@/lib/festivalService";
import { Calendar, Users, Flame, Music, Grape, Church, Snowflake } from "lucide-react";

interface FestivalWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

const festivalTypes = [
  { id: "feuerwehr", name: "Feuerwehrfest", icon: Flame, color: "bg-red-500" },
  { id: "musik", name: "Musikfest", icon: Music, color: "bg-blue-500" },
  { id: "kirtag", name: "Dorf-/Kirtag", icon: Church, color: "bg-green-500" },
  { id: "wein", name: "Weinfest", icon: Grape, color: "bg-purple-500" },
  { id: "weihnachten", name: "Weihnachtsmarkt", icon: Snowflake, color: "bg-blue-300" },
];

const visitorRanges = [
  { id: "small", label: "< 100 Besucher", range: "<100" },
  { id: "medium", label: "100 - 300 Besucher", range: "100-300" },
  { id: "large", label: "300 - 800 Besucher", range: "300-800" },
  { id: "xlarge", label: "> 800 Besucher", range: ">800" },
];

export default function FestivalWizard({ onClose, onComplete }: FestivalWizardProps) {
  const [step, setStep] = useState(1);
  const [festivalType, setFestivalType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visitorCount, setVisitorCount] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleTypeSelect = (type: string) => {
    setFestivalType(type);
    setStep(2);
  };

  const handleDateSubmit = () => {
    if (startDate) {
      setStep(3);
    }
  };

  const handleComplete = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const festivalData = {
        type: festivalType,
        startDate,
        endDate: endDate !== startDate ? endDate : undefined,
        visitorCount
      };

      const festivalId = await createFestival(festivalData, user.id);
      
      toast({
        title: "Fest erfolgreich erstellt!",
        description: "Ihr Festplan wurde generiert.",
      });

      onComplete();
      navigate(`/festival-results?id=${festivalId}`);
    } catch (error: any) {
      toast({
        title: "Fehler beim Erstellen des Festes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                {step === 1 && "Welche Art von Fest planst du?"}
                {step === 2 && "Wann findet dein Fest statt?"}
                {step === 3 && "Wie viele Besucher erwartest du?"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Wähle den Festtyp für optimale Vorschläge"}
                {step === 2 && "Datum hilft bei der automatischen Planung"}
                {step === 3 && "Die Besucherzahl bestimmt Ressourcen und Personal"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {festivalTypes.map((type) => (
                    <Button
                      key={type.id}
                      variant="outline"
                      className="h-24 flex flex-col gap-2 hover:border-primary"
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <type.icon className="h-8 w-8" />
                      <span className="font-medium">{type.name}</span>
                    </Button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-4">
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
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Zurück
                    </Button>
                    <Button onClick={handleDateSubmit} disabled={!startDate}>
                      Weiter
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
                        variant="outline"
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
                        {loading ? 'Erstelle Plan...' : 'Plan erstellen'}
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