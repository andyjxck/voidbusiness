// Investment definitions and real-time price simulation engine
// Prices fluctuate based on real elapsed time. Wild volatility for game feel.

import { getCurrencySymbol } from './i18n';
import { getPurchaseIncomeMultiplier } from './store';

export const STOCKS = [
  // Tech
  { id: 'st_appl', name: 'Applé Inc.', ticker: 'APLE', emoji: '🍎', basePrice: 195, volatility: 0.15, sector: 'Tech' },
  { id: 'st_goog', name: 'Googol Holdings', ticker: 'GOOG', emoji: '🔍', basePrice: 172, volatility: 0.12, sector: 'Tech' },
  { id: 'st_msft', name: 'Microhard', ticker: 'MSFT', emoji: '🪟', basePrice: 420, volatility: 0.10, sector: 'Tech' },
  { id: 'st_nvda', name: 'Nvidius', ticker: 'NVDX', emoji: '🎮', basePrice: 920, volatility: 0.30, sector: 'Semiconductors' },
  { id: 'st_avgo', name: 'Broadcomms', ticker: 'AVGO', emoji: '📡', basePrice: 165, volatility: 0.22, sector: 'Semiconductors' },
  { id: 'st_amd', name: 'Advancd Micro', ticker: 'AMD', emoji: '💻', basePrice: 158, volatility: 0.28, sector: 'Semiconductors' },
  { id: 'st_intl', name: 'Intell Corp', ticker: 'INTL', emoji: '💾', basePrice: 32, volatility: 0.20, sector: 'Semiconductors' },
  { id: 'st_orcl', name: 'Oracal', ticker: 'ORCL', emoji: '🔮', basePrice: 140, volatility: 0.14, sector: 'Tech' },
  { id: 'st_crm', name: 'Salesfarce', ticker: 'CRM', emoji: '☁️', basePrice: 268, volatility: 0.16, sector: 'Tech' },
  { id: 'st_adbe', name: 'Adobi', ticker: 'ADBE', emoji: '🎨', basePrice: 520, volatility: 0.18, sector: 'Tech' },
  { id: 'st_ibm', name: 'Intl Biz Machines', ticker: 'IBM', emoji: '🖥️', basePrice: 195, volatility: 0.09, sector: 'Tech' },
  { id: 'st_cisc', name: 'Cisgo', ticker: 'CSCO', emoji: '🌐', basePrice: 52, volatility: 0.10, sector: 'Tech' },
  // Social / Streaming
  { id: 'st_meta', name: 'Metaverse Corp', ticker: 'META', emoji: '🥽', basePrice: 480, volatility: 0.18, sector: 'Social' },
  { id: 'st_nflx', name: 'Netflit', ticker: 'NFLX', emoji: '🎬', basePrice: 610, volatility: 0.20, sector: 'Streaming' },
  { id: 'st_spot', name: 'Spotifai', ticker: 'SPOT', emoji: '🎧', basePrice: 320, volatility: 0.22, sector: 'Streaming' },
  { id: 'st_roku', name: 'Rokyu', ticker: 'ROKU', emoji: '📺', basePrice: 65, volatility: 0.30, sector: 'Streaming' },
  { id: 'st_pint', name: 'Pintrest', ticker: 'PINT', emoji: '📌', basePrice: 28, volatility: 0.25, sector: 'Social' },
  { id: 'st_snap', name: 'Snapchatz', ticker: 'SNAP', emoji: '👻', basePrice: 14, volatility: 0.35, sector: 'Social' },
  { id: 'st_twtr', name: 'Twittir', ticker: 'TWTR', emoji: '🐦', basePrice: 42, volatility: 0.32, sector: 'Social' },
  { id: 'st_reddit', name: 'Reddit Inc', ticker: 'RDDT', emoji: '👽', basePrice: 55, volatility: 0.40, sector: 'Social' },
  // Retail / E-commerce
  { id: 'st_amzn', name: 'Amazonia', ticker: 'AMZA', emoji: '📦', basePrice: 185, volatility: 0.14, sector: 'Retail' },
  { id: 'st_shop', name: 'Shopifyy', ticker: 'SHOP', emoji: '🛍️', basePrice: 72, volatility: 0.26, sector: 'Retail' },
  { id: 'st_ebay', name: 'Ebaay', ticker: 'EBAY', emoji: '🔨', basePrice: 58, volatility: 0.12, sector: 'Retail' },
  { id: 'st_etst', name: 'Etsyy', ticker: 'ETSY', emoji: '🧶', basePrice: 85, volatility: 0.24, sector: 'Retail' },
  { id: 'st_wmt', name: 'Wallmart', ticker: 'WMT', emoji: '🛒', basePrice: 72, volatility: 0.07, sector: 'Retail' },
  { id: 'st_tgt', name: 'Targét', ticker: 'TGT', emoji: '🎯', basePrice: 155, volatility: 0.10, sector: 'Retail' },
  { id: 'st_cost', name: 'Costcoo', ticker: 'COST', emoji: '🏬', basePrice: 780, volatility: 0.08, sector: 'Retail' },
  { id: 'st_hd', name: 'Home Depo', ticker: 'HOMD', emoji: '🔧', basePrice: 340, volatility: 0.09, sector: 'Retail' },
  // Auto / EV
  { id: 'st_tesl', name: 'Tezla Motors', ticker: 'TZLA', emoji: '⚡', basePrice: 248, volatility: 0.25, sector: 'Auto' },
  { id: 'st_ford', name: 'Forde', ticker: 'FORD', emoji: '🚙', basePrice: 12, volatility: 0.18, sector: 'Auto' },
  { id: 'st_gm', name: 'Generall Motors', ticker: 'GM', emoji: '🚗', basePrice: 48, volatility: 0.15, sector: 'Auto' },
  { id: 'st_rivn', name: 'Riviann', ticker: 'RIVN', emoji: '🛻', basePrice: 13, volatility: 0.40, sector: 'Auto' },
  { id: 'st_lcid', name: 'Lucidd', ticker: 'LCID', emoji: '✨', basePrice: 3.5, volatility: 0.45, sector: 'Auto' },
  { id: 'st_nio', name: 'Nioo Inc', ticker: 'NIO', emoji: '🚘', basePrice: 6, volatility: 0.42, sector: 'Auto' },
  // Finance / Banking
  { id: 'st_jpm', name: 'JP Morgan Stanley', ticker: 'JPM', emoji: '🏦', basePrice: 198, volatility: 0.08, sector: 'Finance' },
  { id: 'st_bac', name: 'Bank of Americo', ticker: 'BAC', emoji: '🏛️', basePrice: 38, volatility: 0.10, sector: 'Finance' },
  { id: 'st_gs', name: 'Goldman Sachs', ticker: 'GS', emoji: '👔', basePrice: 465, volatility: 0.11, sector: 'Finance' },
  { id: 'st_ms', name: 'Morgan Stanly', ticker: 'MSTN', emoji: '💼', basePrice: 95, volatility: 0.10, sector: 'Finance' },
  { id: 'st_visa', name: 'Visaa Inc', ticker: 'VISA', emoji: '💳', basePrice: 275, volatility: 0.07, sector: 'Finance' },
  { id: 'st_mc', name: 'Mastercardd', ticker: 'MC', emoji: '💸', basePrice: 460, volatility: 0.07, sector: 'Finance' },
  { id: 'st_pypl', name: 'PayPall', ticker: 'PYPL', emoji: '🅿️', basePrice: 65, volatility: 0.20, sector: 'Finance' },
  { id: 'st_sq', name: 'Blockk Inc', ticker: 'SQ', emoji: '⬛', basePrice: 72, volatility: 0.28, sector: 'Finance' },
  // Energy / Oil
  { id: 'st_xom', name: 'ExxonMobil', ticker: 'XOM', emoji: '⛽', basePrice: 115, volatility: 0.09, sector: 'Energy' },
  { id: 'st_cvx', name: 'Chevrons', ticker: 'CVX', emoji: '🛢️', basePrice: 155, volatility: 0.08, sector: 'Energy' },
  { id: 'st_bp', name: 'BP Oill', ticker: 'BP', emoji: '🌻', basePrice: 35, volatility: 0.12, sector: 'Energy' },
  { id: 'st_shell', name: 'Shelll Plc', ticker: 'SHLL', emoji: '🐚', basePrice: 68, volatility: 0.10, sector: 'Energy' },
  // Pharma / Healthcare
  { id: 'st_jnj', name: 'Johnson & John', ticker: 'JNJ', emoji: '🩹', basePrice: 155, volatility: 0.07, sector: 'Healthcare' },
  { id: 'st_pfe', name: 'Pfizerr', ticker: 'PFE', emoji: '💉', basePrice: 28, volatility: 0.13, sector: 'Healthcare' },
  { id: 'st_mrk', name: 'Merckk', ticker: 'MRK', emoji: '💊', basePrice: 125, volatility: 0.09, sector: 'Healthcare' },
  { id: 'st_abt', name: 'Abbottt Labs', ticker: 'ABBT', emoji: '🧪', basePrice: 108, volatility: 0.10, sector: 'Healthcare' },
  { id: 'st_lly', name: 'Eli Lillly', ticker: 'LLY', emoji: '🌷', basePrice: 780, volatility: 0.16, sector: 'Healthcare' },
  // Entertainment / Gaming
  { id: 'st_dis', name: 'Disnay', ticker: 'DIS', emoji: '🏰', basePrice: 95, volatility: 0.13, sector: 'Entertainment' },
  { id: 'st_ea', name: 'Electronix Arts', ticker: 'EA', emoji: '🎮', basePrice: 135, volatility: 0.15, sector: 'Gaming' },
  { id: 'st_atvi', name: 'Activisionn', ticker: 'ATVI', emoji: '🕹️', basePrice: 82, volatility: 0.14, sector: 'Gaming' },
  { id: 'st_ttwo', name: 'Take-Twoo', ticker: 'TTWO', emoji: '🎲', basePrice: 165, volatility: 0.17, sector: 'Gaming' },
  { id: 'st_roblox', name: 'Robloxx', ticker: 'RBLX', emoji: '🧱', basePrice: 42, volatility: 0.35, sector: 'Gaming' },
  { id: 'st_unity', name: 'Unityy Soft', ticker: 'U', emoji: '🧩', basePrice: 22, volatility: 0.38, sector: 'Gaming' },
  // Food / Beverage
  { id: 'st_ko', name: 'Coca-Colaa', ticker: 'KO', emoji: '🥤', basePrice: 62, volatility: 0.06, sector: 'Food' },
  { id: 'st_pep', name: 'Pepsicoo', ticker: 'PEP', emoji: '🧃', basePrice: 175, volatility: 0.06, sector: 'Food' },
  { id: 'st_mcd', name: 'McDonaldzz', ticker: 'MCD', emoji: '🍔', basePrice: 290, volatility: 0.08, sector: 'Food' },
  { id: 'st_sbux', name: 'Starbuckzz', ticker: 'SBUX', emoji: '☕', basePrice: 95, volatility: 0.12, sector: 'Food' },
  { id: 'st_nke', name: 'Nikée', ticker: 'NKE', emoji: '👟', basePrice: 92, volatility: 0.14, sector: 'Apparel' },
  // Aerospace / Defense
  { id: 'st_ba', name: 'Boeingg', ticker: 'BA', emoji: '✈️', basePrice: 180, volatility: 0.18, sector: 'Aerospace' },
  { id: 'st_lmt', name: 'Lockheed Martin', ticker: 'LMT', emoji: '🛡️', basePrice: 460, volatility: 0.08, sector: 'Defense' },
  { id: 'st_rtx', name: 'Raytheonn', ticker: 'RTX', emoji: '🚀', basePrice: 105, volatility: 0.10, sector: 'Defense' },
  // Travel / Transport
  { id: 'st_aal', name: 'American Airl', ticker: 'AAL', emoji: '🦅', basePrice: 14, volatility: 0.25, sector: 'Travel' },
  { id: 'st_ual', name: 'United Airl', ticker: 'UAL', emoji: '🛫', basePrice: 52, volatility: 0.22, sector: 'Travel' },
  { id: 'st_dal', name: 'Delta Airl', ticker: 'DAL', emoji: '🛩️', basePrice: 48, volatility: 0.20, sector: 'Travel' },
  { id: 'st_uber', name: 'Uberr Tech', ticker: 'UBER', emoji: '🚕', basePrice: 72, volatility: 0.25, sector: 'Travel' },
  { id: 'st_lyft', name: 'Lyfft Inc', ticker: 'LYFT', emoji: '🚖', basePrice: 15, volatility: 0.35, sector: 'Travel' },
  { id: 'st_abnb', name: 'Airbnbb', ticker: 'ABNB', emoji: '🏠', basePrice: 135, volatility: 0.24, sector: 'Travel' },
  // Telecom
  { id: 'st_t', name: 'AT&T Tele', ticker: 'ATT', emoji: '📞', basePrice: 22, volatility: 0.08, sector: 'Telecom' },
  { id: 'st_vz', name: 'Verizonn', ticker: 'VZ', emoji: '📶', basePrice: 42, volatility: 0.07, sector: 'Telecom' },
  { id: 'st_tmus', name: 'T-Mobilee', ticker: 'TMUS', emoji: '📱', basePrice: 195, volatility: 0.10, sector: 'Telecom' },
  // Industrial
  { id: 'st_ge', name: 'Generall Elect', ticker: 'GE', emoji: '💡', basePrice: 165, volatility: 0.13, sector: 'Industrial' },
  { id: 'st_cat', name: 'Caterpillarr', ticker: 'CAT', emoji: '🚜', basePrice: 350, volatility: 0.11, sector: 'Industrial' },
  { id: 'st_hon', name: 'Honeywelll', ticker: 'HON', emoji: '🍯', basePrice: 210, volatility: 0.09, sector: 'Industrial' },
];

