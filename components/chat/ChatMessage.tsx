import { View, Text } from "react-native";
import { Message } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
  coachAvatar?: string; // Emoji from coach data
  isUser: boolean; // Derived from message.role === 'user'
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ChatMessage({ message, coachAvatar, isUser }: ChatMessageProps) {
  return (
    <View
      testID={isUser ? "message-user" : "message-assistant"}
      className={`flex-row mb-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Coach avatar (only for assistant messages) */}
      {!isUser && (
        <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2 mt-1">
          <Text className="text-lg">{coachAvatar || "🤖"}</Text>
        </View>
      )}

      <View
        className={`max-w-[75%] ${
          isUser
            ? "bg-blue-500 ml-12 rounded-2xl rounded-br-sm"
            : "bg-gray-100 mr-12 rounded-2xl rounded-bl-sm"
        } p-3`}
      >
        <Text className={`${isUser ? "text-white" : "text-gray-900"}`}>
          {message.content}
        </Text>
        <Text
          className={`text-xs mt-1 ${
            isUser ? "text-blue-100" : "text-gray-400"
          }`}
        >
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}
