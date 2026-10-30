import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../src/utils/supabase';
import { useColorScheme } from '../components/useColorScheme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';

  const [email, setEmail] = useState((params.email as string) || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email.trim());
    }
  }, [params.email]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startCountdown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text.trim());
    if (errorMessage) setErrorMessage('');
  };

  const handleSendResetLink = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected === false) {
        setErrorMessage('Unable to connect. Please check your internet connection and try again.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: 'https://focalyst.online/reset-password',
      });

      if (error) {
        const rawMsg = (error.message || '').toLowerCase();
        if (
          rawMsg.includes('network') ||
          rawMsg.includes('fetch') ||
          rawMsg.includes('failed to fetch') ||
          rawMsg.includes('timeout')
        ) {
          setErrorMessage('Unable to connect. Please check your internet connection and try again.');
          return;
        }
        if (rawMsg.includes('rate') || rawMsg.includes('limit') || rawMsg.includes('429')) {
          setErrorMessage('Too many requests. Please wait a moment before trying again.');
          return;
        }
        // Friendly failure message without raw technical codes
        setErrorMessage('Something went wrong while sending the reset link. Please try again.');
        return;
      }

      // Exact copy requested:
      // "If an account exists for that email, we've sent a reset link. Open it, set a new password, then come back here to log in."
      setSuccessMessage(
        "If an account exists for that email, we've sent a reset link. Open it, set a new password, then come back here to log in."
      );
      startCountdown();
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline')) {
        setErrorMessage('Unable to connect. Please check your internet connection and try again.');
      } else {
        setErrorMessage('Something went wrong while sending the reset link. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const colors = {
    background: isDark ? '#090d16' : '#f8fafc',
    cardBackground: isDark ? '#0f172a' : '#ffffff',
    text: isDark ? '#ffffff' : '#0f172a',
    mutedText: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#1e293b' : '#e2e8f0',
    inputBg: isDark ? '#0f172a' : '#ffffff',
    inputBorder: isDark ? '#1e293b' : '#cbd5e1',
    inputText: isDark ? '#ffffff' : '#0f172a',
    placeholder: '#94a3b8',
    primary: '#3b82f6',
    primaryText: '#ffffff',
    backIcon: isDark ? '#ffffff' : '#0f172a',
    successBg: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
    successBorder: isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.25)',
    errorText: '#ef4444',
  };

  const isResendMode = Boolean(successMessage);
  const isButtonDisabled = isLoading || (isResendMode && countdown > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* Top back navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Back to login"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.backIcon} />
          <Text style={[styles.backNavText, { color: colors.backIcon }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={styles.innerContainer}>
            {/* Header: Exact match to login screen */}
            <View style={styles.headerContainer}>
              <Text style={[styles.logoText, { color: colors.text }]}>FOCALYST</Text>
              <Text style={[styles.subtitleText, { color: colors.mutedText }]}>Own your time.</Text>
            </View>

            {/* Instruction summary */}
            <View style={styles.instructionContainer}>
              <Text style={[styles.titleText, { color: colors.text }]}>Reset Password</Text>
              <Text style={[styles.descriptionText, { color: colors.mutedText }]}>
                Enter the email associated with your account and we&apos;ll send you a link to reset your password.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  },
                ]}
                placeholder="Enter your email"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={handleEmailChange}
                clearButtonMode="always"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!isLoading}
                returnKeyType="send"
                onSubmitEditing={handleSendResetLink}
              />

              {/* Success callout */}
              {successMessage ? (
                <View
                  style={[
                    styles.successBanner,
                    {
                      backgroundColor: colors.successBg,
                      borderColor: colors.successBorder,
                    },
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color={colors.primary} style={{ marginTop: 2, marginRight: 10 }} />
                  <Text style={[styles.successText, { color: colors.text }]}>{successMessage}</Text>
                </View>
              ) : null}

              {/* Error message */}
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              {/* Primary Action Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  isButtonDisabled && styles.disabledButton,
                ]}
                onPress={handleSendResetLink}
                disabled={isButtonDisabled}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>
                    {isResendMode
                      ? countdown > 0
                        ? `Resend (${countdown}s)`
                        : 'Resend'
                      : 'Send reset link'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Back to Login Secondary Button */}
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'transparent' : '#ffffff',
                  },
                ]}
                onPress={() => router.back()}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={[styles.secondaryButtonText, { color: colors.mutedText }]}>Back to Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backNavText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 2,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  subtitleText: {
    fontSize: 14,
    marginTop: 6,
  },
  instructionContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  formContainer: {
    width: '100%',
    gap: 14,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.55,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
  },
});
