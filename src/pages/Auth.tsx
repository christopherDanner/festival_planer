import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Mail, Shield, Users } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { signUp, signInWithEmail, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Bitte E-Mail und Passwort eingeben');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    
    if (error) {
      toast.error(`Registrierung fehlgeschlagen: ${error.message}`);
    } else {
      toast.success('Registrierung erfolgreich! Bitte E-Mail bestätigen.');
      navigate('/onboarding');
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Bitte E-Mail und Passwort eingeben');
      return;
    }

    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    
    if (error) {
      toast.error(`Anmeldung fehlgeschlagen: ${error.message}`);
    } else {
      toast.success('Erfolgreich angemeldet!');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Bitte E-Mail-Adresse eingeben');
      return;
    }

    setLoading(true);
    const { error } = await signInWithMagicLink(email);
    
    if (error) {
      toast.error(`Magic Link fehlgeschlagen: ${error.message}`);
    } else {
      setMagicLinkSent(true);
      toast.success('Magic Link wurde gesendet! Bitte E-Mail überprüfen.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Fest-Planer Österreich</h1>
          <p className="text-muted-foreground">
            Anmelden oder registrieren für Ihren Vereinsbereich
          </p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center">Willkommen zurück</CardTitle>
            <CardDescription className="text-center">
              Wählen Sie Ihre bevorzugte Anmeldemethode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="magic-link" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="magic-link" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Magic Link
                </TabsTrigger>
                <TabsTrigger value="password" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Passwort
                </TabsTrigger>
              </TabsList>

              <TabsContent value="magic-link" className="space-y-4">
                {magicLinkSent ? (
                  <div className="text-center space-y-4 p-6">
                    <div className="text-6xl">📧</div>
                    <h3 className="text-lg font-medium">Magic Link gesendet!</h3>
                    <p className="text-muted-foreground">
                      Wir haben Ihnen einen Anmeldelink per E-Mail gesendet. 
                      Klicken Sie darauf, um sich anzumelden.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setMagicLinkSent(false)}
                    >
                      Zurück zur Anmeldung
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="magic-email">E-Mail-Adresse</Label>
                      <Input
                        id="magic-email"
                        type="email"
                        placeholder="ihre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Magic Link senden
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Sicher und ohne Passwort anmelden
                    </p>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="password" className="space-y-4">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Anmelden</TabsTrigger>
                    <TabsTrigger value="signup">Registrieren</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="space-y-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">E-Mail-Adresse</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="ihre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Passwort</Label>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="Ihr Passwort"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Anmelden
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">E-Mail-Adresse</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="ihre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Passwort</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Mindestens 6 Zeichen"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Users className="w-4 h-4 mr-2" />
                        )}
                        Registrieren
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Mit der Registrierung stimmen Sie unseren Nutzungsbedingungen zu
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;