import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/AuthProvider";
import { AlertCircle, Tent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          setError("Vor- und Nachname sind erforderlich");
          setLoading(false);
          return;
        }
        result = await signUp(email, password, firstName, lastName);
      }

      if (result.error) {
        if (result.error.message.includes("Invalid login credentials")) {
          setError("Ungültige Anmeldedaten. Bitte überprüfen Sie Email und Passwort.");
        } else if (result.error.message.includes("User already registered")) {
          setError("Ein Benutzer mit dieser Email-Adresse ist bereits registriert.");
        } else if (result.error.message.includes("Password should be at least")) {
          setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
        } else {
          setError(result.error.message);
        }
      } else {
        if (!isLogin) {
          toast({
            title: "Registrierung erfolgreich",
            description: "Bitte überprüfen Sie Ihre Email für die Bestätigung.",
          });
        } else {
          navigate("/onboarding");
        }
      }
    } catch (err) {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Tent className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Fest-Planer Österreich</h1>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? "Melden Sie sich an" : "Erstellen Sie Ihr Konto"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isLogin ? "Anmelden" : "Registrieren"}</CardTitle>
            <CardDescription>
              {isLogin 
                ? "Geben Sie Ihre Anmeldedaten ein" 
                : "Erstellen Sie ein neues Konto für Ihren Verein"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" variant="festival" disabled={loading}>
                {loading ? "Wird verarbeitet..." : (isLogin ? "Anmelden" : "Registrieren")}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setEmail("");
                  setPassword("");
                  setFirstName("");
                  setLastName("");
                }}
              >
                {isLogin 
                  ? "Noch kein Konto? Jetzt registrieren" 
                  : "Bereits ein Konto? Jetzt anmelden"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}