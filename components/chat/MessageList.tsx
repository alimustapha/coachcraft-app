import { FlatList, View, Text } from "react-native";
import { Message } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";

interface MessageListProps {
  messages: Message[];
  coachAvatar?: string;
  isLoading?: boolean; // Show typing indicator
}

function TypingIndicator() {
  return (
    <View testID="typing-indicator" className="flex-row justify-start mb-3">
      <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2 mt-1">
        <Text className="text-lg">💭</Text>
      </View>
      <View className="bg-gray-100 rounded-2xl rounded-bl-sm p-3">
        <Text className="text-gray-500">Coach is typing...</Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-8">
      <Text className="text-gray-400 text-center">Start the conversation</Text>
      <Text className="text-gray-400 text-sm text-center mt-1">
        Your coach is ready to help
      </Text>
    </View>
  );
}

export function MessageList({
  messages,
  coachAvatar,
  isLoading = false,
}: MessageListProps) {
  // For inverted FlatList, we reverse the data so newest appears at bottom
  const reversedMessages = [...messages].reverse();

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage
      message={item}
      coachAvatar={coachAvatar}
      isUser={item.role === "user"}
    />
  );

  return (
    <FlatList
      testID="message-list"
      data={reversedMessages}
      renderItem={renderMessage}
      keyExtractor={(item) => item.id}
      inverted
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      ListHeaderComponent={isLoading ? <TypingIndicator /> : null}
      ListEmptyComponent={<EmptyState />}
      showsVerticalScrollIndicator={false}
    />
  );
}
