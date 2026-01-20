import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useCoachStore } from "@/store/coaches";
import { useSubscriptionStore } from "@/store/subscription";
import { useAuthStore } from "@/store/auth";
import { theme } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { Paywall } from "@/components/subscription/Paywall";
import { FREE_CUSTOM_COACH_LIMIT } from "@/constants/limits";

export default function CoachDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { coaches } = useCoachStore();
  const { isPro } = useSubscriptionStore();
  const { user } = useAuthStore();
  const [showPaywall, setShowPaywall] = useState(false);

  const coach = coaches.find((c) => c.id === id);

  // Calculate if this custom coach is beyond the free limit (FREE_CUSTOM_COACH_LIMIT)
  // Prebuilt coaches are never locked. Only custom coaches count towards limit.
  const customCoaches = coaches.filter((c) => !c.isPrebuilt && c.creatorId === user?.id);
  const customCoachIndex = customCoaches.findIndex((c) => c.id === id);
  const isCustomCoach = coach && !coach.isPrebuilt;
  // Lock if: not Pro, this is a custom coach, and it's beyond the free limit
  const isLocked = !isPro && isCustomCoach && customCoachIndex >= FREE_CUSTOM_COACH_LIMIT;

  if (!coach) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Stack.Screen options={{ title: "Coach Not Found" }} />
        <Text className="text-xl text-gray-800 mb-4">Coach not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const specialtyColor =
    theme.colors[coach.specialty as keyof typeof theme.colors] ||
    theme.colors.custom;

  // Extract coaching approach from system prompt (first paragraph after intro)
  const getCoachingApproach = () => {
    const lines = coach.systemPrompt.split("\n").filter((l) => l.trim());
    // Skip the first intro line, get the philosophy section
    const philosophyStart = lines.findIndex((l) =>
      l.toLowerCase().includes("philosophy")
    );
    if (philosophyStart > 0) {
      const philosophyLines = [];
      for (let i = philosophyStart + 1; i < lines.length && i < philosophyStart + 5; i++) {
        if (lines[i].startsWith("-")) {
          philosophyLines.push(lines[i].replace(/^-\s*/, ""));
        } else if (lines[i].toLowerCase().includes("personality")) {
          break;
        }
      }
      return philosophyLines.join("\n");
    }
    return coach.description;
  };

  const handleStartChat = () => {
    if (isLocked) {
      setShowPaywall(true);
      return;
    }
    router.push(`/chat/${coach.id}`);
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: coach.name,
          headerBackTitle: "Coaches",
        }}
      />

      <View className="items-center pt-8 pb-6 px-6">
        {/* Avatar */}
        <View testID="coach-avatar" className="w-24 h-24 rounded-full bg-gray-50 items-center justify-center mb-4">
          <Text className="text-5xl">{coach.avatar}</Text>
        </View>

        {/* Name */}
        <Text testID="coach-name" className="text-2xl font-bold text-gray-900 mb-2">
          {coach.name}
        </Text>

        {/* Specialty Badge */}
        <View
          className="px-3 py-1 rounded-full mb-4"
          style={{ backgroundColor: `${specialtyColor}20` }}
        >
          <Text
            style={{ color: specialtyColor }}
            className="text-sm font-medium capitalize"
          >
            {coach.specialty}
          </Text>
        </View>

        {/* Description */}
        <Text className="text-gray-600 text-center text-base leading-6">
          {coach.description}
        </Text>
      </View>

      {/* Start Chat Button */}
      <View className="px-6 mb-6">
        <TouchableOpacity
          testID="start-chat-button"
          onPress={handleStartChat}
          className={`py-4 rounded-xl items-center flex-row justify-center ${
            isLocked ? "bg-gray-200" : "bg-blue-500"
          }`}
          activeOpacity={0.8}
        >
          {isLocked && <Text className="mr-2">🔒</Text>}
          <Text
            className={`text-lg font-semibold ${
              isLocked ? "text-gray-500" : "text-white"
            }`}
          >
            {isLocked ? "Locked" : "Start Chat"}
          </Text>
        </TouchableOpacity>

        {isLocked && (
          <Text className="text-center text-gray-500 text-sm mt-2">
            Upgrade to Pro to chat with more coaches
          </Text>
        )}
      </View>

      {/* Coaching Approach Section */}
      <View className="px-6 pb-8">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Coaching Approach
        </Text>
        <View className="bg-gray-50 rounded-xl p-4">
          <Text className="text-gray-700 leading-6">{getCoachingApproach()}</Text>
        </View>
      </View>

      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="coach_limit"
      />
    </ScrollView>
  );
}
