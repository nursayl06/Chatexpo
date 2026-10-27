import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { fileUrl } from '@/config';
import { colors } from './theme';

type Props = { name: string; url?: string | null; size?: number };

/** Photo if the user has one, otherwise the first letter of the name. */
export const Avatar = memo(function Avatar({ name, url, size = 32 }: Props) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  const uri = fileUrl(url);
  if (uri) return <Image source={{ uri }} style={[styles.base, style]} accessibilityLabel={`${name} avatar`} />;
  return (
    <View style={[styles.base, styles.placeholder, style]}>
      <Text style={[styles.letter, { fontSize: size * 0.45 }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  base: { backgroundColor: colors.border },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  letter: { color: 'white', fontWeight: '700' },
});
