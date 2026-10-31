import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import Svg, { G, Polygon, Text as SvgText, Circle, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf } from '../../data/i18n';
import { showRewardedAd } from '../../data/ads';
import UpgradeProgress from '../../components/UpgradeProgress';
import TeamRosterModal from '../../components/TeamRosterModal';
import { formatMoney } from '../../data/market';
import {
  VEHICLE_TYPES,
  DEALERSHIP_ZONES,
  getVehicleType,
  getDealershipZone,
  getUnlockedZones,
  getOwnedDealerships,
  getDealershipByZone,
  hasBusLicense,
  canBuyBusLicense,
  buyBusLicense,
  BUS_LICENSE_COST,
  STAFF_HIRE_COST,
  STAFF_SALARY_HOURLY,
  STAFF_HIRE_MIN_MS,
  STAFF_HIRE_MAX_MS,
  MAX_HIRING_AT_ONCE,
  getMaxLotCapacity,
  hireStaff,
  completeHiredStaff,
  instantHireStaff,
  getDeliveryTimeRemaining,
  getArrivedDeliveries,
  processDeliveries,
  instantDelivery,
  buyVehicle,
  openDealership,
  instantOpenDealership,
  getOpeningTimeRemaining,
  isDealershipOpen,
  completeOpeningDealerships,
  DEALERSHIP_OPEN_MS_MAX,
  instantSellVehicle,
  upgradeVehicle,
  sellVehicle,
  VEHICLE_MAX_UPGRADES,
  VEHICLE_UPGRADE_NAMES,
  getUpgradedRetail,
  getVehicleUpgradeCost,
  getDealershipHourlyIncome,
  getDealershipProfitHourly,
  getDealershipBranchProfitHourly,
  getDealershipPendingSales,
  getStaffSalaryHourly,
  getAllCompletedSales,
  getPendingForZone,
  getDistrictCentroid,
  CITY_MAP,
  getStaffMembers, fireStaff, raiseStaff, trainStaff,
} from '../../data/dealership';
import { DEALERSHIP_IMAGES } from '../../data/dealership_images';
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

const ACCENT = '#f97316';

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

