// Real AdMob rewarded ads only.
// If a real ad cannot be shown, the action does not happen.
// No placeholders, no timers, no simulated ad overlays.

import { Alert, Platform } from 'react-native';
import { t } from './i18n';
import { isVip } from './store';
import { recordAdWatched } from './stats';

// __DEV__ isn't defined under Jest - guard every debug path.
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// AdMob ad units are per-platform. Create an Android app + rewarded unit in
// the AdMob console and paste the Android ID below.
const REWARDED_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-1505977777207758/4592802921',
  android: 'ca-app-pub-1505977777207758/8228209847',
});

let mobileAds = null;
let RewardedAdClass = null;
let RewardedAdEventType = null;
let AdEventType = null;
let TestIds = null;

try {
  const ads = require('react-native-google-mobile-ads');
  mobileAds = ads.default;
  // The AdMob unit is a "rewarded interstitial" on Android and a plain
  // rewarded unit on iOS - the two formats need different ad classes.
  RewardedAdClass = Platform.OS === 'android' ? ads.RewardedInterstitialAd : ads.RewardedAd;
  RewardedAdEventType = ads.RewardedAdEventType;
  AdEventType = ads.AdEventType;
  TestIds = ads.TestIds;
} catch (e) {
  // Native module not present (Expo Go / stale dev build / web).
  if (IS_DEV) console.warn('[ads] react-native-google-mobile-ads unavailable:', e && e.message);
}

const TEST_ID = TestIds
  ? (Platform.OS === 'android' ? TestIds.REWARDED_INTERSTITIAL : TestIds.REWARDED)
  : null;
const AD_UNIT_ID = IS_DEV && TEST_ID ? TEST_ID : REWARDED_AD_UNIT_ID;

let initialized = false;
let currentAd = null;
let adLoaded = false;
let pending = null;
let showing = false;

// "Waiting for an ad" state for the loading overlay (AdLoadingOverlay.js).
const waitListeners = new Set();
function setPending(next) {
  const was = !!pending;
  pending = next;
  if (was !== !!pending) waitListeners.forEach((cb) => cb(!!pending));
}
export function isWaitingForAd() {
  return !!pending;
}
export function subscribeAdWaiting(cb) {
  waitListeners.add(cb);
  return () => waitListeners.delete(cb);
}
// The player gave up waiting: drop the queued request, no reward, no alert.
export function cancelPendingAd() {
  const p = pending;
  if (!p) return;
  if (p.timeout) clearTimeout(p.timeout);
  setPending(null);
}

export function initAds() {
  if (!mobileAds || initialized) return;
  initialized = true;
  mobileAds()
    .initialize()
    .then(() => {
      // VIPs get rewards without ads, so don't request one for them. The SDK
      // itself still starts at launch (as the privacy policy says).
      if (!isVip()) preloadRewardedAd();
    })
    .catch((e) => {
      if (IS_DEV) console.warn('[ads] mobileAds initialize failed:', e && e.message);
      initialized = false; // allow a later initAds() call to retry
    });
}

function notifyNoAd() {
  Alert.alert(t('alert_sorry'), t('alert_no_ad_available'));
}

function resolvePending() {
  if (pending) {
    const { onReward, timeout } = pending;
    setPending(null);
    if (timeout) clearTimeout(timeout);
    presentAd(onReward);
  }
}

function preloadRewardedAd() {
  if (!RewardedAdClass) return;
  adLoaded = false;
  const ad = RewardedAdClass.createForAdRequest(AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  currentAd = ad;
  const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    adLoaded = true;
    cleanup();
    if (pending) resolvePending();
  });
  // Without an ERROR handler a failed load leaves currentAd set but never
  // loaded - wedging ads for the whole session (showRewardedAd won't retry
  // while currentAd is non-null).
  const cleanup = () => { unsubLoaded(); unsubError(); };
  const unsubError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
    if (IS_DEV) console.warn('[ads] rewarded load failed:', err && err.message);
    cleanup();
    if (currentAd === ad) {
      currentAd = null;
      adLoaded = false;
    }
    // Fail any queued request now rather than letting it hit the 10s timeout.
    const p = pending;
    setPending(null);
    if (p && p.timeout) clearTimeout(p.timeout);
    if (p) notifyNoAd();
    // Back off before retrying so a no-fill response doesn't hammer AdMob.
    setTimeout(() => {
      if (!currentAd && initialized && !isVip()) preloadRewardedAd();
    }, 30000);
  });
  ad.load();
}

export function isRewardedAdReady() {
  return !!(currentAd && adLoaded);
}

// Shows a rewarded ad. Calls onReward when the user earns the reward.
// If no real ad can be shown, nothing happens.
// VIP members skip the video entirely and get the reward instantly.
export function showRewardedAd(onReward) {
  if (isVip()) {
    if (onReward) onReward();
    return;
  }
  if (showing) return;
  if (!isRewardedAdReady()) {
    if (mobileAds && !currentAd) preloadRewardedAd();
    if (pending) return;
    if (!mobileAds) {
      notifyNoAd();
      return;
    }
    const timeout = setTimeout(() => { setPending(null); notifyNoAd(); }, 10000);
    setPending({ onReward, timeout });
    return;
  }
  presentAd(onReward);
}

// If the SDK never reports CLOSED (killed overlay, SDK bug) `showing` would
// otherwise stay true and every later ad would silently no-op.
const SHOW_WATCHDOG_MS = 5 * 60 * 1000;

function presentAd(onReward) {
  showing = true;
  const ad = currentAd;
  let rewarded = false;
  let done = false;
  let unsubReward = () => {};
  let unsubClosed = () => {};
  let unsubError = () => {};
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(watchdog);
    unsubReward();
    unsubClosed();
    unsubError();
    showing = false;
    if (!isVip()) preloadRewardedAd();
  };
  const watchdog = setTimeout(finish, SHOW_WATCHDOG_MS);
  unsubReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    if (rewarded) return;
    rewarded = true;
    recordAdWatched();
    // Grant at reward time so a kill/crash before CLOSED can't lose it.
    if (onReward) onReward();
  });
  unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, finish);
  unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
    finish();
    if (!rewarded) notifyNoAd();
  });
  try {
    ad.show();
  } catch (e) {
    finish();
    notifyNoAd();
  }
}
