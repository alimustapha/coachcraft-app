import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  testID,
}: ButtonProps) {
  const isDisabled = loading || disabled;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      className={`py-3 px-6 rounded-lg ${
        variant === "primary"
          ? isDisabled
            ? "bg-blue-300"
            : "bg-blue-500"
          : isDisabled
            ? "bg-gray-100"
            : "bg-gray-200"
      }`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#374151"} />
      ) : (
        <Text
          className={`text-center font-medium ${
            variant === "primary" ? "text-white" : "text-gray-800"
          }`}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
