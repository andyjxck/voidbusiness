import { formatMoney } from './market';
import { t } from './i18n';
import { isSuspended } from './businesses';
import { scaleDuration } from './store';

// ─── Staff costs (mirrors courier pattern) ───
export const STAFF_HIRE_COST = 4000000;
export const STAFF_SALARY_HOURLY = 2000;
export const STAFF_HIRE_MIN_MS = 3000;
export const STAFF_HIRE_MAX_MS = 45 * 60 * 1000;
export const MAX_HIRING_AT_ONCE = 3;

// ─── Game lifecycle ───
export const GAME_LIFESPAN_HOURS = 120; // 5 days of earning
export const MAX_ACTIVE_GAMES = 5;
export const CONTRACT_LIFESPAN_HOURS = 48; // 2 days of earning
export const MAX_ACTIVE_CONTRACTS = 3;
export const CONTRACT_REFRESH_HOURS = 0.25; // 15 minutes
export const MARKETING_BASE_COST = 1500000;
export const MARKETING_BASE_HOURS = 6; // each marketing adds up to 6h of lifespan

// ─── Fatigue system ───
// Releasing games with the same topic/genre in quick
// succession causes audience fatigue, lowering rating, lifespan, and income.
export const FATIGUE_WINDOW_HOURS = 168; // 7 days: releases within this window contribute
export const FATIGUE_PER_REPEAT = 0.08; // each repeat in window adds 8% fatigue
export const FATIGUE_MAX = 0.6; // max 60% total penalty

// ─── Game sizes (inspired by GDT: Small, Medium, Large, AAA) ───
// devHours is now in fractional hours (0.2 = 12 min)
export const GAME_SIZES = [
  { id: 'small',  get name() { return t('dn_small'); },       devHours: 0.2,  cost: 1500000,    incomeMult: 1.0,  staffReq: 1,  staffUnlock: 1,  emoji: '🎮', get desc() { return t('dd_quick_indie_game'); } },
  { id: 'medium', get name() { return t('dn_medium'); },      devHours: 1,    cost: 7500000,    incomeMult: 2.5,  staffReq: 3,  staffUnlock: 4,  emoji: '🕹️', get desc() { return t('dd_full_commercial_release'); } },
  { id: 'large',  get name() { return t('dn_large'); },       devHours: 3,    cost: 30000000,   incomeMult: 6.0,  staffReq: 6,  staffUnlock: 10, emoji: '💿', get desc() { return t('dd_big_budget_production'); } },
  { id: 'aaa',    get name() { return t('dn_aaa'); },         devHours: 2.5,  cost: 112500000,  incomeMult: 15.0, staffReq: 12, staffUnlock: 20, emoji: '🏆', get desc() { return t('dd_blockbuster_title'); } },
];

// ─── Target Audiences (inspired by GDT) ───
export const AUDIENCES = [
  { id: 'young',    get name() { return t('dn_young'); },      emoji: '🧒', incomeMult: 0.8, staffUnlock: 1,  get desc() { return t('dd_kids_teens_broader_reach_lower_spend'); } },
  { id: 'everyone', get name() { return t('dn_everyone'); },  emoji: '👨‍👩‍👧', incomeMult: 1.0, staffUnlock: 1,  get desc() { return t('dd_mass_market_appeal'); } },
  { id: 'mature',   get name() { return t('dn_mature'); },    emoji: '🎭', incomeMult: 1.3, staffUnlock: 1,  get desc() { return t('dd_adults_higher_spend_niche_audience'); } },
];

// ─── Multi-selection limits ───
export const MAX_GENRES = 2;
export const MAX_PLATFORMS = 2;
// Each additional genre/platform adds this fraction of dev time
export const MULTI_GENRE_TIME_PENALTY = 0.3; // +30% dev time per extra genre
export const MULTI_PLATFORM_TIME_PENALTY = 0.2; // +20% dev time per extra platform

// ─── Genres (inspired by GDT) ───
// techDesignRatio: >1 = tech-heavy, <1 = design-heavy
// staffUnlock: minimum staff to unlock this genre
export const GENRES = [
  { id: 'action',     get name() { return t('dn_action'); },     emoji: '⚔️',  techDesignRatio: 1.8, incomeBase: 540000,  color: '#f87171', staffUnlock: 1 },
  { id: 'adventure',  get name() { return t('dn_adventure'); },  emoji: '🗺️',  techDesignRatio: 0.4, incomeBase: 450000,  color: '#fbbf24', staffUnlock: 1 },
  { id: 'casual',     get name() { return t('dn_casual'); },     emoji: '🎲',  techDesignRatio: 0.5, incomeBase: 360000,  color: '#fb923c', staffUnlock: 1 },
  { id: 'rpg',        get name() { return t('dn_rpg'); },        emoji: '🗡️',  techDesignRatio: 0.6, incomeBase: 900000,  color: '#a78bfa', staffUnlock: 5 },
  { id: 'simulation', get name() { return t('dn_simulation'); }, emoji: '🏗️',  techDesignRatio: 1.6, incomeBase: 720000,  color: '#34d399', staffUnlock: 8 },
  { id: 'strategy',   get name() { return t('dn_strategy'); },   emoji: '♟️',  techDesignRatio: 1.4, incomeBase: 630000,  color: '#38bdf8', staffUnlock: 12 },
];

