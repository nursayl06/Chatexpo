import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { errorMessage } from '@/api/errors';
import { CredentialsSchema, type Credentials } from '@/api/schemas';
import { colors } from './theme';

type Props = {
  title: string;
  submitLabel: string;
  onSubmit: (credentials: Credentials) => Promise<void>;
  switchText: string;
  switchHref: Href;
};

/** Shared login / register form: Zod validation on the phone, server error shown under the button. */
export function AuthForm({ title, submitLabel, onSubmit, switchText, switchHref }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const parsed = CredentialsSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(parsed.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={require('../../assets/login-bg.png')} resizeMode="repeat" style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.content}>
          <Image source={require('../../assets/chat-expo-app-icon.png')} style={styles.logo} />
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            textContentType="username"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            textContentType="password"
            onSubmitEditing={submit}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
          </Pressable>
          <Link href={switchHref} replace style={styles.switch}>
            {switchText}
          </Link>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 110, height: 110, alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 8, marginBottom: 32, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  error: { color: colors.danger, marginBottom: 12, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: 15, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 17 },
  switch: { marginTop: 20, textAlign: 'center', color: colors.primaryDark, fontSize: 15 },
});
