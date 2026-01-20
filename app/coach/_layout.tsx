import { Stack } from "expo-router";

export default function CoachLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