// ─── Topics (inspired by GDT) ───
// Each topic has a fit multiplier per genre: 1.0 = great combo, 0.6 = strange combo
// staffUnlock: minimum staff to unlock this topic
export const TOPICS = [
  { id: 'fantasy',    get name() { return t('dn_fantasy'); },      emoji: '🐉', staffUnlock: 1,  fit: { action: 1.0, adventure: 1.0, rpg: 1.0, simulation: 0.8, strategy: 1.0, casual: 0.6 } },
  { id: 'scifi',      get name() { return t('dn_sci_fi'); },       emoji: '🚀', staffUnlock: 1,  fit: { action: 1.0, adventure: 1.0, rpg: 1.0, simulation: 0.9, strategy: 0.9, casual: 0.7 } },
  { id: 'military',   get name() { return t('dn_military'); },     emoji: '🎖️', staffUnlock: 1,  fit: { action: 1.0, adventure: 0.6, rpg: 0.8, simulation: 1.0, strategy: 1.0, casual: 0.6 } },
  { id: 'horror',     get name() { return t('dn_horror'); },       emoji: '👻', staffUnlock: 3,  fit: { action: 1.0, adventure: 1.0, rpg: 0.8, simulation: 0.6, strategy: 0.7, casual: 0.8 } },
  { id: 'racing',     get name() { return t('dn_racing'); },       emoji: '🏁', staffUnlock: 3,  fit: { action: 0.9, adventure: 0.6, rpg: 0.6, simulation: 1.0, strategy: 0.7, casual: 1.0 } },
  { id: 'medieval',   get name() { return t('dn_medieval'); },     emoji: '🏰', staffUnlock: 5,  fit: { action: 1.0, adventure: 1.0, rpg: 1.0, simulation: 0.8, strategy: 1.0, casual: 0.7 } },
  { id: 'cyberpunk',  get name() { return t('dn_cyberpunk'); },    emoji: '🦾', staffUnlock: 7,  fit: { action: 1.0, adventure: 0.8, rpg: 1.0, simulation: 0.8, strategy: 0.7, casual: 0.6 } },
  { id: 'pirate',     get name() { return t('dn_pirate'); },       emoji: '🏴‍☠️', staffUnlock: 7,  fit: { action: 0.8, adventure: 1.0, rpg: 0.9, simulation: 0.9, strategy: 0.7, casual: 0.8 } },
  { id: 'zombies',    get name() { return t('dn_zombies'); },      emoji: '🧟', staffUnlock: 10, fit: { action: 1.0, adventure: 0.7, rpg: 0.9, simulation: 0.7, strategy: 0.9, casual: 1.0 } },
  { id: 'space',      get name() { return t('dn_space'); },        emoji: '🌌', staffUnlock: 10, fit: { action: 1.0, adventure: 1.0, rpg: 1.0, simulation: 1.0, strategy: 0.9, casual: 0.7 } },
  { id: 'school',     get name() { return t('dn_school'); },       emoji: '🎒', staffUnlock: 14, fit: { action: 0.8, adventure: 1.0, rpg: 1.0, simulation: 1.0, strategy: 1.0, casual: 0.8 } },
  { id: 'mystery',    get name() { return t('dn_mystery'); },      emoji: '🔍', staffUnlock: 14, fit: { action: 0.6, adventure: 1.0, rpg: 1.0, simulation: 0.8, strategy: 0.6, casual: 0.8 } },
  { id: 'martial',    get name() { return t('dn_martial_arts'); }, emoji: '🥋', staffUnlock: 18, fit: { action: 1.0, adventure: 0.8, rpg: 1.0, simulation: 1.0, strategy: 0.7, casual: 1.0 } },
  { id: 'wildwest',   get name() { return t('dn_wild_west'); },    emoji: '🤠', staffUnlock: 18, fit: { action: 0.9, adventure: 0.7, rpg: 1.0, simulation: 0.6, strategy: 0.6, casual: 0.7 } },
  { id: 'music',      get name() { return t('dn_music'); },        emoji: '🎵', staffUnlock: 22, fit: { action: 1.0, adventure: 0.9, rpg: 0.6, simulation: 1.0, strategy: 0.6, casual: 1.0 } },
];

// ─── Platforms (inspired by GDT) ───
// marketShare affects sales, genreFit is a per-genre multiplier
export const PLATFORMS = [
  { id: 'pc',       get name() { return t('dn_pc'); },           emoji: '💻', marketShare: 0.9, cost: 0,     staffUnlock: 1,  genreFit: { action: 0.9, adventure: 1.0, rpg: 0.9, simulation: 1.0, strategy: 1.0, casual: 0.6 } },
  { id: 'mobile',   get name() { return t('dn_mobile'); },       emoji: '📱', marketShare: 1.2, cost: 0,     staffUnlock: 1,  genreFit: { action: 0.7, adventure: 0.6, rpg: 0.8, simulation: 0.9, strategy: 0.8, casual: 1.0 } },
  { id: 'console',  get name() { return t('dn_console'); },      emoji: '🎮', marketShare: 1.0, cost: 1500000,  staffUnlock: 4,  genreFit: { action: 1.0, adventure: 0.8, rpg: 1.0, simulation: 0.7, strategy: 0.7, casual: 0.8 } },
  { id: 'handheld', get name() { return t('dn_handheld'); },     emoji: '🕹️', marketShare: 0.8, cost: 750000,   staffUnlock: 6,  genreFit: { action: 0.8, adventure: 0.7, rpg: 0.9, simulation: 0.9, strategy: 0.6, casual: 1.0 } },
];

// ─── Contract types (inspired by GDT publisher contracts) ───
export const CONTRACT_TYPES = [
  { id: 'port',      get name() { return t('dn_game_port'); },         emoji: '🔄',  duration: 6,  upfront: 2250000,   royaltyPerHr: 135000,  staffReq: 2,  get desc() { return t('dd_port_an_existing_game_to_a_new_platform'); } },
  { id: 'dlc',       get name() { return t('dn_dlc_pack'); },          emoji: '📦',  duration: 10, upfront: 6000000,   royaltyPerHr: 315000,  staffReq: 4,  get desc() { return t('dd_create_downloadable_content_for_a_hit_ga'); } },
  { id: 'engine',    get name() { return t('dn_engine_licensing'); },  emoji: '⚙️',  duration: 12, upfront: 15000000,  royaltyPerHr: 720000,  staffReq: 6,  get desc() { return t('dd_license_your_engine_to_other_studios'); } },
  { id: 'publish',   get name() { return t('dn_publishing_deal'); },   emoji: '📝',  duration: 18, upfront: 37500000,  royaltyPerHr: 1800000, staffReq: 8,  get desc() { return t('dd_publish_and_market_a_partner_studio_s_ga'); } },
  { id: 'exclusive', get name() { return t('dn_exclusive_title'); },   emoji: '⭐',  duration: 24, upfront: 112500000, royaltyPerHr: 4500000, staffReq: 12, get desc() { return t('dd_develop_an_exclusive_title_for_a_platfor'); } },
];