export const CRYPTO = [
  { id: 'cr_btc', name: 'Bitcorn', ticker: 'BTC', emoji: '🌽', basePrice: 67000, volatility: 0.40 },
  { id: 'cr_eth', name: 'Ethereon', ticker: 'ETH', emoji: '💎', basePrice: 3500, volatility: 0.45 },
  { id: 'cr_sol', name: 'Solarno', ticker: 'SOL', emoji: '☀️', basePrice: 145, volatility: 0.55 },
  { id: 'cr_bnb', name: 'Binancoin', ticker: 'BNB', emoji: '🟡', basePrice: 580, volatility: 0.42 },
  { id: 'cr_xrp', name: 'RippleX', ticker: 'XRP', emoji: '🌊', basePrice: 0.52, volatility: 0.50 },
  { id: 'cr_ada', name: 'Cardano', ticker: 'ADA', emoji: '♠️', basePrice: 0.45, volatility: 0.50 },
  { id: 'cr_doge', name: 'Dogecorn', ticker: 'DOGE', emoji: '🐕', basePrice: 0.12, volatility: 0.70 },
  { id: 'cr_avax', name: 'Avalanche', ticker: 'AVAX', emoji: '🏔️', basePrice: 28, volatility: 0.55 },
  { id: 'cr_link', name: 'Chainflow', ticker: 'LINK', emoji: '⛓️', basePrice: 14, volatility: 0.50 },
  { id: 'cr_dot', name: 'Polkadott', ticker: 'DOT', emoji: '🟣', basePrice: 7.5, volatility: 0.55 },
  { id: 'cr_matic', name: 'Polygoon', ticker: 'MATIC', emoji: '🔷', basePrice: 0.85, volatility: 0.60 },
  { id: 'cr_shib', name: 'Shiba Inuu', ticker: 'SHIB', emoji: '🐶', basePrice: 0.00002, volatility: 0.80 },
  { id: 'cr_ltc', name: 'Litecoinn', ticker: 'LTC', emoji: '🥈', basePrice: 85, volatility: 0.45 },
  { id: 'cr_bch', name: 'Bitcorn Cash', ticker: 'BCH', emoji: '💵', basePrice: 380, volatility: 0.50 },
  { id: 'cr_uni', name: 'Uniswappp', ticker: 'UNI', emoji: '🦄', basePrice: 11, volatility: 0.55 },
  { id: 'cr_atom', name: 'Cosmosss', ticker: 'ATOM', emoji: '⚛️', basePrice: 9, volatility: 0.58 },
  { id: 'cr_near', name: 'Near Protocol', ticker: 'NEAR', emoji: '📍', basePrice: 6.5, volatility: 0.60 },
  { id: 'cr_apt', name: 'Aptosss', ticker: 'APT', emoji: '🅰️', basePrice: 8, volatility: 0.65 },
  { id: 'cr_fil', name: 'Filecoinn', ticker: 'FIL', emoji: '📁', basePrice: 5.5, volatility: 0.60 },
  { id: 'cr_hbar', name: 'Hederaaa', ticker: 'HBAR', emoji: '🌿', basePrice: 0.10, volatility: 0.55 },
  { id: 'cr_algo', name: 'Algorandd', ticker: 'ALGO', emoji: '🧮', basePrice: 0.18, volatility: 0.58 },
  { id: 'cr_ftm', name: 'Fantomm', ticker: 'FTM', emoji: '👻', basePrice: 0.75, volatility: 0.65 },
  { id: 'cr_inj', name: 'Injectivee', ticker: 'INJ', emoji: '💉', basePrice: 25, volatility: 0.70 },
  { id: 'cr_tia', name: 'Celestiaaa', ticker: 'TIA', emoji: '✨', basePrice: 12, volatility: 0.75 },
  { id: 'cr_sei', name: 'Seii Network', ticker: 'SEI', emoji: '🐋', basePrice: 0.55, volatility: 0.68 },
  { id: 'cr_sui', name: 'Suiii', ticker: 'SUI', emoji: '💧', basePrice: 1.8, volatility: 0.72 },
  { id: 'cr_pepe', name: 'Pepeee', ticker: 'PEPE', emoji: '🐸', basePrice: 0.00001, volatility: 0.85 },
  { id: 'cr_wif', name: 'Dogwifhattt', ticker: 'WIF', emoji: '🎩', basePrice: 3.5, volatility: 0.85 },
  { id: 'cr_bonk', name: 'Bonkkk', ticker: 'BONK', emoji: '🔨', basePrice: 0.00003, volatility: 0.88 },
  { id: 'cr_floki', name: 'Flokkii', ticker: 'FLOKI', emoji: '🐺', basePrice: 0.0002, volatility: 0.82 },
];

