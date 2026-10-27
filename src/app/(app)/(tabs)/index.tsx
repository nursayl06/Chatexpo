import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { useCurrentUser } from '@/auth/AuthContext';
import { useChatSocket } from '@/chat/ChatSocketProvider';
import { useOutbox } from '@/chat/outbox';
import { queueMessage, retryMessage } from '@/chat/sender';
import { useMessages } from '@/chat/useMessages';
import { Composer } from '@/components/Composer';
import { ConnectionBanner } from '@/components/ConnectionBanner';
import { MessageBubble, type ChatMessageView } from '@/components/MessageBubble';
import { colors } from '@/components/theme';
import { fileUrl } from '@/config';

export default function ChatScreen() {
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const { status, onlineUsers } = useChatSocket();
  const pending = useOutbox();
  const { messages, isPending, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages();

  // Unconfirmed messages (from the outbox) on top, then server history. The list is inverted: index 0 is at the bottom.
  const items = useMemo<ChatMessageView[]>(() => {
    const local: ChatMessageView[] = pending.map((p) => ({
      key: p.clientId,
      text: p.text,
      imageUri: p.localImageUri ?? fileUrl(p.imageUrl),
      authorName: me.username,
      authorAvatar: me.avatarUrl,
      createdAt: p.createdAt,
      status: p.status,
    }));
    const pendingIds = new Set(pending.map((p) => p.clientId));
    const remote: ChatMessageView[] = messages
      .filter((m) => !pendingIds.has(m.clientId))
      .map((m) => ({
        key: m.clientId,
        text: m.text,
        imageUri: fileUrl(m.imageUrl),
        authorName: m.author.username,
        authorAvatar: m.author.avatarUrl,
        createdAt: m.createdAt,
        status: 'sent',
      }));
    return [...local, ...remote];
  }, [pending, messages, me.username, me.avatarUrl]);

  const queuedCount = pending.filter((p) => p.status !== 'failed').length;

  const onPressImage = useCallback((uri: string) => {
    router.push({ pathname: '/photo', params: { uri } });
  }, []);

  const onRetry = useCallback((clientId: string) => retryMessage(queryClient, clientId), [queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessageView }) => (
      <MessageBubble message={item} isMine={item.authorName === me.username} onPressImage={onPressImage} onRetry={onRetry} />
    ),
    [me.username, onPressImage, onRetry],
  );

  const onSend = useCallback(
    (input: { text: string; localImageUri: string | null }) => void queueMessage(queryClient, input),
    [queryClient],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: 'General chat',
          headerTitle: () => (
            <View>
              <Text style={styles.headerTitle}>General chat</Text>
              <Text style={styles.headerSubtitle}>
                {status === 'online' ? `${onlineUsers.length} online` : status === 'offline' ? 'offline' : 'connecting…'}
              </Text>
            </View>
          ),
        }}
      />
      <ConnectionBanner status={status} queuedCount={queuedCount} />
      {isPending && items.length === 0 ? (
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      ) : isError && items.length === 0 ? (
        <Text style={styles.empty}>{errorMessage(error)}</Text>
      ) : (
        <FlatList
          inverted
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.loader} /> : undefined}
          ListEmptyComponent={<Text style={[styles.empty, styles.flipped]}>No messages yet. Say hi!</Text>}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <Composer onSend={onSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { paddingVertical: 8, flexGrow: 1 },
  loader: { marginVertical: 12 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, paddingHorizontal: 24 },
  // the list is inverted, so its empty placeholder is flipped back
  flipped: { transform: [{ scaleY: -1 }] },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.muted },
});
