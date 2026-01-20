import { FlatList, View, Text } from "react-native";
import { Coach } from "@/constants/coaches";
import { CoachCard } from "./CoachCard";

interface CoachListProps {
  coaches: Coach[];
  onCoachPress: (coach: Coach) => void;
  lockedCoachIds?: string[];
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
}

export function CoachList({
  coaches,
  onCoachPress,
  lockedCoachIds = [],
  ListHeaderComponent,
  ListEmptyComponent,
}: CoachListProps) {
  return (
    <FlatList
      testID="coach-list"
      data={coaches}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CoachCard
          testID={`coach-card-${item.id}`}
          coach={item}
          onPress={() => onCoachPress(item)}
          locked={lockedCoachIds.includes(item.id)}
        />
      )}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        ListEmptyComponent || (
          <View className="items-center py-8">
            <Text className="text-gray-400">No coaches available</Text>
          </View>
        )
      }
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
