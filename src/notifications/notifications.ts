import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Message } from '@/api/schemas';

const CHANNEL_ID = 'messages';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Creates the Android channel (needed before the Android 13 permission prompt) and asks for permission once. */
export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Local notification for a message that arrived while the app is in the background.
 * Notifications when the app is fully closed need server push (FCM/APNs) — see README "Next steps".
 */
export async function notifyNewMessage(message: Message): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.author.username,
      body: message.text ?? '📷 Photo',
      data: { url: '/' },
    },
    trigger: null,
  });
}
