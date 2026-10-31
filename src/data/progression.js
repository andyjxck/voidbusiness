// ─── Progression System ───
// Private Estates gate the entire system. Owning at least one estate
// unlocks the 6 action buttons (Vault, Gallery, Showroom, Auction House,
// Private Dealer, Exchange) and the ability to buy collection items.

import { t } from './i18n';
import { scaleDuration } from './store';

// Helper: get the localized name for an item/category/estate/upgrade
export function getLocalizedName(obj) {
  if (!obj) return '';
  if (obj.nameKey) return t(obj.nameKey);
  return obj.name || '';
}

export const COLLECTION_CATEGORIES = [
  { id: 'spirits', get name() { return t('dn_rare_spirits'); }, nameKey: 'item_spirits', emoji: '🥃', color: '#f59e0b' },
  { id: 'artifacts', get name() { return t('dn_ancient_artifacts'); }, nameKey: 'item_artifacts', emoji: '🏺', color: '#a78bfa' },
  { id: 'timepieces', get name() { return t('dn_vintage_timepieces'); }, nameKey: 'item_timepieces', emoji: '⌚', color: '#38bdf8' },
  { id: 'jewels', get name() { return t('dn_crown_jewels'); }, nameKey: 'item_jewels', emoji: '👑', color: '#f472b6' },
  { id: 'meteorites', get name() { return t('dn_meteorites'); }, nameKey: 'item_meteorites', emoji: '☄️', color: '#64748b' },
  { id: 'books', get name() { return t('dn_first_editions'); }, nameKey: 'item_books', emoji: '📚', color: '#34d399' },
  { id: 'domains', get name() { return t('dn_domain_empire'); }, nameKey: 'item_domains', emoji: '🌐', color: '#22d3ee' },
  { id: 'space', get name() { return t('dn_space_ventures'); }, nameKey: 'item_space', emoji: '🚀', color: '#fb923c' },
  { id: 'estates', get name() { return t('dn_private_estates'); }, nameKey: 'item_estates', emoji: '🏰', color: '#fbbf24' },
];

