// Cross-platform alert. Alert.alert is a no-op on react-native-web, so
// confirmations (sell business, reset progress, purchase errors) silently
// did nothing in the browser. On web, fall back to window.confirm/alert.
import { Alert as RNAlert, Platform } from 'react-native';

export function showAlert(title, message, buttons) {
  if (Platform.OS !== 'web') return RNAlert.alert(title, message, buttons);
  const text = message ? `${title}\n\n${message}` : title;
  const btns = Array.isArray(buttons) ? buttons.filter(Boolean) : [];
  if (btns.length <= 1) {
    if (typeof window !== 'undefined' && window.alert) window.alert(text);
    if (btns[0] && btns[0].onPress) btns[0].onPress();
    return undefined;
  }
  const ok = typeof window !== 'undefined' && window.confirm ? window.confirm(text) : true;
  const target = ok
    ? (btns.find((b) => b.style !== 'cancel') || btns[0])
    : (btns.find((b) => b.style === 'cancel'));
  if (target && target.onPress) target.onPress();
  return undefined;
}
