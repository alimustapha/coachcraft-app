import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface UserContext {
  values: string[];
  goals: string[];
  challenges: string[];
}

interface ContextState {
  context: UserContext | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadContext: () => Promise<void>;
  saveContext: (context: UserContext) => Promise<boolean>;
  clearError: () => void;
}

export const useContextStore = create<ContextState>((set) => ({
  context: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadContext: async () => {
    set({ isLoading: true, error: null });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_context")
        .select("values, goals, challenges")
        .eq("user_id", user.id)
        .single();

      // PGRST116 = no rows found, which is fine for new users
      if (error && error.code !== "PGRST116") throw error;

      set({
        context: data
          ? {
              values: data.values || [],
              goals: data.goals || [],
              challenges: data.challenges || [],
            }
          : null,
        isLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  saveContext: async (context) => {
    set({ isSaving: true, error: null });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("user_context").upsert(
        {
          user_id: user.id,
          values: context.values,
          goals: context.goals,
          challenges: context.challenges,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      set({ context, isSaving: false });
      return true;
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
