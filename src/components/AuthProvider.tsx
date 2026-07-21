import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth-State-Listener: hält user/session aktuell (auch nach Auto-Login).
    // loading wird bewusst nicht hier beendet, sondern erst nach dem
    // Bootstrap unten — sonst würde ProtectedRoute vor dem Auto-Login
    // kurz nach /auth umleiten.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    const bootstrap = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Dev-Komfort: ohne Session lokal automatisch anmelden, damit kein
      // manueller Login nötig ist. Greift NUR im Dev-Build und nur, wenn
      // Zugangsdaten in .env (VITE_DEV_AUTH_*) hinterlegt sind. Im Prod-Build
      // ist import.meta.env.DEV false → der Zweig wird wegoptimiert.
      if (!session && import.meta.env.DEV && import.meta.env.MODE !== 'test') {
        const email = import.meta.env.VITE_DEV_AUTH_EMAIL;
        const password = import.meta.env.VITE_DEV_AUTH_PASSWORD;
        if (email && password) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            console.warn('[dev-auto-login] fehlgeschlagen:', error.message);
          }
          // Bei Erfolg hat onAuthStateChange user/session bereits gesetzt.
          setLoading(false);
          return;
        }
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };
    bootstrap();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    signIn,
    signOut,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}