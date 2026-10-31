// Web build: AdMob native module does not exist in browsers.
// Metro resolves `import './ads'` to this file on web (same export surface as
// ads.js). Rewarded ads are simply unavailable - VIP members still skip.
import { isVip } from './store';
import { t } from './i18n';

export function initAds() {}

export function isRewardedAdReady() {
  return false;
}

export function showRewardedAd(onReward) {
  if (isVip()) {
    if (onReward) onReward();
    return;
  }
  const msg = t('alert_no_ad_available');
  if (typeof window !== 'undefined' && window.alert) window.alert(msg);
}
