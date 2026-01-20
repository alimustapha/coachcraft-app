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
import { useContextStore, UserContext } from "@/store/context";
import { Button } from "@/components/ui/Button";

interface ChipInputProps {
  label: string;
  placeholder: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
}

function ChipInput({ label, placeholder, values, onValuesChange }: ChipInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addValue = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onValuesChange([...values, trimmed]);
      setInputValue("");
    }
  };

  const removeValue = (index: number) => {
    onValuesChange(values.filter((_, i) => i !== index));
  };

  const handleChangeText = (text: string) => {
    // If user types a comma, add the value
    if (text.endsWith(",")) {
      const value = text.slice(0, -1).trim();
      if (value && !values.includes(value)) {
        onValuesChange([...values, value]);
        setInputValue("");
        return;
      }
    }
    setInputValue(text);
  };

  return (
    <View className="mb-6">
      <Text className="text-base font-medium text-gray-800 mb-2">{label}</Text>
      <View className="border border-gray-200 rounded-xl p-3 bg-white">
        {/* Chips */}
        {values.length > 0 && (
          <View className="flex-row flex-wrap mb-2">
            {values.map((value, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => removeValue(index)}
                className="bg-blue-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center"
              >
                <Text className="text-blue-700 text-sm">{value}</Text>
                <Text className="text-blue-500 ml-1 text-xs">×</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {/* Input */}
        <TextInput
          value={inputValue}
          onChangeText={handleChangeText}
          onSubmitEditing={addValue}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          className="text-gray-800 text-base"
          returnKeyType="done"
          blurOnSubmit={false}
        />
      </View>
      <Text className="text-gray-400 text-xs mt-1">
        Press enter or type comma to add. Tap to remove.
      </Text>
    </View>
  );
}

export default function ContextScreen() {
  const router = useRouter();
  const { context, loadContext, saveContext, isSaving, error } = useContextStore();

  const [values, setValues] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [challenges, setChallenges] = useState<string[]>([]);

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    if (context) {
      setValues(context.values);
      setGoals(context.goals);
      setChallenges(context.challenges);
    }
  }, [context]);

  const handleSave = async () => {
    const newContext: UserContext = { values, goals, challenges };
    const success = await saveContext(newContext);
    if (success) {
      router.replace("/(tabs)");
    } else {
      Alert.alert("Error", "Failed to save your context. Please try again.");
    }
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mt-4 mb-6">
            <Text className="text-2xl font-bold text-gray-900">
              Tell us about you
            </Text>
            <TouchableOpacity onPress={handleSkip}>
              <Text className="text-blue-500 font-medium">Skip</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-500 mb-8">
            This helps your AI coaches give you personalized guidance. You can
            update this anytime in your profile.
          </Text>

          {/* Values */}
          <ChipInput
            label="What do you value?"
            placeholder="e.g., family, growth, creativity..."
            values={values}
            onValuesChange={setValues}
          />

          {/* Goals */}
          <ChipInput
            label="What are your current goals?"
            placeholder="e.g., learn a new skill, get healthier..."
            values={goals}
            onValuesChange={setGoals}
          />

          {/* Challenges */}
          <ChipInput
            label="What challenges are you facing?"
            placeholder="e.g., time management, focus..."
            values={challenges}
            onValuesChange={setChallenges}
          />
        </ScrollView>

        {/* Bottom Actions */}
        <View className="px-6 pb-4 pt-2 border-t border-gray-100">
          <Button
            title={isSaving ? "Saving..." : "Save & Continue"}
            onPress={handleSave}
            disabled={isSaving}
          />
          <TouchableOpacity onPress={handleSkip} className="mt-3 py-2">
            <Text className="text-center text-gray-500">Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
