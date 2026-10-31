import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Product catalog ─────────────────────────────────────────────────────────
// These IDs must match App Store Connect exactly.
export const PRODUCTS = {
  VIP_MONTHLY: 'com.andysocial.voidbusiness.vip.monthly',
  VIP_YEARLY: 'com.andysocial.voidbusiness.vip.yearly',
  INCOME_15X: 'com.andysocial.voidbusiness.upgrade.income.15x',
  INCOME_2X: 'com.andysocial.voidbusiness.upgrade.income.2x',
  FOUNDERS: 'com.andysocial.voidbusiness.founders',
  CASH_1: 'com.andysocial.voidbusiness.pack.cash.1',
  CASH_2: 'com.andysocial.voidbusiness.pack.cash.2',
  CASH_3: 'com.andysocial.voidbusiness.pack.cash.3',
  CASH_4: 'com.andysocial.voidbusiness.pack.cash.4',
};

export const SUB_IDS = [PRODUCTS.VIP_MONTHLY, PRODUCTS.VIP_YEARLY];
export const NONCONSUMABLE_IDS = [PRODUCTS.INCOME_15X, PRODUCTS.INCOME_2X, PRODUCTS.FOUNDERS];
export const CONSUMABLE_IDS = [PRODUCTS.CASH_1, PRODUCTS.CASH_2, PRODUCTS.CASH_3, PRODUCTS.CASH_4];

// Cash pack grant amounts (in-game dollars)
export const CASH_PACK_GRANTS = {
  [PRODUCTS.CASH_1]: 25000000,
  [PRODUCTS.CASH_2]: 100000000,
  [PRODUCTS.CASH_3]: 500000000,
  [PRODUCTS.CASH_4]: 2500000000,
};

export const FOUNDERS_CASH_GRANT = 100000000;

// ─── Home-card skins ─────────────────────────────────────────────────────────
// Every purchase unlocks a themed skin for the TAPPAY balance card. 'default'
// is always available; 'vip' only while the subscription is active.
export const CARD_SKINS = {
  default:   { name: 'TAPPAY',      colors: ['#1e1b4b', '#312e81', '#1e3a5f', '#0c4a6e'] },
  vip:       { name: 'VIP Gold',    colors: ['#713f12', '#a16207', '#ca8a04', '#854d0e'] },
  income15x: { name: 'Emerald',     colors: ['#022c22', '#064e3b', '#047857', '#022c22'] },
  income2x:  { name: 'Ultraviolet', colors: ['#2e1065', '#4c1d95', '#7c3aed', '#2e1065'] },
  founders:  { name: 'Ember',       colors: ['#431407', '#7c2d12', '#c2410c', '#431407'] },
  cash1:     { name: 'Slate',       colors: ['#0f172a', '#1e293b', '#334155', '#0f172a'] },
  cash2:     { name: 'Glacier',     colors: ['#083344', '#164e63', '#0e7490', '#083344'] },
  cash3:     { name: 'Royal',       colors: ['#3b0764', '#581c87', '#7e22ce', '#3b0764'] },
  cash4:     { name: 'Crimson',     colors: ['#450a0a', '#7f1d1d', '#b91c1c', '#450a0a'] },
};

const SKIN_BY_PRODUCT = {
  [PRODUCTS.VIP_MONTHLY]: 'vip',
  [PRODUCTS.VIP_YEARLY]: 'vip',
  [PRODUCTS.INCOME_15X]: 'income15x',
  [PRODUCTS.INCOME_2X]: 'income2x',
  [PRODUCTS.FOUNDERS]: 'founders',
  [PRODUCTS.CASH_1]: 'cash1',
  [PRODUCTS.CASH_2]: 'cash2',
  [PRODUCTS.CASH_3]: 'cash3',
  [PRODUCTS.CASH_4]: 'cash4',
};

const STORE_KEY = 'tapGameStore';
const VIP_SUSPENSION_HOURS = 240; // 10 days
const NORMAL_SUSPENSION_HOURS = 120; // 5 days

