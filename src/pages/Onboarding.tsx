import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Plus, Users, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
}

export default function Onboarding() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkUserOrganization();
      fetchOrganizations();
    }
  }, [user]);

  const checkUserOrganization = async () => {
    try {
      // Check if user already has an organization
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!profileError && profile?.organization_id) {
        navigate('/dashboard');
        return;
      }

      // Also check organization_members table
      const { data: membership, error: membershipError } = await (supabase as any)
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!membershipError && membership?.organization_id) {
        navigate('/dashboard');
        return;
      }
    } catch (error) {
      console.log('User has no organization yet');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const createOrganization = async () => {
    if (!orgName.trim()) {
      setError("Organisationsname ist erforderlich");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create organization
      const { data: org, error: orgError } = await (supabase as any)
        .from('organizations')
        .insert({ name: orgName.trim() })
        .select()
        .single();

      if (orgError) throw orgError;

      if (!org) {
        throw new Error("Organisation konnte nicht erstellt werden");
      }

      // Add user as admin member
      const { error: memberError } = await (supabase as any)
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user?.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      // Update user profile with organization
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('user_id', user?.id);

      if (profileError) throw profileError;

      toast({
        title: "Organisation erstellt",
        description: `${orgName} wurde erfolgreich erstellt.`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || "Fehler beim Erstellen der Organisation");
    } finally {
      setLoading(false);
    }
  };

  const joinOrganization = async (orgId: string, orgName: string) => {
    setLoading(true);
    setError("");

    try {
      // Add user as member
      const { error: memberError } = await (supabase as any)
        .from('organization_members')
        .insert({
          organization_id: orgId,
          user_id: user?.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      // Update user profile with organization
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ organization_id: orgId })
        .eq('user_id', user?.id);

      if (profileError) throw profileError;

      toast({
        title: "Organisation beigetreten",
        description: `Sie sind jetzt Mitglied von ${orgName}.`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || "Fehler beim Beitreten der Organisation");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Willkommen!</h1>
            <p className="text-muted-foreground">
              Wählen Sie eine Organisation aus oder erstellen Sie eine neue.
            </p>
          </div>
          <Button variant="ghost" onClick={signOut}>
            Abmelden
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Neue Organisation erstellen
              </CardTitle>
              <CardDescription>
                Erstellen Sie eine neue Organisation für Ihren Verein
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateForm ? (
                <Button 
                  variant="festival" 
                  className="w-full"
                  onClick={() => setShowCreateForm(true)}
                >
                  Organisation erstellen
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Name der Organisation</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="z.B. Feuerwehr Musterstadt"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={createOrganization}
                      disabled={loading || !orgName.trim()}
                      variant="festival"
                      className="flex-1"
                    >
                      {loading ? "Wird erstellt..." : "Erstellen"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setOrgName("");
                        setError("");
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Join Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bestehender Organisation beitreten
              </CardTitle>
              <CardDescription>
                Wählen Sie eine Organisation aus der Liste
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {organizations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Noch keine Organisationen verfügbar
                  </p>
                ) : (
                  organizations.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Erstellt am {new Date(org.created_at).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => joinOrganization(org.id, org.name)}
                        disabled={loading}
                      >
                        {loading ? "..." : "Beitreten"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Badge variant="secondary" className="px-4 py-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            Sie können später jederzeit zu einer anderen Organisation wechseln
          </Badge>
        </div>
      </div>
    </div>
  );
}