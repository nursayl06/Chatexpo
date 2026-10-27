import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { updateAvatar } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import { uploadImage } from '@/api/messages';
import { useAuth, useCurrentUser } from '@/auth/AuthContext';
import { useChatSocket } from '@/chat/ChatSocketProvider';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/components/theme';
import { API_URL } from '@/config';
import { choosePhotoSource, pickImage } from '@/utils/pickImage';

export default function ProfileScreen() {
  const me = useCurrentUser();
  const { logout, setUser } = useAuth();
  const { status, onlineUsers } = useChatSocket();
  const [saving, setSaving] = useState(false);

  const changeAvatar = async () => {
    const source = await choosePhotoSource();
    if (!source) return;
    const uri = await pickImage(source, { square: true });
    if (!uri) return;
    setSaving(true);
    try {
      const url = await uploadImage(uri);
      setUser(await updateAvatar(url));
    } catch (e) {
      Alert.alert('Could not update the photo', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'Unsent messages on this phone will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={changeAvatar} disabled={saving} accessibilityLabel="Change profile photo" style={styles.avatar}>
        <Avatar name={me.username} url={me.avatarUrl} size={96} />
        {saving ? <ActivityIndicator style={styles.saving} /> : <Text style={styles.change}>Change photo</Text>}
      </Pressable>
      <Text style={styles.name}>{me.username}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Online now ({onlineUsers.length})</Text>
        {status !== 'online' ? (
          <Text style={styles.muted}>Not connected</Text>
        ) : (
          onlineUsers.map((name) => (
            <View key={name} style={styles.onlineRow}>
              <View style={styles.dot} />
              <Text>{name === me.username ? `${name} (you)` : name}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Server</Text>
        <Text style={styles.muted}>{API_URL}</Text>
      </View>

      <Pressable onPress={confirmLogout} style={styles.logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'stretch', backgroundColor: colors.background, flexGrow: 1 },
  avatar: { alignItems: 'center' },
  change: { color: colors.primaryDark, marginTop: 8 },
  saving: { marginTop: 8 },
  name: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 8, marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTitle: { fontWeight: '700', marginBottom: 8 },
  muted: { color: colors.muted },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  logout: { marginTop: 12, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.danger, alignItems: 'center' },
  logoutText: { color: colors.danger, fontWeight: '600' },
});