// __DEV__ isn't defined under Jest - guard every debug path.
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// ─── Native module (absent in Expo Go) ───────────────────────────────────────
let iap = null;
try {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    iap = require('expo-iap');
    if (!iap.initConnection) iap = null;
  }
} catch (e) {
  if (IS_DEV) console.warn('[store] expo-iap unavailable:', e && e.message);
  iap = null;
}

// ─── State ───────────────────────────────────────────────────────────────────
// Persisted entitlement flags. Non-consumables + VIP are also reconciled against
// StoreKit on every launch; this store is the offline/local source of truth and
// syncs through iCloud via GAME_KEYS like every other save key.
const DEFAULT_STATE = {
  vipMonthly: false,
  vipYearly: false,
  income15x: false,
  income2x: false,
  founders: false,
  accountant: false,
  foundersDealershipIssued: false,
  processedTxIds: [],
  unlockedSkins: [],
  equippedSkin: 'default',
};

let state = { ...DEFAULT_STATE };
let productsById = {};
let connected = false;
let initialized = false;
const listeners = new Set();
let grantHandler = null; // (grant) => void, registered by App.js
let txSub = null;
let errSub = null;

function notify() {
  listeners.forEach((fn) => {
    try { fn(getStoreSnapshot()); } catch (e) { /* ignore */ }
  });
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

export function subscribeStore(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getStoreSnapshot() {
  return {
    ...state,
    connected,
    initialized,
    available: !!iap,
    products: productsById,
  };
}

export function getProduct(productId) {
  return productsById[productId] || null;
}

export function setGrantHandler(fn) {
  grantHandler = fn;
}

let errorHandler = null;
export function setErrorHandler(fn) {
  errorHandler = fn;
}

// ─── Entitlement getters (sync; consumed by economy code) ────────────────────
export function isVip() {
  return state.vipMonthly || state.vipYearly;
}

// All purchased income multipliers in one place. VIP + 1.5x = 2.25x;
// VIP + 2x = 3x; VIP + 1.5x + 2x = 4.5x.
export function getPurchaseIncomeMultiplier() {
  let mult = 1;
  if (state.income15x) mult *= 1.5;
  if (state.income2x) mult *= 2;
  if (isVip()) mult *= 1.5;
  return mult;
}

// VIP: all timers 50% faster. Wrap every `now + duration` write site.
export function scaleDuration(ms) {
  return isVip() ? ms * 0.5 : ms;
}

// VIP: tax accrues at half rate. Same business takes 10 days to owe what
// a normal player owes in 5.
export function getTaxRateScale() {
  return isVip() ? 0.5 : 1;
}

// VIP: suspension window doubles (120h -> 240h). Combined with the halved
// rate, debt still suspends the business, just with double the slack.
export function getSuspensionWindowHours() {
  return isVip() ? VIP_SUSPENSION_HOURS : NORMAL_SUSPENSION_HOURS;
}

export function hasAccountant() {
  return state.accountant;
}

// ─── Card skins ──────────────────────────────────────────────────────────────
function unlockSkinFor(productId) {
  const skin = SKIN_BY_PRODUCT[productId];
  if (!skin || state.unlockedSkins.includes(skin)) return;
  state = { ...state, unlockedSkins: [...state.unlockedSkins, skin] };
  persist();
}

export function getOwnedSkinIds() {
  const ids = ['default', ...state.unlockedSkins];
  if (isVip() && !ids.includes('vip')) ids.push('vip');
  return ids;
}

export function getEquippedSkin() {
  const owned = getOwnedSkinIds();
  const id = owned.includes(state.equippedSkin) ? state.equippedSkin : 'default';
  return { id, ...CARD_SKINS[id] };
}

export function equipSkin(skinId) {
  if (!getOwnedSkinIds().includes(skinId)) return;
  state = { ...state, equippedSkin: skinId };
  persist();
  notify();
}

export function hasFounders() {
  return state.founders;
}

// The dealership is issued exactly once, tracked in the entitlement store -
// not on the business object - so selling it can't re-trigger the grant.
export function needsFoundersDealership() {
  return state.founders && !state.foundersDealershipIssued;
}

export function markFoundersDealershipIssued() {
  if (state.foundersDealershipIssued) return;
  state = { ...state, foundersDealershipIssued: true };
  persist();
}

// Progress reset deletes the dealership with every other business, so the
// grant must be re-armed or a paying player loses part of the bundle.
export function resetFoundersDealershipGrant() {
  if (!state.foundersDealershipIssued) return;
  state = { ...state, foundersDealershipIssued: false };
  persist();
  notify();
}

// ─── Transaction processing ──────────────────────────────────────────────────
function isNonConsumablePurchaseActive(purchase) {
  const ps = purchase.purchaseState;
  return !ps || ps === 'purchased' || ps === 'restored';
}

function applyEntitlement(productId) {
  let changed = false;
  const next = { ...state };
  switch (productId) {
    case PRODUCTS.VIP_MONTHLY: next.vipMonthly = true; changed = true; break;
    case PRODUCTS.VIP_YEARLY: next.vipYearly = true; changed = true; break;
    case PRODUCTS.INCOME_15X: next.income15x = true; changed = true; break;
    case PRODUCTS.INCOME_2X: next.income2x = true; changed = true; break;
    case PRODUCTS.FOUNDERS:
      next.founders = true;
      next.accountant = true; // Personal Accountant ships inside Founders
      changed = true;
      break;
    default: break;
  }
  if (changed) unlockSkinFor(productId); // restore path re-unlocks skins too
  if (changed) {
    state = next;
    persist();
    notify();
  }
}

async function handleTransaction(purchase) {
  if (!purchase || !purchase.productId) return;
  const productId = purchase.productId;
  const txId = purchase.transactionId || purchase.id;
  const ps = purchase.purchaseState;

  if (ps === 'pending' || ps === 'deferred') return; // Ask-to-buy / pending
  if (ps === 'failed') {
    // Finish failed transactions so StoreKit stops redelivering them.
    await safeFinish(purchase, CONSUMABLE_IDS.includes(productId));
    return;
  }

  if (CONSUMABLE_IDS.includes(productId)) {
    // Grant exactly once per transaction id.
    if (txId && state.processedTxIds.includes(txId)) {
      await safeFinish(purchase, true);
      return;
    }
    // If the game layer isn't ready to receive grants, leave the transaction
    // unfinished - StoreKit will redeliver it once a handler is registered.
    if (!grantHandler) return;
    const amount = CASH_PACK_GRANTS[productId] || 0;
    grantHandler({ kind: 'cash', amount, productId });
    unlockSkinFor(productId);
    if (txId) {
      state = {
        ...state,
        processedTxIds: [...state.processedTxIds.slice(-200), txId],
      };
      persist();
    }
    await safeFinish(purchase, true);
    notify();
    return;
  }

  if (NONCONSUMABLE_IDS.includes(productId) && isNonConsumablePurchaseActive(purchase)) {
    // Founders cash is granted once per transaction; the entitlement itself
    // is idempotent. A restore of the same tx re-issues the dealership via
    // App.js (deduped by foundersDealershipIssued) but never doubles the cash.
    if (productId === PRODUCTS.FOUNDERS) {
      const seen = txId && state.processedTxIds.includes(txId);
      if (!seen) {
        // Leave the transaction unfinished until the game layer can grant cash.
        if (!grantHandler) return;
        grantHandler({ kind: 'founders', amount: FOUNDERS_CASH_GRANT, productId });
        state = { ...state, foundersDealershipIssued: true };
        if (txId) {
          state = { ...state, processedTxIds: [...state.processedTxIds.slice(-200), txId] };
        }
        persist();
      }
    }
    applyEntitlement(productId);
    await safeFinish(purchase, false);
    return;
  }

  if (SUB_IDS.includes(productId) && isNonConsumablePurchaseActive(purchase)) {
    applyEntitlement(productId);
    await safeFinish(purchase, false);
  }
}

async function safeFinish(purchase, isConsumable) {
  try {
    await iap.finishTransaction({ purchase, isConsumable });
  } catch (e) { /* ignore */ }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
export async function initStore() {
  // Load persisted entitlements first so perks apply offline immediately.
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  initialized = true;
  notify();

  if (!iap) {
    if (IS_DEV) console.warn('[store] purchases unavailable - native module missing (Expo Go or stale dev build)');
    return false;
  }
  try {
    await iap.initConnection();
    connected = true;
  } catch (e) {
    if (IS_DEV) console.warn('[store] initConnection failed:', e && e.message);
    connected = false;
    return false;
  }

  if (!txSub) {
    txSub = iap.purchaseUpdatedListener((purchase) => {
      handleTransaction(purchase).catch(() => {});
    });
  }
  if (!errSub && iap.purchaseErrorListener) {
    errSub = iap.purchaseErrorListener((err) => {
      if (err && err.code !== 'user-cancelled' && errorHandler) errorHandler(err);
    });
  }

  await Promise.all([refreshProducts(), reconcilePurchases()]).catch(() => {});
  return true;
}

export async function refreshProducts() {
  if (!iap || !connected) return;
  try {
    const inApp = await iap.fetchProducts({ skus: [...NONCONSUMABLE_IDS, ...CONSUMABLE_IDS], type: 'in-app' });
    const subs = await iap.fetchProducts({ skus: SUB_IDS, type: 'subs' });
    const map = {};
    [...(inApp || []), ...(subs || [])].forEach((p) => {
      if (p && p.id) map[p.id] = p;
    });
    productsById = map;
  } catch (e) { /* ignore */ }
  notify();
}

// Re-derive all entitlements from StoreKit: active subs + held non-consumables.
export async function reconcilePurchases() {
  if (!iap || !connected) return;
  try {
    const subs = await iap.getActiveSubscriptions();
    const vipMonthly = (subs || []).some((s) => s.productId === PRODUCTS.VIP_MONTHLY);
    const vipYearly = (subs || []).some((s) => s.productId === PRODUCTS.VIP_YEARLY);
    state = { ...state, vipMonthly, vipYearly };
  } catch (e) { /* ignore */ }
  try {
    const held = await iap.getAvailablePurchases();
    (held || []).forEach((p) => {
      if (NONCONSUMABLE_IDS.includes(p.productId) && isNonConsumablePurchaseActive(p)) {
        applyEntitlement(p.productId);
      }
      // Subs come only from getActiveSubscriptions - getAvailablePurchases can
      // surface stale 'purchased' records for lapsed subscriptions.
    });
  } catch (e) { /* ignore */ }
  persist();
  notify();
}

// ─── Purchase + restore ──────────────────────────────────────────────────────
export async function buy(productId) {
  // Lazy reconnect: a failed launch-time init shouldn't kill purchases for
  // the whole session.
  if (iap && !connected) await initStore();
  if (!iap || !connected) throw new Error('store_unavailable');
  const type = SUB_IDS.includes(productId) ? 'subs' : 'in-app';
  const request = {
    apple: { sku: productId },
    google: { skus: [productId] },
  };
  return iap.requestPurchase({ request, type });
}

export async function restore() {
  if (iap && !connected) await initStore();
  if (!iap || !connected) throw new Error('store_unavailable');
  try {
    await iap.restorePurchases();
  } catch (e) {
    // Older surfaces may not implement it; reconcile is the real restore.
  }
  await reconcilePurchases();
  return getStoreSnapshot();
}

export async function teardownStore() {
  try { if (txSub) txSub.remove(); } catch (e) { /* ignore */ }
  try { if (errSub) errSub.remove(); } catch (e) { /* ignore */ }
  txSub = null;
  errSub = null;
  if (iap && connected) {
    try { await iap.endConnection(); } catch (e) { /* ignore */ }
  }
  connected = false;
}

// ─── Dev hooks (simulator testing without App Store Connect products) ───────
// __DEV__-only: routes through the identical grant/entitlement path a real
// StoreKit transaction would take, so every perk can be exercised end to end.
export function devGrant(productId) {
  if (!__DEV__) return;
  const fakeTxId = `dev_${productId}_${Date.now()}`;
  handleTransaction({ productId, transactionId: fakeTxId, purchaseState: 'purchased' }).catch(() => {});
}

export function devClearEntitlements() {
  if (!__DEV__) return;
  state = { ...DEFAULT_STATE };
  persist();
  notify();
}
