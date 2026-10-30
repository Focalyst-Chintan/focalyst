import * as Notifications from 'expo-notifications';

// One replaceable slot so there is never more than one blocking update on screen (flow section 8).
const UPDATE_ID = 'focalyst-blocking-update';

export async function sendBlockingUpdate(title: string, body: string) {
  try {
    await Notifications.dismissNotificationAsync(UPDATE_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: UPDATE_ID,
      content: { title, body, sound: false, data: { route: '/(tabs)/focus' } },
      trigger: null,
    });
  } catch (e) {
    if (__DEV__) console.warn('[blocking] notification failed', e);
  }
}

export async function requestNotificationPermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || !current.canAskAgain) return current.granted;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}
