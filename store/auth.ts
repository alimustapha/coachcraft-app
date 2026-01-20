import { create } from "zustand";
import { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  initialize: () => Promise<() => void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,
  error: null,
  setSession: (session) => set({ session, user: session?.user ?? null, error: session ? null : undefined }),
  initialize: async () => {
    // Wait for session restoration from AsyncStorage
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      set({ error: error.message, user: null, session: null, initialized: true });
    } else if (session) {
      set({ user: session.user, session, error: null, initialized: true });
    } else {
      set({ user: null, session: null, error: null, initialized: true });
    }

    // Set up listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        // Clear error when session is successfully restored
        set({ session, user: session?.user ?? null, error: session ? null : undefined });
      }
    );

    return () => subscription.unsubscribe();
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("Sign out error:", error);
      throw error;
    }
  },
}));
