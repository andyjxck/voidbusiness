// Permanent Legacy unlock: save migration and the Legacy Key pack.

const mockStorage = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k) => (k in mockStorage ? mockStorage[k] : null)),
  setItem: jest.fn(async (k, v) => { mockStorage[k] = v; }),
  removeItem: jest.fn(async (k) => { delete mockStorage[k]; }),
  multiGet: jest.fn(async (keys) => keys.map((k) => [k, k in mockStorage ? mockStorage[k] : null])),
  multiSet: jest.fn(async (pairs) => { pairs.forEach(([k, v]) => { mockStorage[k] = v; }); }),
  multiRemove: jest.fn(async (keys) => { keys.forEach((k) => { delete mockStorage[k]; }); }),
}));

const mockIap = {
  listener: null,
  available: [],
  initConnection: jest.fn(async () => true),
  endConnection: jest.fn(async () => true),
  purchaseUpdatedListener: jest.fn((cb) => { mockIap.listener = cb; return { remove: jest.fn() }; }),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  fetchProducts: jest.fn(async ({ skus }) => skus.map((id) => ({ id, displayPrice: '$1.99', price: 1.99 }))),
  getActiveSubscriptions: jest.fn(async () => []),
  getAvailablePurchases: jest.fn(async () => mockIap.available),
  finishTransaction: jest.fn(async () => true),
};
jest.mock('expo-iap', () => mockIap);

const flush = () => new Promise((r) => setTimeout(r, 0));

// Fresh copies of the store and the modules that share its state.
function fresh() {
  const mods = {};
  jest.isolateModules(() => {
    mods.store = require('../src/data/store');
    mods.migrations = require('../src/data/migrations');
  });
  return mods;
}

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockIap.available = [];
  mockIap.listener = null;
  jest.clearAllMocks();
});

describe('hasReachedLegacy', () => {
  const { hasReachedLegacy, LEGACY_UNLOCK_AT } = require('../src/data/legacyUnlock');

  it('is reached by balance, an owned Legacy item, or the Legacy Key skin', () => {
    expect(hasReachedLegacy({ money: LEGACY_UNLOCK_AT })).toBe(true);
    expect(hasReachedLegacy({ money: LEGACY_UNLOCK_AT - 1 })).toBe(false);
    expect(hasReachedLegacy({ money: 0, progression: { ownedItems: [{ categoryId: 'estates', itemId: 'x' }] } })).toBe(true);
    expect(hasReachedLegacy({ money: 0, store: { unlockedSkins: ['cash3'] } })).toBe(true);
    expect(hasReachedLegacy({ money: NaN, progression: null, store: null })).toBe(false);
    expect(hasReachedLegacy()).toBe(false);
  });
});

describe('Legacy unlock save migration (v1 -> v2)', () => {
  it('unlocks Legacy for a v1 save that already reached it, keeping other store fields', async () => {
    mockStorage.tapGameSchemaVersion = '1';
    mockStorage.tapGameMoney = '1000';
    mockStorage.tapGameProgression = JSON.stringify({ ownedItems: [{ categoryId: 'watches', itemId: 'w1' }] });
    mockStorage.tapGameStore = JSON.stringify({ income2x: true, unlockedSkins: [] });
    const { migrations } = fresh();
    await expect(migrations.runMigrations()).resolves.toBe(2);
    const store = JSON.parse(mockStorage.tapGameStore);
    expect(store.legacyUnlocked).toBe(true);
    expect(store.income2x).toBe(true);
    expect(mockStorage.tapGameSchemaVersion).toBe('2');
  });

  it('unlocks Legacy for a player who bought the Legacy Key pack and spent the cash', async () => {
    mockStorage.tapGameSchemaVersion = '1';
    mockStorage.tapGameMoney = '25';
    mockStorage.tapGameStore = JSON.stringify({ unlockedSkins: ['cash3'] });
    const { migrations } = fresh();
    await migrations.runMigrations();
    expect(JSON.parse(mockStorage.tapGameStore).legacyUnlocked).toBe(true);
  });

  it('leaves saves that never reached Legacy locked', async () => {
    mockStorage.tapGameSchemaVersion = '1';
    mockStorage.tapGameMoney = '12345';
    const { migrations } = fresh();
    await migrations.runMigrations();
    expect(mockStorage.tapGameStore).toBeUndefined();
    expect(mockStorage.tapGameSchemaVersion).toBe('2');
  });

  it('stamps a fresh install with the current version without migrating', async () => {
    const { migrations } = fresh();
    await expect(migrations.runMigrations()).resolves.toBe(migrations.CURRENT_SCHEMA_VERSION);
    expect(mockStorage.tapGameStore).toBeUndefined();
  });

  it('loads the migrated flag into the store', async () => {
    mockStorage.tapGameStore = JSON.stringify({ legacyUnlocked: true });
    const { store } = fresh();
    await store.loadEntitlements();
    expect(store.isLegacyUnlocked()).toBe(true);
    expect(store.getStoreSnapshot().legacyUnlocked).toBe(true);
  });
});

describe('Legacy Key pack', () => {
  it('sets the permanent Legacy flag when bought', async () => {
    const { store } = fresh();
    const grants = [];
    store.setGrantHandler((g) => grants.push(g));
    await store.loadEntitlements();
    await store.initStore();
    store.setGameReady(true);
    expect(store.isLegacyUnlocked()).toBe(false);

    mockIap.listener({ productId: store.PRODUCTS.CASH_3, transactionId: 'tx-key', purchaseState: 'purchased' });
    await flush();
    await flush();
    expect(grants).toEqual([{ kind: 'cash', amount: 500000000, productId: store.PRODUCTS.CASH_3 }]);
    expect(store.isLegacyUnlocked()).toBe(true);
    expect(JSON.parse(mockStorage.tapGameStore).legacyUnlocked).toBe(true);
  });

  it('other cash packs do not unlock Legacy, and markLegacyUnlocked persists', async () => {
    const { store } = fresh();
    store.setGrantHandler(() => {});
    await store.loadEntitlements();
    await store.initStore();
    store.setGameReady(true);
    mockIap.listener({ productId: store.PRODUCTS.CASH_1, transactionId: 'tx-1', purchaseState: 'purchased' });
    await flush();
    await flush();
    expect(store.isLegacyUnlocked()).toBe(false);
    store.markLegacyUnlocked();
    await flush();
    expect(store.isLegacyUnlocked()).toBe(true);
    expect(JSON.parse(mockStorage.tapGameStore).legacyUnlocked).toBe(true);
  });
});
