import { StyleSheet, Text, View } from 'react-native';

import type { ConnectionStatus } from '@/chat/ChatSocketProvider';
import { colors } from './theme';

type Props = { status: ConnectionStatus; queuedCount: number };

/** Shows what is going on with the connection. Hidden when everything is fine. */
export function ConnectionBanner({ status, queuedCount }: Props) {
  if (status === 'online') return null;
  const waiting = queuedCount > 0 ? ` ${queuedCount} message(s) will be sent automatically.` : '';
  const text =
    status === 'offline' ? `No internet connection.${waiting}` : `Connecting to the chat…${waiting}`;
  return (
    <View style={[styles.banner, status === 'offline' ? styles.offline : styles.connecting]} accessibilityRole="alert">
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 6, paddingHorizontal: 12 },
  offline: { backgroundColor: colors.danger },
  connecting: { backgroundColor: colors.warning },
  text: { color: 'white', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
