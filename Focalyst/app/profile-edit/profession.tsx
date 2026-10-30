import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/utils/supabase';

const OPTIONS = [
  { value: 'Student', label: 'Student' },
  { value: 'Freelancer', label: 'Freelancer' },
  { value: 'Creator', label: 'Creator' },
  { value: 'Working Professional', label: 'Working Professional' },
  { value: 'Entrepreneur', label: 'Entrepreneur' },
];

const VALUE_MAPPING: Record<string, string> = {
  "Student": "student",
  "Freelancer": "freelancer",
  "Creator": "creator",
  "Working Professional": "professional",
  "Entrepreneur": "entrepreneur"
};

const REVERSE_MAPPING: Record<string, string> = {
  "student": "Student",
  "freelancer": "Freelancer",
  "creator": "Creator",
  "professional": "Working Professional",
  "entrepreneur": "Entrepreneur"
};

export default function ProfileTypeScreen() {
  const router = useRouter();
  const { isEditing } = useLocalSearchParams();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      try {
        setFetching(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('profile_type')
            .eq('id', user.id)
            .single();
          if (profile?.profile_type) {
            const mappedVal = REVERSE_MAPPING[profile.profile_type.toLowerCase()];
            if (mappedVal) {
              setSelectedOption(mappedVal);
            } else {
              const matched = OPTIONS.find(
                opt => opt.value.toLowerCase() === profile.profile_type?.toLowerCase()
              );
              if (matched) {
                setSelectedOption(matched.value);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error loading profile type:', e);
      } finally {
        setFetching(false);
      }
    }
    loadUserData();
  }, []);

  const handleFinish = async (skip = false) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user authenticated');

      const payload: any = { onboarding_done: true };
      if (!skip && selectedOption) {
        payload.profile_type = VALUE_MAPPING[selectedOption] || selectedOption.toLowerCase();
      }

      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', user.id);

      if (error) throw error;

      if (isEditing === 'true') {
        router.replace('/profile' as any);
      } else {
        router.replace('/(tabs)/plan' as any);
      }
    } catch (e: any) {
      console.error('Error completing onboarding:', e);
      alert(e.message || 'Failed to save profile details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header / Back arrow on editing */}
        {isEditing === 'true' && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#4a6c8c" />
          </TouchableOpacity>
        )}

        <View style={styles.formContainer}>
          <Text style={styles.heading}>
            What best describes you?{"\n"}We'll personalise Focalyst to fit your life
          </Text>

          {fetching ? (
            <ActivityIndicator size="large" color="#4a6c8c" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.optionsList}>
              {OPTIONS.map((opt) => {
                const isSelected = selectedOption === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setSelectedOption(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#4a6c8c" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryButton, !selectedOption && styles.primaryButtonDisabled]}
              disabled={!selectedOption || loading}
              onPress={() => handleFinish(false)}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Let's go</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              disabled={loading}
              onPress={() => handleFinish(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#cbd5e1', // Light grey-blue background
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  backButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 26,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 36,
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  optionsList: {
    gap: 12,
    marginBottom: 40,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#4a6c8c',
    backgroundColor: '#f8fafc',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
  },
  optionTextSelected: {
    color: '#4a6c8c',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  primaryButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#4a6c8c', // Premium steel blue matches design
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
});
