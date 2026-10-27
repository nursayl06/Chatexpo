import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { ChatSocketProvider } from '@/chat/ChatSocketProvider';
import { setupNotifications } from '@/notifications/notifications';

/** Everything here requires a signed-in user; the WebSocket lives exactly as long as this layout. */
export default function AppLayout() {
  useEffect(() => {
    void setupNotifications();
  }, []);

  return (
    <ChatSocketProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="photo" options={{ presentation: 'modal', title: 'Photo' }} />
      </Stack>
    </ChatSocketProvider>
  );
}
