// Animations are not what these tests check, so Reanimated is replaced by plain Views.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const animation = { duration: () => animation, delay: () => animation };
  return { __esModule: true, default: { View }, FadeInDown: animation };
});

// MMKV is a native module; in tests it is an in-memory Map with the same methods the app uses.
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const map = new Map();
    return {
      getString: (key) => map.get(key),
      set: (key, value) => map.set(key, value),
      remove: (key) => map.delete(key),
      clearAll: () => map.clear(),
    };
  },
}));
