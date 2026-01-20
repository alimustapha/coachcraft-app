import { useEffect, useState } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChatStore } from "@/store/chats";
import { useCoachStore } from "@/store/coaches";
import { useSubscriptionStore } from "@/store/subscription";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { Paywall } from "@/components/subscription/Paywall";

const FREE_MESSAGE_LIMIT = 10;

export default function ChatScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const router = useRouter();

  const {
    messages,
    currentChatId,
    isSending,
    isLoading,
    error,
    dailyCount,
    findOrCreateChat,
    loadChat,
    sendMessage,
    loadDailyUsage,
    clearError,
  } = useChatStore();

  const { coaches } = useCoachStore();
  const coach = coaches.find((c) => c.id === coachId);
  const { isPro } = useSubscriptionStore();
  const [showPaywall, setShowPaywall] = useState(false);

  // On mount: Find or create chat, load messages, load daily usage
  useEffect(() => {
    if (!coachId) return;

    const init = async () => {
      const chatId = await findOrCreateChat(coachId);
      if (chatId) {
        await Promise.all([loadChat(chatId), loadDailyUsage()]);
      }
    };
    init();
  }, [coachId]);

  const handleSend = async (content: string) => {
    // Check rate limit before sending (for free users)
    if (!isPro && dailyCount >= FREE_MESSAGE_LIMIT) {
      setShowPaywall(true);
      return;
    }
    await sendMessage(content);
  };

  // Watch for MESSAGE_LIMIT_REACHED error to show paywall
  useEffect(() => {
    if (error === "MESSAGE_LIMIT_REACHED") {
      setShowPaywall(true);
      clearError();
    } else if (error) {
      Alert.alert("Error", error);
      clearError();
    }
  }, [error, clearError]);

  // Show loading while initializing chat
  if (isLoading && !currentChatId) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Stack.Screen
          options={{ title: coach?.name || "Chat", headerBackTitle: "Back" }}
        />
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <Stack.Screen
        options={{ title: coach?.name || "Chat", headerBackTitle: "Back" }}
      />
      <View className="flex-1">
        <MessageList
          messages={messages}
          coachAvatar={coach?.avatar}
          isLoading={isSending}
        />
        <ChatInput
          onSend={handleSend}
          disabled={isSending}
          placeholder="Message your coach..."
        />
      </View>

      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="message_limit"
      />
    </SafeAreaView>
  );
}
