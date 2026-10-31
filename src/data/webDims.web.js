// Web build: constrain the app to a readable content column.
// Screens size themselves with `Dimensions.get('window').width` - on a
// 1440px browser that would stretch mobile layouts across the whole window.
// Patching Dimensions.get so 'window'/'screen' report the content column
// width makes every existing screen lay out correctly with zero changes.
import { Dimensions } from 'react-native';

export const WEB_SIDEBAR_WIDTH = 260;
export const WEB_SIDEBAR_MIN_WIDTH = 900;
export const WEB_CONTENT_MAX_WIDTH = 760;

const origGet = Dimensions.get.bind(Dimensions);

export function realWindowWidth() {
  return origGet('window').width;
}

// Actual width of the gameplay area: full width on narrow windows, the
// centered column (window minus sidebar, capped) on wide ones.
export function contentColumnWidth() {
  const w = realWindowWidth();
  if (w < WEB_SIDEBAR_MIN_WIDTH) return w;
  return Math.min(w - WEB_SIDEBAR_WIDTH, WEB_CONTENT_MAX_WIDTH);
}

Dimensions.get = function patchedGet(dim) {
  const d = origGet(dim);
  if ((dim === 'window' || dim === 'screen') && d && typeof d.width === 'number') {
    return { ...d, width: contentColumnWidth() };
  }
  return d;
};
