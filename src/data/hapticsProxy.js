// Drop-in replacement for expo-haptics that respects the Haptics setting.
import * as ExpoHaptics from 'expo-haptics';
import { getSettings } from './settings';

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export function impactAsync(...args) {
  if (!getSettings().haptics) return Promise.resolve();
  return ExpoHaptics.impactAsync(...args);
}

export function notificationAsync(...args) {
  if (!getSettings().haptics) return Promise.resolve();
  return ExpoHaptics.notificationAsync(...args);
}

export function selectionAsync(...args) {
  if (!getSettings().haptics) return Promise.resolve();
  return ExpoHaptics.selectionAsync(...args);
}
