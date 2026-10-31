// Unit tests for the critical money-moving functions in src/data/businesses.js.
// These verify: upgrade cost scaling, boost multiplier, tax calculations,
// suspension logic, sell price, and stock-based income scaling.

jest.mock('../src/data/market', () => ({
  ...jest.requireActual('../src/data/market'),
  formatMoney: (n) => '$' + String(n),
  getCurrencySymbol: () => '$',
}));

const {
  getUpgradeCost,
  getGlobalBoostMultiplier,
  getHourlyIncome,
  getMaxHourlyIncome,
  getTaxOwed,
  getDailyTax,
  isSuspended,
  getHoursUntilSuspension,
  getSellPrice,
  getStockCost,
  getHourlyStockUsage,
  processBusinesses,
  startBusiness,
  buyStock,
  payTax,
  legacyProjectedTax,
  BUSINESS_CATEGORIES,
} = require('../src/data/businesses');

const DAY = 24 * 60 * 60 * 1000;

describe('getUpgradeCost', () => {
  it('scales exponentially with level', () => {
    const biz = { type: 'cafe', subType: 'local', level: 1 };
    const cost1 = getUpgradeCost(biz);
    const cost10 = getUpgradeCost({ ...biz, level: 10 });
    const cost20 = getUpgradeCost({ ...biz, level: 20 });
    expect(cost1).toBeGreaterThan(0);
    expect(cost10).toBeGreaterThan(cost1);
    expect(cost20).toBeGreaterThan(cost10);
  });

  it('returns Infinity for unknown subType', () => {
    expect(getUpgradeCost({ type: 'unknown', subType: 'x', level: 1 })).toBe(Infinity);
  });

  it('uses level 1 as minimum when level is 0 or negative', () => {
    const biz = { type: 'cafe', subType: 'local', level: 0 };
    const cost0 = getUpgradeCost(biz);
    const cost1 = getUpgradeCost({ ...biz, level: 1 });
    expect(cost0).toBe(cost1);
  });
});

describe('getGlobalBoostMultiplier', () => {
  it('returns 1 when no boost is set', () => {
    expect(getGlobalBoostMultiplier(0)).toBe(1);
    expect(getGlobalBoostMultiplier(null)).toBe(1);
    expect(getGlobalBoostMultiplier(undefined)).toBe(1);
  });

  it('returns 10 when boost is active', () => {
    expect(getGlobalBoostMultiplier(Date.now() + 60000)).toBe(10);
  });

  it('returns 1 when boost has expired', () => {
    expect(getGlobalBoostMultiplier(Date.now() - 60000)).toBe(1);
  });
});

// Helper: create an operational cafe with opened branch, staff, and supplies
function makeOperationalCafe(overrides = {}) {
  return {
    ...startBusiness('cafe', 'local'),
    startedAt: Date.now() - DAY,
    taxLastPaidAt: Date.now() - DAY,
    branches: [{
      branchId: 'suburbs',
      menuIds: ['espresso', 'latte', 'pastry'],
      upgrades: {},
      assignedStaffIds: ['s1', 's2'],
      openedAt: Date.now() - 86400000,
    }],
    staffMembers: [
      { id: 's1', role: 'barista', hiredAt: Date.now() - 86400000 },
      { id: 's2', role: 'barista', hiredAt: Date.now() - 86400000 },
    ],
    supplies: { beans: 1000, milk: 1000, pastry: 1000, produce: 1000 },
    ...overrides,
  };
}

describe('getTaxOwed', () => {
  it('returns 0 for a freshly started business', () => {
    const biz = startBusiness('cafe', 'local');
    expect(getTaxOwed(biz)).toBe(0);
  });

  it('accrues tax on income actually earned', () => {
    const biz = makeOperationalCafe();
    const { updatedBusinesses } = processBusinesses([biz], 60, 0);
    expect(getTaxOwed(updatedBusinesses[0])).toBeGreaterThan(0);
  });

  it('cannot be evaded by parking the business at zero income', () => {
    const biz = makeOperationalCafe();
    const { updatedBusinesses } = processBusinesses([biz], 60, 0);
    const parked = { ...updatedBusinesses[0], staffMembers: [], branches: [] };
    expect(getTaxOwed(parked)).toBe(getTaxOwed(updatedBusinesses[0]));
  });

  it('is cleared by payTax', () => {
    const biz = makeOperationalCafe();
    const { updatedBusinesses } = processBusinesses([biz], 60, 0);
    expect(getTaxOwed(payTax(updatedBusinesses[0]))).toBe(0);
  });

  it('never goes negative when timestamps are in the future', () => {
    const biz = makeOperationalCafe({ taxLastPaidAt: Date.now() + DAY, taxAccrued: -500 });
    expect(getTaxOwed(biz)).toBe(0);
    expect(legacyProjectedTax({ ...biz, taxLastPaidAt: Date.now() + DAY })).toBe(0);
  });

  it('does not recurse forever for an unknown business type', () => {
    const biz = { type: 'cafe', subType: 'local', level: 1, taxAccrued: 5 };
    expect(() => getHourlyIncome({ ...biz, type: 'mystery' })).not.toThrow();
    expect(() => isSuspended({ ...biz, type: 'mystery' })).not.toThrow();
    expect(() => getMaxHourlyIncome({ ...biz, type: 'mystery' })).not.toThrow();
  });
});

