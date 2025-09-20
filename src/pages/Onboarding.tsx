import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Building, Plus, ArrowRight } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

const Onboarding = () => {
  const [step, setStep] = useState<'select' | 'create'>('select');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingOrgs, setFetchingOrgs] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Check if user already has an organization
    checkUserOrganization();
  }, [user, navigate]);

  const checkUserOrganization = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      // If user already has an organization, redirect to dashboard
      if (profile?.organization_id) {
        toast.success('Willkommen zurück!');
        navigate('/dashboard');
        return;
      }
      
      // Otherwise, continue with organization selection
      await fetchOrganizations();
    } catch (error) {
      console.error('Error checking user organization:', error);
      await fetchOrganizations();
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Fehler beim Laden der Organisationen');
    } finally {
      setFetchingOrgs(false);
    }
  };

  const handleSelectOrganization = async () => {
    if (!selectedOrg || !user) return;

    setLoading(true);
    try {
      // Update user profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: selectedOrg })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Add user to organization_members
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: selectedOrg,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      toast.success('Organisation erfolgreich ausgewählt!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error selecting organization:', error);
      toast.error('Fehler beim Beitreten zur Organisation');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim() || !user) return;

    setLoading(true);
    try {
      // Create organization
      const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          slug
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Add user as admin to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      toast.success('Organisation erfolgreich erstellt!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Fehler beim Erstellen der Organisation');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingOrgs) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Lade Organisationen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Willkommen!</h1>
          <p className="text-muted-foreground">
            Für welchen Verein oder Organisation planen Sie?
          </p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Organisation wählen
            </CardTitle>
            <CardDescription>
              Wählen Sie eine bestehende Organisation oder erstellen Sie eine neue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 'select' && (
              <>
                {organizations.length > 0 && (
                  <div className="space-y-4">
                    <Label>Bestehende Organisationen</Label>
                    <div className="space-y-2">
                      {organizations.map((org) => (
                        <div
                          key={org.id}
                          className={`p-3 border rounded-md cursor-pointer transition-colors ${
                            selectedOrg === org.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedOrg(org.id)}
                        >
                          <div className="font-medium">{org.name}</div>
                        </div>
                      ))}
                    </div>
                    
                    {selectedOrg && (
                      <Button 
                        onClick={handleSelectOrganization} 
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="w-4 h-4 mr-2" />
                        )}
                        Organisation beitreten
                      </Button>
                    )}

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">oder</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => setStep('create')} 
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Neue Organisation erstellen
                </Button>
              </>
            )}

            {step === 'create' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Name der Organisation</Label>
                  <Input
                    id="org-name"
                    placeholder="z.B. Freiwillige Feuerwehr Musterstadt"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('select')}
                    className="flex-1"
                  >
                    Zurück
                  </Button>
                  <Button 
                    onClick={handleCreateOrganization}
                    className="flex-1"
                    disabled={!newOrgName.trim() || loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Erstellen
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
