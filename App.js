import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';

import HomeScreen from './src/screens/HomeScreen';
import InvestmentsScreen from './src/screens/InvestmentsScreen';
import BusinessScreen from './src/screens/BusinessScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FloatingNavBar from './src/components/FloatingNavBar';
import AppShell from './src/components/AppShell';
import ErrorBoundary from './src/components/ErrorBoundary';
import {
  createInitialMarketState,
  simulateMarket,
  calculatePassiveIncome,
  ALL_ASSETS,
  getHourlyIncome as getInvestmentHourlyIncome,
  formatMoney,
} from './src/data/market';
import {
  processBusinesses,
  completePendingUpgrades,
  getHourlyIncome as getBusinessHourlyIncome,
  getTaxOwed,
  startBusiness,
  legacyProjectedTax,
} from './src/data/businesses';
import { getConstructionPendingPayout } from './src/data/construction';
import { getDealershipPendingSales, createFoundersDealership } from './src/data/dealership';
import {
  initStore,
  loadEntitlements,
  setGameReady,
  setGrantHandler,
  subscribeStore,
  hasAccountant,
  resetFoundersDealershipGrant,
  isVip,
  scaleDuration,
  isLegacyUnlocked,
  markLegacyUnlocked,
} from './src/data/store';
import ShopScreen from './src/screens/ShopScreen';
import { restoreCloudIfNewer, saveToCloud, GAME_KEYS } from './src/data/cloudsave';
import { runMigrations } from './src/data/migrations';
import { issueFoundersDealership } from './src/data/foundersGrant';
import { LEGACY_UNLOCK_AT, hasReachedLegacy } from './src/data/legacyUnlock';
import { initAds, showRewardedAd } from './src/data/ads';
import { loadSettings } from './src/data/settings';
import { loadLanguage, t, tf } from './src/data/i18n';
import { loadStats, recordPassiveIncome, recordBalance, setCurrentBalance, flushPlayTime, resetStats, recordBusinessBought, recordEstateBought, syncOwnedCounts } from './src/data/stats';
import ProgressionScreen from './src/screens/ProgressionScreen';
import {
  createInitialProgression,
  getEstateHourlyIncome,
  getSetBonusMultiplier,
  getOwnedCount,
  getOwnedItemsByCategory,
  resolveAuctions,
  tickAuctions,
  processAcquisitions,
  processEstateWorks,
} from './src/data/progression';
import { NotificationProvider, useNotify } from './src/components/Notifications';
import { useAppSettings, useThemeColors } from './src/components/AppText';
import { showAlert } from './src/data/alert';

// Legacy is post-Bank content, so the tab stays hidden until the player is
// operating at that scale - then stays for good (src/data/legacyUnlock.js).

// Progress keys written as one debounced snapshot so a crash never leaves
// money and businesses from different moments on disk.
const SAVE_DEBOUNCE_MS = 750;