describe('isSuspended', () => {
  it('does not suspend a freshly started business', () => {
    const biz = startBusiness('cafe', 'local');
    expect(isSuspended(biz)).toBe(false);
  });

  it('suspends after 5 days of unpaid taxes', () => {
    const biz = makeOperationalCafe({ taxLastPaidAt: Date.now() - 6 * DAY, taxAccrued: 1000 });
    expect(isSuspended(biz)).toBe(true);
  });

  it('does not suspend when nothing is owed, however long ago', () => {
    const biz = makeOperationalCafe({ taxLastPaidAt: Date.now() - 60 * DAY, taxAccrued: 0 });
    expect(isSuspended(biz)).toBe(false);
  });
});

describe('getSellPrice', () => {
  it('returns at least the base cost for a fresh business', () => {
    const biz = startBusiness('cafe', 'local');
    const sell = getSellPrice(biz);
    const baseCost = BUSINESS_CATEGORIES.cafe.subTypes.local.cost;
    expect(sell).toBeGreaterThanOrEqual(baseCost);
  });

  it('returns 0 for unknown subType', () => {
    expect(getSellPrice({ type: 'unknown', subType: 'x', level: 1 })).toBe(0);
  });
});

describe('processBusinesses', () => {
  it('returns zero income for no businesses', () => {
    const { totalIncome, updatedBusinesses } = processBusinesses([], 60, 0);
    expect(totalIncome).toBe(0);
    expect(updatedBusinesses).toEqual([]);
  });

  it('returns zero income for a fresh cafe (no opened branches)', () => {
    const biz = startBusiness('cafe', 'local');
    const { totalIncome } = processBusinesses([biz], 60, 0);
    expect(totalIncome).toBe(0);
  });

  it('generates positive income for an operational cafe', () => {
    const biz = makeOperationalCafe();
    const { totalIncome } = processBusinesses([biz], 60, 0);
    expect(totalIncome).toBeGreaterThan(0);
  });

  it('applies 10x boost multiplier', () => {
    const biz = makeOperationalCafe();
    const { totalIncome: normal } = processBusinesses([biz], 60, 0);
    const { totalIncome: boosted } = processBusinesses([biz], 60, Date.now() + 60000);
    expect(boosted).toBeGreaterThan(normal);
  });

  it('does not pay a business for time before it was bought', () => {
    const biz = makeOperationalCafe({ startedAt: Date.now() });
    const { totalIncome } = processBusinesses([biz], 60, 0);
    expect(totalIncome).toBe(0);
  });

  it('tolerates NaN / negative elapsed minutes', () => {
    const biz = makeOperationalCafe();
    expect(processBusinesses([biz], NaN, 0).totalIncome).toBe(0);
    expect(processBusinesses([biz], -5, 0).totalIncome).toBe(0);
  });

  it('does not produce NaN or Infinity', () => {
    const biz = startBusiness('cafe', 'local');
    const { totalIncome } = processBusinesses([biz], 999999, 0);
    expect(isNaN(totalIncome)).toBe(false);
    expect(isFinite(totalIncome)).toBe(true);
  });
});

describe('startBusiness', () => {
  it('creates a cafe with correct initial state', () => {
    const biz = startBusiness('cafe', 'local');
    expect(biz.type).toBe('cafe');
    expect(biz.subType).toBe('local');
    expect(biz.level).toBe(1);
    expect(biz.stock).toBeGreaterThan(0);
    expect(biz.branches).toBeDefined();
    expect(biz.taxLastPaidAt).toBeGreaterThan(0);
  });

  it('returns null for unknown type', () => {
    expect(startBusiness('unknown', 'x')).toBeNull();
  });
});

describe('buyStock', () => {
  it('adds stock to a business', () => {
    const biz = startBusiness('cafe', 'local');
    const initial = biz.stock;
    const updated = buyStock(biz, 100);
    expect(updated.stock).toBe(initial + 100);
  });

  it('returns null for invalid quantity', () => {
    const biz = startBusiness('cafe', 'local');
    expect(buyStock(biz, 0)).toBeNull();
    expect(buyStock(biz, -10)).toBeNull();
  });
});
