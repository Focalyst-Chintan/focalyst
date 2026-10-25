import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/utils/supabase';
import { useUser } from '../src/utils/UserContext';
import {
  initConnection,
  endConnection,
  requestPurchase,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  fetchProducts,
  type Purchase,
} from 'expo-iap';

// ─── Constants ─────────────────────────────────────────────────────────────────
const BRAND_BLUE = '#2563eb';
const DARK_SLATE = '#0b0f19';
const LIGHT_BG = '#ffffff';
const GREY_PILL_BG = '#f1f5f9';
const CARD_GREY_BG = '#f8fafc';
const TEXT_MUTED = '#64748b';
const TEXT_DARK = '#0b0f19';

const PRO_FEATURES = [
  'Unlimited habit tracking',
  'Custom pomodoro timer',
  'Unlimited day countdown',
  'Unlimited AI chat',
  'AI productivity score',
  'Weekly + monthly insights',
  'Unlimited notes',
  'Priority support',
];

const LIFETIME_FEATURES = [
  'All Future Feature Updates',
  'Priority Support Channel',
];

const MONTHLY_SKU = 'online.focalyst.monthly';
const YEARLY_SKU = 'online.focalyst.yearly';
const LIFETIME_SKU = 'online.focalyst.lifetime';

export default function PaywallScreen() {
  const router = useRouter();
  const { refreshProfile } = useUser();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const insets = useSafeAreaInsets();

  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isStartTrialLoading, setIsStartTrialLoading] = useState(false);
  const [isAnnualLoading, setIsAnnualLoading] = useState(false);
  const [isLifetimeLoading, setIsLifetimeLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);

  const routeToFreeDashboard = () => {
    if (isOnboarding) {
      router.replace('/onboarding/name' as any);
    } else {
      router.back();
    }
  };

  useEffect(() => {
    async function checkProAndOnboarding() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('plan, plan_expires_at, onboarding_done')
            .eq('id', user.id)
            .single();

          if (profile) {
            const isPaid = profile.plan && profile.plan !== 'free' && (!profile.plan_expires_at || new Date(profile.plan_expires_at) >= new Date());
            if (isPaid) {
              // User already has Pro by users.plan: native paywall never shows
              router.replace('/(tabs)/plan' as any);
              return;
            }
            if (!profile.onboarding_done) {
              setIsOnboarding(true);
            }
          }
        }
      } catch (e) {
        console.warn('Error checking pro and onboarding status in paywall:', e);
      }
    }
    checkProAndOnboarding();
  }, [router]);

  useEffect(() => {
    let purchaseUpdateSub: { remove: () => void } | undefined;
    let purchaseErrorSub: { remove: () => void } | undefined;

    const initializeIap = async () => {
      try {
        await initConnection();

        // Account for delayed product fetching in Sandbox mode by pre-fetching/warming the store cache
        try {

          const iapSkus = [MONTHLY_SKU, YEARLY_SKU, LIFETIME_SKU];
          await fetchProducts({
            skus: iapSkus,
            type: 'all',
          });
        } catch (fetchError) {
          console.warn('Initial sandbox product fetch failed. Retrying in 1.5s...', fetchError);
          // Wait 1.5 seconds and retry fetching to handle sandbox delays gracefully
          await new Promise((resolve) => setTimeout(resolve, 1500));
          try {
            const iapSkus = [MONTHLY_SKU, YEARLY_SKU, LIFETIME_SKU];
            await fetchProducts({
              skus: iapSkus,
              type: 'all',
            });

          } catch (retryError) {
            console.warn('Failed to cache products on retry:', retryError);
          }
        }

        purchaseUpdateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
          try {
            await finishTransaction({ purchase, isConsumable: false });

            // Determine the plan from the purchased product SKU
            let newPlan = 'pro_monthly';
            if (purchase.productId === YEARLY_SKU || purchase.productId === 'pro-yearly-base') newPlan = 'pro_yearly';
            else if (purchase.productId === LIFETIME_SKU || purchase.productId === 'pro-lifetime-base') newPlan = 'lifetime';

            // Update the user's plan in Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const planExpiry = newPlan === 'lifetime' ? null
                : newPlan === 'pro_yearly'
                  ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

              await supabase.from('users').update({
                plan: newPlan,
                plan_expires_at: planExpiry,
              }).eq('id', user.id);

              // Refresh global context so all screens see Pro status immediately
              await refreshProfile();
            }

            Alert.alert('Purchase successful', 'Your Pro access is now active.');
          } catch (error) {
            console.warn('Failed to finish transaction:', error);
          } finally {
            setIsPurchasing(false);
            setIsStartTrialLoading(false);
            setIsAnnualLoading(false);
            setIsLifetimeLoading(false);
          }
        });
        purchaseErrorSub = purchaseErrorListener((error) => {
          console.warn('Purchase flow error:', error);
          Alert.alert(
            "Transaction Notice",
            error?.message || "Unable to complete purchase in the current environment."
          );
          setIsPurchasing(false);
          setIsStartTrialLoading(false);
          setIsAnnualLoading(false);
          setIsLifetimeLoading(false);
        });
      } catch (error) {
        console.warn('IAP initialization error:', error);
      }
    };

    initializeIap();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      endConnection().catch(() => undefined);
    };
  }, []);

  const handlePurchase = async (sku: string, source: 'trial' | 'annual' | 'lifetime') => {
    if (isPurchasing) return;
    setIsPurchasing(true);

    if (source === 'trial') {
      setIsStartTrialLoading(true);
    } else if (source === 'annual') {
      setIsAnnualLoading(true);
    } else {
      setIsLifetimeLoading(true);
    }

    try {
      let googleRequest: any;
      if (sku === LIFETIME_SKU) {
        googleRequest = {
          productId: 'online.focalyst.lifetime',
          purchaseOptionId: 'pro-lifetime-base',
          skus: ['online.focalyst.lifetime'],
        };
      } else if (sku === YEARLY_SKU) {
        googleRequest = {
          productId: 'online.focalyst.yearly',
          basePlanId: 'pro-yearly-base',
          skus: ['online.focalyst.yearly'],
        };
      } else {
        googleRequest = {
          productId: 'online.focalyst.monthly',
          basePlanId: 'pro-monthly-base',
          skus: ['online.focalyst.monthly'],
        };
      }

      await requestPurchase({
        request: {
          apple: { sku },
          google: googleRequest,
        },
        type: sku === LIFETIME_SKU ? 'in-app' : 'subs',
      });
    } catch (error: any) {
      console.warn('Purchase flow trigger error:', error);
      Alert.alert(
        "Transaction Notice",
        error?.message || "Unable to complete purchase in the current environment."
      );
      setIsPurchasing(false);
      setIsStartTrialLoading(false);
      setIsAnnualLoading(false);
      setIsLifetimeLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoreLoading(true);
    try {
      let storeFound = false;
      try {
        const purchases = await getAvailablePurchases();
        const hasProPurchase = purchases.some((purchase) =>
          [MONTHLY_SKU, YEARLY_SKU, LIFETIME_SKU, 'pro-monthly-base', 'pro-yearly-base', 'pro-lifetime-base'].includes(purchase.productId)
        );

        if (hasProPurchase) {
          storeFound = true;
          // Determine best plan from available purchases
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            let restoredPlan = 'pro_monthly';
            if (purchases.some(p => p.productId === LIFETIME_SKU || p.productId === 'pro-lifetime-base')) restoredPlan = 'lifetime';
            else if (purchases.some(p => p.productId === YEARLY_SKU || p.productId === 'pro-yearly-base')) restoredPlan = 'pro_yearly';

            const planExpiry = restoredPlan === 'lifetime' ? null
              : restoredPlan === 'pro_yearly'
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            await supabase.from('users').update({
              plan: restoredPlan,
              plan_expires_at: planExpiry,
            }).eq('id', user.id);

            await refreshProfile();
          }
        }
      } catch (storeError) {
        console.warn('Store restore error:', storeError);
      }

      // If the store finds nothing, call our server
      if (!storeFound) {
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
      const updatedProfile = await refreshProfile();
      const isPaid = updatedProfile?.plan && updatedProfile.plan !== 'free' && (!updatedProfile.plan_expires_at || new Date(updatedProfile.plan_expires_at) >= new Date());

      if (isPaid || storeFound) {
        Alert.alert(
          'Focalyst Pro is active',
          'Your purchase is restored.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        const isIOS = Platform.OS === 'ios';
        Alert.alert(
          'No purchases found',
          isIOS
            ? 'We could not find a purchase for this Apple ID or Focalyst account. If you bought Pro on the website, sign in with the same account you used there.'
            : 'We could not find a purchase for this Google Play account or Focalyst account. If you bought Pro on the website, sign in with the same account you used there.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Restore Failed',
        'There was an issue connecting to the store. Please try again.'
      );
    } finally {
      setIsRestoreLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="dark" />
      
      {/* Scrollable Area */}
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Header container wrapped with safe area padding */}
          <View style={{ paddingTop: insets.top + 10 }}>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <Text style={styles.headerBrand}>Focalyst</Text>
              <TouchableOpacity 
                onPress={() => {
                  routeToFreeDashboard();
                }} 
                style={styles.closeButton}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={TEXT_DARK} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              Unlock your full{'\n'}
              <Text style={styles.heroHighlight}>productivity.</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Join 10,000+ high-achievers using Focalyst to reclaim 2 hours of their day.
            </Text>
          </View>

          {/* Toggle Billing Cycle */}
          <View style={styles.toggleContainer}>
            <View style={styles.togglePill}>
              {/* Monthly Segment */}
              <TouchableOpacity
                style={[
                  styles.toggleSegment,
                  billingCycle === 'monthly' && styles.toggleSegmentActive,
                ]}
                onPress={() => setBillingCycle('monthly')}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.toggleText,
                    billingCycle === 'monthly' && styles.toggleTextActive,
                  ]}
                >
                  MONTHLY
                </Text>
              </TouchableOpacity>

              {/* Yearly Segment */}
              <TouchableOpacity
                style={[
                  styles.toggleSegment,
                  billingCycle === 'yearly' && styles.toggleSegmentActive,
                ]}
                onPress={() => setBillingCycle('yearly')}
                activeOpacity={0.9}
              >
                <View style={styles.yearlySegmentContent}>
                  <Text
                    style={[
                      styles.toggleText,
                      billingCycle === 'yearly' && styles.toggleTextActive,
                    ]}
                  >
                    YEARLY
                  </Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>2 MONTHS FREE</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pricing Cards Container */}
          <View style={styles.cardsContainer}>
            
            {/* Pro subscription Card */}
            <View style={styles.proCard}>
              {/* PRO badge overlapping border */}
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>

              <Text style={styles.cardTitle}>
                {billingCycle === 'yearly' ? 'Pro Annual' : 'Pro Monthly'}
              </Text>
              <Text style={styles.cardSubtitle}>
                Everything in basic, plus elite tools.
              </Text>

              {/* Price */}
              <View style={styles.priceRow}>
                <Text style={styles.currencySign}>$ </Text>
                <Text style={styles.priceNumber}>
                  {billingCycle === 'yearly' ? '39.99' : '4.99'}
                </Text>
                <Text style={styles.pricePeriod}>
                  {billingCycle === 'yearly' ? '/ year' : '/ month'}
                </Text>
              </View>

              <Text style={styles.billedText}>
                {billingCycle === 'yearly' 
                  ? 'Equivalent to $3.33/month' 
                  : 'Billed monthly'
                }
              </Text>

              <View style={styles.divider} />

              {/* Features List */}
              <View style={styles.featuresList}>
                {PRO_FEATURES.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={BRAND_BLUE} style={styles.featureIcon} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Lifetime Access Card */}
            <TouchableOpacity 
              style={styles.lifetimeCard}
              activeOpacity={0.9}
              onPress={() => handlePurchase(LIFETIME_SKU, 'lifetime')}
              disabled={isPurchasing || isRestoreLoading}
            >
              <View style={styles.lifetimeHeader}>
                <View style={styles.lifetimeTextContainer}>
                  <Text style={styles.lifetimeTitle}>Lifetime Access</Text>
                  <Text style={styles.lifetimeSubtitle}>Pay once, own the focus forever.</Text>
                </View>
                
                {/* Price */}
                <View style={styles.lifetimePriceContainer}>
                  {isLifetimeLoading ? (
                    <ActivityIndicator size="small" color={BRAND_BLUE} />
                  ) : (
                    <>
                      <Text style={styles.lifetimePriceSign}>$</Text>
                      <Text style={styles.lifetimePriceNumber}>99.99</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Features List */}
              <View style={styles.featuresList}>
                {LIFETIME_FEATURES.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={BRAND_BLUE} style={styles.featureIcon} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* Centered Restore Purchase Button */}
            <TouchableOpacity 
              style={[styles.restoreButton, (isPurchasing || isRestoreLoading) && { opacity: 0.5 }]}
              activeOpacity={0.7}
              disabled={isPurchasing || isRestoreLoading}
              onPress={handleRestore}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              accessibilityLabel="Restore Purchase"
              accessibilityRole="button"
            >
              {isRestoreLoading ? (
                <ActivityIndicator size="small" color="#64748b" />
              ) : (
                <Text style={styles.restoreText}>Restore Purchase</Text>
              )}
            </TouchableOpacity>

          </View>

          {/* Bottom margin spacer under cards so it scrolls fully past sticky footer */}
          <View style={{ height: 16 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Dark Footer */}
      <View style={styles.footerContainer}>
        {/* Dynamic Disclaimer Text */}
        <Text style={styles.disclaimerText}>
          {billingCycle === 'yearly' ? (
            <>
              7 days free trial, then <Text style={styles.boldPrice}>$39.99</Text>/year
            </>
          ) : (
            <>
              7 days free trial, then <Text style={styles.boldPrice}>$4.99</Text>/month
            </>
          )}
        </Text>
        <Text style={styles.subDisclaimerText}>
          No payments today! Cancel anytime.
        </Text>

        {/* CTA Button */}
        <TouchableOpacity 
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => handlePurchase(billingCycle === 'yearly' ? YEARLY_SKU : MONTHLY_SKU, 'trial')}
          disabled={isPurchasing || isRestoreLoading}
        >
          {isPurchasing && isStartTrialLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="star" size={16} color="#ffffff" style={styles.ctaIcon} />
              <Text style={styles.ctaText}>
                {isStartTrialLoading ? 'PROCESSING...' : 'START FREE TRIAL'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sub-links */}
        <View style={styles.subLinksRow}>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => handlePurchase(billingCycle === 'yearly' ? MONTHLY_SKU : YEARLY_SKU, 'annual')}
            disabled={isPurchasing || isRestoreLoading}
          >
            {isPurchasing && isAnnualLoading ? (
              <ActivityIndicator size="small" color="#64748b" />
            ) : (
              <Text style={styles.subLinkText}>
                {isAnnualLoading 
                  ? (billingCycle === 'yearly' ? 'PROCESSING MONTHLY...' : 'PROCESSING ANNUAL...') 
                  : (billingCycle === 'yearly' ? 'PROCEED WITH MONTHLY' : 'PROCEED WITH ANNUAL')
                }
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={routeToFreeDashboard}
            disabled={isPurchasing || isRestoreLoading}
          >
            <Text style={styles.subLinkText}>PROCEED WITH BASIC</Text>
          </TouchableOpacity>
        </View>

        {/* Compliance Links */}
        <View style={styles.complianceLinksRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://focalyst.online/terms')}>
            <Text style={styles.complianceText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.complianceText}> • </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://focalyst.online/privacy')}>
            <Text style={styles.complianceText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 260, // Space to scroll past the fixed footer
  },
  
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_DARK,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },

  // Hero
  heroSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: TEXT_DARK,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heroHighlight: {
    color: BRAND_BLUE,
  },
  heroSubtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
    marginTop: 12,
  },

  // Toggle Billing Cycle
  toggleContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: GREY_PILL_BG,
    borderRadius: 99,
    padding: 4,
    width: '100%',
    maxWidth: 320,
  },
  toggleSegment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSegmentActive: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  toggleTextActive: {
    color: TEXT_DARK,
  },
  yearlySegmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discountBadge: {
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 99,
  },
  discountBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Cards
  cardsContainer: {
    gap: 16,
  },
  proCard: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: BRAND_BLUE,
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: BRAND_BLUE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  proBadge: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: DARK_SLATE,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  proBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  cardSubtitle: {
    fontSize: 14,
    color: BRAND_BLUE,
    fontWeight: '600',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 20,
  },
  currencySign: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  priceNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  pricePeriod: {
    fontSize: 15,
    color: TEXT_MUTED,
    fontWeight: '500',
    marginLeft: 4,
  },
  billedText: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 18,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: TEXT_DARK,
    fontWeight: '500',
  },

  // Lifetime card
  lifetimeCard: {
    backgroundColor: CARD_GREY_BG,
    borderRadius: 20,
    padding: 24,
  },
  lifetimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lifetimeTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  lifetimeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  lifetimeSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
    lineHeight: 18,
  },
  lifetimePriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  lifetimePriceSign: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  lifetimePriceNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  // Sticky bottom dark container
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DARK_SLATE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  disclaimerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  subDisclaimerText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: BRAND_BLUE,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },
  ctaIcon: {
    marginRight: 8,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 8,
  },
  subLinkText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  complianceLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  complianceText: {
    color: '#64748b',
    fontSize: 10,
  },
  restoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  restoreText: {
    color: '#64748b',
    textDecorationLine: 'underline',
    fontWeight: '600',
    fontSize: 15,
  },
  boldPrice: {
    fontWeight: '800',
  },
});
