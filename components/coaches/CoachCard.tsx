import { TouchableOpacity, View, Text } from "react-native";
import { Coach } from "@/constants/coaches";
import { theme } from "@/constants/theme";

interface CoachCardProps {
  coach: Coach;
  onPress: () => void;
  locked?: boolean;
  testID?: string;
}

export function CoachCard({ coach, onPress, locked, testID }: CoachCardProps) {
  const specialtyColor =
    theme.colors[coach.specialty as keyof typeof theme.colors] ||
    theme.colors.custom;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={locked ? undefined : onPress}
      activeOpacity={locked ? 1 : 0.7}
      className={`bg-white rounded-2xl p-4 mb-3 border border-gray-100 ${
        locked ? "opacity-50" : ""
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center">
        <View className="w-14 h-14 rounded-full bg-gray-50 items-center justify-center mr-4">
          <Text className="text-3xl">{coach.avatar}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">
            {coach.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <View
              className="px-2 py-0.5 rounded-full mr-2"
              style={{ backgroundColor: `${specialtyColor}20` }}
            >
              <Text
                style={{ color: specialtyColor }}
                className="text-xs font-medium capitalize"
              >
                {coach.specialty}
              </Text>
            </View>
          </View>
          <Text
            className="text-gray-500 text-sm mt-1"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {coach.description}
          </Text>
        </View>
        {locked && (
          <View className="ml-2">
            <Text className="text-xl">🔒</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
