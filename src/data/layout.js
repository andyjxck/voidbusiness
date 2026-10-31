// Content width for layout maths. On iPhone it's the window width. On iPad
// the app runs in a centered column capped at TABLET_MAX_CONTENT_WIDTH (see
// AppShell.js), so full-width cards don't stretch across a 13" screen; on
// web, webDims.web.js already patches Dimensions to the content column.
//
// Use the hook inside components - never read Dimensions at module level -
// so rotation, Split View and Stage Manager resizes re-render with the new
// width.
import { Dimensions, Platform, useWindowDimensions } from 'react-native';

export const TABLET_MAX_CONTENT_WIDTH = 640;

export const IS_TABLET = Platform.OS === 'ios' && !!Platform.isPad;

export function contentWidthFor(windowWidth) {
  if (Platform.OS === 'web') return Dimensions.get('window').width; // patched column width
  if (IS_TABLET) return Math.min(windowWidth, TABLET_MAX_CONTENT_WIDTH);
  return windowWidth;
}

export function useContentWidth() {
  const { width } = useWindowDimensions(); // subscribes to size changes
  return contentWidthFor(width);
}
