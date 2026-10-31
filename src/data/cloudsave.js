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
  if (!CloudStore) return false;
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
    await CloudStore.kvSetItem(CLOUD_KEY, payload);
    if (CloudStore.kvSync) await CloudStore.kvSync();
    lastPushedSignature = signature;
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