export const COLLECTION_ITEMS = {
  spirits: [
    { id: 'amberveil1923', get name() { return t('dn_amberveil_1923'); }, nameKey: 'item_amberveil1923', price: 50000000 },
    { id: 'goldbarrel', get name() { return t('dn_goldbarrel_reserve'); }, nameKey: 'item_goldbarrel', price: 30000000 },
    { id: 'nightshade', get name() { return t('dn_nightshade_cask'); }, nameKey: 'item_nightshade', price: 25000000 },
    { id: 'crowmoor18', get name() { return t('dn_crowmoor_18_year'); }, nameKey: 'item_crowmoor18', price: 12000000 },
    { id: 'ironroot', get name() { return t('dn_ironroot_vintage'); }, nameKey: 'item_ironroot', price: 8000000 },
    { id: 'silverstark', get name() { return t('dn_silverstark_single_malt'); }, nameKey: 'item_silverstark', price: 5000000 },
    { id: 'emberfall', get name() { return t('dn_emberfall_bourbon'); }, nameKey: 'item_emberfall_bourbon', price: 3000000 },
    { id: 'highglen1945', get name() { return t('dn_highglen_1945'); }, nameKey: 'item_highglen1945', price: 2000000 },
    { id: 'blackwatch', get name() { return t('dn_blackwatch_reserve'); }, nameKey: 'item_blackwatch', price: 1500000 },
    { id: 'stormcask', get name() { return t('dn_stormcask_ale'); }, nameKey: 'item_stormcask', price: 800000 },
    { id: 'dawnbringer', get name() { return t('dn_dawnbringer_brandy'); }, nameKey: 'item_dawnbringer', price: 500000 },
    { id: 'thornfield', get name() { return t('dn_thornfield_port'); }, nameKey: 'item_thornfield_port', price: 350000 },
    { id: 'greythorn', get name() { return t('dn_greenhorn_whiskey'); }, nameKey: 'dn_greenhorn_whiskey', price: 250000 },
    { id: 'ravencrest', get name() { return t('dn_ravencrest_rum'); }, nameKey: 'item_ravencrest_rum', price: 180000 },
    { id: 'oakheart', get name() { return t('dn_oakheart_xo'); }, nameKey: 'item_oakheart_xo', price: 120000 },
    { id: 'wolfscrag', get name() { return t('dn_wolfscrag_gin'); }, nameKey: 'item_wolfscrag_gin', price: 90000 },
    { id: 'mistmoor', get name() { return t('dn_mistmoor_absinthe'); }, nameKey: 'item_mistmoor', price: 70000 },
    { id: 'crestview', get name() { return t('dn_crestview_cognac'); }, nameKey: 'item_crestview_cognac', price: 50000 },
  ],
  artifacts: [
    { id: 'sunstone', get name() { return t('dn_sunstone_of_athar'); }, nameKey: 'item_sunstone', price: 500000000 },
    { id: 'voidcrown', get name() { return t('dn_crown_of_the_void_kings'); }, nameKey: 'item_voidcrown', price: 350000000 },
    { id: 'serpentaltar', get name() { return t('dn_serpent_altar'); }, nameKey: 'item_serpentaltar', price: 200000000 },
    { id: 'whispertablet', get name() { return t('dn_whispering_tablet'); }, nameKey: 'item_whispertablet', price: 150000000 },
    { id: 'firstemperor', get name() { return t('dn_tomb_of_the_first_emperor'); }, nameKey: 'item_firstemperor', price: 100000000 },
    { id: 'starmap', get name() { return t('dn_star_map_of_navarre'); }, nameKey: 'item_starmap', price: 75000000 },
    { id: 'ironcrown', get name() { return t('dn_iron_crown_of_galen'); }, nameKey: 'item_ironcrown', price: 50000000 },
    { id: 'northwallshield', get name() { return t('dn_shield_of_the_northwall'); }, nameKey: 'item_northwallshield', price: 35000000 },
    { id: 'orb', get name() { return t('dn_orb_of_eternal_tides'); }, nameKey: 'item_orb', price: 25000000 },
    { id: 'scepter', get name() { return t('dn_scepter_of_dawn'); }, nameKey: 'item_scepter', price: 18000000 },
    { id: 'shadowmask', get name() { return t('dn_mask_of_the_shadow_priests'); }, nameKey: 'item_shadowmask', price: 12000000 },
    { id: 'codex', get name() { return t('dn_codex_of_the_lost_library'); }, nameKey: 'item_codex', price: 8000000 },
    { id: 'runestone', get name() { return t('dn_runestone_of_eld'); }, nameKey: 'item_runestone', price: 5000000 },
    { id: 'chalice', get name() { return t('dn_chalice_of_aurelius'); }, nameKey: 'item_chalice', price: 3000000 },
    { id: 'warhorn', get name() { return t('dn_warhorn_of_the_highlands'); }, nameKey: 'item_warhorn', price: 1500000 },
    { id: 'sealstone', get name() { return t('dn_sealing_stone_of_vorn'); }, nameKey: 'item_sealstone', price: 800000 },
    { id: 'goldenidol', get name() { return t('dn_golden_idol_of_keth'); }, nameKey: 'item_goldenidol', price: 400000 },
    { id: 'thronefrag', get name() { return t('dn_throne_fragment_of_argoth'); }, nameKey: 'item_thronefrag', price: 100000 },
  ],
  timepieces: [
    { id: 'chronos', get name() { return t('dn_chronos_apex'); }, nameKey: 'item_chronos', price: 100000000 },
    { id: 'solstice', get name() { return t('dn_solstice_tourbillon'); }, nameKey: 'item_solstice', price: 40000000 },
    { id: 'celestial', get name() { return t('dn_celestial_moonphase'); }, nameKey: 'item_celestial', price: 15000000 },
    { id: 'pendulum', get name() { return t('dn_pendulum_royale'); }, nameKey: 'item_pendulum', price: 7000000 },
    { id: 'stardial', get name() { return t('dn_stardial_skeleton'); }, nameKey: 'item_stardial', price: 3000000 },
    { id: 'luminous', get name() { return t('dn_luminous_grand'); }, nameKey: 'item_luminous', price: 1500000 },
    { id: 'zenith', get name() { return t('dn_zenith_reverso'); }, nameKey: 'item_zenith', price: 750000 },
    { id: 'nova', get name() { return t('dn_nova_dress_watch'); }, nameKey: 'item_nova', price: 350000 },
    { id: 'orion', get name() { return t('dn_orion_tourbillon'); }, nameKey: 'item_orion', price: 150000 },
  ],
  jewels: [
    { id: 'heartabyss', get name() { return t('dn_heart_of_the_abyss'); }, nameKey: 'item_heartabyss', price: 1000000000 },
    { id: 'tearmoon', get name() { return t('dn_tear_of_the_moon'); }, nameKey: 'item_tearmoon', price: 500000000 },
    { id: 'flamedawn', get name() { return t('dn_flame_of_dawn'); }, nameKey: 'item_flamedawn', price: 350000000 },
    { id: 'thorndiamond', get name() { return t('dn_thorndiamond'); }, nameKey: 'item_thorndiamond', price: 180000000 },
    { id: 'emeraldforest', get name() { return t('dn_emerald_of_the_forest_court'); }, nameKey: 'item_emeraldforest', price: 65000000 },
    { id: 'onyxvoid', get name() { return t('dn_onyx_of_the_void'); }, nameKey: 'item_onyxvoid', price: 30000000 },
    { id: 'opalburning', get name() { return t('dn_opal_of_the_burning_sea'); }, nameKey: 'item_opalburning', price: 12000000 },
    { id: 'garnetiron', get name() { return t('dn_garnet_of_the_iron_crown'); }, nameKey: 'item_garnetiron', price: 3000000 },
    { id: 'quartz', get name() { return t('dn_quartz_of_the_ancients'); }, nameKey: 'item_quartz', price: 1000000 },
  ],
  meteorites: [
    { id: 'voidstone', get name() { return t('dn_voidstone_fragment'); }, nameKey: 'item_voidstone', price: 200000000 },
    { id: 'starfall', get name() { return t('dn_starfall_of_the_northern_reach'); }, nameKey: 'item_starfall', price: 150000000 },
    { id: 'ironsky', get name() { return t('dn_iron_of_the_fallen_sky'); }, nameKey: 'item_ironsky', price: 100000000 },
    { id: 'celestialcore', get name() { return t('dn_celestial_core'); }, nameKey: 'item_celestialcore', price: 75000000 },
    { id: 'wanderer', get name() { return t('dn_wanderers_remnant'); }, nameKey: 'item_wanderer_remnant', price: 50000000 },
    { id: 'abyssfrag', get name() { return t('dn_abyss_fragment'); }, nameKey: 'item_abyssfrag', price: 35000000 },
    { id: 'nebulastone', get name() { return t('dn_nebula_stone'); }, nameKey: 'item_nebulastone', price: 25000000 },
    { id: 'cosmiciron', get name() { return t('dn_cosmic_iron_mass'); }, nameKey: 'item_cosmiciron', price: 18000000 },
    { id: 'starforge', get name() { return t('dn_starforge_fragment'); }, nameKey: 'item_starforge', price: 12000000 },
    { id: 'voidcrystal', get name() { return t('dn_void_crystal'); }, nameKey: 'item_voidcrystal', price: 8000000 },
    { id: 'orbiting', get name() { return t('dn_orbiting_mass'); }, nameKey: 'item_orbiting', price: 5000000 },
    { id: 'solarflare', get name() { return t('dn_solar_flare_stone'); }, nameKey: 'item_solarflare', price: 3500000 },
    { id: 'galacticcore', get name() { return t('dn_galactic_core_sample'); }, nameKey: 'item_galacticcore', price: 2500000 },
    { id: 'comettail', get name() { return t('dn_comet_tail_fragment'); }, nameKey: 'item_comettail', price: 1500000 },
    { id: 'stellariron', get name() { return t('dn_stellar_iron'); }, nameKey: 'item_stellariron', price: 1000000 },
    { id: 'planetary', get name() { return t('dn_planetary_core_fragment'); }, nameKey: 'item_planetary', price: 700000 },
    { id: 'supernova', get name() { return t('dn_supernova_remnant'); }, nameKey: 'item_supernova', price: 400000 },
    { id: 'blackhole', get name() { return t('dn_black_hole_diamond'); }, nameKey: 'item_blackhole', price: 200000 },
  ],
  books: [
    { id: 'firstchronicle', get name() { return t('dn_the_first_chronicle'); }, nameKey: 'item_firstchronicle', price: 100000000 },
    { id: 'tomeancients', get name() { return t('dn_tome_of_the_ancients'); }, nameKey: 'item_tomeancients', price: 75000000 },
    { id: 'atlas', get name() { return t('dn_original_atlas_of_the_known_world'); }, nameKey: 'item_atlas', price: 50000000 },
    { id: 'founding', get name() { return t('dn_the_founding_text'); }, nameKey: 'item_founding', price: 35000000 },
    { id: 'crimsonknight', get name() { return t('dn_ballad_of_the_crimson_knight'); }, nameKey: 'item_crimsonknight', price: 20000000 },
    { id: 'hollowcrown', get name() { return t('dn_the_hollow_crown_first_edition'); }, nameKey: 'item_hollowcrown', price: 12000000 },
    { id: 'wanderer', get name() { return t('dn_tales_of_the_wanderer'); }, nameKey: 'item_wanderer', price: 8000000 },
    { id: 'lostsymphony', get name() { return t('dn_the_lost_symphony'); }, nameKey: 'item_lostsymphony', price: 5000000 },
  ],
  domains: [
    { id: 'commerce', name: 'commerce.net', nameKey: 'item_commerce', price: 50000000 },
    { id: 'voice', name: 'voice.io', nameKey: 'item_voice', price: 35000000 },
    { id: 'crypto', name: 'crypto.world', nameKey: 'item_crypto', price: 25000000 },
    { id: 'wealth', name: 'wealth.io', nameKey: 'item_wealth', price: 18000000 },
    { id: 'hotels', name: 'hotels.global', nameKey: 'item_hotels', price: 12000000 },
    { id: 'insurance', name: 'insurance.net', nameKey: 'item_insurance', price: 8000000 },
    { id: 'cars', name: 'cars.io', nameKey: 'item_cars', price: 5000000 },
    { id: 'money', name: 'money.world', nameKey: 'item_money', price: 3500000 },
    { id: 'news', name: 'news.global', nameKey: 'item_news', price: 2500000 },
    { id: 'travel', name: 'travel.io', nameKey: 'item_travel', price: 1800000 },
    { id: 'health', name: 'health.world', nameKey: 'item_health', price: 1200000 },
    { id: 'games', name: 'games.io', nameKey: 'item_games', price: 800000 },
    { id: 'shop', name: 'shop.global', nameKey: 'item_shop', price: 500000 },
    { id: 'music', name: 'music.io', nameKey: 'item_music', price: 350000 },
    { id: 'art', name: 'art.world', nameKey: 'item_art', price: 250000 },
    { id: 'gold', name: 'gold.io', nameKey: 'item_gold', price: 180000 },
    { id: 'tech', name: 'tech.global', nameKey: 'item_tech', price: 120000 },
    { id: 'cloud', name: 'cloud.io', nameKey: 'item_cloud', price: 500000 },
  ],
  space: [
    { id: 'orbital', get name() { return t('dn_orbital_flight_ticket'); }, nameKey: 'item_orbital', price: 500000000 },
    { id: 'suborbital', get name() { return t('dn_suborbital_experience_pass'); }, nameKey: 'item_suborbital', price: 350000000 },
    { id: 'lunartranq', get name() { return t('dn_lunar_land_deed_tranquility_basin'); }, nameKey: 'item_lunartranq', price: 250000000 },
    { id: 'marscolony', get name() { return t('dn_mars_colony_reservation'); }, nameKey: 'item_marscolony', price: 180000000 },
    { id: 'satellite', get name() { return t('dn_satellite_claim_low_orbit'); }, nameKey: 'item_satellite', price: 120000000 },
    { id: 'stationpass', get name() { return t('dn_space_station_week_pass'); }, nameKey: 'item_stationpass', price: 80000000 },
    { id: 'lunarsouth', get name() { return t('dn_lunar_south_pole_claim'); }, nameKey: 'item_lunarsouth', price: 50000000 },
    { id: 'asteroid', get name() { return t('dn_asteroid_mining_license'); }, nameKey: 'item_asteroid', price: 35000000 },
    { id: 'spacehotel', get name() { return t('dn_space_hotel_reservation'); }, nameKey: 'item_spacehotel', price: 25000000 },
    { id: 'zerog', get name() { return t('dn_zero_gravity_training_package'); }, nameKey: 'item_zerog', price: 18000000 },
    { id: 'sunsetcruise', get name() { return t('dn_orbital_sunset_cruise'); }, nameKey: 'item_sunsetcruise', price: 12000000 },
    { id: 'marsoneway', get name() { return t('dn_mars_one_way_ticket'); }, nameKey: 'item_marsoneway', price: 8000000 },
    { id: 'europa', get name() { return t('dn_europa_lander_mission_share'); }, nameKey: 'item_europa', price: 5000000 },
    { id: 'titan', get name() { return t('dn_titan_probe_share'); }, nameKey: 'item_titan', price: 3500000 },
    { id: 'telescope', get name() { return t('dn_space_telescope_naming_rights'); }, nameKey: 'item_telescope', price: 2500000 },
    { id: 'solarail', get name() { return t('dn_solar_sail_charter'); }, nameKey: 'item_solarail', price: 1800000 },
    { id: 'interstellar', get name() { return t('dn_interstellar_message_slot'); }, nameKey: 'item_interstellar', price: 1200000 },
    { id: 'deepspace', get name() { return t('dn_deep_space_probe_co_sponsorship'); }, nameKey: 'item_deepspace', price: 1000000 },
  ],
  estates: [
    { id: 'ashwood', get name() { return t('dn_ashwood_manor'); }, nameKey: 'item_ashwood', price: 10000000 },
    { id: 'ravencrest', get name() { return t('dn_ravencrest_hall'); }, nameKey: 'item_ravencrest', price: 50000000 },
    { id: 'goldspire', get name() { return t('dn_goldspire_palace'); }, nameKey: 'item_goldspire', price: 250000000 },
    { id: 'thornfield', get name() { return t('dn_thornfield_house'); }, nameKey: 'item_thornfield', price: 750000000 },
    { id: 'crestview', get name() { return t('dn_crestview_mansion'); }, nameKey: 'item_crestview', price: 2500000000 },
    { id: 'seaview', get name() { return t('dn_seaview_manor'); }, nameKey: 'item_seaview', price: 3500000000 },
    { id: 'dawnridge', get name() { return t('dn_dawnridge_palace'); }, nameKey: 'item_dawnridge', price: 4500000000 },
    { id: 'rosemont', get name() { return t('dn_rosemont_hall'); }, nameKey: 'item_rosemont', price: 4900000000 },
  ],
};

