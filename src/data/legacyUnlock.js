// The Legacy tab unlocks once, for good: the first time the balance reaches
// LEGACY_UNLOCK_AT, a Legacy item is owned, or the Legacy Key pack is bought.
// Spending back below the threshold no longer hides the tab. The flag lives
// in the entitlement store (tapGameStore), so it syncs through iCloud and
// survives Reset Progress like a purchase.

export const LEGACY_UNLOCK_AT = 500_000_000;
export const LEGACY_KEY_SKIN = 'cash3'; // card skin granted by the Legacy Key pack

function ownedLegacyItems(progression) {
  const items = progression && progression.ownedItems;
  return Array.isArray(items) ? items.length : 0;
}

// True when a save has reached Legacy by any route.
export function hasReachedLegacy({ money, progression, store } = {}) {
  if (Number.isFinite(money) && money >= LEGACY_UNLOCK_AT) return true;
  if (ownedLegacyItems(progression) > 0) return true;
  const skins = store && Array.isArray(store.unlockedSkins) ? store.unlockedSkins : [];
  return skins.includes(LEGACY_KEY_SKIN);
}
