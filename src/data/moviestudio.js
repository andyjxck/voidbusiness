import { generatePerson } from './names';
import { t } from './i18n';
import { formatMoney } from './market';
import { isSuspended } from './businesses';
import { scaleDuration } from './store';

// ─── Staff costs (mirrors gamedev pattern) ───
export const STAFF_HIRE_COST = 20000000;
export const STAFF_SALARY_HOURLY = 2000;
export const STAFF_HIRE_MIN_MS = 3000;
export const STAFF_HIRE_MAX_MS = 45 * 60 * 1000;
export const MAX_HIRING_AT_ONCE = 3;

// ─── Movie lifecycle ───
export const MOVIE_LIFESPAN_HOURS = 120; // 5 days of earning
export const MAX_ACTIVE_MOVIES = 5;
export const MARKETING_BASE_COST = 20000000;
export const MARKETING_BASE_HOURS = 8;

// ─── Fatigue system (same as gamedev) ───
export const FATIGUE_WINDOW_HOURS = 168;
export const FATIGUE_PER_REPEAT = 0.08;
export const FATIGUE_MAX = 0.6;

// ─── Budget categories (affect rating) ───
export const BUDGET_CATEGORIES = [
  { id: 'postProduction', get name() { return t('dn_post_production'); }, qualityWeight: 0.32 },
  { id: 'extras', get name() { return t('dn_extras'); }, qualityWeight: 0.12 },
  { id: 'marketing', get name() { return t('dn_marketing'); }, qualityWeight: 0.18 },
  { id: 'sets', get name() { return t('dn_sets_props'); }, qualityWeight: 0.20 },
  { id: 'soundtrack', get name() { return t('dn_soundtrack'); }, qualityWeight: 0.18 },
];

// ─── Movie sizes (merged old SCRIPT_TYPES + MOVIE_SIZES into one) ───
export const MOVIE_SIZES = [
  { id: 'short',       get name() { return t('dn_short_film'); },  devHours: 0.5,  cost: 6500000,    incomeMult: 1.0,  staffReq: 1,  staffUnlock: 1,  emoji: '🎬', get desc() { return t('dd_quick_indie_production'); } },
  { id: 'feature',     get name() { return t('dn_feature'); },     devHours: 3,    cost: 40000000,   incomeMult: 3.0,  staffReq: 4,  staffUnlock: 4,  emoji: '🎞️', get desc() { return t('dd_full_commercial_release'); } },
  { id: 'blockbuster', get name() { return t('dn_blockbuster'); }, devHours: 8,    cost: 200000000,  incomeMult: 8.0,  staffReq: 10, staffUnlock: 10, emoji: '🍿', get desc() { return t('dd_big_budget_production'); } },
  { id: 'epic',        get name() { return t('dn_epic'); },        devHours: 2.5,  cost: 650000000,  incomeMult: 5.0,  staffReq: 20, staffUnlock: 20, emoji: '🏆', get desc() { return t('dd_massive_epic_production'); } },
];

// ─── Genres ───
export const MOVIE_GENRES = [
  { id: 'action',      get name() { return t('dn_action'); },      emoji: '💥', incomeBase: 2666667, staffUnlock: 1,  color: '#f87171' },
  { id: 'comedy',      get name() { return t('dn_comedy'); },      emoji: '😂', incomeBase: 2333333, staffUnlock: 1,  color: '#fbbf24' },
  { id: 'drama',       get name() { return t('dn_drama'); },       emoji: '🎭', incomeBase: 1933333, staffUnlock: 1,  color: '#a78bfa' },
  { id: 'horror',      get name() { return t('dn_horror'); },      emoji: '👻', incomeBase: 2133333, staffUnlock: 3,  color: '#94a3b8' },
  { id: 'scifi',       get name() { return t('dn_sci_fi'); },      emoji: '🚀', incomeBase: 3400000, staffUnlock: 5,  color: '#38bdf8' },
  { id: 'romance',     get name() { return t('dn_romance'); },     emoji: '💕', incomeBase: 1800000, staffUnlock: 3,  color: '#ec4899' },
  { id: 'thriller',    get name() { return t('dn_thriller'); },    emoji: '🔪', incomeBase: 2466667, staffUnlock: 5,  color: '#fb923c' },
  { id: 'animation',   get name() { return t('dn_animation'); },   emoji: '🎨', incomeBase: 3000000, staffUnlock: 8,  color: '#34d399' },
  { id: 'documentary', get name() { return t('dn_documentary'); }, emoji: '📹', incomeBase: 1600000, staffUnlock: 8,  color: '#60a5fa' },
  { id: 'fantasy',     get name() { return t('dn_fantasy'); },     emoji: '🐉', incomeBase: 3733333, staffUnlock: 12, color: '#c084fc' },
];

