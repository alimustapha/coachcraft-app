import { create } from 'zustand';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { ENTITLEMENT_ID } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './auth';

interface SubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesPackage[] | null;
  error: string | null;

  // Actions
  initialize: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPro: false,
  isLoading: false,
  customerInfo: null,
  currentOffering: null,
  error: null,

  initialize: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await Purchases.logIn(userId);
      await get().checkSubscription();
      await get().loadOfferings();
    } catch (e) {
      set({ error: 'Failed to initialize subscription' });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await Purchases.logOut();
      // Only clear local state; don't sync is_pro to false in DB
      // This prevents logout on one device from revoking Pro on another
      // The is_pro flag in DB should only be changed by purchase/restore flows
      set({ isPro: false, customerInfo: null });
    } catch (e) {
      // Ignore logout errors
    }
  },

  checkSubscription: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      set({ customerInfo, isPro });

      // Sync to server to ensure consistency
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        await supabase
          .from('profiles')
          .update({ is_pro: isPro })
          .eq('id', userId);
      }
    } catch (e) {
      set({ error: 'Failed to check subscription status' });
    }
  },

  loadOfferings: async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (current) {
        set({ currentOffering: current.availablePackages });
      }
    } catch (e) {
      // Non-critical, paywall will handle empty state
    }
  },

  purchasePackage: async (pkg: PurchasesPackage) => {
    set({ isLoading: true, error: null });
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      set({ customerInfo, isPro, isLoading: false });

      // Sync to server for server-side enforcement
      if (isPro) {
        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          await supabase
            .from('profiles')
            .update({ is_pro: true })
            .eq('id', userId);
        }
      }
      return isPro;
    } catch (e: any) {
      if (e.userCancelled) {
        set({ isLoading: false });
        return false;
      }
      set({ error: e.message || 'Purchase failed', isLoading: false });
      return false;
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      set({ customerInfo, isPro, isLoading: false });

      // Sync to server for server-side enforcement
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        await supabase
          .from('profiles')
          .update({ is_pro: isPro })
          .eq('id', userId);
      }
      return isPro;
    } catch (e: any) {
      set({ error: e.message || 'Restore failed', isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
