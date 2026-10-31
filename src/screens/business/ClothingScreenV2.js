import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { useContentWidth } from '../../data/layout';
import Text, { useLanguage } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf } from '../../data/i18n';
import { showRewardedAd } from '../../data/ads';
import UpgradeProgress from '../../components/UpgradeProgress';
import TeamRosterModal from '../../components/TeamRosterModal';
import Svg, { Circle, Polygon, Rect, Text as SvgText, G } from 'react-native-svg';
import { formatMoney } from '../../data/market';
import { CITY_MAP } from '../../data/bus';
import {
  CLOTHING_STORES, CLOTHING_STOCK_TYPES, CLOTHING_PRODUCTS, CLOTHING_STAFF_TYPES,
  getClothingStore, getClothingOwnedStores, getClothingStaffMembers, getClothingStaffType, getClothingStaffBranchId,
  getClothingHourlyIncome, getClothingSalesHourly, getClothingStockCostHourly, getClothingLevelMultiplier,
  getClothingSalaryHourly, getClothingRentHourly, getClothingStoreNetIncomeHourly, hydrateClothing,
  hireClothingStaff, completeClothingHires, instantHireClothingStaff,
  fireClothingStaff, raiseClothingStaff, trainClothingStaff,
  openClothingStore, completeClothingOpenings, buyClothingSupplies,
  setClothingMenu, getClothingHireTimeRemaining, getClothingStockType,
  isClothingStoreUnlocked, getUnlockedClothingStores,
  completeClothingSupplies, getClothingSupplyDeliveryTimeRemaining, instantClothingSupply,
  SUPPLY_DELIVERY_MIN_MS, SUPPLY_DELIVERY_MAX_MS,
  STORE_OPEN_MS_MAX, STAFF_HIRE_MIN_MS, STAFF_HIRE_MAX_MS, MAX_HIRE_BATCH,
  getAssignedStaff, assignClothingStaff, unassignClothingStaff,
  canOpenClothingStore, startClothingStoreOpening, instantOpenClothingStore, getOptimalStaffForStore,
  getClothingProduct,
} from '../../data/clothing';
import {
  getUpgradeCost, getUpgradeName, upgradeBusiness, completeUpgradeNow, getTaxOwed, getDailyTax,
  isSuspended, getHoursUntilSuspension, payTax,
  BUSINESS_CATEGORIES,
  getBusinessTaxRate,
} from '../../data/businesses';

const ACCENT = '#ec4899';

const STAFF_HIRE_COST = 15000;
const MAX_HIRING_AT_ONCE = 5;

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

function getDistrictCentroid(districtId) {
  const d = CITY_MAP.districts.find((dist) => dist.id === districtId);
  if (!d) return null;
  const pts = d.polygon.split(' ').map((pt) => pt.split(',').map(Number));
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  return { x: cx / pts.length, y: cy / pts.length };
}

function isStoreOpen(branch) {
  return branch.openedAt && !branch.openingAt;
}

function getOpeningTimeRemaining(branch) {
  if (!branch.openingAt) return 0;
  return Math.max(0, branch.openingAt - Date.now());
}

