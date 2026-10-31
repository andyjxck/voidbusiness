// Launch-order safety for StoreKit transactions: grants must wait until the
// saved game has loaded, or the save load overwrites them.

const mockStorage = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k) => (k in mockStorage ? mockStorage[k] : null)),
  setItem: jest.fn(async (k, v) => { mockStorage[k] = v; }),
  removeItem: jest.fn(async (k) => { delete mockStorage[k]; }),
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

function freshStore() {
  let store;
  jest.isolateModules(() => { store = require('../src/data/store'); });
  return store;
}

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockIap.available = [];
  mockIap.listener = null;
  jest.clearAllMocks();
});

describe('store launch gating', () => {
  it('holds cash-pack transactions until the game is ready, then grants once', async () => {
    const store = freshStore();
    const grants = [];
    store.setGrantHandler((g) => grants.push(g));
    await store.initStore();

    mockIap.listener({ productId: store.PRODUCTS.CASH_1, transactionId: 'tx1', purchaseState: 'purchased' });
    await flush();
    expect(grants).toHaveLength(0);
    expect(mockIap.finishTransaction).not.toHaveBeenCalled();

    store.setGameReady(true);
    await flush();
    await flush();
    expect(grants).toEqual([{ kind: 'cash', amount: expect.any(Number), productId: store.PRODUCTS.CASH_1 }]);
    expect(mockIap.finishTransaction).toHaveBeenCalledTimes(1);

    // A redelivery of the same transaction is finished without a second grant.
    mockIap.listener({ productId: store.PRODUCTS.CASH_1, transactionId: 'tx1', purchaseState: 'purchased' });
    await flush();
    await flush();
    expect(grants).toHaveLength(1);
  });

  it('marks a restored Founders bundle as needing its dealership on a fresh install', async () => {
    mockIap.available = [{ productId: 'com.andysocial.voidbusiness.founders', purchaseState: 'restored' }];
    const store = freshStore();
    await store.loadEntitlements();
    expect(store.hasFounders()).toBe(false);
    await store.initStore();
    expect(store.hasFounders()).toBe(true);
    expect(store.needsFoundersDealership()).toBe(true);
    store.markFoundersDealershipIssued();
    expect(store.needsFoundersDealership()).toBe(false);
  });

  it('reports product status for the shop', async () => {
    const store = freshStore();
    expect(store.getProductsStatus()).toBe('idle');
    await store.initStore();
    expect(store.getProductsStatus()).toBe('ready');
    expect(store.getProduct(store.PRODUCTS.VIP_MONTHLY)).toBeTruthy();

    mockIap.fetchProducts.mockImplementation(async () => []);
    await store.reloadProducts();
    expect(store.getProductsStatus()).toBe('error');
  });

  it('no longer exposes developer grant hooks', () => {
    const store = freshStore();
    expect(store.devGrant).toBeUndefined();
    expect(store.devClearEntitlements).toBeUndefined();
  });
});
