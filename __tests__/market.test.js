// Unit tests for the critical money-moving functions in src/data/market.js.
// These verify: market simulation, passive income, formatting, and edge cases.

jest.mock('../src/data/i18n', () => ({
  getCurrencySymbol: () => '$',
  loadLanguage: jest.fn(),
  t: (key) => key,
  getCurrentLanguage: () => 'en',
  setLanguage: jest.fn(),
  getSupportedLanguages: () => [{ id: 'en', name: 'English' }],
}));

const {
  createInitialMarketState,
  simulateMarket,
  MAX_OFFLINE_MINUTES,
  calculatePassiveIncome,
  getHourlyIncome,
  formatMoney,
  formatPrice,
  formatPercent,
  getChangePercent,
  ALL_ASSETS,
  STOCKS,
  CRYPTO,
  REAL_ESTATE,
  INVESTMENT_TAX_RATE,
} = require('../src/data/market');

describe('createInitialMarketState', () => {
  it('creates state for all assets', () => {
    const state = createInitialMarketState();
    expect(Object.keys(state).length).toBe(ALL_ASSETS.length);
  });

  it('each asset has price, prevPrice, and history', () => {
    const state = createInitialMarketState();
    for (const asset of ALL_ASSETS) {
      const s = state[asset.id];
      expect(s).toBeDefined();
      expect(s.price).toBeGreaterThan(0);
      expect(s.prevPrice).toBeGreaterThan(0);
      expect(s.history.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('simulateMarket', () => {
  it('returns updated state with positive prices', () => {
    const initial = createInitialMarketState();
    const { marketState, minutesElapsed } = simulateMarket(initial, Date.now() - 60000);
    expect(minutesElapsed).toBeGreaterThanOrEqual(1);
    for (const asset of ALL_ASSETS) {
      expect(marketState[asset.id].price).toBeGreaterThan(0);
    }
  });

  it('handles very long offline periods without NaN', () => {
    const initial = createInitialMarketState();
    const { marketState } = simulateMarket(initial, Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    for (const asset of ALL_ASSETS) {
      expect(isNaN(marketState[asset.id].price)).toBe(false);
      expect(isFinite(marketState[asset.id].price)).toBe(true);
    }
  });

  it('caps offline catch-up at MAX_OFFLINE_MINUTES', () => {
    const initial = createInitialMarketState();
    const { minutesElapsed } = simulateMarket(initial, Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(minutesElapsed).toBe(MAX_OFFLINE_MINUTES);
  });

  it('pays nothing for a sub-minute or future gap', () => {
    const initial = createInitialMarketState();
    expect(simulateMarket(initial, Date.now() - 1000).minutesElapsed).toBe(0);
    expect(simulateMarket(initial, Date.now() + 60000).minutesElapsed).toBe(0);
    expect(simulateMarket(initial, NaN).minutesElapsed).toBe(0);
  });
});

describe('calculatePassiveIncome', () => {
  it('returns 0 for no holdings', () => {
    const state = createInitialMarketState();
    expect(calculatePassiveIncome([], state, 60)).toBe(0);
  });

  it('generates positive income for real estate holdings', () => {
    const state = createInitialMarketState();
    const holdings = [{ assetId: 're_studio', quantity: 1, avgCost: 250000 }];
    const income = calculatePassiveIncome(holdings, state, 60);
    expect(income).toBeGreaterThan(0);
  });

  it('generates positive income for stock holdings', () => {
    const state = createInitialMarketState();
    const holdings = [{ assetId: 'st_appl', quantity: 100, avgCost: 195 }];
    const income = calculatePassiveIncome(holdings, state, 60);
    expect(income).toBeGreaterThan(0);
  });

  it('generates positive income for crypto holdings', () => {
    const state = createInitialMarketState();
    const holdings = [{ assetId: 'cr_btc', quantity: 1, avgCost: 67000 }];
    const income = calculatePassiveIncome(holdings, state, 60);
    expect(income).toBeGreaterThan(0);
  });

  it('applies investment tax (15%)', () => {
    const state = createInitialMarketState();
    const holdings = [{ assetId: 're_studio', quantity: 1, avgCost: 250000 }];
    const net = calculatePassiveIncome(holdings, state, 60);
    // Net should be less than gross (hourlyIncome * 1 hour)
    const re = REAL_ESTATE.find((r) => r.id === 're_studio');
    const gross = re.hourlyIncome * 1; // 1 hour
    expect(net).toBeLessThan(gross);
    expect(net).toBeCloseTo(gross * (1 - INVESTMENT_TAX_RATE), 1);
  });

  it('does not produce NaN', () => {
    const state = createInitialMarketState();
    const holdings = [{ assetId: 're_studio', quantity: 1000000, avgCost: 250000 }];
    const income = calculatePassiveIncome(holdings, state, 999999);
    expect(isNaN(income)).toBe(false);
  });
});

describe('formatMoney', () => {
  it('formats thousands with K suffix', () => {
    expect(formatMoney(1500)).toBe('$1.50K');
  });

  it('formats millions with M suffix', () => {
    expect(formatMoney(2500000)).toBe('$2.50M');
  });

  it('formats billions with B suffix', () => {
    expect(formatMoney(1000000000)).toBe('$1.00B');
  });

  it('handles null, NaN and Infinity', () => {
    expect(formatMoney(null)).toBe('$0');
    expect(formatMoney(NaN)).toBe('$0');
    expect(formatMoney(Infinity)).toBe('$0');
    expect(formatMoney(-Infinity)).toBe('$0');
  });

  it('formats trillions and negatives', () => {
    expect(formatMoney(3e12)).toBe('$3.00T');
    expect(formatMoney(-2500000)).toBe('-$2.50M');
  });

  it('formats small numbers with locale formatting', () => {
    expect(formatMoney(42)).toBe('$42');
  });
});

describe('formatPrice', () => {
  it('formats prices >= 1 with 2 decimals', () => {
    expect(formatPrice(195.5)).toBe('$195.50');
  });

  it('formats small prices with 4 decimals', () => {
    expect(formatPrice(0.0001)).toBe('$0.0001');
  });
});

describe('getChangePercent', () => {
  it('returns 0 when previous is 0', () => {
    expect(getChangePercent(100, 0)).toBe(0);
  });

  it('calculates positive change', () => {
    expect(getChangePercent(110, 100)).toBe(10);
  });

  it('calculates negative change', () => {
    expect(getChangePercent(90, 100)).toBe(-10);
  });
});
