import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Chat, Message } from "@/types/chat";
import { sendChatMessage } from "@/lib/ai";
import { useSubscriptionStore } from "./subscription";
import { FREE_DAILY_MESSAGE_LIMIT } from "@/constants/limits";

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  dailyCount: number;

  loadChats: () => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  findOrCreateChat: (coachId: string) => Promise<string | null>;
  sendMessage: (content: string) => Promise<void>;
  loadDailyUsage: () => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChatId: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  dailyCount: 0,

  loadChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ chats: [], isLoading: false });
        return;
      }

      // Fetch chats with coach info
      const { data: chatsData, error } = await supabase
        .from("chats")
        .select("*, coach:coaches(id, name, avatar_url, specialty)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch last message for each chat
      const chatsWithLastMessage: Chat[] = await Promise.all(
        (chatsData || []).map(async (chat) => {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...chat,
            last_message: lastMsg || undefined,
          };
        })
      );

      set({ chats: chatsWithLastMessage, isLoading: false });
    } catch (err) {
      set({
        chats: [],
        error: (err as Error).message,
        isLoading: false,
      });
    }
  },

  loadChat: async (chatId: string) => {
    // Clear messages when switching chats to prevent stale data
    set({ isLoading: true, error: null, currentChatId: chatId, messages: [] });
    try {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Guard: Only update if still on the same chat (prevents race condition)
      if (get().currentChatId !== chatId) return;

      set({ messages: messages || [], isLoading: false });
    } catch (err) {
      // Guard: Only update if still on the same chat
      if (get().currentChatId !== chatId) return;

      set({
        messages: [],
        error: (err as Error).message,
        isLoading: false,
      });
    }
  },

  findOrCreateChat: async (coachId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ error: "Not authenticated" });
        return null;
      }

      // Check for existing chat - use maybeSingle to handle no-match gracefully
      const { data: existingChat, error: lookupError } = await supabase
        .from("chats")
        .select("*, coach:coaches(id, name, avatar_url, specialty)")
        .eq("user_id", user.id)
        .eq("coach_id", coachId)
        .maybeSingle();

      // Handle real errors (not just "no match")
      if (lookupError) throw lookupError;

      if (existingChat) {
        // Hydrate local state: add/dedupe existing chat
        set((state) => {
          const alreadyExists = state.chats.some((c) => c.id === existingChat.id);
          if (alreadyExists) return state;
          return {
            chats: [{ ...existingChat, last_message: undefined }, ...state.chats],
          };
        });
        return existingChat.id;
      }

      // Create new chat - select full data with coach relation
      const { data: newChat, error: createError } = await supabase
        .from("chats")
        .insert({ user_id: user.id, coach_id: coachId })
        .select("*, coach:coaches(id, name, avatar_url, specialty)")
        .single();

      if (createError) throw createError;

      if (newChat) {
        // Add new chat to local state immediately
        set((state) => ({
          chats: [{ ...newChat, last_message: undefined }, ...state.chats],
        }));
        return newChat.id;
      }

      return null;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  sendMessage: async (content: string) => {
    const { currentChatId, messages } = get();
    const chatIdAtStart = currentChatId; // Capture for race condition guard

    if (!currentChatId) {
      set({ error: "No active chat" });
      return;
    }

    // Get coach ID from current chat
    const { chats, dailyCount } = get();
    const currentChat = chats.find((c) => c.id === currentChatId);
    if (!currentChat) {
      set({ error: "Chat not found" });
      return;
    }

    // Check message limit for free users
    const { isPro } = useSubscriptionStore.getState();
    if (!isPro && dailyCount >= FREE_DAILY_MESSAGE_LIMIT) {
      set({ error: "MESSAGE_LIMIT_REACHED" });
      return;
    }

    set({ isSending: true, error: null });

    // Optimistic update: Add user message immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      chat_id: currentChatId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    set({ messages: [...messages, tempUserMessage] });

    try {
      console.log("[CHAT] Calling sendChatMessage for coach:", currentChat.coach_id);
      const { data, error } = await sendChatMessage({
        coachId: currentChat.coach_id,
        message: content,
        chatId: currentChatId,
      });

      // Guard: Only update if still on the same chat
      if (get().currentChatId !== chatIdAtStart) return;

      if (error) {
        // Remove optimistic message on error
        // Use error.code for limit errors so UI can show paywall
        set({
          messages: messages,
          isSending: false,
          error: error.code === "MESSAGE_LIMIT_REACHED" ? "MESSAGE_LIMIT_REACHED" : error.message,
          dailyCount: error.messageCount || get().dailyCount,
        });
        return;
      }

      if (data) {
        // Replace temp message with real one and add assistant response
        const { data: realMessages, error: fetchError } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", chatIdAtStart)
          .order("created_at", { ascending: true });

        // Guard: Only update if still on the same chat
        if (get().currentChatId !== chatIdAtStart) return;

        if (fetchError || !realMessages) {
          // Keep optimistic messages if refetch fails, just add assistant response
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            chat_id: chatIdAtStart!, // chatIdAtStart is guaranteed non-null here
            role: "assistant",
            content: data.response,
            created_at: new Date().toISOString(),
          };
          set({
            messages: [...get().messages, assistantMessage],
            isSending: false,
            dailyCount: data.messageCount,
          });
        } else {
          set({
            messages: realMessages,
            isSending: false,
            dailyCount: data.messageCount,
          });
        }
      }
    } catch (err) {
      // Guard: Only update if still on the same chat
      if (get().currentChatId !== chatIdAtStart) return;

      set({
        messages: messages,
        isSending: false,
        error: (err as Error).message,
      });
    }
  },

  loadDailyUsage: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_usage")
        .select("message_count")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      set({ dailyCount: data?.message_count || 0 });
    } catch {
      // No usage record exists yet, default to 0
      set({ dailyCount: 0 });
    }
  },

  clearError: () => set({ error: null }),
}));
