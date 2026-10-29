import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/utils/supabase';

interface AppConfig {
  ios_latest_version: string;
  android_latest_version: string;
  force_update: boolean;
  update_title: string;
  update_message: string;
  ios_store_url: string;
  android_store_url: string;
}

const DISMISSED_VERSION_KEY = '@focalyst_dismissed_update_version';

/**
 * Compares two semantic version strings (e.g., "1.0.2" vs "1.1.0").
 * Returns true if remoteVersion is strictly greater than currentVersion.
 */
function isVersionNewer(currentVersion: string, remoteVersion: string): boolean {
  const cleanCurrent = currentVersion.replace(/[^0-9.]/g, '').split('.').map(Number);
  const cleanRemote = remoteVersion.replace(/[^0-9.]/g, '').split('.').map(Number);
  const maxLength = Math.max(cleanCurrent.length, cleanRemote.length, 3);

  for (let i = 0; i < maxLength; i++) {
    const curr = cleanCurrent[i] || 0;
    const rem = cleanRemote[i] || 0;
    if (rem > curr) return true;
    if (rem < curr) return false;
  }
  return false;
}

export const UpdateModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const checkAppVersion = async () => {
      try {
        if (Platform.OS === 'web') return;

        const currentVersion =
          Constants.expoConfig?.version ||
          (Constants.manifest2 as any)?.extra?.expoClient?.version ||
          '1.0.0';

        const { data, error } = await supabase
          .from('app_config')
          .select('*')
          .eq('id', 'global')
          .single();

        if (error || !data || !isMounted) return;

        const targetVersion =
          Platform.OS === 'ios'
            ? data.ios_latest_version
            : data.android_latest_version;

        if (!targetVersion) return;

        const needsUpdate = isVersionNewer(currentVersion, targetVersion);
        if (!needsUpdate) return;

        // If it's a soft update (not forced), check if the user already clicked "Not now" for this specific version
        if (!data.force_update) {
          const dismissedVersion = await AsyncStorage.getItem(DISMISSED_VERSION_KEY);
          if (dismissedVersion === targetVersion) {
            return;
          }
        }

        if (isMounted) {
          setConfig(data);
          setRemoteVersion(targetVersion);
          setVisible(true);
        }
      } catch (err) {
        // Fail silently so app startup is never blocked by network offline state
      }
    };

    checkAppVersion();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateNow = async () => {
    if (!config) return;
    const storeUrl =
      Platform.OS === 'ios' ? config.ios_store_url : config.android_store_url;

    if (storeUrl) {
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      }
    }
  };

  const handleDismiss = async () => {
    if (config?.force_update) return;
    setVisible(false);
    try {
      if (remoteVersion) {
        await AsyncStorage.setItem(DISMISSED_VERSION_KEY, remoteVersion);
      }
    } catch {
      // Ignore storage write error
    }
  };

  if (!visible || !config) return null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!config.force_update) {
          handleDismiss();
        }
      }}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Circular Badge with Waving Hand Emoji */}
          <View style={styles.iconCircle}>
            <Text style={styles.emojiText}>👋🏽</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {config.update_title || "There's a new update!"}
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            {config.update_message ||
              'We added a lot of new interesting features and fixed bugs you have been experiencing to make your experience as smooth as possible.'}
          </Text>

          {/* Primary Pill Button */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleUpdateNow} style={styles.updateButton}>
            <Text style={styles.updateButtonText}>Update now</Text>
          </TouchableOpacity>

          {/* Secondary "Not now" Button (Hidden if force_update is true) */}
          {!config.force_update && (
            <TouchableOpacity activeOpacity={0.7} onPress={handleDismiss} style={styles.notNowButton}>
              <Text style={styles.notNowText}>Not now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F3ECE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  emojiText: {
    fontSize: 40,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  updateButton: {
    width: '85%',
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notNowButton: {
    marginTop: 18,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  notNowText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
});
