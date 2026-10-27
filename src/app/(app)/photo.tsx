import { useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

/** Full-screen photo, opened as a modal. Also reachable by deep link: chatexpo://photo?uri=... */
export default function PhotoScreen() {
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  return (
    <View style={styles.container}>
      {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : <Text style={styles.text}>No photo</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  text: { color: 'white' },
});
