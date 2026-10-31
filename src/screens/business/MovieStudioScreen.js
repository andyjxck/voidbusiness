import { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Dimensions, TextInput, Image, Animated } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import Svg, { G, Polygon, Text as SvgText, Circle, Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf } from '../../data/i18n';
import { showRewardedAd } from '../../data/ads';
import UpgradeProgress from '../../components/UpgradeProgress';
import TeamRosterModal from '../../components/TeamRosterModal';
import { CITY_MAP } from '../../data/bus';
import {
  formatMoney,
  MOVIE_GENRES,
  MOVIE_TOPICS,
  MOVIE_SIZES,
  AUDIENCES,
  MOVIE_SETS,
  getGenre,
  getTopic,
  getMovieSize,
  getAudience,
  getMovieSet,
  getMovieStudioHourlyIncome,
  getMovieHourlyIncome,
  getLevelMultiplier,
  getMaxMovieSlots,
  getMovieDevTimeRemaining,
  getHireTimeRemaining,
  formatTimeRemaining,
  startMovieDev,
  releaseMovie,
  getCompletedMovies,
  hireStaff,
  completeHiredStaff,
  instantHireStaff,
  isGenreUnlocked,
  isTopicUnlocked,
  isSizeUnlocked,
  isAudienceUnlocked,
  getReservedStaff,
  getAvailableStaff,
  getStaffAvgSkill,
  fireStaff, raiseStaff, trainStaff,
  migrateMovieStudio,
  calculateDevTimeMs,
  STAFF_HIRE_COST,
  STAFF_SALARY_HOURLY,
  getStaffSalaryHourly,
  STAFF_HIRE_MIN_MS,
  STAFF_HIRE_MAX_MS,
  MAX_HIRING_AT_ONCE,
  MAX_GENRES,
  MULTI_GENRE_TIME_PENALTY,
  MOVIE_LIFESPAN_HOURS,
  MARKETING_BASE_COST,
  MARKETING_BASE_HOURS,
  marketMovie,
  calculateFatigue,
  FATIGUE_WINDOW_HOURS,
  openSet,
  getOwnedSets,
} from '../../data/moviestudio';
import {
  getUpgradeCost,
  getUpgradeName,
  upgradeBusiness,
  completeUpgradeNow,
  getTaxOwed,
  getDailyTax,
  isSuspended,
  getHoursUntilSuspension,
  payTax,

  getBusinessTaxRate,
} from '../../data/businesses';

const screenW = Dimensions.get('window').width;
const ACCENT = '#f472b6';

// Compact cycle pill - tap arrows to cycle through items, tap pill to select
const CyclePill = ({ items, selectedId, onSelect, staff, label, getIsUnlocked }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (selectedId) {
      const i = items.findIndex((it) => it.id === selectedId);
      if (i >= 0) setIdx(i);
    }
  }, [selectedId, items]);

  const goTo = (newIdx) => {
    const clamped = ((newIdx % items.length) + items.length) % items.length;
    setIdx(clamped);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const item = items[idx];
  const unlocked = getIsUnlocked(item, staff);
  const isSelected = selectedId === item.id;

  return (
    <View style={styles.cyclePillWrap}>
      <Pressable style={styles.cycleArrow} onPress={() => goTo(idx - 1)}>
        <Ionicons name="chevron-back" size={14} color="#64748b" />
      </Pressable>
      <Pressable
        style={[styles.cyclePill, isSelected && styles.cyclePillActive, !unlocked && styles.cyclePillLocked]}
        onPress={() => {
          if (!unlocked) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect(item.id);
        }}
      >
        <Text style={[styles.cyclePillText, isSelected && styles.cyclePillTextActive]} numberOfLines={1}>
          {unlocked ? `${item.emoji} ${item.name}` : `${item.staffUnlock} staff`}
        </Text>
      </Pressable>
      <Pressable style={styles.cycleArrow} onPress={() => goTo(idx + 1)}>
        <Ionicons name="chevron-forward" size={14} color="#64748b" />
      </Pressable>
    </View>
  );
};

