import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCoachStore } from "@/store/coaches";
import { useSubscriptionStore } from "@/store/subscription";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Specialty, theme } from "@/constants/theme";
import { Paywall } from "@/components/subscription/Paywall";
import { FREE_CUSTOM_COACH_LIMIT } from "@/constants/limits";

const AVATAR_OPTIONS = ["🎯", "🏔️", "🌱", "🧠", "🎋", "⭐", "🚀", "💡", "🎨", "🔥"];

const SPECIALTY_OPTIONS: { value: Specialty; label: string }[] = [
  { value: "productivity", label: "Productivity" },
  { value: "goals", label: "Goals" },
  { value: "habits", label: "Habits" },
  { value: "mindset", label: "Mindset" },
  { value: "focus", label: "Focus" },
  { value: "custom", label: "Custom" },
];

export default function CreateCoachScreen() {
  const router = useRouter();
  const { coaches, createCustomCoach, isSaving, error, clearError } = useCoachStore();
  const { isPro } = useSubscriptionStore();
  const { user } = useAuthStore();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("⭐");
  const [specialty, setSpecialty] = useState<Specialty>("custom");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Calculate remaining custom coach slots for free users
  const customCoachCount = coaches.filter(
    (c) => !c.isPrebuilt && c.creatorId === user?.id
  ).length;
  const remainingSlots = isPro ? Infinity : Math.max(0, FREE_CUSTOM_COACH_LIMIT - customCoachCount);

  // Watch for COACH_LIMIT_REACHED error to show paywall
  useEffect(() => {
    if (error === "COACH_LIMIT_REACHED") {
      setShowPaywall(true);
      clearError();
    }
  }, [error, clearError]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a name for your coach.");
      return;
    }

    clearError(); // Clear any previous errors

    const defaultPrompt = `You are ${name}, a ${specialty} coach who helps people achieve their goals.

Be supportive, ask clarifying questions, and provide actionable advice.`;

    const coach = await createCustomCoach({
      name: name.trim(),
      avatar,
      specialty,
      description: description.trim() || `Your personal ${specialty} coach.`,
      systemPrompt: systemPrompt.trim() || defaultPrompt,
      creatorId: undefined, // Will be set by the store
    });

    if (coach) {
      router.back();
    }
    // COACH_LIMIT_REACHED error is handled by useEffect above
    // Other errors show in an alert
    else if (error && error !== "COACH_LIMIT_REACHED") {
      Alert.alert("Error", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Create Coach",
          headerBackTitle: "Cancel",
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mt-4">
            {/* Avatar Picker */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-800 mb-2">
                Choose an avatar
              </Text>
              <View className="flex-row flex-wrap">
                {AVATAR_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => setAvatar(emoji)}
                    className={`w-12 h-12 rounded-full items-center justify-center m-1 ${
                      avatar === emoji ? "bg-blue-100 border-2 border-blue-500" : "bg-gray-50"
                    }`}
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Name */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-800 mb-2">
                Name *
              </Text>
              <TextInput
                testID="create-coach-name"
                value={name}
                onChangeText={setName}
                placeholder="e.g., Coach Alex"
                placeholderTextColor="#9CA3AF"
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base bg-white"
              />
            </View>

            {/* Specialty */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-800 mb-2">
                Specialty
              </Text>
              <View className="flex-row flex-wrap">
                {SPECIALTY_OPTIONS.map((option) => {
                  const color =
                    theme.colors[option.value as keyof typeof theme.colors] ||
                    theme.colors.custom;
                  const isSelected = specialty === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      testID={`create-coach-specialty-${option.value}`}
                      onPress={() => setSpecialty(option.value)}
                      className={`px-4 py-2 rounded-full m-1 ${
                        isSelected ? "" : "bg-gray-100"
                      }`}
                      style={isSelected ? { backgroundColor: `${color}20` } : {}}
                    >
                      <Text
                        style={isSelected ? { color } : { color: "#6B7280" }}
                        className="font-medium"
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-800 mb-2">
                Short description
              </Text>
              <TextInput
                testID="create-coach-description"
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., Your guide to building better habits..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base bg-white"
                style={{ minHeight: 60, textAlignVertical: "top" }}
              />
            </View>

            {/* Advanced: System Prompt */}
            <TouchableOpacity
              onPress={() => setShowAdvanced(!showAdvanced)}
              className="flex-row items-center mb-4"
            >
              <Text className="text-blue-500 font-medium">
                {showAdvanced ? "Hide" : "Show"} advanced options
              </Text>
              <Text className="text-blue-500 ml-1">
                {showAdvanced ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View className="mb-6">
                <Text className="text-base font-medium text-gray-800 mb-2">
                  System Prompt
                </Text>
                <Text className="text-gray-400 text-sm mb-2">
                  Define your coach's personality and behavior. Leave blank for
                  a default prompt.
                </Text>
                <TextInput
                  value={systemPrompt}
                  onChangeText={setSystemPrompt}
                  placeholder={`You are ${name || "[Name]"}, a ${specialty} coach...`}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={6}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base bg-white"
                  style={{ minHeight: 120, textAlignVertical: "top" }}
                />
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View className="px-6 pb-4 pt-2 border-t border-gray-100">
          {!isPro && (
            <Text className="text-gray-500 text-sm text-center mb-2">
              {remainingSlots > 0
                ? `${remainingSlots} custom coach slot${remainingSlots !== 1 ? "s" : ""} remaining`
                : "No custom coach slots remaining"}
            </Text>
          )}
          <Button
            testID="create-coach-save"
            title={isSaving ? "Creating..." : "Create Coach"}
            onPress={handleSave}
            disabled={isSaving || !name.trim()}
          />
        </View>
      </KeyboardAvoidingView>

      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="coach_limit"
      />
    </SafeAreaView>
  );
}