export default function ClothingScreenV2({ business, money, onBack, onOpenSettings, onClothingUpdate }) {
  useLanguage();
  const [tab, setTab] = useState('store');
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const [, setTick] = useState(0);
  const [detailBranch, setDetailBranch] = useState(null);
  const [showAddStaffPicker, setShowAddStaffPicker] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [showTeamRoster, setShowTeamRoster] = useState(false);
  const [selectedMapPin, setSelectedMapPin] = useState(null);
  const [buySupplyTarget, setBuySupplyTarget] = useState(null);
  const [isMapTouching, setIsMapTouching] = useState(false);
  const screenW = useContentWidth();
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
  const onClothingUpdateRef = useRef(onClothingUpdate);
  onClothingUpdateRef.current = onClothingUpdate;

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

      const hydrated = hydrateClothing(biz);
      if (hydrated !== biz) {
        onClothingUpdateRef.current(hydrated, cash);
      }

      const hiring = biz.hiringStaff || [];
      const completedHires = hiring.filter((h) => h.completesAt <= Date.now());
      if (completedHires.length > 0) {
        const updated = completeClothingHires(biz);
        onClothingUpdateRef.current(updated, cash);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('staff_ready'), tf('msg_69094', { v0: completedHires.length, v1: completedHires.length > 1 ? 's' : '' }));
      }

      const opening = getClothingOwnedStores(biz).filter((b) => !isStoreOpen(b));
      const finishedOpening = opening.filter((b) => b.openingAt && b.openingAt <= Date.now());
      if (finishedOpening.length > 0) {
        const updated = completeClothingOpenings(biz);
        onClothingUpdateRef.current(updated, cash);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('alert_store_open'), tf('msg_10685', { v0: finishedOpening.map((b) => getClothingStore(b.branchId)?.name).join(', ') }));
      }

      const arrivedSupplies = (biz.pendingSupplies || []).filter((d) => d.deliveredAt <= Date.now());
      if (arrivedSupplies.length > 0) {
        const updated = completeClothingSupplies(biz);
        onClothingUpdateRef.current(updated, cash);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('clothing_stock_delivered'), tf('msg_06454', { v0: arrivedSupplies.length, v1: arrivedSupplies.length > 1 ? 's' : '' }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  const clothing = hydrateClothing(business);
  const branches = getClothingOwnedStores(clothing);
  const staffMembers = getClothingStaffMembers(clothing);
  const staff = staffMembers.length;
  const hiringStaff = clothing.hiringStaff || [];
  const gross = getClothingSalesHourly(clothing);
  const stockCost = getClothingStockCostHourly(clothing);
  const payroll = getClothingSalaryHourly(clothing);
  const rent = getClothingRentHourly(clothing);
  const income = getClothingHourlyIncome(clothing);
  const suspended = isSuspended(clothing);
  const salaryTotal = payroll + rent;
  const netIncome = income;

  const handleOpenStore = guard((storeId) => {
    const zone = getClothingStore(storeId);
    if (!zone) return;
    if (money < zone.openCost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_22408', { v0: zone.name, v1: formatMoney(zone.openCost) }));
      return;
    }
    const result = openClothingStore(clothing, storeId);
    if (result.error) {
      if (result.error === 'locked') {
        const required = getClothingStore(zone.requiresStore);
        notify(t('clothing_store_locked'), required ? tf('open_store_in_first', { v0: required.name }) : t('unlock_requirement_not_met'));
      }
      return;
    }
    onClothingUpdate(result, money - zone.openCost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('alert_store_purchased'), tf('msg_32167', { v0: zone.name }));
    setSelectedMapPin(null);
  });

  const handleStartOpening = guard((storeId) => {
    const check = canOpenClothingStore(clothing, storeId);
    if (!check.canOpen) {
      if (check.reason === 'no_staff') notify(t('alert_cannot_open'), t('staff_assign_store_first'), 'warning');
      else if (check.reason === 'no_supplies') notify(t('alert_cannot_open'), t('alert_buy_stock_first'), 'warning');
      else notify(t('alert_cannot_open'), t('alert_requirements_not_met'), 'warning');
      return;
    }
    const updated = startClothingStoreOpening(clothing, storeId);
    if (updated.error) return;
    onClothingUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('alert_store_opening'), tf('msg_97745', { v0: getClothingStore(storeId)?.name }), 'warning');
  });

  // Clear the picker's multi-selection whenever the detail target changes.
  useEffect(() => { setSelectedStaffIds([]); }, [detailBranch]);

  const toggleStaffSelect = (staffId) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAssignSelected = (storeId) => {
    if (selectedStaffIds.length === 0) return;
    let updated = clothing;
    for (const id of selectedStaffIds) updated = assignClothingStaff(updated, storeId, id);
    onClothingUpdate(updated, money);
    setSelectedStaffIds([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleUnassignStaff = (storeId, staffId) => {
    const updated = unassignClothingStaff(clothing, storeId, staffId);
    onClothingUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBuySupplies = guard((stockTypeId, quantity) => {
    const result = buyClothingSupplies(clothing, stockTypeId, quantity);
    if (!result) return;
    if (money < result.cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_80523', { v0: formatMoney(result.cost) }));
      return;
    }
    const instant = (result.business.pendingSupplies || []).some((d) => d.deliveredAt <= Date.now());
    onClothingUpdate(instant ? completeClothingSupplies(result.business) : result.business, money - result.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const stockType = getClothingStockType(stockTypeId);
    if (instant) {
      notify(tf('clothing_stock_delivered'), tf('msg_33669', { v0: quantity, v1: stockType?.name }));
    } else {
      notify(tf('clothing_stock_ordered'), tf('msg_15672', { v0: quantity, v1: stockType?.name, v2: Math.round(SUPPLY_DELIVERY_MIN_MS / 1000), v3: Math.round(SUPPLY_DELIVERY_MAX_MS / 1000) }), 'warning');
    }
    setBuySupplyTarget(null);
  });

  const handleHireStaff = guard((count) => {
    const cost = count * STAFF_HIRE_COST;
    if (money < cost) return;
    const result = hireClothingStaff(clothing, 'sales', count);
    if (result.error) {
      if (result.error === 'type_hiring') {
        notify(t('staff_hiring_in_progress'), t('alert_wait_batch'), 'warning');
      }
      return;
    }
    onClothingUpdate(completeClothingHires(result), money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });

  const handleToggleProduct = (storeId, productId) => {
    const branch = getClothingOwnedStores(clothing).find((b) => b.branchId === storeId);
    if (!branch) return;
    const current = branch.menuIds || [];
    const newMenuIds = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    if (newMenuIds.length === 0) return;
    const updated = setClothingMenu(clothing, storeId, newMenuIds);
    onClothingUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedBranch = getClothingOwnedStores(updated).find((b) => b.branchId === storeId);
    if (updatedBranch) setDetailBranch(updatedBranch);
  };

  const handleUpgrade = guard(() => {
    const cost = getUpgradeCost(business);
    if (money < cost) return;
    const upgraded = upgradeBusiness(business);
    if (!upgraded) return;
    onClothingUpdate(upgraded, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });

  const handlePayTax = guard(() => {
    const owed = getTaxOwed(clothing);
    if (money < owed) return;
    onClothingUpdate(payTax(clothing), money - owed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  });

  const startWatchAd = (target) => { showRewardedAd(() => finishWatchAd(target)); };

  const finishWatchAd = guard((passedTarget) => {if (!passedTarget) return;
    if (passedTarget.startsWith('hire:')) {
      const hireId = passedTarget.slice(5);
      const updated = instantHireClothingStaff(clothing, hireId);
      onClothingUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('staff_hired'), t('staff_new_instant'));
    } else if (passedTarget.startsWith('opening:')) {
      const storeId = passedTarget.slice(8);
      const branch = getClothingOwnedStores(clothing).find((b) => b.branchId === storeId);
      if (branch && branch.openingAt) {
        const updated = instantOpenClothingStore(clothing, storeId);
        onClothingUpdate(updated, money);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const zone = getClothingStore(storeId);
        notify(tf('alert_store_open_exclaim'), tf('msg_10685', { v0: zone?.name }));
      }
    } else if (passedTarget.startsWith('supply:')) {
      const deliveryId = passedTarget.slice(7);
      const updated = instantClothingSupply(clothing, deliveryId);
      onClothingUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('clothing_stock_delivered'), t('cafe_order_arrived_instant'));
    } else if (passedTarget === 'upgrade') {
      const updated = completeUpgradeNow(business);
      onClothingUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('upg_complete'), t('upg_business_upgraded'));
    }
    });
  const renderTabs = () => (
    <View style={styles.tabBar}>
      <Pressable style={[styles.tab, tab === 'store' && styles.tabActive]} onPress={() => setTab('store')}>
        <Ionicons name="shirt" size={14} color={tab === 'store' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'store' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_store')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'stock' && styles.tabActive]} onPress={() => setTab('stock')}>
        <Ionicons name="cube" size={14} color={tab === 'stock' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'stock' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('detail_stock')}</Text>
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

  const renderStore = () => {
    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_net_income_hr')}</Text>
          <Text style={[styles.overviewValue, (income < 0 || suspended) && { color: '#ef4444' }]}>{formatMoney(income)}</Text>
          {suspended && <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>{t('fin_suspended')}</Text>}
          <View style={styles.incomeBreakdown}>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_sales')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#4ade80' }]}>{formatMoney(gross)}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_stock_cost')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(stockCost)}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_staff_salary')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(payroll)}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_rent')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(rent)}</Text>
            </View>
          </View>
          <Text style={styles.overviewSub}>{branches.length} store{branches.length !== 1 ? 's' : ''} - {staff} staff - Level {clothing.level}</Text>
        </View>

        {(clothing.pendingSupplies || []).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('clothing_pending_deliveries')}</Text>
            {clothing.pendingSupplies.map((delivery) => {
              const remaining = getClothingSupplyDeliveryTimeRemaining(delivery);
              const stockType = getClothingStockType(delivery.stockTypeId);
              return (
                <View key={delivery.id} style={styles.deliveryCard}>
                  <Text style={styles.deliveryEmoji}>{stockType?.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deliveryText}>{delivery.quantity}x {stockType?.name}</Text>
                    <Text style={styles.deliveryTime}>{formatTimeRemaining(remaining)}</Text>
                  </View>
                  <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd(`supply:${delivery.id}`)}>
                    <Ionicons name="play-circle" size={14} color="#fbbf24" />
                    <Text style={styles.adSkipBtnText}>{t('ad_skip')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {branches.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="shirt-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_no_stores')}</Text>
          </View>
        )}

        {branches.length > 0 && (
          <Text style={styles.sectionTitle}>YOUR STORES ({branches.length})</Text>
        )}

        {branches.map((b) => {
          const zone = getClothingStore(b.branchId);
          if (!zone) return null;
          const isOpen = isStoreOpen(b);
          const isOpening = !!b.openingAt;
          const isSetup = !isOpen && !isOpening;
          const menuCount = (b.menuIds || []).length;
          const assignedStaff = getAssignedStaff(clothing, b.branchId);
          const optimalStaff = getOptimalStaffForStore(b.branchId);
          const canOpen = canOpenClothingStore(clothing, b.branchId);
          if (isSetup) {
            return (
              <Pressable
                key={b.branchId}
                style={styles.storeItemCard}
                onPress={() => { setDetailBranch(b); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <View style={styles.storeItemHeader}>
                  <View style={styles.storeItemIconWrap}>
                    <Ionicons name="settings" size={20} color="#fbbf24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeItemName}>{tf('store_branch_name', { v0: zone.name })}</Text>
                    <Text style={styles.storeItemMeta}>Needs Setup - {assignedStaff.length}/{optimalStaff} staff assigned</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                </View>
                <View style={styles.storeItemStats}>
                  <View style={styles.storeItemStat}>
                    <Text style={styles.storeItemStatLabel}>{t('staff_section')}</Text>
                    <Text style={styles.storeItemStatValue}>{assignedStaff.length}/{optimalStaff}</Text>
                  </View>
                  <View style={styles.storeItemStat}>
                    <Text style={styles.storeItemStatLabel}>{t('map_capacity')}</Text>
                    <Text style={styles.storeItemStatValue}>{zone.capacity}</Text>
                  </View>
                  <View style={styles.storeItemStat}>
                    <Text style={styles.storeItemStatLabel}>{t('map_status')}</Text>
                    <Text style={[styles.storeItemStatValue, { color: canOpen.canOpen ? '#4ade80' : '#fbbf24' }]}>
                      {canOpen.canOpen ? t('pin_ready') : t('pin_setup')}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }
          if (isOpening) {
            const openRemaining = getOpeningTimeRemaining(b);
            const openTotal = STORE_OPEN_MS_MAX;
            const openPct = Math.min(100, ((openTotal - openRemaining) / openTotal) * 100);
            return (
              <View key={b.branchId} style={styles.storeItemCard}>
                <View style={styles.storeItemHeader}>
                  <View style={styles.storeItemIconWrap}>
                    <Ionicons name="time" size={20} color="#fbbf24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeItemName}>{tf('store_branch_name', { v0: zone.name })}</Text>
                    <Text style={styles.storeItemMeta}>Opening in {formatTimeRemaining(openRemaining)}</Text>
                  </View>
                </View>
                <View style={styles.devProgressBar}>
                  <View style={[styles.devProgressFill, { width: `${openPct}%`, backgroundColor: '#fbbf24' }]} />
                </View>
                <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd(`opening:${b.branchId}`)}>
                  <Ionicons name="play-circle" size={14} color="#fbbf24" />
                  <Text style={styles.adSkipBtnText}>{t('ad_watch_skip')}</Text>
                </Pressable>
              </View>
            );
          }
          const branchNetIncome = getClothingStoreNetIncomeHourly(clothing, b.branchId);
          return (
            <Pressable
              key={b.branchId}
              style={styles.storeItemCard}
              onPress={() => { setDetailBranch(b); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <View style={styles.storeItemHeader}>
                <View style={styles.storeItemIconWrap}>
                  <Ionicons name="shirt" size={20} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeItemName}>{tf('store_branch_name', { v0: zone.name })}</Text>
                  <Text style={styles.storeItemMeta}>{zone.name}</Text>
                </View>
                <Text style={[styles.storeItemNetIncome, { color: branchNetIncome >= 0 ? '#4ade80' : '#f87171' }]}>
                  {branchNetIncome >= 0 ? '+' : ''}{formatMoney(Math.floor(branchNetIncome))}/hr
                </Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
              </View>
              <View style={styles.storeItemStats}>
                <View style={styles.storeItemStat}>
                  <Text style={styles.storeItemStatLabel}>{t('clothing_products_upper')}</Text>
                  <Text style={styles.storeItemStatValue}>{menuCount}</Text>
                </View>
                <View style={styles.storeItemStat}>
                  <Text style={styles.storeItemStatLabel}>{t('map_capacity')}</Text>
                  <Text style={styles.storeItemStatValue}>{zone.capacity}</Text>
                </View>
                <View style={styles.storeItemStat}>
                  <Text style={styles.storeItemStatLabel}>{t('map_footfall_upper')}</Text>
                  <Text style={styles.storeItemStatValue}>{zone.footfall}x</Text>
                </View>
              </View>
              <View style={styles.lotBar}>
                <View style={[styles.lotBarFill, { width: `${Math.min(100, (menuCount / CLOTHING_PRODUCTS.length) * 100)}%`, backgroundColor: '#4ade80' }]} />
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.sectionTitle}>{t('clothing_stock_levels')}</Text>
        <View style={styles.staffGrid}>
          {CLOTHING_STOCK_TYPES.map((item) => (
            <View key={item.id} style={styles.staffGridItem}>
              <Text style={styles.staffGridLabel}>{item.emoji} {item.name}</Text>
              <Text style={styles.staffGridValue}>{Math.floor(clothing.supplies?.[item.id] || 0)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStock = () => {
    return (
      <View>
        {branches.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_open_store_first')}</Text>
          </View>
        )}

        {branches.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('clothing_stock_supplies')}</Text>
            {CLOTHING_STOCK_TYPES.map((item, itemIdx) => {
              const inStock = Math.floor(clothing.supplies?.[item.id] || 0);
              return (
                <View key={item.id} style={styles.productCard}>
                  <View style={[styles.productImage, { backgroundColor: `${ACCENT}10` }]}>
                    <Text style={styles.productEmoji}>{item.emoji}</Text>
                  </View>
                  <View style={styles.productBody}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <View style={styles.productStats}>
                      <View style={styles.productStat}>
                        <Text style={styles.productStatLabel}>{t('cafe_in_stock')}</Text>
                        <Text style={styles.productStatValue}>{inStock}</Text>
                      </View>
                      <View style={styles.productStat}>
                        <Text style={styles.productStatLabel}>{t('detail_unit_cost')}</Text>
                        <Text style={styles.productStatValue}>{formatMoney(item.unitCost)}</Text>
                      </View>
                    </View>
                    <View style={styles.hireRow}>
                      {[20, 50, 100].map((qty) => {
                        const cost = item.unitCost * qty;
                        const affordable = money >= cost;
                        return (
                          <Pressable
                            key={qty}
                            style={[styles.hireBtn, !affordable && styles.hireBtnDisabled]}
                            onPress={() => handleBuySupplies(item.id, qty)}
                            disabled={!affordable}
                          >
                            <Text style={styles.hireBtnCount}>+{qty}</Text>
                            <Text style={styles.hireBtnCost}>{formatMoney(cost)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  };

  const renderMap = () => {
    const scaledW = CITY_MAP.width * zoom;
    const scaledH = CITY_MAP.height * zoom;
    const unlockedStores = getUnlockedClothingStores(clothing);
    const unlockedIds = new Set(unlockedStores.map((b) => b.id));
    const ownedZoneIds = new Set(branches.map((b) => b.branchId));

    return (
      <View>
        <Text style={styles.sectionTitle}>{t('map_store_map')}</Text>

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
                const zone = getClothingStore(d.id);
                const owned = ownedZoneIds.has(d.id);
                const unlocked = zone ? unlockedIds.has(d.id) : false;
                const points = polygonPoints(d.polygon).map(([x, y]) => `${x},${y}`).join(' ');
                const labelPos = polygonCentroid(d.polygon);
                return (
                  <G key={d.id}>
                    <Polygon
                      points={points}
                      fill={owned ? 'rgba(236,72,153,0.12)' : unlocked ? 'rgba(236,72,153,0.08)' : 'rgba(248,113,113,0.06)'}
                      stroke={owned ? 'rgba(236,72,153,0.4)' : unlocked ? 'rgba(236,72,153,0.3)' : 'rgba(248,113,113,0.2)'}
                      strokeWidth={1}
                    />
                    <SvgText x={labelPos.x} y={labelPos.y} fontSize={12} fontWeight="700" fill={owned ? 'rgba(236,72,153,0.6)' : unlocked ? 'rgba(255,255,255,0.4)' : 'rgba(248,113,113,0.5)'} textAnchor="middle">
                      {d.name}
                    </SvgText>
                  </G>
                );
              })}

              {CLOTHING_STORES.filter((zone) => !ownedZoneIds.has(zone.id)).map((zone) => {
                const centroid = getDistrictCentroid(zone.id);
                if (!centroid) return null;
                const isSelected = selectedMapPin === zone.id;
                const unlocked = isClothingStoreUnlocked(clothing, zone.id);
                const pinColor = unlocked ? ACCENT : '#f87171';
                return (
                  <G key={`avail_${zone.id}`} onPress={() => { setSelectedMapPin(isSelected ? null : zone.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Circle cx={centroid.x} cy={centroid.y + 3} r={isSelected ? 18 : 16} fill="rgba(0,0,0,0.5)" />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 18 : 16} fill={pinColor} stroke="#fff" strokeWidth={2} />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 9 : 8} fill="rgba(15,23,42,0.95)" />
                    <Rect x={centroid.x - 40} y={centroid.y - 32} width={80} height={16} rx={6} fill="rgba(15,23,42,0.95)" />
                    <SvgText x={centroid.x} y={centroid.y - 20} fontSize={10} fontWeight="700" fill={unlocked ? '#fbbf24' : '#f87171'} textAnchor="middle">
                      {unlocked ? (zone.openCost === 0 ? 'FREE' : formatMoney(zone.openCost)) : 'LOCKED'}
                    </SvgText>
                  </G>
                );
              })}

              {branches.map((b) => {
                const centroid = getDistrictCentroid(b.branchId);
                if (!centroid) return null;
                const isSelected = selectedMapPin === b.branchId;
                const menuCount = (b.menuIds || []).length;
                const isOpen = isStoreOpen(b);
                const isOpening = !!b.openingAt;
                const isSetup = !isOpen && !isOpening;
                const pinColor = isSetup ? '#f97316' : isOpening ? '#fbbf24' : '#4ade80';
                const pinLabel = isSetup ? t('pin_setup') : isOpening ? t('pin_opening') : tf('pin_n_items', { v0: menuCount });
                return (
                  <G key={`owned_${b.branchId}`} onPress={() => { setSelectedMapPin(isSelected ? null : b.branchId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Circle cx={centroid.x} cy={centroid.y + 3} r={isSelected ? 18 : 16} fill="rgba(0,0,0,0.5)" />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 18 : 16} fill={pinColor} stroke="#fff" strokeWidth={2} />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 9 : 8} fill="rgba(15,23,42,0.95)" />
                    <Rect x={centroid.x - 30} y={centroid.y - 32} width={60} height={16} rx={6} fill="rgba(15,23,42,0.95)" />
                    <SvgText x={centroid.x} y={centroid.y - 20} fontSize={10} fontWeight="700" fill={pinColor} textAnchor="middle">
                      {pinLabel}
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
            const zone = getClothingStore(selectedMapPin);
            if (!zone) return null;
            const b = branches.find((br) => br.branchId === selectedMapPin);
            const canAfford = money >= zone.openCost;
            const unlocked = isClothingStoreUnlocked(clothing, selectedMapPin);
            const requiredStore = zone.requiresStore ? getClothingStore(zone.requiresStore) : null;

            const cardW = 240;
            const cardH = isOwned ? 200 : 220;
            const cardX = Math.max(8, Math.min(mapAreaW - cardW - 8, screenX - cardW / 2));
            const cardY = Math.max(8, Math.min(MAP_VIEW_H - cardH - 8, screenY - cardH - 30));

            return (
              <View style={[styles.pinOverlayCard, { left: cardX, top: cardY, width: cardW }]}>
                <View style={styles.pinOverlayHeader}>
                  <View style={styles.pinOverlayIcon}>
                    <Ionicons name={isOwned ? 'shirt' : 'add-circle'} size={20} color={isOwned ? '#4ade80' : ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinOverlayName}>{zone.name}</Text>
                    <Text style={styles.pinOverlaySub}>{isOwned ? t('your_store') : unlocked ? t('available') : requiredStore ? tf('requires_x', { v0: requiredStore.name }) : t('locked')}</Text>
                  </View>
                  <Pressable hitSlop={12} onPress={() => setSelectedMapPin(null)}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </Pressable>
                </View>
                <View style={styles.pinOverlayStats}>
                  <View style={styles.pinOverlayStat}>
                    <Text style={styles.pinOverlayStatLabel}>{t('capacity')}</Text>
                    <Text style={styles.pinOverlayStatValue}>{zone.capacity}</Text>
                  </View>
                  <View style={styles.pinOverlayStat}>
                    <Text style={styles.pinOverlayStatLabel}>{t('map_footfall')}</Text>
                    <Text style={styles.pinOverlayStatValue}>{zone.footfall}x</Text>
                  </View>
                  <View style={styles.pinOverlayStat}>
                    <Text style={styles.pinOverlayStatLabel}>{t('fin_rent_hr')}</Text>
                    <Text style={styles.pinOverlayStatValue}>{formatMoney(zone.rentHourly)}</Text>
                  </View>
                </View>
                {isOwned ? (
                  <>
                    {b && b.openingAt ? (
                      <>
                        <View style={styles.pinOverlayCostRow}>
                          <Text style={styles.pinOverlayCostLabel}>{t('map_opening_in')}</Text>
                          <Text style={[styles.pinOverlayCostValue, { color: '#fbbf24' }]}>
                            {formatTimeRemaining(getOpeningTimeRemaining(b))}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.adSkipBtn}
                          onPress={() => startWatchAd(`opening:${b.branchId}`)}
                        >
                          <Ionicons name="play-circle" size={14} color="#fbbf24" />
                          <Text style={styles.adSkipBtnText}>{t('map_watch_open_now')}</Text>
                        </Pressable>
                      </>
                    ) : b && !b.openedAt ? (
                      <>
                        <View style={styles.pinOverlayCostRow}>
                          <Text style={styles.pinOverlayCostLabel}>{t('status')}</Text>
                          <Text style={[styles.pinOverlayCostValue, { color: '#fbbf24' }]}>{t('cafe_needs_setup')}</Text>
                        </View>
                        <Pressable
                          style={styles.pinOverlayBtn}
                          onPress={() => { setDetailBranch(b); setSelectedMapPin(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                          <Text style={styles.pinOverlayBtnText}>{t('staff_assign_open')}</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <View style={styles.pinOverlayStats}>
                          <View style={styles.pinOverlayStat}>
                            <Text style={styles.pinOverlayStatLabel}>{t('clothing_products')}</Text>
                            <Text style={styles.pinOverlayStatValue}>{(b?.menuIds || []).length}</Text>
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
                      style={[styles.pinOverlayBtn, (!canAfford || !unlocked) && styles.pinOverlayBtnDisabled]}
                      onPress={() => handleOpenStore(selectedMapPin)}
                      disabled={!canAfford || !unlocked}
                    >
                      <Text style={styles.pinOverlayBtnText}>
                        {!unlocked ? (requiredStore ? tf('requires_x', { v0: requiredStore.name }) : t('locked')) : canAfford ? tf('buy_for', { v0: formatMoney(zone.openCost) }) : t('insufficient_funds')}
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

  const renderStaff = () => {
    const hiringSlots = MAX_HIRING_AT_ONCE - hiringStaff.length;
    const netIncome = income;
    const sub = business.subType;
    const maxLevel = sub ? (BUSINESS_CATEGORIES?.clothing?.subTypes?.[sub]?.maxLevel || 30) : 30;

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
          <Text style={styles.overviewSub}>{formatMoney(gross)}/hr income - {formatMoney(payroll)}/hr salary</Text>
        </View>

        <View style={styles.staffGrid}>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_income_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#4ade80' }]}>{formatMoney(gross)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_stock_cost_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#f87171' }]}>{formatMoney(stockCost)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#f87171' }]}>{formatMoney(payroll)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_rent_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#f87171' }]}>{formatMoney(rent)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_net_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: netIncome >= 0 ? '#4ade80' : '#f87171' }]}>{formatMoney(netIncome)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_per_staff')}</Text>
            <Text style={styles.staffGridValue}>{staff > 0 ? formatMoney(Math.floor(gross / staff)) : '-'}</Text>
          </View>
        </View>

        {hiringStaff.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>PENDING HIRES ({hiringStaff.length}/{MAX_HIRING_AT_ONCE})</Text>
            {hiringStaff.map((hire) => {
              const remaining = Math.max(0, hire.completesAt - Date.now());
              const total = STAFF_HIRE_MAX_MS;
              const pct = Math.min(100, ((total - remaining) / total) * 100);
              return (
                <View key={hire.id} style={styles.hireProgressCard}>
                  <View style={styles.hireProgressTop}>
                    <View style={styles.hireProgressInfo}>
                      <Ionicons name="person" size={16} color={ACCENT} />
                      <Text style={styles.hireProgressLabel}>{t('staff_new_hire')}</Text>
                    </View>
                    <Text style={styles.hireProgressTime}>{formatTimeRemaining(remaining)}</Text>
                  </View>
                  <View style={styles.hireProgressBar}>
                    <View style={[styles.hireProgressBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Pressable style={styles.hireSkipBtn} onPress={() => startWatchAd(`hire:${hire.id}`)}>
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
        <Text style={styles.hireHint}>Max {MAX_HIRING_AT_ONCE} at a time. Staff boost store capacity.</Text>
      </View>
    );
  };

  const renderFinances = () => {
    const owed = getTaxOwed(clothing);
    const dailyTax = getDailyTax(clothing);
    const suspended = isSuspended(clothing);
    const hoursLeft = getHoursUntilSuspension(clothing);
    const daysLeft = Math.floor(hoursLeft / 24);
    const remHours = Math.floor(hoursLeft % 24);
    const upgradeCost = getUpgradeCost(business);
    const upgradeName = getUpgradeName(business);
    const sub = business.subType;
    const maxLevel = sub ? (BUSINESS_CATEGORIES?.clothing?.subTypes?.[sub]?.maxLevel || 30) : 30;
    const maxed = business.level >= maxLevel;
    const upgrading = business.upgradeCompletesAt && business.upgradeCompletesAt > Date.now();
    const canUpgrade = !maxed && money >= upgradeCost && !upgrading;
    const levelMult = getClothingLevelMultiplier(business);
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
            <Text style={styles.finValue}>{(getBusinessTaxRate({ type: 'clothing' }) * 100).toFixed(0)}% Income</Text>
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
            <Text style={styles.finValue}>{business.level} / {maxLevel}</Text>
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
            <Text style={styles.finLabel}>{t('biz_stores')}</Text>
            <Text style={styles.finValue}>{branches.length}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('staff')}</Text>
            <Text style={styles.finValue}>{staff} workers</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.finValue, { color: '#f87171' }]}>{formatMoney(payroll)}</Text>
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
        <Text style={styles.headerTitle}>{clothing.name}</Text>
        <Pressable style={{ width: 40, alignItems: 'center' }} onPress={onOpenSettings}>
          <Ionicons name="settings" size={20} color={ACCENT} />
        </Pressable>
      </View>
      {renderTabs()}
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={!isMapTouching}>
        {tab === 'store' && renderStore()}
        {tab === 'stock' && renderStock()}
        {tab === 'map' && renderMap()}
        {tab === 'staff' && renderStaff()}
        {tab === 'finance' && renderFinances()}
        <View style={styles.spacer} />
      </ScrollView>

      {detailBranch && (() => {
        const b = detailBranch;
        const zone = getClothingStore(b.branchId);
        if (!zone) return null;
        const menuCount = (b.menuIds || []).length;
        const isOpening = !!b.openingAt;
        const isOpen = !!b.openedAt;
        const assignedStaff = getAssignedStaff(clothing, b.branchId);
        // Staff already working at any store are hidden from the picker.
        const unassignedStaff = getClothingStaffMembers(clothing).filter((s) => !getClothingStaffBranchId(clothing, s.id));
        const optimalStaff = getOptimalStaffForStore(b.branchId);
        const canOpen = canOpenClothingStore(clothing, b.branchId);
        return (
          <View style={styles.detailOverlay}>
            <Pressable style={styles.detailBackdrop} onPress={() => { setDetailBranch(null); setShowAddStaffPicker(false); }} />
            <View style={styles.detailModal}>
              <View style={styles.detailHeader}>
                <View style={styles.detailEmojiWrap}>
                  <Ionicons name={isOpen ? 'shirt' : isOpening ? 'time' : 'settings'} size={24} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{tf('store_branch_name', { v0: zone.name })}</Text>
                  <Text style={styles.detailStatus}>{isOpen ? t('status_operational') : isOpening ? t('status_opening') : t('status_needs_setup')}</Text>
                </View>
                <Pressable onPress={() => { setDetailBranch(null); setShowAddStaffPicker(false); }}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>
              <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} showsVerticalScrollIndicator={false}>

              <View style={styles.detailStatsRow}>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatLabel}>{t('clothing_products_upper')}</Text>
                  <Text style={styles.detailStatValue}>{menuCount}</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatLabel}>{t('map_capacity')}</Text>
                  <Text style={styles.detailStatValue}>{zone.capacity}</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatLabel}>{t('map_footfall_upper')}</Text>
                  <Text style={styles.detailStatValue}>{zone.footfall}x</Text>
                </View>
              </View>

              {(isOpen || isOpening) && (() => {
                const staffEfficiency = Math.min(1, assignedStaff.length / optimalStaff);
                return (
                  <View style={styles.efficiencyBar}>
                    <View style={styles.efficiencyBarHeader}>
                      <Text style={styles.efficiencyBarLabel}>{t('staff_efficiency')}</Text>
                      <Text style={[styles.efficiencyBarValue, { color: staffEfficiency >= 1 ? '#4ade80' : staffEfficiency >= 0.5 ? '#fbbf24' : '#f87171' }]}>
                        {Math.round(staffEfficiency * 100)}% ({assignedStaff.length}/{optimalStaff} staff)
                      </Text>
                    </View>
                    <View style={styles.devProgressBar}>
                      <View style={[styles.devProgressFill, { width: `${staffEfficiency * 100}%`, backgroundColor: staffEfficiency >= 1 ? '#4ade80' : staffEfficiency >= 0.5 ? '#fbbf24' : '#f87171' }]} />
                    </View>
                    {staffEfficiency < 1 && (
                      <Text style={styles.efficiencyBarHint}>Sales are reduced to {Math.round(staffEfficiency * 100)}% until fully staffed.</Text>
                    )}
                  </View>
                );
              })()}

              {!isOpen && !isOpening && (
                <>
                  <Text style={styles.sectionTitleSmall}>{t('staff_assign')}</Text>
                  {assignedStaff.length > 0 && (
                    <View style={styles.staffAssignList}>
                      {assignedStaff.map((s) => {
                        const type = getClothingStaffType(s.typeId);
                        return (
                          <View key={s.id} style={styles.staffAssignCard}>
                            <Text style={styles.staffAssignEmoji}>{type?.emoji}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.staffAssignName}>{s.name}</Text>
                              <Text style={styles.staffAssignRole}>{
              (() => {
                const otherBranchId = getClothingStaffBranchId(clothing, s.id);
                const otherBranch = otherBranchId ? getClothingStore(otherBranchId) : null;
                return `${type?.name} - Rating ${s.rating}${otherBranch && otherBranchId !== b.branchId ? ` · at ${otherBranch.name}` : ''}`;
              })()
            }</Text>
                            </View>
                            <Pressable style={styles.staffUnassignBtn} onPress={() => handleUnassignStaff(b.branchId, s.id)}>
                              <Ionicons name="remove-circle" size={18} color="#f87171" />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  {unassignedStaff.length > 0 && (
                    <View style={styles.staffAssignList}>
                      {unassignedStaff.map((s) => {
                        const type = getClothingStaffType(s.typeId);
                        const selected = selectedStaffIds.includes(s.id);
                        return (
                          <Pressable
                            key={s.id}
                            style={[styles.staffAssignCard, selected && styles.staffAssignCardSelected]}
                            onPress={() => toggleStaffSelect(s.id)}
                          >
                            <Text style={styles.staffAssignEmoji}>{type?.emoji}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.staffAssignName}>{s.name}</Text>
                              <Text style={styles.staffAssignRole}>{`${type?.name} - Rating ${s.rating}`}</Text>
                            </View>
                            <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? '#4ade80' : ACCENT} />
                          </Pressable>
                        );
                      })}
                      {selectedStaffIds.length > 0 && (
                        <Pressable style={styles.assignSelectedBtn} onPress={() => handleAssignSelected(b.branchId)}>
                          <Text style={styles.assignSelectedBtnText}>{t('staff_assign')} ({selectedStaffIds.length})</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  {assignedStaff.length === 0 && unassignedStaff.length === 0 && (
                    <Text style={styles.hireHint}>{t('staff_no_available')}</Text>
                  )}

                  <Pressable
                    style={[styles.pinOverlayBtn, !canOpen.canOpen && styles.pinOverlayBtnDisabled]}
                    onPress={() => handleStartOpening(b.branchId)}
                    disabled={!canOpen.canOpen}
                  >
                    <Text style={styles.pinOverlayBtnText}>
                      {canOpen.canOpen ? t('open_store_range') :
                       canOpen.reason === 'no_staff' ? t('assign_staff_first') :
                       canOpen.reason === 'no_supplies' ? t('buy_stock_first') : t('requirements_not_met')}
                    </Text>
                  </Pressable>
                </>
              )}

              {isOpening && (
                <View style={styles.staffAssignCard}>
                  <Ionicons name="time" size={20} color="#fbbf24" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffAssignName}>Opening in {formatTimeRemaining(getOpeningTimeRemaining(b))}</Text>
                    <Text style={styles.staffAssignRole}>{t('alert_store_operational')}</Text>
                  </View>
                  <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd(`opening:${b.branchId}`)}>
                    <Ionicons name="play-circle" size={14} color="#fbbf24" />
                    <Text style={styles.adSkipBtnText}>{t('ad_skip')}</Text>
                  </Pressable>
                </View>
              )}

              {isOpen && (
                <>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitleSmall}>{t('staff_assigned')}</Text>
                    {unassignedStaff.length > 0 && (
                      <Pressable style={styles.sectionHeaderBtn} onPress={() => setShowAddStaffPicker((v) => !v)}>
                        <Ionicons name={showAddStaffPicker ? 'chevron-up' : 'add'} size={14} color={ACCENT} />
                        <Text style={styles.sectionHeaderBtnText}>{showAddStaffPicker ? t('close') : t('add_staff')}</Text>
                      </Pressable>
                    )}
                  </View>
                  {showAddStaffPicker && unassignedStaff.length > 0 && (
                    <View style={styles.staffAssignList}>
                      {unassignedStaff.map((s) => {
                        const type = getClothingStaffType(s.typeId);
                        const selected = selectedStaffIds.includes(s.id);
                        return (
                          <Pressable
                            key={s.id}
                            style={[styles.staffAssignCard, selected && styles.staffAssignCardSelected]}
                            onPress={() => toggleStaffSelect(s.id)}
                          >
                            <Text style={styles.staffAssignEmoji}>{type?.emoji}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.staffAssignName}>{s.name}</Text>
                              <Text style={styles.staffAssignRole}>{`${type?.name} - Rating ${s.rating}`}</Text>
                            </View>
                            <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? '#4ade80' : ACCENT} />
                          </Pressable>
                        );
                      })}
                      {selectedStaffIds.length > 0 && (
                        <Pressable
                          style={styles.assignSelectedBtn}
                          onPress={() => { handleAssignSelected(b.branchId); setShowAddStaffPicker(false); }}
                        >
                          <Text style={styles.assignSelectedBtnText}>{t('staff_assign')} ({selectedStaffIds.length})</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  <View style={styles.staffAssignList}>
                    {assignedStaff.map((s) => {
                      const type = getClothingStaffType(s.typeId);
                      return (
                        <View key={s.id} style={styles.staffAssignCard}>
                          <Text style={styles.staffAssignEmoji}>{type?.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.staffAssignName}>{s.name}</Text>
                            <Text style={styles.staffAssignRole}>{
              (() => {
                const otherBranchId = getClothingStaffBranchId(clothing, s.id);
                const otherBranch = otherBranchId ? getClothingStore(otherBranchId) : null;
                return `${type?.name} - Rating ${s.rating}${otherBranch && otherBranchId !== b.branchId ? ` · at ${otherBranch.name}` : ''}`;
              })()
            }</Text>
                          </View>
                          <Pressable style={styles.staffUnassignBtn} onPress={() => handleUnassignStaff(b.branchId, s.id)}>
                            <Ionicons name="remove-circle" size={18} color="#f87171" />
                          </Pressable>
                        </View>
                      );
                    })}
                    {assignedStaff.length === 0 && (
                      <Text style={styles.hireHint}>{t('staff_no_assigned')}</Text>
                    )}
                  </View>

                  <Text style={styles.sectionTitleSmall}>{t('clothing_products_upper')}</Text>
                  {(() => {
                    const staffEfficiency = Math.min(1, assignedStaff.length / optimalStaff);
                    return CLOTHING_PRODUCTS.map((item) => {
                      const enabled = (b.menuIds || []).includes(item.id);
                      const effectiveDemand = item.demand * zone.footfall * staffEfficiency;
                      const effectiveRevenue = effectiveDemand * item.price;
                      return (
                        <Pressable
                          key={item.id}
                          style={[styles.productItemCard, enabled && { borderColor: 'rgba(236,72,153,0.3)', backgroundColor: 'rgba(236,72,153,0.06)' }]}
                          onPress={() => handleToggleProduct(b.branchId, item.id)}
                        >
                          <View style={styles.productItemTop}>
                            <Text style={styles.productItemEmoji}>{item.emoji}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.productItemName}>{item.name}</Text>
                              <Text style={styles.productItemMeta}>
                                {formatMoney(item.price)} x {item.demand}/hr max
                              </Text>
                              {enabled && (
                                <Text style={[styles.productItemMeta, { color: ACCENT }]}>
                                  {formatMoney(effectiveRevenue)}/hr at {Math.round(staffEfficiency * 100)}% staffing
                                </Text>
                              )}
                            </View>
                            <Ionicons name={enabled ? 'checkmark-circle' : 'add-circle-outline'} size={23} color={enabled ? ACCENT : '#64748b'} />
                          </View>
                        </Pressable>
                      );
                    });
                  })()}
                </>
              )}
              </ScrollView>
            </View>
          </View>
        );
      })()}

      <TeamRosterModal
        visible={showTeamRoster}
        onClose={() => setShowTeamRoster(false)}
        staffMembers={staffMembers}
        accentColor={ACCENT}
        getStaffTypeLabel={(m) => getClothingStaffType(m.typeId)?.name}
        onFire={(m) => { onClothingUpdate(fireClothingStaff(clothing, m.id)); }}
        onRaise={(m) => { onClothingUpdate(raiseClothingStaff(clothing, m.id)); }}
        onTrain={(m) => { onClothingUpdate(trainClothingStaff(clothing, m.id)); }}
      />


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
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(236,72,153,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#fff' },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, marginHorizontal: 16, marginBottom: 14, gap: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: ACCENT },
  tabText: { fontSize: 11, color: '#64748b', fontWeight: '700', flexShrink: 1 },
  tabTextActive: { color: '#000' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 1.5, marginTop: 18, marginBottom: 10 },
  sectionTitleSmall: { fontSize: 11, color: '#64748b', fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  sectionHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(236,72,153,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  sectionHeaderBtnText: { fontSize: 11, fontWeight: '700', color: ACCENT },
  efficiencyBar: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginTop: 4, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  efficiencyBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  efficiencyBarLabel: { fontSize: 11, color: '#64748b', fontWeight: '800', letterSpacing: 1 },
  efficiencyBarValue: { fontSize: 12, fontWeight: '800' },
  efficiencyBarHint: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
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
  storeItemIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(236,72,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  storeItemName: { fontSize: 15, color: '#fff', fontWeight: '800' },
  storeItemMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  storeItemNetIncome: { fontSize: 13, fontWeight: '800' },
  storeItemStats: { flexDirection: 'row', gap: 20, marginBottom: 8 },
  storeItemStat: { alignItems: 'center' },
  storeItemStatLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  storeItemStatValue: { fontSize: 14, color: '#fff', fontWeight: '700' },
  lotBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  lotBarFill: { height: '100%', borderRadius: 3 },
  productCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 22, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  productImage: { height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productEmoji: { fontSize: 56 },
  productBody: { padding: 16 },
  productName: { fontSize: 18, color: '#fff', fontWeight: '800', marginBottom: 4 },
  productStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  productStat: { alignItems: 'center' },
  productStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  productStatValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  mapArea: { height: 380, backgroundColor: '#0f172a', borderRadius: 16, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  zoomRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  zoomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 10 },
  zoomBtnLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  pinOverlayCard: { position: 'absolute', backgroundColor: '#1a1d28', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 50 },
  pinOverlayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pinOverlayIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(236,72,153,0.12)', alignItems: 'center', justifyContent: 'center' },
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
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  staffGridItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  staffGridLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  staffGridValue: { fontSize: 16, color: '#fff', fontWeight: '700' },
  hireProgressCard: { backgroundColor: 'rgba(236,72,153,0.06)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.15)', borderRadius: 14, padding: 14, marginBottom: 8 },
  hireProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hireProgressInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hireProgressLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  hireProgressTime: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  hireProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  hireProgressBarFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  hireSkipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 8, marginTop: 8 },
  hireSkipBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  adSkipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
  adSkipBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  hireRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  hireBtn: { flex: 1, backgroundColor: 'rgba(236,72,153,0.1)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(236,72,153,0.2)' },
  hireBtnDisabled: { opacity: 0.4 },
  hireBtnCount: { fontSize: 18, fontWeight: '900', color: '#fff' },
  hireBtnCost: { fontSize: 12, color: ACCENT, fontWeight: '700', marginTop: 4 },
  hireBtnTime: { fontSize: 10, color: '#64748b', marginTop: 2 },
  hireHint: { fontSize: 11, color: '#64748b', marginTop: 4 },
  deliveryCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  deliveryEmoji: { fontSize: 20 },
  deliveryText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  deliveryTime: { fontSize: 12, color: '#fbbf24', fontWeight: '700' },
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
  productItemCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  productItemTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  productItemEmoji: { fontSize: 24 },
  productItemName: { fontSize: 14, color: '#fff', fontWeight: '700' },
  productItemMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  devProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  devProgressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  detailBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
  detailModal: { width: '90%', maxHeight: '80%', backgroundColor: '#1a1d28', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  detailEmojiWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(236,72,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  detailName: { fontSize: 18, color: '#fff', fontWeight: '800' },
  detailStatus: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  detailStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  detailStatBox: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingVertical: 10 },
  detailStatLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  detailStatValue: { fontSize: 16, color: '#fff', fontWeight: '800' },
  notifContainer: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 200, gap: 8 },
  notif: { backgroundColor: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)' },
  notifWarning: { borderColor: 'rgba(251,191,36,0.3)' },
  notifTitle: { fontSize: 13, color: '#fff', fontWeight: '800' },
  notifMsg: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  btnDisabled: { opacity: 0.5 },
  staffAssignList: { marginBottom: 10 },
  staffAssignCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  staffAssignCardSelected: { borderColor: 'rgba(74,222,128,0.5)', backgroundColor: 'rgba(74,222,128,0.08)' },
  assignSelectedBtn: { marginTop: 2, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(236,72,153,0.15)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.4)', alignItems: 'center' },
  assignSelectedBtnText: { color: ACCENT, fontSize: 13, fontWeight: '800' },
  staffAssignEmoji: { fontSize: 18 },
  staffAssignName: { fontSize: 13, color: '#fff', fontWeight: '700' },
  staffAssignRole: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  staffUnassignBtn: { padding: 4 },
  spacer: { height: 40 },
});