// ─── Topics (NEW - mirrors gamedev topics) ───
export const MOVIE_TOPICS = [
  { id: 'heist',         get name() { return t('dn_heist'); },           emoji: '💰', staffUnlock: 1,  fit: { action: 1.0, comedy: 0.6, drama: 0.8, horror: 0.2, scifi: 0.5, romance: 0.2, thriller: 1.0, animation: 0.5, documentary: 0.2, fantasy: 0.5 } },
  { id: 'superhero',     get name() { return t('dn_superhero'); },       emoji: '🦸', staffUnlock: 1,  fit: { action: 1.0, comedy: 0.8, drama: 0.6, horror: 0.2, scifi: 0.8, romance: 0.5, thriller: 0.8, animation: 1.0, documentary: 0.2, fantasy: 0.8 } },
  { id: 'war',           get name() { return t('dn_war'); },             emoji: '⚔️', staffUnlock: 1,  fit: { action: 1.0, comedy: 0.2, drama: 1.0, horror: 0.5, scifi: 0.5, romance: 0.5, thriller: 0.8, animation: 0.5, documentary: 0.8, fantasy: 0.5 } },
  { id: 'apocalypse',    get name() { return t('dn_apocalypse'); },      emoji: '🌋', staffUnlock: 3,  fit: { action: 1.0, comedy: 0.5, drama: 0.8, horror: 1.0, scifi: 1.0, romance: 0.5, thriller: 1.0, animation: 0.6, documentary: 0.5, fantasy: 0.5 } },
  { id: 'comingofage',   get name() { return t('dn_coming_of_age'); },   emoji: '🎓', staffUnlock: 3,  fit: { action: 0.2, comedy: 0.8, drama: 1.0, horror: 0.2, scifi: 0.2, romance: 0.8, thriller: 0.2, animation: 0.8, documentary: 0.8, fantasy: 0.2 } },
  { id: 'revenge',       get name() { return t('dn_revenge'); },         emoji: '😤', staffUnlock: 3,  fit: { action: 0.8, comedy: 0.2, drama: 1.0, horror: 0.8, scifi: 0.5, romance: 0.2, thriller: 1.0, animation: 0.5, documentary: 0.2, fantasy: 0.5 } },
  { id: 'forbiddenlove', get name() { return t('dn_forbidden_love'); },  emoji: '💔', staffUnlock: 5,  fit: { action: 0.2, comedy: 0.5, drama: 1.0, horror: 0.2, scifi: 0.2, romance: 1.0, thriller: 0.5, animation: 0.5, documentary: 0.2, fantasy: 0.8 } },
  { id: 'underworld',    get name() { return t('dn_underworld'); },      emoji: '🕶️', staffUnlock: 5,  fit: { action: 1.0, comedy: 0.5, drama: 0.8, horror: 0.8, scifi: 0.5, romance: 0.2, thriller: 1.0, animation: 0.6, documentary: 0.5, fantasy: 0.5 } },
  { id: 'sports',        get name() { return t('dn_sports'); },          emoji: '⚽', staffUnlock: 5,  fit: { action: 1.0, comedy: 0.8, drama: 1.0, horror: 0.2, scifi: 0.2, romance: 0.5, thriller: 0.5, animation: 0.8, documentary: 1.0, fantasy: 0.2 } },
  { id: 'musicbiopic',   get name() { return t('dn_music_biopic'); },    emoji: '🎵', staffUnlock: 8,  fit: { action: 0.2, comedy: 0.5, drama: 1.0, horror: 0.2, scifi: 0.2, romance: 0.8, thriller: 0.2, animation: 0.5, documentary: 1.0, fantasy: 0.2 } },
  { id: 'truecrime',     get name() { return t('dn_true_crime'); },      emoji: '🔍', staffUnlock: 8,  fit: { action: 0.5, comedy: 0.2, drama: 1.0, horror: 0.8, scifi: 0.2, romance: 0.2, thriller: 1.0, animation: 0.2, documentary: 1.0, fantasy: 0.2 } },
  { id: 'fantasyquest',  get name() { return t('dn_fantasy_quest'); },   emoji: '🗺️', staffUnlock: 10, fit: { action: 0.8, comedy: 0.5, drama: 0.8, horror: 0.5, scifi: 0.5, romance: 0.5, thriller: 0.5, animation: 1.0, documentary: 0.2, fantasy: 1.0 } },
  { id: 'roadtrip',      get name() { return t('dn_road_trip'); },       emoji: '🚗', staffUnlock: 10, fit: { action: 0.5, comedy: 1.0, drama: 0.8, horror: 0.2, scifi: 0.2, romance: 0.8, thriller: 0.5, animation: 0.8, documentary: 0.5, fantasy: 0.2 } },
  { id: 'spacewar',      get name() { return t('dn_space_war'); },       emoji: '🪐', staffUnlock: 12, fit: { action: 1.0, comedy: 0.5, drama: 0.8, horror: 0.5, scifi: 1.0, romance: 0.5, thriller: 0.8, animation: 1.0, documentary: 0.5, fantasy: 0.8 } },
  { id: 'romcom',        get name() { return t('dn_romantic_comedy'); }, emoji: '😘', staffUnlock: 12, fit: { action: 0.2, comedy: 1.0, drama: 0.8, horror: 0.2, scifi: 0.2, romance: 1.0, thriller: 0.2, animation: 0.8, documentary: 0.2, fantasy: 0.5 } },
];

