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

interface SundayReportModalProps {
  isVisible: boolean;
  onClose: () => void;
  onReadNow: () => void;
}

export default function SundayReportModal({
  isVisible,
  onClose,
  onReadNow,
}: SundayReportModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Close Icon in Top Right */}
          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#0B1021" />
          </TouchableOpacity>

          {/* Icon Badge */}
          <View style={styles.reportIconBg}>
            <Ionicons name="document-text" size={36} color="#FF6B00" />
          </View>

          {/* Typography */}
          <Text style={styles.title}>Your Weekly Productivity Report has arrived.</Text>
          
          <Text style={styles.body}>
            Ready? Discover your strengths and weaknesses. Know your patterns and get insights about how to improve further.
          </Text>

          {/* Massive CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.9}
            onPress={onReadNow}
          >
            <Text style={styles.ctaText}>READ NOW</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // semi-transparent dark dim
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#C2C8D1', // Light Blue-Gray Modal background
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  reportIconBg: {
    width: 68,
    height: 68,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B1021', // Deep Navy for high contrast
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 12,
  },
  body: {
    fontSize: 13,
    color: '#0B1021', // Deep Navy for high contrast
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
    opacity: 0.8,
  },
  ctaButton: {
    backgroundColor: '#FF6B00', // Accent Orange
    borderRadius: 99,
    width: '100%',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
