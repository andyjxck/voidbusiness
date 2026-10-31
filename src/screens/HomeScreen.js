import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, View, Pressable, Animated, ScrollView, Modal, Easing, Platform } from 'react-native';
import { useContentWidth } from '../data/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text, { useLanguage, useAppSettings, useThemeColors } from '../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../data/hapticsProxy';
import { formatMoney, formatPercent, getChangePercent, STOCKS, CRYPTO, REAL_ESTATE } from '../data/market';
import { showRewardedAd } from '../data/ads';
import { getPurchaseIncomeMultiplier, getEquippedSkin, getOwnedSkinIds, equipSkin, CARD_SKINS, scaleDuration } from '../data/store';
import { JOBS, applyForJob } from '../data/jobs';
import { isReducedMotion, isNewsTickerEnabled, getTickerSpeed } from '../data/settings';
import { recordTaps, recordJobTapsCompleted, recordJobAccepted, recordBoostUsed, recordEventTriggered } from '../data/stats';
import { t, tf, tJobTitle, tJobDesc, tRealEstate, getCurrentLanguage } from '../data/i18n';
import { webModalOverlay, webModalSheet } from '../components/webModal';
import { realWindowWidth, WEB_SIDEBAR_MIN_WIDTH } from '../data/webDims';


const BOOST_MULTIPLIER = 7;
const BOOST_DURATION = 60;

// Invented outlets only - never attribute game headlines to real media.
const NEWS_SOURCES = ['Void Wire', 'The Ledger', 'Ticker Tribune', 'Bullhorn Daily', 'Tycoon Times', 'Coinside Report'];

const GAME_EVENTS_POOL = [
  { ticker: 'TAP', headlineKey: 'event_tap_boost', source: 'GameFeed', change: 100, category: 'event', type: 'boost' },
  { ticker: 'ALERT', headlineKey: 'event_market_crash', source: 'GameFeed', change: -50, category: 'warning', type: 'nerf' },
  { ticker: 'BONUS', headlineKey: 'event_mystery_investor', source: 'GameFeed', change: 25, category: 'event', type: 'boost' },
  { ticker: 'ALERT', headlineKey: 'event_whale_selloff', source: 'GameFeed', change: -30, category: 'warning', type: 'nerf' },
  { ticker: 'TAP', headlineKey: 'event_golden_tap', source: 'GameFeed', change: 200, category: 'event', type: 'boost' },
  { ticker: 'RUMOR', headlineKey: 'event_merger_talks', source: 'GameFeed', change: 15, category: 'rumor', type: 'boost' },
  { ticker: 'ALERT', headlineKey: 'event_regulatory_crackdown', source: 'GameFeed', change: -20, category: 'warning', type: 'nerf' },
  { ticker: 'BONUS', headlineKey: 'event_dividend_surge', source: 'GameFeed', change: 10, category: 'event', type: 'boost' },
  { ticker: 'TAP', headlineKey: 'event_tap_fatigue', source: 'GameFeed', change: -75, category: 'warning', type: 'nerf' },
  { ticker: 'RUMOR', headlineKey: 'event_insider_buying', source: 'GameFeed', change: 8, category: 'rumor', type: 'boost' },
  { ticker: 'BONUS', headlineKey: 'event_lottery_invest', source: 'GameFeed', change: 12, category: 'event', type: 'boost' },
  { ticker: 'ALERT', headlineKey: 'event_inflation_fears', source: 'GameFeed', change: -15, category: 'warning', type: 'nerf' },
];

// Generates a single random news item using live market data - used to
// continuously top up the news queue as items scroll off-screen.
function generateOneNewsItem(marketState) {
  const getChange = (id) => {
    const s = marketState[id];
    if (!s) return 0;
    return getChangePercent(s.price, s.prevPrice);
  };
  const getSource = () => NEWS_SOURCES[Math.floor(Math.random() * NEWS_SOURCES.length)];

  const roll = Math.random();

  if (roll < 0.35) {
    const asset = STOCKS[Math.floor(Math.random() * STOCKS.length)];
    const change = getChange(asset.id);
    const isUp = change >= 0;
    const verbs = isUp ? ['surges', 'rallies', 'gains', 'climbs'] : ['plummets', 'slips', 'drops', 'falls'];
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    return {
      ticker: asset.ticker,
      headline: `${asset.name} ${t('verb_' + verb)} ${formatPercent(Math.abs(change))}`,
      source: getSource(),
      change,
      category: asset.sector,
    };
  }

  if (roll < 0.55) {
    const asset = CRYPTO[Math.floor(Math.random() * CRYPTO.length)];
    const change = getChange(asset.id);
    const isUp = change >= 0;
    const verbs = isUp ? ['pumps', 'moons', 'rallies'] : ['dumps', 'crashes', 'slides'];
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    return {
      ticker: asset.ticker,
      headline: `${asset.name} ${t('verb_' + verb)} ${formatPercent(Math.abs(change))}`,
      source: getSource(),
      change,
      category: t('cat_crypto'),
    };
  }

  if (roll < 0.7) {
    const asset = REAL_ESTATE[Math.floor(Math.random() * REAL_ESTATE.length)];
    const change = getChange(asset.id);
    const isUp = change >= 0;
    return {
      ticker: 'RE',
      headline: tf(isUp ? 'news_real_estate_rising' : 'news_real_estate_cooling', { name: tRealEstate(asset.id), change: formatPercent(Math.abs(change)) }),
      source: getSource(),
      change,
      category: t('cat_real_estate'),
    };
  }

  if (roll < 0.85) {
    const allChanges = [...STOCKS, ...CRYPTO, ...REAL_ESTATE].map((a) => getChange(a.id));
    const avgChange = allChanges.reduce((a, b) => a + b, 0) / allChanges.length;
    let headline = t('news_markets_mixed');
    if (avgChange > 5) headline = t('news_markets_rally');
    else if (avgChange < -5) headline = t('news_markets_selloff');
    return { ticker: 'MKT', headline, source: getSource(), change: avgChange, category: t('cat_markets') };
  }

  const ev = { ...GAME_EVENTS_POOL[Math.floor(Math.random() * GAME_EVENTS_POOL.length)] };
  return {
    ...ev,
    headline: ev.headlineKey === 'event_lottery_invest' ? tf(ev.headlineKey, { amount: formatMoney(50000000) }) : t(ev.headlineKey),
    category: t('cat_' + ev.category),
  };
}

