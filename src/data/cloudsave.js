import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// iCloud key-value save/load. Uses the device's Apple ID silently -
// no sign-in, no data leaves the user's private iCloud, and the KV
// store does not count against their iCloud storage quota (1 MB cap).
// Falls back to local-only silently when unavailable (Android, Expo Go,
// simulator without iCloud).

export const GAME_KEYS = [
  'tapGameMoney',
  'tapGameMarket',
  'tapGameHoldings',
  'tapGameBusinesses',
  'tapGameBusinessBoost',
  'tapGameLastUpdate',
  'tapGameCurrentJob',
  'tapGameJobTapsLeft',
  'tapGameAppliedJobs',
  'tapGameProgression',
  'tapGameREPending',
  'tapGameStore',
  'tapGameSchemaVersion',
];

// Device-local preferences and lifetime stats are intentionally not synced.

let lastPushedSignature = null;

const CLOUD_KEY = 'voidbusiness_save_v1';
const CLOUD_SCHEMA_VERSION = 1;

// iCloud key-value storage allows 1 MB per app (and per value). Stay under
// it with headroom for the key and Apple's own bookkeeping; a larger save
// stays local-only instead of failing in the native layer.
export const CLOUD_MAX_BYTES = 1000 * 1000;

// 'ok' | 'too_large' | 'unavailable' - last push result, for diagnostics/UI.
let lastCloudStatus = null;
export function getCloudSaveStatus() {
  return lastCloudStatus;
}

// UTF-8 byte length without TextEncoder (not guaranteed on every runtime).
export function utf8ByteLength(str) {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) { bytes += 4; i++; } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

let CloudStore = null;
if (Platform.OS === 'ios') {
  try {
    // Native module - unavailable in Expo Go; guard so the app still runs there.
    CloudStore = require('react-native-cloud-store');
    if (!CloudStore.kvSetItem) CloudStore = null;
  } catch (e) {
    CloudStore = null;
  }
}

export function isCloudAvailable() {
  return !!CloudStore;
}

// Read the cloud blob, or null if none/unavailable.
export async function loadFromCloud() {
  if (!CloudStore) return null;
  try {
    if (CloudStore.kvSync) await CloudStore.kvSync();
    const raw = await CloudStore.kvGetItem(CLOUD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !parsed.savedAt) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

// Bundle all game keys into one JSON blob and push it to iCloud.
// Only writes if local state is at least as new as the cloud state,
// preventing a stale device from overwriting a newer save from
// another device. On a tie (same timestamp) we still write to keep
// the cloud in sync with any local mutations that didn't bump
// tapGameLastUpdate (e.g. settings changes).
export async function saveToCloud() {
  if (!CloudStore) { lastCloudStatus = 'unavailable'; return false; }
  try {
    const entries = await AsyncStorage.multiGet(GAME_KEYS);
    const data = {};
    for (const [key, value] of entries) {
      if (value != null) data[key] = value;
    }
    if (Object.keys(data).length === 0) return false;

    // Never publish a future timestamp: it would win every merge forever.
    const localLastUpdate = Math.min(Date.now(), parseFloat(data.tapGameLastUpdate) || 0);
    data.tapGameLastUpdate = String(localLastUpdate);

    // Skip the round-trips entirely when nothing changed since the last push.
    const signature = `${localLastUpdate}|${data.tapGameMoney}|${(data.tapGameBusinesses || '').length}|${(data.tapGameProgression || '').length}|${(data.tapGameHoldings || '').length}`;
    if (signature === lastPushedSignature) return false;

    // Don't overwrite a newer cloud save with stale local state.
    const cloud = await loadFromCloud();
    if (cloud) {
      const cloudLastUpdate = parseFloat(cloud.data?.tapGameLastUpdate) || cloud.savedAt || 0;
      if (localLastUpdate < cloudLastUpdate) return false;
    }

    const payload = JSON.stringify({
      version: CLOUD_SCHEMA_VERSION,
      savedAt: Date.now(),
      data,
    });
    if (utf8ByteLength(CLOUD_KEY) + utf8ByteLength(payload) > CLOUD_MAX_BYTES) {
      // Too big for iCloud KV: keep playing on the local save and leave the
      // last good cloud copy untouched. Retried on the next push.
      lastCloudStatus = 'too_large';
      if (__DEV__) console.warn('[cloudsave] save exceeds the iCloud key-value limit; keeping it local');
      return false;
    }
    await CloudStore.kvSetItem(CLOUD_KEY, payload);
    lastCloudStatus = 'ok';
    if (CloudStore.kvSync) await CloudStore.kvSync();
    lastPushedSignature = signature;
    return true;
  } catch (e) {
    return false;
  }
}

// Reset Progress: delete the iCloud copy too, so a reinstall or another
// device doesn't restore the old save. Best effort - resolves false when
// iCloud is unavailable.
export async function clearCloudSave() {
  lastPushedSignature = null;
  if (!CloudStore) return false;
  try {
    if (CloudStore.kvRemoveItem) await CloudStore.kvRemoveItem(CLOUD_KEY);
    else await CloudStore.kvSetItem(CLOUD_KEY, '');
    if (CloudStore.kvSync) await CloudStore.kvSync();
    return true;
  } catch (e) {
    return false;
  }
}

// On startup: if the cloud save is newer than the local one, restore it
// into AsyncStorage before the app reads its saved state.
export async function restoreCloudIfNewer() {
  const cloud = await loadFromCloud();
  if (!cloud) return false;
  const localLastUpdate = parseFloat(await AsyncStorage.getItem('tapGameLastUpdate')) || 0;
  const cloudLastUpdate = Math.min(Date.now(), parseFloat(cloud.data?.tapGameLastUpdate) || cloud.savedAt);
  if (cloudLastUpdate <= localLastUpdate) return false;
  const data = { ...cloud.data };
  if (data.tapGameSchemaVersion == null && cloud.version != null) data.tapGameSchemaVersion = String(cloud.version);
  // Replace, don't merge: a local key the cloud never had would otherwise
  // leak into the restored generation (e.g. free pending closings).
  const stale = GAME_KEYS.filter((k) => !(k in data) && k !== 'tapGameStore');
  if (stale.length) await AsyncStorage.multiRemove(stale);
  await AsyncStorage.multiSet(Object.entries(data).filter(([, v]) => typeof v === 'string'));
  return true;
}
