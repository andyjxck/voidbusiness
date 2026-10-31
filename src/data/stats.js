// Persistent game stats tracking.
// Tracks lifetime totals: taps, earnings, play time, businesses, investments, etc.
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY = 'tapGameStats';

const defaultStats = {
  totalTaps: 0,
  totalEarned: 0,          // lifetime earnings from all sources
  totalTapEarnings: 0,     // earnings specifically from tapping
  totalPassiveEarnings: 0, // earnings from investments/businesses/estates
  totalBusinessIncome: 0,
  totalInvestmentIncome: 0,
  totalEstateIncome: 0,
  businessesOwned: 0,      // current count
  businessesBought: 0,     // lifetime count
  businessesSold: 0,
  businessesUpgraded: 0,
  investmentsBought: 0,
  investmentsSold: 0,
  estatesOwned: 0,         // current count
  estatesBought: 0,
  jobsHeld: 0,             // lifetime jobs accepted
  jobTapsCompleted: 0,
  boostsUsed: 0,
  adsWatched: 0,
  eventsTriggered: 0,
  highestBalance: 0,
  firstPlayTimestamp: null,
  lastPlayTimestamp: null,
  totalPlayTimeMs: 0,      // accumulated active play time
};

let stats = { ...defaultStats };
let sessionStart = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn({ ...stats }));
}

export function subscribeStats(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getStats() {
  return { ...stats };
}

export async function loadStats() {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (raw) stats = { ...defaultStats, ...JSON.parse(raw) };
  } catch (e) { /* best-effort */ }
  sessionStart = Date.now();
  if (!stats.firstPlayTimestamp) {
    stats.firstPlayTimestamp = Date.now();
    await persistStats();
  }
  notify();
  return { ...stats };
}

async function persistStats() {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) { /* best-effort */ }
}

export async function recordTaps(count = 1, earnings = 0) {
  stats.totalTaps += count;
  stats.totalTapEarnings += earnings;
  stats.totalEarned += earnings;
  if (stats.highestBalance < earnings + getCurrentBalance()) {
    // highestBalance updated separately via recordBalance
  }
  notify();
  // Throttle persistence - save every 10 taps
  if (stats.totalTaps % 10 === 0) await persistStats();
}

export async function recordPassiveIncome(amount, source = 'investment') {
  if (amount <= 0) return;
  stats.totalPassiveEarnings += amount;
  stats.totalEarned += amount;
  if (source === 'business') stats.totalBusinessIncome += amount;
  else if (source === 'estate') stats.totalEstateIncome += amount;
  else stats.totalInvestmentIncome += amount;
  notify();
}

export async function recordBalance(balance) {
  if (balance > stats.highestBalance) {
    stats.highestBalance = balance;
    await persistStats();
  }
}

export async function recordBusinessBought() {
  stats.businessesBought += 1;
  stats.businessesOwned += 1;
  notify();
  await persistStats();
}

export async function recordBusinessSold() {
  stats.businessesSold += 1;
  stats.businessesOwned = Math.max(0, stats.businessesOwned - 1);
  notify();
  await persistStats();
}

export async function recordBusinessUpgraded() {
  stats.businessesUpgraded += 1;
  notify();
  await persistStats();
}

export async function recordInvestmentBought() {
  stats.investmentsBought += 1;
  notify();
  await persistStats();
}

export async function recordInvestmentSold() {
  stats.investmentsSold += 1;
  notify();
  await persistStats();
}

export async function recordEstateBought() {
  stats.estatesBought += 1;
  stats.estatesOwned += 1;
  notify();
  await persistStats();
}

// "Owned" counts are snapshots, not events: sync them straight from game
// state so existing saves show real numbers instead of starting from zero.
export function syncOwnedCounts({ businesses, estates }) {
  if (Number.isFinite(businesses)) stats.businessesOwned = Math.max(0, businesses);
  if (Number.isFinite(estates)) stats.estatesOwned = Math.max(0, estates);
  notify();
}

export async function recordJobAccepted() {
  stats.jobsHeld += 1;
  notify();
  await persistStats();
}

export async function recordJobTapsCompleted(count = 1) {
  stats.jobTapsCompleted += count;
  notify();
  if (stats.jobTapsCompleted % 10 === 0) await persistStats();
}

export async function recordBoostUsed() {
  stats.boostsUsed += 1;
  notify();
  await persistStats();
}

export async function recordAdWatched() {
  stats.adsWatched += 1;
  notify();
  await persistStats();
}

export async function recordEventTriggered() {
  stats.eventsTriggered += 1;
  notify();
  await persistStats();
}

// Call when the app goes to background or periodically to accumulate play time
export async function flushPlayTime() {
  if (sessionStart) {
    stats.totalPlayTimeMs += Date.now() - sessionStart;
    sessionStart = Date.now();
    stats.lastPlayTimestamp = Date.now();
    await persistStats();
  }
}

export async function resetStats() {
  stats = { ...defaultStats, firstPlayTimestamp: Date.now() };
  sessionStart = Date.now();
  notify();
  await persistStats();
}

// Helper to get current balance (set externally)
let _currentBalance = 0;
export function setCurrentBalance(b) { _currentBalance = b; }
export function getCurrentBalance() { return _currentBalance; }