// ─── Audiences (same as gamedev) ───
export const AUDIENCES = [
  { id: 'young',    get name() { return t('dn_young'); },    emoji: '🧒', incomeMult: 0.8, staffUnlock: 1, get desc() { return t('dd_kids_teens_broader_reach_lower_spend'); } },
  { id: 'everyone', get name() { return t('dn_everyone'); }, emoji: '👨‍👩‍👧', incomeMult: 1.0, staffUnlock: 1, get desc() { return t('dd_mass_market_appeal'); } },
  { id: 'mature',   get name() { return t('dn_mature'); },   emoji: '🎭', incomeMult: 1.3, staffUnlock: 1, get desc() { return t('dd_adults_higher_spend_niche_audience'); } },
];

// ─── Sets (affect rating via qualityBonus) ───
export const MOVIE_SETS = [
  { id: 'suburbs', get name() { return t('dn_suburb_set'); }, staffUnlock: 0, openCost: 0, qualityBonus: 0, get desc() { return t('dd_basic_suburban_backdrop'); } },
  { id: 'harbour', get name() { return t('dn_harbour_set'); }, staffUnlock: 6, openCost: 65000000, qualityBonus: 0.05, get desc() { return t('dd_waterfront_filming_location'); } },
  { id: 'park', get name() { return t('dn_park_set'); }, staffUnlock: 6, openCost: 52000000, qualityBonus: 0.05, get desc() { return t('dd_green_park_setting'); } },
  { id: 'oldtown', get name() { return t('dn_old_town_set'); }, staffUnlock: 12, requiredReleased: 2, openCost: 130000000, qualityBonus: 0.10, get desc() { return t('dd_historic_streets'); } },
  { id: 'industrial', get name() { return t('dn_industrial_set'); }, staffUnlock: 22, requiredReleased: 5, openCost: 200000000, qualityBonus: 0.12, get desc() { return t('dd_gritty_industrial_backdrop'); } },
  { id: 'university', get name() { return t('dn_university_set'); }, staffUnlock: 34, requiredReleased: 9, openCost: 260000000, qualityBonus: 0.15, get desc() { return t('dd_campus_filming_location'); } },
  { id: 'downtown', get name() { return t('dn_downtown_set'); }, staffUnlock: 50, requiredReleased: 15, requiredAverageRating: 7, openCost: 650000000, qualityBonus: 0.20, get desc() { return t('dd_premium_city_backdrop'); } },
];

// ─── Multi-selection limits ───
export const MAX_GENRES = 2;
export const MULTI_GENRE_TIME_PENALTY = 0.3;

// ─── Compatibility matrices ───
// +++ = 1.0, ++ = 0.8, ~ = 0.5, --- = 0.2

// Topic × Genre
export const TOPIC_GENRE_FIT = {
  heist:         { action: 1.0, comedy: 0.6, drama: 0.8, horror: 0.2, scifi: 0.5, romance: 0.2, thriller: 1.0, animation: 0.5, documentary: 0.2, fantasy: 0.5 },
  superhero:     { action: 1.0, comedy: 0.8, drama: 0.6, horror: 0.2, scifi: 0.8, romance: 0.5, thriller: 0.8, animation: 1.0, documentary: 0.2, fantasy: 0.8 },
  war:           { action: 1.0, comedy: 0.2, drama: 1.0, horror: 0.5, scifi: 0.5, romance: 0.5, thriller: 0.8, animation: 0.5, documentary: 0.8, fantasy: 0.5 },
  apocalypse:    { action: 1.0, comedy: 0.5, drama: 0.8, horror: 1.0, scifi: 1.0, romance: 0.5, thriller: 1.0, animation: 0.6, documentary: 0.5, fantasy: 0.5 },
  comingofage:   { action: 0.2, comedy: 0.8, drama: 1.0, horror: 0.2, scifi: 0.2, romance: 0.8, thriller: 0.2, animation: 0.8, documentary: 0.8, fantasy: 0.2 },
  revenge:       { action: 0.8, comedy: 0.2, drama: 1.0, horror: 0.8, scifi: 0.5, romance: 0.2, thriller: 1.0, animation: 0.5, documentary: 0.2, fantasy: 0.5 },
  forbiddenlove: { action: 0.2, comedy: 0.5, drama: 1.0, horror: 0.2, scifi: 0.2, romance: 1.0, thriller: 0.5, animation: 0.5, documentary: 0.2, fantasy: 0.8 },
  underworld:    { action: 1.0, comedy: 0.5, drama: 0.8, horror: 0.8, scifi: 0.5, romance: 0.2, thriller: 1.0, animation: 0.6, documentary: 0.5, fantasy: 0.5 },
  sports:        { action: 1.0, comedy: 0.8, drama: 1.0, horror: 0.2, scifi: 0.2, romance: 0.5, thriller: 0.5, animation: 0.8, documentary: 1.0, fantasy: 0.2 },
  musicbiopic:   { action: 0.2, comedy: 0.5, drama: 1.0, horror: 0.2, scifi: 0.2, romance: 0.8, thriller: 0.2, animation: 0.5, documentary: 1.0, fantasy: 0.2 },
  truecrime:     { action: 0.5, comedy: 0.2, drama: 1.0, horror: 0.8, scifi: 0.2, romance: 0.2, thriller: 1.0, animation: 0.2, documentary: 1.0, fantasy: 0.2 },
  fantasyquest:  { action: 0.8, comedy: 0.5, drama: 0.8, horror: 0.5, scifi: 0.5, romance: 0.5, thriller: 0.5, animation: 1.0, documentary: 0.2, fantasy: 1.0 },
  roadtrip:      { action: 0.5, comedy: 1.0, drama: 0.8, horror: 0.2, scifi: 0.2, romance: 0.8, thriller: 0.5, animation: 0.8, documentary: 0.5, fantasy: 0.2 },
  spacewar:      { action: 1.0, comedy: 0.5, drama: 0.8, horror: 0.5, scifi: 1.0, romance: 0.5, thriller: 0.8, animation: 1.0, documentary: 0.5, fantasy: 0.8 },
  romcom:        { action: 0.2, comedy: 1.0, drama: 0.8, horror: 0.2, scifi: 0.2, romance: 1.0, thriller: 0.2, animation: 0.8, documentary: 0.2, fantasy: 0.5 },
};