// ─── Compatibility matrices ───
// +++ = 1.0, ++ = 0.8, ~ = 0.5, --- = 0.2
const FIT = { '+++': 1.0, '++': 0.8, '~': 0.5, '---': 0.2 };

// Topic × Genre
export const TOPIC_GENRE_FIT = {
  fantasy:    { action: 0.8, adventure: 1.0, casual: 0.5, rpg: 1.0, simulation: 0.2, strategy: 0.8 },
  scifi:      { action: 1.0, adventure: 0.8, casual: 0.2, rpg: 1.0, simulation: 0.8, strategy: 1.0 },
  military:   { action: 1.0, adventure: 0.5, casual: 0.2, rpg: 0.5, simulation: 1.0, strategy: 1.0 },
  horror:     { action: 0.8, adventure: 0.8, casual: 0.2, rpg: 0.8, simulation: 0.2, strategy: 0.5 },
  racing:     { action: 0.5, adventure: 0.2, casual: 1.0, rpg: 0.2, simulation: 1.0, strategy: 0.2 },
  medieval:   { action: 0.8, adventure: 1.0, casual: 0.2, rpg: 1.0, simulation: 0.5, strategy: 1.0 },
  cyberpunk:  { action: 1.0, adventure: 0.8, casual: 0.2, rpg: 1.0, simulation: 0.8, strategy: 0.8 },
  pirate:     { action: 0.8, adventure: 1.0, casual: 0.5, rpg: 0.8, simulation: 0.5, strategy: 0.8 },
  zombies:    { action: 0.8, adventure: 0.8, casual: 0.2, rpg: 0.8, simulation: 0.2, strategy: 0.8 },
  space:      { action: 0.8, adventure: 0.8, casual: 0.2, rpg: 1.0, simulation: 1.0, strategy: 1.0 },
  school:     { action: 0.2, adventure: 0.2, casual: 1.0, rpg: 0.2, simulation: 0.8, strategy: 0.2 },
  mystery:    { action: 0.5, adventure: 1.0, casual: 0.8, rpg: 0.8, simulation: 0.5, strategy: 0.5 },
  martial:    { action: 1.0, adventure: 0.5, casual: 0.2, rpg: 0.8, simulation: 0.2, strategy: 0.2 },
  wildwest:   { action: 0.8, adventure: 0.8, casual: 0.8, rpg: 0.8, simulation: 0.8, strategy: 0.5 },
  music:      { action: 0.2, adventure: 0.2, casual: 1.0, rpg: 0.2, simulation: 0.8, strategy: 0.2 },
};

// Topic × Audience
export const TOPIC_AUDIENCE_FIT = {
  fantasy:    { young: 0.8, everyone: 1.0, mature: 0.8 },
  scifi:      { young: 0.8, everyone: 1.0, mature: 0.8 },
  military:   { young: 0.2, everyone: 0.2, mature: 1.0 },
  horror:     { young: 0.2, everyone: 0.2, mature: 1.0 },
  racing:     { young: 1.0, everyone: 1.0, mature: 0.2 },
  medieval:   { young: 0.8, everyone: 1.0, mature: 0.8 },
  cyberpunk:  { young: 0.2, everyone: 0.2, mature: 1.0 },
  pirate:     { young: 0.8, everyone: 1.0, mature: 0.8 },
  zombies:    { young: 0.2, everyone: 0.2, mature: 1.0 },
  space:      { young: 0.8, everyone: 1.0, mature: 0.8 },
  school:     { young: 1.0, everyone: 1.0, mature: 0.2 },
  mystery:    { young: 0.8, everyone: 1.0, mature: 0.8 },
  martial:    { young: 0.8, everyone: 0.8, mature: 1.0 },
  wildwest:   { young: 0.8, everyone: 0.8, mature: 1.0 },
  music:      { young: 1.0, everyone: 1.0, mature: 0.2 },
};

// Genre × Audience
export const GENRE_AUDIENCE_FIT = {
  action:     { young: 0.8, everyone: 1.0, mature: 1.0 },
  adventure:  { young: 1.0, everyone: 1.0, mature: 0.8 },
  casual:     { young: 1.0, everyone: 1.0, mature: 0.2 },
  rpg:        { young: 0.2, everyone: 0.8, mature: 1.0 },
  simulation: { young: 0.8, everyone: 1.0, mature: 0.8 },
  strategy:   { young: 0.2, everyone: 0.8, mature: 1.0 },
};

// Audience × Size
export const AUDIENCE_SIZE_FIT = {
  young:      { small: 1.0, medium: 1.0, large: 0.2, aaa: 0.2 },
  everyone:   { small: 1.0, medium: 1.0, large: 1.0, aaa: 1.0 },
  mature:     { small: 0.5, medium: 1.0, large: 1.0, aaa: 1.0 },
};

