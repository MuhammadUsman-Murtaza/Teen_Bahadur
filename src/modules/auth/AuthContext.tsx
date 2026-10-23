import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabaseClient';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          console.error('Error loading session', error.message);
        }
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);

        supabase.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
        });
      } catch (e: any) {
        console.error(e);
        setConfigError(e?.message || 'Supabase configuration error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void init();

    return () => {
      mounted = false;
    };
  }, []);

  if (configError) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <h1 className="page-title">OnRoute setup</h1>
          <p className="page-intro">{configError}</p>
        </main>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