export default function DealershipScreen({ business, money, boostExpiresAt, onBack, onOpenSettings, onDealershipUpdate, ownedBusinesses }) {
  useLanguage();
  const [tab, setTab] = useState('dealerships');
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const [, setTick] = useState(0);
  const [detailDealership, setDetailDealership] = useState(null);
  const [selectedMapPin, setSelectedMapPin] = useState(null);
  const [buyVehicleType, setBuyVehicleType] = useState(null);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showTeamRoster, setShowTeamRoster] = useState(false);
  const [isMapTouching, setIsMapTouching] = useState(false);
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
  const onDealershipUpdateRef = useRef(onDealershipUpdate);
  onDealershipUpdateRef.current = onDealershipUpdate;

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

      const arrived = getArrivedDeliveries(biz);
      if (arrived.length > 0) {
        const updated = processDeliveries(biz);
        onDealershipUpdateRef.current(updated, cash);
        const names = arrived.map((d) => d.name).filter(Boolean);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('constr_delivery_arrived'), tf('msg_18921', { v0: names.join(', ') }));
      }

      const hiring = biz.hiringStaff || [];
      const completedHires = hiring.filter((h) => h.completesAt <= Date.now());
      if (completedHires.length > 0) {
        const updated = completeHiredStaff(biz);
        onDealershipUpdateRef.current(updated, cash);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('staff_ready'), tf('msg_54515', { v0: completedHires.length, v1: completedHires.length > 1 ? 's' : '' }));
      }

      const opening = getOwnedDealerships(biz).filter((dp) => !isDealershipOpen(dp));
      const finishedOpening = opening.filter((dp) => dp.openingAt <= Date.now());
      if (finishedOpening.length > 0) {
        const updated = completeOpeningDealerships(biz);
        onDealershipUpdateRef.current(updated, cash);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('alert_dealership_open'), tf('msg_10685', { v0: finishedOpening.map((dp) => dp.name).join(', ') }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  const income = getDealershipHourlyIncome(business);
  const suspended = isSuspended(business);
  const pendingSales = getDealershipPendingSales(business);
  const vehicleProfit = getDealershipProfitHourly(business);
  const staffSalaryCost = getStaffSalaryHourly(business);
  const staffMembers = useMemo(() => getStaffMembers(business), [business]);
  const staff = staffMembers.length;
  const dealerships = useMemo(() => getOwnedDealerships(business), [business]);
  const hiringStaff = business.hiringStaff || [];
  const completedSales = useMemo(() => getAllCompletedSales(business), [business]);
  const busLicense = hasBusLicense(business);

  const handleOpenDealership = guard((zoneId) => {
    const zone = getDealershipZone(zoneId);
    if (!zone) return;
    if (money < zone.openCost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_23446', { v0: zone.name, v1: formatMoney(zone.openCost) }));
      return;
    }
    const result = openDealership(business, zoneId);
    if (result.error) return;
    onDealershipUpdate(result, money - result.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('alert_dealership_purchased'), tf('msg_41670', { v0: zone.name }), 'warning');
    setSelectedMapPin(null);
  });

  const handleBuyBusLicense = guard(() => {
    if (money < BUS_LICENSE_COST) {
      notify(tf('alert_insufficient_funds'), tf('msg_03535', { v0: formatMoney(BUS_LICENSE_COST) }));
      return;
    }
    const updated = buyBusLicense(business);
    onDealershipUpdate(updated, money - BUS_LICENSE_COST);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(t('dealer_license_acquired'), t('dealer_can_buy_buses'));
  });

  const handleBuyVehicle = guard((typeId, zoneId) => {
    const result = buyVehicle(business, typeId, zoneId);
    if (result.error) {
      if (result.error === 'lot_full') {
        notify(tf('dealer_lot_full'), tf('msg_35075', { v0: result.capacity }));
      } else if (result.error === 'no_license') {
        notify(t('dealer_no_license'), t('dealer_buy_license_first'));
      } else if (result.error === 'still_opening') {
        notify(t('dealer_still_opening'), t('dealer_not_open_yet'));
      } else {
        notify(t('dealer_cannot_buy'), result.error);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    onDealershipUpdate(result, money - result.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const type = getVehicleType(typeId);
    notify(tf('dealer_order_placed'), tf('msg_05212', { v0: type?.name }), 'warning');
    setBuyVehicleType(null);
  });

  const handleHireStaff = guard((count) => {
    let updated = business;
    let queued = 0;
    for (let i = 0; i < count; i++) {
      const result = hireStaff(updated);
      if (result.error) break;
      updated = result;
      queued++;
    }
    if (queued === 0) return;
    const cost = queued * STAFF_HIRE_COST;
    onDealershipUpdate(updated, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });

  const handleUpgradeVehicle = guard((zoneId, vehicleId) => {
    const dp = getDealershipByZone(business, zoneId);
    const vehicle = (dp?.inventory || []).find((v) => v.instanceId === vehicleId);
    if (!vehicle) return;
    if ((vehicle.upgrades || 0) >= VEHICLE_MAX_UPGRADES) return;
    const cost = getVehicleUpgradeCost(vehicle, vehicle.upgrades || 0);
    if (money < cost) {
      notify(tf('alert_insufficient_funds'), tf('msg_96705', { v0: formatMoney(cost) }));
      return;
    }
    const result = upgradeVehicle(business, zoneId, vehicleId);
    onDealershipUpdate(result, money - result.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedDp = (result.dealerships || []).find((d) => d.zoneId === zoneId);
    if (updatedDp) setDetailDealership(updatedDp);
  });

  const handleSellVehicle = guard((zoneId, vehicleId) => {
    const updated = sellVehicle(business, zoneId, vehicleId);
    onDealershipUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updatedDp = (updated.dealerships || []).find((d) => d.zoneId === zoneId);
    if (updatedDp) setDetailDealership(updatedDp);
  });

  const handleUpgrade = guard(() => {
    const cost = getUpgradeCost(business);
    if (money < cost) return;
    const upgraded = upgradeBusiness(business);
    if (!upgraded) return;
    onDealershipUpdate(upgraded, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });

  const handlePayTax = guard(() => {
    const owed = getTaxOwed(business);
    if (money < owed) return;
    onDealershipUpdate(payTax(business), money - owed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  });

  const startWatchAd = (target) => { showRewardedAd(() => finishWatchAd(target)); };

  const finishWatchAd = guard((passedTarget) => {if (!passedTarget) return;
    if (passedTarget.startsWith('hire:')) {
      const hireId = passedTarget.slice(5);
      const updated = instantHireStaff(business, hireId);
      onDealershipUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('staff_hired'), t('staff_new_salesperson_instant'));
    } else if (passedTarget.startsWith('delivery:')) {
      const deliveryId = passedTarget.slice(9);
      const delivery = (business.pendingDeliveries || []).find((d) => d.instanceId === deliveryId);
      if (delivery) {
        const updated = instantDelivery(business, deliveryId);
        onDealershipUpdate(updated, money);
        const updatedDp = (updated.dealerships || []).find((d) => d.zoneId === delivery.zoneId);
        if (updatedDp) setDetailDealership(updatedDp);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('constr_delivery_instant'), tf('msg_00183', { v0: delivery.name }));
      }
    } else if (passedTarget.startsWith('sell:')) {
      const parts = passedTarget.slice(5).split(':');
      const zoneId = parts[0];
      const vehicleId = parts[1];
      const vehicle = (getDealershipByZone(business, zoneId)?.inventory || []).find((v) => v.instanceId === vehicleId);
      if (vehicle) {
        const updated = instantSellVehicle(business, zoneId, vehicleId);
        const netRevenue = vehicle.retail - Math.round((vehicle.retail - vehicle.wholesale) * 0.15);
        onDealershipUpdate(updated, money + netRevenue);
        const updatedDp = (updated.dealerships || []).find((d) => d.zoneId === zoneId);
        if (updatedDp) setDetailDealership(updatedDp);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('dealer_vehicle_sold'), tf('msg_78093', { v0: vehicle.name, v1: formatMoney(vehicle.retail) }));
      }
    } else if (passedTarget.startsWith('opening:')) {
      const zoneId = passedTarget.slice(8);
      const updated = instantOpenDealership(business, zoneId);
      onDealershipUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const dp = getDealershipByZone(business, zoneId);
      notify(tf('alert_dealership_open_exclaim'), tf('msg_10685', { v0: dp?.name }));
    } else if (passedTarget === 'upgrade') {
      const updated = completeUpgradeNow(business);
      onDealershipUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('upg_complete'), t('upg_business_upgraded'));
    }
    });
  // ─── Tabs ───
  const renderTabs = () => (
    <View style={styles.tabBar}>
      <Pressable style={[styles.tab, tab === 'dealerships' && styles.tabActive]} onPress={() => setTab('dealerships')}>
        <Ionicons name="business" size={14} color={tab === 'dealerships' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'dealerships' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_lots')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'order' && styles.tabActive]} onPress={() => setTab('order')}>
        <Ionicons name="cart" size={14} color={tab === 'order' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'order' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_order')}</Text>
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

  // ─── Dealerships tab (list of owned lots, tap opens modal) ───
  const renderDealerships = () => {
    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_pending_sales')}</Text>
          <Text style={[styles.overviewValue, { color: suspended ? '#ef4444' : '#4ade80' }]}>{formatMoney(pendingSales)}</Text>
          {suspended && <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>{t('fin_suspended')}</Text>}
          <View style={styles.incomeBreakdown}>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_salary_ongoing')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(staffSalaryCost)}</Text>
            </View>
          </View>
          <Text style={styles.overviewSub}>{dealerships.length} dealership{dealerships.length !== 1 ? 's' : ''} - {staff} staff - {completedSales.length} sales completed</Text>
        </View>

        {dealerships.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_no_dealerships')}</Text>
          </View>
        )}

        {dealerships.map((dp) => {
          const zone = getDealershipZone(dp.zoneId);
          if (!zone) return null;
          const opening = !isDealershipOpen(dp);
          const cap = getMaxLotCapacity(dp.zoneId, business);
          const invCount = (dp.inventory || []).length;
          const pendingCount = getPendingForZone(business, dp.zoneId).length;
          const totalOnLot = invCount + pendingCount;
          if (opening) {
            const openRemaining = getOpeningTimeRemaining(dp);
            const openTotal = DEALERSHIP_OPEN_MS_MAX;
            const openPct = Math.min(100, ((openTotal - openRemaining) / openTotal) * 100);
            return (
              <View key={dp.zoneId} style={styles.dealershipCard}>
                <View style={styles.dealershipCardHeader}>
                  <View style={styles.dealershipIconWrap}>
                    <Ionicons name="time" size={20} color="#fbbf24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dealershipName}>{dp.name}</Text>
                    <Text style={styles.dealershipMeta}>Opening in {formatTimeRemaining(openRemaining)}</Text>
                  </View>
                </View>
                <View style={styles.devProgressBar}>
                  <View style={[styles.devProgressFill, { width: `${openPct}%`, backgroundColor: '#fbbf24' }]} />
                </View>
                <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd(`opening:${dp.zoneId}`)}>
                  <Ionicons name="play-circle" size={14} color="#fbbf24" />
                  <Text style={styles.adSkipBtnText}>{t('ad_watch_skip')}</Text>
                </Pressable>
              </View>
            );
          }
          const branchProfit = getDealershipBranchProfitHourly(dp, business);
          return (
            <Pressable
              key={dp.zoneId}
              style={styles.dealershipCard}
              onPress={() => { setDetailDealership(dp); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <View style={styles.dealershipCardHeader}>
                <View style={styles.dealershipIconWrap}>
                  <Ionicons name="business" size={20} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dealershipName}>{dp.name}</Text>
                  <Text style={styles.dealershipMeta}>{zone.name}</Text>
                </View>
                <Text style={[styles.dealershipNetIncome, { color: branchProfit >= 0 ? '#4ade80' : '#f87171' }]}>
                  {branchProfit >= 0 ? '+' : ''}{formatMoney(Math.floor(branchProfit))}/hr
                </Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
              </View>
              <View style={styles.dealershipStats}>
                <View style={styles.dealershipStat}>
                  <Text style={styles.dealershipStatLabel}>{t('dealer_lot')}</Text>
                  <Text style={styles.dealershipStatValue}>{totalOnLot}/{cap}</Text>
                </View>
                <View style={styles.dealershipStat}>
                  <Text style={styles.dealershipStatLabel}>{t('dealer_selling')}</Text>
                  <Text style={styles.dealershipStatValue}>{invCount}</Text>
                </View>
                <View style={styles.dealershipStat}>
                  <Text style={styles.dealershipStatLabel}>{t('pending')}</Text>
                  <Text style={styles.dealershipStatValue}>{pendingCount}</Text>
                </View>
              </View>
              <View style={styles.lotBar}>
                <View style={[styles.lotBarFill, { width: `${Math.min(100, (totalOnLot / cap) * 100)}%`, backgroundColor: totalOnLot >= cap ? '#f87171' : '#4ade80' }]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // ─── Order tab (store cards like bus/courier, buy asks which dealership) ───
  const renderOrder = () => {
    const canLicense = canBuyBusLicense(business, ownedBusinesses);

    return (
      <View>
        {!busLicense && (
          <View style={[styles.finCard, { marginBottom: 14 }]}>
            <View style={styles.finRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.finLabel}>{t('dealer_bus_license')}</Text>
              </View>
              <Pressable
                style={[styles.finPayBtn, (!canLicense || money < BUS_LICENSE_COST) && styles.finPayBtnDisabled]}
                onPress={handleBuyBusLicense}
                disabled={!canLicense || money < BUS_LICENSE_COST}
              >
                <Text style={styles.finPayBtnText}>
                  {canLicense ? (money >= BUS_LICENSE_COST ? tf('buy_for', { v0: formatMoney(BUS_LICENSE_COST) }) : t('too_expensive')) : t('locked')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {dealerships.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_open_dealership_first')}</Text>
          </View>
        )}

        {dealerships.length > 0 && (
          <>
              <Text style={styles.sectionTitle}>{t('dealer_vehicle_wholesale')}</Text>
            {VEHICLE_TYPES.map((type) => {
              const levelLocked = (business.level || 1) < type.levelUnlock;
              const licenseLocked = type.needsBusLicense && !busLicense;
              const affordable = money >= type.wholesale;
              const disabled = levelLocked || licenseLocked || !affordable;
              return (
                <View key={type.id} style={styles.storeCard}>
                  <View style={[styles.storeImage, { backgroundColor: `${type.color}10` }]}>
                    {DEALERSHIP_IMAGES[type.id] ? (
                      <Image source={DEALERSHIP_IMAGES[type.id]} style={styles.storeVehicleImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.storeEmoji}>{type.emoji}</Text>
                    )}
                  </View>
                  <View style={styles.storeBody}>
                    <Text style={styles.storeName}>{type.name}</Text>
                    <View style={styles.storeStats}>
                      <View style={styles.storeStat}>
                        <Text style={styles.storeStatLabel}>{t('dealer_wholesale')}</Text>
                        <Text style={styles.storeStatValue}>{formatMoney(type.wholesale)}</Text>
                      </View>
                      <View style={styles.storeStat}>
                        <Text style={styles.storeStatLabel}>{t('dealer_retail')}</Text>
                        <Text style={[styles.storeStatValue, { color: '#4ade80' }]}>{formatMoney(type.retail)}</Text>
                      </View>
                      <View style={styles.storeStat}>
                        <Text style={styles.storeStatLabel}>{t('profit')}</Text>
                        <Text style={[styles.storeStatValue, { color: '#fbbf24' }]}>{formatMoney(type.retail - type.wholesale)}</Text>
                      </View>
                      <View style={styles.storeStat}>
                        <Text style={styles.storeStatLabel}>{t('dealer_sell_time')}</Text>
                        <Text style={styles.storeStatValue}>{type.sellHours}h</Text>
                      </View>
                    </View>
                    <Pressable
                      style={[styles.buyBtn, disabled && styles.buyBtnDisabled]}
                      onPress={() => {
                        if (dealerships.length === 1) {
                          handleBuyVehicle(type.id, dealerships[0].zoneId);
                        } else {
                          setBuyVehicleType(type);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      disabled={disabled}
                    >
                      <Text style={styles.buyBtnText}>
                        {levelLocked ? tf('unlock_at_level', { v0: type.levelUnlock }) : licenseLocked ? t('need_bus_license') : affordable ? tf('buy_for', { v0: formatMoney(type.wholesale) }) : t('insufficient_funds')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  };

  // ─── Map tab (pins on map, tap shows overlay on map, no zone cards below) ───
  const renderMap = () => {
    const scaledW = CITY_MAP.width * zoom;
    const scaledH = CITY_MAP.height * zoom;
    const unlockedZones = getUnlockedZones(business);
    const unlockedIds = new Set(unlockedZones.map((z) => z.id));
    const ownedZoneIds = new Set(dealerships.map((dp) => dp.zoneId));

    return (
      <View>
        <Text style={styles.sectionTitle}>{t('map_dealership_map')}</Text>

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
                      fill={owned ? 'rgba(74,222,128,0.12)' : unlocked ? 'rgba(249,115,22,0.08)' : 'rgba(248,113,113,0.06)'}
                      stroke={owned ? 'rgba(74,222,128,0.4)' : unlocked ? 'rgba(249,115,22,0.3)' : 'rgba(248,113,113,0.2)'}
                      strokeWidth={1}
                    />
                    <SvgText x={labelPos.x} y={labelPos.y} fontSize={12} fontWeight="700" fill={owned ? 'rgba(74,222,128,0.6)' : unlocked ? 'rgba(255,255,255,0.4)' : 'rgba(248,113,113,0.5)'} textAnchor="middle">
                      {d.name}
                    </SvgText>
                  </G>
                );
              })}

              {/* Available dealership pins (unlocked but not owned) */}
              {unlockedZones.filter((z) => !ownedZoneIds.has(z.id)).map((zone) => {
                const centroid = getDistrictCentroid(zone.id);
                if (!centroid) return null;
                const isSelected = selectedMapPin === zone.id;
                const pinColor = '#f97316';
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

              {/* Existing dealership pins (owned) */}
              {dealerships.map((dp) => {
                const centroid = getDistrictCentroid(dp.zoneId);
                if (!centroid) return null;
                const isSelected = selectedMapPin === dp.zoneId;
                const invCount = (dp.inventory || []).length;
                return (
                  <G key={`owned_${dp.zoneId}`} onPress={() => { setSelectedMapPin(isSelected ? null : dp.zoneId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Circle cx={centroid.x} cy={centroid.y + 3} r={isSelected ? 18 : 16} fill="rgba(0,0,0,0.5)" />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 18 : 16} fill="#4ade80" stroke="#fff" strokeWidth={2} />
                    <Circle cx={centroid.x} cy={centroid.y} r={isSelected ? 9 : 8} fill="rgba(15,23,42,0.95)" />
                    <Rect x={centroid.x - 30} y={centroid.y - 32} width={60} height={16} rx={6} fill="rgba(15,23,42,0.95)" />
                    <SvgText x={centroid.x} y={centroid.y - 20} fontSize={10} fontWeight="700" fill="#4ade80" textAnchor="middle">
                      {invCount} on lot
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>

          {/* Map pin overlay - positioned on map like construction job pins */}
          {selectedMapPin && (() => {
            const centroid = getDistrictCentroid(selectedMapPin);
            if (!centroid) return null;
            const screenX = panX + centroid.x * zoom;
            const screenY = panY + centroid.y * zoom;
            const isOwned = ownedZoneIds.has(selectedMapPin);
            const zone = getDealershipZone(selectedMapPin);
            if (!zone) return null;
            const dp = getDealershipByZone(business, selectedMapPin);
            const cap = getMaxLotCapacity(selectedMapPin, business);
            const invCount = dp ? (dp.inventory || []).length : 0;
            const pendingCount = dp ? getPendingForZone(business, selectedMapPin).length : 0;
            const totalOnLot = invCount + pendingCount;
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
                    <Text style={styles.pinOverlaySub}>{isOwned ? t('your_dealership') : t('available')}</Text>
                  </View>
                  <Pressable hitSlop={12} onPress={() => setSelectedMapPin(null)}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </Pressable>
                </View>
                <View style={styles.pinOverlayStats}>
                  <View style={styles.pinOverlayStat}>
                    <Text style={styles.pinOverlayStatLabel}>{t('dealer_lot_cap')}</Text>
                    <Text style={styles.pinOverlayStatValue}>{zone.lotCapacity}</Text>
                  </View>
                </View>
                {isOwned ? (
                  <>
                    {dp && !isDealershipOpen(dp) ? (
                      <>
                        <View style={styles.pinOverlayCostRow}>
                          <Text style={styles.pinOverlayCostLabel}>{t('map_opening_in')}</Text>
                          <Text style={[styles.pinOverlayCostValue, { color: '#fbbf24' }]}>
                            {formatTimeRemaining(getOpeningTimeRemaining(dp))}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.adSkipBtn}
                          onPress={() => startWatchAd(`opening:${dp.zoneId}`)}
                        >
                          <Ionicons name="play-circle" size={14} color="#fbbf24" />
                          <Text style={styles.adSkipBtnText}>{t('map_watch_open_now')}</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <View style={styles.pinOverlayStats}>
                          <View style={styles.pinOverlayStat}>
                            <Text style={styles.pinOverlayStatLabel}>{t('dealer_on_lot')}</Text>
                            <Text style={styles.pinOverlayStatValue}>{totalOnLot}/{cap}</Text>
                          </View>
                          <View style={styles.pinOverlayStat}>
                            <Text style={styles.pinOverlayStatLabel}>{t('dealer_selling_label')}</Text>
                            <Text style={styles.pinOverlayStatValue}>{invCount}</Text>
                          </View>
                          <View style={styles.pinOverlayStat}>
                            <Text style={styles.pinOverlayStatLabel}>{t('pending')}</Text>
                            <Text style={styles.pinOverlayStatValue}>{pendingCount}</Text>
                          </View>
                        </View>
                        <Pressable
                          style={styles.pinOverlayBtn}
                          onPress={() => { setDetailDealership(dp); setSelectedMapPin(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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
                      style={[styles.pinOverlayBtn, !canAfford && styles.pinOverlayBtnDisabled]}
                      onPress={() => handleOpenDealership(selectedMapPin)}
                      disabled={!canAfford}
                    >
                      <Text style={styles.pinOverlayBtnText}>
                        {canAfford ? tf('buy_for', { v0: formatMoney(zone.openCost) }) : t('insufficient_funds')}
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

  // ─── Staff tab (matching construction pattern) ───
  const renderStaff = () => {
    const hiringSlots = MAX_HIRING_AT_ONCE - hiringStaff.length;
    const salaryCost = getStaffSalaryHourly(business);

    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_pending_sales')}</Text>
          <Text style={[styles.overviewValue, { color: suspended ? '#ef4444' : '#4ade80' }]}>{formatMoney(pendingSales)}</Text>
          {suspended && <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>{t('fin_suspended')}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={styles.overviewSub}>Salary: {formatMoney(salaryCost)}/hr (ongoing)</Text>
            <Pressable onPress={() => setShowTeamRoster(true)} style={{ padding: 4 }}>
              <Ionicons name="people-circle-outline" size={22} color={ACCENT} />
            </Pressable>
          </View>
        </View>

        <View style={styles.staffGrid}>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_pending_sales')}</Text>
            <Text style={[styles.staffGridValue, { color: '#4ade80' }]}>{formatMoney(pendingSales)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#f87171' }]}>{formatMoney(salaryCost)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_team_size')}</Text>
            <Text style={styles.staffGridValue}>{staff}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_lot_bonus')}</Text>
            <Text style={styles.staffGridValue}>+{Math.floor(staff / 50)}</Text>
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
                <View key={hire.instanceId} style={styles.hireProgressCard}>
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
                  <Pressable style={styles.hireSkipBtn} onPress={() => startWatchAd(`hire:${hire.instanceId}`)}>
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
        <Text style={styles.hireHint}>Max {MAX_HIRING_AT_ONCE} at a time.</Text>
      </View>
    );
  };

  // ─── Finance tab (matching construction pattern) ───
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
    const levelMult = Math.pow(1.12, Math.max(1, business.level || 1) - 1);
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
            <Text style={styles.finValue}>{(getBusinessTaxRate({ type: 'dealership' }) * 100).toFixed(0)}% Dealership</Text>
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
            <Text style={styles.finLabel}>{t('upg_sales_multiplier')}</Text>
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
            <Text style={styles.finLabel}>{t('fin_pending_sales')}</Text>
            <Text style={[styles.finValue, { color: '#4ade80' }]}>{formatMoney(pendingSales)}</Text>
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
            <Text style={styles.finLabel}>{t('biz_dealerships')}</Text>
            <Text style={styles.finValue}>{dealerships.length}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('staff')}</Text>
            <Text style={styles.finValue}>{staff} workers</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.finValue, { color: '#f87171' }]}>{formatMoney(staffSalaryCost)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_sales_completed')}</Text>
            <Pressable style={styles.finCompletedBtn} onPress={() => setShowCompletedModal(true)}>
              <Text style={styles.finCompletedBtnText}>{completedSales.length}  View</Text>
            </Pressable>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('dealer_bus_license')}</Text>
            <Text style={[styles.finValue, busLicense ? { color: '#4ade80' } : { color: '#64748b' }]}>{busLicense ? t('owned_label') : t('none_label')}</Text>
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
        {tab === 'dealerships' && renderDealerships()}
        {tab === 'order' && renderOrder()}
        {tab === 'map' && renderMap()}
        {tab === 'staff' && renderStaff()}
        {tab === 'finance' && renderFinances()}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Dealership detail modal (like construction detailJob modal) */}
      {detailDealership && (() => {
        const dp = detailDealership;
        const zone = getDealershipZone(dp.zoneId);
        if (!zone) return null;
        const cap = getMaxLotCapacity(dp.zoneId, business);
        const pending = getPendingForZone(business, dp.zoneId);
        return (
          <View style={styles.detailOverlay}>
            <Pressable style={styles.detailBackdrop} onPress={() => setDetailDealership(null)} />
            <View style={styles.detailModal}>
              <View style={styles.detailHeader}>
                <View style={styles.detailEmojiWrap}>
                  <Ionicons name="business" size={24} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{dp.name}</Text>
                  <Text style={styles.detailStatus}>{zone.name}</Text>
                </View>
                <Pressable onPress={() => setDetailDealership(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>

              <View style={styles.detailStatsRow}>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatLabel}>{t('dealer_lot')}</Text>
                  <Text style={styles.detailStatValue}>{(dp.inventory || []).length + pending.length}/{cap}</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatLabel}>{t('dealer_selling')}</Text>
                  <Text style={styles.detailStatValue}>{(dp.inventory || []).length}</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatLabel}>{t('pending')}</Text>
                  <Text style={styles.detailStatValue}>{pending.length}</Text>
                </View>
              </View>

              {pending.length > 0 && (
                <>
                  <Text style={styles.sectionTitleSmall}>{t('clothing_pending_deliveries')}</Text>
                  {pending.map((d) => {
                    const remaining = getDeliveryTimeRemaining(d);
                    return (
                      <View key={d.instanceId} style={styles.deliveryCard}>
                        {DEALERSHIP_IMAGES[d.typeId] ? (
                          <Image source={DEALERSHIP_IMAGES[d.typeId]} style={styles.deliveryImage} resizeMode="cover" />
                        ) : (
                          <Text style={styles.deliveryEmoji}>{d.emoji}</Text>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.deliveryText}>{getVehicleType(d.typeId)?.name || d.name}</Text>
                          <Text style={styles.deliveryTime}>{formatTimeRemaining(remaining)}</Text>
                        </View>
                        <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd(`delivery:${d.instanceId}`)}>
                          <Ionicons name="play-circle" size={14} color="#fbbf24" />
                          <Text style={styles.adSkipBtnText}>{t('ad_skip')}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </>
              )}

              <Text style={styles.sectionTitleSmall}>{t('dealer_on_the_lot')} ({(dp.inventory || []).length})</Text>
              {(dp.inventory || []).length === 0 ? (
                <Text style={styles.emptyText}>{t('alert_no_vehicles_lot')}</Text>
              ) : (
                <ScrollView style={{ maxHeight: 300 }}>
                  {(dp.inventory || []).map((v) => {
                    const sellProgress = v.sellsAt ? Math.min(100, ((Date.now() - v.listedAt) / (v.sellsAt - v.listedAt)) * 100) : 0;
                    const remaining = v.sellsAt ? Math.max(0, v.sellsAt - Date.now()) : 0;
                    const upgrades = v.upgrades || 0;
                    const maxed = upgrades >= VEHICLE_MAX_UPGRADES;
                    const isSelling = !!v.sellsAt;
                    const upgradeCost = getVehicleUpgradeCost(v, upgrades);
                    const nextUpgradeName = maxed ? t('label_maxed') : VEHICLE_UPGRADE_NAMES[upgrades];
                    return (
                      <View key={v.instanceId} style={styles.vehicleCard}>
                        <View style={styles.vehicleCardTop}>
                          {DEALERSHIP_IMAGES[v.typeId] ? (
                            <Image source={DEALERSHIP_IMAGES[v.typeId]} style={styles.vehicleCardImage} resizeMode="cover" />
                          ) : (
                            <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.vehicleName}>{getVehicleType(v.typeId)?.name || v.name}</Text>
                            <Text style={styles.vehicleMeta}>
                              {tf('msg_retail_profit', { v0: formatMoney(v.retail), v1: formatMoney(v.retail - v.wholesale) })}
                            </Text>
                          </View>
                          {upgrades > 0 && (
                            <View style={styles.upgradeBadge}>
                              <Text style={styles.upgradeBadgeText}>Lv{upgrades}</Text>
                            </View>
                          )}
                        </View>

                        {upgrades > 0 && (
                          <Text style={styles.upgradeSummary}>
                            {upgrades}/{VEHICLE_MAX_UPGRADES} upgrades installed
                          </Text>
                        )}

                        {isSelling ? (
                          <>
                            <View style={styles.devProgressBar}>
                              <View style={[styles.devProgressFill, { width: `${sellProgress}%` }]} />
                            </View>
                            <Text style={styles.vehicleTime}>{formatTimeRemaining(remaining)} until sold</Text>
                            <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd(`sell:${dp.zoneId}:${v.instanceId}`)}>
                              <Ionicons name="play-circle" size={14} color="#fbbf24" />
                              <Text style={styles.adSkipBtnText}>{t('ad_watch_sell_now')}</Text>
                            </Pressable>
                          </>
                        ) : (
                          <View style={styles.vehicleActions}>
                            {!maxed && (
                              <Pressable
                                style={[styles.upgradeBtn, money < upgradeCost && styles.upgradeBtnDisabled]}
                                onPress={() => handleUpgradeVehicle(dp.zoneId, v.instanceId)}
                                disabled={money < upgradeCost}
                              >
                                <Ionicons name="build" size={14} color="#fbbf24" />
                                <Text style={styles.upgradeBtnText}>{nextUpgradeName} - {formatMoney(upgradeCost)}</Text>
                              </Pressable>
                            )}
                            <Pressable
                              style={styles.sellBtn}
                              onPress={() => handleSellVehicle(dp.zoneId, v.instanceId)}
                            >
                              <Ionicons name="cash" size={16} color="#000" />
                              <Text style={styles.sellBtnText}>{t('dealer_sell')}</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        );
      })()}

      {/* Buy vehicle - choose dealership modal */}
      {buyVehicleType && (
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={() => setBuyVehicleType(null)} />
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <View style={styles.detailEmojiWrap}>
                {DEALERSHIP_IMAGES[buyVehicleType.id] ? (
                  <Image source={DEALERSHIP_IMAGES[buyVehicleType.id]} style={styles.detailWrapImage} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 24 }}>{buyVehicleType.emoji}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{buyVehicleType.name}</Text>
                <Text style={styles.detailStatus}>{t('dealer_deliver_to')}</Text>
              </View>
              <Pressable onPress={() => setBuyVehicleType(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>

            <View style={styles.storeStats}>
              <View style={styles.storeStat}>
                <Text style={styles.storeStatLabel}>{t('dealer_wholesale')}</Text>
                <Text style={styles.storeStatValue}>{formatMoney(buyVehicleType.wholesale)}</Text>
              </View>
              <View style={styles.storeStat}>
                <Text style={styles.storeStatLabel}>{t('dealer_retail')}</Text>
                <Text style={[styles.storeStatValue, { color: '#4ade80' }]}>{formatMoney(buyVehicleType.retail)}</Text>
              </View>
              <View style={styles.storeStat}>
                <Text style={styles.storeStatLabel}>{t('profit')}</Text>
                <Text style={[styles.storeStatValue, { color: '#fbbf24' }]}>{formatMoney(buyVehicleType.retail - buyVehicleType.wholesale)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitleSmall}>{t('dealer_choose_dealership')}</Text>
            {dealerships.map((dp) => {
              const zone = getDealershipZone(dp.zoneId);
              const cap = getMaxLotCapacity(dp.zoneId, business);
              const total = (dp.inventory || []).length + getPendingForZone(business, dp.zoneId).length;
              const isFull = total >= cap;
              const opening = !isDealershipOpen(dp);
              return (
                <Pressable
                  key={dp.zoneId}
                  style={[styles.chooseDealershipCard, isFull && styles.chooseDealershipCardDisabled]}
                  onPress={() => handleBuyVehicle(buyVehicleType.id, dp.zoneId)}
                  disabled={isFull}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chooseDealershipName}>{dp.name}{opening ? ' (Opening)' : ''}</Text>
                    <Text style={styles.chooseDealershipMeta}>
                      {total}/{cap} on lot
                    </Text>
                  </View>
                  {isFull ? (
                    <Text style={styles.chooseDealershipFull}>{t('dealer_full')}</Text>
                  ) : (
                    <Ionicons name="arrow-forward-circle" size={22} color={ACCENT} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Completed sales modal */}
      {showCompletedModal && (
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={() => setShowCompletedModal(false)} />
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <View style={styles.detailEmojiWrap}>
                <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{t('fin_completed_sales')}</Text>
                <Text style={styles.detailStatus}>{completedSales.length} total sales</Text>
              </View>
              <Pressable onPress={() => setShowCompletedModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>
            {completedSales.length === 0 ? (
              <Text style={styles.emptyText}>{t('alert_no_sales')}</Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {completedSales.slice(0, 50).map((sale) => (
                  <View key={`${sale.instanceId}_${sale.soldAt}`} style={styles.completedSaleCard}>
                    {DEALERSHIP_IMAGES[sale.typeId] ? (
                      <Image source={DEALERSHIP_IMAGES[sale.typeId]} style={styles.completedSaleImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.completedSaleEmoji}>{sale.emoji}</Text>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.completedSaleName}>{getVehicleType(sale.typeId)?.name || sale.name}</Text>
                      <Text style={styles.completedSaleMeta}>{sale.zoneName} - {formatMoney(sale.retail)} - profit {formatMoney(sale.retail - sale.wholesale)}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
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
        onFire={(m) => { onDealershipUpdate(fireStaff(business, m.id)); }}
        onRaise={(m) => { onDealershipUpdate(raiseStaff(business, m.id)); }}
        onTrain={(m) => { onDealershipUpdate(trainStaff(business, m.id)); }}
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
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.1)', alignItems: 'center', justifyContent: 'center' },
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
  dealershipCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  dealershipCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dealershipIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center' },
  dealershipName: { fontSize: 15, color: '#fff', fontWeight: '800' },
  dealershipMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  dealershipNetIncome: { fontSize: 13, fontWeight: '800' },
  dealershipStats: { flexDirection: 'row', gap: 20, marginBottom: 8 },
  dealershipStat: { alignItems: 'center' },
  dealershipStatLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  dealershipStatValue: { fontSize: 14, color: '#fff', fontWeight: '700' },
  lotBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  lotBarFill: { height: '100%', borderRadius: 3 },
  storeCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 22, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  storeImage: { height: 160, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  storeEmoji: { fontSize: 72 },
  storeVehicleImage: { width: '100%', height: '100%' },
  deliveryImage: { width: 26, height: 26, borderRadius: 6 },
  vehicleCardImage: { width: 32, height: 32, borderRadius: 8 },
  completedSaleImage: { width: 28, height: 28, borderRadius: 6 },
  detailWrapImage: { width: '100%', height: '100%', borderRadius: 12 },
  storeBody: { padding: 16 },
  storeName: { fontSize: 18, color: '#fff', fontWeight: '800', marginBottom: 4 },
  storeDesc: { fontSize: 13, color: '#94a3b8', marginBottom: 14 },
  storeStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  storeStat: { alignItems: 'center' },
  storeStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  storeStatValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  buyBtn: { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  buyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  buyBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  popularBadge: { backgroundColor: 'rgba(251,191,36,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  popularBadgeText: { fontSize: 9, color: '#fbbf24', fontWeight: '800' },
  licenseHint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  mapArea: { height: 380, backgroundColor: '#0f172a', borderRadius: 16, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  mapHint: { fontSize: 11, color: '#94a3b8', marginBottom: 10 },
  zoomRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  zoomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 10 },
  zoomBtnLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  pinOverlayCard: { position: 'absolute', backgroundColor: '#1a1d28', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 50 },
  pinOverlayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pinOverlayIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center' },
  pinOverlayName: { fontSize: 14, color: '#fff', fontWeight: '800' },
  pinOverlaySub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  pinOverlayDesc: { fontSize: 11, color: '#94a3b8', marginBottom: 8 },
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
  hireProgressCard: { backgroundColor: 'rgba(249,115,22,0.06)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)', borderRadius: 14, padding: 14, marginBottom: 8 },
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
  hireBtn: { flex: 1, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' },
  hireBtnDisabled: { opacity: 0.4 },
  hireBtnCount: { fontSize: 18, fontWeight: '900', color: '#fff' },
  hireBtnCost: { fontSize: 12, color: ACCENT, fontWeight: '700', marginTop: 4 },
  hireBtnTime: { fontSize: 10, color: '#64748b', marginTop: 2 },
  hireHint: { fontSize: 11, color: '#64748b', marginTop: 4 },
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
  finCompletedBtn: { backgroundColor: 'rgba(249,115,22,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  finCompletedBtnText: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  completedSaleCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  completedSaleEmoji: { fontSize: 22 },
  completedSaleName: { fontSize: 13, color: '#fff', fontWeight: '700' },
  completedSaleMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  vehicleCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  vehicleCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  vehicleEmoji: { fontSize: 24 },
  vehicleName: { fontSize: 14, color: '#fff', fontWeight: '700' },
  vehicleMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  vehicleTime: { fontSize: 11, color: '#fbbf24', fontWeight: '600', marginTop: 4 },
  upgradeBadge: { backgroundColor: 'rgba(251,191,36,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  upgradeBadgeText: { fontSize: 9, color: '#fbbf24', fontWeight: '800' },
  upgradeSummary: { fontSize: 11, color: '#64748b', marginBottom: 6 },
  vehicleActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  upgradeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 8 },
  upgradeBtnDisabled: { opacity: 0.4 },
  upgradeBtnText: { fontSize: 10, fontWeight: '700', color: '#fbbf24' },
  sellBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#4ade80', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  sellBtnText: { fontSize: 13, fontWeight: '900', color: '#000' },
  devProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  devProgressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  deliveryCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  deliveryEmoji: { fontSize: 20 },
  deliveryText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  deliveryTime: { fontSize: 12, color: '#fbbf24', fontWeight: '700' },
  chooseDealershipCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  chooseDealershipCardDisabled: { opacity: 0.5 },
  chooseDealershipName: { fontSize: 14, color: '#fff', fontWeight: '700' },
  chooseDealershipMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  chooseDealershipFull: { fontSize: 12, color: '#f87171', fontWeight: '700' },
  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  detailBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
  detailModal: { width: '90%', maxHeight: '80%', backgroundColor: '#1a1d28', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  detailEmojiWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center' },
  detailName: { fontSize: 18, color: '#fff', fontWeight: '800' },
  detailStatus: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  detailDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  detailPopular: { fontSize: 12, color: '#fbbf24', fontWeight: '600', marginBottom: 10 },
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
  spacer: { height: 40 },
});