// Secondary cycle pill for multi-select (appears when first item is selected)
const SecondaryPill = ({ items, selectedId, onSelect, staff, label, getIsUnlocked, unlockLevel, businessLevel }) => {
  const [idx, setIdx] = useState(0);
  const levelLocked = businessLevel < unlockLevel;

  useEffect(() => {
    if (selectedId) {
      const i = items.findIndex((it) => it.id === selectedId);
      if (i >= 0) setIdx(i);
    } else {
      setIdx(0);
    }
  }, [selectedId, items]);

  const goTo = (newIdx) => {
    const clamped = ((newIdx % items.length) + items.length) % items.length;
    setIdx(clamped);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const item = items[idx];
  const unlocked = getIsUnlocked(item, staff);

  if (levelLocked) {
    return (
      <View style={styles.cyclePillWrap}>
        <View style={[styles.cyclePill, styles.cyclePillLocked]}>
          <Ionicons name="lock-closed" size={14} color="#475569" />
          <Text style={styles.cyclePillLockText}>+ {label} · unlocks at L{unlockLevel}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cyclePillWrap}>
      <Pressable style={styles.cycleArrow} onPress={() => goTo(idx - 1)}>
        <Ionicons name="chevron-back" size={14} color="#64748b" />
      </Pressable>
      <Pressable
        style={[styles.cyclePill, selectedId && styles.cyclePillSecondary, !unlocked && styles.cyclePillLocked]}
        onPress={() => {
          if (!unlocked) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect(selectedId === item.id ? null : item.id);
        }}
      >
        <Text style={[styles.cyclePillText, selectedId && styles.cyclePillTextActive]} numberOfLines={1}>
          {selectedId ? (unlocked ? `${item.emoji} ${item.name}` : tf('msg_n_staff', { v0: item.staffUnlock })) : `+ ${label}`}
        </Text>
        {selectedId && (
          <Pressable onPress={() => { onSelect(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.cyclePillRemove}>
            <Ionicons name="close" size={12} color="#f87171" />
          </Pressable>
        )}
      </Pressable>
      <Pressable style={styles.cycleArrow} onPress={() => goTo(idx + 1)}>
        <Ionicons name="chevron-forward" size={14} color="#64748b" />
      </Pressable>
    </View>
  );
};

export default function MovieStudioScreen({ business, money, boostExpiresAt, onBack, onOpenSettings, onMovieStudioUpdate }) {
  useLanguage();
  const [tab, setTab] = useState('studio');
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const [, setTick] = useState(0);
  const [detailMovie, setDetailMovie] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedSetPin, setSelectedSetPin] = useState(null);
  const [isMapTouching, setIsMapTouching] = useState(false);

  // Map state (for Sets tab)
  const MAP_VIEW_H = 380;
  const mapAreaW = screenW - 32;
  const fitZoom = Math.min(mapAreaW / CITY_MAP.width, MAP_VIEW_H / CITY_MAP.height);
  const initialZoom = fitZoom * 1.3;
  const [zoom, setZoom] = useState(initialZoom);
  const [panX, setPanX] = useState(() => {
    const scaledW = CITY_MAP.width * initialZoom;
    return (mapAreaW - scaledW) / 2;
  });
  const [panY, setPanY] = useState(() => {
    const scaledH = CITY_MAP.height * initialZoom;
    return (MAP_VIEW_H - scaledH) / 2;
  });
  const touchRef = useRef(null);

  const clampPan = (val, viewSize, scaledSize) => {
    if (scaledSize <= viewSize) return (viewSize - scaledSize) / 2;
    return Math.min(0, Math.max(viewSize - scaledSize, val));
  };
  const zoomIn = () => {
    const newZoom = Math.min(zoom * 1.4, fitZoom * 8);
    const sw = CITY_MAP.width * newZoom;
    const sh = CITY_MAP.height * newZoom;
    setPanX(clampPan(panX, mapAreaW, sw));
    setPanY(clampPan(panY, MAP_VIEW_H, sh));
    setZoom(newZoom);
  };
  const zoomOut = () => {
    const newZoom = Math.max(zoom / 1.4, fitZoom);
    const sw = CITY_MAP.width * newZoom;
    const sh = CITY_MAP.height * newZoom;
    setPanX(clampPan(panX, mapAreaW, sw));
    setPanY(clampPan(panY, MAP_VIEW_H, sh));
    setZoom(newZoom);
  };
  const onTouchStart = (e) => {
    const t = e.nativeEvent.touches[0];
    touchRef.current = { startX: t.pageX, startY: t.pageY, startPanX: panX, startPanY: panY };
    setIsMapTouching(true);
  };
  const onTouchMove = (e) => {
    if (!touchRef.current) return;
    const t = e.nativeEvent.touches[0];
    const dx = t.pageX - touchRef.current.startX;
    const dy = t.pageY - touchRef.current.startY;
    const scaledW = CITY_MAP.width * zoom;
    const scaledH = CITY_MAP.height * zoom;
    setPanX(clampPan(touchRef.current.startPanX + dx, mapAreaW, scaledW));
    setPanY(clampPan(touchRef.current.startPanY + dy, MAP_VIEW_H, scaledH));
  };
  const onTouchEnd = () => { touchRef.current = null; setIsMapTouching(false); };

  const polygonPoints = (polyStr) => polyStr.split(' ').map((pt) => pt.split(',').map(Number));
  const polygonCentroid = (polyStr) => {
    const pts = polygonPoints(polyStr);
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x; cy += y; }
    return { x: cx / pts.length, y: cy / pts.length };
  };

  // Migrate old saved state on mount
  useEffect(() => {
    if (typeof business.staff !== 'number' || business.staffTypes || business.scripts) {
      const migrated = migrateMovieStudio(business);
      onMovieStudioUpdate(migrated, money);
    }
  }, []);

  // Movie creation state
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedAudience, setSelectedAudience] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [movieTitle, setMovieTitle] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const timersRef = useRef(new Set());
  const later = (fn, ms) => {
    const id = setTimeout(() => { timersRef.current.delete(id); fn(); }, ms);
    timersRef.current.add(id);
  };
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  const busyRef = useRef(false);
  const guard = (fn) => (...args) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try { fn(...args); } finally { requestAnimationFrame(() => { busyRef.current = false; }); }
  };

  const businessRef = useRef(business);
  businessRef.current = business;
  const moneyRef = useRef(money);
  moneyRef.current = money;
  const onMovieStudioUpdateRef = useRef(onMovieStudioUpdate);
  onMovieStudioUpdateRef.current = onMovieStudioUpdate;

  const notify = useCallback((title, message, type = 'error') => {
    const id = notifIdRef.current++;
    setNotifications((prev) => [...prev, { id, title, message, type }].slice(-2));
    later(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  // Check for completed hires
  useEffect(() => {
    const interval = setInterval(() => {
      const biz = businessRef.current;
      const hiring = biz.hiringStaff || [];
      if (hiring.length === 0) return;
      const now = Date.now();
      const completed = hiring.filter((h) => h.completesAt <= now);
      if (completed.length > 0) {
        const updated = completeHiredStaff(biz);
        onMovieStudioUpdateRef.current(updated, moneyRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('staff_ready'), tf('msg_52151', { v0: completed.length }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  // Check for completed movie development
  useEffect(() => {
    const interval = setInterval(() => {
      const biz = businessRef.current;
      const completed = getCompletedMovies(biz);
      if (completed.length > 0) {
        let updated = biz;
        for (const movie of completed) {
          updated = releaseMovie(updated, movie.instanceId);
          const releasedMovie = updated.movies.find((m) => m.instanceId === movie.instanceId);
          if (releasedMovie) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            notify(tf('movie_movie_released'), tf('msg_78992', { v0: releasedMovie.title, v1: releasedMovie.rating }), 'warning');
          }
        }
        onMovieStudioUpdateRef.current(updated, moneyRef.current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  // Ad countdown
  

  const canAfford = (cost) => money >= cost;

  const income = getMovieStudioHourlyIncome(business);
  const suspended = isSuspended(business);
  const staff = typeof business.staff === 'number' ? business.staff : 0;
  const movies = business.movies || [];
  const hiringStaff = business.hiringStaff || [];
  const maxMovieSlots = getMaxMovieSlots(business);
  const inDevelopment = movies.filter((m) => !m.releasedAt);
  const releasedMovies = movies.filter((m) => m.releasedAt);
  const ownedSets = getOwnedSets(business);

  // ─── Handlers ───
  const startWatchAdViaAdmob = (target) => { showRewardedAd(() => finishWatchAd(target)); };
  const startWatchAdForHire = (hireId) => { startWatchAdViaAdmob(`hire:${hireId}`); };
  const startWatchAdForDev = (movieInstanceId) => { startWatchAdViaAdmob(`dev:${movieInstanceId}`); };
  const startWatchAdForUpgrade = () => { startWatchAdViaAdmob('upgrade'); };

  const getDistrictCentroid = (districtId) => {
    const d = CITY_MAP.districts.find((d) => d.id === districtId);
    if (!d) return null;
    return polygonCentroid(d.polygon);
  };

  const finishWatchAd = guard((passedTarget) => {if (!passedTarget) return;
    if (passedTarget.startsWith('hire:')) {
      const hireId = passedTarget.slice(5);
      const updated = instantHireStaff(business, hireId);
      onMovieStudioUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('staff_hired'), t('staff_new_team_instant'));
    } else if (passedTarget.startsWith('dev:')) {
      const movieInstanceId = passedTarget.slice(4);
      const updated = releaseMovie(business, movieInstanceId);
      onMovieStudioUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const movie = (business.movies || []).find((m) => m.instanceId === movieInstanceId);
      notify(tf('movie_movie_released'), tf('msg_15019', { v0: movie?.title || t('fallback_your_movie') }));
    } else if (passedTarget === 'upgrade') {
      const updated = completeUpgradeNow(business);
      onMovieStudioUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('upg_complete'), t('upg_business_upgraded'));
    }
    });
  const handleMarketMovie = guard((movieInstanceId) => {
    const result = marketMovie(business, movieInstanceId);
    if (!result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(t('movie_cannot_market'), t('movie_expired'));
      return;
    }
    if (money < result.cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_58768', { v0: formatMoney(result.cost) }));
      return;
    }
    onMovieStudioUpdate(result.business, money - result.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const movie = (business.movies || []).find((m) => m.instanceId === movieInstanceId);
    notify(tf('movie_marketing_campaign'), tf('msg_16882', { v0: movie?.title || t('fallback_movie'), v1: result.bonusHours }));
  });

  const handleHireStaff = guard((count) => {
    if (hiringStaff.length + count > MAX_HIRING_AT_ONCE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('staff_hiring_full'), tf('msg_35390', { v0: MAX_HIRING_AT_ONCE }));
      return;
    }
    const cost = count * STAFF_HIRE_COST;
    if (!canAfford(cost)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_47007', { v0: count, v1: formatMoney(cost) }));
      return;
    }
    const updated = hireStaff(business, count);
    if (!updated) return;
    onMovieStudioUpdate(updated, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('staff_hiring_started'), tf('msg_41583', { v0: count }), 'warning');
  });

  const handleCreateMovie = guard(() => {
    if (selectedGenres.length === 0 || !selectedTopic || !selectedSize || !selectedAudience) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(t('movie_missing_details'), t('movie_select_details'));
      return;
    }
    if (inDevelopment.length >= maxMovieSlots) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('movie_studio_full'), tf('msg_17725', { v0: maxMovieSlots }));
      return;
    }
    const size = getMovieSize(selectedSize);
    if (!canAfford(size.cost)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_94501', { v0: formatMoney(size.cost) }));
      return;
    }
    const availableStaff = getAvailableStaff(business);
    if (availableStaff < size.staffReq) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('staff_not_enough'), tf('msg_54328', { v0: size.name, v1: size.staffReq, v2: staff, v3: staff - availableStaff }));
      return;
    }
    const gNames = selectedGenres.map((id) => getGenre(id)?.name).join('/');
    const title = movieTitle.trim() || `${getTopic(selectedTopic)?.name} ${gNames}`;
    const updated = startMovieDev(business, selectedGenres, selectedTopic, selectedSize, selectedAudience, title, selectedSet);
    if (!updated) return;
    onMovieStudioUpdate(updated, money - size.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const devMs = calculateDevTimeMs(selectedSize, selectedGenres);
    notify(tf('movie_production_started'), tf('msg_35830', { v0: title, v1: size.name, v2: formatTimeRemaining(devMs) }), 'warning');
    // Reset selection
    setSelectedGenres([]); setSelectedTopic(null); setSelectedSize(null); setSelectedAudience(null); setSelectedSet(null); setMovieTitle('');
    setTab('studio');
  });

  const handleOpenSet = guard((setId) => {
    const set = getMovieSet(setId);
    if (!set) return;
    if (ownedSets.some((s) => s.setId === setId)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('movie_already_owned'), tf('msg_93368', { v0: set.name }));
      return;
    }
    if (!canAfford(set.openCost)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_20736', { v0: set.name, v1: formatMoney(set.openCost) }));
      return;
    }
    const result = openSet(business, setId);
    if (result.error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (result.error === 'progress_locked') notify(tf('courier_locked'), tf('msg_68524', { v0: set.name }));
      return;
    }
    onMovieStudioUpdate(result, money - set.openCost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('movie_set_opened'), tf('msg_03510', { v0: set.name }), 'warning');
  });

  const handleUpgrade = guard(() => {
    const upgradeCost = getUpgradeCost(business);
    if (money < upgradeCost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_96705', { v0: formatMoney(upgradeCost) }));
      return;
    }
    const upgraded = upgradeBusiness(business);
    if (!upgraded) return;
    onMovieStudioUpdate(upgraded, money - upgradeCost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('upg_started'), tf('msg_18978', { v0: getUpgradeName(business) }));
  });

  const handlePayTax = guard(() => {
    const owed = getTaxOwed(business);
    if (money < owed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_18310', { v0: formatMoney(owed) }));
      return;
    }
    const paid = payTax(business);
    onMovieStudioUpdate(paid, money - owed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify(tf('tax_paid'), tf('msg_34964', { v0: formatMoney(owed) }));
  });

  // ─── Tabs ───
  const renderTabs = () => (
    <View style={styles.tabBar}>
      <Pressable style={[styles.tab, tab === 'studio' && styles.tabActive]} onPress={() => setTab('studio')}>
        <Ionicons name="business" size={14} color={tab === 'studio' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'studio' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_studio')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'create' && styles.tabActive]} onPress={() => setTab('create')}>
        <Ionicons name="film" size={14} color={tab === 'create' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_create')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'sets' && styles.tabActive]} onPress={() => setTab('sets')}>
        <Ionicons name="albums" size={14} color={tab === 'sets' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'sets' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_sets')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'staff' && styles.tabActive]} onPress={() => setTab('staff')}>
        <Ionicons name="people" size={14} color={tab === 'staff' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'staff' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('staff')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'finance' && styles.tabActive]} onPress={() => setTab('finance')}>
        <Ionicons name="wallet" size={14} color={tab === 'finance' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'finance' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_finance')}</Text>
      </Pressable>
    </View>
  );

  // ─── Studio tab ───
  const renderStudio = () => {
    const moviesIncome = releasedMovies.reduce((sum, m) => sum + getMovieHourlyIncome(m), 0);
    const salaryCost = getStaffSalaryHourly(business);

    return (
      <View>
        {/* Overview card */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_net_income_hr')}</Text>
          <Text style={[styles.overviewValue, { color: (income < 0 || suspended) ? '#ef4444' : '#4ade80' }]}>{formatMoney(income)}</Text>
          {suspended && <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>{t('fin_suspended')}</Text>}
          <View style={styles.incomeBreakdown}>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('biz_movies')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#4ade80' }]}>{formatMoney(moviesIncome)}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_staff_salary')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(salaryCost)}</Text>
            </View>
          </View>
          <Text style={styles.overviewSub}>Level {business.level} / 30 · {staff} staff · {releasedMovies.length} movies</Text>
        </View>

        {/* Released movies */}
        <Text style={styles.sectionTitle}>{t('movie_released_movies')}</Text>
        {releasedMovies.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="film-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_no_movies')}</Text>
          </View>
        )}
        {releasedMovies.map((movie) => {
          const gIds = Array.isArray(movie.genreIds) ? movie.genreIds : (movie.genreId ? [movie.genreId] : []);
          const genres = gIds.map(getGenre).filter(Boolean);
          const topic = getTopic(movie.topicId);
          const size = getMovieSize(movie.sizeId);
          const audience = getAudience(movie.audienceId);
          const movieIncome = getMovieHourlyIncome(movie);
          const elapsedHr = (Date.now() - movie.releasedAt) / (1000 * 60 * 60);
          const bonusHr = movie.bonusHours || 0;
          const fatigueMult = movie.fatigueMultiplier || 1.0;
          const totalLifespan = (MOVIE_LIFESPAN_HOURS + bonusHr) * fatigueMult;
          const remainingHr = Math.max(0, totalLifespan - elapsedHr);
          const lifespanPct = Math.max(0, Math.min(100, (remainingHr / totalLifespan) * 100));
          const ratingColor = movie.rating >= 8 ? '#4ade80' : movie.rating >= 5 ? '#fbbf24' : '#f87171';
          const genreText = genres.map((g) => g.name).join(' / ');
          const hasFatigue = fatigueMult < 1.0;
          return (
            <Pressable
              key={movie.instanceId}
              style={styles.gameCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDetailMovie(movie);
              }}
            >
              <View style={styles.gameCardHeader}>
                <Text style={styles.gameCardEmoji}>{genres[0]?.emoji || size?.emoji || '🎬'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameCardTitle}>{movie.title}</Text>
                  <Text style={styles.gameCardMeta}>{genreText} · {topic?.name} · {size?.name}{audience ? ` · ${audience.name}` : ''}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {hasFatigue && (
                    <View style={[styles.ratingBadge, { backgroundColor: '#f8717120', borderColor: '#f8717140' }]}>
                      <Ionicons name="trending-down" size={10} color="#f87171" />
                      <Text style={[styles.ratingText, { color: '#f87171', fontSize: 10 }]}>{Math.round(fatigueMult * 100)}%</Text>
                    </View>
                  )}
                  <View style={[styles.ratingBadge, { backgroundColor: `${ratingColor}20`, borderColor: `${ratingColor}40` }]}>
                    <Text style={[styles.ratingText, { color: ratingColor }]}>{movie.rating}/10</Text>
                  </View>
                </View>
              </View>
              <View style={styles.gameCardStats}>
                <View style={styles.gameCardStat}>
                  <Text style={styles.gameCardStatLabel}>{t('fin_income_hr')}</Text>
                  <Text style={[styles.gameCardStatValue, { color: '#4ade80' }]}>{formatMoney(movieIncome)}</Text>
                </View>
                <View style={styles.gameCardStat}>
                  <Text style={styles.gameCardStatLabel}>{t('fin_total_earned')}</Text>
                  <Text style={styles.gameCardStatValue}>{formatMoney(movie.income || 0)}</Text>
                </View>
                <View style={styles.gameCardStat}>
                  <Text style={styles.gameCardStatLabel}>{t('constr_time_left')}</Text>
                  <Text style={styles.gameCardStatValue}>{remainingHr < 1 ? '<1h' : `${Math.ceil(remainingHr)}h`}</Text>
                </View>
              </View>
              <View style={styles.lifespanBar}>
                <View style={[styles.lifespanFill, { width: `${lifespanPct}%`, backgroundColor: lifespanPct > 30 ? '#4ade80' : '#fbbf24' }]} />
              </View>
            </Pressable>
          );
        })}

        {/* In development */}
        {inDevelopment.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>IN PRODUCTION ({inDevelopment.length}/{maxMovieSlots})</Text>
            {inDevelopment.map((movie) => {
              const gIds = Array.isArray(movie.genreIds) ? movie.genreIds : (movie.genreId ? [movie.genreId] : []);
              const genres = gIds.map(getGenre).filter(Boolean);
              const size = getMovieSize(movie.sizeId);
              const remaining = getMovieDevTimeRemaining(movie);
              const total = movie.completesAt - movie.startedAt;
              const elapsed = total - remaining;
              const pct = Math.min(100, (elapsed / total) * 100);
              const genreText = genres.map((g) => g.name).join(' / ');
              return (
                <View key={movie.instanceId} style={styles.devCard}>
                  <View style={styles.devCardTop}>
                    <Text style={styles.devCardEmoji}>{size?.emoji || '🎬'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.devCardTitle}>{movie.title}</Text>
                      <Text style={styles.devCardMeta}>{genreText} · {size?.name}</Text>
                    </View>
                    <Text style={styles.devCardTime}>{formatTimeRemaining(remaining)}</Text>
                  </View>
                  <View style={styles.devProgressBar}>
                    <View style={[styles.devProgressFill, { width: `${pct}%` }]} />
                  </View>
                  <Pressable style={styles.devSkipBtn} onPress={() => startWatchAdForDev(movie.instanceId)}>
                    <Ionicons name="play-circle" size={14} color="#fbbf24" />
                    <Text style={styles.devSkipBtnText}>{t('ad_watch_skip')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  };

  // ─── Staff tab ───
  const renderStaff = () => {
    const hiringSlots = MAX_HIRING_AT_ONCE - hiringStaff.length;
    const salaryCost = getStaffSalaryHourly(business);
    const grossIncome = income + salaryCost;
    const netIncome = income;

    return (
      <View>
        {/* Staff overview card */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_team_size')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.overviewValue}>{staff}</Text>
            <Pressable onPress={() => setShowStaffModal(true)} style={{ padding: 4 }}>
              <Ionicons name="people-circle-outline" size={22} color={ACCENT} />
            </Pressable>
          </View>
          <Text style={styles.overviewSub}>{formatMoney(grossIncome)}/hr gross · {formatMoney(salaryCost)}/hr salary · {formatMoney(netIncome)}/hr net</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.staffGrid}>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_income_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: grossIncome >= 0 ? '#4ade80' : '#f87171' }]}>{formatMoney(grossIncome)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#f87171' }]}>{formatMoney(salaryCost)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_net_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: netIncome >= 0 ? '#4ade80' : '#f87171' }]}>{formatMoney(netIncome)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_per_staff')}</Text>
            <Text style={styles.staffGridValue}>{staff > 0 ? formatMoney(netIncome / staff) : '-'}</Text>
          </View>
        </View>

        {/* Pending hires */}
        {hiringStaff.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>PENDING HIRES ({hiringStaff.length}/{MAX_HIRING_AT_ONCE})</Text>
            {hiringStaff.map((hire) => {
              const remaining = getHireTimeRemaining(hire);
              const total = hire.completesAt - hire.hiredAt;
              const elapsed = total - remaining;
              const pct = Math.min(100, (elapsed / total) * 100);
              const m = hire.staffMember;
              const genderIcon = m?.gender === 'female' ? 'woman' : 'man';
              const genderColor = m?.gender === 'female' ? '#ec4899' : '#3b82f6';
              return (
                <View key={hire.id} style={styles.hireProgressCard}>
                  <View style={styles.hireProgressTop}>
                    <View style={styles.hireProgressInfo}>
                      <Ionicons name={genderIcon} size={18} color={genderColor} />
                      <View>
                        <Text style={styles.hireProgressName}>{m?.name || t('new_hire')}</Text>
                        <Text style={styles.hireProgressRole}>Age {m?.age || '?'} · Skill {m?.skill || '?'}/10</Text>
                      </View>
                    </View>
                    <Text style={styles.hireProgressTime}>{formatTimeRemaining(remaining)}</Text>
                  </View>
                  <View style={styles.hireProgressBar}>
                    <View style={[styles.hireProgressBarFill, { width: `${pct}%` }] } />
                  </View>
                  <Pressable style={styles.hireSkipBtn} onPress={() => startWatchAdForHire(hire.id)}>
                    <Ionicons name="play-circle" size={14} color="#fbbf24" />
                    <Text style={styles.hireSkipBtnText}>{t('ad_watch_skip')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {/* Hire buttons */}
        <Text style={styles.sectionTitle}>{t('staff_hire')}</Text>
        <View style={styles.hireRow}>
          {[1, 2, 3].map((count) => {
            const cost = count * STAFF_HIRE_COST;
            const affordable = canAfford(cost);
            const slotsAvailable = count <= hiringSlots;
            const disabled = !affordable || !slotsAvailable;
            return (
              <Pressable key={count} style={[styles.hireBtn, disabled && styles.hireBtnDisabled]} onPress={() => handleHireStaff(count)} disabled={disabled}>
                <Text style={styles.hireBtnCount}>+{count}</Text>
                <Text style={styles.hireBtnCost}>{formatMoney(cost)}</Text>
                <Text style={styles.hireBtnTime}>{`3s-45m`}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hireHint}>Takes {`3s-45m`} per hire. Max {MAX_HIRING_AT_ONCE} at a time. Watch ad to skip.</Text>
      </View>
    );
  };

  // ─── Create tab ───
  const toggleMultiSelect = (id, selected, setSelected, max) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < max) {
      setSelected([...selected, id]);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('movie_max_selected'), tf('msg_56661', { v0: max }));
    }
  };

  const renderCreate = () => {
    const slotsFull = inDevelopment.length >= maxMovieSlots;
    const canCreate = selectedGenres.length > 0 && selectedTopic && selectedSize && selectedAudience;
    const size = selectedSize ? getMovieSize(selectedSize) : null;
    const devMs = selectedSize ? calculateDevTimeMs(selectedSize, selectedGenres) : 0;
    const fatiguePreview = canCreate ? calculateFatigue(business, selectedGenres, selectedTopic, selectedSize, selectedAudience) : null;
    const availableStaffNow = getAvailableStaff(business);
    const enoughStaff = size && availableStaffNow >= size.staffReq;

    return (
      <View>
        {/* Dev slots bar */}
        <View style={styles.garageBar}>
          <View style={styles.garageBarInfo}>
            <Text style={styles.garageBarLabel}>{t('movie_production_slots')}</Text>
            <Text style={[styles.garageBarCount, slotsFull && { color: '#f87171' }]}>{inDevelopment.length}/{maxMovieSlots}</Text>
          </View>
          <View style={styles.garageBarTrack}>
            <View style={[styles.garageBarFill, { width: `${Math.min(100, (inDevelopment.length / maxMovieSlots) * 100)}%`, backgroundColor: slotsFull ? '#f87171' : ACCENT }]} />
          </View>
        </View>

        {/* Title + Size */}
        <View style={styles.createCard}>
          <TextInput
            style={styles.createInput}
            value={movieTitle}
            onChangeText={setMovieTitle}
            placeholder={t('movie_title_placeholder')}
            placeholderTextColor="#475569"
            maxLength={30}
          />
          <View style={styles.createChipRow}>
            {MOVIE_SIZES.map((s) => {
              const unlocked = isSizeUnlocked(s, staff);
              const isSelected = selectedSize === s.id;
              return (
                <Pressable
                  key={s.id}
                  style={[styles.createChip, isSelected && styles.createChipActive, !unlocked && styles.createChipLocked]}
                  onPress={() => {
                    if (!unlocked) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      notify(tf('courier_locked'), tf('msg_86117', { v0: s.name, v1: s.staffUnlock }));
                      return;
                    }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedSize(s.id);
                  }}
                >
                  {unlocked ? (
                    <Text style={[styles.createChipText, isSelected && styles.createChipTextActive]} numberOfLines={1}>{s.emoji} {s.name}</Text>
                  ) : (
                    <View style={styles.createChipLockedContent}>
                      <Ionicons name="lock-closed" size={10} color="#64748b" />
                      <Text style={[styles.createChipText, { fontSize: 11 }]} numberOfLines={1}>{s.staffUnlock}</Text>
                      <Ionicons name="people" size={10} color="#475569" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Audience + Set */}
        <View style={styles.createCard}>
          <View style={styles.createChipRow}>
            {AUDIENCES.map((a) => {
              const unlocked = isAudienceUnlocked(a, staff);
              const isSelected = selectedAudience === a.id;
              return (
                <Pressable
                  key={a.id}
                  style={[styles.createChip, isSelected && styles.createChipActive, !unlocked && styles.createChipLocked]}
                  onPress={() => {
                    if (!unlocked) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      notify(tf('courier_locked'), tf('msg_86117', { v0: a.name, v1: a.staffUnlock }));
                      return;
                    }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedAudience(a.id);
                  }}
                >
                  {unlocked ? (
                    <Text style={[styles.createChipText, isSelected && styles.createChipTextActive]} numberOfLines={1}>{a.emoji} {a.name}</Text>
                  ) : (
                    <View style={styles.createChipLockedContent}>
                      <Ionicons name="lock-closed" size={10} color="#64748b" />
                      <Text style={[styles.createChipText, { fontSize: 11 }]} numberOfLines={1}>{a.staffUnlock}</Text>
                      <Ionicons name="people" size={10} color="#475569" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {ownedSets.length > 0 && (
            <View style={[styles.createChipRow, { marginTop: 8 }]}>
              <Pressable
                style={[styles.createChip, !selectedSet && styles.createChipActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedSet(null); }}
              >
                <Text style={[styles.createChipText, !selectedSet && styles.createChipTextActive]} numberOfLines={1}>{t('movie_no_set')}</Text>
              </Pressable>
              {ownedSets.map((owned) => {
                const set = getMovieSet(owned.setId);
                if (!set) return null;
                const isSelected = selectedSet === set.id;
                return (
                  <Pressable
                    key={set.id}
                    style={[styles.createChip, isSelected && styles.createChipActive]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedSet(set.id); }}
                  >
                    <Text style={[styles.createChipText, isSelected && styles.createChipTextActive]} numberOfLines={1}>{set.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Genre + Topic - side by side compact cycle pills */}
        <View style={styles.dualPillRow}>
          <View style={styles.dualPillCol}>
            <Text style={styles.cyclePillLabel}>{t('gamedev_genre_upper')}</Text>
            <CyclePill
              items={MOVIE_GENRES}
              selectedId={selectedGenres[0] || null}
              onSelect={(id) => {
                const g = getGenre(id);
                if (!isGenreUnlocked(g, staff)) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  notify(tf('courier_locked'), tf('msg_86117', { v0: g.name, v1: g.staffUnlock }));
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedGenres([id, ...(selectedGenres[1] ? [selectedGenres[1]] : [])]);
              }}
              staff={staff}
              label={t('gamedev_genre')}
              getIsUnlocked={isGenreUnlocked}
            />
          </View>
          <View style={styles.dualPillCol}>
            <Text style={styles.cyclePillLabel}>{t('gamedev_topic_upper')}</Text>
            <CyclePill
              items={MOVIE_TOPICS}
              selectedId={selectedTopic}
              onSelect={(id) => {
                const t = getTopic(id);
                if (!isTopicUnlocked(t, staff)) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  notify(tf('courier_locked'), tf('msg_86117', { v0: t.name, v1: t.staffUnlock }));
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedTopic(id);
              }}
              staff={staff}
              label={t('gamedev_topic')}
              getIsUnlocked={isTopicUnlocked}
            />
          </View>
        </View>
        {selectedGenres[0] && (
          <View style={{ marginTop: 6 }}>
            <SecondaryPill
              items={MOVIE_GENRES.filter((g) => g.id !== selectedGenres[0])}
              selectedId={selectedGenres[1] || null}
              onSelect={(id) => {
                if (id) {
                  const g = getGenre(id);
                  if (!isGenreUnlocked(g, staff)) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    notify(tf('courier_locked'), tf('msg_86117', { v0: g.name, v1: g.staffUnlock }));
                    return;
                  }
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedGenres(id ? [selectedGenres[0], id] : [selectedGenres[0]]);
              }}
              staff={staff}
              label={t('gamedev_genre')}
              getIsUnlocked={isGenreUnlocked}
              unlockLevel={3}
              businessLevel={business.level || 1}
            />
          </View>
        )}

        {/* Selection summary */}
        {(selectedGenres.length > 0 || selectedTopic || selectedSize || selectedAudience) && (
        <View style={styles.selectionSummary}>
          {selectedGenres.length > 0 && (
            <View style={styles.selectionSummaryRow}>
              <Text style={styles.selectionSummaryLabel}>{t('gamedev_genre')}</Text>
              <Text style={styles.selectionSummaryText}>
                {selectedGenres.map((id) => getGenre(id)?.name).join(' + ')}
              </Text>
            </View>
          )}
          {selectedTopic && (
            <View style={styles.selectionSummaryRow}>
              <Text style={styles.selectionSummaryLabel}>{t('gamedev_topic')}</Text>
              <Text style={styles.selectionSummaryText}>
                {getTopic(selectedTopic)?.emoji} {getTopic(selectedTopic)?.name}
              </Text>
            </View>
          )}
          {selectedSize && (
            <View style={styles.selectionSummaryRow}>
              <Text style={styles.selectionSummaryLabel}>{t('gamedev_size')}</Text>
              <Text style={styles.selectionSummaryText}>
                {getMovieSize(selectedSize)?.emoji} {getMovieSize(selectedSize)?.name}
              </Text>
            </View>
          )}
          {selectedAudience && (
            <View style={styles.selectionSummaryRow}>
              <Text style={styles.selectionSummaryLabel}>{t('gamedev_audience')}</Text>
              <Text style={styles.selectionSummaryText}>
                {getAudience(selectedAudience)?.name}
              </Text>
            </View>
          )}
          {selectedSet && (
            <View style={styles.selectionSummaryRow}>
              <Text style={styles.selectionSummaryLabel}>{t('movie_set')}</Text>
              <Text style={styles.selectionSummaryText}>
                {getMovieSet(selectedSet)?.name}
              </Text>
            </View>
          )}
          {canCreate && size && (
            <Text style={styles.selectionSummaryMeta}>
              {formatTimeRemaining(devMs)} · {formatMoney(size.cost)} · {size.staffReq} staff
            </Text>
          )}
        </View>
        )}

        {/* Staff warning */}
        {canCreate && size && !enoughStaff && (
          <View style={styles.fatigueWarningInline}>
            <Ionicons name="warning" size={12} color="#f87171" />
            <Text style={styles.fatigueWarningInlineText}>Need {size.staffReq} free staff ({availableStaffNow} available)</Text>
          </View>
        )}

        {/* Fatigue warning */}
        {fatiguePreview && fatiguePreview.breakdown && fatiguePreview.breakdown.total > 0 && (
          <View style={styles.fatigueWarningInline}>
            <Ionicons name="warning" size={12} color="#f87171" />
            <Text style={styles.fatigueWarningInlineText}>{tf('gamedev_fatigue_warning', { v0: Math.round(fatiguePreview.breakdown.total * 100) })}</Text>
            {[
              { label: t('gamedev_topic'), v: fatiguePreview.breakdown.topic },
              { label: t('gamedev_genre'), v: fatiguePreview.breakdown.genre },
            ].filter((r) => r.v > 0).map((r) => (
              <View key={r.label} style={styles.fatigueTag}>
                <Text style={styles.fatigueTagText}>{r.label} -{Math.round(r.v * 100)}%</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={[styles.createBtn, (!canCreate || slotsFull) && styles.createBtnDisabled]}
          onPress={handleCreateMovie}
          disabled={!canCreate || slotsFull}
        >
          <Text style={styles.createBtnText}>
            {slotsFull ? t('studio_full') : canCreate ? t('start_production') : t('select_all_options')}
          </Text>
        </Pressable>
      </View>
    );
  };

  // ─── Sets tab (interactive map) ───
  const renderSets = () => {
    const releasedCount = releasedMovies.length;
    const ratedMovies = releasedMovies.filter((m) => m.rating);
    const averageRating = ratedMovies.length ? ratedMovies.reduce((sum, m) => sum + m.rating, 0) / ratedMovies.length : 0;
    const scaledW = CITY_MAP.width * zoom;
    const scaledH = CITY_MAP.height * zoom;
    const ownedSetIds = new Set(ownedSets.map((s) => s.setId));

    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('movie_production_sets')}</Text>
          <Text style={styles.overviewValue}>{ownedSets.length}</Text>
          <Text style={styles.overviewSub}>Sets boost movie quality · {releasedCount} released · Avg {averageRating.toFixed(1)}/10</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('map_city_map_set')}</Text>

        {/* Interactive map */}
        <View
          style={styles.mapArea}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <View style={{ position: 'absolute', top: panY, left: panX, width: scaledW, height: scaledH }}>
            <Image source={CITY_MAP.image} style={{ width: scaledW, height: scaledH }} resizeMode="stretch" />
            <Svg width={scaledW} height={scaledH} viewBox={`0 0 ${CITY_MAP.width} ${CITY_MAP.height}`} style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* District polygons */}
              {CITY_MAP.districts.map((d) => {
                const setDef = MOVIE_SETS.find((s) => s.id === d.id);
                if (!setDef) return null;
                const owned = ownedSetIds.has(d.id);
                const staffOk = staff >= (setDef.staffUnlock || 0);
                const releasedOk = releasedCount >= (setDef.requiredReleased || 0);
                const ratingOk = averageRating >= (setDef.requiredAverageRating || 0);
                const canOpen = staffOk && releasedOk && ratingOk && !owned;
                const points = polygonPoints(d.polygon).map(([x, y]) => `${x},${y}`).join(' ');
                const labelPos = polygonCentroid(d.polygon);
                const isSelected = selectedSetPin === d.id;

                let fillColor = 'rgba(255,255,255,0.04)';
                let strokeColor = 'rgba(255,255,255,0.1)';
                if (owned) {
                  fillColor = 'rgba(74,222,128,0.12)';
                  strokeColor = 'rgba(74,222,128,0.4)';
                } else if (canOpen) {
                  fillColor = isSelected ? 'rgba(244,114,182,0.15)' : 'rgba(244,114,182,0.06)';
                  strokeColor = isSelected ? 'rgba(244,114,182,0.5)' : 'rgba(244,114,182,0.2)';
                } else {
                  fillColor = 'rgba(248,113,113,0.05)';
                  strokeColor = 'rgba(248,113,113,0.15)';
                }

                return (
                  <G key={d.id}>
                    <Polygon
                      points={points}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <SvgText x={labelPos.x} y={labelPos.y} fontSize={12} fontWeight="700" fill={owned ? 'rgba(74,222,128,0.7)' : canOpen ? 'rgba(255,255,255,0.5)' : 'rgba(248,113,113,0.4)'} textAnchor="middle">
                      {d.name}
                    </SvgText>
                    {owned && (
                      <G>
                        <Circle cx={labelPos.x} cy={labelPos.y + 16} r={10} fill="rgba(74,222,128,0.8)" />
                        <SvgText x={labelPos.x} y={labelPos.y + 20} fontSize={11} fontWeight="800" fill="#0f172a" textAnchor="middle">
                          ✓
                        </SvgText>
                      </G>
                    )}
                    {!owned && !canOpen && (
                      <G>
                        <Circle cx={labelPos.x} cy={labelPos.y + 16} r={10} fill="rgba(248,113,113,0.7)" />
                        <Path
                          d={`M ${labelPos.x - 4} ${labelPos.y + 18} L ${labelPos.x - 4} ${labelPos.y + 14} A 4 4 0 0 1 ${labelPos.x + 4} ${labelPos.y + 14} L ${labelPos.x + 4} ${labelPos.y + 18} Z`}
                          fill="rgba(15,23,42,0.95)"
                        />
                        <Rect x={labelPos.x - 5} y={labelPos.y + 18} width={10} height={7} rx={1} fill="rgba(15,23,42,0.95)" />
                      </G>
                    )}
                    {/* Tappable overlay */}
                    <Polygon
                      points={points}
                      fill="transparent"
                      stroke="transparent"
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedSetPin(isSelected ? null : d.id);
                      }}
                    />
                  </G>
                );
              })}
            </Svg>
          </View>

          {/* Set detail overlay card */}
          {selectedSetPin && (() => {
            const setDef = MOVIE_SETS.find((s) => s.id === selectedSetPin);
            const district = CITY_MAP.districts.find((d) => d.id === selectedSetPin);
            if (!setDef || !district) return null;
            const labelPos = polygonCentroid(district.polygon);
            const screenX = panX + labelPos.x * zoom;
            const screenY = panY + labelPos.y * zoom;
            const owned = ownedSetIds.has(setDef.id);
            const staffOk = staff >= (setDef.staffUnlock || 0);
            const releasedOk = releasedCount >= (setDef.requiredReleased || 0);
            const ratingOk = averageRating >= (setDef.requiredAverageRating || 0);
            const canOpen = staffOk && releasedOk && ratingOk && !owned && canAfford(setDef.openCost);
            const cardW = 240;
            const cardH = 220;
            const cardX = Math.max(8, Math.min(mapAreaW - cardW - 8, screenX - cardW / 2));
            const cardY = Math.max(8, Math.min(MAP_VIEW_H - cardH - 8, screenY - cardH - 30));
            const setEmoji = setDef.id === 'suburbs' ? '🏠' : setDef.id === 'harbour' ? '⚓' : setDef.id === 'park' ? '🌳' : setDef.id === 'oldtown' ? '🏛️' : setDef.id === 'industrial' ? '🏭' : setDef.id === 'university' ? '🎓' : '🏙️';
            return (
              <View style={[styles.setOverlayCard, { left: cardX, top: cardY, width: cardW }]}>
                <View style={styles.setOverlayHeader}>
                  <Text style={styles.setOverlayEmoji}>{setEmoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.setOverlayName}>{setDef.name}</Text>
                    <Text style={styles.setOverlayZone}>Quality +{Math.round(setDef.qualityBonus * 100)}%</Text>
                  </View>
                  <Pressable hitSlop={12} onPress={() => setSelectedSetPin(null)}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </Pressable>
                </View>
                <Text style={styles.setOverlayDesc}>{setDef.desc}</Text>
                <View style={styles.setOverlayStats}>
                  <View style={styles.setOverlayStat}>
                    <Text style={styles.setOverlayStatLabel}>{t('cost')}</Text>
                    <Text style={styles.setOverlayStatValue}>{setDef.openCost === 0 ? t('free') : formatMoney(setDef.openCost)}</Text>
                  </View>
                  <View style={styles.setOverlayStat}>
                    <Text style={styles.setOverlayStatLabel}>{t('staff')}</Text>
                    <Text style={[styles.setOverlayStatValue, !staffOk && { color: '#f87171' }]}>{setDef.staffUnlock || 0}+</Text>
                  </View>
                  <View style={styles.setOverlayStat}>
                    <Text style={styles.setOverlayStatLabel}>{t('quality')}</Text>
                    <Text style={[styles.setOverlayStatValue, { color: '#4ade80' }]}>+{Math.round(setDef.qualityBonus * 100)}%</Text>
                  </View>
                </View>
                {owned ? (
                  <View style={[styles.setOpenBtn, { backgroundColor: 'rgba(74,222,128,0.15)' }]}>
                    <Text style={[styles.setOpenBtnText, { color: '#4ade80' }]}>{t('movie_already_owned')}</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.setOpenBtn, !canOpen && styles.setOpenBtnDisabled]}
                    onPress={() => { handleOpenSet(setDef.id); setSelectedSetPin(null); }}
                    disabled={!canOpen}
                  >
                    <Text style={styles.setOpenBtnText}>
                      {!staffOk ? tf('need_n_staff', { v0: setDef.staffUnlock || 0 }) : !releasedOk ? tf('need_n_releases', { v0: setDef.requiredReleased || 0 }) : !ratingOk ? tf('need_n_avg_rating', { v0: setDef.requiredAverageRating || 0 }) : !canAfford(setDef.openCost) ? t('alert_insufficient_funds') : tf('open_for', { v0: formatMoney(setDef.openCost) })}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })()}
        </View>

        {/* Zoom buttons */}
        <View style={styles.zoomRow}>
          <Pressable style={styles.zoomBtn} onPress={zoomIn}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.zoomBtnLabel}>{t('map_zoom_in')}</Text>
          </Pressable>
          <Pressable style={styles.zoomBtn} onPress={zoomOut}>
            <Ionicons name="remove" size={20} color="#fff" />
            <Text style={styles.zoomBtnLabel}>{t('map_zoom_out')}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ─── Finances tab ───
  const renderFinances = () => {
    const owed = getTaxOwed(business);
    const dailyTax = getDailyTax(business);
    const suspended = isSuspended(business);
    const hoursLeft = getHoursUntilSuspension(business);
    const daysLeft = Math.floor(hoursLeft / 24);
    const remHours = Math.floor(hoursLeft % 24);
    const upgradeCost = getUpgradeCost(business);
    const upgradeName = getUpgradeName(business);
    const maxed = business.level >= 30;
    const upgrading = business.upgradeCompletesAt && business.upgradeCompletesAt > Date.now();
    const canUpgrade = !maxed && money >= upgradeCost && !upgrading;
    const levelMult = getLevelMultiplier(business);
    const incomeMultPct = Math.round((levelMult - 1) * 100);
    const nextMultPct = Math.round((Math.pow(1.12, business.level) - 1) * 100);

    return (
      <View>
        <Text style={styles.sectionTitle}>{t('tax_section')}</Text>
        <View style={[styles.finCard, suspended && styles.finCardDanger]}>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('status')}</Text>
            <Text style={[styles.finValue, suspended && { color: '#f87171' }]}>{suspended ? 'SUSPENDED' : t('active')}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('tax_rate')}</Text>
            <Text style={styles.finValue}>{(getBusinessTaxRate({ type: 'moviestudio' }) * 100).toFixed(0)}% Entertainment</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('tax_daily')}</Text>
            <Text style={styles.finValue}>{formatMoney(dailyTax)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('tax_owed')}</Text>
            <View style={styles.finPayRow}>
              <Text style={[styles.finValue, owed > 0 && { color: '#fbbf24' }]}>{formatMoney(owed)}</Text>
              <Pressable style={styles.finPayBtn} onPress={handlePayTax}>
                <Text style={styles.finPayBtnText}>{suspended ? t('resume') : t('pay')}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('tax_time_until_suspension')}</Text>
            <Text style={styles.finValue}>{suspended ? '-' : `${daysLeft}d ${remHours}h`}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('upg_section')}</Text>
        <View style={styles.finCard}>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('level')}</Text>
            <Text style={styles.finValue}>{business.level} / 30</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('upg_income_multiplier')}</Text>
            <Text style={[styles.finValue, { color: '#4ade80' }]}>+{incomeMultPct}%</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('upg_movie_slots')}</Text>
            <Text style={styles.finValue}>{maxMovieSlots} max</Text>
          </View>
          {!maxed && (
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>{t('upg_next_level')}</Text>
              <Text style={[styles.finValue, { color: '#94a3b8' }]}>+{nextMultPct}% income</Text>
            </View>
          )}
          <View style={styles.finUpgradeBox}>
            <Text style={styles.finUpgradeName}>{maxed ? t('fully_upgraded') : upgradeName}</Text>
            {upgrading && <UpgradeProgress business={business} onSkip={() => startWatchAdForUpgrade()} />}
            {!maxed && !upgrading && (
              <Pressable style={[styles.finUpgradeBtn, !canUpgrade && styles.finUpgradeBtnDisabled]} onPress={handleUpgrade} disabled={!canUpgrade}>
                <Text style={styles.finUpgradeBtnText}>
                  {canUpgrade ? tf('upgrade_for', { v0: formatMoney(upgradeCost) }) : t('insufficient_funds')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('fin_financials')}</Text>
        <View style={styles.finCard}>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_income_hr')}</Text>
            <Text style={[styles.finValue, { color: income >= 0 ? '#4ade80' : '#f87171' }]}>{formatMoney(income)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_all_time_earnings')}</Text>
            <Text style={styles.finValue}>{formatMoney(business.allTimeEarnings || 0)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_capitalisation')}</Text>
            <Text style={styles.finValue}>{formatMoney(business.capitalisation || 0)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('staff')}</Text>
            <Text style={styles.finValue}>{staff} employees</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.finValue, { color: '#f87171' }]}>{formatMoney(getStaffSalaryHourly(business))}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_released_movies')}</Text>
            <Text style={styles.finValue}>{releasedMovies.length}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_owned_sets')}</Text>
            <Text style={styles.finValue}>{ownedSets.length}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={ACCENT} />
        </Pressable>
        <Text style={styles.headerTitle}>{business.name}</Text>
        <Pressable style={{ width: 40, alignItems: 'center' }} onPress={onOpenSettings}>
          <Ionicons name="settings" size={20} color={ACCENT} />
        </Pressable>
      </View>
      {renderTabs()}
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={!isMapTouching}>
        {tab === 'studio' && renderStudio()}
        {tab === 'staff' && renderStaff()}
        {tab === 'create' && renderCreate()}
        {tab === 'sets' && renderSets()}
        {tab === 'finance' && renderFinances()}
        {tab !== 'create' && <View style={styles.spacer} />}
      </ScrollView>

      {/* Ad overlay */}

      {/* Movie detail modal */}
      {detailMovie && (() => {
        const gIds = Array.isArray(detailMovie.genreIds) ? detailMovie.genreIds : (detailMovie.genreId ? [detailMovie.genreId] : []);
        const genres = gIds.map(getGenre).filter(Boolean);
        const topic = getTopic(detailMovie.topicId);
        const size = getMovieSize(detailMovie.sizeId);
        const audience = getAudience(detailMovie.audienceId);
        const set = detailMovie.setId ? getMovieSet(detailMovie.setId) : null;
        const movieIncome = getMovieHourlyIncome(detailMovie);
        const elapsedHr = (Date.now() - detailMovie.releasedAt) / (1000 * 60 * 60);
        const bonusHr = detailMovie.bonusHours || 0;
        const fatigueMult = detailMovie.fatigueMultiplier || 1.0;
        const totalLifespan = (MOVIE_LIFESPAN_HOURS + bonusHr) * fatigueMult;
        const remainingHr = Math.max(0, totalLifespan - elapsedHr);
        const lifespanPct = Math.max(0, Math.min(100, (remainingHr / totalLifespan) * 100));
        const ratingColor = detailMovie.rating >= 8 ? '#4ade80' : detailMovie.rating >= 5 ? '#fbbf24' : '#f87171';
        const marketingCount = detailMovie.marketingCount || 0;
        const nextBonusHr = Math.max(1, MARKETING_BASE_HOURS - marketingCount);
        const sizeMult = size ? size.incomeMult : 1;
        const marketingCost = Math.floor(MARKETING_BASE_COST * sizeMult * Math.pow(1.5, marketingCount));
        const canMarket = remainingHr > 0 && money >= marketingCost;
        return (
          <View style={styles.detailOverlay}>
            <Pressable style={styles.detailBackdrop} onPress={() => setDetailMovie(null)} />
            <View style={styles.detailModal}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailEmoji}>{genres[0]?.emoji || size?.emoji || '🎬'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{detailMovie.title}</Text>
                  <Text style={styles.detailStatus}>{detailMovie.rating}/10 Rating</Text>
                </View>
                <Pressable onPress={() => setDetailMovie(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>

              <ScrollView style={styles.detailBody} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.detailMeta}>
                  {genres.map((g) => g.name).join(' / ')} · {topic?.name} · {size?.name}{audience ? ` · ${audience.name}` : ''}{set ? ` · ${set.name}` : ''}
                </Text>

                <View style={styles.detailStatsGrid}>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('fin_income_hr')}</Text>
                    <Text style={[styles.detailStatValue, { color: '#4ade80' }]}>{formatMoney(movieIncome)}</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('fin_total_earned')}</Text>
                    <Text style={styles.detailStatValue}>{formatMoney(detailMovie.income || 0)}</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('movie_released')}</Text>
                    <Text style={styles.detailStatValue}>{Math.floor(elapsedHr)}h ago</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('constr_time_left')}</Text>
                    <Text style={styles.detailStatValue}>{remainingHr < 1 ? '<1h' : `${Math.ceil(remainingHr)}h`}</Text>
                  </View>
                </View>

                {detailMovie.ratingBreakdown && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{tf('gamedev_rating_breakdown', { v0: detailMovie.rating })}</Text>
                    {[
                      { label: t('gamedev_staff_quality'), value: detailMovie.ratingBreakdown.staffScore },
                      { label: t('gamedev_topic_genre'), value: detailMovie.ratingBreakdown.topicGenreFit },
                      { label: t('gamedev_topic_audience'), value: detailMovie.ratingBreakdown.topicAudienceFit },
                      { label: t('gamedev_genre_audience'), value: detailMovie.ratingBreakdown.genreAudienceFit },
                      { label: t('gamedev_audience_size'), value: detailMovie.ratingBreakdown.audienceSizeFit },
                      { label: t('gamedev_genre_size'), value: detailMovie.ratingBreakdown.genreSizeFit },
                      { label: t('gamedev_topic_size'), value: detailMovie.ratingBreakdown.topicSizeFit },
                      { label: t('gamedev_set_bonus'), value: detailMovie.ratingBreakdown.setBonus },
                    ].map((row) => {
                      const pct = Math.round(row.value * 100);
                      const color = pct >= 80 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171';
                      return (
                        <View key={row.label} style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>{row.label}</Text>
                          <View style={styles.breakdownBar}>
                            <View style={[styles.breakdownBarFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
                          </View>
                          <Text style={[styles.breakdownValue, { color }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                    <View style={styles.breakdownSummary}>
                      <Text style={styles.breakdownSummaryText}>Level Bonus: +{Math.round(detailMovie.ratingBreakdown.levelBonus * 100)}%</Text>
                      {detailMovie.ratingBreakdown.multiPenalty > 0 && (
                        <Text style={[styles.breakdownSummaryText, { color: '#f87171' }]}>Multi-Penalty: -{Math.round(detailMovie.ratingBreakdown.multiPenalty * 100)}%</Text>
                      )}
                      <Text style={styles.breakdownSummaryText}>Luck: {detailMovie.ratingBreakdown.randomFactor >= 1 ? '+' : ''}{Math.round((detailMovie.ratingBreakdown.randomFactor - 1) * 100)}%</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('movie_lifespan')}</Text>
                  <View style={styles.detailHealthBar}>
                    <View style={[styles.detailHealthFill, {
                      width: `${lifespanPct}%`,
                      backgroundColor: lifespanPct > 30 ? '#4ade80' : '#fbbf24',
                    }]} />
                  </View>
                  <View style={styles.detailLifespanInfo}>
                    <Text style={styles.detailLifespanText}>Base: {MOVIE_LIFESPAN_HOURS}h</Text>
                    {bonusHr > 0 && <Text style={[styles.detailLifespanText, { color: '#fbbf24' }]}>+{bonusHr}h marketing</Text>}
                    {detailMovie.fatigueMultiplier && detailMovie.fatigueMultiplier < 1.0 && (
                      <Text style={[styles.detailLifespanText, { color: '#f87171' }]}>
                        {tf('gamedev_fatigue_effective', { v0: Math.round(detailMovie.fatigueMultiplier * (MOVIE_LIFESPAN_HOURS + bonusHr)) })}
                      </Text>
                    )}
                  </View>
                </View>

                {detailMovie.fatigueBreakdown && detailMovie.fatigueBreakdown.total > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>FATIGUE (-{Math.round(detailMovie.fatigueBreakdown.total * 100)}%)</Text>
                    <Text style={styles.fatigueHint}>{tf('gamedev_fatigue_hint', { v0: FATIGUE_WINDOW_HOURS })}</Text>
                    {[
                      { label: t('gamedev_topic'), value: detailMovie.fatigueBreakdown.topic },
                      { label: t('gamedev_genre'), value: detailMovie.fatigueBreakdown.genre },
                    ].filter((r) => r.value > 0).map((row) => (
                      <View key={row.label} style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{row.label}</Text>
                        <View style={styles.breakdownBar}>
                          <View style={[styles.breakdownBarFill, { width: `${Math.round(row.value / 0.6 * 100)}%`, backgroundColor: '#f87171' }]} />
                        </View>
                        <Text style={[styles.breakdownValue, { color: '#f87171' }]}>-{Math.round(row.value * 100)}%</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('movie_marketing')}</Text>
                  <Text style={styles.detailMarketingCount}>{marketingCount} campaign{marketingCount !== 1 ? 's' : ''} run</Text>
                  <Pressable
                    style={[styles.marketBtn, !canMarket && styles.marketBtnDisabled]}
                    onPress={() => {
                      handleMarketMovie(detailMovie.instanceId);
                      const updated = (business.movies || []).map((m) =>
                        m.instanceId === detailMovie.instanceId
                          ? { ...m, bonusHours: (m.bonusHours || 0) + nextBonusHr, marketingCount: marketingCount + 1 }
                          : m
                      );
                      setDetailMovie(updated.find((m) => m.instanceId === detailMovie.instanceId));
                    }}
                    disabled={!canMarket}
                  >
                    <Ionicons name="megaphone" size={16} color={canMarket ? '#fbbf24' : '#475569'} />
                    <Text style={[styles.marketBtnText, !canMarket && { color: '#475569' }]}>
                      {remainingHr <= 0 ? t('movie_expired') : tf('market_for', { v0: formatMoney(marketingCost), v1: nextBonusHr })}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        );
      })()}

      {/* Staff members modal */}
      <TeamRosterModal
        visible={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        staffMembers={business.staffMembers || []}
        accentColor={ACCENT}
        onFire={(m) => { onMovieStudioUpdate(fireStaff(business, m.id)); }}
        onRaise={(m) => { onMovieStudioUpdate(raiseStaff(business, m.id)); }}
        onTrain={(m) => { onMovieStudioUpdate(trainStaff(business, m.id)); }}
      />

      {/* Notifications */}
      <View style={styles.notifContainer} pointerEvents="none">
        {notifications.map((n) => (
          <View key={n.id} style={[styles.notif, n.type === 'warning' && styles.notifWarning]}>
            <Text style={styles.notifTitle}>{n.title}</Text>
            <Text style={styles.notifMsg}>{n.message}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(244,114,182,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#fff' },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, marginHorizontal: 16, marginBottom: 14, gap: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10 },
  tabActive: { backgroundColor: ACCENT },
  tabText: { color: '#64748b', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  tabTextActive: { color: '#000' },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  sectionTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 1.5, marginTop: 18, marginBottom: 10 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  spacer: { height: 40 },
  // Overview card
  overviewCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  overviewLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  overviewValue: { fontSize: 42, fontWeight: '900', color: '#fff', marginBottom: 6 },
  overviewSub: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  incomeBreakdown: { width: '100%', marginTop: 14, marginBottom: 14, paddingHorizontal: 20 },
  incomeBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  incomeBreakdownLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  incomeBreakdownValue: { fontSize: 13, fontWeight: '700' },
  // Staff grid
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  staffGridItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  staffGridLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  staffGridValue: { fontSize: 16, color: '#fff', fontWeight: '700' },
  // Hire
  hireProgressCard: { backgroundColor: 'rgba(244,114,182,0.06)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.15)', borderRadius: 14, padding: 14, marginBottom: 8 },
  hireProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hireProgressInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hireProgressName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  hireProgressRole: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  hireProgressTime: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  hireProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 10 },
  hireProgressBarFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  hireSkipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 8 },
  hireSkipBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  hireRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  hireBtn: { flex: 1, backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  hireBtnDisabled: { opacity: 0.4 },
  hireBtnCount: { fontSize: 16, fontWeight: '800', color: '#4ade80' },
  hireBtnCost: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  hireBtnTime: { fontSize: 9, color: '#64748b', marginTop: 2 },
  hireHint: { fontSize: 11, color: '#64748b', marginBottom: 16, paddingHorizontal: 4 },
  // Movie cards
  gameCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  gameCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  gameCardEmoji: { fontSize: 28 },
  gameCardTitle: { fontSize: 15, color: '#fff', fontWeight: '800' },
  gameCardMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  ratingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  ratingText: { fontSize: 14, fontWeight: '800' },
  gameCardStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  gameCardStat: { alignItems: 'center' },
  gameCardStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  gameCardStatValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  // Movie detail modal
  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, elevation: 10000, justifyContent: 'center', alignItems: 'center' },
  detailBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
  detailModal: { width: '90%', maxHeight: '85%', backgroundColor: '#0f172a', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  detailEmoji: { fontSize: 36 },
  detailName: { fontSize: 18, color: '#fff', fontWeight: '800' },
  detailStatus: { fontSize: 13, color: '#64748b', marginTop: 2 },
  detailBody: { padding: 20 },
  detailMeta: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  detailStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  detailStatBox: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  detailStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  detailStatValue: { fontSize: 15, color: '#fff', fontWeight: '800' },
  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 11, color: '#64748b', fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  detailHealthBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  detailHealthFill: { height: '100%', borderRadius: 4 },
  detailLifespanInfo: { flexDirection: 'row', gap: 12, marginTop: 6 },
  detailLifespanText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  // Rating breakdown
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  breakdownLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', width: 120 },
  breakdownBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: 3 },
  breakdownValue: { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
  breakdownSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  breakdownSummaryText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  fatigueHint: { fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 8 },
  // Fatigue warning
  fatigueWarningInline: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(248,113,113,0.08)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  fatigueWarningInlineText: { fontSize: 11, color: '#f87171', fontWeight: '700' },
  fatigueTag: { backgroundColor: 'rgba(248,113,113,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  fatigueTagText: { fontSize: 10, color: '#f87171', fontWeight: '600' },
  // Dev cards
  devCard: { backgroundColor: 'rgba(244,114,182,0.06)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.15)', borderRadius: 14, padding: 14, marginBottom: 10 },
  devCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  devCardEmoji: { fontSize: 24 },
  devCardTitle: { fontSize: 14, color: '#fff', fontWeight: '700' },
  devCardMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  devCardTime: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  devProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  devProgressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  devSkipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 7 },
  devSkipBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  // Garage bar
  garageBar: { marginBottom: 16, paddingHorizontal: 4 },
  garageBarInfo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  garageBarLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  garageBarCount: { fontSize: 16, fontWeight: '800', color: '#fff' },
  garageBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  garageBarFill: { height: '100%', borderRadius: 3 },
  // Create tab
  createCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  createInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  createChipRow: { flexDirection: 'row', gap: 6 },
  createChip: { paddingVertical: 12, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', flex: 1, borderRadius: 10 },
  createChipActive: { backgroundColor: 'rgba(244,114,182,0.15)' },
  createChipLocked: { opacity: 0.35 },
  createChipLockedContent: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  createChipText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  createChipTextActive: { color: '#fff', fontWeight: '800' },
  // Cycle pills
  dualPillRow: { flexDirection: 'row', gap: 10 },
  dualPillCol: { flex: 1 },
  cyclePillWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cycleArrow: { padding: 4 },
  cyclePill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cyclePillActive: { backgroundColor: 'rgba(244,114,182,0.15)', borderColor: 'rgba(244,114,182,0.3)' },
  cyclePillSecondary: { backgroundColor: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.25)' },
  cyclePillLocked: { opacity: 0.4 },
  cyclePillText: { fontSize: 13, color: '#94a3b8', fontWeight: '700', textAlign: 'center' },
  cyclePillTextActive: { color: '#fff', fontWeight: '800' },
  cyclePillLockText: { fontSize: 12, color: '#475569', fontWeight: '600', flex: 1, textAlign: 'center' },
  cyclePillRemove: { padding: 4 },
  cyclePillLabel: { fontSize: 10, color: '#64748b', fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  // Selection summary
  selectionSummary: { flexDirection: 'column', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 12, marginTop: 10 },
  selectionSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 3 },
  selectionSummaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', letterSpacing: 0.5 },
  selectionSummaryText: { fontSize: 13, color: '#fff', fontWeight: '700', textAlign: 'center' },
  selectionSummaryMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textAlign: 'center', marginTop: 6 },
  createBtn: { backgroundColor: ACCENT, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  createBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  createBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  // Sets / contracts
  contractCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  contractHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  contractEmoji: { fontSize: 28 },
  contractName: { fontSize: 15, color: '#fff', fontWeight: '800' },
  contractDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  contractStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 4 },
  contractStatItem: { alignItems: 'center', flex: 1 },
  contractStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },
  contractStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  contractStatValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  acceptBtn: { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  acceptBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  acceptBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
  // Finances
  finCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  finCardDanger: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  finLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  finValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  finPayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  finPayBtn: { backgroundColor: ACCENT, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  finPayBtnText: { fontSize: 12, color: '#000', fontWeight: '800' },
  finUpgradeBox: { marginTop: 8 },
  finUpgradeName: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  finUpgradeBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  finUpgradeBtnDisabled: { opacity: 0.4 },
  finUpgradeBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },
  // Marketing
  detailMarketingCount: { fontSize: 13, color: '#fff', fontWeight: '600', marginBottom: 10 },
  marketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 10, paddingVertical: 12 },
  marketBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' },
  marketBtnText: { fontSize: 13, fontWeight: '700', color: '#fbbf24' },
  lifespanBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  lifespanFill: { height: '100%', borderRadius: 3 },
  // Ad overlay
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
  // Notifications
  notifContainer: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999, elevation: 9999, gap: 8 },
  notif: { backgroundColor: 'rgba(239,68,68,0.95)', borderRadius: 12, padding: 14 },
  notifWarning: { backgroundColor: 'rgba(251,191,36,0.95)' },
  notifTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  notifMsg: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  // Map (Sets tab)
  mapArea: { height: 380, backgroundColor: '#0a0c12', borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  zoomRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  zoomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingVertical: 10 },
  zoomBtnLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  // Set overlay card (on map)
  setOverlayCard: { position: 'absolute', backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(244,114,182,0.2)', padding: 14, zIndex: 100, elevation: 100 },
  setOverlayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  setOverlayEmoji: { fontSize: 28 },
  setOverlayName: { fontSize: 15, color: '#fff', fontWeight: '800' },
  setOverlayZone: { fontSize: 11, color: '#64748b', marginTop: 2 },
  setOverlayDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 10 },
  setOverlayStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  setOverlayStat: { alignItems: 'center', flex: 1 },
  setOverlayStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  setOverlayStatValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  setOpenBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  setOpenBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  setOpenBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
});