// Topic × Audience
export const TOPIC_AUDIENCE_FIT = {
  heist:         { young: 0.5, everyone: 0.8, mature: 1.0 },
  superhero:     { young: 1.0, everyone: 1.0, mature: 0.5 },
  war:           { young: 0.2, everyone: 0.5, mature: 1.0 },
  apocalypse:    { young: 0.5, everyone: 0.8, mature: 1.0 },
  comingofage:   { young: 0.8, everyone: 1.0, mature: 0.8 },
  revenge:       { young: 0.2, everyone: 0.5, mature: 1.0 },
  forbiddenlove: { young: 0.2, everyone: 0.8, mature: 1.0 },
  underworld:    { young: 0.2, everyone: 0.5, mature: 1.0 },
  sports:        { young: 0.8, everyone: 1.0, mature: 0.5 },
  musicbiopic:   { young: 0.5, everyone: 0.8, mature: 1.0 },
  truecrime:     { young: 0.2, everyone: 0.5, mature: 1.0 },
  fantasyquest:  { young: 1.0, everyone: 1.0, mature: 0.5 },
  roadtrip:      { young: 0.8, everyone: 1.0, mature: 0.8 },
  spacewar:      { young: 0.8, everyone: 1.0, mature: 0.8 },
  romcom:        { young: 0.8, everyone: 1.0, mature: 0.8 },
};

// Genre × Audience
export const GENRE_AUDIENCE_FIT = {
  action:      { young: 0.8, everyone: 1.0, mature: 1.0 },
  comedy:      { young: 1.0, everyone: 1.0, mature: 0.8 },
  drama:       { young: 0.5, everyone: 0.8, mature: 1.0 },
  horror:      { young: 0.2, everyone: 0.5, mature: 1.0 },
  scifi:       { young: 0.8, everyone: 1.0, mature: 0.8 },
  romance:     { young: 0.5, everyone: 0.8, mature: 1.0 },
  thriller:    { young: 0.2, everyone: 0.8, mature: 1.0 },
  animation:   { young: 1.0, everyone: 1.0, mature: 0.5 },
  documentary: { young: 0.2, everyone: 0.8, mature: 1.0 },
  fantasy:     { young: 1.0, everyone: 1.0, mature: 0.8 },
};

// Audience × Size
export const AUDIENCE_SIZE_FIT = {
  young:      { short: 1.0, feature: 1.0, blockbuster: 0.5, epic: 0.2 },
  everyone:   { short: 1.0, feature: 1.0, blockbuster: 1.0, epic: 1.0 },
  mature:     { short: 0.5, feature: 1.0, blockbuster: 1.0, epic: 1.0 },
};

// Genre × Size
export const GENRE_SIZE_FIT = {
  action:      { short: 0.5, feature: 1.0, blockbuster: 1.0, epic: 1.0 },
  comedy:      { short: 1.0, feature: 1.0, blockbuster: 1.0, epic: 0.5 },
  drama:       { short: 1.0, feature: 1.0, blockbuster: 0.8, epic: 0.8 },
  horror:      { short: 1.0, feature: 1.0, blockbuster: 0.8, epic: 0.5 },
  scifi:       { short: 0.5, feature: 0.8, blockbuster: 1.0, epic: 1.0 },
  romance:     { short: 1.0, feature: 1.0, blockbuster: 0.5, epic: 0.5 },
  thriller:    { short: 1.0, feature: 1.0, blockbuster: 1.0, epic: 0.8 },
  animation:   { short: 0.8, feature: 1.0, blockbuster: 1.0, epic: 1.0 },
  documentary: { short: 1.0, feature: 1.0, blockbuster: 0.2, epic: 0.2 },
  fantasy:     { short: 0.2, feature: 0.8, blockbuster: 1.0, epic: 1.0 },
};