// ─── Price tiering ───
// Raw prices above are authored on a compact scale. These multipliers lift
// each category into post-Bank territory ($2.5B+) so Legacy is genuinely
// endgame content rather than something affordable during the mid game.

const CATEGORY_SCALE = {
  spirits: 500,
  artifacts: 100,
  timepieces: 300,
  jewels: 100,
  meteorites: 200,
  books: 300,
  domains: 500,
  space: 120,
  estates: 100,
};

// ─── Tuning ───

const BASE_APPRECIATION_PER_YEAR = 0.35; // +35%/yr held
const GALLERY_APPRECIATION_BONUS = 1.0; // gallery doubles the rate
const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

const ESTATE_YIELD_PER_HOUR = 0.0015; // 0.15% of value per hour
const SET_BONUS_PER_CATEGORY = 0.02; // +2% business income per completed set

export const EXCHANGE_COMMISSION = 0.08; // 8% fee when selling

// Deterministic hash so every item has a stable personality without
// needing to persist extra state.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function seededNoise(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function itemKey(categoryId, itemId) {
  return `${categoryId}:${itemId}`;
}

// ─── Category / item lookup ───

export function getCategory(id) {
  return COLLECTION_CATEGORIES.find((c) => c.id === id);
}

export function getItemsByCategory(categoryId) {
  return COLLECTION_ITEMS[categoryId] || [];
}