// Genre × Size
export const GENRE_SIZE_FIT = {
  action:     { small: 0.5, medium: 1.0, large: 1.0, aaa: 1.0 },
  adventure:  { small: 0.5, medium: 1.0, large: 1.0, aaa: 1.0 },
  casual:     { small: 1.0, medium: 1.0, large: 0.2, aaa: 0.2 },
  rpg:        { small: 0.2, medium: 0.8, large: 1.0, aaa: 1.0 },
  simulation: { small: 0.8, medium: 1.0, large: 1.0, aaa: 0.8 },
  strategy:   { small: 0.8, medium: 1.0, large: 1.0, aaa: 0.8 },
};

// Topic × Size
export const TOPIC_SIZE_FIT = {
  fantasy:    { small: 0.2, medium: 0.8, large: 1.0, aaa: 1.0 },
  scifi:      { small: 0.2, medium: 0.8, large: 1.0, aaa: 1.0 },
  military:   { small: 0.8, medium: 1.0, large: 1.0, aaa: 1.0 },
  horror:     { small: 0.8, medium: 1.0, large: 1.0, aaa: 0.8 },
  racing:     { small: 0.8, medium: 1.0, large: 0.8, aaa: 0.2 },
  medieval:   { small: 0.8, medium: 1.0, large: 1.0, aaa: 1.0 },
  cyberpunk:  { small: 0.2, medium: 0.8, large: 1.0, aaa: 1.0 },
  pirate:     { small: 0.8, medium: 1.0, large: 1.0, aaa: 0.8 },
  zombies:    { small: 0.8, medium: 1.0, large: 1.0, aaa: 0.8 },
  space:      { small: 0.2, medium: 0.8, large: 1.0, aaa: 1.0 },
  school:     { small: 1.0, medium: 1.0, large: 0.8, aaa: 0.2 },
  mystery:    { small: 1.0, medium: 1.0, large: 0.8, aaa: 0.2 },
  martial:    { small: 1.0, medium: 1.0, large: 0.8, aaa: 0.2 },
  wildwest:   { small: 0.8, medium: 1.0, large: 1.0, aaa: 0.8 },
  music:      { small: 1.0, medium: 1.0, large: 0.8, aaa: 0.2 },
};

// ─── Helpers ───
export function getGenre(id) { return GENRES.find((g) => g.id === id); }
export function getTopic(id) { return TOPICS.find((t) => t.id === id); }
export function getPlatform(id) { return PLATFORMS.find((p) => p.id === id); }
export function getGameSize(id) { return GAME_SIZES.find((s) => s.id === id); }
export function getContractType(id) { return CONTRACT_TYPES.find((c) => c.id === id); }
export function getAudience(id) { return AUDIENCES.find((a) => a.id === id); }

export function isGenreUnlocked(genre, staff) { return (staff || 0) >= (genre.staffUnlock || 0); }
export function isTopicUnlocked(topic, staff) { return (staff || 0) >= (topic.staffUnlock || 0); }
export function isSizeUnlocked(size, staff) { return (staff || 0) >= (size.staffUnlock || 0); }
export function isAudienceUnlocked(audience, staff) { return (staff || 0) >= (audience.staffUnlock || 0); }
export function isPlatformUnlocked(platform, staff) { return (staff || 0) >= (platform.staffUnlock || 0); }

// Calculate dev time with multi-genre/platform penalties
export function calculateDevTimeMs(sizeId, genreIds, platformIds) {
  const size = getGameSize(sizeId);
  if (!size) return 0;
  let devHours = size.devHours;
  const extraGenres = Math.max(0, (genreIds || []).length - 1);
  const extraPlatforms = Math.max(0, (platformIds || []).length - 1);
  devHours *= (1 + extraGenres * MULTI_GENRE_TIME_PENALTY + extraPlatforms * MULTI_PLATFORM_TIME_PENALTY);
  return devHours * 60 * 60 * 1000;
}

export function getLevelMultiplier(business) {
  return Math.pow(1.12, Math.max(1, business.level || 1) - 1);
}

export function getMaxGameSlots(business) {
  const level = Math.max(1, business.level || 1);
  return Math.min(MAX_ACTIVE_GAMES, 1 + Math.floor((level - 1) / 6));
}

export function getMaxContractSlots(business) {
  const level = Math.max(1, business.level || 1);
  return Math.min(MAX_ACTIVE_CONTRACTS, 1 + Math.floor((level - 1) / 10));
}

// ─── Fatigue calculation ───
// Checks studio's release history for repeated topics/genres
// Returns { multiplier (0.4-1.0), breakdown }
export function calculateFatigue(business, genreIds, topicId, platformIds, sizeId, audienceId) {
  const releasedGames = (business.games || []).filter((g) => g.releasedAt);
  if (releasedGames.length === 0) return { multiplier: 1.0, breakdown: null };

  const now = Date.now();
  const gIds = Array.isArray(genreIds) ? genreIds : [genreIds];

  let topicFatigue = 0, genreFatigue = 0;

  for (const game of releasedGames) {
    const hoursSince = (now - game.releasedAt) / (1000 * 60 * 60);
    if (hoursSince >= FATIGUE_WINDOW_HOURS) continue;
    const recencyWeight = 1 - (hoursSince / FATIGUE_WINDOW_HOURS);

    const gameGIds = Array.isArray(game.genreIds) ? game.genreIds : (game.genreId ? [game.genreId] : []);

    if (game.topicId === topicId) topicFatigue += recencyWeight * FATIGUE_PER_REPEAT;

    const genreOverlap = gIds.filter((id) => gameGIds.includes(id)).length;
    if (genreOverlap > 0) genreFatigue += recencyWeight * FATIGUE_PER_REPEAT * genreOverlap;
  }

  const totalFatigue = Math.min(FATIGUE_MAX, topicFatigue + genreFatigue);
  const multiplier = 1 - totalFatigue;

  return {
    multiplier,
    breakdown: {
      topic: Math.round(topicFatigue * 100) / 100,
      genre: Math.round(genreFatigue * 100) / 100,
      total: Math.round(totalFatigue * 100) / 100,
    },
  };
}

