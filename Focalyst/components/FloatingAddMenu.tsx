import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface FloatingAddMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenVoice?: () => void;
}

export default function FloatingAddMenu({ isVisible, onClose, onOpenVoice }: FloatingAddMenuProps) {
  const router = useRouter();

  const handleShortcutPress = (routeConfig: any) => {
    onClose();
    // Delay routing slightly to allow the Modal fade-out transition to complete smoothly
    setTimeout(() => {
      router.push(routeConfig);
    }, 120);
  };

  const handleVoicePress = () => {
    onClose();
    if (onOpenVoice) {
      onOpenVoice();
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.capsuleContainer} pointerEvents="box-none">
          <Pressable style={styles.capsule} onPress={(e) => e.stopPropagation()}>
            {/* Task Shortcut */}
            <TouchableOpacity
              style={styles.shortcutBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add Task"
              onPress={() => handleShortcutPress({ pathname: '/plan', params: { action: 'addTask', t: Date.now() } })}
            >
              <View style={styles.iconBg}>
                <Ionicons name="calendar-outline" size={22} color="#ffffff" />
              </View>
              <Text style={styles.shortcutLabel}>Task</Text>
            </TouchableOpacity>

            {/* Session Shortcut */}
            <TouchableOpacity
              style={styles.shortcutBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Start Focus Session"
              onPress={() => handleShortcutPress({ pathname: '/focus', params: { action: 'startSession', t: Date.now() } })}
            >
              <View style={styles.iconBg}>
                <Ionicons name="stopwatch-outline" size={22} color="#ffffff" />
              </View>
              <Text style={styles.shortcutLabel}>Session</Text>
            </TouchableOpacity>

            {/* Voice Shortcut */}
            <TouchableOpacity
              style={styles.shortcutBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Record Voice Note"
              onPress={handleVoicePress}
            >
              <View style={styles.iconBg}>
                <Ionicons name="mic-outline" size={24} color="#ffffff" />
              </View>
              <Text style={styles.voiceLabel}>Voice</Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)', // Slightly dark premium backdrop overlay
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  capsuleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 95, // Sitting beautifully right above the 60px bottom tab bar
  },
  capsule: {
    backgroundColor: '#4a6c8c', // Slate-blue background
    borderRadius: 36, // Thick pill shape
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 16, // Layout spacing
    // Premium Drop Shadow styling
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  shortcutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
  },
  iconBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)', // Semi-transparent square overlay
    width: 48,
    height: 48,
    borderRadius: 14, // Rounded-xl
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  shortcutLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  voiceLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
