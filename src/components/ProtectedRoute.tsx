import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
}

export default function ProtectedRoute({ children, requireOrganization = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);
  const [checkingOrg, setCheckingOrg] = useState(requireOrganization);

  useEffect(() => {
    if (user && requireOrganization) {
      checkUserOrganization();
    } else if (!requireOrganization) {
      setCheckingOrg(false);
    }
  }, [user, requireOrganization]);

  const checkUserOrganization = async () => {
    try {
      // Check if user has an organization via profile
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!profileError && profile?.organization_id) {
        setHasOrganization(true);
        setCheckingOrg(false);
        return;
      }

      // Check if user is a member of any organization
      const { data: membership, error: membershipError } = await (supabase as any)
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      setHasOrganization(!membershipError && !!membership?.organization_id);
    } catch (error) {
      setHasOrganization(false);
    } finally {
      setCheckingOrg(false);
    }
  };

  // Show loading spinner while checking auth state
  if (loading || checkingOrg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If organization is required but user has none, redirect to onboarding
  if (requireOrganization && hasOrganization === false) {
    return <Navigate to="/onboarding" replace />;
  }

  // If organization is required and we're still checking, show loading
  if (requireOrganization && hasOrganization === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}