// ─── Rating calculation ───
// Uses 6 compatibility matrices + staff, level, fatigue, and reduced randomness
// Returns { rating, breakdown } where breakdown explains each factor
export function calculateGameRating(business, genreIds, topicId, platformIds, sizeId, audienceId, fatigueMultiplier = 1.0) {
  const size = getGameSize(sizeId);
  const topic = getTopic(topicId);
  if (!size || !topic) return { rating: 1, breakdown: null };

  const gIds = Array.isArray(genreIds) ? genreIds : [genreIds];
  const pIds = Array.isArray(platformIds) ? platformIds : [platformIds];
  const genres = gIds.map(getGenre).filter(Boolean);
  const platforms = pIds.map(getPlatform).filter(Boolean);
  if (genres.length === 0 || platforms.length === 0) return { rating: 1, breakdown: null };

  const staff = business.staff || 0;
  const level = Math.max(1, business.level || 1);
  const audience = getAudience(audienceId);

  // 1. Staff score (0-1): combines staff count vs size requirement AND average skill
  const staffRatio = Math.min(1.5, staff / Math.max(1, size.staffReq));
  const avgSkill = getStaffAvgSkill(business); // 1-10
  const skillFactor = avgSkill / 10; // 0.1-1.0
  const staffScore = Math.min(1.0, staffRatio * 0.5 + skillFactor * 0.5);

  // 2. Topic × Genre fit (average across selected genres)
  let tgSum = 0;
  for (const g of genres) {
    tgSum += (TOPIC_GENRE_FIT[topicId]?.[g.id] ?? 0.5);
  }
  const topicGenreFit = tgSum / genres.length;

  // 3. Platform × Genre fit (average across all genre×platform combos)
  let pgSum = 0, pgCount = 0;
  for (const g of genres) {
    for (const p of platforms) {
      pgSum += (p.genreFit[g.id] ?? 0.8);
      pgCount++;
    }
  }
  const platformFit = pgCount > 0 ? pgSum / pgCount : 0.8;

  // 4. Topic × Audience fit
  const topicAudienceFit = TOPIC_AUDIENCE_FIT[topicId]?.[audienceId] ?? 0.5;

  // 5. Genre × Audience fit (average across selected genres)
  let gaSum = 0;
  for (const g of genres) {
    gaSum += (GENRE_AUDIENCE_FIT[g.id]?.[audienceId] ?? 0.5);
  }
  const genreAudienceFit = gaSum / genres.length;

  // 6. Audience × Size fit
  const audienceSizeFit = AUDIENCE_SIZE_FIT[audienceId]?.[sizeId] ?? 0.5;

  // 7. Genre × Size fit (average across selected genres)
  let gsSum = 0;
  for (const g of genres) {
    gsSum += (GENRE_SIZE_FIT[g.id]?.[sizeId] ?? 0.5);
  }
  const genreSizeFit = gsSum / genres.length;

  // 8. Topic × Size fit
  const topicSizeFit = TOPIC_SIZE_FIT[topicId]?.[sizeId] ?? 0.5;

  // Level bonus (higher level = better studio quality)
  const levelBonus = Math.min(0.3, (level - 1) * 0.02);

  // Multi-genre/platform penalty (harder to balance)
  const multiPenalty = Math.max(0, (genres.length - 1) * 0.05 + (platforms.length - 1) * 0.03);

  // Random factor (±8%)
  const randomFactor = 0.92 + Math.random() * 0.16;

  // Combine factors with weights
  const comboFit = (topicGenreFit * 0.20 + platformFit * 0.10 + topicAudienceFit * 0.10 + genreAudienceFit * 0.10 + audienceSizeFit * 0.10 + genreSizeFit * 0.10 + topicSizeFit * 0.10);

  // Bad fit penalty: each --- (≤0.3) compatibility drags the rating down hard
  const allFits = [topicGenreFit, platformFit, topicAudienceFit, genreAudienceFit, audienceSizeFit, genreSizeFit, topicSizeFit];
  const badFitPenalty = allFits.filter((f) => f <= 0.3).length * 0.15;

  const quality = Math.max(0, (staffScore * 0.40 + comboFit * 0.60 + levelBonus - multiPenalty - badFitPenalty) * randomFactor * fatigueMultiplier);

  const rating = Math.max(1, Math.min(10, Math.round(quality * 10)));

  const breakdown = {
    staffScore: Math.round(staffScore * 100) / 100,
    topicGenreFit: Math.round(topicGenreFit * 100) / 100,
    platformFit: Math.round(platformFit * 100) / 100,
    topicAudienceFit: Math.round(topicAudienceFit * 100) / 100,
    genreAudienceFit: Math.round(genreAudienceFit * 100) / 100,
    audienceSizeFit: Math.round(audienceSizeFit * 100) / 100,
    genreSizeFit: Math.round(genreSizeFit * 100) / 100,
    topicSizeFit: Math.round(topicSizeFit * 100) / 100,
    comboFit: Math.round(comboFit * 100) / 100,
    levelBonus: Math.round(levelBonus * 100) / 100,
    multiPenalty: Math.round(multiPenalty * 100) / 100,
    badFitPenalty: Math.round(badFitPenalty * 100) / 100,
    randomFactor: Math.round(randomFactor * 100) / 100,
    fatigueMultiplier: Math.round(fatigueMultiplier * 100) / 100,
    quality: Math.round(quality * 100) / 100,
  };

  return { rating, breakdown };
}

