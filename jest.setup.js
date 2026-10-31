// Jest setup: mock React Native modules that aren't available in Node.
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj) => obj.ios },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
}));
