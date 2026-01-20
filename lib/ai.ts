import { supabase } from "./supabase";

interface SendMessageParams {
  coachId: string;
  message: string;
  chatId: string;
}

interface SendMessageResponse {
  response: string;
  chatId: string;
  messageCount: number;
}

interface SendMessageError {
  code: "RATE_LIMIT" | "MESSAGE_LIMIT_REACHED" | "AUTH_ERROR" | "SERVER_ERROR" | "AI_SERVICE_ERROR";
  message: string;
  messageCount?: number; // Included on rate limit errors
}

export async function sendChatMessage(params: SendMessageParams): Promise<{
  data: SendMessageResponse | null;
  error: SendMessageError | null;
}> {
  try {
    // Refresh session to ensure fresh token (handles expiry)
    // IMPORTANT: In Expo/React Native, the SDK's functions.invoke() does NOT
    // reliably include the user's JWT automatically. We must pass it manually.
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    // Debug logging to diagnose silent refresh failures
    console.log("[AI] refreshSession result:", {
      hasSession: !!refreshData?.session,
      hasError: !!refreshError,
      errorMsg: refreshError?.message,
    });

    // If refreshSession returns null without error, the refresh token is invalid/expired
    // User must re-authenticate - don't fall back to potentially expired cached token
    if (!refreshData?.session) {
      console.log("[AI] Session refresh failed - user must re-authenticate", {
        refreshError: refreshError?.message || "no error but null session",
      });
      return {
        data: null,
        error: { code: "AUTH_ERROR", message: "Session expired. Please sign in again." },
      };
    }

    const session = refreshData.session;
    console.log("[AI] Got fresh session, calling Edge Function");

    // MUST pass Authorization header manually in Expo/RN - SDK doesn't do it automatically
    const { data, error } = await supabase.functions.invoke("chat", {
      body: params,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      // Get HTTP status from error context (Supabase SDK exposes this)
      const status = (error as any).context?.status || (error as any).status;

      // Check for structured error in response body first
      if (data?.error) {
        if (data.error === "Rate limit exceeded" || data.error === "MESSAGE_LIMIT_REACHED") {
          return {
            data: null,
            error: {
              code: "MESSAGE_LIMIT_REACHED",
              message: "Daily message limit reached",
              messageCount: data.messageCount,
            },
          };
        }
        if (data.error === "AI_SERVICE_ERROR") {
          return {
            data: null,
            error: {
              code: "AI_SERVICE_ERROR",
              message: data.message || "The AI is temporarily unavailable. Please try again.",
            },
          };
        }
      }

      // Map HTTP status codes to typed errors
      if (status === 429) {
        return {
          data: null,
          error: {
            code: "MESSAGE_LIMIT_REACHED",
            message: "Daily message limit reached",
            messageCount: data?.messageCount,
          },
        };
      }
      if (status === 401) {
        return {
          data: null,
          error: { code: "AUTH_ERROR", message: "Please sign in again" },
        };
      }

      return {
        data: null,
        error: { code: "SERVER_ERROR", message: data?.message || "Failed to get response" },
      };
    }

    // Check for error in response body (Edge Function returns errors in body)
    if (data?.error) {
      if (data.error === "Rate limit exceeded" || data.error === "MESSAGE_LIMIT_REACHED") {
        return {
          data: null,
          error: {
            code: "MESSAGE_LIMIT_REACHED",
            message: "Daily message limit reached",
            messageCount: data.messageCount,
          },
        };
      }
      if (data.error === "AI_SERVICE_ERROR") {
        return {
          data: null,
          error: {
            code: "AI_SERVICE_ERROR",
            message: data.message || "The AI is temporarily unavailable. Please try again.",
          },
        };
      }
      return {
        data: null,
        error: { code: "SERVER_ERROR", message: data.message || data.error },
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: "SERVER_ERROR",
        message: (err as Error).message || "Failed to get response",
      },
    };
  }
}