// Multiplier applied to base hourly income rates below to make real estate income feel bigger
const RE_INCOME_MULT = 1.2;

export const REAL_ESTATE = [
  { id: 're_studio', name: 'Downtown Studio', basePrice: 250000, volatility: 0.03, hourlyIncome: 12 * RE_INCOME_MULT, image: require('../../assets/realestate/downtownstudio.jpg') },
  { id: 're_apt', name: 'City Apartment', basePrice: 450000, volatility: 0.03, hourlyIncome: 22 * RE_INCOME_MULT, image: require('../../assets/realestate/cityapartment.jpg') },
  { id: 're_house', name: 'Suburban House', basePrice: 850000, volatility: 0.04, hourlyIncome: 42 * RE_INCOME_MULT, image: require('../../assets/realestate/suburbanhouse.jpg') },
  { id: 're_town', name: 'Townhouse', basePrice: 650000, volatility: 0.035, hourlyIncome: 32 * RE_INCOME_MULT, image: require('../../assets/realestate/townhouse.jpg') },
  { id: 're_condo', name: 'Luxury Condo', basePrice: 1200000, volatility: 0.04, hourlyIncome: 58 * RE_INCOME_MULT, image: require('../../assets/realestate/luxurycondo.jpg') },
  { id: 're_pent', name: 'Luxury Penthouse', basePrice: 2500000, volatility: 0.05, hourlyIncome: 120 * RE_INCOME_MULT, image: require('../../assets/realestate/luxurypenthouse.jpg') },
  { id: 're_beach', name: 'Beachfront Villa', basePrice: 3800000, volatility: 0.05, hourlyIncome: 185 * RE_INCOME_MULT, image: require('../../assets/realestate/beachfrontvilla.jpg') },
  { id: 're_ranch', name: 'Country Ranch', basePrice: 1800000, volatility: 0.04, hourlyIncome: 88 * RE_INCOME_MULT, image: require('../../assets/realestate/countryranch.jpg') },
  { id: 're_loft', name: 'Industrial Loft', basePrice: 950000, volatility: 0.035, hourlyIncome: 46 * RE_INCOME_MULT, image: require('../../assets/realestate/industryloft.jpg') },
  { id: 're_duplex', name: 'Duplex Property', basePrice: 720000, volatility: 0.03, hourlyIncome: 36 * RE_INCOME_MULT, image: require('../../assets/realestate/duplexproperty.jpg') },
  { id: 're_mansion', name: 'Beverly Hills Mansion', basePrice: 8500000, volatility: 0.06, hourlyIncome: 400 * RE_INCOME_MULT, image: require('../../assets/realestate/mansion.jpg') },
  { id: 're_estate', name: 'Country Estate', basePrice: 5500000, volatility: 0.05, hourlyIncome: 270 * RE_INCOME_MULT, image: require('../../assets/realestate/countryestate.jpg') },
  { id: 're_hotel', name: 'Boutique Hotel', basePrice: 12000000, volatility: 0.06, hourlyIncome: 580 * RE_INCOME_MULT, image: require('../../assets/realestate/boutiquehotel.jpg') },
  { id: 're_sky', name: 'Skyscraper Floor', basePrice: 15000000, volatility: 0.07, hourlyIncome: 720 * RE_INCOME_MULT, image: require('../../assets/realestate/skyscraperfloor.jpg') },
  { id: 're_resort', name: 'Island Resort', basePrice: 22000000, volatility: 0.07, hourlyIncome: 1050 * RE_INCOME_MULT, image: require('../../assets/realestate/islandresort.jpg') },
  { id: 're_island', name: 'Private Island', basePrice: 25000000, volatility: 0.08, hourlyIncome: 1200 * RE_INCOME_MULT, image: require('../../assets/realestate/privateisland.jpg') },
  { id: 're_vine', name: 'Vineyard Estate', basePrice: 8500000, volatility: 0.05, hourlyIncome: 410 * RE_INCOME_MULT, image: require('../../assets/realestate/vineyardestate.jpg') },
  { id: 're_castle', name: 'European Castle', basePrice: 18000000, volatility: 0.06, hourlyIncome: 860 * RE_INCOME_MULT, image: require('../../assets/realestate/europeancastle.jpg') },
  { id: 're_skyscraper', name: 'Office Skyscraper', basePrice: 45000000, volatility: 0.08, hourlyIncome: 2200 * RE_INCOME_MULT, image: require('../../assets/realestate/officeskyscraper.jpg') },
  { id: 're_mall', name: 'Shopping Mall', basePrice: 32000000, volatility: 0.07, hourlyIncome: 1550 * RE_INCOME_MULT, image: require('../../assets/realestate/shoppingmall.jpg') },
];

