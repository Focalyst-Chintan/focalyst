import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { startCheckout } from '@/lib/billing/checkout';

export type CheckoutPlan = 'monthly' | 'yearly' | 'lifetime';
export type BillingRegion = 'IN' | 'INT';

export function useCheckout() {
  const [isNative, setIsNative] = useState<boolean>(false);
  const [isRcInitialized, setIsRcInitialized] = useState<boolean>(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkPlatform = async () => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);

      if (native) {
        try {
          const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;
          if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey === 'appl_placeholder_key') {
            console.warn('[RevenueCat] iOS API Key is missing, placeholder, or invalid. Skipping native configuration to prevent native crash. Proceeding in free-tier state.');
          } else {
            const { Purchases } = await import('@revenuecat/purchases-capacitor');
            await Purchases.configure({ apiKey });
            setIsRcInitialized(true);
          }
        } catch (error) {
          console.error('Failed to configure RevenueCat Purchases:', error);
        }
      }
    };
    checkPlatform();
  }, []);

  const handleNativePurchase = async (planType: CheckoutPlan) => {
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      
      // Get current user from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be logged in to make a purchase.');
      }

      // Log in user to RevenueCat for tracking
      await Purchases.logIn({ appUserID: user.id });

      // Fetch offerings
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        throw new Error('No current offerings configured in RevenueCat.');
      }

      // Map our planType to RevenueCat package identifier
      // Standard packages: monthly ($rc_monthly), yearly ($rc_yearly), lifetime ($rc_lifetime)
      let targetPackage = offerings.current.monthly;
      if (planType === 'yearly') {
        targetPackage = offerings.current.annual;
      } else if (planType === 'lifetime') {
        targetPackage = offerings.current.lifetime;
      }

      if (!targetPackage) {
        // Fallback to custom package naming if standard ones are not found
        const packages = offerings.current.availablePackages;
        targetPackage = packages.find(pkg => pkg.identifier.includes(planType)) || packages[0];
      }

      if (!targetPackage) {
        throw new Error(`Package for plan ${planType} not found in offerings.`);
      }

      const { customerInfo } = await Purchases.purchasePackage({ aPackage: targetPackage });
      
      // Check if entitlement 'pro' or any active entitlement is unlocked
      const hasActiveEntitlement = Object.values(customerInfo.entitlements.active).length > 0;
      
      if (hasActiveEntitlement) {
        // Map plan type to DB model
        const planName = planType === 'lifetime' ? 'lifetime' : (planType === 'yearly' ? 'pro_yearly' : 'pro_monthly');
        
        // Update user plan in Supabase
        const { error } = await supabase
          .from('users')
          .update({
            plan: planName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          console.error('Failed to update user plan in DB after native purchase:', error);
        }

        return { success: true, customerInfo };
      } else {
        throw new Error('Purchase completed but no active entitlement found.');
      }
    } catch (error: any) {
      console.error('Native purchase failed:', error);
      throw error;
    }
  };

  const handleNativeRestore = async () => {
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be logged in to restore purchases.');
      }

      let storeActive = false;
      let planName = 'pro_yearly';

      try {
        const { customerInfo } = await Purchases.restorePurchases();
        const activeEntitlements = Object.values(customerInfo.entitlements.active);
        if (activeEntitlements.length > 0) {
          storeActive = true;
          const activeEntId = activeEntitlements[0].identifier;
          if (activeEntId.includes('lifetime')) planName = 'lifetime';
          else if (activeEntId.includes('monthly')) planName = 'pro_monthly';

          await supabase
            .from('users')
            .update({
              plan: planName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        }
      } catch (storeError) {
        console.warn('RevenueCat restore failed, checking server sync:', storeError);
      }

      // If store finds nothing, call our server
      if (!storeActive) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
            await fetch('https://focalyst.online/api/billing/sync-me', {
              method: 'POST',
              headers: { Authorization: `Bearer ${data.session.access_token}` },
            });
          }
        } catch (serverErr) {
          console.warn('sync-me call error:', serverErr);
        }
      }

      // Reload the profile
      const { data: userRow } = await supabase
        .from('users')
        .select('plan, plan_expires_at')
        .eq('id', user.id)
        .maybeSingle();

      const { hasPro } = await import('@/lib/billing/proStatus');
      const isProActive = hasPro(userRow, storeActive);

      if (isProActive) {
        return {
          success: true,
          plan: userRow?.plan || planName,
          title: 'Focalyst Pro is active',
          message: 'Your purchase is restored.',
        };
      } else {
        const { Capacitor } = await import('@capacitor/core');
        const platform = Capacitor.getPlatform();
        const message =
          platform === 'ios'
            ? 'We could not find a purchase for this Apple ID or Focalyst account. If you bought Pro on the website, sign in with the same account you used there.'
            : 'We could not find a purchase for this Google Play account or Focalyst account. If you bought Pro on the website, sign in with the same account you used there.';

        return {
          success: false,
          title: 'No purchases found',
          message,
        };
      }
    } catch (error: any) {
      console.error('Native restore failed:', error);
      throw error;
    }
  };

  const checkout = async (
    planType: CheckoutPlan,
    region?: BillingRegion,
    isOnboarding: boolean = false
  ) => {
    if (isNative) {
      return await handleNativePurchase(planType);
    } else {
      const result = await startCheckout(planType);
      if (!result.ok) {
        throw new Error(result.message || 'Failed to start checkout');
      }
      return { success: true, result };
    }
  };

  const restore = async () => {
    if (isNative) {
      return await handleNativeRestore();
    } else {
      // Web: existing restore from database logic
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please log in to restore your purchase.');
      }

      const { data: sub, error } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', user.id)
        .in('status', ['active'])
        .single();

      if (sub && !error) {
        return { success: true, plan: sub.plan_type || 'pro_yearly' };
      } else {
        throw new Error('No active subscription found.');
      }
    }
  };

  return {
    isNative,
    checkout,
    restore,
  };
}
