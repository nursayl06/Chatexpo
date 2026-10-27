import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

export type ImageSource = 'camera' | 'library';

function explainDenied(what: string) {
  Alert.alert(`No access to the ${what}`, `Allow access to the ${what} in the phone settings to send photos.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open settings', onPress: () => void Linking.openSettings() },
  ]);
}

/**
 * Asks for permission only at the moment it is needed, opens the camera or gallery,
 * and shrinks the photo to max 1280 px JPEG so uploads stay small.
 * Returns a local file uri, or null if the user cancelled or refused access.
 */
export async function pickImage(source: ImageSource, options: { square?: boolean } = {}): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      if (!permission.canAskAgain) explainDenied('camera');
      return null;
    }
  } else if (Platform.OS === 'ios') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted && !permission.canAskAgain) {
      explainDenied('photo library');
      return null;
    }
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: options.square ?? false,
    aspect: options.square ? [1, 1] : undefined,
    quality: 0.9,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const maxSide = options.square ? 512 : 1280;
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > maxSide || asset.height > maxSide) {
    context.resize(asset.width >= asset.height ? { width: maxSide } : { height: maxSide });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

/** Small action sheet: camera or gallery. */
export function choosePhotoSource(): Promise<ImageSource | null> {
  if (Platform.OS === 'web') return Promise.resolve('library');
  return new Promise((resolve) => {
    Alert.alert('Send a photo', undefined, [
      { text: 'Take photo', onPress: () => resolve('camera') },
      { text: 'Choose from gallery', onPress: () => resolve('library') },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}