// Topic × Size
export const TOPIC_SIZE_FIT = {
  heist:         { short: 1.0, feature: 1.0, blockbuster: 1.0, epic: 0.5 },
  superhero:     { short: 0.5, feature: 0.8, blockbuster: 1.0, epic: 1.0 },
  war:           { short: 0.2, feature: 0.8, blockbuster: 1.0, epic: 1.0 },
  apocalypse:    { short: 0.5, feature: 0.8, blockbuster: 1.0, epic: 1.0 },
  comingofage:   { short: 1.0, feature: 1.0, blockbuster: 0.5, epic: 0.2 },
  revenge:       { short: 1.0, feature: 1.0, blockbuster: 0.8, epic: 0.5 },
  forbiddenlove: { short: 1.0, feature: 1.0, blockbuster: 0.5, epic: 0.5 },
  underworld:    { short: 0.8, feature: 1.0, blockbuster: 1.0, epic: 0.8 },
  sports:        { short: 1.0, feature: 1.0, blockbuster: 1.0, epic: 0.5 },
  musicbiopic:   { short: 1.0, feature: 1.0, blockbuster: 0.8, epic: 0.5 },
  truecrime:     { short: 1.0, feature: 1.0, blockbuster: 0.5, epic: 0.2 },
  fantasyquest:  { short: 0.2, feature: 0.8, blockbuster: 1.0, epic: 1.0 },
  roadtrip:      { short: 1.0, feature: 1.0, blockbuster: 0.5, epic: 0.2 },
  spacewar:      { short: 0.2, feature: 0.8, blockbuster: 1.0, epic: 1.0 },
  romcom:        { short: 1.0, feature: 1.0, blockbuster: 0.5, epic: 0.2 },
};

// ─── Helpers ───
export function getGenre(id) { return MOVIE_GENRES.find((g) => g.id === id); }
export function getTopic(id) { return MOVIE_TOPICS.find((t) => t.id === id); }
export function getMovieSize(id) { return MOVIE_SIZES.find((s) => s.id === id); }
export function getAudience(id) { return AUDIENCES.find((a) => a.id === id); }
export function getMovieSet(id) { return MOVIE_SETS.find((s) => s.id === id); }
export function getOwnedSets(business) { return business.sets || []; }

export function isGenreUnlocked(genre, staff) { return (staff || 0) >= (genre.staffUnlock || 0); }
export function isTopicUnlocked(topic, staff) { return (staff || 0) >= (topic.staffUnlock || 0); }
export function isSizeUnlocked(size, staff) { return (staff || 0) >= (size.staffUnlock || 0); }
export function isAudienceUnlocked(audience, staff) { return (staff || 0) >= (audience.staffUnlock || 0); }

// Calculate dev time with multi-genre penalty
export function calculateDevTimeMs(sizeId, genreIds) {
  const size = getMovieSize(sizeId);
  if (!size) return 0;
  let devHours = size.devHours;
  const extraGenres = Math.max(0, (genreIds || []).length - 1);
  devHours *= (1 + extraGenres * MULTI_GENRE_TIME_PENALTY);
  return devHours * 60 * 60 * 1000;
}

export function getLevelMultiplier(business) {
  return Math.pow(1.12, Math.max(1, business.level || 1) - 1);
}

export function getMaxMovieSlots(business) {
  const level = Math.max(1, business.level || 1);
  return Math.min(MAX_ACTIVE_MOVIES, 1 + Math.floor((level - 1) / 6));
}

