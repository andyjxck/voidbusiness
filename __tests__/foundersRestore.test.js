// Founders Bundle restored on a fresh install: the dealership is granted once
// the save loads, whichever finishes first, and never doubled.

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
    mods.founders = require('../src/data/foundersGrant');
  });
  return mods;
}

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockIap.available = [];
  mockIap.listener = null;
  jest.clearAllMocks();
});

describe('Founders restore on a fresh install', () => {
  const FOUNDERS = 'com.andysocial.voidbusiness.founders';

  it('grants the dealership once the save loads when the restore finished first', async () => {
    mockIap.available = [{ productId: FOUNDERS, purchaseState: 'restored' }];
    const { store, founders } = fresh();
    await store.loadEntitlements();
    await store.initStore(); // reconcile restores the entitlement during launch
    expect(store.hasFounders()).toBe(true);

    // Save load on a fresh install: no businesses yet.
    const res = founders.issueFoundersDealership([]);
    expect(res.issued).toBe(true);
    expect(res.businesses).toHaveLength(1);
    expect(res.businesses[0]).toMatchObject({ type: 'dealership', foundersDealership: true });
    expect(store.needsFoundersDealership()).toBe(false);

    // A second check (e.g. the next store notification) never doubles it.
    const again = founders.issueFoundersDealership(res.businesses);
    expect(again.issued).toBe(false);
    expect(again.businesses).toHaveLength(1);
  });

  it('grants the dealership when the restore lands after the save loaded', async () => {
    const { store, founders } = fresh();
    await store.loadEntitlements();
    await store.initStore();
    store.setGameReady(true);
    expect(founders.issueFoundersDealership([]).issued).toBe(false);

    // Restore Purchases later in the session.
    let notified = 0;
    store.subscribeStore(() => { notified += 1; });
    mockIap.available = [{ productId: FOUNDERS, purchaseState: 'restored' }];
    await store.reconcilePurchases();
    expect(notified).toBeGreaterThan(0);
    const res = founders.issueFoundersDealership([{ type: 'cafe', id: 'c1' }]);
    expect(res.issued).toBe(true);
    expect(res.businesses.filter((b) => b.foundersDealership)).toHaveLength(1);
  });

  it('does not add a second dealership when the iCloud save already has it', async () => {
    mockIap.available = [{ productId: FOUNDERS, purchaseState: 'restored' }];
    const { store, founders } = fresh();
    await store.loadEntitlements();
    await store.initStore();
    const existing = [{ type: 'dealership', foundersDealership: true }];
    const res = founders.issueFoundersDealership(existing);
    expect(res.issued).toBe(false);
    expect(res.businesses).toBe(existing);
    expect(store.needsFoundersDealership()).toBe(false);
  });

  it('re-arms the grant after Reset Progress', async () => {
    mockIap.available = [{ productId: FOUNDERS, purchaseState: 'restored' }];
    const { store, founders } = fresh();
    await store.loadEntitlements();
    await store.initStore();
    founders.issueFoundersDealership([]);
    store.resetFoundersDealershipGrant();
    expect(store.needsFoundersDealership()).toBe(true);
    expect(founders.issueFoundersDealership([]).issued).toBe(true);
  });
});
