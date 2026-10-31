// Bottom-sheet modal styles adapted for desktop web: dialogs center in the
// viewport with a fixed max width instead of sliding up from the bottom.
// Apply as `style={[styles.sheet, webModalSheet()]}` alongside the overlay.
import { Platform } from 'react-native';

export function webModalOverlay() {
  if (Platform.OS !== 'web') return null;
  return { justifyContent: 'center', alignItems: 'center', padding: 24 };
}

export function webModalSheet() {
  if (Platform.OS !== 'web') return null;
  return {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    borderRadius: 20,
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  };
}
