import { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet, TextInput, LayoutAnimation, Platform } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf } from '../../data/i18n';
import { showRewardedAd } from '../../data/ads';
import UpgradeProgress from '../../components/UpgradeProgress';
import TeamRosterModal from '../../components/TeamRosterModal';
import {
  formatMoney,
  GENRES,
  TOPICS,
  PLATFORMS,
  GAME_SIZES,
  AUDIENCES,
  CONTRACT_TYPES,
  getGenre,
  getTopic,
  getPlatform,
  getGameSize,
  getAudience,
  getContractType,
  getGameDevHourlyIncome,
  getGameHourlyIncome,
  getContractHourlyIncome,
  getLevelMultiplier,
  getMaxGameSlots,
  getMaxContractSlots,
  getGameDevTimeRemaining,
  getHireTimeRemaining,
  formatTimeRemaining,
  startGameDev,
  releaseGame,
  getCompletedGames,
  generateContracts,
  acceptContract,
  hireStaff,
  completeHiredStaff,
  instantHireStaff,
  isGenreUnlocked,
  isTopicUnlocked,
  isSizeUnlocked,
  isAudienceUnlocked,
  isPlatformUnlocked,
  getReservedStaff,
  getAvailableStaff,
  getStaffAvgSkill,
  fireStaff, raiseStaff, trainStaff,
  calculateDevTimeMs,
  STAFF_HIRE_COST,
  STAFF_SALARY_HOURLY,
  getStaffSalaryHourly,
  STAFF_HIRE_MIN_MS,
  STAFF_HIRE_MAX_MS,
  MAX_HIRING_AT_ONCE,
  MAX_GENRES,
  MAX_PLATFORMS,
  MULTI_GENRE_TIME_PENALTY,
  MULTI_PLATFORM_TIME_PENALTY,
  GAME_LIFESPAN_HOURS,
  CONTRACT_LIFESPAN_HOURS,
  MARKETING_BASE_COST,
  MARKETING_BASE_HOURS,
  marketGame,
  calculateFatigue,
  FATIGUE_WINDOW_HOURS,
} from '../../data/gamedev';
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

const ACCENT = '#a78bfa';