export function getItem(categoryId, itemId) {
  const items = COLLECTION_ITEMS[categoryId] || [];
  return items.find((i) => i.id === itemId);
}

export function getItemPrice(categoryId, item) {
  if (!item) return 0;
  return Math.round(item.price * (CATEGORY_SCALE[categoryId] || 1));
}

export function getItemPriceById(categoryId, itemId) {
  return getItemPrice(categoryId, getItem(categoryId, itemId));
}

// Per-item volatility derived from its id. Roughly 0.5x - 1.8x the base
// appreciation rate, so some pieces are far better investments than others.
export function getItemVolatility(categoryId, itemId) {
  return 0.5 + hashString(itemKey(categoryId, itemId)) * 1.3;
}

// ─── Ownership ───

export function getOwnedItems(progression) {
  return (progression && progression.ownedItems) || [];
}

export function hasOwnedEstate(progression) {
  return getOwnedItems(progression).some((i) => i.categoryId === 'estates');
}

export function getOwnedItemsByCategory(progression, categoryId) {
  return getOwnedItems(progression).filter((i) => i.categoryId === categoryId);
}

export function isOwned(progression, categoryId, itemId) {
  return getOwnedItems(progression).some(
    (i) => i.categoryId === categoryId && i.itemId === itemId
  );
}

export function getOwnedCount(progression) {
  return getOwnedItems(progression).length;
}

export function getOwnedEntry(progression, categoryId, itemId) {
  return getOwnedItems(progression).find(
    (i) => i.categoryId === categoryId && i.itemId === itemId
  );
}

// ─── Display areas ───
// Estates grant display capacity, so growing your property portfolio is
// what lets you exhibit more of the collection.

export const STORAGE_AREAS = [
  {
    id: 'vault',
    get name() { return t('dn_the_vault'); }, nameKey: 'item_vault',
    icon: 'lock-closed',
    color: '#94a3b8',
    blurb: t('legacy_blurb_storage'),
    unlimited: false,
  },
  {
    id: 'gallery',
    get name() { return t('dn_the_gallery'); }, nameKey: 'item_gallery',
    icon: 'image',
    color: '#a78bfa',
    blurb: t('legacy_blurb_exhibited'),
    unlimited: false,
  },
  {
    id: 'showroom',
    get name() { return t('dn_the_showroom'); }, nameKey: 'item_showroom',
    icon: 'sparkles',
    color: '#fbbf24',
    blurb: t('legacy_blurb_displayed'),
    unlimited: false,
  },
];

export function getEstateSlots(estateId) {
  const idx = COLLECTION_ITEMS.estates.findIndex((e) => e.id === estateId);
  return idx < 0 ? 0 : 2 + idx;
}

// Exhibition space (Gallery / Showroom) comes purely from property.
export function getTotalDisplayCapacity(progression) {
  return getOwnedItemsByCategory(progression, 'estates').reduce(
    (sum, e) => sum + getEstateSlots(e.itemId),
    0
  );
}

// ─── Estate upgrades ───
// Six independent improvement lines per property. Each level lifts that
// estate's valuation, which in turn lifts its hourly yield.

export const ESTATE_UPGRADES = [
  { id: 'grounds', get name() { return t('dn_landscaped_grounds'); }, nameKey: 'item_grounds', icon: 'leaf', valueBonus: 0.04, costPct: 0.05 },
  { id: 'wing', get name() { return t('dn_west_wing_extension'); }, nameKey: 'item_wing', icon: 'business', valueBonus: 0.08, costPct: 0.12 },
  { id: 'spa', get name() { return t('dn_infinity_pool_spa'); }, nameKey: 'item_spa', icon: 'water', valueBonus: 0.05, costPct: 0.06 },
  { id: 'cellar', get name() { return t('dn_climate_wine_cellar'); }, nameKey: 'item_cellar', icon: 'wine', valueBonus: 0.05, costPct: 0.055 },
  { id: 'helipad', get name() { return t('dn_private_helipad'); }, nameKey: 'item_helipad', icon: 'airplane', valueBonus: 0.07, costPct: 0.09 },
  { id: 'systems', get name() { return t('dn_smart_estate_systems'); }, nameKey: 'item_systems', icon: 'hardware-chip', valueBonus: 0.06, costPct: 0.07 },
];

export const ESTATE_UPGRADE_MAX_LEVEL = 5;

export function getEstateUpgradeLevel(progression, estateId, upgradeId) {
  const all = (progression && progression.estateUpgrades) || {};
  return (all[estateId] || {})[upgradeId] || 0;
}

export function getEstateUpgradeCost(estateId, upgradeId, level) {
  const upgrade = ESTATE_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return 0;
  const base = getItemPriceById('estates', estateId) * upgrade.costPct;
  return Math.round(base * Math.pow(1.55, level));
}

// Combined valuation multiplier from every improvement on a property.
export function getEstateUpgradeMultiplier(progression, estateId) {
  return ESTATE_UPGRADES.reduce((mult, u) => {
    return mult + u.valueBonus * getEstateUpgradeLevel(progression, estateId, u.id);
  }, 1);
}

export function getEstateUpgradeCount(progression, estateId) {
  return ESTATE_UPGRADES.reduce(
    (sum, u) => sum + getEstateUpgradeLevel(progression, estateId, u.id),
    0
  );
}