function safeParseJson(raw, fallback) {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function safeInt(raw, fallback) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

// Fill any fields an older save is missing from a fresh instance of the same
// business so arithmetic downstream never sees undefined.
function normalizeBusiness(b) {
  if (!b || typeof b !== 'object' || !b.type) return null;
  const fresh = startBusiness(b.type, b.subType) || {};
  const merged = { ...fresh, ...b };
  if (!Number.isFinite(merged.level) || merged.level < 1) merged.level = 1;
  if (!Number.isFinite(merged.stock)) merged.stock = 0;
  if (!Number.isFinite(merged.allTimeEarnings)) merged.allTimeEarnings = 0;
  if (!Number.isFinite(merged.taxAccrued)) merged.taxAccrued = legacyProjectedTax(merged);
  return merged;
}

// Real estate deals take 3-8 real hours to close
function getPurchaseDurationMs() {
  const hours = 3 + Math.random() * 5;
  return hours * 60 * 60 * 1000;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const notify = useNotify();
  useAppSettings(); // re-render on settings change (theme, etc.)
  const [activeTab, setActiveTab] = useState('home');

  // Game state
  const [money, setMoney] = useState(0);
  const [boostActive, setBoostActive] = useState(false);
  const [boostTimeLeft, setBoostTimeLeft] = useState(0);

  // Investment state
  const [marketState, setMarketState] = useState(createInitialMarketState());
  const [holdings, setHoldings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [, setStoreTick] = useState(0);

  // Business state
  const [ownedBusinesses, setOwnedBusinesses] = useState([]);
  const [businessBoostExpiresAt, setBusinessBoostExpiresAt] = useState(0);

  // Real estate pending closings (lifted from InvestmentsScreen so they complete globally)
  const [pendingPurchases, setPendingPurchases] = useState([]);

  // Job state (lifted from HomeScreen so it persists across tab switches)
  const [currentJob, setCurrentJob] = useState(null);
  const [jobTapsLeft, setJobTapsLeft] = useState(0);
  const [appliedJobs, setAppliedJobs] = useState({});

  // Progression state
  const [progression, setProgression] = useState(createInitialProgression());

  // Latest values for intervals/listeners without re-creating them.
  const moneyRef = useRef(money);
  const holdingsRef = useRef(holdings);
  const ownedBusinessesRef = useRef(ownedBusinesses);
  const businessBoostRef = useRef(businessBoostExpiresAt);
  const progressionRef = useRef(progression);
  const marketStateRef = useRef(marketState);
  const pendingRef = useRef(pendingPurchases);
  const currentJobRef = useRef(currentJob);
  const jobTapsLeftRef = useRef(jobTapsLeft);
  const appliedJobsRef = useRef(appliedJobs);
  moneyRef.current = money;
  holdingsRef.current = holdings;
  ownedBusinessesRef.current = ownedBusinesses;
  businessBoostRef.current = businessBoostExpiresAt;
  progressionRef.current = progression;
  marketStateRef.current = marketState;
  pendingRef.current = pendingPurchases;
  currentJobRef.current = currentJob;
  jobTapsLeftRef.current = jobTapsLeft;
  appliedJobsRef.current = appliedJobs;

  // Credits passive income for a real elapsed window (capped) and advances
  // the market. Shared by the live tick and the foreground catch-up.
  const lastTickRef = useRef(Date.now());
  const runIncomeTick = useCallback(() => {
    const now = Date.now();
    const elapsedMs = Math.max(0, now - lastTickRef.current);
    if (elapsedMs < 60000) return;
    const { marketState: newMarket, minutesElapsed: minutes } = simulateMarket(marketStateRef.current, now - elapsedMs, now);
    if (minutes <= 0) return;
    // Advance by the credited minutes only, so the sub-minute remainder
    // carries into the next tick instead of being discarded.
    lastTickRef.current += minutes * 60000;
    const investmentIncome = calculatePassiveIncome(holdingsRef.current, newMarket, minutes);
    const { updatedBusinesses: processedBiz, totalIncome: businessIncomeTotal } = processBusinesses(ownedBusinessesRef.current, minutes, businessBoostRef.current);
    const setBonus = getSetBonusMultiplier(progressionRef.current);
    const estateIncome = (getEstateHourlyIncome(progressionRef.current) / 60) * minutes;
    const businessIncome = businessIncomeTotal * setBonus;
    const totalIncome = investmentIncome + businessIncome + estateIncome;

    // Personal Accountant (Founders Bundle): auto-pays each business's tax
    // bill while funds cover it, so nothing ever suspends.
    let updatedBusinesses = processedBiz;
    let accountantPaid = 0;
    if (hasAccountant()) {
      let bal = Math.max(0, moneyRef.current + (Number.isFinite(totalIncome) ? totalIncome : 0));
      updatedBusinesses = processedBiz.map((b) => {
        const owed = getTaxOwed(b);
        if (owed > 0 && bal >= owed) {
          bal -= owed;
          accountantPaid += owed;
          return { ...b, taxAccrued: 0, taxLastPaidAt: now };
        }
        return b;
      });
    }

    const delta = (Number.isFinite(totalIncome) ? totalIncome : 0) - accountantPaid;
    if (delta !== 0) {
      // Losses (payroll with no income) are charged, floored at zero.
      setMoney((m) => Math.max(0, (Number.isFinite(m) ? m : 0) + delta));
    }
    if (totalIncome > 0) {
      recordPassiveIncome(Math.max(0, investmentIncome), 'investment');
      recordPassiveIncome(Math.max(0, businessIncome), 'business');
      recordPassiveIncome(Math.max(0, estateIncome), 'estate');
    }
    setOwnedBusinesses(updatedBusinesses);
    setMarketState(newMarket);
  }, []);

  // Load saved state on mount
  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadLanguage();
      await loadStats();

      // Bundled emoji font - the iOS 26 sim runtime can't render system emoji.
      Font.loadAsync({ NotoColorEmoji: require('./assets/fonts/NotoColorEmoji.ttf') }).catch(() => {});

      // Pull the iCloud save first - if it's newer than local, restore it
      // into AsyncStorage so the reads below pick it up.
      await restoreCloudIfNewer();

      // Run any pending save-schema migrations before reading state.
      await runMigrations();

      // Load purchase entitlements (reads tapGameStore just restored from
      // iCloud) so VIP perks apply to offline earnings below.
      await loadEntitlements();

      // Start the ad SDK now that VIP status is known (VIPs skip the ad
      // preload), and connect to StoreKit in the background. Transactions it
      // delivers are held until the save below has loaded - see the
      // setGameReady effect - so a launch-time grant can't be overwritten.
      initAds();
      initStore().catch(() => {});

      const entries = Object.fromEntries(await AsyncStorage.multiGet(GAME_KEYS));
      const now = Date.now();

      let m = parseFloat(entries.tapGameMoney);
      if (!Number.isFinite(m) || m < 0) m = 0;

      let market = createInitialMarketState();
      const savedMarket = safeParseJson(entries.tapGameMarket, null);
      if (savedMarket && typeof savedMarket === 'object') {
        // Merge: use saved prices but ensure all new assets exist and are sane
        for (const key of Object.keys(market)) {
          const sv = savedMarket[key];
          if (sv && Number.isFinite(sv.price) && sv.price > 0) {
            const hist = Array.isArray(sv.history) && sv.history.length >= 2 && sv.history.every(Number.isFinite)
              ? sv.history
              : market[key].history;
            market[key] = { ...market[key], ...sv, history: hist };
          }
        }
      }

      let hs = safeParseJson(entries.tapGameHoldings, []);
      if (!Array.isArray(hs)) hs = [];
      hs = hs.filter((h) => h && h.assetId && Number.isFinite(h.quantity) && h.quantity > 0)
        .map((h) => ({ ...h, avgCost: Number.isFinite(h.avgCost) ? h.avgCost : 0 }));

      let bs = safeParseJson(entries.tapGameBusinesses, []);
      if (!Array.isArray(bs)) bs = [];
      bs = bs.map(normalizeBusiness).filter(Boolean);

      // Founders Bundle restored on a fresh install: issue the ready-to-run
      // dealership once (tracked in the entitlement store, not the business,
      // so selling it can't re-trigger the grant).
      const foundersGrant = issueFoundersDealership(bs);
      bs = foundersGrant.businesses;
      if (foundersGrant.issued) recordBusinessBought();

      const boost = safeInt(entries.tapGameBusinessBoost, 0);
      // Never trust a future timestamp: a clock set back would otherwise
      // freeze catch-up, a clock set forward would mint income.
      const lu = Math.min(now, safeInt(entries.tapGameLastUpdate, now) || now);

      const savedJob = safeParseJson(entries.tapGameCurrentJob, null);
      if (savedJob && typeof savedJob === 'object') setCurrentJob(savedJob);
      setJobTapsLeft(Math.max(0, safeInt(entries.tapGameJobTapsLeft, 0)));
      const savedApplied = safeParseJson(entries.tapGameAppliedJobs, {});
      if (savedApplied && typeof savedApplied === 'object' && !Array.isArray(savedApplied)) setAppliedJobs(savedApplied);

      let pro = { ...createInitialProgression(), ...(safeParseJson(entries.tapGameProgression, null) || {}) };
      if (!Array.isArray(pro.ownedItems)) pro.ownedItems = [];
      if (!Array.isArray(pro.estateWorks)) pro.estateWorks = [];
      if (!Array.isArray(pro.pendingAcquisitions)) pro.pendingAcquisitions = [];
      if (!pro.auctionBids || typeof pro.auctionBids !== 'object' || Array.isArray(pro.auctionBids)) pro.auctionBids = {};
      if (!pro.estateUpgrades || typeof pro.estateUpgrades !== 'object') pro.estateUpgrades = {};
      if (!pro.estateSecurity || typeof pro.estateSecurity !== 'object') pro.estateSecurity = {};
      if (!pro.displayed || typeof pro.displayed !== 'object') pro.displayed = { vault: [], gallery: [], showroom: [] };

      // Catch up any timed legacy events that completed while the app was closed
      const acq = processAcquisitions(pro, now);
      pro = acq.progression;
      const works = processEstateWorks(pro, now);
      pro = works.progression;
      const settled = resolveAuctions(pro, now, m);
      pro = settled.progression;
      m = Math.max(0, m - settled.spent + (settled.refund || 0));

      // Catch up real estate closings
      let re = safeParseJson(entries.tapGameREPending, []);
      if (!Array.isArray(re)) re = [];
      const keepRE = [];
      for (const p of re) {
        if (!p || !p.assetId || !Number.isFinite(p.completesAt)) continue;
        if (p.completesAt <= now) {
          recordEstateBought();
          const existing = hs.find((h) => h.assetId === p.assetId);
          const price = Number.isFinite(p.price) ? p.price : 0;
          if (existing) {
            hs = hs.map((h) =>
              h.assetId === p.assetId
                ? { ...h, quantity: h.quantity + 1, avgCost: (h.avgCost * h.quantity + price) / (h.quantity + 1) }
                : h
            );
          } else {
            hs = [...hs, { assetId: p.assetId, quantity: 1, avgCost: price }];
          }
        } else {
          keepRE.push(p);
        }
      }

      // Simulate market changes since last visit (elapsed is capped inside)
      const { marketState: newMarket, minutesElapsed } = simulateMarket(market, lu, now);

      // Offline earnings use the same formula as the live tick so the rate
      // the card shows is the rate the player actually gets.
      if (minutesElapsed > 0) {
        const investmentIncome = calculatePassiveIncome(hs, newMarket, minutesElapsed);
        const { updatedBusinesses: bsAfterIncome, totalIncome: businessIncomeTotal } = processBusinesses(bs, minutesElapsed, boost);
        const setBonus = getSetBonusMultiplier(pro);
        const businessIncome = businessIncomeTotal * setBonus;
        const estateIncome = (getEstateHourlyIncome(pro) / 60) * minutesElapsed;
        const total = investmentIncome + businessIncome + estateIncome;
        if (Number.isFinite(total) && total !== 0) {
          m = Math.max(0, m + total);
          if (total > 0) {
            recordPassiveIncome(Math.max(0, investmentIncome), 'investment');
            recordPassiveIncome(Math.max(0, businessIncome), 'business');
            recordPassiveIncome(Math.max(0, estateIncome), 'estate');
          }
        }
        bs = bsAfterIncome;
      }

      setMarketState(newMarket);
      setMoney(m);
      setHoldings(hs);
      setOwnedBusinesses(bs);
      setBusinessBoostExpiresAt(boost);
      setPendingPurchases(keepRE);
      setProgression(pro);
      lastTickRef.current = now;
      setLoaded(true);
    })();
  }, []);

  // ---- Persistence: one debounced multiSet snapshot of every progress key ----
  const saveTimerRef = useRef(null);
  const buildSnapshot = useCallback(() => ([
    ['tapGameMoney', String(Number.isFinite(moneyRef.current) ? moneyRef.current : 0)],
    ['tapGameHoldings', JSON.stringify(holdingsRef.current)],
    ['tapGameBusinesses', JSON.stringify(ownedBusinessesRef.current)],
    ['tapGameBusinessBoost', String(businessBoostRef.current || 0)],
    ['tapGameCurrentJob', JSON.stringify(currentJobRef.current)],
    ['tapGameJobTapsLeft', String(jobTapsLeftRef.current || 0)],
    ['tapGameAppliedJobs', JSON.stringify(appliedJobsRef.current)],
    ['tapGameProgression', JSON.stringify(progressionRef.current)],
    ['tapGameMarket', JSON.stringify(marketStateRef.current)],
    ['tapGameREPending', JSON.stringify(pendingRef.current)],
    ['tapGameLastUpdate', String(lastTickRef.current)],
  ]), []);
  const flushSave = useCallback(() => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    return AsyncStorage.multiSet(buildSnapshot()).catch(() => {});
  }, [buildSnapshot]);
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) return;
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      AsyncStorage.multiSet(buildSnapshot()).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }, [buildSnapshot]);

  useEffect(() => {
    if (!loaded) return;
    scheduleSave();
  }, [loaded, scheduleSave, money, holdings, ownedBusinesses, businessBoostExpiresAt, currentJob, jobTapsLeft, appliedJobs, progression, marketState, pendingPurchases]);

  // Balance stats (cheap; persistence inside is throttled to new highs)
  useEffect(() => {
    if (!loaded) return;
    setCurrentBalance(money);
    recordBalance(money);
  }, [money, loaded]);

  // Owned-count stats derive straight from state so older saves show real
  // numbers - "bought/sold" counters still accumulate as lifetime events.
  useEffect(() => {
    if (!loaded) return;
    const reUnits = holdings.reduce((sum, h) => sum + (h.assetId && h.assetId.startsWith('re_') ? h.quantity : 0), 0);
    const legacyEstates = getOwnedItemsByCategory(progression, 'estates').length;
    syncOwnedCounts({ businesses: ownedBusinesses.length, estates: reUnits + legacyEstates });
  }, [ownedBusinesses, holdings, progression, loaded]);

  // Legacy tab: once reached it stays (persisted in the entitlement store).
  // The Legacy Key pack sets the flag in the store when it's bought.
  const legacyOwnedCount = getOwnedCount(progression);
  const legacyReachedNow = money >= LEGACY_UNLOCK_AT || legacyOwnedCount > 0;
  useEffect(() => {
    if (!loaded || isLegacyUnlocked()) return;
    if (hasReachedLegacy({ money, progression })) markLegacyUnlocked();
    // money/progression are read only when the reached flag flips.
  }, [loaded, legacyReachedNow]);
  const legacyTabVisible = isLegacyUnlocked() || legacyReachedNow;

  // Flush play time periodically
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => flushPlayTime(), 30000);
    return () => { clearInterval(interval); flushPlayTime(); };
  }, [loaded]);

  // Mirror the full save to iCloud every 60 seconds (no-op when nothing changed)
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      saveToCloud();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [loaded]);

  // App lifecycle: iOS suspends JS in the background, so flush everything on
  // the way out and credit the real elapsed window on the way back.
  useEffect(() => {
    if (!loaded) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        flushPlayTime();
        flushSave().then(() => saveToCloud());
      } else if (state === 'active') {
        runIncomeTick();
      }
    });
    return () => sub.remove();
  }, [loaded, flushSave, runIncomeTick]);

  // Boost timer
  useEffect(() => {
    if (!boostActive) return;
    const interval = setInterval(() => {
      setBoostTimeLeft((t) => {
        if (t <= 1) {
          setBoostActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [boostActive]);

  // Live market tick - update prices and pay income every minute.
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(runIncomeTick, 60000);
    return () => clearInterval(interval);
  }, [loaded, runIncomeTick]);

  const loadedRef = useRef(false);
  const issueFoundersDealershipIfNeeded = useCallback(() => {
    if (!loadedRef.current) return;
    const res = issueFoundersDealership(ownedBusinessesRef.current);
    if (!res.issued) return;
    recordBusinessBought();
    const dealership = res.businesses[res.businesses.length - 1];
    setOwnedBusinesses((prev) => (prev.some((b) => b.foundersDealership) ? prev : [...prev, dealership]));
  }, []);

  // Store: apply purchase grants to game state + re-render on entitlement change
  useEffect(() => {
    setGrantHandler((grant) => {
      if (!grant) return;
      if (grant.kind === 'cash' || grant.kind === 'founders') {
        const amount = Number.isFinite(grant.amount) ? grant.amount : 0;
        setMoney((m) => (Number.isFinite(m) ? m : 0) + amount);
      }
      if (grant.kind === 'founders') {
        setOwnedBusinesses((prev) => {
          if (prev.some((b) => b.foundersDealership)) return prev;
          const biz = createFoundersDealership();
          return biz ? [...prev, { ...biz, foundersDealership: true }] : prev;
        });
      }
    });
    const unsub = subscribeStore(() => {
      setStoreTick((n) => n + 1);
      // Mid-session restore of Founders: issue the dealership immediately,
      // not just on next launch. Never before the save has loaded, or the
      // load would overwrite it.
      issueFoundersDealershipIfNeeded();
    });
    return () => {
      setGrantHandler(null);
      unsub();
    };
  }, [issueFoundersDealershipIfNeeded]);

  // Once the save is loaded: catch a Founders restore that finished while the
  // save was loading (StoreKit connects in the background), then release any
  // transactions StoreKit delivered during startup.
  useEffect(() => {
    if (!loaded) return undefined;
    loadedRef.current = true;
    issueFoundersDealershipIfNeeded();
    setGameReady(true);
    return () => {
      loadedRef.current = false;
      setGameReady(false);
    };
  }, [loaded, issueFoundersDealershipIfNeeded]);

  // Check for completed upgrades every second
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      const { updatedBusinesses, anyChanged } = completePendingUpgrades(ownedBusinessesRef.current);
      if (anyChanged) {
        setOwnedBusinesses(updatedBusinesses);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [loaded]);

  // Check for completed real estate closings every second
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const prev = pendingRef.current;
      const completed = prev.filter((p) => p.completesAt <= now);
      if (completed.length === 0) return;
      setPendingPurchases(prev.filter((p) => p.completesAt > now));
      completed.forEach(() => recordEstateBought());
      setHoldings((hs) => {
        let next = [...hs];
        for (const p of completed) {
          const existing = next.find((h) => h.assetId === p.assetId);
          if (existing) {
            next = next.map((h) =>
              h.assetId === p.assetId
                ? { ...h, quantity: h.quantity + 1, avgCost: (h.avgCost * h.quantity + p.price) / (h.quantity + 1) }
                : h
            );
          } else {
            next.push({ assetId: p.assetId, quantity: 1, avgCost: p.price });
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loaded]);

  // Legacy tick. Rivals keep bidding, lots settle, deliveries arrive and
  // estate works finish whether or not the player is on those screens, and
  // every outcome surfaces as an app-wide toast.
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      const prev = progressionRef.current;
      let next = prev;
      let spend = 0;
      let refund = 0;

      // 1. Settle any lots whose window has closed.
      const settled = resolveAuctions(next, undefined, moneyRef.current);
      next = settled.progression;
      spend += settled.spent;
      refund += settled.refund || 0;
      for (const w of settled.won) {
        notify(tf('alert_lot_won'), tf('msg_50641', { v0: w.name, v1: formatMoney(w.price) }), 'win');
      }
      for (const l of settled.lost) {
        notify(tf('alert_outbid_hammer'), tf('msg_98148', { v0: l.name }), 'loss');
      }

      // 2. Rivals counter any lot the player is currently leading.
      const ticked = tickAuctions(next);
      next = ticked.progression;
      for (const e of ticked.events) {
        notify(tf('alert_you_been_outbid'), tf('msg_64443', { v0: e.by, v1: formatMoney(e.bid), v2: e.name }), 'outbid');
      }

      // 3. Retail deliveries.
      const delivered = processAcquisitions(next);
      next = delivered.progression;
      for (const d of delivered.completed) {
        notify(tf('alert_delivery_arrived'), tf('msg_57214', { v0: d.name }), 'delivery');
      }

      // 4. Estate improvements and security onboarding.
      const works = processEstateWorks(next);
      next = works.progression;
      for (const w of works.completed) {
        notify(
          w.kind === 'guard' ? 'Security detail ready' : 'Improvement complete',
          w.kind === 'guard' ? 'A new guard has joined your staff' : `${w.label} finished`,
          'estate'
        );
      }

      const delta = refund - spend;
      if (delta !== 0) setMoney((m) => Math.max(0, m + delta));
      if (next !== prev) setProgression(next);
    }, 3000);
    return () => clearInterval(interval);
  }, [loaded, notify]);

  const totalHourlyIncome = useMemo(() => {
    let total = 0;
    for (const h of holdings) {
      const asset = ALL_ASSETS.find((a) => a.id === h.assetId);
      if (asset) total += getInvestmentHourlyIncome(asset, marketState[h.assetId]) * h.quantity;
    }
    const setBonus = getSetBonusMultiplier(progression);
    for (const b of ownedBusinesses) {
      total += getBusinessHourlyIncome(b, businessBoostExpiresAt) * setBonus;
    }
    total += getEstateHourlyIncome(progression);
    return Number.isFinite(total) ? total : 0;
  }, [holdings, marketState, ownedBusinesses, businessBoostExpiresAt, progression]);

  const totalPending = useMemo(() => {
    let total = 0;
    for (const b of ownedBusinesses) {
      if (b.type === 'construction') total += getConstructionPendingPayout(b);
      if (b.type === 'dealership') total += getDealershipPendingSales(b);
    }
    return Number.isFinite(total) ? total : 0;
  }, [ownedBusinesses]);

  const startEstatePurchase = (asset, price) => {
    if (!Number.isFinite(price) || price <= 0) return false;
    if (price > moneyRef.current) return false;
    if (pendingRef.current.some((p) => p.assetId === asset.id)) return false;
    // Atomic check + deduct so a double-tap can't pass the balance check twice.
    moneyRef.current -= price;
    setMoney((m) => Math.max(0, m - price));
    setPendingPurchases((prev) => [
      ...prev,
      {
        id: `${asset.id}_${Date.now()}`,
        assetId: asset.id,
        price,
        startedAt: Date.now(),
        completesAt: Date.now() + scaleDuration(Math.random() < 0.3 ? 0 : getPurchaseDurationMs()),
      },
    ]);
    return true;
  };

  const rushEstatePurchase = (pendingId) => {
    setPendingPurchases((prev) =>
      prev.map((p) => (p.id === pendingId ? { ...p, completesAt: Date.now() } : p))
    );
  };

  const tc = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      <StatusBar style={tc.isLight ? 'dark' : 'light'} />
      <LinearGradient
        colors={tc.bgGradient}
        style={styles.background}
      />

      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showProgression={legacyTabVisible}
        money={money}
        hourlyIncome={totalHourlyIncome}
      >
      <ErrorBoundary>
      {activeTab === 'home' && (
        <HomeScreen
          money={money}
          setMoney={setMoney}
          boostActive={boostActive}
          setBoostActive={setBoostActive}
          boostTimeLeft={boostTimeLeft}
          setBoostTimeLeft={setBoostTimeLeft}
          marketState={marketState}
          setMarketState={setMarketState}
          totalHourlyIncome={totalHourlyIncome}
          totalPending={totalPending}
          currentJob={currentJob}
          setCurrentJob={setCurrentJob}
          jobTapsLeft={jobTapsLeft}
          setJobTapsLeft={setJobTapsLeft}
          appliedJobs={appliedJobs}
          setAppliedJobs={setAppliedJobs}
          isVip={isVip()}
        />
      )}

      {activeTab === 'invest' && (
        <InvestmentsScreen
          money={money}
          setMoney={setMoney}
          marketState={marketState}
          holdings={holdings}
          setHoldings={setHoldings}
          pendingPurchases={pendingPurchases}
          onStartEstatePurchase={startEstatePurchase}
          onRushEstatePurchase={rushEstatePurchase}
        />
      )}

      {activeTab === 'business' && (
        <BusinessScreen
          money={money}
          ownedBusinesses={ownedBusinesses}
          businessBoostExpiresAt={businessBoostExpiresAt}
          onChange={({ money: newMoney, ownedBusinesses: newOwned }) => {
            if (newMoney !== undefined) setMoney(newMoney);
            if (newOwned !== undefined) setOwnedBusinesses(newOwned);
          }}
          onActivateBoost={() => {
            showRewardedAd(() => {
              // Extend rather than reset so re-watching never wastes time left.
              setBusinessBoostExpiresAt((cur) => Math.max(cur || 0, Date.now()) + 60 * 60 * 1000);
              showAlert(t('alert_boost_active'), t('alert_boost_msg'));
            });
          }}
        />
      )}

      {activeTab === 'progression' && (
        <ProgressionScreen
          money={money}
          setMoney={setMoney}
          progression={progression}
          onProgressionChange={setProgression}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsScreen
          money={money}
          onReset={() => {
            setMoney(0);
            setHoldings([]);
            setOwnedBusinesses([]);
            setMarketState(createInitialMarketState());
            setProgression(createInitialProgression());
            setCurrentJob(null);
            setJobTapsLeft(0);
            setAppliedJobs({});
            setBusinessBoostExpiresAt(0);
            setPendingPurchases([]);
            setActiveTab('home');
            resetStats();
            lastTickRef.current = Date.now();
            // Wipe progress but keep purchase entitlements - StoreKit owns
            // those and restore would re-issue them anyway. The Founders
            // dealership is part of that purchase, so let it re-grant.
            resetFoundersDealershipGrant();
            AsyncStorage.multiRemove(GAME_KEYS.filter((k) => k !== 'tapGameStore')).catch(() => {});
          }}
        />
      )}
      {activeTab === 'shop' && <ShopScreen />}
      </ErrorBoundary>

      <FloatingNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showProgression={legacyTabVisible}
      />
      </AppShell>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
