import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  gymId: string | null;
  signUp: (email: string, password: string, fullName: string, gymName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [gymId, setGymId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer profile fetch to avoid deadlock
        setTimeout(() => fetchGymId(session.user.id), 0);
      } else {
        setGymId(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchGymId(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchGymId = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", userId)
      .single();
    if (data?.gym_id) setGymId(data.gym_id);
  };

  const normalizeEmail = (email: string) => email.trim().toLowerCase();

  const signUp = async (email: string, password: string, fullName: string, gymName: string) => {
    const normalizedEmail = normalizeEmail(email);
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: fullName, gym_name: gymName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setGymId(null);
  };

  const resetPassword = async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, gymId, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
