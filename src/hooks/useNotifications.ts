import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface NotificationScheduleOptions {
  id: number;
  title: string;
  body: string;
  scheduleAt?: Date; // Optional date to trigger
}

export function useNotifications() {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    const checkPlatform = async () => {
      const native = Capacitor.isNativePlatform();
      setIsSupported(native);
      if (native) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const permission = await LocalNotifications.checkPermissions();
          setHasPermission(permission.display === 'granted');
        } catch (error) {
          console.error('Error checking notification permissions:', error);
        }
      }
    };
    checkPlatform();
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return false;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  const scheduleNotification = async (options: NotificationScheduleOptions) => {
    if (!isSupported) {

      return false;
    }
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Request permission dynamically if not granted
      let granted = hasPermission;
      if (!granted) {
        granted = await requestPermission();
      }
      
      if (!granted) {
        console.warn('Notification permissions denied.');
        return false;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: options.id,
            title: options.title,
            body: options.body,
            schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
            sound: 'default',
            actionTypeId: '',
            extra: null,
          },
        ],
      });
      return true;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return false;
    }
  };

  const cancelAllNotifications = async () => {
    if (!isSupported) return false;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      return true;
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      return false;
    }
  };

  return {
    isSupported,
    hasPermission,
    requestPermission,
    scheduleNotification,
    cancelAllNotifications,
  };
}
