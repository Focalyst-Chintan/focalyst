import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

const REVIEW_STATE_KEY = '@focalyst_review_state_v1';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in production

export const APPLE_APP_ID = '6774425442';
export const ANDROID_PACKAGE_NAME = 'online.focalyst';

export type MilestoneActionType = 'todo' | 'habit' | 'focus';

interface PersistedReviewState {
  hasCompletedReview: boolean;
  firstActionCompleted: boolean;
  lastDismissedAt: number | null;
  completedActionsCount: number;
}

export interface ReviewModalTriggerState {
  visible: boolean;
  milestoneType: MilestoneActionType | null;
}

const DEFAULT_PERSISTED_STATE: PersistedReviewState = {
  hasCompletedReview: false,
  firstActionCompleted: false,
  lastDismissedAt: null,
  completedActionsCount: 0,
};

type Listener = (state: ReviewModalTriggerState) => void;
const listeners = new Set<Listener>();

let modalState: ReviewModalTriggerState = {
  visible: false,
  milestoneType: null,
};

function notifyListeners() {
  const snapshot = { ...modalState };
  listeners.forEach((fn) => fn(snapshot));
}

export function subscribeReviewModal(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...modalState });
  return () => {
    listeners.delete(listener);
  };
}

export function getReviewModalState(): ReviewModalTriggerState {
  return { ...modalState };
}

async function getPersistedState(): Promise<PersistedReviewState> {
  try {
    const raw = await AsyncStorage.getItem(REVIEW_STATE_KEY);
    if (raw) {
      return { ...DEFAULT_PERSISTED_STATE, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_PERSISTED_STATE };
}

async function savePersistedState(next: PersistedReviewState): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(next));
  } catch {}
}

export async function recordMilestoneForReview(
  actionType: MilestoneActionType
): Promise<void> {
  const state = await getPersistedState();

  if (modalState.visible) {
    return;
  }

  // In production, stop prompting once review is completed
  if (!__DEV__ && state.hasCompletedReview) {
    return;
  }

  const now = Date.now();
  const isFirstEverAction = !state.firstActionCompleted;
  const cooldownPassed =
    __DEV__ ||
    !state.lastDismissedAt ||
    now - state.lastDismissedAt >= COOLDOWN_MS;

  const updatedState: PersistedReviewState = {
    ...state,
    firstActionCompleted: true,
    completedActionsCount: (state.completedActionsCount || 0) + 1,
  };
  await savePersistedState(updatedState);

  if (isFirstEverAction || cooldownPassed) {
    setTimeout(() => {
      modalState = {
        visible: true,
        milestoneType: actionType,
      };
      notifyListeners();
    }, 900);
  }
}

export async function dismissReviewPromptForLater(): Promise<void> {
  modalState = { visible: false, milestoneType: null };
  notifyListeners();

  const state = await getPersistedState();
  await savePersistedState({
    ...state,
    lastDismissedAt: Date.now(),
  });
}

export async function markReviewCompletedAndOpenStore(
  openStore: boolean = true
): Promise<void> {
  modalState = { visible: false, milestoneType: null };
  notifyListeners();

  const state = await getPersistedState();
  await savePersistedState({
    ...state,
    hasCompletedReview: true,
  });

  if (!openStore) return;

  try {
    if (Platform.OS === 'ios') {
      const iosDeepLink = `itms-apps://itunes.apple.com/app/id${APPLE_APP_ID}?action=write-review`;
      const iosWebFallback = `https://apps.apple.com/app/id${APPLE_APP_ID}?action=write-review`;
      const supported = await Linking.canOpenURL(iosDeepLink);
      await Linking.openURL(supported ? iosDeepLink : iosWebFallback);
    } else {
      const androidDeepLink = `market://details?id=${ANDROID_PACKAGE_NAME}`;
      const androidWebFallback = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;
      const supported = await Linking.canOpenURL(androidDeepLink);
      await Linking.openURL(supported ? androidDeepLink : androidWebFallback);
    }
  } catch {}
}
