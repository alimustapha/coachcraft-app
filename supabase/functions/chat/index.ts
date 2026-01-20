import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Debug: Entry log
  console.log("[ENTRY] method:", req.method, "auth:", !!req.headers.get("Authorization"));

  try {
    // 1. Validate JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[REJECT_AUTH_MISSING]");
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    // Client with user's JWT for auth check (SERVICE_ROLE_KEY needed for JWT validation)
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Service client for DB operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.log("[REJECT_AUTH_INVALID]", !!authError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.log("[REJECT_PARSE]");
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body || typeof body !== "object") {
      console.log("[REJECT_BODY_INVALID]");
      return new Response(JSON.stringify({ error: "Request body must be an object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[BODY] coachId:", !!body.coachId, "message:", !!body.message, "chatId:", !!body.chatId);
    const { coachId, message, chatId } = body;

    if (!coachId || typeof coachId !== "string") {
      console.log("[REJECT_COACH_ID]");
      return new Response(
        JSON.stringify({ error: "coachId is required and must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      console.log("[REJECT_MESSAGE]");
      return new Response(
        JSON.stringify({ error: "message is required and must be a non-empty string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Check if user is Pro (skip rate limit for Pro users)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    const isPro = profile?.is_pro || false;

    // 4. Check rate limit (10/day for FREE users only)
    // Track currentCount in outer scope for response
    let currentCount = 0;
    if (!isPro) {
      const today = new Date().toISOString().split("T")[0];
      const { data: usageData } = await supabaseAdmin
        .from("daily_usage")
        .select("message_count")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      currentCount = usageData?.message_count || 0;
      // FREE_DAILY_MESSAGE_LIMIT = 10 (must match constants/limits.ts)
      if (currentCount >= 10) {
        console.log("[REJECT_RATE_LIMIT]");
        return new Response(
          JSON.stringify({
            error: "MESSAGE_LIMIT_REACHED",
            messageCount: currentCount,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 5. Fetch coach system prompt (with visibility check)
    const { data: coach, error: coachError } = await supabaseAdmin
      .from("coaches")
      .select("name, system_prompt, is_prebuilt, is_public, creator_id")
      .eq("id", coachId)
      .single();

    if (coachError || !coach) {
      console.log("[REJECT_COACH_NOT_FOUND]");
      return new Response(JSON.stringify({ error: "Coach not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user can access this coach
    const canAccess =
      coach.is_prebuilt ||
      coach.is_public ||
      coach.creator_id === user.id;

    if (!canAccess) {
      console.log("[REJECT_COACH_ACCESS]");
      return new Response(
        JSON.stringify({ error: "You don't have access to this coach" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Fetch user context
    const { data: userContext } = await supabaseAdmin
      .from("user_context")
      .select("values, goals, challenges")
      .eq("user_id", user.id)
      .single();

    // 7. Fetch conversation history (last 20 messages)
    // SECURITY: Validate chat ownership before reading history
    let conversationHistory: { role: string; content: string }[] = [];
    if (chatId) {
      // Verify user owns this chat and it matches the requested coach
      const { data: chatOwnership, error: ownershipError } = await supabaseAdmin
        .from("chats")
        .select("id, user_id, coach_id")
        .eq("id", chatId)
        .single();

      if (ownershipError || !chatOwnership) {
        console.log("[REJECT_CHAT_NOT_FOUND]");
        return new Response(JSON.stringify({ error: "Chat not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (chatOwnership.user_id !== user.id) {
        console.log("[REJECT_CHAT_UNAUTHORIZED]");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (chatOwnership.coach_id !== coachId) {
        console.log("[REJECT_COACH_MISMATCH]");
        return new Response(JSON.stringify({ error: "Coach mismatch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch most recent 20 messages (descending), then reverse for chronological order
      const { data: messages } = await supabaseAdmin
        .from("messages")
        .select("role, content")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(20);

      conversationHistory = (messages || []).reverse();
    }

    // 8. Build Claude API request
    const systemPrompt = `${coach.system_prompt}

${
  userContext
    ? `The user has shared the following about themselves:
- Values: ${userContext.values?.join(", ") || "Not specified"}
- Goals: ${userContext.goals?.join(", ") || "Not specified"}
- Challenges: ${userContext.challenges?.join(", ") || "Not specified"}

Use this context to provide personalized, relevant guidance.`
    : ""
}`;

    const claudeMessages = [
      ...conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // 9. Call Claude API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: isPro ? "claude-3-5-sonnet-20241022" : "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.log("[REJECT_CLAUDE_API]");
      console.error("Claude API error:", claudeResponse.status, errorText);
      // Return 200 with error in body so Supabase client puts it in data, not error
      // This allows the client to parse and display user-friendly error messages
      return new Response(JSON.stringify({
        error: "AI_SERVICE_ERROR",
        message: "The AI is temporarily unavailable. Please try again."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeData = await claudeResponse.json();
    const aiResponse = claudeData.content[0].text;

    // 10. Determine chat ID (create if new)
    let finalChatId = chatId;
    if (!finalChatId) {
      const { data: newChat, error: chatError } = await supabaseAdmin
        .from("chats")
        .insert({ user_id: user.id, coach_id: coachId })
        .select("id")
        .single();

      if (chatError) {
        console.log("[REJECT_CHAT_CREATE]");
        return new Response(JSON.stringify({ error: "Failed to create chat" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      finalChatId = newChat.id;
    }

    // 11. Save messages to database
    await supabaseAdmin.from("messages").insert([
      { chat_id: finalChatId, role: "user", content: message },
      { chat_id: finalChatId, role: "assistant", content: aiResponse },
    ]);

    // 12. Update chat timestamp
    await supabaseAdmin
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", finalChatId);

    // 13. Increment daily usage (function uses CURRENT_DATE internally)
    const { data: newUsage } = await supabaseAdmin.rpc("increment_daily_usage", {
      p_user_id: user.id,
    });

    // 14. Return response
    console.log("[SUCCESS]");
    return new Response(
      JSON.stringify({
        response: aiResponse,
        chatId: finalChatId,
        messageCount: newUsage?.[0]?.message_count || currentCount + 1,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.log("[ERROR_CATCH]");
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