// ─── Game income calculation ───
// Income per hour for a released game, decaying over its lifespan
// Supports multi-genre and multi-platform (stored as arrays on game object)
export function getGameHourlyIncome(game) {
  if (!game || !game.releasedAt) return 0;
  const now = Date.now();
  const elapsedHr = (now - game.releasedAt) / (1000 * 60 * 60);
  const bonusHr = game.bonusHours || 0;
  const fatigueMult = game.fatigueMultiplier || 1.0;
  const totalLifespan = (GAME_LIFESPAN_HOURS + bonusHr) * fatigueMult;
  if (elapsedHr >= totalLifespan) return 0;

  const size = getGameSize(game.sizeId);
  if (!size) return 0;

  // Support both old single-id and new array formats
  const gIds = Array.isArray(game.genreIds) ? game.genreIds : (game.genreId ? [game.genreId] : []);
  const pIds = Array.isArray(game.platformIds) ? game.platformIds : (game.platformId ? [game.platformId] : []);
  const genres = gIds.map(getGenre).filter(Boolean);
  const platforms = pIds.map(getPlatform).filter(Boolean);
  if (genres.length === 0 || platforms.length === 0) return 0;

  // Average genre income base
  const avgGenreIncome = genres.reduce((s, g) => s + g.incomeBase, 0) / genres.length;
  // Average platform market share
  const avgMarketShare = platforms.reduce((s, p) => s + p.marketShare, 0) / platforms.length;
  // Multi-platform bonus: releasing on more platforms = more total sales
  const platformBonus = 1 + (platforms.length - 1) * 0.4;
  // Multi-genre bonus: broader appeal
  const genreBonus = 1 + (genres.length - 1) * 0.2;

  // Audience multiplier
  const audience = getAudience(game.audienceId);
  const audienceMult = audience ? audience.incomeMult : 1.0;

  // Base hourly income
  const baseIncome = avgGenreIncome * size.incomeMult * avgMarketShare * platformBonus * genreBonus * audienceMult;

  // Rating multiplier (rating/10)^2 - high ratings earn disproportionately more
  const ratingMult = Math.pow(game.rating / 10, 2);

  // Decay: linear decay over lifespan
  const decayFactor = 1 - (elapsedHr / totalLifespan);

  return Math.floor(baseIncome * ratingMult * decayFactor * fatigueMult);
}

// ─── Contract income calculation ───
export function getContractHourlyIncome(contract) {
  if (!contract || !contract.startedAt) return 0;
  const now = Date.now();
  const elapsedHr = (now - contract.startedAt) / (1000 * 60 * 60);
  if (elapsedHr >= CONTRACT_LIFESPAN_HOURS) return 0;

  const type = getContractType(contract.typeId);
  if (!type) return 0;

  // Decay: linear decay over lifespan
  const decayFactor = 1 - (elapsedHr / CONTRACT_LIFESPAN_HOURS);
  return Math.floor(type.royaltyPerHr * decayFactor);
}

// ─── Total hourly income for the studio ───
export function getGameDevHourlyIncome(business) {
  const games = business.games || [];
  const contracts = business.contracts || [];
  const staff = business.staff || 0;
  const levelMult = getLevelMultiplier(business);

  let income = 0;
  for (const game of games) {
    income += getGameHourlyIncome(game) * levelMult;
  }
  for (const contract of contracts) {
    income += getContractHourlyIncome(contract) * levelMult;
  }

  // Subtract staff salaries
  income -= getStaffSalaryHourly(business);

  return income;
}

// ─── Staff reservation ───
// Active (in-development) games and active contracts reserve staff
export function getReservedStaff(business) {
  const activeGames = (business.games || []).filter((g) => !g.releasedAt);
  const activeContracts = (business.contracts || []).filter((c) => {
    const elapsed = (Date.now() - c.startedAt) / (1000 * 60 * 60);
    return elapsed < CONTRACT_LIFESPAN_HOURS;
  });
  let reserved = 0;
  for (const g of activeGames) {
    const size = getGameSize(g.sizeId);
    if (size) reserved += size.staffReq;
  }
  for (const c of activeContracts) {
    const type = getContractType(c.typeId);
    if (type) reserved += type.staffReq;
  }
  return reserved;
}

export function getAvailableStaff(business) {
  return Math.max(0, (business.staff || 0) - getReservedStaff(business));
}

// ─── Start developing a game ───
// genreIds and platformIds are arrays (max 2 each)
export function startGameDev(business, genreIds, topicId, platformIds, sizeId, audienceId, title) {
  const size = getGameSize(sizeId);
  if (!size) return null;

  const activeGames = (business.games || []).filter((g) => !g.releasedAt);
  if (activeGames.length >= getMaxGameSlots(business)) return null;

  // Check staff availability
  const availableStaff = getAvailableStaff(business);
  if (availableStaff < size.staffReq) return null;

  const now = Date.now();
  const devTimeMs = calculateDevTimeMs(sizeId, genreIds, platformIds);

  const game = {
    instanceId: `game_${now}_${Math.random().toString(36).slice(2, 7)}`,
    title: title || 'Untitled',
    genreIds: Array.isArray(genreIds) ? genreIds : [genreIds],
    topicId,
    platformIds: Array.isArray(platformIds) ? platformIds : [platformIds],
    sizeId,
    audienceId: audienceId || 'everyone',
    startedAt: now,
    completesAt: now + scaleDuration(Math.random() < 0.3 ? 0 : devTimeMs),
    releasedAt: null,
    rating: 0,
    income: 0,
  };

  return {
    ...business,
    games: [...(business.games || []), game],
  };
}

// ─── Complete game development (release) ───
export function releaseGame(business, instanceId) {
  const games = (business.games || []).map((g) => {
    if (g.instanceId === instanceId && !g.releasedAt) {
      const genreIds = Array.isArray(g.genreIds) ? g.genreIds : (g.genreId ? [g.genreId] : []);
      const platformIds = Array.isArray(g.platformIds) ? g.platformIds : (g.platformId ? [g.platformId] : []);
      const fatigue = calculateFatigue(business, genreIds, g.topicId, platformIds, g.sizeId, g.audienceId);
      const result = calculateGameRating(business, genreIds, g.topicId, platformIds, g.sizeId, g.audienceId, fatigue.multiplier);
      const rating = typeof result === 'object' ? result.rating : result;
      const breakdown = typeof result === 'object' ? result.breakdown : null;
      return {
        ...g,
        releasedAt: Date.now(),
        rating,
        ratingBreakdown: breakdown,
        fatigueMultiplier: fatigue.multiplier,
        fatigueBreakdown: fatigue.breakdown,
      };
    }
    return g;
  });

  return { ...business, games };
}

