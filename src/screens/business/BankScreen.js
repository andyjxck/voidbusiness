import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Dimensions, Image } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf } from '../../data/i18n';
import { showRewardedAd } from '../../data/ads';
import Svg, { Circle, Polygon, Rect, Text as SvgText, G } from 'react-native-svg';
import UpgradeProgress from '../../components/UpgradeProgress';
import TeamRosterModal from '../../components/TeamRosterModal';
import { formatMoney } from '../../data/market';
import {
  BANK_ZONES, getBankZone, getUnlockedBankZones,
  getOwnedBranches, getBranchByZone,
  getVaultCapacity, getVaultUpgradeCost, VAULT_MAX_LEVEL, getVaultUpgradeName,
  upgradeVault, getVaultUpgradeTimeRemaining, isVaultUpgrading, completeVaultUpgrades, instantCompleteVaultUpgrade,
  hireStaff, completeHiredStaff, instantHireStaff, STAFF_HIRE_COST, STAFF_SALARY_HOURLY,
  STAFF_HIRE_MIN_MS, STAFF_HIRE_MAX_MS, MAX_HIRING_AT_ONCE,
  getStaffSalaryHourly,
  getStaffMembers, fireStaff, raiseStaff, trainStaff,
  BRANCH_OPEN_MS_MAX, getOpeningTimeRemaining, isBranchOpen,
  getOpeningBranches, completeOpeningBranches, openBranch, instantOpenBranch,
  getBranchDepositors, getBranchDeposits, getBranchLoanRevenue, getBranchDepositCost, getBranchNetIncome,
  getBankHourlyIncome, processBankBusiness, getAllTransactions,
  setDepositRate, setCreditRate,
  MIN_DEPOSIT_RATE, MAX_DEPOSIT_RATE, MIN_CREDIT_RATE, MAX_CREDIT_RATE,
  DEFAULT_DEPOSIT_RATE, DEFAULT_CREDIT_RATE,
  getDistrictCentroid, migrateBank,
} from '../../data/bank';
import { CITY_MAP } from '../../data/bus';
import {
  getUpgradeCost, getUpgradeName, upgradeBusiness, completeUpgradeNow, getTaxOwed, getDailyTax,
  isSuspended, getHoursUntilSuspension, payTax,
  getBusinessTaxRate,
} from '../../data/businesses';

const ACCENT = '#22c55e';