export const ALL_ASSETS = [...STOCKS, ...CRYPTO, ...REAL_ESTATE];

// Generate initial state for all assets
export function createInitialMarketState() {
  const state = {};
  for (const asset of ALL_ASSETS) {
    const h = [asset.basePrice];
    // Seed with slight variations so graphs have data immediately
    for (let i = 0; i < 4; i++) {
      const variance = (Math.random() - 0.5) * 2 * asset.volatility * asset.basePrice;
      h.push(Math.max(0.01, asset.basePrice + variance));
    }
    state[asset.id] = {
      id: asset.id,
      price: h[h.length - 1],
      prevPrice: h[0],
      history: h,
    };
  }
  return state;
}

// Deterministic per-asset drift so every stock has its own personality
function getAssetDrift(asset) {
  let hash = 0;
  for (let i = 0; i < asset.id.length; i++) {
    hash = ((hash << 5) - hash) + asset.id.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  // Drift between -0.8% and +0.8% per hour
  return -0.008 + normalized * 0.016;
}

// Box-Muller transform for normally distributed random values
function normalRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Simulate price changes for elapsed minutes using proper GBM
// Each asset gets its own drift and independent random shock
function simulatePriceChange(currentPrice, volatility, drift, minutesElapsed) {
  const dtHours = minutesElapsed / 60;
  const sigma = volatility * Math.sqrt(dtHours);
  const mu = drift * dtHours;
  const Z = normalRandom();
  const change = Math.exp((mu - 0.5 * sigma * sigma) + sigma * Z);
  const base = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 0.01;
  const next = base * change;
  if (!Number.isFinite(next)) return base;
  // Bound a single step so a long offline window can't explode a price.
  return Math.min(base * 1e3, Math.max(next, 0.01));
}

// Offline catch-up is capped so clock changes and multi-day absences can't
// mint unbounded income or instantly finish every market step.
export const MAX_OFFLINE_MINUTES = 12 * 60;

// Process market state given elapsed time since lastUpdate (in minutes)
export function simulateMarket(marketState, lastUpdate, now = Date.now()) {
  const rawMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
  const minutesElapsed = Number.isFinite(rawMinutes) ? Math.min(MAX_OFFLINE_MINUTES, Math.max(0, rawMinutes)) : 0;
  if (minutesElapsed <= 0) return { marketState, minutesElapsed: 0, income: 0 };

  const newState = {};

  for (const asset of ALL_ASSETS) {
    const current = marketState[asset.id];
    if (!current) {
      const drift = getAssetDrift(asset);
      const h = [asset.basePrice];
      let price = asset.basePrice;
      for (let i = 0; i < 4; i++) {
        price = simulatePriceChange(price, asset.volatility, drift, 60);
        h.push(price);
      }
      newState[asset.id] = {
        id: asset.id,
        price: h[h.length - 1],
        prevPrice: h[0],
        history: h,
      };
      continue;
    }

    const drift = getAssetDrift(asset);
    const newPrice = simulatePriceChange(current.price, asset.volatility, drift, minutesElapsed);

    // Build history (keep last 30 data points)
    const newHistory = [...current.history, newPrice].slice(-30);

    newState[asset.id] = {
      id: asset.id,
      price: newPrice,
      prevPrice: current.price,
      history: newHistory,
    };
  }

  return { marketState: newState, minutesElapsed, income: 0 };
}

// Dividend yields by sector - now a direct HOURLY % of share price (paid per-minute, same as real estate)
const SECTOR_HOURLY_YIELDS = {
  'Tech': 0.0006,
  'Semiconductors': 0.0004,
  'Social': 0.0002,
  'Streaming': 0.0002,
  'Retail': 0.0012,
  'Auto': 0.0005,
  'Finance': 0.0015,
  'Energy': 0.0020,
  'Healthcare': 0.0014,
  'Gaming': 0.0007,
  'Food': 0.0018,
  'Aerospace': 0.0012,
  'Defense': 0.0016,
  'Travel': 0.0008,
  'Telecom': 0.0020,
  'Industrial': 0.0014,
  'Apparel': 0.0012,
};

// Crypto "staking" yield - a flat hourly % of coin price, paid per-minute like everything else
const CRYPTO_HOURLY_YIELD = 0.00015;

// Capital gains / income tax on investment returns (real estate, dividends, staking)
export const INVESTMENT_TAX_RATE = 0.15; // 15% tax on investment income

// Calculate passive income from real estate + stock dividends + crypto staking
// Rate is per-hour, but we pay per-minute (minutesElapsed / 60 of the hourly rate)
// Tax is deducted automatically (user receives net income)
export function calculatePassiveIncome(holdings, marketState, minutesElapsed) {
  let income = 0;
  const hoursFraction = minutesElapsed / 60;
  for (const holding of holdings) {
    // Real estate income
    const reAsset = REAL_ESTATE.find((r) => r.id === holding.assetId);
    if (reAsset) {
      income += reAsset.hourlyIncome * holding.quantity * hoursFraction;
    }
    // Stock dividends - direct hourly % of price
    const stock = STOCKS.find((s) => s.id === holding.assetId);
    if (stock) {
      const state = marketState[stock.id];
      const price = state ? state.price : stock.basePrice;
      const yieldPct = SECTOR_HOURLY_YIELDS[stock.sector] || 0;
      income += yieldPct * price * holding.quantity * hoursFraction;
    }
    // Crypto staking rewards - direct hourly % of price
    const coin = CRYPTO.find((c) => c.id === holding.assetId);
    if (coin) {
      const state = marketState[coin.id];
      const price = state ? state.price : coin.basePrice;
      income += CRYPTO_HOURLY_YIELD * price * holding.quantity * hoursFraction;
    }
  }
  return income * (1 - INVESTMENT_TAX_RATE) * getPurchaseIncomeMultiplier();
}

// Get hourly income rate for an asset (for display purposes, post-tax)
export function getHourlyIncome(asset, state) {
  const mult = getPurchaseIncomeMultiplier();
  if (asset.id.startsWith('re_')) {
    return (asset.hourlyIncome || 0) * (1 - INVESTMENT_TAX_RATE) * mult;
  }
  const price = state ? state.price : asset.basePrice;
  if (asset.id.startsWith('cr_')) {
    return CRYPTO_HOURLY_YIELD * price * (1 - INVESTMENT_TAX_RATE) * mult;
  }
  // Stock dividend: direct hourly % of price
  const yieldPct = SECTOR_HOURLY_YIELDS[asset.sector] || 0;
  return yieldPct * price * (1 - INVESTMENT_TAX_RATE) * mult;
}

// Format money
export function formatMoney(n) {
  const sym = getCurrencySymbol();
  if (n == null || !Number.isFinite(n)) return sym + '0';
  if (n < 0) return '-' + formatMoney(-n);
  if (n >= 1e12) return sym + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return sym + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return sym + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return sym + (n / 1e3).toFixed(2) + 'K';
  return sym + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatPrice(n) {
  const sym = getCurrencySymbol();
  if (n == null || !Number.isFinite(n)) return sym + '0.00';
  if (n >= 1e9) return sym + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return sym + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return sym + (n / 1e3).toFixed(2) + 'K';
  if (n >= 1) return sym + n.toFixed(2);
  if (n >= 0.0001) return sym + n.toFixed(4);
  // Sub-penny prices (meme coins) - enough decimals to stay meaningful.
  const decimals = Math.min(10, Math.ceil(-Math.log10(n)) + 2);
  return sym + n.toFixed(decimals);
}

// Compact share/coin counts so long raw numbers don't overflow their row.
export function formatQty(n) {
  if (n == null || !Number.isFinite(n)) return '0';
  if (n < 0) return '-' + formatQty(-n);
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatPercent(n) {
  if (!Number.isFinite(n)) return '0.00%';
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

// Get price change percentage
export function getChangePercent(current, previous) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
