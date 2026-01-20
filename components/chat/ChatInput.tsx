import { useState } from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Message your coach...",
}: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText("");
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View className="flex-row items-end p-4 border-t border-gray-200 bg-white">
      <TextInput
        testID="chat-input"
        className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 mr-2 max-h-24 text-gray-900"
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline
        returnKeyType="default"
        editable={!disabled}
      />
      <TouchableOpacity
        testID="chat-send-button"
        onPress={handleSend}
        disabled={!canSend}
        className={`rounded-full w-10 h-10 items-center justify-center ${
          canSend ? "bg-blue-500" : "bg-gray-300"
        }`}
        activeOpacity={0.7}
      >
        <Text className="text-white text-lg">↑</Text>
      </TouchableOpacity>
    </View>
  );
}
