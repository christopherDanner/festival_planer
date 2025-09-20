import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Mail, Shield, Users, Apple } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const { signUp, signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Bitte geben Sie E-Mail und Passwort ein');
      return;
    }

    if (password.length < 6) {
      toast.error('Das Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password);
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.');
        } else {
          toast.error(`Registrierung fehlgeschlagen: ${error.message}`);
        }
      } else {
        toast.success('Registrierung erfolgreich! Sie werden weitergeleitet...');
        navigate('/onboarding');
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Bitte geben Sie E-Mail und Passwort ein');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signInWithEmail(email, password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Ungültige Anmeldedaten. Bitte überprüfen Sie E-Mail und Passwort.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link in Ihrer E-Mail.');
        } else {
          toast.error(`Anmeldung fehlgeschlagen: ${error.message}`);
        }
      } else {
        toast.success('Erfolgreich angemeldet!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading('google');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error('Google-Anmeldung fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setOauthLoading('apple');
    try {
      const { error } = await signInWithApple();
      if (error) {
        toast.error('Apple-Anmeldung fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setOauthLoading(null);
    }
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
            <CardTitle className="text-center">Willkommen</CardTitle>
            <CardDescription className="text-center">
              Wählen Sie Ihre bevorzugte Anmeldemethode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={handleGoogleSignIn}
                disabled={oauthLoading !== null || loading}
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Mit Google anmelden
              </Button>

              <Button
                variant="outline"
                className="w-full h-11"
                onClick={handleAppleSignIn}
                disabled={oauthLoading !== null || loading}
              >
                {oauthLoading === 'apple' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Apple className="w-4 h-4 mr-2" />
                )}
                Mit Apple anmelden
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">oder</span>
              </div>
            </div>

            {/* Email/Password Forms */}
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Anmelden
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Registrieren
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-4">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">E-Mail-Adresse</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="ihre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || oauthLoading !== null}
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
                      disabled={loading || oauthLoading !== null}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11" 
                    disabled={loading || oauthLoading !== null}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    Anmelden
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-Mail-Adresse</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="ihre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || oauthLoading !== null}
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
                      disabled={loading || oauthLoading !== null}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11" 
                    disabled={loading || oauthLoading !== null}
                  >
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;