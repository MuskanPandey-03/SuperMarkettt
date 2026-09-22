import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile, Role } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('profile load failed', error);
      return null;
    }
    return data as Profile | null;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        loadProfile(data.session.user.id).then((profile) => {
          if (!mounted) return;
          setState({ user: data.session.user, session: data.session, profile, loading: false });
        });
      } else {
        setState({ user: null, session: null, profile: null, loading: false });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const profile = await loadProfile(session.user.id);
          setState({ user: session.user, session, profile, loading: false });
        } else {
          setState({ user: null, session: null, profile: null, loading: false });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (state.user) {
      const profile = await loadProfile(state.user.id);
      setState((s) => ({ ...s, profile }));
    }
  }, [state.user, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, role: Role) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) return { error: error.message };
      const userId = data.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          full_name: fullName,
          role,
        });
        if (profileError) {
          console.error('profile insert failed', profileError);
          return { error: 'Could not complete registration. Please try again.' };
        }
      }
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