// ─── Fatigue calculation (same as gamedev) ───
export function calculateFatigue(business, genreIds, topicId, sizeId, audienceId) {
  const releasedMovies = (business.movies || []).filter((m) => m.releasedAt);
  if (releasedMovies.length === 0) return { multiplier: 1.0, breakdown: null };

  const now = Date.now();
  const gIds = Array.isArray(genreIds) ? genreIds : [genreIds];

  let topicFatigue = 0, genreFatigue = 0;

  for (const movie of releasedMovies) {
    const hoursSince = (now - movie.releasedAt) / (1000 * 60 * 60);
    if (hoursSince >= FATIGUE_WINDOW_HOURS) continue;
    const recencyWeight = 1 - (hoursSince / FATIGUE_WINDOW_HOURS);

    const movieGIds = Array.isArray(movie.genreIds) ? movie.genreIds : (movie.genreId ? [movie.genreId] : []);

    if (movie.topicId === topicId) topicFatigue += recencyWeight * FATIGUE_PER_REPEAT;

    const genreOverlap = gIds.filter((id) => movieGIds.includes(id)).length;
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
// Uses compatibility matrices + staff, level, fatigue, sets, and budget
export function calculateMovieRating(business, genreIds, topicId, sizeId, audienceId, setId, fatigueMultiplier = 1.0) {
  const size = getMovieSize(sizeId);
  const topic = getTopic(topicId);
  if (!size || !topic) return { rating: 1, breakdown: null };

  const gIds = Array.isArray(genreIds) ? genreIds : [genreIds];
  const genres = gIds.map(getGenre).filter(Boolean);
  if (genres.length === 0) return { rating: 1, breakdown: null };

  const staff = business.staff || 0;
  const level = Math.max(1, business.level || 1);
  const audience = getAudience(audienceId);

  // 1. Staff score (0-1): combines staff count vs size requirement AND average skill
  const staffRatio = Math.min(1.5, staff / Math.max(1, size.staffReq));
  const avgSkill = getStaffAvgSkill(business);
  const skillFactor = avgSkill / 10;
  const staffScore = Math.min(1.0, staffRatio * 0.5 + skillFactor * 0.5);

  // 2. Topic × Genre fit (average across selected genres)
  let tgSum = 0;
  for (const g of genres) {
    tgSum += (TOPIC_GENRE_FIT[topicId]?.[g.id] ?? 0.5);
  }
  const topicGenreFit = tgSum / genres.length;

  // 3. Topic × Audience fit
  const topicAudienceFit = TOPIC_AUDIENCE_FIT[topicId]?.[audienceId] ?? 0.5;

  // 4. Genre × Audience fit (average across selected genres)
  let gaSum = 0;
  for (const g of genres) {
    gaSum += (GENRE_AUDIENCE_FIT[g.id]?.[audienceId] ?? 0.5);
  }
  const genreAudienceFit = gaSum / genres.length;

  // 5. Audience × Size fit
  const audienceSizeFit = AUDIENCE_SIZE_FIT[audienceId]?.[sizeId] ?? 0.5;

  // 6. Genre × Size fit (average across selected genres)
  let gsSum = 0;
  for (const g of genres) {
    gsSum += (GENRE_SIZE_FIT[g.id]?.[sizeId] ?? 0.5);
  }
  const genreSizeFit = gsSum / genres.length;

  // 7. Topic × Size fit
  const topicSizeFit = TOPIC_SIZE_FIT[topicId]?.[sizeId] ?? 0.5;

  // 8. Set quality bonus
  const setBonus = getMovieSet(setId)?.qualityBonus || 0;

  // Level bonus
  const levelBonus = Math.min(0.3, (level - 1) * 0.02);

  // Multi-genre penalty
  const multiPenalty = Math.max(0, (genres.length - 1) * 0.05);

  // Random factor (±8%)
  const randomFactor = 0.92 + Math.random() * 0.16;

  // Combine factors with weights
  const comboFit = (topicGenreFit * 0.20 + topicAudienceFit * 0.12 + genreAudienceFit * 0.12 + audienceSizeFit * 0.12 + genreSizeFit * 0.12 + topicSizeFit * 0.12);

  // Bad fit penalty
  const allFits = [topicGenreFit, topicAudienceFit, genreAudienceFit, audienceSizeFit, genreSizeFit, topicSizeFit];
  const badFitPenalty = allFits.filter((f) => f <= 0.3).length * 0.15;

  const quality = Math.max(0, (staffScore * 0.35 + comboFit * 0.55 + setBonus + levelBonus - multiPenalty - badFitPenalty) * randomFactor * fatigueMultiplier);

  const rating = Math.max(1, Math.min(10, Math.round(quality * 10)));

  const breakdown = {
    staffScore: Math.round(staffScore * 100) / 100,
    topicGenreFit: Math.round(topicGenreFit * 100) / 100,
    topicAudienceFit: Math.round(topicAudienceFit * 100) / 100,
    genreAudienceFit: Math.round(genreAudienceFit * 100) / 100,
    audienceSizeFit: Math.round(audienceSizeFit * 100) / 100,
    genreSizeFit: Math.round(genreSizeFit * 100) / 100,
    topicSizeFit: Math.round(topicSizeFit * 100) / 100,
    setBonus: Math.round(setBonus * 100) / 100,
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

// ─── Movie income calculation ───
export function getMovieHourlyIncome(movie) {
  if (!movie || !movie.releasedAt) return 0;
  const now = Date.now();
  const elapsedHr = (now - movie.releasedAt) / (1000 * 60 * 60);
  const bonusHr = movie.bonusHours || 0;
  const fatigueMult = movie.fatigueMultiplier || 1.0;
  const totalLifespan = (MOVIE_LIFESPAN_HOURS + bonusHr) * fatigueMult;
  if (elapsedHr >= totalLifespan) return 0;

  const size = getMovieSize(movie.sizeId);
  if (!size) return 0;

  const gIds = Array.isArray(movie.genreIds) ? movie.genreIds : (movie.genreId ? [movie.genreId] : []);
  const genres = gIds.map(getGenre).filter(Boolean);
  if (genres.length === 0) return 0;

  const avgGenreIncome = genres.reduce((s, g) => s + g.incomeBase, 0) / genres.length;
  const genreBonus = 1 + (genres.length - 1) * 0.2;

  const audience = getAudience(movie.audienceId);
  const audienceMult = audience ? audience.incomeMult : 1.0;

  const baseIncome = avgGenreIncome * size.incomeMult * genreBonus * audienceMult;
  const ratingMult = Math.pow(movie.rating / 10, 2);
  const decayFactor = 1 - (elapsedHr / totalLifespan);

  return Math.floor(baseIncome * ratingMult * decayFactor * fatigueMult);
}

// ─── Total hourly income for the studio ───
export function getMovieStudioHourlyIncome(business) {
  const movies = business.movies || [];
  const levelMult = getLevelMultiplier(business);

  let income = 0;
  for (const movie of movies) {
    income += getMovieHourlyIncome(movie) * levelMult;
  }

  income -= getStaffSalaryHourly(business);

  return income;
}

export function getMovieStudioPendingIncomeHourly(business) {
  const movies = business.movies || [];
  const levelMult = getLevelMultiplier(business);
  let income = 0;
  for (const movie of movies) {
    if (movie.releasedAt) {
      income += getMovieHourlyIncome(movie) * levelMult;
    }
  }
  return Math.floor(income);
}

// ─── Staff salary (safe against old state) ───
export function getStaffSalaryHourly(business) {
  const members = business.staffMembers || [];
  if (members.length === 0) {
    const staffCount = typeof business.staff === 'number' ? business.staff : 0;
    return staffCount * STAFF_SALARY_HOURLY;
  }
  return members.reduce((total, m) => total + (m.salary || STAFF_SALARY_HOURLY), 0);
}

// ─── Pending income from released movies still earning ───
export function getMovieStudioPendingSales(business) {
  const movies = business.movies || [];
  let pending = 0;
  for (const movie of movies) {
    if (!movie.releasedAt) continue;
    const elapsedHr = (Date.now() - movie.releasedAt) / (1000 * 60 * 60);
    const bonusHr = movie.bonusHours || 0;
    const fatigueMult = movie.fatigueMultiplier || 1.0;
    const totalLifespan = (MOVIE_LIFESPAN_HOURS + bonusHr) * fatigueMult;
    if (elapsedHr >= totalLifespan) continue;
    const remainingHr = totalLifespan - elapsedHr;
    pending += getMovieHourlyIncome(movie) * remainingHr;
  }
  return Math.floor(pending);
}

// ─── Staff reservation ───
export function getReservedStaff(business) {
  const activeMovies = (business.movies || []).filter((m) => !m.releasedAt);
  let reserved = 0;
  for (const m of activeMovies) {
    const size = getMovieSize(m.sizeId);
    if (size) reserved += size.staffReq;
  }
  return reserved;
}

export function getAvailableStaff(business) {
  const staffCount = typeof business.staff === 'number' ? business.staff : 0;
  return Math.max(0, staffCount - getReservedStaff(business));
}

// ─── Start developing a movie ───
export function startMovieDev(business, genreIds, topicId, sizeId, audienceId, title, setId) {
  const size = getMovieSize(sizeId);
  if (!size) return null;

  const activeMovies = (business.movies || []).filter((m) => !m.releasedAt);
  if (activeMovies.length >= getMaxMovieSlots(business)) return null;

  const availableStaff = getAvailableStaff(business);
  if (availableStaff < size.staffReq) return null;

  const now = Date.now();
  const devTimeMs = calculateDevTimeMs(sizeId, genreIds);

  const movie = {
    instanceId: `movie_${now}_${Math.random().toString(36).slice(2, 7)}`,
    title: title || 'Untitled',
    genreIds: Array.isArray(genreIds) ? genreIds : [genreIds],
    topicId,
    sizeId,
    audienceId: audienceId || 'everyone',
    setId: setId || null,
    startedAt: now,
    completesAt: now + scaleDuration(Math.random() < 0.3 ? 0 : devTimeMs),
    releasedAt: null,
    rating: 0,
    income: 0,
  };

  return {
    ...business,
    movies: [...(business.movies || []), movie],
  };
}

// ─── Complete movie development (release) ───
export function releaseMovie(business, instanceId) {
  const movies = (business.movies || []).map((m) => {
    if (m.instanceId === instanceId && !m.releasedAt) {
      const genreIds = Array.isArray(m.genreIds) ? m.genreIds : (m.genreId ? [m.genreId] : []);
      const fatigue = calculateFatigue(business, genreIds, m.topicId, m.sizeId, m.audienceId);
      const result = calculateMovieRating(business, genreIds, m.topicId, m.sizeId, m.audienceId, m.setId, fatigue.multiplier);
      const rating = typeof result === 'object' ? result.rating : result;
      const breakdown = typeof result === 'object' ? result.breakdown : null;
      return {
        ...m,
        releasedAt: Date.now(),
        rating,
        ratingBreakdown: breakdown,
        fatigueMultiplier: fatigue.multiplier,
        fatigueBreakdown: fatigue.breakdown,
      };
    }
    return m;
  });

  return { ...business, movies };
}

// ─── Check for completed movie development ───
export function getCompletedMovies(business) {
  const now = Date.now();
  return (business.movies || []).filter((m) => !m.releasedAt && m.completesAt <= now);
}

// ─── Get development time remaining ───
export function getMovieDevTimeRemaining(movie) {
  if (!movie || movie.releasedAt) return 0;
  return Math.max(0, movie.completesAt - Date.now());
}

// ─── Market a released movie to extend its lifespan ───
export function marketMovie(business, movieInstanceId) {
  const movies = business.movies || [];
  const movie = movies.find((m) => m.instanceId === movieInstanceId && m.releasedAt);
  if (!movie) return null;

  const elapsedHr = (Date.now() - movie.releasedAt) / (1000 * 60 * 60);
  const bonusHr = movie.bonusHours || 0;
  const fatigueMult = movie.fatigueMultiplier || 1.0;
  const totalLifespan = (MOVIE_LIFESPAN_HOURS + bonusHr) * fatigueMult;
  if (elapsedHr >= totalLifespan) return null;

  const marketingCount = movie.marketingCount || 0;
  const bonusHours = Math.max(1, MARKETING_BASE_HOURS - marketingCount);

  const size = getMovieSize(movie.sizeId);
  const sizeMult = size ? size.incomeMult : 1;
  const cost = Math.floor(MARKETING_BASE_COST * sizeMult * Math.pow(1.5, marketingCount));

  const updatedMovies = movies.map((m) => {
    if (m.instanceId === movieInstanceId) {
      return {
        ...m,
        bonusHours: (m.bonusHours || 0) + bonusHours,
        marketingCount: marketingCount + 1,
      };
    }
    return m;
  });

  return { business: { ...business, movies: updatedMovies }, bonusHours, cost };
}

// ─── Open a set ───
export function openSet(business, setId) {
  const set = getMovieSet(setId);
  const released = (business.movies || []).filter((m) => m.releasedAt).length;
  const rated = (business.movies || []).filter((m) => m.releasedAt && m.rating).map((m) => m.rating);
  const averageRating = rated.length ? rated.reduce((sum, r) => sum + r, 0) / rated.length : 0;
  const staffCount = typeof business.staff === 'number' ? business.staff : 0;
  if (!set) return { error: 'invalid_set' };
  if (staffCount < (set.staffUnlock || 0) || released < (set.requiredReleased || 0) || averageRating < (set.requiredAverageRating || 0)) return { error: 'progress_locked' };
  if ((business.sets || []).some((owned) => owned.setId === setId)) return { error: 'already_exists' };
  return { ...business, sets: [...(business.sets || []), { setId, name: set.name, openedAt: Date.now() }], cost: set.openCost };
}

// ─── Staff member generation (same as gamedev) ───
export function generateStaffMember() {
  const person = generatePerson();
  const roll = Math.random();
  let skill;
  if (roll < 0.05) skill = Math.floor(Math.random() * 2) + 1;
  else if (roll < 0.60) skill = Math.floor(Math.random() * 5) + 3;
  else if (roll < 0.85) skill = Math.floor(Math.random() * 2) + 8;
  else skill = 10;
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
  if (members.length === 0) return 0;
  return members.reduce((sum, m) => sum + m.skill, 0) / members.length;
}

// ─── Staff hiring (mirrors gamedev pattern) ───
export function hireStaff(business, count) {
  const currentHiring = business.hiringStaff || [];
  if (currentHiring.length + count > MAX_HIRING_AT_ONCE) return null;

  const now = Date.now();
  const newHires = [];
  for (let i = 0; i < count; i++) {
    const duration = STAFF_HIRE_MIN_MS + Math.random() * (STAFF_HIRE_MAX_MS - STAFF_HIRE_MIN_MS);
    const member = generateStaffMember();
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

  const newMember = hire.staffMember || generateStaffMember();
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

// ─── Migrate old movie studio state to new format ───
export function migrateMovieStudio(business) {
  let migrated = { ...business };

  // Old format had staff as object {scriptwriter, actor, crew} - convert to number
  if (typeof migrated.staff !== 'number') {
    if (migrated.staff && typeof migrated.staff === 'object') {
      migrated.staff = Object.values(migrated.staff).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
    } else {
      migrated.staff = 0;
    }
  }

  // Remove old fields that no longer exist
  delete migrated.staffTypes;
  delete migrated.scripts;
  delete migrated.scriptTypes;

  // Ensure new fields exist
  if (!migrated.movies) migrated.movies = [];
  if (!migrated.staffMembers) migrated.staffMembers = [];
  if (!migrated.hiringStaff) migrated.hiringStaff = [];
  if (!migrated.sets) migrated.sets = [];

  return migrated;
}

// ─── Process movie studio business tick ───
export function processMovieStudio(business, minutesElapsed) {
  const hoursFraction = minutesElapsed / 60;
  const levelMult = getLevelMultiplier(business);
  let income = 0;

  // Migrate old state and generate staffMembers for existing saves
  let workingBusiness = migrateMovieStudio(business);
  if (workingBusiness.staff > 0 && workingBusiness.staffMembers.length === 0) {
    const members = [];
    for (let i = 0; i < workingBusiness.staff; i++) {
      members.push(generateStaffMember());
    }
    workingBusiness = { ...workingBusiness, staffMembers: members };
  }

  // Income from released movies
  const movies = (workingBusiness.movies || []).map((m) => {
    if (m.releasedAt) {
      const movieIncome = getMovieHourlyIncome(m) * levelMult * hoursFraction;
      income += movieIncome;
      return { ...m, income: (m.income || 0) + movieIncome };
    }
    return m;
  });

  // Staff salary
  const salary = getStaffSalaryHourly(workingBusiness) * hoursFraction;
  income -= salary;

  // Remove expired movies
  const now = Date.now();
  const activeMovies = movies.filter((m) => {
    if (!m.releasedAt) return true;
    const elapsedHr = (now - m.releasedAt) / (1000 * 60 * 60);
    const fatigueMult = m.fatigueMultiplier || 1.0;
    const totalLifespan = (MOVIE_LIFESPAN_HOURS + (m.bonusHours || 0)) * fatigueMult;
    return elapsedHr < totalLifespan;
  });

  return {
    updatedBusiness: {
      ...workingBusiness,
      movies: activeMovies,
      allTimeEarnings: (workingBusiness.allTimeEarnings || 0) + income,
    },
    income,
  };
}

// ─── Format time helper ───
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
