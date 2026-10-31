// Native stub - the real implementation is webDims.web.js, which patches
// Dimensions.get so screens measure the centered content column instead of
// the full browser window. Imported first from index.js so module-scope
// `Dimensions.get('window').width` reads the patched value.
import { Dimensions } from 'react-native';

export const WEB_SIDEBAR_MIN_WIDTH = 900;

export function realWindowWidth() {
  return Dimensions.get('window').width;
}