// Compact cycle pill - tap arrows to cycle through items, tap pill to select
const CyclePill = ({ items, selectedId, onSelect, staff, label, getIsUnlocked, multiUnlockLevel, businessLevel }) => {
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

export default function GameDevScreen({ business, money, boostExpiresAt, onBack, onOpenSettings, onGameDevUpdate }) {
  useLanguage();
  const [tab, setTab] = useState('studio');
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const [, setTick] = useState(0);
  const [detailGame, setDetailGame] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Game creation state - arrays for multi-select
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedAudience, setSelectedAudience] = useState(null);
  const [gameTitle, setGameTitle] = useState('');

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
  const onGameDevUpdateRef = useRef(onGameDevUpdate);
  onGameDevUpdateRef.current = onGameDevUpdate;

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
        onGameDevUpdateRef.current(updated, moneyRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('staff_ready'), tf('msg_52151', { v0: completed.length }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  // Check for completed game development
  useEffect(() => {
    const interval = setInterval(() => {
      const biz = businessRef.current;
      const completed = getCompletedGames(biz);
      if (completed.length > 0) {
        let updated = biz;
        for (const game of completed) {
          updated = releaseGame(updated, game.instanceId);
          const releasedGame = updated.games.find((g) => g.instanceId === game.instanceId);
          if (releasedGame) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            notify(tf('gamedev_game_released'), tf('msg_78992', { v0: releasedGame.title, v1: releasedGame.rating }), 'warning');
          }
        }
        onGameDevUpdateRef.current(updated, moneyRef.current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  // Ad countdown
  

  const canAfford = (cost) => money >= cost;

  const income = getGameDevHourlyIncome(business);
  const suspended = isSuspended(business);
  const staff = business.staff || 0;
  const games = business.games || [];
  const contracts = business.contracts || [];
  const availableContracts = business.availableContracts || [];
  const hiringStaff = business.hiringStaff || [];
  const maxGameSlots = getMaxGameSlots(business);
  const maxContractSlots = getMaxContractSlots(business);
  const inDevelopment = games.filter((g) => !g.releasedAt);
  const releasedGames = games.filter((g) => g.releasedAt);
  const activeContracts = contracts.filter((c) => {
    const elapsed = (Date.now() - c.startedAt) / (1000 * 60 * 60);
    return elapsed < CONTRACT_LIFESPAN_HOURS;
  });

  // ─── Handlers ───
  const startWatchAdViaAdmob = (target) => { showRewardedAd(() => finishWatchAd(target)); };
  const startWatchAdForHire = (hireId) => { startWatchAdViaAdmob(`hire:${hireId}`); };
  const startWatchAdForDev = (gameInstanceId) => { startWatchAdViaAdmob(`dev:${gameInstanceId}`); };
  const startWatchAdForUpgrade = () => { startWatchAdViaAdmob('upgrade'); };

  const finishWatchAd = guard((passedTarget) => {if (!passedTarget) return;
    if (passedTarget.startsWith('hire:')) {
      const hireId = passedTarget.slice(5);
      const updated = instantHireStaff(business, hireId);
      onGameDevUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('staff_hired'), t('staff_new_team_instant'));
    } else if (passedTarget.startsWith('dev:')) {
      const gameInstanceId = passedTarget.slice(4);
      const updated = releaseGame(business, gameInstanceId);
      onGameDevUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const game = (business.games || []).find((g) => g.instanceId === gameInstanceId);
      notify(tf('gamedev_game_released'), tf('msg_15019', { v0: game?.title || t('fallback_your_game') }));
    } else if (passedTarget === 'upgrade') {
      const updated = completeUpgradeNow(business);
      onGameDevUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('upg_complete'), t('upg_business_upgraded'));
    }
    });
  const handleMarketGame = guard((gameInstanceId) => {
    const result = marketGame(business, gameInstanceId);
    if (!result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(t('movie_cannot_market'), t('gamedev_game_expired'));
      return;
    }
    if (money < result.cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_58768', { v0: formatMoney(result.cost) }));
      return;
    }
    onGameDevUpdate(result.business, money - result.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const game = (business.games || []).find((g) => g.instanceId === gameInstanceId);
    notify(tf('movie_marketing_campaign'), tf('msg_16882', { v0: game?.title || t('fallback_game'), v1: result.bonusHours }));
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
    onGameDevUpdate(updated, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('staff_hiring_started'), tf('msg_41583', { v0: count }), 'warning');
  });

  const handleCreateGame = guard(() => {
    if (selectedGenres.length === 0 || !selectedTopic || selectedPlatforms.length === 0 || !selectedSize || !selectedAudience) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(t('movie_missing_details'), t('gamedev_select_details'));
      return;
    }
    if (inDevelopment.length >= maxGameSlots) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('movie_studio_full'), tf('msg_05935', { v0: maxGameSlots }));
      return;
    }
    const size = getGameSize(selectedSize);
    if (!canAfford(size.cost)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_00837', { v0: formatMoney(size.cost) }));
      return;
    }
    const availableStaff = getAvailableStaff(business);
    if (availableStaff < size.staffReq) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('staff_not_enough'), tf('msg_54328', { v0: size.name, v1: size.staffReq, v2: staff, v3: staff - availableStaff }));
      return;
    }
    const gNames = selectedGenres.map((id) => getGenre(id)?.name).join('/');
    const title = gameTitle.trim() || `${getTopic(selectedTopic)?.name} ${gNames}`;
    const updated = startGameDev(business, selectedGenres, selectedTopic, selectedPlatforms, selectedSize, selectedAudience, title);
    if (!updated) return;
    onGameDevUpdate(updated, money - size.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const devMs = calculateDevTimeMs(selectedSize, selectedGenres, selectedPlatforms);
    notify(tf('gamedev_development_started'), tf('msg_35830', { v0: title, v1: size.name, v2: formatTimeRemaining(devMs) }), 'warning');
    // Reset selection
    setSelectedGenres([]); setSelectedTopic(null); setSelectedPlatforms([]); setSelectedSize(null); setSelectedAudience(null); setGameTitle('');
    setTab('studio');
  });

  const handleAcceptContract = guard((contractInstanceId) => {
    const contract = availableContracts.find((c) => c.instanceId === contractInstanceId);
    if (!contract) return;
    const type = getContractType(contract.typeId);
    if (!type) return;
    if (activeContracts.length >= maxContractSlots) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('gamedev_contract_full'), tf('msg_67227', { v0: maxContractSlots }));
      return;
    }
    const availableStaff = getAvailableStaff(business);
    if (availableStaff < type.staffReq) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('staff_not_enough'), tf('msg_54328', { v0: type.name, v1: type.staffReq, v2: staff, v3: staff - availableStaff }));
      return;
    }
    const updated = acceptContract(business, contractInstanceId);
    if (!updated) return;
    onGameDevUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('gamedev_contract_accepted'), tf('msg_42341', { v0: type.name, v1: formatMoney(type.upfront) }), 'warning');
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
    onGameDevUpdate(upgraded, money - upgradeCost);
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
    onGameDevUpdate(paid, money - owed);
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
        <Ionicons name="game-controller" size={14} color={tab === 'create' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_create')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'contracts' && styles.tabActive]} onPress={() => setTab('contracts')}>
        <Ionicons name="briefcase" size={14} color={tab === 'contracts' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'contracts' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_contracts')}</Text>
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

  // ─── Studio tab: overview + released games + in-dev ───
  const renderStudio = () => {
    const gamesIncome = releasedGames.reduce((sum, g) => sum + getGameHourlyIncome(g), 0);
    const contractsIncome = activeContracts.reduce((sum, c) => sum + getContractHourlyIncome(c), 0);
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
              <Text style={styles.incomeBreakdownLabel}>{t('biz_games')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#4ade80' }]}>{formatMoney(gamesIncome)}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('biz_contracts')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#4ade80' }]}>{formatMoney(contractsIncome)}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_staff_salary')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(salaryCost)}</Text>
            </View>
          </View>
          <Text style={styles.overviewSub}>Level {business.level} / 30 · {staff} staff · {releasedGames.length} games</Text>
        </View>

        {/* Released games */}
        <Text style={styles.sectionTitle}>{t('gamedev_released_games')}</Text>
        {releasedGames.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="game-controller-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_no_games')}</Text>
          </View>
        )}
        {releasedGames.map((game) => {
          const gIds = Array.isArray(game.genreIds) ? game.genreIds : (game.genreId ? [game.genreId] : []);
          const pIds = Array.isArray(game.platformIds) ? game.platformIds : (game.platformId ? [game.platformId] : []);
          const genres = gIds.map(getGenre).filter(Boolean);
          const platforms = pIds.map(getPlatform).filter(Boolean);
          const topic = getTopic(game.topicId);
          const size = getGameSize(game.sizeId);
          const audience = getAudience(game.audienceId);
          const gameIncome = getGameHourlyIncome(game);
          const elapsedHr = (Date.now() - game.releasedAt) / (1000 * 60 * 60);
          const bonusHr = game.bonusHours || 0;
          const fatigueMult = game.fatigueMultiplier || 1.0;
          const totalLifespan = (GAME_LIFESPAN_HOURS + bonusHr) * fatigueMult;
          const remainingHr = Math.max(0, totalLifespan - elapsedHr);
          const lifespanPct = Math.max(0, Math.min(100, (remainingHr / totalLifespan) * 100));
          const ratingColor = game.rating >= 8 ? '#4ade80' : game.rating >= 5 ? '#fbbf24' : '#f87171';
          const genreText = genres.map((g) => g.name).join(' / ');
          const platText = platforms.map((p) => p.name).join(' / ');
          const hasFatigue = fatigueMult < 1.0;
          return (
            <Pressable
              key={game.instanceId}
              style={styles.gameCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDetailGame(game);
              }}
            >
              <View style={styles.gameCardHeader}>
                <Text style={styles.gameCardEmoji}>{genres[0]?.emoji || size?.emoji || '🎮'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameCardTitle}>{game.title}</Text>
                  <Text style={styles.gameCardMeta}>{genreText} · {topic?.name} · {platText} · {size?.name}{audience ? ` · ${audience.name}` : ''}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {hasFatigue && (
                    <View style={[styles.ratingBadge, { backgroundColor: '#f8717120', borderColor: '#f8717140' }]}>
                      <Ionicons name="trending-down" size={10} color="#f87171" />
                      <Text style={[styles.ratingText, { color: '#f87171', fontSize: 10 }]}>{Math.round(fatigueMult * 100)}%</Text>
                    </View>
                  )}
                  <View style={[styles.ratingBadge, { backgroundColor: `${ratingColor}20`, borderColor: `${ratingColor}40` }]}>
                    <Text style={[styles.ratingText, { color: ratingColor }]}>{game.rating}/10</Text>
                  </View>
                </View>
              </View>
              <View style={styles.gameCardStats}>
                <View style={styles.gameCardStat}>
                  <Text style={styles.gameCardStatLabel}>{t('fin_income_hr')}</Text>
                  <Text style={[styles.gameCardStatValue, { color: '#4ade80' }]}>{formatMoney(gameIncome)}</Text>
                </View>
                <View style={styles.gameCardStat}>
                  <Text style={styles.gameCardStatLabel}>{t('fin_total_earned')}</Text>
                  <Text style={styles.gameCardStatValue}>{formatMoney(game.income || 0)}</Text>
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
            <Text style={styles.sectionTitle}>IN DEVELOPMENT ({inDevelopment.length}/{maxGameSlots})</Text>
            {inDevelopment.map((game) => {
              const gIds = Array.isArray(game.genreIds) ? game.genreIds : (game.genreId ? [game.genreId] : []);
              const genres = gIds.map(getGenre).filter(Boolean);
              const size = getGameSize(game.sizeId);
              const remaining = getGameDevTimeRemaining(game);
              const total = game.completesAt - game.startedAt;
              const elapsed = total - remaining;
              const pct = Math.min(100, (elapsed / total) * 100);
              const genreText = genres.map((g) => g.name).join(' / ');
              return (
                <View key={game.instanceId} style={styles.devCard}>
                  <View style={styles.devCardTop}>
                    <Text style={styles.devCardEmoji}>{size?.emoji || '🎮'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.devCardTitle}>{game.title}</Text>
                      <Text style={styles.devCardMeta}>{genreText} · {size?.name}</Text>
                    </View>
                    <Text style={styles.devCardTime}>{formatTimeRemaining(remaining)}</Text>
                  </View>
                  <View style={styles.devProgressBar}>
                    <View style={[styles.devProgressFill, { width: `${pct}%` }]} />
                  </View>
                  <Pressable style={styles.devSkipBtn} onPress={() => startWatchAdForDev(game.instanceId)}>
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

  // ─── Staff tab: dedicated staff management ───
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
          <Text style={styles.overviewValue}>{staff}</Text>
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

        {/* See staff members button */}
        <Pressable style={styles.seeStaffBtn} onPress={() => setShowStaffModal(true)}>
          <View style={styles.seeStaffBtnIcon}>
            <Ionicons name="people" size={18} color="#a78bfa" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.seeStaffBtnText}>{t('staff_team_roster')}</Text>
            <Text style={styles.seeStaffBtnSub}>{staff} members · Avg skill {getStaffAvgSkill(business).toFixed(1)}/10</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#475569" />
        </Pressable>

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

  // ─── Create tab: game creation with swipeable cards ───

  // Helper: format dev time for display
  const fmtDevTime = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 10) return `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`;
    return `${Math.floor(hours)}h`;
  };

  // Toggle a multi-select item (genres/platforms)
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
    const slotsFull = inDevelopment.length >= maxGameSlots;
    const canCreate = selectedGenres.length > 0 && selectedTopic && selectedPlatforms.length > 0 && selectedSize && selectedAudience;
    const size = selectedSize ? getGameSize(selectedSize) : null;
    const devMs = selectedSize ? calculateDevTimeMs(selectedSize, selectedGenres, selectedPlatforms) : 0;
    const fatiguePreview = canCreate ? calculateFatigue(business, selectedGenres, selectedTopic, selectedPlatforms, selectedSize, selectedAudience) : null;

    return (
      <View>
        {/* Dev slots bar */}
        <View style={styles.garageBar}>
          <View style={styles.garageBarInfo}>
            <Text style={styles.garageBarLabel}>{t('gamedev_dev_slots')}</Text>
            <Text style={[styles.garageBarCount, slotsFull && { color: '#f87171' }]}>{inDevelopment.length}/{maxGameSlots}</Text>
          </View>
          <View style={styles.garageBarTrack}>
            <View style={[styles.garageBarFill, { width: `${Math.min(100, (inDevelopment.length / maxGameSlots) * 100)}%`, backgroundColor: slotsFull ? '#f87171' : ACCENT }]} />
          </View>
        </View>

        {/* Title + Size - one card, sizes attached to bottom */}
        <View style={styles.createCard}>
          <TextInput
            style={styles.createInput}
            value={gameTitle}
            onChangeText={setGameTitle}
            placeholder={t('gamedev_game_title_placeholder')}
            placeholderTextColor="#475569"
            maxLength={30}
          />
          <View style={styles.createChipRow}>
            {GAME_SIZES.map((s) => {
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

        {/* Platform + Audience - one card */}
        <View style={styles.createCard}>
          <View style={styles.createChipRow}>
            {PLATFORMS.map((p) => {
              const unlocked = isPlatformUnlocked(p, staff);
              const isSelected = selectedPlatforms.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  style={[styles.createChip, isSelected && styles.createChipActive, !unlocked && styles.createChipLocked]}
                  onPress={() => {
                    if (!unlocked) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      notify(tf('courier_locked'), tf('msg_86117', { v0: p.name, v1: p.staffUnlock }));
                      return;
                    }
                    toggleMultiSelect(p.id, selectedPlatforms, setSelectedPlatforms, MAX_PLATFORMS);
                  }}
                >
                  {unlocked ? (
                    <Text style={[styles.createChipText, isSelected && styles.createChipTextActive]} numberOfLines={1}>{p.emoji} {p.name}</Text>
                  ) : (
                    <View style={styles.createChipLockedContent}>
                      <Ionicons name="lock-closed" size={10} color="#64748b" />
                      <Text style={[styles.createChipText, { fontSize: 11 }]} numberOfLines={1}>{p.staffUnlock}</Text>
                      <Ionicons name="people" size={10} color="#475569" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.createChipRow, { marginTop: 8 }]}>
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
                    <Text style={[styles.createChipText, isSelected && styles.createChipTextActive]} numberOfLines={1}>{a.name}</Text>
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
        </View>

        {/* Genre + Topic - side by side compact cycle pills */}
        <View style={styles.dualPillRow}>
          <View style={styles.dualPillCol}>
            <Text style={styles.cyclePillLabel}>{t('gamedev_genre_upper')}</Text>
            <CyclePill
              items={GENRES}
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
              items={TOPICS}
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
              items={GENRES.filter((g) => g.id !== selectedGenres[0])}
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

        {/* Selection summary - only when something is selected */}
        {(selectedGenres.length > 0 || selectedTopic || selectedPlatforms.length > 0 || selectedSize || selectedAudience) && (
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
          {selectedPlatforms.length > 0 && (
            <View style={styles.selectionSummaryRow}>
              <Text style={styles.selectionSummaryLabel}>{t('gamedev_platforms')}</Text>
              <Text style={styles.selectionSummaryText}>
                {selectedPlatforms.map((id) => getPlatform(id)?.name).join('/')}
              </Text>
            </View>
          )}
          {selectedSize && (
            <View style={styles.selectionSummaryRow}>
              <Text style={styles.selectionSummaryLabel}>{t('gamedev_size')}</Text>
              <Text style={styles.selectionSummaryText}>
                {getGameSize(selectedSize)?.emoji} {getGameSize(selectedSize)?.name}
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
          {canCreate && size && (
            <Text style={styles.selectionSummaryMeta}>
              {formatTimeRemaining(devMs)} · {formatMoney(size.cost)} · {size.staffReq} staff
            </Text>
          )}
        </View>
        )}

        {/* Fatigue warning - compact inline */}
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
          onPress={handleCreateGame}
          disabled={!canCreate || slotsFull}
        >
          <Text style={styles.createBtnText}>
            {slotsFull ? t('studio_full') : canCreate ? t('start_development') : t('select_all_options')}
          </Text>
        </Pressable>
      </View>
    );
  };

  // ─── Contracts tab ───
  const renderContracts = () => (
    <View>
        {/* Overview card */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_active_contracts')}</Text>
          <Text style={styles.overviewValue}>{activeContracts.length}/{maxContractSlots}</Text>
          <Text style={styles.overviewSub}>{t('gamedev_passive_income')}</Text>
        </View>

        {/* Active contracts */}
        {activeContracts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('gamedev_active')}</Text>
            {activeContracts.map((c) => {
              const type = getContractType(c.typeId);
              if (!type) return null;
              const elapsedHr = (Date.now() - c.startedAt) / (1000 * 60 * 60);
              const lifespanPct = Math.max(0, Math.min(100, (1 - elapsedHr / CONTRACT_LIFESPAN_HOURS) * 100));
              const remainingHr = Math.max(0, CONTRACT_LIFESPAN_HOURS - elapsedHr);
              return (
                <View key={c.instanceId} style={styles.gameCard}>
                  <View style={styles.gameCardHeader}>
                    <Text style={styles.gameCardEmoji}>{type.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gameCardTitle}>{type.name}</Text>
                      <Text style={styles.gameCardMeta}>{type.desc}</Text>
                    </View>
                  </View>
                  <View style={styles.gameCardStats}>
                    <View style={styles.gameCardStat}>
                      <Text style={styles.gameCardStatLabel}>{t('fin_royalty_hr')}</Text>
                      <Text style={[styles.gameCardStatValue, { color: '#4ade80' }]}>{formatMoney(getContractHourlyIncome(c))}</Text>
                    </View>
                    <View style={styles.gameCardStat}>
                      <Text style={styles.gameCardStatLabel}>{t('fin_earned')}</Text>
                      <Text style={styles.gameCardStatValue}>{formatMoney(c.income || 0)}</Text>
                    </View>
                    <View style={styles.gameCardStat}>
                      <Text style={styles.gameCardStatLabel}>{t('constr_time_left')}</Text>
                      <Text style={styles.gameCardStatValue}>{remainingHr < 1 ? '<1h' : `${Math.ceil(remainingHr)}h`}</Text>
                    </View>
                  </View>
                  <View style={styles.lifespanBar}>
                    <View style={[styles.lifespanFill, { width: `${lifespanPct}%`, backgroundColor: lifespanPct > 30 ? '#4ade80' : '#fbbf24' }]} />
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Available contracts */}
        <Text style={styles.sectionTitle}>{t('gamedev_available')}</Text>
        {availableContracts.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="briefcase-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_no_contracts')}</Text>
          </View>
        )}
        {availableContracts.map((c) => {
          const type = getContractType(c.typeId);
          if (!type) return null;
          const availableStaffNow = getAvailableStaff(business);
          const enoughStaff = availableStaffNow >= type.staffReq;
          const slotsAvailable = activeContracts.length < maxContractSlots;
          const disabled = !enoughStaff || !slotsAvailable;
          return (
            <View key={c.instanceId} style={styles.contractCard}>
              <View style={styles.contractHeader}>
                <Text style={styles.contractEmoji}>{type.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contractName}>{type.name}</Text>
                  <Text style={styles.contractDesc}>{type.desc}</Text>
                </View>
              </View>
              <View style={styles.contractStatsRow}>
                <View style={styles.contractStatItem}>
                  <Text style={styles.contractStatLabel}>{t('fin_upfront')}</Text>
                  <Text style={[styles.contractStatValue, { color: '#4ade80' }]}>{formatMoney(type.upfront)}</Text>
                </View>
                <View style={styles.contractStatDivider} />
                <View style={styles.contractStatItem}>
                  <Text style={styles.contractStatLabel}>{t('fin_royalty_hr')}</Text>
                  <Text style={styles.contractStatValue}>{formatMoney(type.royaltyPerHr)}</Text>
                </View>
                <View style={styles.contractStatDivider} />
                <View style={styles.contractStatItem}>
                  <Text style={styles.contractStatLabel}>{t('fin_duration')}</Text>
                  <Text style={styles.contractStatValue}>{type.duration}h</Text>
                </View>
                <View style={styles.contractStatDivider} />
                <View style={styles.contractStatItem}>
                  <Text style={styles.contractStatLabel}>{t('staff')}</Text>
                  <Text style={[styles.contractStatValue, !enoughStaff && { color: '#f87171' }]}>{type.staffReq}</Text>
                </View>
              </View>
              <Pressable
                style={[styles.acceptBtn, disabled && styles.acceptBtnDisabled]}
                onPress={() => handleAcceptContract(c.instanceId)}
                disabled={disabled}
              >
                <Text style={styles.acceptBtnText}>
                  {!slotsAvailable ? t('slots_full') : !enoughStaff ? tf('need_n_free_staff', { v0: type.staffReq }) : t('accept_contract')}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    );

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
            <Text style={styles.finValue}>{(getBusinessTaxRate({ type: 'gamedev' }) * 100).toFixed(0)}% Entertainment</Text>
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
            <Text style={styles.finLabel}>{t('upg_game_slots')}</Text>
            <Text style={styles.finValue}>{maxGameSlots} max</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('upg_contract_slots')}</Text>
            <Text style={styles.finValue}>{maxContractSlots} max</Text>
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
            <Text style={styles.finLabel}>{t('fin_released_games')}</Text>
            <Text style={styles.finValue}>{releasedGames.length}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_active_contracts')}</Text>
            <Text style={styles.finValue}>{activeContracts.length}</Text>
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
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'studio' && renderStudio()}
        {tab === 'staff' && renderStaff()}
        {tab === 'create' && renderCreate()}
        {tab === 'contracts' && renderContracts()}
        {tab === 'finance' && renderFinances()}
        {tab !== 'create' && <View style={styles.spacer} />}
      </ScrollView>

      {/* Ad overlay */}

      {/* Game detail modal */}
      {detailGame && (() => {
        const gIds = Array.isArray(detailGame.genreIds) ? detailGame.genreIds : (detailGame.genreId ? [detailGame.genreId] : []);
        const pIds = Array.isArray(detailGame.platformIds) ? detailGame.platformIds : (detailGame.platformId ? [detailGame.platformId] : []);
        const genres = gIds.map(getGenre).filter(Boolean);
        const platforms = pIds.map(getPlatform).filter(Boolean);
        const topic = getTopic(detailGame.topicId);
        const size = getGameSize(detailGame.sizeId);
        const audience = getAudience(detailGame.audienceId);
        const gameIncome = getGameHourlyIncome(detailGame);
        const elapsedHr = (Date.now() - detailGame.releasedAt) / (1000 * 60 * 60);
        const bonusHr = detailGame.bonusHours || 0;
        const fatigueMult = detailGame.fatigueMultiplier || 1.0;
        const totalLifespan = (GAME_LIFESPAN_HOURS + bonusHr) * fatigueMult;
        const remainingHr = Math.max(0, totalLifespan - elapsedHr);
        const lifespanPct = Math.max(0, Math.min(100, (remainingHr / totalLifespan) * 100));
        const ratingColor = detailGame.rating >= 8 ? '#4ade80' : detailGame.rating >= 5 ? '#fbbf24' : '#f87171';
        const marketingCount = detailGame.marketingCount || 0;
        const nextBonusHr = Math.max(1, MARKETING_BASE_HOURS - marketingCount);
        const sizeMult = size ? size.incomeMult : 1;
        const marketingCost = Math.floor(MARKETING_BASE_COST * sizeMult * Math.pow(1.5, marketingCount));
        const canMarket = remainingHr > 0 && money >= marketingCost;
        return (
          <View style={styles.detailOverlay}>
            <Pressable style={styles.detailBackdrop} onPress={() => setDetailGame(null)} />
            <View style={styles.detailModal}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailEmoji}>{genres[0]?.emoji || size?.emoji || '🎮'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{detailGame.title}</Text>
                  <Text style={styles.detailStatus}>{detailGame.rating}/10 Rating</Text>
                </View>
                <Pressable onPress={() => setDetailGame(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>

              <ScrollView style={styles.detailBody} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.detailMeta}>
                  {genres.map((g) => g.name).join(' / ')} · {topic?.name} · {platforms.map((p) => p.name).join(' / ')} · {size?.name}{audience ? ` · ${audience.name}` : ''}
                </Text>

                <View style={styles.detailStatsGrid}>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('fin_income_hr')}</Text>
                    <Text style={[styles.detailStatValue, { color: '#4ade80' }]}>{formatMoney(gameIncome)}</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('fin_total_earned')}</Text>
                    <Text style={styles.detailStatValue}>{formatMoney(detailGame.income || 0)}</Text>
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

                {detailGame.ratingBreakdown && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{tf('gamedev_rating_breakdown', { v0: detailGame.rating })}</Text>
                    {[
                      { label: t('gamedev_staff_quality'), value: detailGame.ratingBreakdown.staffScore },
                      { label: t('gamedev_topic_genre'), value: detailGame.ratingBreakdown.topicGenreFit },
                      { label: t('gamedev_platform_fit'), value: detailGame.ratingBreakdown.platformFit },
                      { label: t('gamedev_topic_audience'), value: detailGame.ratingBreakdown.topicAudienceFit },
                      { label: t('gamedev_genre_audience'), value: detailGame.ratingBreakdown.genreAudienceFit },
                      { label: t('gamedev_audience_size'), value: detailGame.ratingBreakdown.audienceSizeFit },
                      { label: t('gamedev_genre_size'), value: detailGame.ratingBreakdown.genreSizeFit },
                      { label: t('gamedev_topic_size'), value: detailGame.ratingBreakdown.topicSizeFit },
                    ].map((row) => {
                      const pct = Math.round(row.value * 100);
                      const color = pct >= 80 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171';
                      return (
                        <View key={row.label} style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>{row.label}</Text>
                          <View style={styles.breakdownBar}>
                            <View style={[styles.breakdownBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                          </View>
                          <Text style={[styles.breakdownValue, { color }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                    <View style={styles.breakdownSummary}>
                      <Text style={styles.breakdownSummaryText}>Level Bonus: +{Math.round(detailGame.ratingBreakdown.levelBonus * 100)}%</Text>
                      {detailGame.ratingBreakdown.multiPenalty > 0 && (
                        <Text style={[styles.breakdownSummaryText, { color: '#f87171' }]}>Multi-Penalty: -{Math.round(detailGame.ratingBreakdown.multiPenalty * 100)}%</Text>
                      )}
                      <Text style={styles.breakdownSummaryText}>Luck: {detailGame.ratingBreakdown.randomFactor >= 1 ? '+' : ''}{Math.round((detailGame.ratingBreakdown.randomFactor - 1) * 100)}%</Text>
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
                    <Text style={styles.detailLifespanText}>Base: {GAME_LIFESPAN_HOURS}h</Text>
                    {bonusHr > 0 && <Text style={[styles.detailLifespanText, { color: '#fbbf24' }]}>+{bonusHr}h marketing</Text>}
                    {detailGame.fatigueMultiplier && detailGame.fatigueMultiplier < 1.0 && (
                      <Text style={[styles.detailLifespanText, { color: '#f87171' }]}>
                        {tf('gamedev_fatigue_effective', { v0: Math.round(detailGame.fatigueMultiplier * (GAME_LIFESPAN_HOURS + bonusHr)) })}
                      </Text>
                    )}
                  </View>
                </View>

                {detailGame.fatigueBreakdown && detailGame.fatigueBreakdown.total > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>FATIGUE (-{Math.round(detailGame.fatigueBreakdown.total * 100)}%)</Text>
                    <Text style={styles.fatigueHint}>{tf('gamedev_fatigue_hint', { v0: FATIGUE_WINDOW_HOURS })}</Text>
                    {[
                      { label: t('gamedev_topic'), value: detailGame.fatigueBreakdown.topic },
                      { label: t('gamedev_genre'), value: detailGame.fatigueBreakdown.genre },
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
                      handleMarketGame(detailGame.instanceId);
                      const updated = (business.games || []).map((g) =>
                        g.instanceId === detailGame.instanceId
                          ? { ...g, bonusHours: (g.bonusHours || 0) + nextBonusHr, marketingCount: marketingCount + 1 }
                          : g
                      );
                      setDetailGame(updated.find((g) => g.instanceId === detailGame.instanceId));
                    }}
                    disabled={!canMarket}
                  >
                    <Ionicons name="megaphone" size={16} color={canMarket ? '#fbbf24' : '#475569'} />
                    <Text style={[styles.marketBtnText, !canMarket && { color: '#475569' }]}>
                      {remainingHr <= 0 ? t('game_expired') : tf('market_for', { v0: formatMoney(marketingCost), v1: nextBonusHr })}
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
        onFire={(m) => { onGameDevUpdate(fireStaff(business, m.id)); }}
        onRaise={(m) => { onGameDevUpdate(raiseStaff(business, m.id)); }}
        onTrain={(m) => { onGameDevUpdate(trainStaff(business, m.id)); }}
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
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(167,139,250,0.1)', alignItems: 'center', justifyContent: 'center' },
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
  // Staff hero card
  staffHeroCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  staffHeroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  staffHeroItem: { alignItems: 'center' },
  staffHeroNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  staffHeroLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  staffHeroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  // Hire
  hirePendingSection: { marginBottom: 16 },
  hirePendingSectionTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  hireProgressCard: { backgroundColor: 'rgba(167,139,250,0.06)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', borderRadius: 14, padding: 14, marginBottom: 8 },
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
  // Game cards
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
  // Game detail modal
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
  breakdownLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', width: 110 },
  breakdownBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: 3 },
  breakdownValue: { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
  breakdownSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  breakdownSummaryText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  fatigueHint: { fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 8 },
  // Fatigue warning (Create tab)
  fatigueWarningInline: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(248,113,113,0.08)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  fatigueWarningInlineText: { fontSize: 11, color: '#f87171', fontWeight: '700' },
  fatigueTag: { backgroundColor: 'rgba(248,113,113,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  fatigueTagText: { fontSize: 10, color: '#f87171', fontWeight: '600' },
  // Staff members modal
  seeStaffBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(167,139,250,0.06)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16 },
  seeStaffBtnIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(167,139,250,0.12)', alignItems: 'center', justifyContent: 'center' },
  seeStaffBtnText: { flex: 1, fontSize: 14, color: '#a78bfa', fontWeight: '700' },
  seeStaffBtnSub: { fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 2 },
  staffRosterSummary: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  staffRosterSummaryItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  staffRosterSummaryValue: { fontSize: 18, color: '#fff', fontWeight: '800' },
  staffRosterSummaryLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  staffCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  staffCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  staffCardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  staffCardName: { fontSize: 14, color: '#fff', fontWeight: '700' },
  staffCardRole: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  staffCardSkillBox: { alignItems: 'center' },
  staffCardSkillValue: { fontSize: 20, fontWeight: '800' },
  staffCardSkillLabel: { fontSize: 8, color: '#64748b', fontWeight: '700', letterSpacing: 0.5 },
  staffCardSkillBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  staffCardSkillFill: { height: '100%', borderRadius: 2 },
  staffCardAssignment: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  staffCardAssignmentEmoji: { fontSize: 16 },
  staffCardAssignmentProject: { fontSize: 12, color: '#fff', fontWeight: '600' },
  staffCardAssignmentDetail: { fontSize: 10, color: '#64748b', fontWeight: '500', marginTop: 1 },
  staffCardBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  staffCardBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  detailMarketingCount: { fontSize: 13, color: '#fff', fontWeight: '600', marginBottom: 10 },
  marketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 10, paddingVertical: 12 },
  marketBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' },
  marketBtnText: { fontSize: 13, fontWeight: '700', color: '#fbbf24' },
  lifespanBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  lifespanFill: { height: '100%', borderRadius: 3 },
  // Dev cards
  devCard: { backgroundColor: 'rgba(167,139,250,0.06)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', borderRadius: 14, padding: 14, marginBottom: 10 },
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
  garageBarHint: { fontSize: 11, color: '#f87171', fontWeight: '600', marginTop: 6 },
  // Overview card (shared by Studio + Staff tabs)
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
  // Create tab - card-based design
  createCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  createInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  createChipRow: { flexDirection: 'row', gap: 6 },
  createChip: { paddingVertical: 12, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', flex: 1, borderRadius: 10 },
  createChipActive: { backgroundColor: 'rgba(167,139,250,0.15)' },
  createChipLocked: { opacity: 0.35 },
  createChipLockedContent: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  createChipText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  createChipTextActive: { color: '#fff', fontWeight: '800' },
  // Cycle pills (genre/topic)
  dualPillRow: { flexDirection: 'row', gap: 10 },
  dualPillCol: { flex: 1 },
  cyclePillWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cycleArrow: { padding: 4 },
  cyclePill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cyclePillActive: { backgroundColor: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.3)' },
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
  // Contracts
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
  // Ad overlay
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
  // Notifications
  notifContainer: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999, elevation: 9999, gap: 8 },
  notif: { backgroundColor: 'rgba(239,68,68,0.95)', borderRadius: 12, padding: 14 },
  notifWarning: { backgroundColor: 'rgba(251,191,36,0.95)' },
  notifTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  notifMsg: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
});