function formatTimeRemaining(ms) {
  if (ms <= 0) return t('time_done');
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function polygonPoints(polyStr) {
  return polyStr.split(' ').map((pt) => pt.split(',').map(Number));
}

function polygonCentroid(polyStr) {
  const pts = polygonPoints(polyStr);
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  return { x: cx / pts.length, y: cy / pts.length };
}

export default function BankScreen({ business, money, boostExpiresAt, onBack, onOpenSettings, onBankUpdate }) {
  useLanguage();
  const [tab, setTab] = useState('branches');
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const [, setTick] = useState(0);
  const [detailBranch, setDetailBranch] = useState(null);
  const [selectedMapPin, setSelectedMapPin] = useState(null);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showTeamRoster, setShowTeamRoster] = useState(false);
  const [isMapTouching, setIsMapTouching] = useState(false);
  // Migrate old saved state on mount
  useEffect(() => {
    if (typeof business.staff !== 'number' || !Array.isArray(business.staffMembers) || !Array.isArray(business.branches)) {
      const migrated = migrateBank(business);
      onBankUpdate(migrated, money);
    }
  }, []);

  // Map state
  const screenW = Dimensions.get('window').width;
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
  const onBankUpdateRef = useRef(onBankUpdate);
  onBankUpdateRef.current = onBankUpdate;

  const notify = (title, message, type) => {
    const id = notifIdRef.current++;
    setNotifications((prev) => [...prev, { id, title, message, type: type || 'success' }].slice(-2));
    later(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 3500);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      const biz = businessRef.current;
      const cash = moneyRef.current;

      const hiring = biz.hiringStaff || [];
      const completedHires = hiring.filter((h) => h.completesAt <= Date.now());
      if (completedHires.length > 0) {
        const updated = completeHiredStaff(biz);
        onBankUpdateRef.current(updated, cash);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('staff_ready'), tf('msg_69094', { v0: completedHires.length, v1: completedHires.length > 1 ? 's' : '' }));
      }

      const opening = getOwnedBranches(biz).filter((b) => !isBranchOpen(b));
      const finishedOpening = opening.filter((b) => b.openingAt <= Date.now());
      if (finishedOpening.length > 0) {
        const updated = completeOpeningBranches(biz);
        onBankUpdateRef.current(updated, cash);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('alert_branch_open'), tf('msg_10685', { v0: finishedOpening.map((b) => b.name).join(', ') }));
      }

      const upgradingBranches = getOwnedBranches(biz).filter((b) => isVaultUpgrading(b));
      const finishedUpgrades = upgradingBranches.filter((b) => b.vaultUpgradeCompletesAt <= Date.now());
      if (finishedUpgrades.length > 0) {
        const updated = completeVaultUpgrades(biz);
        onBankUpdateRef.current(updated, cash);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('bank_vault_upgraded'), tf('msg_81811', { v0: finishedUpgrades.map((b) => b.name).join(', ') }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  const income = getBankHourlyIncome(business);
  const staff = typeof business.staff === 'number' ? business.staff : 0;
  const branches = getOwnedBranches(business);
  const hiringStaff = business.hiringStaff || [];
  const transactions = getAllTransactions(business);
  const suspended = isSuspended(business);
  const branchLoanRevenue = branches.reduce((sum, b) => sum + (isBranchOpen(b) ? getBranchLoanRevenue(b, business) : 0), 0);
  const branchDepositCost = branches.reduce((sum, b) => sum + (isBranchOpen(b) ? getBranchDepositCost(b, business) : 0), 0);
  const staffSalaryCost = getStaffSalaryHourly(business);

  const handleOpenBranch = guard((zoneId) => {
    const zone = getBankZone(zoneId);
    if (!zone) return;
    if (money < zone.openCost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_52817', { v0: zone.name, v1: formatMoney(zone.openCost) }));
      return;
    }
    const result = openBranch(business, zoneId);
    if (result.error) return;
    onBankUpdate(result, money - result.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('alert_branch_purchased'), tf('msg_85683', { v0: zone.name }), 'warning');
    setSelectedMapPin(null);
  });

  const handleUpgradeVault = guard((zoneId) => {
    const branch = getBranchByZone(business, zoneId);
    if (!branch) return;
    if ((branch.vaultLevel || 1) >= VAULT_MAX_LEVEL) return;
    const cost = getVaultUpgradeCost(branch, branch.vaultLevel || 1);
    if (money < cost) {
      notify(tf('alert_insufficient_funds'), tf('msg_99892', { v0: formatMoney(cost) }));
      return;
    }
    const result = upgradeVault(business, zoneId);
    onBankUpdate(result, money - result.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedBranch = (result.branches || []).find((b) => b.zoneId === zoneId);
    if (updatedBranch) setDetailBranch(updatedBranch);
  });

  const handleHireStaff = guard((count) => {
    const cost = count * STAFF_HIRE_COST;
    if (money < cost) return;
    let updated = business;
    for (let i = 0; i < count; i++) {
      const result = hireStaff(updated);
      if (result.error) break;
      updated = result;
    }
    onBankUpdate(updated, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });

  const handleSetDepositRate = (zoneId, rate) => {
    const updated = setDepositRate(business, zoneId, rate);
    onBankUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedBranch = (updated.branches || []).find((b) => b.zoneId === zoneId);
    if (updatedBranch) setDetailBranch(updatedBranch);
  };

  const handleSetCreditRate = (zoneId, rate) => {
    const updated = setCreditRate(business, zoneId, rate);
    onBankUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedBranch = (updated.branches || []).find((b) => b.zoneId === zoneId);
    if (updatedBranch) setDetailBranch(updatedBranch);
  };

  const handleUpgrade = guard(() => {
    const cost = getUpgradeCost(business);
    if (money < cost) return;
    const upgraded = upgradeBusiness(business);
    if (!upgraded) return;
    onBankUpdate(upgraded, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });

  const handlePayTax = guard(() => {
    const owed = getTaxOwed(business);
    if (money < owed) return;
    onBankUpdate(payTax(business), money - owed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  });

  const startWatchAd = (target) => { showRewardedAd(() => finishWatchAd(target)); };

  const finishWatchAd = guard((passedTarget) => {if (!passedTarget) return;
    if (passedTarget.startsWith('hire:')) {
      const hireId = passedTarget.slice(5);
      const updated = instantHireStaff(business, hireId);
      onBankUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('staff_hired'), t('staff_new_instant'));
    } else if (passedTarget.startsWith('opening:')) {
      const zoneId = passedTarget.slice(8);
      const updated = instantOpenBranch(business, zoneId);
      onBankUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const b = getBranchByZone(business, zoneId);
      notify(tf('alert_branch_open_exclaim'), tf('msg_10685', { v0: b?.name }));
    } else if (passedTarget === 'upgrade') {
      const updated = completeUpgradeNow(business);
      onBankUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('upg_complete'), t('upg_business_upgraded'));
    } else if (passedTarget.startsWith('vault:')) {
      const zoneId = passedTarget.slice(6);
      const updated = instantCompleteVaultUpgrade(business, zoneId);
      onBankUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const b = getBranchByZone(business, zoneId);
      notify(tf('bank_vault_upgraded'), tf('msg_41369', { v0: b?.name }));
      const updatedBranch = (updated.branches || []).find((br) => br.zoneId === zoneId);
      if (updatedBranch) setDetailBranch(updatedBranch);
    }
    });
  // ─── Tabs ───
  const renderTabs = () => (
    <View style={styles.tabBar}>
      <Pressable style={[styles.tab, tab === 'branches' && styles.tabActive]} onPress={() => setTab('branches')}>
        <Ionicons name="business" size={14} color={tab === 'branches' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'branches' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_branches')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'map' && styles.tabActive]} onPress={() => setTab('map')}>
        <Ionicons name="map" size={14} color={tab === 'map' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'map' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_map')}</Text>
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

  // ─── Branches tab ───
  const renderBranches = () => {
    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_net_income_hr')}</Text>
          <Text style={[styles.overviewValue, suspended && { color: '#ef4444' }]}>{formatMoney(income)}</Text>
          {suspended && <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>{t('fin_suspended')}</Text>}
          <View style={styles.incomeBreakdown}>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_loan_revenue')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#4ade80' }]}>{formatMoney(branchLoanRevenue)}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_deposit_cost')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(branchDepositCost)}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_staff_salary')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(staffSalaryCost)}</Text>
            </View>
          </View>
          <Text style={styles.overviewSub}>{branches.length} branch{branches.length !== 1 ? 'es' : ''} - {staff} staff - {transactions.length} transactions</Text>
        </View>

        {branches.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_no_branches')}</Text>
          </View>
        )}

        {branches.map((b) => {
          const zone = getBankZone(b.zoneId);
          if (!zone) return null;
          const opening = !isBranchOpen(b);
          if (opening) {
            const openRemaining = getOpeningTimeRemaining(b);
            const openTotal = BRANCH_OPEN_MS_MAX;
            const openPct = Math.min(100, ((openTotal - openRemaining) / openTotal) * 100);
            return (
              <View key={b.zoneId} style={styles.storeItemCard}>
                <View style={styles.storeItemHeader}>
                  <View style={styles.storeItemIconWrap}>
                    <Ionicons name="time" size={20} color="#fbbf24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeItemName}>{b.name}</Text>
                    <Text style={styles.storeItemMeta}>Opening in {formatTimeRemaining(openRemaining)}</Text>
                  </View>
                </View>
                <View style={styles.devProgressBar}>
                  <View style={[styles.devProgressFill, { width: `${openPct}%`, backgroundColor: '#fbbf24' }]} />
                </View>
                <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd(`opening:${b.zoneId}`)}>
                  <Ionicons name="play-circle" size={14} color="#fbbf24" />
                  <Text style={styles.adSkipBtnText}>{t('ad_watch_skip')}</Text>
                </Pressable>
              </View>
            );
          }
          const depositors = getBranchDepositors(b, business);
          const deposits = getBranchDeposits(b, business);
          const cap = getVaultCapacity(b, business);
          const netIncome = getBranchNetIncome(b, business);
          const vaultLvl = b.vaultLevel || 1;
          const capPct = Math.min(100, (deposits / cap) * 100);
          return (
            <Pressable
              key={b.zoneId}
              style={styles.storeItemCard}
              onPress={() => { setDetailBranch(b); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <View style={styles.storeItemHeader}>
                <View style={styles.storeItemIconWrap}>
                  <Ionicons name="business" size={20} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeItemName}>{b.name}</Text>
                  <Text style={styles.storeItemMeta}>{zone.name} - Vault Lvl {vaultLvl}/{VAULT_MAX_LEVEL}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
              </View>
              <View style={styles.storeItemStats}>
                <View style={styles.storeItemStat}>
                  <Text style={styles.storeItemStatLabel}>{t('bank_depositors')}</Text>
                  <Text style={styles.storeItemStatValue}>{depositors.toLocaleString()}</Text>
                </View>
                <View style={styles.storeItemStat}>
                  <Text style={styles.storeItemStatLabel}>{t('bank_deposits')}</Text>
                  <Text style={styles.storeItemStatValue}>{formatMoney(deposits)}</Text>
                </View>
                <View style={styles.storeItemStat}>
                  <Text style={styles.storeItemStatLabel}>{t('bank_net_hr_upper')}</Text>
                  <Text style={[styles.storeItemStatValue, { color: netIncome > 0 ? '#4ade80' : '#f87171' }]}>{formatMoney(netIncome)}</Text>
                </View>
              </View>
              <View style={styles.lotBar}>
                <View style={[styles.lotBarFill, { width: `${capPct}%`, backgroundColor: capPct >= 95 ? '#fbbf24' : '#4ade80' }]} />
              </View>
              {isVaultUpgrading(b) && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: '#fbbf24', fontWeight: '600', marginBottom: 4 }}>
                    Vault upgrading... {formatTimeRemaining(getVaultUpgradeTimeRemaining(b))}
                  </Text>
                  <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd(`vault:${b.zoneId}`)}>
                    <Ionicons name="play-circle" size={14} color="#fbbf24" />
                    <Text style={styles.adSkipBtnText}>{t('ad_watch_skip')}</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  };

  // ─── Map tab ───
  const renderMap = () => {
    const scaledW = CITY_MAP.width * zoom;
    const scaledH = CITY_MAP.height * zoom;
    const unlockedZones = getUnlockedBankZones(business);
    const unlockedIds = new Set(unlockedZones.map((z) => z.id));
    const ownedZoneIds = new Set(branches.map((b) => b.zoneId));

    return (
      <View>
        <Text style={styles.sectionTitle}>{t('map_branch_map')}</Text>

        <View
          style={styles.mapArea}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <View style={{ position: 'absolute', top: panY, left: panX, width: scaledW, height: scaledH }}>
            <Image source={CITY_MAP.image} style={{ width: scaledW, height: scaledH }} resizeMode="stretch" />
            <Svg width={scaledW} height={scaledH} viewBox={`0 0 ${CITY_MAP.width} ${CITY_MAP.height}`} style={{ position: 'absolute', top: 0, left: 0 }}>
              {CITY_MAP.districts.map((d) => {
                const unlocked = unlockedIds.has(d.id);
                const owned = ownedZoneIds.has(d.id);
                const points = polygonPoints(d.polygon).map(([x, y]) => `${x},${y}`).join(' ');
                const labelPos = polygonCentroid(d.polygon);
                return (
                  <G key={d.id}>
                    <Polygon
                      points={points}
                      fill={owned ? 'rgba(34,197,94,0.12)' : unlocked ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.06)'}
                      stroke={owned ? 'rgba(34,197,94,0.4)' : unlocked ? 'rgba(34,197,94,0.3)' : 'rgba(248,113,113,0.2)'}
                      strokeWidth={1}
                    />
                    <SvgText x={labelPos.x} y={labelPos.y} fontSize={12} fontWeight="700" fill={owned ? 'rgba(34,197,94,0.6)' : unlocked ? 'rgba(255,255,255,0.4)' : 'rgba(248,113,113,0.5)'} textAnchor="middle">
                      {d.name}
                    </SvgText>
                  </G>
                );
              })}

              {unlockedZones.filter((z) => !ownedZoneIds.has(z.id)).map((zone) => {
                const centroid = getDistrictCentroid(zone.id);
                if (!centroid) return null;
                const isSelected = selectedMapPin === zone.id;
                const pinColor = ACCENT;
                return (
                  <G key={`avail_${zone.id}`} onPress={() => { setSelectedMapPin(isSelected ? null : zone.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Circle cx={centroid.x} cy={centroid.y + 3} r={isSelected ? 18 : 16} fill="rgba(0,0,0,0.5)" />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 18 : 16} fill={pinColor} stroke="#fff" strokeWidth={2} />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 9 : 8} fill="rgba(15,23,42,0.95)" />
                    <Rect x={centroid.x - 40} y={centroid.y - 32} width={80} height={16} rx={6} fill="rgba(15,23,42,0.95)" />
                    <SvgText x={centroid.x} y={centroid.y - 20} fontSize={10} fontWeight="700" fill="#fbbf24" textAnchor="middle">
                      {zone.openCost === 0 ? 'FREE' : formatMoney(zone.openCost)}
                    </SvgText>
                  </G>
                );
              })}

              {branches.map((b) => {
                const centroid = getDistrictCentroid(b.zoneId);
                if (!centroid) return null;
                const isSelected = selectedMapPin === b.zoneId;
                const depositors = getBranchDepositors(b, business);
                return (
                  <G key={`owned_${b.zoneId}`} onPress={() => { setSelectedMapPin(isSelected ? null : b.zoneId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Circle cx={centroid.x} cy={centroid.y + 3} r={isSelected ? 18 : 16} fill="rgba(0,0,0,0.5)" />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 18 : 16} fill="#4ade80" stroke="#fff" strokeWidth={2} />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 9 : 8} fill="rgba(15,23,42,0.95)" />
                    <Rect x={centroid.x - 35} y={centroid.y - 32} width={70} height={16} rx={6} fill="rgba(15,23,42,0.95)" />
                    <SvgText x={centroid.x} y={centroid.y - 20} fontSize={10} fontWeight="700" fill="#4ade80" textAnchor="middle">
                      {depositors.toLocaleString()} dep.
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>

          {selectedMapPin && (() => {
            const centroid = getDistrictCentroid(selectedMapPin);
            if (!centroid) return null;
            const screenX = panX + centroid.x * zoom;
            const screenY = panY + centroid.y * zoom;
            const isOwned = ownedZoneIds.has(selectedMapPin);
            const zone = getBankZone(selectedMapPin);
            if (!zone) return null;
            const b = getBranchByZone(business, selectedMapPin);
            const levelLocked = staff < (zone.staffUnlock || 0);
            const canAfford = money >= zone.openCost;

            const cardW = 240;
            const cardH = isOwned ? 200 : 220;
            const cardX = Math.max(8, Math.min(mapAreaW - cardW - 8, screenX - cardW / 2));
            const cardY = Math.max(8, Math.min(MAP_VIEW_H - cardH - 8, screenY - cardH - 30));

            return (
              <View style={[styles.pinOverlayCard, { left: cardX, top: cardY, width: cardW }]}>
                <View style={styles.pinOverlayHeader}>
                  <View style={styles.pinOverlayIcon}>
                    <Ionicons name={isOwned ? 'business' : 'add-circle'} size={20} color={isOwned ? '#4ade80' : ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinOverlayName}>{zone.name}</Text>
                    <Text style={styles.pinOverlaySub}>{isOwned ? t('your_branch') : t('available')}</Text>
                  </View>
                  <Pressable hitSlop={12} onPress={() => setSelectedMapPin(null)}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </Pressable>
                </View>
                <View style={styles.pinOverlayStats}>
                  <View style={styles.pinOverlayStat}>
                    <Text style={styles.pinOverlayStatLabel}>{t('map_population')}</Text>
                    <Text style={styles.pinOverlayStatValue}>{zone.population.toLocaleString()}</Text>
                  </View>
                  <View style={styles.pinOverlayStat}>
                    <Text style={styles.pinOverlayStatLabel}>{t('map_wealth')}</Text>
                    <Text style={styles.pinOverlayStatValue}>{zone.wealth.toFixed(1)}x</Text>
                  </View>
                </View>
                {isOwned ? (
                  <>
                    {b && !isBranchOpen(b) ? (
                      <>
                        <View style={styles.pinOverlayCostRow}>
                          <Text style={styles.pinOverlayCostLabel}>{t('map_opening_in')}</Text>
                          <Text style={[styles.pinOverlayCostValue, { color: '#fbbf24' }]}>
                            {formatTimeRemaining(getOpeningTimeRemaining(b))}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.adSkipBtn}
                          onPress={() => startWatchAd(`opening:${b.zoneId}`)}
                        >
                          <Ionicons name="play-circle" size={14} color="#fbbf24" />
                          <Text style={styles.adSkipBtnText}>{t('map_watch_open_now')}</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <View style={styles.pinOverlayStats}>
                          <View style={styles.pinOverlayStat}>
                            <Text style={styles.pinOverlayStatLabel}>{t('bank_depositor_label')}</Text>
                            <Text style={styles.pinOverlayStatValue}>{getBranchDepositors(b, business).toLocaleString()}</Text>
                          </View>
                          <View style={styles.pinOverlayStat}>
                            <Text style={styles.pinOverlayStatLabel}>{t('bank_vault')}</Text>
                            <Text style={styles.pinOverlayStatValue}>Lvl {b.vaultLevel || 1}</Text>
                          </View>
                          <View style={styles.pinOverlayStat}>
                            <Text style={styles.pinOverlayStatLabel}>{t('fin_net_hr')}</Text>
                            <Text style={[styles.pinOverlayStatValue, { color: '#4ade80' }]}>{formatMoney(getBranchNetIncome(b, business))}</Text>
                          </View>
                        </View>
                        <Pressable
                          style={styles.pinOverlayBtn}
                          onPress={() => { setDetailBranch(b); setSelectedMapPin(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                          <Text style={styles.pinOverlayBtnText}>{t('map_view_details')}</Text>
                        </Pressable>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.pinOverlayCostRow}>
                      <Text style={styles.pinOverlayCostLabel}>{t('map_open_cost')}</Text>
                      <Text style={[styles.pinOverlayCostValue, !canAfford && { color: '#f87171' }]}>
                        {zone.openCost === 0 ? t('free') : formatMoney(zone.openCost)}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.pinOverlayBtn, (levelLocked || !canAfford) && styles.pinOverlayBtnDisabled]}
                      onPress={() => handleOpenBranch(selectedMapPin)}
                      disabled={levelLocked || !canAfford}
                    >
                      <Text style={styles.pinOverlayBtnText}>
                        {levelLocked ? tf('need_n_staff', { v0: zone.staffUnlock || 0 }) : canAfford ? tf('buy_for', { v0: formatMoney(zone.openCost) }) : t('insufficient_funds')}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })()}
        </View>

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

  // ─── Staff tab ───
  const renderStaff = () => {
    const hiringSlots = MAX_HIRING_AT_ONCE - hiringStaff.length;
    const salaryCost = getStaffSalaryHourly(business);
    const grossIncome = income + salaryCost;
    const netIncome = income;

    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_team_size')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.overviewValue}>{staff}</Text>
            <Pressable onPress={() => setShowTeamRoster(true)} style={{ padding: 4 }}>
              <Ionicons name="people-circle-outline" size={22} color={ACCENT} />
            </Pressable>
          </View>
          <Text style={styles.overviewSub}>{formatMoney(grossIncome)}/hr gross · {formatMoney(salaryCost)}/hr salary · {formatMoney(netIncome)}/hr net</Text>
        </View>

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
            <Text style={styles.staffGridLabel}>{t('biz_branches')}</Text>
            <Text style={styles.staffGridValue}>{branches.length}</Text>
          </View>
        </View>

        {hiringStaff.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>PENDING HIRES ({hiringStaff.length}/{MAX_HIRING_AT_ONCE})</Text>
            {hiringStaff.map((hire) => {
              const remaining = Math.max(0, hire.completesAt - Date.now());
              const total = hire.completesAt - (hire.hiredAt || (hire.completesAt - STAFF_HIRE_MAX_MS));
              const pct = Math.min(100, ((total - remaining) / total) * 100);
              const m = hire.staffMember;
              const genderIcon = m?.gender === 'female' ? 'woman' : 'man';
              const genderColor = m?.gender === 'female' ? '#ec4899' : '#3b82f6';
              return (
                <View key={hire.instanceId || hire.id} style={styles.hireProgressCard}>
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
                    <View style={[styles.hireProgressBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Pressable style={styles.hireSkipBtn} onPress={() => startWatchAd(`hire:${hire.instanceId || hire.id}`)}>
                    <Ionicons name="play-circle" size={14} color="#fbbf24" />
                    <Text style={styles.hireSkipBtnText}>{t('ad_watch_skip')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>{t('staff_hire')}</Text>
        <View style={styles.hireRow}>
          {[1, 2, 3].map((count) => {
            const cost = count * STAFF_HIRE_COST;
            const affordable = money >= cost;
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
        <Text style={styles.hireHint}>Max {MAX_HIRING_AT_ONCE} at a time. Staff boosts branch capacity & depositor attraction.</Text>
      </View>
    );
  };

  // ─── Finance tab ───
  const renderFinance = () => {
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
    const levelMult = Math.pow(1.12, Math.max(1, business.level || 1) - 1);
    const incomeMultPct = Math.round((levelMult - 1) * 100);
    const nextMultPct = Math.round((Math.pow(1.12, business.level) - 1) * 100);
    const totalDeposits = branches.reduce((sum, b) => sum + (isBranchOpen(b) ? getBranchDeposits(b, business) : 0), 0);
    const totalRevenue = branches.reduce((sum, b) => sum + (isBranchOpen(b) ? getBranchLoanRevenue(b, business) : 0), 0);
    const totalDepositCost = branches.reduce((sum, b) => sum + (isBranchOpen(b) ? getBranchDepositCost(b, business) : 0), 0);
    const totalDepositors = branches.reduce((sum, b) => sum + (isBranchOpen(b) ? getBranchDepositors(b, business) : 0), 0);

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
            <Text style={styles.finValue}>{(getBusinessTaxRate({ type: 'bank' }) * 100).toFixed(0)}% Banking</Text>
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
          {!maxed && (
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>{t('upg_next_level')}</Text>
              <Text style={[styles.finValue, { color: '#94a3b8' }]}>+{nextMultPct}% income</Text>
            </View>
          )}
          <View style={styles.finUpgradeBox}>
            <Text style={styles.finUpgradeName}>{maxed ? t('fully_upgraded') : upgradeName}</Text>
            {upgrading && <UpgradeProgress business={business} onSkip={() => startWatchAd('upgrade')} />}
            {!maxed && !upgrading && (
              <Pressable style={[styles.finUpgradeBtn, !canUpgrade && styles.finUpgradeBtnDisabled]} onPress={handleUpgrade} disabled={!canUpgrade}>
                <Text style={styles.finUpgradeBtnText}>
                  {canUpgrade ? tf('upgrade_for', { v0: formatMoney(upgradeCost) }) : t('insufficient_funds')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('bank_banking_summary')}</Text>
        <View style={styles.finCard}>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_attracted_depositors')}</Text>
            <Text style={styles.finValue}>{totalDepositors.toLocaleString()}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_total_deposits')}</Text>
            <Text style={styles.finValue}>{formatMoney(totalDeposits)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_proceeds_loan_revenue')}</Text>
            <Text style={[styles.finValue, { color: '#4ade80' }]}>{formatMoney(totalRevenue)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_payments_deposit_cost')}</Text>
            <Text style={[styles.finValue, { color: '#f87171' }]}>{formatMoney(totalDepositCost)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_staff_salary_hr')}</Text>
            <Text style={[styles.finValue, { color: '#f87171' }]}>{formatMoney(getStaffSalaryHourly(business))}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('fin_financials')}</Text>
        <View style={styles.finCard}>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_income_hr')}</Text>
            <Text style={[styles.finValue, { color: '#4ade80' }]}>{formatMoney(income)}</Text>
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
            <Text style={styles.finLabel}>{t('biz_branches')}</Text>
            <Text style={styles.finValue}>{branches.length}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('staff')}</Text>
            <Text style={styles.finValue}>{staff} workers</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.finValue, { color: '#f87171' }]}>{formatMoney(getStaffSalaryHourly(business))}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_transactions')}</Text>
            <Pressable style={styles.finCompletedBtn} onPress={() => setShowTransactionsModal(true)}>
              <Text style={styles.finCompletedBtnText}>{transactions.length}  View</Text>
            </Pressable>
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
        {tab === 'branches' && renderBranches()}
        {tab === 'map' && renderMap()}
        {tab === 'staff' && renderStaff()}
        {tab === 'finance' && renderFinance()}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Branch detail modal */}
      {detailBranch && (() => {
        const zone = getBankZone(detailBranch.zoneId);
        if (!zone) return null;
        const branchDepositRate = detailBranch.depositRate || DEFAULT_DEPOSIT_RATE;
        const branchCreditRate = detailBranch.creditRate || DEFAULT_CREDIT_RATE;
        const spread = branchCreditRate - branchDepositRate;
        const depositors = getBranchDepositors(detailBranch, business);
        const deposits = getBranchDeposits(detailBranch, business);
        const cap = getVaultCapacity(detailBranch, business);
        const revenue = getBranchLoanRevenue(detailBranch, business);
        const depositCost = getBranchDepositCost(detailBranch, business);
        const netIncome = getBranchNetIncome(detailBranch, business);
        const vaultLvl = detailBranch.vaultLevel || 1;
        const canUpgradeVault = vaultLvl < VAULT_MAX_LEVEL;
        const vaultUpgradeCost = canUpgradeVault ? getVaultUpgradeCost(detailBranch, vaultLvl) : 0;
        const capPct = Math.min(100, (deposits / cap) * 100);
        return (
          <View style={styles.detailOverlay}>
            <Pressable style={styles.detailBackdrop} onPress={() => setDetailBranch(null)} />
            <View style={styles.detailModal}>
              <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardShouldPersistTaps="always" contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.detailHeader}>
                  <View style={styles.detailEmojiWrap}>
                    <Ionicons name="business" size={24} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{detailBranch.name}</Text>
                    <Text style={styles.detailStatus}>{zone.name} - Vault Lvl {vaultLvl}/{VAULT_MAX_LEVEL}</Text>
                  </View>
                  <Pressable onPress={() => setDetailBranch(null)}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </Pressable>
                </View>

                <View style={styles.detailStatsRow}>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('bank_depositors')}</Text>
                    <Text style={styles.detailStatValue}>{depositors.toLocaleString()}</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('bank_deposits')}</Text>
                    <Text style={styles.detailStatValue}>{formatMoney(deposits)}</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('bank_net_hr_upper')}</Text>
                    <Text style={[styles.detailStatValue, { color: netIncome > 0 ? '#4ade80' : '#f87171' }]}>{formatMoney(netIncome)}</Text>
                  </View>
                </View>

                <Text style={styles.sectionTitleSmall}>DEPOSIT RATE - {branchDepositRate}%</Text>
                <View style={styles.rateSliderRow}>
                  <Pressable
                    style={styles.rateBtn}
                    onPress={() => handleSetDepositRate(detailBranch.zoneId, Math.max(MIN_DEPOSIT_RATE, branchDepositRate - 1))}
                  >
                    <Ionicons name="remove" size={18} color="#fff" />
                  </Pressable>
                  <View style={styles.rateBar}>
                    {Array.from({ length: MAX_DEPOSIT_RATE - MIN_DEPOSIT_RATE + 1 }, (_, i) => i + MIN_DEPOSIT_RATE).map((r) => (
                      <Pressable
                        key={r}
                        style={[styles.rateSegment, r <= branchDepositRate && { backgroundColor: '#38bdf8' }]}
                        onPress={() => handleSetDepositRate(detailBranch.zoneId, r)}
                      />
                    ))}
                  </View>
                  <Pressable
                    style={styles.rateBtn}
                    onPress={() => handleSetDepositRate(detailBranch.zoneId, Math.min(MAX_DEPOSIT_RATE, branchDepositRate + 1))}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </Pressable>
                </View>
                <Text style={styles.rateHint}>{t('bank_higher_rate_depositors')}</Text>

                <Text style={styles.sectionTitleSmall}>CREDIT RATE - {branchCreditRate}%</Text>
                <View style={styles.rateSliderRow}>
                  <Pressable
                    style={styles.rateBtn}
                    onPress={() => handleSetCreditRate(detailBranch.zoneId, Math.max(MIN_CREDIT_RATE, branchCreditRate - 1))}
                  >
                    <Ionicons name="remove" size={18} color="#fff" />
                  </Pressable>
                  <View style={styles.rateBar}>
                    {Array.from({ length: MAX_CREDIT_RATE - MIN_CREDIT_RATE + 1 }, (_, i) => i + MIN_CREDIT_RATE).map((r) => (
                      <Pressable
                        key={r}
                        style={[styles.rateSegment, r <= branchCreditRate && { backgroundColor: '#fbbf24' }]}
                        onPress={() => handleSetCreditRate(detailBranch.zoneId, r)}
                      />
                    ))}
                  </View>
                  <Pressable
                    style={styles.rateBtn}
                    onPress={() => handleSetCreditRate(detailBranch.zoneId, Math.min(MAX_CREDIT_RATE, branchCreditRate + 1))}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </Pressable>
                </View>
                <Text style={styles.rateHint}>{t('bank_higher_rate_profit')}</Text>

                <Text style={styles.sectionTitleSmall}>{t('bank_projection')}</Text>
                <View style={styles.finCard}>
                  <View style={styles.finRow}>
                    <Text style={styles.finLabel}>{t('fin_loan_revenue_hr')}</Text>
                    <Text style={[styles.finValue, { color: '#4ade80' }]}>{formatMoney(revenue)}</Text>
                  </View>
                  <View style={styles.finRow}>
                    <Text style={styles.finLabel}>{t('fin_deposit_cost_hr')}</Text>
                    <Text style={[styles.finValue, { color: '#f87171' }]}>{formatMoney(depositCost)}</Text>
                  </View>
                  <View style={[styles.finRow, { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }]}>
                    <Text style={styles.finLabel}>{t('fin_spread')}</Text>
                    <Text style={[styles.finValue, { color: spread > 0 ? '#4ade80' : '#f87171' }]}>{spread}%</Text>
                  </View>
                  {spread <= 0 && (
                    <Text style={styles.rateWarning}>{t('bank_credit_must_exceed')}</Text>
                  )}
                </View>

                <Text style={styles.sectionTitleSmall}>{t('bank_vault_capacity')}</Text>
                <View style={styles.lotBar}>
                  <View style={[styles.lotBarFill, { width: `${capPct}%`, backgroundColor: capPct >= 95 ? '#fbbf24' : '#4ade80' }]} />
                </View>
                <Text style={styles.lotBarLabel}>{formatMoney(deposits)} / {formatMoney(cap)}</Text>
                {capPct >= 95 && (
                  <Text style={styles.vaultWarning}>{t('bank_vault_near_capacity')}</Text>
                )}

                {canUpgradeVault && !isVaultUpgrading(detailBranch) && (
                  <View style={styles.vaultUpgradeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vaultUpgradeName}>{getVaultUpgradeName(vaultLvl)}</Text>
                      <Text style={styles.vaultUpgradeMeta}>{tf('vault_lvl_progress', { v0: vaultLvl, v1: vaultLvl + 1 })}</Text>
                    </View>
                    <Pressable
                      style={[styles.vaultUpgradeBtn, money < vaultUpgradeCost && styles.vaultUpgradeBtnDisabled]}
                      onPress={() => handleUpgradeVault(detailBranch.zoneId)}
                      disabled={money < vaultUpgradeCost}
                    >
                      <Text style={styles.vaultUpgradeBtnText}>{formatMoney(vaultUpgradeCost)}</Text>
                    </Pressable>
                  </View>
                )}
                {canUpgradeVault && isVaultUpgrading(detailBranch) && (() => {
                  const upgradeRemaining = getVaultUpgradeTimeRemaining(detailBranch);
                  const upgradeTotal = (detailBranch.vaultUpgradeCompletesAt || Date.now()) - (detailBranch.vaultUpgradeCompletesAt || Date.now());
                  return (
                    <View style={styles.vaultUpgradeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vaultUpgradeName}>{getVaultUpgradeName(vaultLvl)}</Text>
                        <Text style={styles.vaultUpgradeMeta}>{t('upgrading_ellipsis')} {formatTimeRemaining(upgradeRemaining)}</Text>
                      </View>
                      <Pressable
                        style={styles.adSkipBtn}
                        onPress={() => startWatchAd(`vault:${detailBranch.zoneId}`)}
                      >
                        <Ionicons name="play-circle" size={14} color="#fbbf24" />
                        <Text style={styles.adSkipBtnText}>{t('ad_skip')}</Text>
                      </Pressable>
                    </View>
                  );
                })()}
                {!canUpgradeVault && (
                  <Text style={styles.vaultMaxed}>{t('bank_vault_fully_upgraded')}</Text>
                )}
              </ScrollView>
            </View>
          </View>
        );
      })()}

      {/* Transactions modal */}
      {showTransactionsModal && (
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={() => setShowTransactionsModal(false)} />
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <View style={styles.detailEmojiWrap}>
                <Ionicons name="document-text" size={24} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{t('bank_transaction_history')}</Text>
                <Text style={styles.detailStatus}>{transactions.length} recent transactions</Text>
              </View>
              <Pressable onPress={() => setShowTransactionsModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>
            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>{t('alert_no_transactions')}</Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {transactions.map((tx, i) => (
                  <View key={i} style={styles.completedSaleCard}>
                    <Ionicons name="business" size={22} color={ACCENT} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.completedSaleName}>{tx.zoneName}</Text>
                      <Text style={styles.completedSaleMeta}>{tx.depositors.toLocaleString()} depositors - {formatMoney(tx.deposits)} deposits</Text>
                    </View>
                    <Text style={[styles.completedSaleMeta, { color: tx.net > 0 ? '#4ade80' : '#f87171', fontWeight: '700' }]}>
                      {formatMoney(tx.net)}/hr
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      <TeamRosterModal
        visible={showTeamRoster}
        onClose={() => setShowTeamRoster(false)}
        staffMembers={getStaffMembers(business)}
        accentColor={ACCENT}
        onFire={(m) => { onBankUpdate(fireStaff(business, m.id)); }}
        onRaise={(m) => { onBankUpdate(raiseStaff(business, m.id)); }}
        onTrain={(m) => { onBankUpdate(trainStaff(business, m.id)); }}
      />

      {/* Ad overlay */}

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
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#fff' },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, marginHorizontal: 16, marginBottom: 14, gap: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: ACCENT },
  tabText: { fontSize: 11, color: '#64748b', fontWeight: '700', flexShrink: 1 },
  tabTextActive: { color: '#000' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 1.5, marginTop: 18, marginBottom: 10 },
  sectionTitleSmall: { fontSize: 11, color: '#64748b', fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  overviewCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  overviewLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  overviewValue: { fontSize: 42, fontWeight: '900', color: '#fff', marginBottom: 6 },
  overviewSub: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  incomeBreakdown: { width: '100%', marginTop: 14, marginBottom: 14, paddingHorizontal: 20 },
  incomeBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  incomeBreakdownLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  incomeBreakdownValue: { fontSize: 13, fontWeight: '700' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  storeItemCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  storeItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  storeItemIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center' },
  storeItemName: { fontSize: 15, color: '#fff', fontWeight: '800' },
  storeItemMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  storeItemStats: { flexDirection: 'row', gap: 20, marginBottom: 8 },
  storeItemStat: { alignItems: 'center' },
  storeItemStatLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  storeItemStatValue: { fontSize: 14, color: '#fff', fontWeight: '700' },
  lotBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  lotBarFill: { height: '100%', borderRadius: 3 },
  lotBarLabel: { fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' },
  devProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  devProgressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  adSkipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
  adSkipBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  // Rate controls
  rateSliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rateBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  rateBar: { flex: 1, flexDirection: 'row', gap: 2, height: 24 },
  rateSegment: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 },
  rateHint: { fontSize: 11, color: '#64748b', marginTop: 6, marginBottom: 4 },
  rateWarning: { fontSize: 12, color: '#f87171', fontWeight: '700', marginTop: 8, textAlign: 'center' },
  // Map
  mapArea: { height: 380, backgroundColor: '#0f172a', borderRadius: 16, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  zoomRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  zoomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 10 },
  zoomBtnLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  pinOverlayCard: { position: 'absolute', backgroundColor: '#1a1d28', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 50 },
  pinOverlayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pinOverlayIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center' },
  pinOverlayName: { fontSize: 14, color: '#fff', fontWeight: '800' },
  pinOverlaySub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  pinOverlayStats: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  pinOverlayStat: { alignItems: 'center' },
  pinOverlayStatLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  pinOverlayStatValue: { fontSize: 12, color: '#fff', fontWeight: '700' },
  pinOverlayCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pinOverlayCostLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  pinOverlayCostValue: { fontSize: 14, color: '#fbbf24', fontWeight: '800' },
  pinOverlayBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  pinOverlayBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.06)' },
  pinOverlayBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },
  // Staff
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  staffGridItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  staffGridLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  staffGridValue: { fontSize: 16, color: '#fff', fontWeight: '700' },
  hireProgressCard: { backgroundColor: 'rgba(34,197,94,0.06)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', borderRadius: 14, padding: 14, marginBottom: 8 },
  hireProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hireProgressInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hireProgressLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  hireProgressName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  hireProgressRole: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  hireProgressTime: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  hireProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  hireProgressBarFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  hireSkipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 8, marginTop: 8 },
  hireSkipBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  hireRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  hireBtn: { flex: 1, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  hireBtnDisabled: { opacity: 0.4 },
  hireBtnCount: { fontSize: 18, fontWeight: '900', color: '#fff' },
  hireBtnCost: { fontSize: 12, color: ACCENT, fontWeight: '700', marginTop: 4 },
  hireBtnTime: { fontSize: 10, color: '#64748b', marginTop: 2 },
  hireHint: { fontSize: 11, color: '#64748b', marginTop: 4 },
  // Finance
  finCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  finCardDanger: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  finLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  finValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  finPayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  finPayBtn: { backgroundColor: ACCENT, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  finPayBtnDisabled: { opacity: 0.4 },
  finPayBtnText: { fontSize: 12, color: '#000', fontWeight: '800' },
  finUpgradeBox: { marginTop: 8 },
  finUpgradeName: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  finUpgradeBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  finUpgradeBtnDisabled: { opacity: 0.4 },
  finUpgradeBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },
  finCompletedBtn: { backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  finCompletedBtnText: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  // Detail modal
  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  detailBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
  detailModal: { width: '90%', maxHeight: '80%', backgroundColor: '#1a1d28', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  detailEmojiWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center' },
  detailName: { fontSize: 18, color: '#fff', fontWeight: '800' },
  detailStatus: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  detailStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  detailStatBox: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingVertical: 10 },
  detailStatLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  detailStatValue: { fontSize: 16, color: '#fff', fontWeight: '800' },
  vaultWarning: { fontSize: 11, color: '#fbbf24', fontWeight: '600', marginTop: 6 },
  vaultUpgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginTop: 10 },
  vaultUpgradeName: { fontSize: 14, color: '#fff', fontWeight: '800' },
  vaultUpgradeMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  vaultUpgradeBtn: { backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  vaultUpgradeBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  vaultUpgradeBtnText: { fontSize: 14, color: '#000', fontWeight: '800' },
  vaultMaxed: { fontSize: 13, color: '#fbbf24', fontWeight: '700', textAlign: 'center', paddingVertical: 12 },
  completedSaleCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  completedSaleName: { fontSize: 13, color: '#fff', fontWeight: '700' },
  completedSaleMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  // Notifications
  notifContainer: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 200, gap: 8 },
  notif: { backgroundColor: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)' },
  notifWarning: { borderColor: 'rgba(251,191,36,0.3)' },
  notifTitle: { fontSize: 13, color: '#fff', fontWeight: '800' },
  notifMsg: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  // Ad overlay
  btnDisabled: { opacity: 0.5 },
  spacer: { height: 40 },
});
