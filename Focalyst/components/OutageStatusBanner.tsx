import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkBackendHealthAndSync,
  getOutageState,
  OutageState,
  subscribeOutageState,
} from '../src/services/outageResilienceService';

export const OutageStatusBanner: React.FC = () => {
  const [state, setState] = useState<OutageState>(getOutageState());
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return subscribeOutageState(setState);
  }, []);

  if (!state.isOutage) {
    return null;
  }

  // Ensure banner content clears the iPhone Dynamic Island & Status Bar completely
  const topSafePadding =
    Platform.OS === 'ios' ? Math.max(insets.top, 54) + 4 : Math.max(insets.top, 24) + 8;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setModalVisible(true)}
        style={[styles.bannerContainer, { paddingTop: topSafePadding }]}
      >
        <View style={styles.bannerCard}>
          <View style={styles.pulseDot} />
          <View style={styles.bannerTextWrap}>
            <Text numberOfLines={1} style={styles.bannerTitle}>
              {state.remoteConfig.shortBannerText}
            </Text>
            <Text numberOfLines={1} style={styles.bannerSub}>
              {state.isCheckingNow
                ? 'Reconnecting now...'
                : `Auto-retrying in ${state.secondsUntilNextCheck}s • Tap for status`}
              {state.pendingSyncCount > 0
                ? ` • ${state.pendingSyncCount} saved locally`
                : ''}
            </Text>
          </View>
          <View style={styles.detailsPill}>
            <Text style={styles.chevron}>Details ›</Text>
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.statusBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.statusBadgeText}>
                  OFFLINE PROTECTION ACTIVE
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>{state.remoteConfig.title}</Text>
            <Text style={styles.modalExplainer}>
              {state.remoteConfig.explainer}
            </Text>

            <View style={styles.sectionBox}>
              <Text style={styles.sectionHeading}>WHAT IS STILL WORKING</Text>
              <Text style={styles.checkItem}>
                ✓ Viewing your Tasks, Habits, Notes & Focus history
              </Text>
              <Text style={styles.checkItem}>
                ✓ Logging new Tasks, Habits & Focus Sessions offline
              </Text>
              <Text style={styles.checkItem}>
                ✓ AI Chat & Voice Notes (independent AI network)
              </Text>
            </View>

            <View style={styles.sectionBox}>
              <Text style={styles.sectionHeading}>YOUR DATA IS 100% SAFE</Text>
              <Text style={styles.safeText}>
                {state.pendingSyncCount > 0
                  ? `You have ${state.pendingSyncCount} logged item(s) safely stored on your iPhone. They will sync to the cloud automatically as soon as the connection returns.`
                  : 'All your data is safely stored on your iPhone. Anything you log right now will queue locally and sync automatically once servers recover.'}
              </Text>
            </View>

            <View style={styles.timerBar}>
              <Text style={styles.timerText}>
                {state.isCheckingNow
                  ? 'Checking connection right now...'
                  : `Checking again automatically in ${state.secondsUntilNextCheck} seconds`}
              </Text>
              <TouchableOpacity
                disabled={state.isCheckingNow}
                onPress={() => void checkBackendHealthAndSync()}
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>Check Now</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#0A0E1A',
    paddingHorizontal: 14,
    paddingBottom: 8,
    zIndex: 999,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F',
    borderWidth: 1,
    borderColor: '#F59E0B66',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bannerTextWrap: {
    flex: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FBBF24',
    marginRight: 10,
  },
  bannerTitle: {
    color: '#FEF3C7',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerSub: {
    color: '#FDE68A',
    fontSize: 11,
    marginTop: 2,
  },
  detailsPill: {
    backgroundColor: '#92400E',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 10,
  },
  chevron: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 25, 0.78)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F66',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    color: '#94A3B8',
    fontSize: 18,
    padding: 4,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalExplainer: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionBox: {
    backgroundColor: '#1E293B88',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeading: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  checkItem: {
    color: '#E2E8F0',
    fontSize: 13,
    marginBottom: 4,
  },
  safeText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#172554',
    padding: 12,
    borderRadius: 12,
  },
  timerText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
