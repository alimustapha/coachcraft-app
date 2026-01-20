import "../global.css";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { configureRevenueCat } from "@/lib/revenuecat";

export { ErrorBoundary } from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, initialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Initialize auth
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isMounted = true;

    (async () => {
      const unsubscribe = await initialize();
      if (isMounted) {
        cleanup = unsubscribe;
      } else {
        // Component unmounted before init finished, cleanup immediately
        unsubscribe();
      }
    })();

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, []);

  // Configure RevenueCat SDK once on app start
  useEffect(() => {
    configureRevenueCat();
  }, []);

  // Sync subscription state with auth state changes
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (state.user && !prevState.user) {
        // User just signed in - initialize RevenueCat with user ID
        useSubscriptionStore.getState().initialize(state.user.id);
      } else if (!state.user && prevState.user) {
        // User just signed out - logout from RevenueCat
        useSubscriptionStore.getState().logout();
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle font loading errors
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded && initialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, initialized]);

  // Handle auth routing
  useEffect(() => {
    if (!initialized || !fontsLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (session && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    }
  }, [session, initialized, segments, fontsLoaded]);

  if (!fontsLoaded || !initialized) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="coach" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="create-coach" options={{ headerShown: true, headerBackTitle: "Back" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