// ─── Check for completed game development ───
export function getCompletedGames(business) {
  const now = Date.now();
  return (business.games || []).filter((g) => !g.releasedAt && g.completesAt <= now);
}

// ─── Get development time remaining ───
export function getGameDevTimeRemaining(game) {
  if (!game || game.releasedAt) return 0;
  return Math.max(0, game.completesAt - Date.now());
}

// ─── Market a released game to extend its lifespan ───
// Each marketing attempt adds fewer hours the more it's been marketed
// and the older the game is. Returns { business, bonusHours, cost } or null.
export function marketGame(business, gameInstanceId) {
  const games = business.games || [];
  const game = games.find((g) => g.instanceId === gameInstanceId && g.releasedAt);
  if (!game) return null;

  const elapsedHr = (Date.now() - game.releasedAt) / (1000 * 60 * 60);
  const bonusHr = game.bonusHours || 0;
  const fatigueMult = game.fatigueMultiplier || 1.0;
  const totalLifespan = (GAME_LIFESPAN_HOURS + bonusHr) * fatigueMult;
  if (elapsedHr >= totalLifespan) return null; // game already expired

  const marketingCount = game.marketingCount || 0;

  // Diminishing returns: each marketing adds fewer hours
  // 1st: 6h, 2nd: 5h, 3rd: 4h, 4th: 3h, 5th: 2h, 6th+: 1h
  const bonusHours = Math.max(1, MARKETING_BASE_HOURS - marketingCount);

  // Cost scales with marketing count and game size
  const size = getGameSize(game.sizeId);
  const sizeMult = size ? size.incomeMult : 1;
  const cost = Math.floor(MARKETING_BASE_COST * sizeMult * Math.pow(1.5, marketingCount));

  const updatedGames = games.map((g) => {
    if (g.instanceId === gameInstanceId) {
      return {
        ...g,
        bonusHours: (g.bonusHours || 0) + bonusHours,
        marketingCount: marketingCount + 1,
      };
    }
    return g;
  });

  return { business: { ...business, games: updatedGames }, bonusHours, cost };
}

// ─── Generate random available contracts ───
export function generateContracts(business) {
  const level = Math.max(1, business.level || 1);
  const staff = business.staff || 0;
  const now = Date.now();

  // Available contracts based on level and staff
  const available = CONTRACT_TYPES.filter((c) => {
    return c.staffReq <= Math.max(2, staff + 2) || level >= 3;
  });

  // Pick 3 random contracts
  const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, 3);

  return shuffled.map((type) => ({
    instanceId: `contract_${now}_${type.id}_${Math.random().toString(36).slice(2, 5)}`,
    typeId: type.id,
    offeredAt: now,
  }));
}

// ─── Accept a contract ───
export function acceptContract(business, contractInstanceId) {
  const available = business.availableContracts || [];
  const contract = available.find((c) => c.instanceId === contractInstanceId);
  if (!contract) return null;

  const type = getContractType(contract.typeId);
  if (!type) return null;

  const activeContracts = (business.contracts || []).filter((c) => {
    const elapsed = (Date.now() - c.startedAt) / (1000 * 60 * 60);
    return elapsed < CONTRACT_LIFESPAN_HOURS;
  });

  if (activeContracts.length >= getMaxContractSlots(business)) return null;

  // Check staff availability
  const availableStaff = getAvailableStaff(business);
  if (availableStaff < type.staffReq) return null;

  const now = Date.now();
  const newContract = {
    ...contract,
    startedAt: now,
    completesAt: now + scaleDuration(type.duration * 60 * 60 * 1000),
  };

  return {
    ...business,
    contracts: [...(business.contracts || []), newContract],
    availableContracts: available.filter((c) => c.instanceId !== contractInstanceId),
  };
}

// ─── Staff member generation ───
import { generatePerson } from './names';

export function generateStaffMember(business) {
  const person = generatePerson();
  const level = business && business.level ? business.level : 1;
  const games = business && business.games ? business.games : [];
  const releasedGames = games.filter((g) => g.releasedAt);
  const avgQuality = releasedGames.length > 0
    ? releasedGames.reduce((s, g) => s + (g.rating || 5), 0) / releasedGames.length
    : 5;
  const qualityFactor = Math.max(0, Math.min(1, avgQuality / 10));
  const levelFactor = Math.max(0, Math.min(1, level / 30));
  const scale = (levelFactor + qualityFactor) / 2;

  const amazingPct = 0.02 + 0.08 * scale;
  const greatPct   = 0.08 + 0.12 * scale;
  const goodPct    = 0.15 + 0.15 * scale;
  const badPct     = 0.50 - 0.20 * scale;
  const vbadPct    = 0.25 - 0.15 * scale;

  const roll = Math.random();
  let skill;
  if (roll < vbadPct) {
    skill = Math.floor(Math.random() * 2) + 1;
  } else if (roll < vbadPct + badPct) {
    skill = Math.floor(Math.random() * 2) + 3;
  } else if (roll < vbadPct + badPct + goodPct) {
    skill = Math.floor(Math.random() * 2) + 5;
  } else if (roll < vbadPct + badPct + goodPct + greatPct) {
    skill = Math.floor(Math.random() * 2) + 7;
  } else {
    skill = Math.random() < 0.05 ? 10 : 9;
  }
  return {
    id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: person.name,
    age: person.age,
    gender: person.gender,
    skill,
    salary: STAFF_SALARY_HOURLY,
    hiredAt: Date.now(),
  };
}

