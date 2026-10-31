// Global Text wrapper: applies the Larger Text and High Contrast
// accessibility settings to every piece of text in the app.

import React, { useSyncExternalStore } from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { getSettings, subscribeSettings } from '../data/settings';
import { subscribeLanguageForStore, getCurrentLanguageForStore } from '../data/i18n';

const TEXT_SCALE = 1.25;
const DEFAULT_FONT_SIZE = 14;

let snapshot = getSettings();
function subscribe(fn) {
  return subscribeSettings((next) => {
    snapshot = next;
    fn();
  });
}
function getSnapshot() {
  return snapshot;
}

export function useAppSettings() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// Theme colors for use in screen backgrounds and surfaces
export function useThemeColors() {
  const settings = useAppSettings();
  const isLight = settings.theme === 'light';
  return {
    isLight,
    bg: isLight ? '#f5f5f5' : '#0a0a0a',
    bgGradient: isLight ? ['#ffffff', '#f0f0f5', '#ffffff'] : ['#000000', '#0a0a0a', '#000000'],
    surface: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
    surfaceBorder: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
    text: isLight ? '#0a0a0a' : '#fff',
    textSecondary: isLight ? '#475569' : '#94a3b8',
    textMuted: isLight ? '#64748b' : '#64748b',
    accent: isLight ? '#d97706' : '#fbbf24',
    overlay: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.7)',
    modalBg: isLight ? '#f8f8fc' : '#111118',
  };
}

// Re-renders the calling component when the language changes.
export function useLanguage() {
  return useSyncExternalStore(subscribeLanguageForStore, getCurrentLanguageForStore);
}

// Muted greys and low-alpha whites are hard to read: in high-contrast
// mode we push them towards white while leaving accent colours alone.
function highContrastColor(color) {
  if (!color || typeof color !== 'string') return color;
  const rgbaMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    const alpha = a === undefined ? 1 : parseFloat(a);
    return `rgba(${r},${g},${b},${Math.max(alpha, 0.95)})`;
  }
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const r = parseInt(hexMatch[1].slice(0, 2), 16);
    const g = parseInt(hexMatch[1].slice(2, 4), 16);
    const b = parseInt(hexMatch[1].slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    // Greyish and dim on a dark background -> lift to near-white.
    if (chroma < 40 && brightness < 200) return '#f8fafc';
  }
  return color;
}

// In light theme, invert text colors: white -> dark, light greys -> darker
function lightThemeColor(color) {
  if (!color || typeof color !== 'string') return color;
  // Pure white -> dark
  if (color === '#fff' || color === '#ffffff' || color === '#FFF') return '#0a0a0a';
  // Near-white greys
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const r = parseInt(hexMatch[1].slice(0, 2), 16);
    const g = parseInt(hexMatch[1].slice(2, 4), 16);
    const b = parseInt(hexMatch[1].slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    // Light greys -> dark grey
    if (brightness > 200) return '#1e293b';
    // Medium greys (like #94a3b8) -> darker but still readable
    if (brightness > 100 && brightness <= 200) return '#475569';
  }
  // rgba with high brightness -> dark
  const rgbaMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness > 200) return '#1e293b';
  }
  return color;
}

// Bundled emoji font name (loaded in App.js). Applied automatically to any
// text that contains emoji, since the iOS 26 sim runtime renders system
// emoji as '?'. Latin glyphs fall back to the system font automatically.
const EMOJI_FONT = 'NotoColorEmoji';
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}]|\u{FE0F}/u;
function containsEmoji(node) {
  if (typeof node === 'string') return EMOJI_RE.test(node);
  if (Array.isArray(node)) return node.some(containsEmoji);
  if (node && typeof node === 'object' && node.props) return containsEmoji(node.props.children);
  return false;
}

export default function Text({ style, children, ...props }) {
  const settings = useAppSettings();
  const isLight = settings.theme === 'light';
  const flat = StyleSheet.flatten(style) || {};
  const overrides = {};
  if (settings.largerText) {
    overrides.fontSize = (flat.fontSize || DEFAULT_FONT_SIZE) * TEXT_SCALE;
    if (flat.lineHeight) overrides.lineHeight = flat.lineHeight * TEXT_SCALE;
  }
  if (isLight && !settings.highContrast) {
    overrides.color = lightThemeColor(flat.color || '#fff');
  }
  if (settings.highContrast) {
    overrides.color = highContrastColor(flat.color || '#000');
  }
  if (!flat.fontFamily && containsEmoji(children)) {
    overrides.fontFamily = EMOJI_FONT;
  }
  const finalStyle = Object.keys(overrides).length ? [style, overrides] : style;
  return <RNText allowFontScaling {...props} style={finalStyle}>{children}</RNText>;
}
