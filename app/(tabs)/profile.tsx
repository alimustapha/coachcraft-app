import { useEffect, useState } from "react";
import { View, Text, Alert, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/auth";
import { useContextStore } from "@/store/context";
import { useSubscriptionStore } from "@/store/subscription";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Paywall } from "@/components/subscription/Paywall";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { context, loadContext, isLoading } = useContextStore();
  const { isPro } = useSubscriptionStore();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    loadContext();
  }, []);

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleEditContext = () => {
    router.push("/onboarding/context");
  };

  const handleManageSubscription = () => {
    // Opens iOS subscription management
    Linking.openURL("https://apps.apple.com/account/subscriptions");
  };

  // Helper to display array as comma-separated or placeholder
  const formatList = (items: string[], max: number = 3) => {
    if (!items || items.length === 0) return null;
    const display = items.slice(0, max);
    const more = items.length > max ? ` +${items.length - max} more` : "";
    return display.join(", ") + more;
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-8 pb-4">
        {/* Profile Header */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4">
            <Text className="text-3xl font-bold text-blue-500">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <Text className="text-xl font-semibold text-gray-800">
            {user?.email || "User"}
          </Text>
        </View>

        {/* Personal Context Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">
              Personal Context
            </Text>
            <TouchableOpacity onPress={handleEditContext}>
              <Text className="text-blue-500 font-medium">
                {context ? "Edit" : "Set up"}
              </Text>
            </TouchableOpacity>
          </View>

          {context ? (
            <Card className="bg-white p-4">
              {/* Values */}
              {context.values.length > 0 && (
                <View className="mb-3">
                  <Text className="text-gray-500 text-sm mb-1">Values</Text>
                  <Text className="text-gray-800">
                    {formatList(context.values)}
                  </Text>
                </View>
              )}

              {/* Goals */}
              {context.goals.length > 0 && (
                <View className="mb-3">
                  <Text className="text-gray-500 text-sm mb-1">Goals</Text>
                  <Text className="text-gray-800">
                    {formatList(context.goals)}
                  </Text>
                </View>
              )}

              {/* Challenges */}
              {context.challenges.length > 0 && (
                <View>
                  <Text className="text-gray-500 text-sm mb-1">Challenges</Text>
                  <Text className="text-gray-800">
                    {formatList(context.challenges)}
                  </Text>
                </View>
              )}

              {/* Empty state if all arrays are empty */}
              {context.values.length === 0 &&
                context.goals.length === 0 &&
                context.challenges.length === 0 && (
                  <Text className="text-gray-400 text-center py-2">
                    No context set yet
                  </Text>
                )}
            </Card>
          ) : (
            <Card className="bg-white p-4">
              <Text className="text-gray-500 text-center mb-3">
                Help your coaches understand you better
              </Text>
              <Button
                title="Set up your context"
                onPress={handleEditContext}
                variant="secondary"
              />
            </Card>
          )}
        </View>

        {/* Subscription Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Subscription
          </Text>
          <Card className="bg-white p-4">
            {isPro ? (
              <>
                <View className="flex-row items-center mb-2">
                  <View className="bg-yellow-100 px-2 py-1 rounded mr-2">
                    <Text className="text-yellow-800 text-xs font-medium">PRO</Text>
                  </View>
                  <Text className="text-gray-800 font-medium">Pro Member</Text>
                </View>
                <TouchableOpacity onPress={handleManageSubscription}>
                  <Text className="text-blue-500 font-medium">
                    Manage Subscription
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-gray-800 font-medium">Free Plan</Text>
                  <Text className="text-gray-500 text-sm">
                    1 coach, 10 messages/day
                  </Text>
                </View>
                <TouchableOpacity testID="upgrade-button" onPress={() => setShowPaywall(true)}>
                  <Text className="text-blue-500 font-medium">Upgrade</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </View>
      </View>

      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="manual"
      />

      {/* Sign Out */}
      <View className="px-6 pb-8">
        <Button testID="sign-out-button" title="Sign Out" onPress={handleSignOut} variant="secondary" />
      </View>
    </ScrollView>
  );
}
