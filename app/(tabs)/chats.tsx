import { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useChatStore } from "@/store/chats";
import { Chat } from "@/types/chat";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ChatsScreen() {
  const { chats, isLoading, loadChats } = useChatStore();
  const router = useRouter();

  useEffect(() => {
    loadChats();
  }, []);

  const renderChat = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 border-b border-gray-100 bg-white"
      onPress={() => router.push(`/chat/${item.coach_id}`)}
      activeOpacity={0.7}
    >
      <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-3">
        <Text className="text-2xl">{item.coach?.avatar_url || "🤖"}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-gray-900">
            {item.coach?.name || "Coach"}
          </Text>
          {item.last_message && (
            <Text className="text-xs text-gray-400">
              {formatRelativeTime(item.last_message.created_at)}
            </Text>
          )}
        </View>
        <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
          {item.last_message?.content || "No messages yet"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={chats}
        renderItem={renderChat}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-400">No conversations yet</Text>
            <Text className="text-gray-400 text-sm mt-1">
              Start chatting with a coach!
            </Text>
          </View>
        }
      />
    </View>
  );
}
