import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useCoachStore } from "@/store/coaches";
import { useChatStore } from "@/store/chats";
import { useSubscriptionStore } from "@/store/subscription";
import { CoachList } from "@/components/coaches/CoachList";
import { Coach } from "@/constants/coaches";
import { FREE_CUSTOM_COACH_LIMIT, FREE_DAILY_MESSAGE_LIMIT } from "@/constants/limits";

export default function CoachesScreen() {
  const router = useRouter();
  const { coaches, loadCoaches, isLoading } = useCoachStore();
  const { dailyCount, loadDailyUsage } = useChatStore();
  const { isPro } = useSubscriptionStore();

  useEffect(() => {
    loadCoaches();
    loadDailyUsage();
  }, []);

  // For free users, lock custom coaches beyond the free limit
  // Prebuilt coaches are always accessible
  const customCoaches = coaches.filter((c) => !c.isPrebuilt);
  const lockedCoachIds = isPro
    ? []
    : customCoaches.slice(FREE_CUSTOM_COACH_LIMIT).map((c) => c.id);

  const handleCoachPress = (coach: Coach) => {
    router.push(`/coach/${coach.id}`);
  };

  const handleCreateCoach = () => {
    router.push("/create-coach");
  };

  return (
    <View className="flex-1 bg-gray-50">
      <CoachList
        coaches={coaches}
        onCoachPress={handleCoachPress}
        lockedCoachIds={lockedCoachIds}
        ListHeaderComponent={
          <View className="mb-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-2xl font-bold text-gray-900">
                Your Coaches
              </Text>
              {/* Pro badge or daily usage */}
              {isPro ? (
                <View className="bg-yellow-100 px-2 py-1 rounded">
                  <Text className="text-yellow-800 text-xs font-medium">PRO</Text>
                </View>
              ) : (
                <Text className="text-gray-500 text-xs">
                  {Math.max(0, FREE_DAILY_MESSAGE_LIMIT - dailyCount)} messages left
                </Text>
              )}
            </View>
            <Text className="text-gray-500 mt-1">
              Choose a coach to start a conversation
            </Text>
          </View>
        }
      />

      {/* FAB - Create Coach Button */}
      <TouchableOpacity
        testID="create-coach-button"
        onPress={handleCreateCoach}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 items-center justify-center"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
        activeOpacity={0.8}
      >
        <Text className="text-white text-2xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
}
