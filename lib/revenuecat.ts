import Purchases from 'react-native-purchases';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';

export const configureRevenueCat = async () => {
  if (!API_KEY) {
    console.warn('RevenueCat API key not configured');
    return;
  }

  Purchases.configure({ apiKey: API_KEY });
};

export const ENTITLEMENT_ID = 'pro';
export const OFFERING_ID = 'default';
