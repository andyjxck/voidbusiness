import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasReachedLegacy } from './legacyUnlock';

// Save schema versioning. Each breaking change to a stored key's shape
// bumps CURRENT_SCHEMA_VERSION and adds a migration function below.
//
// Migrations run in order: v0->v1, v1->v2, ... up to CURRENT.
// A fresh install (no tapGameSchemaVersion key) is treated as
// version CURRENT - no migration needed since createInitial*()
// already produces the latest shapes.
//
// Existing pre-versioning saves (version 0/null) are migrated to v1,
// which is a no-op: the load code in App.js already tolerates missing
// keys and malformed JSON via try/catch and createInitial*() fallbacks.

export const CURRENT_SCHEMA_VERSION = 2;

const SCHEMA_VERSION_KEY = 'tapGameSchemaVersion';

// Ordered migration functions. Each takes the AsyncStorage instance
// (already populated with the old version's data) and mutates it in
// place to produce the next version's data. Returns true on success.
const MIGRATIONS = [
  // v0 -> v1: establish baseline. No data transformation needed -
  // the load code already handles missing/malformed keys gracefully.
  async function v0_to_v1() {
    return true;
  },
  // v1 -> v2: permanent Legacy unlock. Saves that already reached Legacy
  // (balance at the threshold, a Legacy item owned, or the Legacy Key pack
  // bought - its card skin is the record) get legacyUnlocked in the
  // entitlement store, so spending below the threshold no longer hides the tab.
  async function v1_to_v2() {
    const [[, rawMoney], [, rawProgression], [, rawStore]] = await AsyncStorage.multiGet([
      'tapGameMoney', 'tapGameProgression', 'tapGameStore',
    ]);
    const parse = (raw) => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };
    const store = parse(rawStore) || {};
    if (store.legacyUnlocked) return true;
    const reached = hasReachedLegacy({
      money: parseFloat(rawMoney),
      progression: parse(rawProgression),
      store,
    });
    if (reached) {
      await AsyncStorage.setItem('tapGameStore', JSON.stringify({ ...store, legacyUnlocked: true }));
    }
    return true;
  },
  // v2 -> v3: (add future migrations here)
];

export async function getSchemaVersion() {
  const raw = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
  if (raw == null) return 0;
  const v = parseInt(raw, 10);
  return isNaN(v) ? 0 : v;
}

export async function setSchemaVersion(version) {
  await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(version));
}

// Run any pending migrations. Returns the version the store was
// migrated to (equal to CURRENT_SCHEMA_VERSION on success).
export async function runMigrations() {
  let version = await getSchemaVersion();

  // Fresh install: no migrations needed, stamp current version.
  const hasAnyData = await AsyncStorage.getItem('tapGameMoney');
  if (version === 0 && hasAnyData == null) {
    await setSchemaVersion(CURRENT_SCHEMA_VERSION);
    return CURRENT_SCHEMA_VERSION;
  }

  // Run migrations in order from the stored version up to current.
  while (version < CURRENT_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      // Gap in migration chain - shouldn't happen, but bail safely.
      break;
    }
    try {
      await migrate();
    } catch (e) {
      // Migration failed: leave version unchanged so the next launch
      // retries. The load code's try/catch fallbacks prevent a crash.
      break;
    }
    version += 1;
    await setSchemaVersion(version);
  }

  return version;
}