export function upgradeEstate(progression, estateId, upgradeId) {
  const level = getEstateUpgradeLevel(progression, estateId, upgradeId);
  if (level >= ESTATE_UPGRADE_MAX_LEVEL) return { progression, error: 'max_level' };
  const cost = getEstateUpgradeCost(estateId, upgradeId, level);
  const all = { ...((progression && progression.estateUpgrades) || {}) };
  all[estateId] = { ...(all[estateId] || {}), [upgradeId]: level + 1 };
  return { progression: { ...progression, estateUpgrades: all }, cost };
}

// ─── Security ───
// Guards are what make the Vault bigger, so storage growth is a spend
// decision rather than something that happens for free.

export const VAULT_CAPACITY_PER_GUARD = 6;
const VAULT_BASE_MULTIPLIER = 2; // vault slots per display slot, before guards

export function getEstateGuards(progression, estateId) {
  const all = (progression && progression.estateSecurity) || {};
  return all[estateId] || 0;
}

export function getTotalGuards(progression) {
  return getOwnedItemsByCategory(progression, 'estates').reduce(
    (sum, e) => sum + getEstateGuards(progression, e.itemId),
    0
  );
}

export function getGuardHireCost(progression, estateId) {
  const guards = getEstateGuards(progression, estateId);
  const base = getItemPriceById('estates', estateId) * 0.02;
  return Math.round(base * Math.pow(1.4, guards));
}

export function hireGuard(progression, estateId) {
  const guards = getEstateGuards(progression, estateId);
  const cost = getGuardHireCost(progression, estateId);
  const all = { ...((progression && progression.estateSecurity) || {}) };
  all[estateId] = guards + 1;
  return { progression: { ...progression, estateSecurity: all }, cost };
}

export function getVaultCapacity(progression) {
  return getOwnedItemsByCategory(progression, 'estates').reduce((sum, e) => {
    const base = getEstateSlots(e.itemId) * VAULT_BASE_MULTIPLIER;
    return sum + base + getEstateGuards(progression, e.itemId) * VAULT_CAPACITY_PER_GUARD;
  }, 0);
}

// Capacity for a given room. Vault scales with security, the exhibition
// rooms scale with the properties themselves.
export function getAreaCapacity(progression, areaId) {
  if (areaId === 'vault') return getVaultCapacity(progression);
  return getTotalDisplayCapacity(progression);
}

export function getDisplayed(progression, areaId) {
  const d = (progression && progression.displayed) || {};
  return d[areaId] || [];
}

// Property is managed from the estate portfolio and never occupies a
// storage slot - only collectibles live in the rooms.
export function isStorable(categoryId) {
  return categoryId !== 'estates';
}

export function getStorableItems(progression) {
  return getOwnedItems(progression).filter((i) => isStorable(i.categoryId));
}

export function getAreaUsage(progression, areaId) {
  // The Vault is implicit: it holds every piece not currently exhibited.
  if (areaId === 'vault') {
    const exhibited =
      getDisplayed(progression, 'gallery').length + getDisplayed(progression, 'showroom').length;
    return Math.max(0, getStorableItems(progression).length - exhibited);
  }
  return getDisplayed(progression, areaId).length;
}

export function getItemArea(progression, categoryId, itemId) {
  const key = itemKey(categoryId, itemId);
  for (const area of STORAGE_AREAS) {
    if (area.unlimited) continue;
    if (getDisplayed(progression, area.id).includes(key)) return area.id;
  }
  return 'vault';
}

export function setItemArea(progression, categoryId, itemId, areaId) {
  if (!isStorable(categoryId)) return { progression, error: 'not_storable' };
  const key = itemKey(categoryId, itemId);
  const displayed = { ...((progression && progression.displayed) || {}) };
  for (const area of STORAGE_AREAS) {
    displayed[area.id] = (displayed[area.id] || []).filter((k) => k !== key);
  }
  if (areaId !== 'vault') {
    if ((displayed[areaId] || []).length >= getAreaCapacity(progression, areaId)) {
      return { progression, error: 'no_capacity' };
    }
    displayed[areaId] = [...(displayed[areaId] || []), key];
  }
  return { progression: { ...progression, displayed } };
}

// ─── Appreciation ───
// Value grows with real elapsed hold time. Gallery pieces grow twice as
// fast. A slow sine wave on top means values also wobble, so timing a
// sale on the Exchange matters.

export function getItemValue(progression, entry, now = Date.now()) {
  const def = getItem(entry.categoryId, entry.itemId);
  if (!def) return 0;
  const base = getItemPrice(entry.categoryId, def);
  const heldMs = Math.max(0, now - (entry.purchasedAt || now));
  const years = heldMs / MS_PER_YEAR;

  const volatility = getItemVolatility(entry.categoryId, entry.itemId);
  const inGallery = getItemArea(progression, entry.categoryId, entry.itemId) === 'gallery';
  const rate =
    BASE_APPRECIATION_PER_YEAR * volatility * (inGallery ? 1 + GALLERY_APPRECIATION_BONUS : 1);

  const growth = 1 + rate * years;
  const phase = hashString(itemKey(entry.categoryId, entry.itemId)) * Math.PI * 2;
  const wobble = 1 + Math.sin(heldMs / (6 * 60 * 60 * 1000) + phase) * 0.06;

  // Improvements only apply to property.
  const improvements =
    entry.categoryId === 'estates'
      ? getEstateUpgradeMultiplier(progression, entry.itemId)
      : 1;

  return Math.round(base * growth * wobble * improvements);
}

export function getEntryCost(entry) {
  if (entry.paid != null) return entry.paid;
  return getItemPriceById(entry.categoryId, entry.itemId);
}

export function getItemGain(progression, entry, now = Date.now()) {
  const cost = getEntryCost(entry);
  const value = getItemValue(progression, entry, now);
  const gain = value - cost;
  return { value, cost, gain, percent: cost > 0 ? (gain / cost) * 100 : 0 };
}

export function getTotalCollectionValue(progression, now = Date.now()) {
  return getOwnedItems(progression).reduce(
    (sum, entry) => sum + getItemValue(progression, entry, now),
    0
  );
}

export function getTotalInvested(progression) {
  return getOwnedItems(progression).reduce((sum, entry) => sum + getEntryCost(entry), 0);
}

export function getAppreciationPerHour(progression, now = Date.now()) {
  const hour = 60 * 60 * 1000;
  return Math.max(
    0,
    getTotalCollectionValue(progression, now + hour) - getTotalCollectionValue(progression, now)
  );
}

// ─── Estate income ───