export function getStaffAvgSkill(business) {
  const members = business.staffMembers || [];
  if (members.length === 0) return 5;
  return members.reduce((sum, m) => sum + m.skill, 0) / members.length;
}

export function getStaffSalaryHourly(business) {
  return (business.staffMembers || []).reduce((total, m) => total + (m.salary || STAFF_SALARY_HOURLY), 0);
}

// ─── Staff hiring (mirrors courier pattern) ───
export function hireStaff(business, count) {
  const currentHiring = business.hiringStaff || [];
  if (currentHiring.length + count > MAX_HIRING_AT_ONCE) return null;

  const now = Date.now();
  const newHires = [];
  for (let i = 0; i < count; i++) {
    const duration = STAFF_HIRE_MIN_MS + Math.random() * (STAFF_HIRE_MAX_MS - STAFF_HIRE_MIN_MS);
    const member = generateStaffMember(business);
    newHires.push({
      id: `hire_${now}_${i}_${Math.random().toString(36).slice(2, 5)}`,
      hiredAt: now,
      completesAt: now + scaleDuration(Math.random() < 0.3 ? 0 : duration),
      staffMember: member,
    });
  }

  return {
    ...business,
    hiringStaff: [...currentHiring, ...newHires],
  };
}

export function completeHiredStaff(business) {
  const now = Date.now();
  const hiring = business.hiringStaff || [];
  const completed = hiring.filter((h) => h.completesAt <= now);
  const stillHiring = hiring.filter((h) => h.completesAt > now);

  if (completed.length === 0) return business;

  const newMembers = completed.map((h) => h.staffMember).filter(Boolean);
  return {
    ...business,
    staff: (business.staff || 0) + completed.length,
    staffMembers: [...(business.staffMembers || []), ...newMembers],
    hiringStaff: stillHiring,
  };
}

export function instantHireStaff(business, hireId) {
  const hiring = business.hiringStaff || [];
  const hire = hiring.find((h) => h.id === hireId);
  if (!hire) return business;

  const newMember = hire.staffMember || generateStaffMember(business);
  return {
    ...business,
    staff: (business.staff || 0) + 1,
    staffMembers: [...(business.staffMembers || []), newMember],
    hiringStaff: hiring.filter((h) => h.id !== hireId),
  };
}

export function fireStaff(business, staffId) {
  return {
    ...business,
    staff: Math.max(0, (business.staff || 0) - 1),
    staffMembers: (business.staffMembers || []).filter((s) => s.id !== staffId),
  };
}

export function raiseStaff(business, staffId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === staffId) return { ...s, salary: Math.round((s.salary || STAFF_SALARY_HOURLY) * 1.15) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function trainStaff(business, staffId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === staffId) return { ...s, skill: Math.min(10, (s.skill || 5) + 1) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function getHireTimeRemaining(hire) {
  return Math.max(0, hire.completesAt - Date.now());
}

// ─── Process game dev business tick ───
export function processGameDev(business, minutesElapsed) {
  const hoursFraction = minutesElapsed / 60;
  const levelMult = getLevelMultiplier(business);
  let income = 0;

  // Backwards compat: generate staffMembers for existing saves
  let workingBusiness = business;
  if ((business.staff || 0) > 0 && (!business.staffMembers || business.staffMembers.length === 0)) {
    const members = [];
    for (let i = 0; i < business.staff; i++) {
      members.push(generateStaffMember(business));
    }
    workingBusiness = { ...business, staffMembers: members };
  }

  // Income from released games
  const games = (workingBusiness.games || []).map((g) => {
    if (g.releasedAt) {
      const gameIncome = getGameHourlyIncome(g) * levelMult * hoursFraction;
      income += gameIncome;
      return { ...g, income: (g.income || 0) + gameIncome };
    }
    return g;
  });

  // Income from active contracts
  const contracts = (workingBusiness.contracts || []).map((c) => {
    const contractIncome = getContractHourlyIncome(c) * levelMult * hoursFraction;
    income += contractIncome;
    return { ...c, income: (c.income || 0) + contractIncome };
  });

  // Staff salary
  const salary = getStaffSalaryHourly(workingBusiness) * hoursFraction;
  income -= salary;

  // Remove expired games and contracts
  const now = Date.now();
  const activeGames = games.filter((g) => {
    if (!g.releasedAt) return true; // still in development
    const elapsedHr = (now - g.releasedAt) / (1000 * 60 * 60);
    const fatigueMult = g.fatigueMultiplier || 1.0;
    const totalLifespan = (GAME_LIFESPAN_HOURS + (g.bonusHours || 0)) * fatigueMult;
    return elapsedHr < totalLifespan;
  });
  const activeContracts = contracts.filter((c) => {
    const elapsedHr = (now - c.startedAt) / (1000 * 60 * 60);
    return elapsedHr < CONTRACT_LIFESPAN_HOURS;
  });

  // Refresh available contracts if needed
  let availableContracts = workingBusiness.availableContracts || [];
  const lastRefresh = workingBusiness.contractsRefreshedAt || 0;
  if (now - lastRefresh > scaleDuration(CONTRACT_REFRESH_HOURS * 60 * 60 * 1000)) {
    availableContracts = generateContracts(workingBusiness);
  }

  return {
    updatedBusiness: {
      ...workingBusiness,
      games: activeGames,
      contracts: activeContracts,
      availableContracts,
      contractsRefreshedAt: now,
      allTimeEarnings: (workingBusiness.allTimeEarnings || 0) + income,
    },
    income,
  };
}

// ─── Format delivery/time helper ───
export function formatTimeRemaining(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export { formatMoney };
