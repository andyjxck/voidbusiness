import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'tapGameSettings';

const defaults = {
  haptics: true,
  reducedMotion: false,
  largerText: false,
  highContrast: false,
  language: 'en',
  newsTicker: true,
  tickerSpeed: 'fast', // 'slow', 'fast'
  theme: 'dark', // 'dark', 'light'
};

let settings = { ...defaults };

const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn({ ...settings }));
}

export function subscribeSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSettings() {
  return { ...settings };
}

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) settings = { ...defaults, ...JSON.parse(raw) };
  } catch (e) { /* best-effort */ }
  notify();
  return { ...settings };
}

export async function saveSettings(next) {
  settings = { ...settings, ...next };
  notify();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return { ...settings };
}

export function shouldUseHaptics() {
  return settings.haptics;
}

export function isReducedMotion() {
  return settings.reducedMotion;
}

export function isLargerText() {
  return settings.largerText;
}

export function isHighContrast() {
  return settings.highContrast;
}

export function isNewsTickerEnabled() {
  return settings.newsTicker !== false;
}

export function getTickerSpeed() {
  return settings.tickerSpeed || 'normal';
}

export function getTheme() {
  return settings.theme || 'dark';
}

export function isLightTheme() {
  return getTheme() === 'light';
}

// Theme color palettes
export const THEME_COLORS = {
  dark: {
    bg: '#0a0a0a',
    bgGradient: ['#000000', '#0a0a0a', '#000000'],
    surface: 'rgba(255,255,255,0.04)',
    surfaceBorder: 'rgba(255,255,255,0.06)',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#fbbf24',
  },
  light: {
    bg: '#f5f5f5',
    bgGradient: ['#ffffff', '#f0f0f5', '#ffffff'],
    surface: 'rgba(0,0,0,0.04)',
    surfaceBorder: 'rgba(0,0,0,0.08)',
    text: '#0a0a0a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    accent: '#d97706',
  },
};

export function getThemeColors() {
  return THEME_COLORS[getTheme()] || THEME_COLORS.dark;
}
