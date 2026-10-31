// Bottom-sheet modal styles adapted for wide screens. On desktop web dialogs
// center in the viewport with a fixed max width instead of sliding up from
// the bottom; on iPad the sheet still rises from the bottom but is capped to
// the content column width and centered.
// Apply as `style={[styles.sheet, webModalSheet()]}` alongside the overlay.
import { Platform } from 'react-native';
import { IS_TABLET, TABLET_MAX_CONTENT_WIDTH } from '../data/layout';

export function webModalOverlay() {
  if (Platform.OS === 'web') return { justifyContent: 'center', alignItems: 'center', padding: 24 };
  if (IS_TABLET) return { alignItems: 'center' };
  return null;
}

export function webModalSheet() {
  if (Platform.OS === 'web') {
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
  if (IS_TABLET) return { width: '100%', maxWidth: TABLET_MAX_CONTENT_WIDTH };
  return null;
}
