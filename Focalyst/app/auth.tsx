import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { AntDesign, FontAwesome, Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/utils/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Required for web browser behavior in auth session
WebBrowser.maybeCompleteAuthSession();

// The `focalyst` scheme is registered in CFBundleURLTypes and the Android intent filter.
const GOOGLE_REDIRECT_TO = 'focalyst://auth/callback';

// Fills users.full_name only when it is empty, never with an email. An existing name always wins.
async function fillMissingName(userId: string, candidate: string | null | undefined) {
  const name = candidate?.trim();
  if (!name || name.includes('@')) return;
  try {
    const { data: row } = await supabase.from('users').select('full_name').eq('id', userId).maybeSingle();
    if (!row || row.full_name?.trim()) return;
    await supabase.from('users').update({ full_name: name }).eq('id', userId).or('full_name.is.null,full_name.eq.');
  } catch {}
}

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  const handleEmailChange = (text: string) => {
    if (text.includes('FunctionCallException') || text.includes('ReactFabric')) return;
    setEmail(text.trim());
  };

  const handlePasswordChange = (text: string) => {
    if (text.includes('FunctionCallException') || text.includes('ReactFabric')) return;
    setPassword(text);
  };

  const theme = {
    colors: {
      gray: '#94a3b8',
    },
  };
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setMessage('');
    try {
      // Must match an entry on the Supabase Redirect URLs allow list exactly. Linking.createURL
      // builds it from the app.json scheme (online.focalyst://, exp+…:// in dev), which is not
      // on that list, so Supabase fell back to the Site URL (focalyst.online).
      const redirectTo = GOOGLE_REDIRECT_TO;
      if (__DEV__) console.log('[auth] google redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type === 'success' && res.url) {
          // 1. Handle PKCE code parameter
          const params = Linking.parse(res.url).queryParams;
          if (params?.code && typeof params.code === 'string') {
            await supabase.auth.exchangeCodeForSession(params.code);
          }
          // 2. Handle implicit hash tokens fallback
          const hash = res.url.split('#')[1];
          if (hash) {
            const hashParams = new URLSearchParams(hash);
            const access_token = hashParams.get('access_token');
            const refresh_token = hashParams.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }

          // Verify session and route to authenticated screen
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            const meta = userData.user.user_metadata ?? {};
            await fillMissingName(userData.user.id, meta.full_name || meta.name);
            const { data: profile } = await supabase
              .from('users')
              .select('onboarding_done')
              .eq('id', userData.user.id)
              .single();

            if (profile?.onboarding_done) {
              router.replace('/(tabs)/plan' as any);
            } else {
              router.replace('/paywall' as any);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[auth] google sign in error:', err);
      setMessage(err?.message || 'Google sign in failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else if (data?.user) {
        // Fetch user profile onboarding_done state
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_done')
          .eq('id', data.user.id)
          .single();

        if (profile?.onboarding_done) {
          router.replace('/(tabs)/plan' as any);
        } else {
          router.replace('/paywall' as any);
        }
      }
    } catch (err: any) {
      setMessage(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else if (data?.session && data?.user) {
        // Email confirmation is off: session returned immediately
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_done')
          .eq('id', data.user.id)
          .single();

        if (profile?.onboarding_done) {
          router.replace('/(tabs)/plan' as any);
        } else {
          router.replace('/paywall' as any);
        }
      } else {
        setMessage('Check your email for the confirmation link.');
      }
    } catch (err: any) {
      setMessage(err.message || 'Sign up failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    setMessage('');
    try {
      // Generate a cryptographic nonce for Supabase security
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      // Request Apple credentials via the native sign-in sheet
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple.');
      }



      // Exchange the Apple identity token with Supabase
      const { error, data } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        setMessage(error.message);
      } else if (data?.user) {
        // Apple only sends the name on the very first sign-in.
        const appleName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
        const meta = data.user.user_metadata ?? {};
        await fillMissingName(data.user.id, appleName || meta.full_name || meta.name);
        // Route based on onboarding status (same pattern as email login)
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_done')
          .eq('id', data.user.id)
          .single();

        if (profile?.onboarding_done) {
          router.replace('/(tabs)/plan' as any);
        } else {
          router.replace('/paywall' as any);
        }
      }
    } catch (err: any) {
      // ERR_REQUEST_CANCELED means the user dismissed the Apple sheet — not an error
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        setMessage(err.message || 'Apple Sign-In failed.');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>
            {/* Logo and Greeting */}
            <View style={styles.headerContainer}>
              <Text style={styles.logoText}>FOCALYST</Text>
              <Text style={styles.subtitleText}>Own your time.</Text>
            </View>

            {/* Google OAuth Button */}
            <TouchableOpacity
              style={[styles.googleButton, isGoogleLoading && styles.disabledButton]}
              activeOpacity={0.85}
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading || isAppleLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: 12 }}>
                    <Path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <Path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <Path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <Path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </Svg>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple OAuth Button */}
            <TouchableOpacity
              style={[styles.appleButton, (isAppleLoading || isGoogleLoading) && styles.disabledButton]}
              activeOpacity={0.85}
              onPress={handleAppleSignIn}
              disabled={isAppleLoading || isLoading || isGoogleLoading}
            >
              {isAppleLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <FontAwesome name="apple" size={20} color="white" style={{ marginRight: 12 }} />
                  <Text style={styles.appleButtonText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={handleEmailChange}
                clearButtonMode="always"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                contextMenuHidden={false}
                editable={true}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b', position: 'relative' }}>
                <TextInput 
                  secureTextEntry={!passwordVisible}
                  style={{ flex: 1, paddingRight: 40, height: 48, color: '#ffffff', fontSize: 14 }}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={handlePasswordChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  contextMenuHidden={false}
                  editable={true}
                />
                <TouchableOpacity 
                  style={{ position: 'absolute', right: 10 }}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  <Ionicons name={passwordVisible ? "eye-off" : "eye"} size={22} color={theme.colors.gray} />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => router.push({ pathname: '/forgot-password', params: email ? { email } : {} } as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Log In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, isLoading && styles.disabledButton]}
                  onPress={handleSignUp}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {message ? <Text style={styles.messageText}>{message}</Text> : null}
            </View>

            {/* Legal terms footer */}
            <Text style={styles.footerNote}>
              By continuing, you agree to our{' '}
              <Text
                style={styles.footerLink}
                onPress={() => Linking.openURL('https://focalyst.online/terms')}
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.footerLink}
                onPress={() => Linking.openURL('https://focalyst.online/privacy')}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16', // Custom dark navy brand background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  subtitleText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 6,
  },
  googleButton: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  appleButton: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appleButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 16,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e293b',
  },
  dividerText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  formContainer: {
    width: '100%',
    gap: 12,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 14,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  messageText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  footerNote: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 16,
  },
  footerLink: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
});
