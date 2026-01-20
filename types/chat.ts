export interface Chat {
  id: string
  user_id: string
  coach_id: string
  created_at: string
  updated_at: string
  // Joined fields from coaches table via Supabase select with relation
  // Query: .select('*, coach:coaches(id, name, avatar_url, specialty)')
  coach?: {
    id: string
    name: string
    avatar_url: string // Maps to coaches.avatar_url column
    specialty: string
  }
  // Derived field: NOT from database, computed in loadChats by fetching last message
  last_message?: {
    content: string
    created_at: string
  }
}

export interface Message {
  id: string
  chat_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

// DailyUsage is only used server-side in Edge Function
// Client reads dailyCount from Edge Function response (messageCount field)
// No client-side DailyUsage interface needed
