import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Flame, Music, Grape, Church } from "lucide-react";
import { useNavigate } from "react-router-dom";

const festivalTypes = [
  { id: "feuerwehr", name: "Feuerwehrfest", icon: Flame, color: "bg-red-500" },
  { id: "musik", name: "Musikfest", icon: Music, color: "bg-blue-500" },
  { id: "kirtag", name: "Dorf-/Kirtag", icon: Church, color: "bg-green-500" },
  { id: "wein", name: "Weinfest", icon: Grape, color: "bg-purple-500" },
];

const visitorRanges = [
  { id: "small", label: "< 100 Besucher", range: "<100" },
  { id: "medium", label: "100 - 300 Besucher", range: "100-300" },
  { id: "large", label: "300 - 800 Besucher", range: "300-800" },
  { id: "xlarge", label: "> 800 Besucher", range: ">800" },
];

export default function FestivalWizard() {
  const [step, setStep] = useState(1);
  const [festivalData, setFestivalData] = useState({
    type: "",
    startDate: "",
    endDate: "",
    visitorCount: "",
  });
  const navigate = useNavigate();

  const handleTypeSelect = (type: string) => {
    setFestivalData({ ...festivalData, type });
    setStep(2);
  };

  const handleDateSubmit = () => {
    if (festivalData.startDate) {
      setStep(3);
    }
  };

  const handleVisitorSelect = (visitorCount: string) => {
    setFestivalData({ ...festivalData, visitorCount });
    // Here we would typically save to database and navigate to dashboard
    console.log("Festival created:", { ...festivalData, visitorCount });
    navigate("/dashboard");
  };

  return (
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

      <Card className="shadow-festival">
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
                  <label className="block text-sm font-medium mb-2">Startdatum</label>
                  <input
                    type="date"
                    className="w-full p-3 border rounded-lg"
                    value={festivalData.startDate}
                    onChange={(e) => setFestivalData({ ...festivalData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Enddatum (optional)</label>
                  <input
                    type="date"
                    className="w-full p-3 border rounded-lg"
                    value={festivalData.endDate}
                    onChange={(e) => setFestivalData({ ...festivalData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Zurück
                </Button>
                <Button variant="festival" onClick={handleDateSubmit} disabled={!festivalData.startDate}>
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
                    onClick={() => handleVisitorSelect(range.id)}
                  >
                    <Users className="h-6 w-6" />
                    <span className="font-medium">{range.label}</span>
                  </Button>
                ))}
              </div>
              <Button variant="outline" onClick={() => setStep(2)}>
                Zurück
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}