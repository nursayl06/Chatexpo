import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { choosePhotoSource, pickImage } from '@/utils/pickImage';
import { colors } from './theme';

type Props = { onSend: (input: { text: string; localImageUri: string | null }) => void };

/** Text field + photo button + send button. A picked photo is previewed above the field until it is sent. */
export function Composer({ onSend }: Props) {
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const canSend = text.trim().length > 0 || imageUri !== null;

  const attach = async () => {
    const source = await choosePhotoSource();
    if (!source) return;
    const uri = await pickImage(source);
    if (uri) setImageUri(uri);
  };

  const send = () => {
    if (!canSend) return;
    onSend({ text, localImageUri: imageUri });
    setText('');
    setImageUri(null);
  };

  return (
    <View style={styles.container}>
      {imageUri && (
        <View style={styles.preview}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <Pressable onPress={() => setImageUri(null)} accessibilityLabel="Remove photo" hitSlop={8}>
            <Ionicons name="close-circle" size={24} color={colors.muted} />
          </Pressable>
        </View>
      )}
      <View style={styles.row}>
        <Pressable onPress={attach} accessibilityLabel="Attach photo" hitSlop={8} style={styles.iconButton}>
          <Ionicons name="camera-outline" size={26} color={colors.primary} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          multiline
          maxLength={2000}
          accessibilityLabel="Message text"
        />
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityLabel="Send"
          style={[styles.send, !canSend && styles.sendDisabled]}
        >
          <Ionicons name="send" size={18} color="white" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.background, padding: 8 },
  preview: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 8, marginLeft: 44 },
  previewImage: { width: 72, height: 72, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  iconButton: { padding: 6 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: 'white',
  },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
});