export function getEstateHourlyIncome(progression, now = Date.now()) {
  return getOwnedItemsByCategory(progression, 'estates').reduce(
    (sum, entry) => sum + getItemValue(progression, entry, now) * ESTATE_YIELD_PER_HOUR,
    0
  );
}

// ─── Set bonuses & prestige ───

export function getCompletedSets(progression) {
  return COLLECTION_CATEGORIES.filter((cat) => {
    const total = getItemsByCategory(cat.id).length;
    return total > 0 && getOwnedItemsByCategory(progression, cat.id).length === total;
  }).map((c) => c.id);
}

// Multiplier applied to all business income.
export function getSetBonusMultiplier(progression) {
  return 1 + getCompletedSets(progression).length * SET_BONUS_PER_CATEGORY;
}

export function getPrestige(progression, now = Date.now()) {
  const valueScore = Math.floor(getTotalCollectionValue(progression, now) / 1e9);
  const setScore = getCompletedSets(progression).length * 250;
  const showroomValue = getDisplayed(progression, 'showroom').reduce((sum, key) => {
    const [categoryId, itemId] = key.split(':');
    const entry = getOwnedEntry(progression, categoryId, itemId);
    return sum + (entry ? getItemValue(progression, entry, now) * 0.25 : 0);
  }, 0);
  return valueScore + setScore + Math.floor(showroomValue / 1e9);
}

// ─── Acquiring & selling ───

export function buyItem(progression, categoryId, itemId, paid) {
  const item = getItem(categoryId, itemId);
  if (!item) return { progression, error: 'not_found' };
  if (isOwned(progression, categoryId, itemId)) {
    return { progression, error: 'already_owned' };
  }
  const cost = paid != null ? paid : getItemPrice(categoryId, item);
  if (categoryId === 'estates') {
    try { require('./stats').recordEstateBought(); } catch (e) { /* stats best-effort */ }
  }
  return {
    progression: {
      ...progression,
      ownedItems: [
        ...getOwnedItems(progression),
        { categoryId, itemId, purchasedAt: Date.now(), paid: cost },
      ],
    },
    cost,
  };
}

export function sellItem(progression, categoryId, itemId, now = Date.now()) {
  const entry = getOwnedEntry(progression, categoryId, itemId);
  if (!entry) return { progression, error: 'not_owned' };
  const { gross, proceeds } = getExchangeQuote(progression, entry, now);
  const key = itemKey(categoryId, itemId);
  const displayed = { ...((progression && progression.displayed) || {}) };
  for (const area of STORAGE_AREAS) {
    displayed[area.id] = (displayed[area.id] || []).filter((k) => k !== key);
  }
  return {
    progression: {
      ...progression,
      displayed,
      ownedItems: getOwnedItems(progression).filter(
        (i) => !(i.categoryId === categoryId && i.itemId === itemId)
      ),
    },
    proceeds,
    gross,
    commission: gross - proceeds,
  };
}

// ─── Acquisition channels ───
// All three channels derive their inventory from the clock, so stock
// rotates on its own and survives restarts without extra persistence.

const AUCTION_WINDOW_MS = 10 * 60 * 1000; // fresh lots every 10 minutes
const DEALER_WINDOW_MS = 60 * 60 * 1000; // dealer restocks hourly
const EXCHANGE_WINDOW_MS = 60 * 1000; // exchange reprices every minute

function unownedPool(progression) {
  const pool = [];
  for (const cat of COLLECTION_CATEGORIES) {
    for (const item of getItemsByCategory(cat.id)) {
      if (!isOwned(progression, cat.id, item.id)) {
        pool.push({ categoryId: cat.id, itemId: item.id, name: item.name });
      }
    }
  }
  return pool;
}

function pickDeterministic(pool, count, seed) {
  const picks = [];
  const used = new Set();
  let cursor = seed;
  let guard = 0;
  while (picks.length < count && used.size < pool.length && guard < 500) {
    guard++;
    cursor = seededNoise(cursor + picks.length * 7.31 + guard * 0.013);
    const idx = Math.floor(cursor * pool.length) % pool.length;
    if (!used.has(idx)) {
      used.add(idx);
      picks.push(pool[idx]);
    }
  }
  return picks;
}

export function getAuctionWindow(now = Date.now()) {
  return Math.floor(now / AUCTION_WINDOW_MS);
}

export function getAuctionEndsAt(now = Date.now()) {
  return (getAuctionWindow(now) + 1) * AUCTION_WINDOW_MS;
}

// Three lots per window. Opening bids sit below market so there is room
// for rival bidders to push them up.
export function getAuctionLots(progression, now = Date.now()) {
  const window = getAuctionWindow(now);
  const pool = unownedPool(progression);
  if (pool.length === 0) return [];
  return pickDeterministic(pool, Math.min(3, pool.length), window * 1.7).map((pick, i) => {
    const market = getItemPriceById(pick.categoryId, pick.itemId);
    const openingBid = Math.round(market * (0.45 + seededNoise(window + i * 3.3) * 0.2));
    // How far rivals will chase it, as a fraction of market value.
    const rivalCeiling = Math.round(market * (0.8 + seededNoise(window + i * 5.9) * 0.45));
    return {
      ...pick,
      lotId: `${window}-${pick.categoryId}-${pick.itemId}`,
      market,
      openingBid,
      rivalCeiling,
      rivalCount: 2 + Math.floor(seededNoise(window + i * 8.1) * 3),
    };
  });
}

// ─── Auction bids (persisted) ───
// Bids live in progression so they survive leaving the screen. Each record
// carries everything settlement needs, so lots can be resolved later
// without regenerating the original window.

export function getAuctionBids(progression) {
  return (progression && progression.auctionBids) || {};
}

export function getAuctionBid(progression, lotId) {
  return getAuctionBids(progression)[lotId] || null;
}

// Bids are no longer escrowed at bid time - the hammer price is charged at
// settlement. `escrowed` is kept on the record only so lots bid on under the
// old system still settle correctly (their money was already taken).
export function getAuctionEscrowDelta(progression, lotId, amount) {
  const existing = getAuctionBids(progression)[lotId];
  const held = existing && Number.isFinite(existing.escrowed) ? existing.escrowed : 0;
  return Math.max(0, amount - held);
}

