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

describe('asset names (App Review 5.2.1)', () => {
  // Saves store holdings by asset id, so these ids must never change even
  // though the display names and tickers are invented.
  const SAVED_IDS = [
    'st_appl', 'st_goog', 'st_msft', 'st_nvda', 'st_avgo', 'st_amd', 'st_intl', 'st_orcl',
    'st_crm', 'st_adbe', 'st_ibm', 'st_cisc', 'st_meta', 'st_nflx', 'st_spot', 'st_roku',
    'st_pint', 'st_snap', 'st_twtr', 'st_reddit', 'st_amzn', 'st_shop', 'st_ebay', 'st_etst',
    'st_wmt', 'st_tgt', 'st_cost', 'st_hd', 'st_tesl', 'st_ford', 'st_gm', 'st_rivn',
    'st_lcid', 'st_nio', 'st_jpm', 'st_bac', 'st_gs', 'st_ms', 'st_visa', 'st_mc',
    'st_pypl', 'st_sq', 'st_xom', 'st_cvx', 'st_bp', 'st_shell', 'st_jnj', 'st_pfe',
    'st_mrk', 'st_abt', 'st_lly', 'st_dis', 'st_ea', 'st_atvi', 'st_ttwo', 'st_roblox',
    'st_unity', 'st_ko', 'st_pep', 'st_mcd', 'st_sbux', 'st_nke', 'st_ba', 'st_lmt',
    'st_rtx', 'st_aal', 'st_ual', 'st_dal', 'st_uber', 'st_lyft', 'st_abnb', 'st_t',
    'st_vz', 'st_tmus', 'st_ge', 'st_cat', 'st_hon', 'cr_btc', 'cr_eth', 'cr_sol',
    'cr_bnb', 'cr_xrp', 'cr_ada', 'cr_doge', 'cr_avax', 'cr_link', 'cr_dot', 'cr_matic',
    'cr_shib', 'cr_ltc', 'cr_bch', 'cr_uni', 'cr_atom', 'cr_near', 'cr_apt', 'cr_fil',
    'cr_hbar', 'cr_algo', 'cr_ftm', 'cr_inj', 'cr_tia', 'cr_sei', 'cr_sui', 'cr_pepe',
    'cr_wif', 'cr_bonk', 'cr_floki',
  ];

  it('keeps every legacy stock and coin id', () => {
    const ids = new Set([...STOCKS, ...CRYPTO].map((a) => a.id));
    for (const id of SAVED_IDS) expect(ids.has(id)).toBe(true);
    expect(STOCKS.length + CRYPTO.length).toBe(SAVED_IDS.length);
  });

  it('uses unique tickers and names', () => {
    const all = [...STOCKS, ...CRYPTO];
    expect(new Set(all.map((a) => a.ticker)).size).toBe(all.length);
    expect(new Set(all.map((a) => a.name)).size).toBe(all.length);
  });

  it('does not use real tickers or brand-like names', () => {
    const REAL_TICKERS = ['AAPL', 'GOOG', 'GOOGL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'META', 'NFLX', 'JPM', 'GS', 'BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'BNB', 'ADA', 'SHIB', 'PEPE'];
    const REAL_WORDS = /apple|appl|goog|microsoft|microhard|nvid|amazon|tesla|tezla|netflix|bitco|ethere|doge|shiba|goldman|morgan|visa|master|paypal|disney|boeing|uber|lyft|airbnb|nike|starbuck|coca|pepsi/i;
    for (const a of [...STOCKS, ...CRYPTO]) {
      expect(REAL_TICKERS).not.toContain(a.ticker);
      expect(a.name).not.toMatch(REAL_WORDS);
      expect(a.emoji).not.toBe('\u{1F34E}');
    }
  });
});
