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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/utils/supabase';

export default function NameScreen() {
  const router = useRouter();
  const { isEditing } = useLocalSearchParams();
  const [name, setName] = useState('');
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
            .select('full_name')
            .eq('id', user.id)
            .single();
          if (profile?.full_name) {
            setName(profile.full_name);
          }
        }
      } catch (e) {
        console.warn('Error loading user name:', e);
      } finally {
        setFetching(false);
      }
    }
    loadUserData();
  }, []);

  const handleNext = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user authenticated');

      const { error } = await supabase
        .from('users')
        .update({ full_name: name.trim() })
        .eq('id', user.id);

      if (error) throw error;

      router.push({
        pathname: '/profile-edit/profession',
        params: { isEditing: isEditing === 'true' ? 'true' : 'false' },
      });
    } catch (e: any) {
      console.error('Error saving name:', e);
      alert(e.message || 'Failed to save name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
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
                Before we get started,{"\n"}what should I call you?
              </Text>

              {fetching ? (
                <ActivityIndicator size="large" color="#4a6c8c" style={{ marginTop: 40 }} />
              ) : (
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor="#94a3b8"
                    value={name}
                    onChangeText={setName}
                    autoFocus
                    maxLength={50}
                    onSubmitEditing={handleNext}
                  />
                  <TouchableOpacity
                    onPress={handleNext}
                    style={[styles.arrowButton, !name.trim() && styles.arrowButtonDisabled]}
                    disabled={!name.trim() || loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#4a6c8c" />
                    ) : (
                      <Ionicons name="arrow-forward" size={20} color="#475569" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#cbd5e1', // Light grey-blue background
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
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
    paddingBottom: 80, // push up slightly
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    color: '#475569', // Slate grey-blue heading
    lineHeight: 38,
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 99, // Pill-shaped text input
    height: 56,
    paddingLeft: 24,
    paddingRight: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#334155',
    fontSize: 16,
    fontWeight: '500',
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  arrowButtonDisabled: {
    opacity: 0.5,
  },
});