export function placeAuctionBid(progression, lot, amount, leader, leaderName) {
  const bids = { ...getAuctionBids(progression) };
  const existing = bids[lot.lotId];
  const held = existing && Number.isFinite(existing.escrowed) ? existing.escrowed : 0;
  bids[lot.lotId] = {
    escrowed: held,
    lotId: lot.lotId,
    window: getAuctionWindow(),
    categoryId: lot.categoryId,
    itemId: lot.itemId,
    name: lot.name,
    market: lot.market,
    rivalCeiling: lot.rivalCeiling,
    currentBid: amount,
    leader,
    leaderName,
    bidCount: (existing ? existing.bidCount : 0) + 1,
  };
  return { ...progression, auctionBids: bids };
}

// Settles every lot from a closed window. Winning requires having bid past
// what the room was willing to pay, which is the same rule the live screen
// enforces, so leaving mid-auction gives the same outcome as staying.
// `availableFunds` is the player's balance: a winning bid they can no longer
// cover lapses back to the room instead of minting a free item.
export function resolveAuctions(progression, now = Date.now(), availableFunds = Infinity) {
  const currentWindow = getAuctionWindow(now);
  const bids = getAuctionBids(progression);
  const lotIds = Object.keys(bids);
  if (lotIds.length === 0) return { progression, won: [], lost: [], spent: 0, refund: 0 };
  const remaining = {};
  const won = [];
  const lost = [];
  let next = progression;
  let funds = availableFunds;
  let spent = 0;
  let refund = 0;
  let settledAny = false;

  for (const lotId of lotIds) {
    const record = bids[lotId];
    if (record.window >= currentWindow) {
      remaining[lotId] = record;
      continue;
    }
    settledAny = true;
    const held = Number.isFinite(record.escrowed) ? record.escrowed : 0;
    const playerWon =
      record.leader === 'player' && record.currentBid >= record.rivalCeiling;
    const due = Math.max(0, record.currentBid - held);
    if (playerWon && !isOwned(next, record.categoryId, record.itemId) && funds >= due) {
      const result = buyItem(next, record.categoryId, record.itemId, record.currentBid);
      if (!result.error) {
        next = result.progression;
        spent += due;
        funds -= due;
        refund += Math.max(0, held - record.currentBid);
        won.push({ name: record.name, price: record.currentBid });
        continue;
      }
    }
    // Lost, outbid, already owned, or couldn't cover the hammer: return
    // whatever the player had escrowed (zero under the no-escrow system).
    refund += held;
    if (record.leader === 'player') lost.push({ name: record.name, price: record.currentBid });
  }

  if (!settledAny) return { progression, won, lost, spent, refund };
  return { progression: { ...next, auctionBids: remaining }, won, lost, spent, refund };
}

export function getDealerWindow(now = Date.now()) {
  return Math.floor(now / DEALER_WINDOW_MS);
}

export function getDealerRestockAt(now = Date.now()) {
  return (getDealerWindow(now) + 1) * DEALER_WINDOW_MS;
}

// The dealer asks above market but privately accepts less. `floorPrice` is
// the hidden walk-away figure that offers are tested against.
export function getDealerStock(progression, now = Date.now()) {
  const window = getDealerWindow(now);
  const pool = unownedPool(progression);
  if (pool.length === 0) return [];
  return pickDeterministic(pool, Math.min(4, pool.length), window * 2.9).map((pick, i) => {
    const market = getItemPriceById(pick.categoryId, pick.itemId);
    const askMult = 1.05 + seededNoise(window + i * 4.2) * 0.3;
    const floorMult = 0.78 + seededNoise(window + i * 6.6) * 0.17;
    return {
      ...pick,
      dealId: `${window}-${pick.categoryId}-${pick.itemId}`,
      market,
      askPrice: Math.round(market * askMult),
      floorPrice: Math.round(market * floorMult),
      patience: 3, // lowball offers tolerated before they walk away
    };
  });
}

export function getExchangeWindow(now = Date.now()) {
  return Math.floor(now / EXCHANGE_WINDOW_MS);
}

export function getExchangeNextTickAt(now = Date.now()) {
  return (getExchangeWindow(now) + 1) * EXCHANGE_WINDOW_MS;
}

// Live multiplier that moves every minute, applied on top of an item's
// appreciated value to give the Exchange its own spread.
export function getExchangeMultiplier(categoryId, itemId, now = Date.now()) {
  const window = getExchangeWindow(now);
  const base = hashString(itemKey(categoryId, itemId));
  return 0.9 + seededNoise(window * 1.13 + base * 100) * 0.25;
}

export function getExchangeQuote(progression, entry, now = Date.now()) {
  const value = getItemValue(progression, entry, now);
  const multiplier = getExchangeMultiplier(entry.categoryId, entry.itemId, now);
  const gross = Math.round(value * multiplier);
  return { gross, proceeds: Math.round(gross * (1 - EXCHANGE_COMMISSION)), multiplier };
}

// ─── Retail acquisitions ───
// Buying straight from a boutique is the lazy route: you pay a hefty
// premium and still wait for delivery. The channels exist to beat this.

export const RETAIL_MARKUP = 1.5;
const DELIVERY_MIN_MS = 3 * 1000;
const DELIVERY_MAX_MS = 45 * 60 * 1000;

export function getRetailPrice(categoryId, itemId) {
  return Math.round(getItemPriceById(categoryId, itemId) * RETAIL_MARKUP);
}

function randomDeliveryMs() {
  return Math.round(DELIVERY_MIN_MS + Math.random() * (DELIVERY_MAX_MS - DELIVERY_MIN_MS));
}

export function getPendingAcquisitions(progression) {
  return (progression && progression.pendingAcquisitions) || [];
}

export function getPendingAcquisition(progression, categoryId, itemId) {
  return getPendingAcquisitions(progression).find(
    (p) => p.categoryId === categoryId && p.itemId === itemId
  );
}

export function startAcquisition(progression, categoryId, itemId) {
  const item = getItem(categoryId, itemId);
  if (!item) return { progression, error: 'not_found' };
  if (isOwned(progression, categoryId, itemId)) return { progression, error: 'already_owned' };
  if (getPendingAcquisition(progression, categoryId, itemId)) {
    return { progression, error: 'already_pending' };
  }
  const cost = getRetailPrice(categoryId, itemId);
  const startedAt = Date.now();
  const pending = {
    id: `${categoryId}-${itemId}-${startedAt}`,
    categoryId,
    itemId,
    name: item.name,
    paid: cost,
    startedAt,
    completesAt: startedAt + scaleDuration(Math.random() < 0.3 ? 0 : randomDeliveryMs()),
  };
  return {
    progression: {
      ...progression,
      pendingAcquisitions: [...getPendingAcquisitions(progression), pending],
    },
    cost,
  };
}

