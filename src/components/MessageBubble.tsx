import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from './Avatar';
import { colors } from './theme';

export type DeliveryStatus = 'sent' | 'sending' | 'queued' | 'failed';

export type ChatMessageView = {
  key: string;
  text: string | null;
  imageUri: string | undefined;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
  status: DeliveryStatus;
};

type Props = {
  message: ChatMessageView;
  isMine: boolean;
  onPressImage?: (uri: string) => void;
  onRetry?: (key: string) => void;
};

const STATUS_LABEL: Record<Exclude<DeliveryStatus, 'sent'>, string> = {
  sending: 'Sending…',
  queued: 'Waiting for connection',
  failed: 'Not sent · tap to retry',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** One chat bubble. memo: the list re-renders often (typing, new messages), old bubbles do not need to. */
export const MessageBubble = memo(function MessageBubble({ message, isMine, onPressImage, onRetry }: Props) {
  const failed = message.status === 'failed';
  return (
    <Animated.View entering={FadeInDown.duration(250)} style={[styles.row, isMine && styles.rowMine]}>
      {!isMine && <Avatar name={message.authorName} url={message.authorAvatar} size={30} />}
      <Pressable
        disabled={!failed}
        onPress={() => onRetry?.(message.key)}
        style={[styles.bubble, isMine ? styles.mine : styles.theirs, failed && styles.failed]}
        testID={`bubble-${message.key}`}
      >
        {!isMine && <Text style={styles.author}>{message.authorName}</Text>}
        {message.imageUri && (
          <Pressable onPress={() => onPressImage?.(message.imageUri!)} accessibilityRole="imagebutton" accessibilityLabel="Open photo">
            <Image source={{ uri: message.imageUri }} style={styles.image} resizeMode="cover" />
          </Pressable>
        )}
        {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
        <Text style={[styles.meta, failed && styles.metaFailed]}>
          {message.status === 'sent' ? formatTime(message.createdAt) : STATUS_LABEL[message.status]}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginHorizontal: 12, marginVertical: 4 },
  rowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { backgroundColor: colors.mine, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.theirs, borderBottomLeftRadius: 4 },
  failed: { borderWidth: 1, borderColor: colors.danger },
  author: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginBottom: 2 },
  text: { fontSize: 16, color: colors.text },
  image: { width: 220, height: 220, borderRadius: 10, marginBottom: 4, backgroundColor: colors.border },
  meta: { fontSize: 11, color: colors.muted, alignSelf: 'flex-end', marginTop: 2 },
  metaFailed: { color: colors.danger },
});
