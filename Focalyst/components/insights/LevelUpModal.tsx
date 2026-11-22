import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import type { LevelBenchmark } from '../../src/utils/xpService';
import { LEVEL_BADGE_PALETTES, syncLevelBadges } from '../../src/utils/badgeMilestones';
import { HexLevelBadge } from '../badges/HexLevelBadge';

const BURST_COLORS = [
  '#2DD4BF',
  '#38BDF8',
  '#A855F7',
  '#FACC15',
  '#FB923C',
  '#EF4444',
  '#10B981',
];

interface BurstParticle {
  angle: number;
  distance: number;
  color: string;
  size: number;
  kind: 'ribbon' | 'circle' | 'sparkle';
  duration: number;
  delay: number;
  spinDeg: number;
}

function BurstingCelebration({ visible }: { visible: boolean }) {
  const particles: BurstParticle[] = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 + ((i % 3) - 1) * 0.14;
        const distance = 78 + (i % 5) * 20;
        const kinds: BurstParticle['kind'][] = ['ribbon', 'circle', 'sparkle'];
        return {
          angle,
          distance,
          color: BURST_COLORS[i % BURST_COLORS.length],
          size: i % 3 === 2 ? 12 : 7 + (i % 3) * 2.5,
          kind: kinds[i % 3],
          duration: 920 + (i % 5) * 90,
          delay: (i % 4) * 35,
          spinDeg: (i % 2 === 0 ? 1 : -1) * (180 + (i % 4) * 90),
        };
      }),
    []
  );

  const anims = useRef(particles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!visible) return;

    const burstAnims = anims.map((val, i) => {
      val.setValue(0);
      return Animated.timing(val, {
        toValue: 1,
        duration: particles[i].duration,
        delay: particles[i].delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    });

    const parallelBurst = Animated.parallel(burstAnims);
    parallelBurst.start();

    return () => {
      parallelBurst.stop();
    };
  }, [visible, anims, particles]);

  return (
    <View style={styles.burstContainer} pointerEvents="none">
      {/* Bursting confetti & 4-point sparkles erupting from (0,0) */}
      {particles.map((p, i) => {
        const dx = Math.cos(p.angle) * p.distance;
        const dy = Math.sin(p.angle) * p.distance;

        const translateX = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, dx],
        });
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, dy],
        });
        const scale = anims[i].interpolate({
          inputRange: [0, 0.18, 0.75, 1],
          outputRange: [0.2, 1.15, 0.9, 0.4],
        });
        const opacity = anims[i].interpolate({
          inputRange: [0, 0.12, 0.7, 1],
          outputRange: [0, 1, 0.85, 0],
        });
        const rotate = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.spinDeg}deg`],
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              opacity,
              transform: [{ translateX }, { translateY }, { scale }, { rotate }],
            }}
          >
            {p.kind === 'sparkle' ? (
              <Svg width={p.size} height={p.size} viewBox="0 0 20 20">
                <Path
                  d="M10 0 L12.5 7.5 L20 10 L12.5 12.5 L10 20 L7.5 12.5 L0 10 L7.5 7.5 Z"
                  fill={p.color}
                />
              </Svg>
            ) : p.kind === 'circle' ? (
              <View
                style={{
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  backgroundColor: p.color,
                }}
              />
            ) : (
              <View
                style={{
                  width: p.size * 1.4,
                  height: p.size * 0.55,
                  borderRadius: 2,
                  backgroundColor: p.color,
                }}
              />
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

export function LevelUpModal({
  visible,
  level,
  userId,
  isDarkMode = true,
  onClose,
  onViewAllBadges,
}: {
  visible: boolean;
  level: LevelBenchmark;
  userId?: string;
  isDarkMode?: boolean;
  onClose: () => void;
  onViewAllBadges: () => void;
}) {
  const palette = LEVEL_BADGE_PALETTES[level.level] || LEVEL_BADGE_PALETTES[1];
  const badgeScale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!visible) return;

    // Persist unlocked badge immediately when modal opens
    void syncLevelBadges(level.level, userId);

    // Spring pop-out entrance: 0.3 -> 1.08 -> 1.0
    badgeScale.setValue(0.3);
    const springAnim = Animated.spring(badgeScale, {
      toValue: 1,
      damping: 10,
      stiffness: 160,
      mass: 1,
      useNativeDriver: true,
    });
    springAnim.start();

    return () => springAnim.stop();
  }, [visible, level.level, userId, badgeScale]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        style={[
          styles.overlay,
          {
            backgroundColor: isDarkMode
              ? 'rgba(5, 7, 15, 0.80)'
              : 'rgba(10, 16, 34, 0.58)',
          },
        ]}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.card,
            isDarkMode
              ? { backgroundColor: '#111830', borderColor: 'rgba(255,255,255,0.1)' }
              : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
          ]}
        >
          {/* Top-right X close button */}
          <TouchableOpacity
            onPress={onClose}
            hitSlop={10}
            style={[
              styles.closeBtn,
              { backgroundColor: isDarkMode ? '#18213D' : '#F1F5F9' },
            ]}
            accessibilityLabel="Close"
          >
            <Ionicons
              name="close"
              size={18}
              color={isDarkMode ? '#A3ADC8' : '#334155'}
            />
          </TouchableOpacity>

          {/* Hexagonal Badge + Realistic Bursting Flares */}
          <View style={styles.badgeStage}>
            <BurstingCelebration visible={visible} />
            <Animated.View
              style={[
                styles.badgeWrap,
                { transform: [{ scale: badgeScale }] },
              ]}
            >
              <HexLevelBadge
                level={level.level}
                size="xl"
                isDarkMode={isDarkMode}
              />
            </Animated.View>
          </View>

          {/* Eyebrow + Hero Level Title */}
          <Text style={[styles.eyebrow, { color: palette.baseFill }]}>
            Level {level.level} Unlocked
          </Text>
          <Text
            style={[
              styles.heroTitle,
              { color: isDarkMode ? '#FFFFFF' : '#0F172A' },
            ]}
          >
            {level.title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: isDarkMode ? '#A3ADC8' : '#475569' },
            ]}
          >
            Congratulations. You reached Level {level.level} in Focalyst and earned a new badge. Keep your momentum going.
          </Text>

          {/* Solid Blue CTA Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={async () => {
              await syncLevelBadges(level.level, userId);
              onClose();
              onViewAllBadges();
            }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaText}>View All Badges</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 344,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeStage: {
    width: 240,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  burstContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    zIndex: 2,
  },
  eyebrow: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  ctaBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1951FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
