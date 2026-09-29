import { LocalNotifications } from '@capacitor/local-notifications';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';

export async function notifyDone(fileName: string, count = 1): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  try {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: (Date.now() % 2147483647),
          title: 'Transfer complete',
          body: count > 1 ? `${count} files received` : fileName,
          smallIcon: 'ic_stat_zapdrop',
        },
      ],
    });
  } catch (e) {
    console.warn('Notification error', e);
  }
}

export async function showToast(text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Toast.show({ text, duration: 'short' });
      return;
    } catch {
      // fallback
    }
  }
}
