import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { useSubscriptionStore } from '@/store/subscription';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  trigger: 'coach_limit' | 'message_limit' | 'manual';
}

const triggerMessages = {
  coach_limit: "You've reached the free limit of 1 custom coach",
  message_limit: "You've used all 10 free messages for today",
  manual: "Unlock unlimited coaching",
};

export function Paywall({ visible, onClose, trigger }: PaywallProps) {
  const {
    currentOffering,
    isLoading,
    error,
    purchasePackage,
    restorePurchases,
    clearError,
  } = useSubscriptionStore();

  const handlePurchase = async (pkg: PurchasesPackage) => {
    const success = await purchasePackage(pkg);
    if (success) onClose();
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) onClose();
  };

  const handleClose = () => {
    clearError();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View testID="paywall-modal" className="bg-white rounded-t-3xl p-6">
          {/* Header */}
          <Text className="text-2xl font-bold text-center mb-2">
            Upgrade to Pro
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            {triggerMessages[trigger]}
          </Text>

          {/* Benefits */}
          <View className="mb-6">
            <Text className="font-semibold mb-2">Pro includes:</Text>
            <Text className="text-gray-700 mb-1">• Unlimited custom coaches</Text>
            <Text className="text-gray-700 mb-1">• Unlimited daily messages</Text>
            <Text className="text-gray-700">• Priority support</Text>
          </View>

          {/* Error display */}
          {error && (
            <Text className="text-red-500 text-center mb-4">{error}</Text>
          )}

          {/* Loading */}
          {isLoading && (
            <View className="items-center my-4">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          )}

          {/* Packages */}
          {!isLoading && currentOffering?.map((pkg, index) => (
            <TouchableOpacity
              key={pkg.identifier}
              testID={index === 0 ? "paywall-subscribe-button" : `paywall-package-${index}`}
              onPress={() => handlePurchase(pkg)}
              disabled={isLoading}
              className="bg-blue-600 p-4 rounded-xl mb-3"
            >
              <Text className="text-white text-center font-semibold">
                {pkg.product.title} - {pkg.product.priceString}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Empty state */}
          {!isLoading && (!currentOffering || currentOffering.length === 0) && (
            <Text className="text-gray-500 text-center mb-4">
              Unable to load pricing. Please try again later.
            </Text>
          )}

          {/* Restore */}
          <TouchableOpacity testID="paywall-restore" onPress={handleRestore} disabled={isLoading}>
            <Text className="text-blue-600 text-center mt-4 py-2">
              Restore Purchases
            </Text>
          </TouchableOpacity>

          {/* Close */}
          <TouchableOpacity testID="paywall-close" onPress={handleClose} className="mt-2">
            <Text className="text-gray-500 text-center py-2">Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
