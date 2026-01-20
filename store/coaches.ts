import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Coach, PREBUILT_COACHES } from "@/constants/coaches";
import { Specialty } from "@/constants/theme";
import { useSubscriptionStore } from "./subscription";
import { FREE_CUSTOM_COACH_LIMIT } from "@/constants/limits";

// Valid specialty values for validation
const VALID_SPECIALTIES: Specialty[] = [
  "productivity",
  "goals",
  "habits",
  "mindset",
  "focus",
  "custom",
];

interface CoachState {
  coaches: Coach[];
  selectedCoach: Coach | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadCoaches: () => Promise<void>;
  selectCoach: (id: string) => void;
  createCustomCoach: (
    coach: Omit<Coach, "id" | "isPrebuilt">
  ) => Promise<Coach | null>;
  clearError: () => void;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  coaches: PREBUILT_COACHES,
  selectedCoach: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadCoaches: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get current user first
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not authenticated - only show prebuilt coaches
        set({ coaches: PREBUILT_COACHES, isLoading: false });
        return;
      }

      // Fetch ONLY current user's custom coaches (enforced by RLS + explicit filter)
      // Select only needed columns for list view performance
      const { data: customCoaches, error } = await supabase
        .from("coaches")
        .select("id, name, avatar_url, specialty, description, system_prompt, creator_id")
        .eq("is_prebuilt", false)
        .eq("creator_id", user.id); // Explicit filter for security

      if (error) throw error;

      // Map DB format to app format with specialty validation
      const mapped: Coach[] = (customCoaches || []).map((c) => ({
        id: c.id,
        name: c.name,
        avatar: c.avatar_url || "🤖",
        // Validate specialty, fallback to "custom" if invalid
        specialty: VALID_SPECIALTIES.includes(c.specialty as Specialty)
          ? (c.specialty as Specialty)
          : "custom",
        description: c.description || "",
        systemPrompt: c.system_prompt,
        isPrebuilt: false,
        creatorId: c.creator_id,
      }));

      // Merge: prebuilt first, then user's custom coaches
      set({ coaches: [...PREBUILT_COACHES, ...mapped], isLoading: false });
    } catch (err) {
      // If table doesn't exist or other error, just use prebuilt coaches
      set({
        coaches: PREBUILT_COACHES,
        error: (err as Error).message,
        isLoading: false,
      });
    }
  },

  selectCoach: (id: string) => {
    const coach = get().coaches.find((c) => c.id === id) || null;
    set({ selectedCoach: coach });
  },

  createCustomCoach: async (coach) => {
    set({ isSaving: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ isSaving: false, error: "Not authenticated" });
        return null;
      }

      // Check coach limit for free users
      // TODO: Production Enhancement - Server-side Enforcement
      // This client-side check can be bypassed via direct DB inserts.
      // For production, add one of these:
      // 1. RLS policy: CREATE POLICY "Coach limit for free users" ON coaches
      //    FOR INSERT WITH CHECK (is_pro_user() OR count_custom_coaches() < FREE_CUSTOM_COACH_LIMIT)
      // 2. Database trigger: Check count before insert, reject if >= limit and not Pro
      // 3. Edge Function: Create coaches via Edge Function that verifies limit
      const { coaches } = get();
      const { isPro } = useSubscriptionStore.getState();
      const customCoachCount = coaches.filter(
        (c) => !c.isPrebuilt && c.creatorId === user.id
      ).length;

      if (!isPro && customCoachCount >= FREE_CUSTOM_COACH_LIMIT) {
        set({ isSaving: false, error: "COACH_LIMIT_REACHED" });
        return null;
      }

      // Validate specialty before insert
      const validSpecialty = VALID_SPECIALTIES.includes(coach.specialty)
        ? coach.specialty
        : "custom";

      const { data, error } = await supabase
        .from("coaches")
        .insert({
          name: coach.name,
          avatar_url: coach.avatar,
          specialty: validSpecialty,
          description: coach.description,
          system_prompt: coach.systemPrompt,
          is_prebuilt: false,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) {
        set({ isSaving: false, error: error.message });
        return null;
      }

      if (!data) {
        set({ isSaving: false, error: "Failed to create coach" });
        return null;
      }

      const newCoach: Coach = {
        id: data.id,
        name: data.name,
        avatar: data.avatar_url || "🤖",
        specialty: data.specialty,
        description: data.description || "",
        systemPrompt: data.system_prompt,
        isPrebuilt: false,
        creatorId: data.creator_id,
      };

      set({ coaches: [...get().coaches, newCoach], isSaving: false });
      return newCoach;
    } catch (err) {
      set({ isSaving: false, error: (err as Error).message });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