export function rushAcquisition(progression, pendingId) {
  return {
    progression: {
      ...progression,
      pendingAcquisitions: getPendingAcquisitions(progression).map((p) =>
        p.id === pendingId ? { ...p, completesAt: Date.now() } : p
      ),
    },
  };
}

// Moves any delivered purchases into the collection.
export function processAcquisitions(progression, now = Date.now()) {
  const pending = getPendingAcquisitions(progression);
  if (pending.length === 0) return { progression, completed: [] };

  const completed = [];
  let next = progression;
  const remaining = [];

  for (const p of pending) {
    if (p.completesAt > now) {
      remaining.push(p);
      continue;
    }
    const result = buyItem(next, p.categoryId, p.itemId, p.paid);
    if (!result.error) {
      next = result.progression;
      completed.push(p);
    }
  }

  if (completed.length === 0) return { progression, completed: [] };
  return { progression: { ...next, pendingAcquisitions: remaining }, completed };
}

// ─── Estate works ───
// Improvements and new security staff take time to land, which is what
// gives the rewarded-ad skip something to skip.

const UPGRADE_BUILD_MS = 20 * 60 * 1000;
const GUARD_ONBOARD_MS = 10 * 60 * 1000;

export function getEstateWorks(progression) {
  return (progression && progression.estateWorks) || [];
}

export function getEstateWork(progression, estateId, kind, upgradeId) {
  return getEstateWorks(progression).find(
    (w) => w.estateId === estateId && w.kind === kind && (!upgradeId || w.upgradeId === upgradeId)
  );
}

export function startEstateUpgrade(progression, estateId, upgradeId) {
  const level = getEstateUpgradeLevel(progression, estateId, upgradeId);
  if (level >= ESTATE_UPGRADE_MAX_LEVEL) return { progression, error: 'max_level' };
  if (getEstateWork(progression, estateId, 'upgrade', upgradeId)) {
    return { progression, error: 'already_running' };
  }
  const cost = getEstateUpgradeCost(estateId, upgradeId, level);
  const upgrade = ESTATE_UPGRADES.find((u) => u.id === upgradeId);
  const startedAt = Date.now();
  const work = {
    id: `${estateId}-${upgradeId}-${startedAt}`,
    estateId,
    kind: 'upgrade',
    upgradeId,
    label: upgrade ? upgrade.name : 'Improvement',
    startedAt,
    completesAt: startedAt + scaleDuration(Math.random() < 0.3 ? 0 : UPGRADE_BUILD_MS),
  };
  return {
    progression: { ...progression, estateWorks: [...getEstateWorks(progression), work] },
    cost,
  };
}

export function startGuardHire(progression, estateId) {
  if (getEstateWork(progression, estateId, 'guard')) {
    return { progression, error: 'already_running' };
  }
  const cost = getGuardHireCost(progression, estateId);
  const startedAt = Date.now();
  const work = {
    id: `${estateId}-guard-${startedAt}`,
    estateId,
    kind: 'guard',
    label: t('progression_security_vetting'),
    startedAt,
    completesAt: startedAt + scaleDuration(Math.random() < 0.3 ? 0 : GUARD_ONBOARD_MS),
  };
  return {
    progression: { ...progression, estateWorks: [...getEstateWorks(progression), work] },
    cost,
  };
}

export function rushEstateWork(progression, workId) {
  return {
    progression: {
      ...progression,
      estateWorks: getEstateWorks(progression).map((w) =>
        w.id === workId ? { ...w, completesAt: Date.now() } : w
      ),
    },
  };
}

export function processEstateWorks(progression, now = Date.now()) {
  const works = getEstateWorks(progression);
  if (works.length === 0) return { progression, completed: [] };

  const completed = [];
  const remaining = [];
  const upgrades = { ...((progression && progression.estateUpgrades) || {}) };
  const security = { ...((progression && progression.estateSecurity) || {}) };

  for (const w of works) {
    if (w.completesAt > now) {
      remaining.push(w);
      continue;
    }
    if (w.kind === 'upgrade') {
      const current = (upgrades[w.estateId] || {})[w.upgradeId] || 0;
      upgrades[w.estateId] = {
        ...(upgrades[w.estateId] || {}),
        [w.upgradeId]: Math.min(ESTATE_UPGRADE_MAX_LEVEL, current + 1),
      };
    } else if (w.kind === 'guard') {
      security[w.estateId] = (security[w.estateId] || 0) + 1;
    }
    completed.push(w);
  }

  if (completed.length === 0) return { progression, completed: [] };
  return {
    progression: {
      ...progression,
      estateUpgrades: upgrades,
      estateSecurity: security,
      estateWorks: remaining,
    },
    completed,
  };
}

// ─── Auction rival simulation ───
// Runs from the app tick so rivals keep bidding whether or not the auction
// screen is open, and reports what happened for notifications.

const RIVAL_NAMES = [
  'Blackwood Trust',
  'Anonymous Bidder',
  'Halloran Group',
  'Vance Holdings',
  'The Consortium',
  'Marchetti Family',
  'Paddle 12',
  'Northgate Capital',
];

export function tickAuctions(progression, now = Date.now()) {
  const bids = getAuctionBids(progression);
  const lotIds = Object.keys(bids);
  if (lotIds.length === 0) return { progression, events: [] };

  const currentWindow = getAuctionWindow(now);
  const events = [];
  const next = { ...bids };
  let changed = false;

  for (const lotId of lotIds) {
    const record = next[lotId];
    if (record.window !== currentWindow) continue;
    if (record.leader !== 'player') continue;
    if (record.currentBid >= record.rivalCeiling) continue;
    if (Math.random() > 0.5) continue;

    const raise = Math.round(record.currentBid * (1.03 + Math.random() * 0.06));
    const bid = Math.min(raise, record.rivalCeiling);
    if (bid <= record.currentBid) continue;

    const by = RIVAL_NAMES[Math.floor(Math.random() * RIVAL_NAMES.length)];
    next[lotId] = { ...record, currentBid: bid, leader: 'room', leaderName: by, bidCount: record.bidCount + 1 };
    changed = true;
    events.push({ type: 'outbid', name: record.name, bid, by, lotId });
  }

  if (!changed) return { progression, events: [] };
  return { progression: { ...progression, auctionBids: next }, events };
}

export function createInitialProgression() {
  return {
    ownedItems: [],
    displayed: { vault: [], gallery: [], showroom: [] },
    estateUpgrades: {},
    estateSecurity: {},
    estateWorks: [],
    auctionBids: {},
    pendingAcquisitions: [],
  };
}