export default function HomeScreen({
  money,
  setMoney,
  boostActive,
  setBoostActive,
  boostTimeLeft,
  setBoostTimeLeft,
  marketState,
  setMarketState,
  accountNumber = '',
  totalHourlyIncome,
  totalPending,
  currentJob,
  setCurrentJob,
  jobTapsLeft,
  setJobTapsLeft,
  appliedJobs,
  setAppliedJobs,
  isVip,
}) {
  useLanguage(); // re-render on language change
  const insets = useSafeAreaInsets();
  // FloatingNavBar's top edge sits at ~insets.bottom + 60px (6px offset + ~54px
  // bar). Content must clear that plus breathing room, not a fixed 90.
  // On wide web the sidebar replaces the pill, so only a small gap is needed.
  const contentW = useContentWidth(); // also re-renders on resize/rotation (web gate below)
  const navClearance = Platform.OS === 'web' && realWindowWidth() >= WEB_SIDEBAR_MIN_WIDTH
    ? 24
    : Math.max(insets.bottom, 12) + 74;
  useAppSettings(); // re-render on settings change (news ticker, speed, etc.)
  const tc = useThemeColors();
  const [floats, setFloats] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [eventFlash, setEventFlash] = useState(null);
  const [showJobs, setShowJobs] = useState(false);
  const [jobResult, setJobResult] = useState(null);
  const [jobBoardSeed, setJobBoardSeed] = useState(Date.now());
  const [jobTick, setJobTick] = useState(0);
  const [showSkins, setShowSkins] = useState(false);
  const floatId = useRef(0);
  const busyRef = useRef(false);
  const jobTapsLeftRef = useRef(jobTapsLeft);
  jobTapsLeftRef.current = jobTapsLeft;
  const scaleAnim = useState(() => new Animated.Value(1))[0];
  const scrollAnim = useState(() => new Animated.Value(0))[0];

  // Tracked timeouts - cleared on unmount so they never set state on an
  // unmounted component.
  const timersRef = useRef(new Set());
  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of timers) clearTimeout(id);
      timers.clear();
    };
  }, []);

  const basePerTap = 1 + (currentJob ? currentJob.perTapBonus : 0);
  const earnPerTap = (boostActive ? BOOST_MULTIPLIER : 1) * basePerTap * getPurchaseIncomeMultiplier();

  const JOB_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const JOB_REJECT_COOLDOWN_MS = 5 * 60 * 1000;
  const JOB_REFRESH_MS = 15 * 60 * 1000;

  const isJobOnCooldown = (jobId) => {
    const entry = appliedJobs[jobId];
    if (!entry) return false;
    const ts = typeof entry === 'number' ? entry : entry.ts;
    const wasSuccess = typeof entry === 'object' ? entry.success : true;
    const cooldown = wasSuccess ? JOB_COOLDOWN_MS : JOB_REJECT_COOLDOWN_MS;
    return Date.now() - ts < scaleDuration(cooldown);
  };

  const getJobCooldownMins = (jobId) => {
    const entry = appliedJobs[jobId];
    if (!entry) return 0;
    const ts = typeof entry === 'number' ? entry : entry.ts;
    const wasSuccess = typeof entry === 'object' ? entry.success : true;
    const cooldown = wasSuccess ? JOB_COOLDOWN_MS : JOB_REJECT_COOLDOWN_MS;
    const remaining = scaleDuration(cooldown) - (Date.now() - ts);
    return Math.max(0, Math.ceil(remaining / (60 * 1000)));
  };

  const getJobCooldownHrs = (jobId) => {
    const mins = getJobCooldownMins(jobId);
    return Math.floor(mins / 60);
  };

  // Available jobs: not on cooldown, not current job. Rotate subset every 15 min.
  const availableJobs = useMemo(() => {
    const eligible = JOBS.filter((j) => !isJobOnCooldown(j.id) && (!currentJob || currentJob.id !== j.id));
    if (eligible.length <= 8) return eligible;
    // Seeded Fisher-Yates shuffle
    let rng = jobBoardSeed % 2147483647;
    if (rng <= 0) rng += 2147483646;
    const nextRand = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; };
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 8);
  }, [appliedJobs, currentJob, jobBoardSeed]);

  const minsUntilRefresh = useMemo(() => {
    void jobTick;
    const elapsed = Date.now() - jobBoardSeed;
    return Math.max(0, Math.ceil((scaleDuration(JOB_REFRESH_MS) - elapsed) / (60 * 1000)));
  }, [jobBoardSeed, jobTick]);

  // Auto-refresh board seed every 15 min
  useEffect(() => {
    const interval = setInterval(() => {
      setJobBoardSeed(Date.now());
    }, scaleDuration(JOB_REFRESH_MS));
    return () => clearInterval(interval);
  }, []);

  // Tick every 30s to update minsUntilRefresh display
  useEffect(() => {
    const interval = setInterval(() => setJobTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const startJobRefreshAd = () => {
    showRewardedAd(() => finishJobRefreshAd());
  };
  const finishJobRefreshAd = () => {
    setJobBoardSeed(Date.now());
    setAppliedJobs((prev) => {
      const cleared = {};
      for (const [key, val] of Object.entries(prev)) {
        const wasSuccess = typeof val === 'object' ? val.success : true;
        if (wasSuccess) cleared[key] = val;
      }
      return cleared;
    });
    setShowJobs(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // News ticker - seamless infinite scroll. A fixed set of items is
  // rendered twice back-to-back. The track animates from 0 to
  // -singleSetWidth with a linear easing in an infinite loop. When it
  // resets to 0, the second copy is exactly where the first was, so
  // there is no visible jump.
  const TICKER_SIZE = 8;
  const ITEM_WIDTH = 230; // 220px card + 10px gap

  const [newsQueue, setNewsQueue] = useState([]);
  const newsIdRef = useRef(0);
  const marketStateRef = useRef(marketState);
  marketStateRef.current = marketState;

  useEffect(() => {
    if (newsQueue.length > 0) return;
    const seeded = [];
    for (let i = 0; i < TICKER_SIZE; i++) {
      seeded.push({ id: newsIdRef.current++, ...generateOneNewsItem(marketStateRef.current) });
    }
    setNewsQueue(seeded);
  }, [marketState]);

  // Regenerate news queue when language changes so headlines retranslate.
  const langForNews = getCurrentLanguage();
  useEffect(() => {
    const seeded = [];
    for (let i = 0; i < TICKER_SIZE; i++) {
      seeded.push({ id: newsIdRef.current++, ...generateOneNewsItem(marketStateRef.current) });
    }
    setNewsQueue(seeded);
  }, [langForNews]);

  // Step-based scroll: animate one card-width to the left, then dequeue
  // the front item and enqueue a fresh one. Removing the front card
  // shifts every card left by exactly ITEM_WIDTH, which is the same
  // distance the track just travelled - so resetting translateX to 0 at
  // that moment leaves the visuals pixel-identical. The reset must land
  // in the same paint as the queue update, so it happens in a layout
  // effect (which runs after commit but before the browser paints)
  // rather than in the animation callback.
  const tickerCancelledRef = useRef(false);
  const stepRef = useRef(null);

  useEffect(() => {
    tickerCancelledRef.current = false;

    // If news ticker is disabled, don't animate at all
    if (!isNewsTickerEnabled()) {
      return () => { tickerCancelledRef.current = true; };
    }

    if (isReducedMotion()) {
      // Reduced motion: use a simple interval to rotate the queue.
      // Don't touch scrollAnim or the layout effect at all.
      const speed = getTickerSpeed();
      const intervalMs = speed === 'fast' ? 2000 : speed === 'slow' ? 6000 : 4000;
      const interval = setInterval(() => {
        if (tickerCancelledRef.current) return;
        setNewsQueue((prev) => {
          if (prev.length === 0) return prev;
          const next = prev.slice(1);
          next.push({ id: newsIdRef.current++, ...generateOneNewsItem(marketStateRef.current) });
          return next;
        });
      }, intervalMs);
      return () => {
        tickerCancelledRef.current = true;
        clearInterval(interval);
      };
    }

    const speed = getTickerSpeed();
    const speedMultiplier = speed === 'fast' ? 0.6 : speed === 'slow' ? 1.8 : 1;

    stepRef.current = () => {
      if (tickerCancelledRef.current) return;
      Animated.timing(scrollAnim, {
        toValue: -ITEM_WIDTH,
        duration: ITEM_WIDTH * 15 * speedMultiplier,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || tickerCancelledRef.current) return;
        setNewsQueue((prev) => {
          if (prev.length === 0) return prev;
          const next = prev.slice(1);
          next.push({ id: newsIdRef.current++, ...generateOneNewsItem(marketStateRef.current) });
          return next;
        });
      });
    };

    return () => {
      tickerCancelledRef.current = true;
      scrollAnim.stopAnimation();
    };
  }, [scrollAnim]);

  // Runs after the shifted queue is committed but before paint, so the
  // reset and the content shift are never visible as separate frames.
  // Skipped entirely in reduced motion mode (the interval handles updates).
  useLayoutEffect(() => {
    if (newsQueue.length !== TICKER_SIZE) return;
    if (isReducedMotion() || !isNewsTickerEnabled()) return;
    scrollAnim.setValue(0);
    if (!tickerCancelledRef.current && stepRef.current) stepRef.current();
  }, [newsQueue, scrollAnim]);

  // --- GAME EVENT ENGINE ---
  // Fires a random event every 30-90 seconds
  const moneyRef = useRef(money);
  moneyRef.current = money;

  useEffect(() => {
    let timeoutId;

    const fireEvent = () => {
      const events = [
        {
          id: 'tap_boost',
          ticker: 'TAP',
          headlineKey: 'event_tap_frenzy',
          source: 'GameFeed',
          category: 'event',
          type: 'boost',
          color: '#fbbf24',
          duration: 20000,
          apply: () => {},
          multiplier: 3,
        },
        {
          id: 'tap_nerf',
          ticker: 'ALERT',
          headlineKey: 'event_tap_fatigue_nerf',
          source: 'GameFeed',
          category: 'warning',
          type: 'nerf',
          color: '#f87171',
          duration: 15000,
          apply: () => {},
          multiplier: 0.5,
        },
        {
          id: 'cash_bonus',
          ticker: 'BONUS',
          headlineKey: 'event_mystery_cash',
          source: 'GameFeed',
          category: 'event',
          type: 'boost',
          color: '#34d399',
          duration: 0,
          apply: () => {
            const bonus = Math.max(100, Math.floor(moneyRef.current * 0.05));
            setMoney((m) => m + bonus);
            setEventFlash({ text: `+${formatMoney(bonus)}`, color: '#34d399' });
            later(() => setEventFlash(null), 2000);
          },
        },
        {
          id: 'market_crash',
          ticker: 'ALERT',
          headlineKey: 'event_market_crash_active',
          source: 'GameFeed',
          category: 'warning',
          type: 'nerf',
          color: '#f87171',
          duration: 0,
          apply: () => {
            setMarketState((prev) => {
              const next = { ...prev };
              for (const key of Object.keys(next)) {
                next[key] = {
                  ...next[key],
                  prevPrice: next[key].price,
                  price: next[key].price * (0.7 + Math.random() * 0.15),
                  history: [...next[key].history, next[key].price * (0.7 + Math.random() * 0.15)].slice(-30),
                };
              }
              return next;
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          },
        },
        {
          id: 'market_pump',
          ticker: 'BONUS',
          headlineKey: 'event_market_pump',
          source: 'GameFeed',
          category: 'event',
          type: 'boost',
          color: '#34d399',
          duration: 0,
          apply: () => {
            setMarketState((prev) => {
              const next = { ...prev };
              for (const key of Object.keys(next)) {
                next[key] = {
                  ...next[key],
                  prevPrice: next[key].price,
                  price: next[key].price * (1.15 + Math.random() * 0.2),
                  history: [...next[key].history, next[key].price * (1.15 + Math.random() * 0.2)].slice(-30),
                };
              }
              return next;
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
        {
          id: 'golden_tap',
          ticker: 'TAP',
          headlineKey: 'event_golden_tap_active',
          source: 'GameFeed',
          category: 'event',
          type: 'boost',
          color: '#fbbf24',
          duration: 15000,
          apply: () => {},
          multiplier: 5,
        },
        {
          id: 'crypto_pump',
          ticker: 'RUMOR',
          headlineKey: 'event_crypto_pump',
          source: 'GameFeed',
          category: 'rumor',
          type: 'boost',
          color: '#6366f1',
          duration: 0,
          apply: () => {
            setMarketState((prev) => {
              const next = { ...prev };
              for (const key of Object.keys(next)) {
                if (key.startsWith('cr_')) {
                  next[key] = {
                    ...next[key],
                    prevPrice: next[key].price,
                    price: next[key].price * (1.2 + Math.random() * 0.3),
                    history: [...next[key].history, next[key].price * (1.2 + Math.random() * 0.3)].slice(-30),
                  };
                }
              }
              return next;
            });
          },
        },
        {
          id: 'tech_crash',
          ticker: 'ALERT',
          headlineKey: 'event_tech_crash',
          source: 'GameFeed',
          category: 'warning',
          type: 'nerf',
          color: '#f87171',
          duration: 0,
          apply: () => {
            setMarketState((prev) => {
              const next = { ...prev };
              for (const key of Object.keys(next)) {
                if (key.startsWith('st_')) {
                  next[key] = {
                    ...next[key],
                    prevPrice: next[key].price,
                    price: next[key].price * (0.75 + Math.random() * 0.1),
                    history: [...next[key].history, next[key].price * (0.75 + Math.random() * 0.1)].slice(-30),
                  };
                }
              }
              return next;
            });
          },
        },
      ];

      const event = events[Math.floor(Math.random() * events.length)];
      event.apply();

      if (event.duration > 0) {
        const eventInstance = {
          ...event,
          startTime: Date.now(),
          expiresAt: Date.now() + event.duration,
        };
        setActiveEvents((prev) => [...prev.filter((e) => e.id !== event.id), eventInstance]);
        recordEventTriggered();
        later(() => {
          setActiveEvents((prev) => prev.filter((e) => e.id !== event.id));
        }, event.duration);
      }

      // Schedule next event
      const nextDelay = 30000 + Math.random() * 60000;
      timeoutId = setTimeout(fireEvent, nextDelay);
    };

    timeoutId = setTimeout(fireEvent, 15000 + Math.random() * 15000);
    return () => clearTimeout(timeoutId);
  }, [setMoney, setMarketState, later]);

  // Calculate effective tap multiplier from active events
  const eventMultiplier = activeEvents.reduce((acc, e) => acc * (e.multiplier || 1), 1);
  const effectiveEarnPerTap = Math.max(0, earnPerTap * eventMultiplier);

  const handleTap = useCallback(
    (evt) => {
      const amount = effectiveEarnPerTap;
      setMoney((m) => m + amount);
      recordTaps(1, amount);

      // Decrement job taps
      if (currentJob) {
        const next = jobTapsLeftRef.current - 1;
        jobTapsLeftRef.current = next;
        setJobTapsLeft(next);
        recordJobTapsCompleted(1);
        if (next <= 0) {
          setCurrentJob(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!isReducedMotion()) {
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
      }

      const id = floatId.current++;
      const x = evt.nativeEvent.locationX;
      const y = evt.nativeEvent.locationY;
      const isBoosted = boostActive || eventMultiplier > 1;
      setFloats((f) => [...f, { id, x, y, amount, boost: isBoosted }]);
      later(() => {
        setFloats((f) => f.filter((fl) => fl.id !== id));
      }, isReducedMotion() ? 600 : 800);
    },
    [boostActive, scaleAnim, setMoney, effectiveEarnPerTap, eventMultiplier, currentJob, later, setCurrentJob, setJobTapsLeft]
  );

  const handleApplyJob = (job) => {
    if (busyRef.current) return;
    if (isJobOnCooldown(job.id)) return;
    busyRef.current = true;
    const { success } = applyForJob(job.id);
    setAppliedJobs((prev) => ({ ...prev, [job.id]: { ts: Date.now(), success } }));
    if (success) {
      setCurrentJob(job);
      setJobTapsLeft(job.totalTaps);
      setJobResult({ success: true, job });
      setShowJobs(false);
      recordJobAccepted();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setJobResult({ success: false, job });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    later(() => { setJobResult(null); busyRef.current = false; }, 2500);
  };

  const handleQuitJob = () => {
    setCurrentJob(null);
    setJobTapsLeft(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const startAd = () => {
    showRewardedAd(
      () => {
        setBoostActive(true);
        setBoostTimeLeft(BOOST_DURATION);
        recordBoostUsed();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      {/* Credit card balance */}
      {(() => { const cardSkin = getEquippedSkin(); return (
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={cardSkin.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { width: contentW - 48 }]}
        >
          {/* Shine overlay */}
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
            style={styles.cardShine}
          />

          <View style={styles.cardTop}>
            <View style={styles.cardChipRow}>
              <View style={styles.cardChip} />
              <Ionicons name="wifi" size={16} color="rgba(255,255,255,0.25)" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>
            <View style={styles.cardBrandRow}>
              <Text style={styles.cardBrand}>{isVip ? 'VOIDPAY VIP' : t('brand_tappay')}</Text>
              <Pressable
                onPress={(e) => { e.stopPropagation && e.stopPropagation(); Haptics.selectionAsync(); setShowSkins((s) => !s); }}
                hitSlop={10}
              >
                <Ionicons name="color-palette" size={14} color={isVip ? '#fde68a' : 'rgba(255,255,255,0.35)'} />
              </Pressable>
            </View>
          </View>

          {/* Card number - dots with account number at the end (guests get all dots) */}
          {(() => {
            const totalDigits = 16;
            const acctLen = accountNumber ? accountNumber.length : 0;
            const numDots = totalDigits - acctLen;
            const fullStr = '•'.repeat(numDots) + (accountNumber || '');
            const groups = [
              fullStr.slice(0, 4),
              fullStr.slice(4, 8),
              fullStr.slice(8, 12),
              fullStr.slice(12, 16),
            ];
            return (
              <View style={styles.cardNumberRow}>
                {groups.map((g, i) => (
                  <Text key={i} style={styles.cardDot}>{g}</Text>
                ))}
              </View>
            );
          })()}

          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardLabel}>{t('balance')}</Text>
              <Text style={styles.cardBalance}>{formatMoney(money)}</Text>
            </View>
            <View style={styles.cardBottomRight}>
              <Text style={styles.cardLabel}>{t('per_tap')}</Text>
              <Text style={styles.cardValue}>+{formatMoney(effectiveEarnPerTap)}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            {boostActive ? (
              <View style={styles.boostPill}>
                <Ionicons name="flash" size={10} color="#fbbf24" />
                <Text style={styles.boostPillText}>{boostTimeLeft}s boost</Text>
              </View>
            ) : activeEvents.length > 0 ? (
              <View style={[styles.boostPill, { backgroundColor: `${activeEvents[0].color}22` }]}>
                <Text style={[styles.boostPillText, { color: activeEvents[0].color }]}>
                  {t(activeEvents[0].headlineKey).split('!')[0]}
                </Text>
              </View>
            ) : currentJob ? (
              <View style={[styles.boostPill, { backgroundColor: `${currentJob.color}22` }]}>
                <Text style={styles.jobPillEmoji}>{currentJob.emoji}</Text>
                <Text style={[styles.boostPillText, { color: currentJob.color }]}>
                  {tJobTitle(currentJob.id)} · {jobTapsLeft} {t('taps_left')}
                </Text>
              </View>
            ) : (
              <Text style={styles.cardHolder}>{t('guest')}</Text>
            )}
            <View style={styles.cardRightFooter}>
              <View style={styles.cardLogo}>
                <View style={styles.cardLogoRing} />
              </View>
              {totalPending > 0 ? (
                <>
                  <Text style={styles.cardIncomeLabel}>{t('pending')}</Text>
                  <Text style={styles.cardIncomeValue}>{formatMoney(totalPending)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.cardIncomeLabel}>{t('income_hr')}</Text>
                  <Text style={styles.cardIncomeValue}>{formatMoney(totalHourlyIncome)}</Text>
                </>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
      ); })()}

      {/* Card skin picker - unlocked by purchases */}
      {showSkins ? (
        <View style={styles.skinStrip}>
          {getOwnedSkinIds().map((skinId) => {
            const skin = CARD_SKINS[skinId];
            const equipped = getEquippedSkin().id === skinId;
            return (
              <Pressable
                key={skinId}
                style={[styles.skinSwatchWrap, equipped && styles.skinSwatchActive]}
                onPress={() => { Haptics.selectionAsync(); equipSkin(skinId); }}
              >
                <LinearGradient colors={skin.colors} style={styles.skinSwatch} />
                <Text style={styles.skinName} numberOfLines={1}>{skin.name}</Text>
                {equipped ? <Ionicons name="checkmark-circle" size={12} color="#4ade80" style={styles.skinCheck} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* News - continuous scrolling ticker (hidden when disabled in settings) */}
      {isNewsTickerEnabled() && (
      <View style={styles.newsSection}>
        <View style={styles.newsHeader}>
          <Ionicons name="newspaper-outline" size={14} color="#64748b" />
          <Text style={styles.newsHeaderText}>{t('market_news')}</Text>
        </View>
        <View style={styles.newsTickerContainer}>
          <Animated.View style={[styles.newsTickerTrack, { transform: [{ translateX: scrollAnim }] }]}>
            {newsQueue.map((item) => {
              const isUp = item.change >= 0;
              const isEvent = item.source === 'GameFeed';
              const eventColor = item.type === 'nerf' ? '#f87171' : item.type === 'boost' ? '#fbbf24' : '#6366f1';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.newsCard,
                    isEvent && { borderColor: `${eventColor}33`, backgroundColor: `${eventColor}0A` },
                  ]}
                >
                  <View style={styles.newsCardTop}>
                    <Text style={[styles.newsTicker, isEvent && { color: eventColor }]}>
                      {item.ticker}
                    </Text>
                    <Text
                      style={[
                        styles.newsChange,
                        { color: isUp ? '#34d399' : '#f87171' },
                      ]}
                    >
                      {isEvent ? item.category : formatPercent(item.change)}
                    </Text>
                  </View>
                  <Text style={styles.newsHeadline} numberOfLines={3}>
                    {item.headline}
                  </Text>
                  <View style={styles.newsCardBottom}>
                    <Text style={styles.newsSource}>{item.source}</Text>
                    <Text style={styles.newsCategory}>{item.category}</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        </View>
      </View>
      )}

      {/* Tap zone - flows inline */}
      <Pressable style={styles.tapZone} onPress={handleTap}>
        <Animated.View
          style={[
            styles.tapZoneInner,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={boostActive
              ? ['rgba(251,191,36,0.06)', 'rgba(245,158,11,0.02)', 'rgba(217,119,6,0.04)']
              : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.005)', 'rgba(255,255,255,0.02)']}
            style={styles.tapZoneGradient}
          />

          {/* Subtle rings */}
          <View style={styles.ring1} />
          <View style={[styles.ring2, boostActive && styles.ring2Boost]} />
          <View style={styles.ring3} />

          {/* Center */}
          <View style={styles.tapCenter}>
            <Text style={styles.tapTitle}>{t('tap_to_earn')}</Text>
            <Text style={styles.tapAmount}>+{formatMoney(effectiveEarnPerTap)}</Text>
            <View style={styles.tapDivider} />
            <Text style={styles.tapSub}>
              {boostActive
                ? `${BOOST_MULTIPLIER}x boost · ${boostTimeLeft}s`
                : activeEvents.length > 0
                ? `${t(activeEvents[0].headlineKey)}`
                : t('tap_anywhere')}
            </Text>
          </View>

          {/* Floating +$ amounts */}
          {floats.map((f) => (
            <FloatingText key={f.id} x={f.x} y={f.y} amount={f.amount} boost={f.boost} />
          ))}
        </Animated.View>
      </Pressable>

      {/* Ad link - minimal */}
      {!boostActive && (
        <Pressable style={styles.adLink} onPress={startAd}>
          <Ionicons name="play-circle-outline" size={14} color="#475569" />
          <Text style={styles.adLinkText}>{tf('watch_ad_boost', { x: BOOST_MULTIPLIER })}</Text>
        </Pressable>
      )}


      {/* Find Work / Job button */}
      {currentJob ? (
        <View style={[styles.jobActiveRow, { marginBottom: navClearance }]}>
          <View style={styles.jobActiveInfo}>
            <Text style={styles.jobActiveEmoji}>{currentJob.emoji}</Text>
            <Text style={styles.jobActiveTitle}>{tJobTitle(currentJob.id)}</Text>
            <Text style={styles.jobActiveTaps}>{jobTapsLeft} {t('taps_left')}</Text>
          </View>
          <Pressable style={styles.jobQuitBtn} onPress={handleQuitJob}>
            <Ionicons name="log-out-outline" size={14} color="#f87171" />
            <Text style={styles.jobQuitText}>{t('quit')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.findWorkBtn, { marginBottom: navClearance }]}
          onPress={() => setShowJobs(true)}
        >
          <Ionicons name="briefcase-outline" size={16} color="#e2e8f0" />
          <Text style={styles.findWorkText}>{t('find_work')}</Text>
        </Pressable>
      )}

      {/* Job application modal */}
      <Modal visible={showJobs} transparent animationType="slide">
        <View style={[styles.jobModalOverlay, webModalOverlay()]}>
          <Pressable style={styles.jobModalBackdrop} onPress={() => setShowJobs(false)} />
          <View style={[styles.jobModalSheet, webModalSheet()]}>
            <View style={styles.jobModalHeader}>
              <View>
                <Text style={styles.jobModalTitle}>{t('find_work')}</Text>
                <Text style={styles.jobModalSub}>{tf('refreshes_in', { m: minsUntilRefresh })}</Text>
              </View>
              <Pressable style={styles.jobRefreshAdBtn} onPress={startJobRefreshAd}>
                <Ionicons name="play-circle" size={14} color="#fbbf24" />
                <Text style={styles.jobRefreshAdText}>{t('watch_ad')}</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: '70%' }} showsVerticalScrollIndicator={false}>
              {availableJobs.length === 0 && (
                <View style={styles.jobEmptyState}>
                  <Ionicons name="time-outline" size={32} color="#475569" />
                  <Text style={styles.jobEmptyText}>{t('no_jobs')}</Text>
                  <Text style={styles.jobEmptySub}>{tf('check_back', { m: minsUntilRefresh })}</Text>
                </View>
              )}
              {availableJobs.map((job) => {
                const onCooldown = isJobOnCooldown(job.id);
                const cdMins = getJobCooldownMins(job.id);
                const cdHrs = getJobCooldownHrs(job.id);
                return (
                  <Pressable
                    key={job.id}
                    style={[styles.jobOptionRow, onCooldown && styles.jobOptionDisabled]}
                    onPress={() => !onCooldown && handleApplyJob(job)}
                    disabled={onCooldown}
                  >
                    <View style={styles.jobOptionLeft}>
                      <Text style={styles.jobOptionEmoji}>{job.emoji}</Text>
                    </View>
                    <View style={styles.jobOptionInfo}>
                      <Text style={styles.jobOptionName}>{tJobTitle(job.id)}</Text>
                      <Text style={styles.jobOptionMeta}>{tJobDesc(job.id)}</Text>
                      <View style={styles.jobOptionStats}>
                        <Text style={styles.jobOptionPay}>+{formatMoney(job.perTapBonus)}/tap</Text>
                        <Text style={styles.jobOptionTaps}>{job.totalTaps} taps</Text>
                        <Text style={[styles.jobOptionChance, { color: job.successRate >= 0.5 ? '#34d399' : '#f87171' }]}>
                          {Math.round(job.successRate * 100)}%
                        </Text>
                      </View>
                    </View>
                    {onCooldown && (
                      <View style={styles.jobCooldownBadge}>
                        <Text style={styles.jobCooldownText}>{cdHrs > 0 ? `${cdHrs}h ${cdMins % 60}m` : `${cdMins}m`}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Job result flash */}
      {jobResult && (
        <View style={styles.jobResultOverlay} pointerEvents="none">
          <View style={[styles.jobResultCard, { borderColor: jobResult.success ? '#34d399' : '#f87171' }]}>
            <Text style={styles.jobResultEmoji}>{jobResult.success ? '🎉' : '😞'}</Text>
            <Text style={[styles.jobResultText, { color: jobResult.success ? '#34d399' : '#f87171' }]}>
              {jobResult.success ? tf('hired_as', { title: tJobTitle(jobResult.job.id) }) : tf('rejected_for', { title: tJobTitle(jobResult.job.id) })}
            </Text>
          </View>
        </View>
      )}

      {/* Event flash overlay */}
      {eventFlash && (
        <View style={styles.eventFlashOverlay} pointerEvents="none">
          <Text style={[styles.eventFlashText, { color: eventFlash.color }]}>
            {eventFlash.text}
          </Text>
        </View>
      )}
    </View>
  );
}

function FloatingText({ x, y, amount, boost }) {
  const translateY = useState(() => new Animated.Value(0))[0];
  const opacity = useState(() => new Animated.Value(1))[0];
  const reduced = isReducedMotion();

  useEffect(() => {
    if (reduced) {
      // Static popup that fades quickly without travelling.
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [reduced]);

  return (
    <Animated.View
      style={[styles.floatText, { left: x - 20, top: y - 20, opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: '900',
          color: boost ? '#fbbf24' : '#ffffff',
          textShadowColor: 'rgba(0,0,0,0.5)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 8,
        }}
      >
        +{amount}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 24,
  },
  // Credit card
  cardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  card: {
    height: 220,
    borderRadius: 20,
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    shadowOpacity: 0.4,
    elevation: 12,
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skinStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  skinSwatchWrap: {
    alignItems: 'center',
    width: 58,
  },
  skinSwatchActive: {
    opacity: 1,
  },
  skinSwatch: {
    width: 58,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  skinName: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  skinCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  cardChip: {
    width: 38,
    height: 28,
    borderRadius: 5,
    backgroundColor: 'rgba(255,200,50,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,50,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBrand: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
    fontStyle: 'italic',
  },
  cardNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardBottomRight: {
    alignItems: 'flex-end',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cardBalance: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  cardValue: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHolder: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  cardLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLogoRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardRightFooter: {
    alignItems: 'flex-end',
  },
  cardIncomeLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 6,
    marginBottom: 2,
  },
  cardIncomeValue: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '800',
  },
  boostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.2)',
  },
  boostPillText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  jobPillEmoji: {
    fontSize: 12,
  },
  // Find Work button
  findWorkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 16,
    alignSelf: 'center',
    cursor: 'pointer',
  },
  findWorkText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 14,
  },
  // Active job row
  jobActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignSelf: 'center',
    gap: 12,
  },
  jobActiveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobActiveEmoji: {
    fontSize: 16,
  },
  jobActiveTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  jobActiveTaps: {
    color: '#64748b',
    fontSize: 12,
  },
  jobQuitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  jobQuitText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  // Job modal
  jobModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  jobModalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  jobModalSheet: {
    backgroundColor: '#0f0f0f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  jobModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  jobModalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  jobRefreshAdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  jobRefreshAdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  jobEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  jobEmptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  jobEmptySub: {
    color: '#475569',
    fontSize: 12,
  },
  jobOptionDisabled: {
    opacity: 0.4,
  },
  jobCooldownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  jobCooldownText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  jobOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  jobOptionLeft: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobOptionEmoji: {
    fontSize: 22,
  },
  jobOptionInfo: {
    flex: 1,
  },
  jobOptionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  jobOptionMeta: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  jobOptionStats: {
    flexDirection: 'row',
    gap: 12,
  },
  jobOptionPay: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  jobOptionTaps: {
    fontSize: 12,
    color: '#94a3b8',
  },
  jobOptionChance: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Job result flash
  jobResultOverlay: {
    position: 'absolute',
    top: '35%',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 170,
    pointerEvents: 'none',
  },
  jobResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(15,15,15,0.95)',
    borderWidth: 1,
  },
  jobResultEmoji: {
    fontSize: 24,
  },
  jobResultText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // News
  newsSection: {
    marginBottom: 12,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  newsHeaderText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  newsTickerContainer: {
    overflow: 'hidden',
    height: 130,
  },
  newsTickerTrack: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 10,
  },
  newsCard: {
    width: 220,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  newsCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  newsTicker: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  newsChange: {
    fontSize: 13,
    fontWeight: '700',
  },
  newsHeadline: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 10,
  },
  newsCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newsSource: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
  newsCategory: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '500',
  },
  // Tap zone - borderless, flows
  tapZone: {
    flex: 1,
    width: '100%',
    minHeight: 200,
    cursor: 'pointer',
  },
  tapZoneInner: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tapZoneGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ring1: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  ring2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ring2Boost: {
    borderColor: 'rgba(251,191,36,0.12)',
  },
  ring3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tapCenter: {
    alignItems: 'center',
  },
  tapTitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 4,
  },
  tapAmount: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
    marginTop: 8,
  },
  tapDivider: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(251,191,36,0.25)',
    marginVertical: 10,
  },
  tapSub: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    fontWeight: '500',
  },
  floatText: {
    position: 'absolute',
  },
  // Ad link
  adLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    alignSelf: 'center',
    cursor: 'pointer',
  },
  adLinkText: {
    color: '#475569',
    fontSize: 12,
  },
  // Event flash
  eventFlashOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 150,
    pointerEvents: 'none',
  },
  eventFlashText: {
    fontSize: 32,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
});
