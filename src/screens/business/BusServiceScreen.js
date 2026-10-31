import { useState, useRef, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Animated, Image } from 'react-native';
import { useContentWidth } from '../../data/layout';
import Text, { useLanguage } from '../../components/AppText';
import Svg, { G, Polygon, Text as SvgText, Circle, Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf } from '../../data/i18n';
import { showRewardedAd } from '../../data/ads';
import UpgradeProgress from '../../components/UpgradeProgress';
import TeamRosterModal from '../../components/TeamRosterModal';
import { formatMoney } from '../../data/market';
import {
  BUS_TYPES,
  ROUTES,
  CITY_MAP,
  getStops,
  buyBus,
  maintainBus,
  selectRoute,
  getMaintenanceCost,
  getBusHourlyIncome,
  getBusRevenueHourly,
  getBusPayrollHourly,
  getBusInsuranceCostHourly,
  getBusCurrentIncomeHourly,
  getRouteSegmentIncome,
  getCustomRouteIncome,
  canAddSegment,
  canRemoveSegment,
  getDistrictById,
  getBusType,
  busMeetsRequirement,
  getBusAssignedDistricts,
  getBusRouteIncome,
  isBusDelivered,
  getBusDeliveryTimeRemaining,
  getBusLevelMultiplier,
  getMaxBusSlots,
  getBusDrivers,
  hireBusDrivers,
  instantHireDriver,
  getHireTimeRemaining,
  getHiringCount,
  canHireMore,
  assignBusDriver,
  unassignBusDriver,
  canInsureBus,
  getInsuranceDailyCost,
  buyBusInsurance,
  getBusHealthPct,
  STAFF_HIRE_COST,
  STAFF_SALARY_HOURLY,
  STAFF_HIRE_MIN_MS,
  STAFF_HIRE_MAX_MS,
  MAX_HIRING_AT_ONCE,
  INSURANCE_HEALTH_THRESHOLD,
  fireBusDriver, raiseBusDriver, trainBusDriver,
  completeHiredDrivers,
} from '../../data/bus';
import {
  getTaxOwed,
  getDailyTax,
  getUpgradeCost,
  getUpgradeName,
  upgradeBusiness,
  completeUpgradeNow,
  payTax,
  isSuspended,
  getHoursUntilSuspension,

  getBusinessTaxRate,
} from '../../data/businesses';

const BUS_IMAGES = {
  minibus: require('../../../assets/vehicles/bus/minibus.jpg'),
  citybus: require('../../../assets/vehicles/bus/citybus.jpg'),
  doubledecker: require('../../../assets/vehicles/bus/doubledecker.jpg'),
  coach: require('../../../assets/vehicles/bus/coach.jpg'),
  electricbus: require('../../../assets/vehicles/bus/electricbus.jpg'),
};

export default function BusServiceScreen({ business, money, boostExpiresAt, onBack, onOpenSettings, onBusUpdate }) {
  useLanguage();
  const [tab, setTab] = useState('fleet');
  const screenW = useContentWidth();
  const MAP_VIEW_H = 420;
  const fitZoom = Math.min((screenW - 32) / CITY_MAP.width, MAP_VIEW_H / CITY_MAP.height);
  const mapAreaW = screenW - 32;
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
  const [isMapTouching, setIsMapTouching] = useState(false);
  const touchRef = useRef(null);
  const [selectedBusIdx, setSelectedBusIdx] = useState(null);
  const [detailBusId, setDetailBusId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const [, setTick] = useState(0);
  const [showTeamRoster, setShowTeamRoster] = useState(false);
  const [routeSubTab, setRouteSubTab] = useState('map');
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
  const onBusUpdateRef = useRef(onBusUpdate);
  onBusUpdateRef.current = onBusUpdate;

  const notify = useCallback((title, message, type = 'error') => {
    const id = notifIdRef.current++;
    setNotifications((prev) => [...prev, { id, title, message, type }].slice(-2));
    later(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
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
        const updated = completeHiredDrivers(biz);
        onBusUpdateRef.current(updated, moneyRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(t('staff_ready'), tf('msg_drivers_joined', { v0: completed.length }), 'success');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  const fleet = business.fleet || [];
  const detailBus = detailBusId ? fleet.find((b) => b.instanceId === detailBusId) : null;
  const income = getBusHourlyIncome(business);
  const suspended = isSuspended(business);
  const busRevenue = getBusRevenueHourly(business);
  const driverPayroll = getBusPayrollHourly(business);
  const insuranceCost = getBusInsuranceCostHourly(business);
  const drivers = getBusDrivers(business);
  const hiringDrivers = business.hiringStaff || [];
  const activeBuses = fleet.filter((b) => isBusDelivered(b) && b.milesRemaining > 0 && !b.needsMaintenance).length;
  const groundedBuses = fleet.filter((b) => isBusDelivered(b) && (b.needsMaintenance || b.milesRemaining <= 0)).length;
  const inTransit = fleet.filter((b) => !isBusDelivered(b)).length;

  const formatDeliveryTime = (ms) => {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const selectedBus = selectedBusIdx != null ? fleet[selectedBusIdx] : null;
  const selectedDistricts = selectedBus ? getBusAssignedDistricts(selectedBus) : [];

  const handleSegmentTap = (districtId) => {
    if (!selectedBus) return;
    const district = getDistrictById(districtId);
    if (!district) return;
    const isAssigned = selectedDistricts.includes(districtId);
    if (isAssigned) {
      if (!canRemoveSegment(districtId, selectedDistricts)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      const updatedFleet = fleet.map((b, i) =>
        i === selectedBusIdx
          ? { ...b, assignedDistricts: selectedDistricts.filter((id) => id !== districtId) }
          : b
      );
      onBusUpdate({ ...business, fleet: updatedFleet }, money);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      if (!canAddSegment(districtId, selectedDistricts)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (selectedDistricts.length >= (getBusType(selectedBus.typeId)?.maxDistricts || 2)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify(tf('bus_max_districts'), tf('msg_53417', { v0: getBusType(selectedBus.typeId)?.name, v1: getBusType(selectedBus.typeId)?.maxDistricts || 2 }));
        return;
      }
      if (!busMeetsRequirement(selectedBus.typeId, district.minBusType)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify(tf('bus_too_small'), tf('msg_78402', { v0: district.name, v1: getBusType(district.minBusType)?.name || district.minBusType }), 'warning');
        return;
      }
      const updatedFleet = fleet.map((b, i) =>
        i === selectedBusIdx
          ? { ...b, assignedDistricts: [...selectedDistricts, districtId] }
          : b
      );
      onBusUpdate({ ...business, fleet: updatedFleet }, money);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleCancelRoute = (busIdx) => {
    const updatedFleet = fleet.map((b, i) =>
      i === busIdx ? { ...b, assignedDistricts: [] } : b
    );
    onBusUpdate({ ...business, fleet: updatedFleet }, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const clampPan = (val, viewSize, scaledSize) => {
    if (scaledSize <= viewSize) return (viewSize - scaledSize) / 2;
    return Math.min(0, Math.max(viewSize - scaledSize, val));
  };

  const onTouchStart = (e) => {
    const t = e.nativeEvent.touches[0];
    touchRef.current = { startX: t.pageX, startY: t.pageY, startPanX: panX, startPanY: panY, t: Date.now(), moved: false };
    setIsMapTouching(true);
  };

  const onTouchMove = (e) => {
    if (!touchRef.current) return;
    const t = e.nativeEvent.touches[0];
    const dx = t.pageX - touchRef.current.startX;
    const dy = t.pageY - touchRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchRef.current.moved = true;
    const scaledW = CITY_MAP.width * zoom;
    const scaledH = CITY_MAP.height * zoom;
    setPanX(clampPan(touchRef.current.startPanX + dx, mapAreaW, scaledW));
    setPanY(clampPan(touchRef.current.startPanY + dy, MAP_VIEW_H, scaledH));
  };

  const onTouchEnd = () => {
    setIsMapTouching(false);
    touchRef.current = null;
  };

  const startWatchAdViaAdmob = (target) => { showRewardedAd(() => finishWatchAd(target)); };
  const startWatchAdForBus = (instanceId) => { startWatchAdViaAdmob(instanceId); };
  const startWatchAdForHire = (hireId) => { startWatchAdViaAdmob(`hire:${hireId}`); };
  const startWatchAdForUpgrade = () => { startWatchAdViaAdmob('upgrade'); };
  const finishWatchAd = guard((passedTarget) => {if (!passedTarget) return;
    if (passedTarget.startsWith('hire:')) {
      const hireId = passedTarget.slice(5);
      const updated = instantHireDriver(business, hireId);
      onBusUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('staff_hired'), t('staff_new_driver_instant'), 'success');
      return;
    } else if (passedTarget === 'upgrade') {
      const updated = completeUpgradeNow(business);
      onBusUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('upg_complete'), t('upg_business_upgraded'), 'success');
      return;
    }
    const updated = {
      ...business,
      fleet: (business.fleet || []).map((b) =>
        b.instanceId === passedTarget ? { ...b, deliveredAt: Date.now() } : b
      ),
    };
    onBusUpdate(updated, money);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const bus = (business.fleet || []).find((b) => b.instanceId === passedTarget);
    notify(tf('bus_delivered'), tf('msg_99630', { v0: bus?.name || t('fallback_bus') }), 'success');
    });
  const canAfford = (cost) => money >= cost;

  const handleBuyBus = guard((type) => {
    const maxSlots = getMaxBusSlots(business);
    if (fleet.length >= maxSlots) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('bus_garage_full'), tf('msg_02186', { v0: fleet.length, v1: maxSlots }));
      return;
    }
    if (!canAfford(type.cost)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_40436', { v0: formatMoney(type.cost), v1: type.name }));
      return;
    }
    const updated = buyBus(business, type.id);
    onBusUpdate(updated, money - type.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('bus_ordered'), tf('msg_45646', { v0: type.name }), 'warning');
  });

  const handleMaintain = guard((bus) => {
    const cost = getMaintenanceCost(bus);
    if (money < cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_47360', { v0: formatMoney(cost) }));
      return;
    }
    const milesPct = bus.maxMiles > 0 ? bus.milesRemaining / bus.maxMiles : 0;
    const scrapChance = Math.max(0, 0.3 * (1 - milesPct));
    const { business: updated, refund, scrapped } = maintainBus(business, bus.instanceId);
    const newMoney = money - cost + refund;
    onBusUpdate(updated, newMoney);
    setDetailBusId(null);
    if (scrapped) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(t('bus_scrapped'), bus.insured ? tf('msg_bus_scrapped_insured', { v0: bus.name, v1: formatMoney(refund) }) : tf('msg_bus_scrapped_salvage', { v0: bus.name, v1: formatMoney(refund) }), 'warning');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      notify(tf('bus_maintenance_complete'), tf('msg_78508', { v0: bus.name }), 'warning');
    }
  });

  const handleHireDrivers = guard((count) => {
    const cost = count * STAFF_HIRE_COST;
    if (money < cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_53501', { v0: count, v1: count > 1 ? 's' : '', v2: formatMoney(cost) }));
      return;
    }
    if (!canHireMore(business)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('staff_hiring_full'), tf('msg_18243', { v0: MAX_HIRING_AT_ONCE }));
      return;
    }
    const updated = hireBusDrivers(business, count);
    if (!updated) return;
    onBusUpdate(updated, money - count * STAFF_HIRE_COST);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('staff_hiring_drivers'), tf('msg_65801', { v0: count, v1: count > 1 ? 's' : '' }), 'success');
  });

  const handleAssignDriver = (busInstanceId, driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    const bus = fleet.find((b) => b.instanceId === busInstanceId);
    const updated = assignBusDriver(business, busInstanceId, driverId);
    onBusUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify(tf('bus_driver_assigned'), tf('msg_73227', { v0: driver?.name || t('fallback_driver'), v1: bus?.name || t('fallback_the_bus') }), 'success');
  };

  const handleUnassignDriver = (busInstanceId) => {
    const bus = fleet.find((b) => b.instanceId === busInstanceId);
    const driver = drivers.find((d) => d.id === bus?.assignedDriverId);
    const updated = unassignBusDriver(business, busInstanceId);
    onBusUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify(tf('bus_driver_unassigned'), tf('msg_33585', { v0: driver?.name || t('fallback_driver'), v1: bus?.name || t('fallback_the_bus') }), 'warning');
  };

  const handleBuyInsurance = guard((bus) => {
    if (!canInsureBus(bus)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('bus_cannot_insure'), tf('msg_91676', { v0: Math.round(INSURANCE_HEALTH_THRESHOLD * 100) }));
      return;
    }
    const updated = buyBusInsurance(business, bus.instanceId);
    onBusUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('bus_insured'), tf('msg_97239', { v0: bus.name, v1: formatMoney(getInsuranceDailyCost(bus)) }), 'success');
  });

  const handleRouteChange = (routeId) => {
    const updated = selectRoute(business, routeId);
    onBusUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderTabs = () => (
    <View style={styles.tabBar}>
      {[
        { id: 'fleet', label: t('tab_fleet'), icon: 'bus' },
        { id: 'store', label: t('bus_store'), icon: 'storefront' },
        { id: 'routes', label: t('tab_routes'), icon: 'map' },
        { id: 'staff', label: t('tab_staff'), icon: 'people' },
        { id: 'finance', label: t('tab_finance'), icon: 'card' },
      ].map((tabItem) => {
        const active = tab === tabItem.id;
        return (
          <Pressable key={tabItem.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(tabItem.id)}>
            <Ionicons name={tabItem.icon} size={14} color={active ? '#000' : '#64748b'} />
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{tabItem.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderFleet = () => (
    <View>
      <View style={styles.overviewCard}>
        <Text style={styles.overviewLabel}>{t('fin_net_income_hr')}</Text>
        <Text style={[styles.overviewValue, (income < 0 || suspended) && { color: '#ef4444' }]}>{formatMoney(income)}</Text>
        {suspended && <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>{t('fin_suspended')}</Text>}
        <View style={styles.incomeBreakdown}>
          <View style={styles.incomeBreakdownRow}>
            <Text style={styles.incomeBreakdownLabel}>{t('fin_fleet_revenue')}</Text>
            <Text style={[styles.incomeBreakdownValue, { color: '#4ade80' }]}>{formatMoney(busRevenue)}</Text>
          </View>
          <View style={styles.incomeBreakdownRow}>
            <Text style={styles.incomeBreakdownLabel}>{t('fin_driver_payroll')}</Text>
            <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(driverPayroll)}</Text>
          </View>
          <View style={styles.incomeBreakdownRow}>
            <Text style={styles.incomeBreakdownLabel}>{t('fin_insurance')}</Text>
            <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(Math.floor(insuranceCost))}</Text>
          </View>
        </View>
        <Text style={styles.overviewSub}>Level {business.level} / 30 - {fleet.length}/{getMaxBusSlots(business)} buses - {inTransit} in transit</Text>
      </View>

      <View style={styles.garageBar}>
        <View style={styles.garageBarInfo}>
          <Text style={styles.garageBarLabel}>{t('courier_garage')}</Text>
          <Text style={[styles.garageBarCount, fleet.length >= getMaxBusSlots(business) && { color: '#f87171' }]}>
            {fleet.length}/{getMaxBusSlots(business)}
          </Text>
        </View>
        <View style={styles.garageBarTrack}>
          <View style={[
            styles.garageBarFill,
            { width: `${Math.min(100, (fleet.length / getMaxBusSlots(business)) * 100)}%`, backgroundColor: fleet.length >= getMaxBusSlots(business) ? '#f87171' : '#fbbf24' },
          ]} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('bus_your_buses')}</Text>
      {fleet.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="bus" size={40} color="#475569" />
          <Text style={styles.emptyText}>{t('alert_no_buses')}</Text>
        </View>
      )}
      {fleet.map((bus) => {
        const milesPct = Math.min(100, Math.max(0, (bus.milesRemaining / bus.maxMiles) * 100));
        const isDegraded = bus.needsMaintenance || bus.milesRemaining <= 0;
        const busType = getBusType(bus.typeId);
        const busColor = bus.color || busType?.color || '#34d399';
        const healthColor = isDegraded ? '#f87171' : busColor;
        const isDoubleDecker = bus.typeId === 'doubledecker';
        const delivered = isBusDelivered(bus);
        const assigned = getBusAssignedDistricts(bus);
        const routeNames = assigned.map((id) => getDistrictById(id)?.name).filter(Boolean);
        const currentIncome = getBusCurrentIncomeHourly(bus, business);
        const driver = drivers.find((d) => d.id === bus.assignedDriverId);
        return (
          <Pressable key={bus.instanceId} style={[styles.busCard, { borderColor: busColor, opacity: delivered ? 1 : 0.6 }]} onPress={() => delivered && setDetailBusId(bus.instanceId)}>
            <View
              style={[
                styles.lifeFill,
                {
                  width: `${milesPct}%`,
                  backgroundColor: isDegraded ? 'rgba(248,113,113,0.22)' : `${busColor}33`,
                  borderTopLeftRadius: 22,
                  borderBottomLeftRadius: 8,
                },
              ]}
            />
            {isDoubleDecker && (
              <View style={[styles.upperDeck, { borderColor: `${busColor}55` }]}>
                <Text style={[styles.upperDeckLabel, { color: busColor }]}>{t('bus_upper_deck')}</Text>
                <View style={[styles.upperDeckWindows, { borderColor: `${busColor}40` }]} />
              </View>
            )}
            <View style={styles.busBody}>
              <View style={styles.busHeader}>
                <Text style={styles.busEmoji}>{bus.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.busName}>{bus.name}</Text>
                  <Text style={styles.busMeta}>{Math.floor(bus.milesRemaining).toLocaleString()} / {bus.maxMiles.toLocaleString()} mi</Text>
                </View>
                <Text style={[styles.busMiles, { color: healthColor }]}>{Math.floor(milesPct)}%</Text>
              </View>
              {delivered ? (
                <>
                  <View style={styles.busStats}>
                    <Text style={styles.busStat}>{formatMoney(currentIncome)}/hr</Text>
                    <Text style={styles.busStat}>{assigned.length} districts</Text>
                    <Text style={styles.busStat}>{isDegraded ? t('bus_needs_maintenance') : t('active')}</Text>
                  </View>
                  <View style={styles.driverRow}>
                    <Ionicons name={driver?.gender === 'female' ? 'woman' : 'man'} size={12} color={driver ? (driver.gender === 'female' ? '#ec4899' : '#3b82f6') : '#f87171'} />
                    <Text style={[styles.driverRowText, { color: driver ? '#4ade80' : '#f87171' }]}>
                      {driver ? driver.name : t('bus_no_driver_assigned')}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.deliveryRow}>
                  <Ionicons name="time" size={14} color="#fbbf24" />
                  <Text style={styles.deliveryText}>{tf('bus_in_transit', { v0: formatDeliveryTime(getBusDeliveryTimeRemaining(bus)) })}</Text>
                  <Pressable style={styles.busSkipBtn} onPress={() => startWatchAdForBus(bus.instanceId)}>
                    <Ionicons name="play-circle" size={12} color="#fbbf24" />
                    <Text style={styles.busSkipBtnText}>{t('ad_watch')}</Text>
                  </Pressable>
                </View>
              )}
            </View>
            {delivered && routeNames.length > 0 && (
              <View style={styles.routeInfoRow}>
                <Ionicons name="navigate" size={12} color={busColor} />
                <Text style={styles.routeInfoText} numberOfLines={1}>{routeNames.join(' → ')}</Text>
              </View>
            )}
            <View style={styles.wheels}>
              <View style={[styles.wheel, { borderColor: `${busColor}88` }]}>
                <View style={[styles.wheelHub, { backgroundColor: `${busColor}66` }]} />
              </View>
              <View style={[styles.wheel, { borderColor: `${busColor}88` }]}>
                <View style={[styles.wheelHub, { backgroundColor: `${busColor}66` }]} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderStaff = () => {
    const hiringSlots = MAX_HIRING_AT_ONCE - hiringDrivers.length;
    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_team_size')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.overviewValue}>{drivers.length}</Text>
            <Pressable onPress={() => setShowTeamRoster(true)} style={{ padding: 4 }}>
              <Ionicons name="people-circle-outline" size={22} color="#60a5fa" />
            </Pressable>
          </View>
          <Text style={styles.overviewSub}>{formatMoney(busRevenue)}/hr revenue - {formatMoney(driverPayroll)}/hr payroll</Text>
        </View>

        <View style={styles.staffGrid}>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_revenue_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#4ade80' }]}>{formatMoney(busRevenue)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_payroll_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#f87171' }]}>{formatMoney(driverPayroll)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_net_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: income >= 0 ? '#4ade80' : '#f87171' }]}>{formatMoney(income)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_per_driver')}</Text>
            <Text style={styles.staffGridValue}>{drivers.length > 0 ? formatMoney(Math.floor(busRevenue / drivers.length)) : '-'}</Text>
          </View>
        </View>

        {hiringDrivers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{tf('pending_hires', { v0: hiringDrivers.length, v1: MAX_HIRING_AT_ONCE })}</Text>
            {hiringDrivers.map((hire) => {
              const remaining = getHireTimeRemaining(hire);
              const total = STAFF_HIRE_MAX_MS;
              const pct = Math.min(100, ((total - remaining) / total) * 100);
              return (
                <View key={hire.id} style={styles.hireProgressCard}>
                  <View style={styles.hireProgressTop}>
                    <View style={styles.hireProgressInfo}>
                      <Ionicons name={hire.gender === 'female' ? 'woman' : 'man'} size={16} color={hire.gender === 'female' ? '#ec4899' : '#3b82f6'} />
                      <Text style={styles.hireProgressLabel}>{hire.name}</Text>
                    </View>
                    <Text style={styles.hireProgressTime}>{formatDeliveryTime(remaining)}</Text>
                  </View>
                  <View style={styles.hireProgressBar}>
                    <View style={[styles.hireProgressBarFill, { width: `${pct}%` }]} />
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

        <Text style={styles.sectionTitle}>{t('staff_hire')}</Text>
        <View style={styles.hireRow}>
          {[1, 2, 3].map((count) => {
            const cost = count * STAFF_HIRE_COST;
            const affordable = money >= cost;
            const slotsAvailable = count <= hiringSlots;
            const disabled = !affordable || !slotsAvailable;
            return (
              <Pressable key={count} style={[styles.hireBtn, disabled && styles.hireBtnDisabled]} onPress={() => handleHireDrivers(count)} disabled={disabled}>
                <Text style={styles.hireBtnCount}>+{count}</Text>
                <Text style={styles.hireBtnCost}>{formatMoney(cost)}</Text>
                <Text style={styles.hireBtnTime}>{`3s-45m`}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hireHint}>Max {MAX_HIRING_AT_ONCE} at a time. Every bus needs an assigned driver to earn income. Assign drivers from a bus&apos;s detail view in the Fleet tab.</Text>
      </View>
    );
  };

  const renderStore = () => {
    const maxSlots = getMaxBusSlots(business);
    const slotsFull = fleet.length >= maxSlots;
    return (
    <View>
      <View style={styles.garageBar}>
        <View style={styles.garageBarInfo}>
          <Text style={styles.garageBarLabel}>{t('courier_garage')}</Text>
          <Text style={[styles.garageBarCount, slotsFull && { color: '#f87171' }]}>{fleet.length}/{maxSlots}</Text>
        </View>
        <View style={styles.garageBarTrack}>
          <View style={[styles.garageBarFill, { width: `${Math.min(100, (fleet.length / maxSlots) * 100)}%`, backgroundColor: slotsFull ? '#f87171' : '#fbbf24' }]} />
        </View>
        {slotsFull && <Text style={styles.garageBarHint}>{t('upg_upgrade_unlock_more')}</Text>}
      </View>
      <Text style={styles.sectionTitle}>{t('bus_store')}</Text>
      {BUS_TYPES.map((type) => {
        const affordable = canAfford(type.cost);
        return (
          <View key={type.id} style={styles.storeCard}>
            <View style={styles.storeImage}>
              <Image
                source={BUS_IMAGES[type.id]}
                style={[styles.storeBusImage, (type.id === 'electricbus' || type.id === 'doubledecker') && styles.storeBusImageShift]}
                resizeMode="contain"
              />
            </View>
            <View style={styles.storeBody}>
              <Text style={styles.storeName}>{type.name}</Text>
              <Text style={styles.storeDesc}>{type.description}</Text>
              <View style={styles.storeStats}>
                <View style={styles.storeStat}>
                  <Text style={styles.storeStatLabel}>{t('bus_base_income')}</Text>
                  <Text style={styles.storeStatValue}>{formatMoney(type.baseHourlyIncome)}/hr</Text>
                </View>
                <View style={styles.storeStat}>
                  <Text style={styles.storeStatLabel}>{t('bus_range')}</Text>
                  <Text style={styles.storeStatValue}>{type.maxMiles.toLocaleString()} mi</Text>
                </View>
                <View style={styles.storeStat}>
                  <Text style={styles.storeStatLabel}>{t('map_happy')}</Text>
                  <Text style={styles.storeStatValue}>+{(type.passengerHappiness * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.storeStat}>
                  <Text style={styles.storeStatLabel}>{t('map_pop')}</Text>
                  <Text style={styles.storeStatValue}>+{(type.popularity * 100).toFixed(0)}%</Text>
                </View>
              </View>
              <Pressable
                style={[styles.buyBtn, !affordable && styles.buyBtnDisabled]}
                onPress={() => handleBuyBus(type)}
                disabled={!affordable}
              >
                <Text style={styles.buyBtnText}>
                  {affordable ? tf('buy_for', { v0: formatMoney(type.cost) }) : t('insufficient_funds')}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
    );
  };

  const polygonPoints = (polyStr) => polyStr.split(' ').map((pt) => pt.split(',').map(Number));

  const polygonCentroid = (polyStr) => {
    const pts = polygonPoints(polyStr);
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x; cy += y; }
    return { x: cx / pts.length, y: cy / pts.length };
  };

  const renderRoutes = () => {
    const totalIncome = getBusHourlyIncome(business);
    const scaledW = CITY_MAP.width * zoom;
    const scaledH = CITY_MAP.height * zoom;
    const availableBuses = fleet.filter((b) => b.milesRemaining > 0 && !b.needsMaintenance);
    return (
      <View>
        {/* Bus selection */}
        <Text style={styles.routeStepLabel}>{t('map_select_bus')}</Text>
        {availableBuses.length === 0 ? (
          <Text style={styles.noBusesText}>{t('alert_no_active_buses')}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.busSelectorScroll} contentContainerStyle={styles.busSelectorContent}>
            {availableBuses.map((bus) => {
              const idx = fleet.indexOf(bus);
              const isSelected = selectedBusIdx === idx;
              const assigned = getBusAssignedDistricts(bus);
              const busType = getBusType(bus.typeId);
              const busIncome = getBusRouteIncome(bus);
              const maxDist = busType?.maxDistricts || 2;
              const distPct = (assigned.length / maxDist) * 100;
              return (
                <Pressable
                  key={bus.instanceId}
                  style={[styles.busCard2, isSelected && styles.busCard2Active]}
                  onPress={() => setSelectedBusIdx(isSelected ? null : idx)}
                >
                  <View style={[styles.busCard2Accent, { backgroundColor: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.1)' }]} />
                  <View style={styles.busCard2Body}>
                    <View style={styles.busCard2Top}>
                      <Text style={styles.busCard2Emoji}>{busType?.emoji || '🚌'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.busCard2Name, isSelected && styles.busCard2NameActive]}>
                          {busType?.name || bus.typeId}
                        </Text>
                        {assigned.length > 0 ? (
                          <Text style={styles.busCard2Income}>{formatMoney(Math.floor(busIncome))}/hr</Text>
                        ) : (
                          <Text style={styles.busCard2Idle}>{t('bus_idle')}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.busCard2Progress}>
                      <View style={styles.busCard2ProgressTrack}>
                        <View style={[styles.busCard2ProgressFill, { width: `${distPct}%`, backgroundColor: isSelected ? '#fbbf24' : '#4ade80' }]} />
                      </View>
                      <Text style={styles.busCard2ProgressLabel}>{assigned.length}/{maxDist}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Map */}
        {selectedBus && (
          <View style={styles.mapSection}>
            <Text style={styles.routeStepLabel}>{t('map_tap_districts')}</Text>

            {/* Map area - fixed height, handles its own touches */}
            <View
              style={styles.mapArea}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <View style={{
                position: 'absolute',
                top: panY,
                left: panX,
                width: scaledW,
                height: scaledH,
              }}>
                <Image
                  source={CITY_MAP.image}
                  style={{ width: scaledW, height: scaledH }}
                  resizeMode="stretch"
                />
                <Svg
                  width={scaledW}
                  height={scaledH}
                  viewBox={`0 0 ${CITY_MAP.width} ${CITY_MAP.height}`}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  {CITY_MAP.districts.map((d) => {
                    const selected = selectedDistricts.includes(d.id);
                    const canAdd = canAddSegment(d.id, selectedDistricts);
                    const meetsReq = busMeetsRequirement(selectedBus.typeId, d.minBusType);
                    const locked = !meetsReq && !selected;
                    const fill = selected
                      ? 'rgba(251,191,36,0.35)'
                      : canAdd && meetsReq
                        ? 'rgba(74,222,128,0.15)'
                        : locked
                          ? 'rgba(248,113,113,0.1)'
                          : 'rgba(0,0,0,0)';
                    const stroke = selected
                      ? '#fbbf24'
                      : canAdd && meetsReq
                        ? 'rgba(74,222,128,0.5)'
                        : locked
                          ? 'rgba(248,113,113,0.4)'
                          : 'rgba(255,255,255,0.15)';
                    const points = polygonPoints(d.polygon).map(([x, y]) => `${x},${y}`).join(' ');
                    const labelPos = polygonCentroid(d.polygon);
                    return (
                      <G key={d.id}>
                        <Polygon
                          points={points}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={selected ? 3 : locked ? 2 : 1.5}
                          onPress={() => handleSegmentTap(d.id)}
                        />
                        {selected && (
                          <SvgText
                            x={labelPos.x}
                            y={labelPos.y}
                            fontSize={16}
                            fontWeight="900"
                            fill="#fbbf24"
                            textAnchor="middle"
                          >
                            {d.name}
                          </SvgText>
                        )}
                        {locked && (
                          <G>
                            <Circle cx={labelPos.x} cy={labelPos.y} r={20} fill="rgba(248,113,113,0.85)" />
                            <Path
                              d={`M ${labelPos.x - 8} ${labelPos.y + 2} L ${labelPos.x - 8} ${labelPos.y - 6} A 8 8 0 0 1 ${labelPos.x + 8} ${labelPos.y - 6} L ${labelPos.x + 8} ${labelPos.y + 2} Z`}
                              fill="rgba(15,23,42,0.95)"
                            />
                            <Rect x={labelPos.x - 10} y={labelPos.y + 2} width={20} height={16} rx={3} fill="rgba(15,23,42,0.95)" />
                          </G>
                        )}
                      </G>
                    );
                  })}
                </Svg>
              </View>
            </View>

            {/* Zoom buttons - outside map touch area */}
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

            {/* Route summary */}
            <View style={styles.routeSummaryCard}>
              <View style={styles.routeSummaryRow}>
                <View>
                  <Text style={styles.routeSummaryLabel}>{t('map_districts_upper')}</Text>
                  <Text style={styles.routeSummaryValue}>{selectedDistricts.length}</Text>
                </View>
                <View>
                  <Text style={styles.routeSummaryLabel}>{t('bus_income_hr')}</Text>
                  <Text style={styles.routeSummaryValue}>{formatMoney(Math.floor(getBusRouteIncome(selectedBus)))}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.routeSummaryLabel}>{t('courier_fleet_total_hr')}</Text>
                  <Text style={[styles.routeSummaryValue, { color: '#4ade80' }]}>{formatMoney(totalIncome)}</Text>
                </View>
              </View>
              {selectedDistricts.length > 0 && (
                <Pressable style={styles.clearRouteBtn} onPress={() => handleCancelRoute(selectedBusIdx)}>
                  <Text style={styles.clearRouteBtnText}>{t('bus_cancel_route')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderActiveRoutes = () => {
    const busesWithRoutes = fleet.filter((b) => getBusAssignedDistricts(b).length > 0);
    if (busesWithRoutes.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Ionicons name="navigate" size={40} color="#475569" />
          <Text style={styles.emptyText}>{t('alert_no_active_routes')}</Text>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.sectionTitle}>{t('bus_active_routes_upper')}</Text>
        {busesWithRoutes.map((bus) => {
          const busType = getBusType(bus.typeId);
          const busColor = bus.color || busType?.color || '#34d399';
          const assigned = getBusAssignedDistricts(bus);
          const routeNames = assigned.map((id) => getDistrictById(id)?.name).filter(Boolean);
          const routeIncome = getBusRouteIncome(bus);
          const milesPct = Math.min(100, Math.max(0, (bus.milesRemaining / bus.maxMiles) * 100));
          const isDegraded = bus.needsMaintenance || bus.milesRemaining <= 0;
          return (
            <View key={bus.instanceId} style={[styles.activeRouteCard, { borderLeftColor: busColor }]}>
              <View style={styles.activeRouteHeader}>
                <Text style={styles.activeRouteEmoji}>{bus.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeRouteName}>{bus.name}</Text>
                  <Text style={styles.activeRouteIncome}>{formatMoney(Math.floor(routeIncome))}/hr</Text>
                </View>
                <View style={[styles.activeRouteStatus, { backgroundColor: isDegraded ? 'rgba(248,113,113,0.15)' : `${busColor}20` }]}>
                  <Text style={[styles.activeRouteStatusText, { color: isDegraded ? '#f87171' : busColor }]}>
                    {isDegraded ? t('bus_status_grounded') : t('bus_status_running')}
                  </Text>
                </View>
              </View>
              <View style={styles.activeRoutePath}>
                <Ionicons name="navigate" size={14} color={busColor} />
                <Text style={styles.activeRoutePathText}>{routeNames.join(' → ')}</Text>
              </View>
              <View style={styles.activeRouteBar}>
                <View style={styles.activeRouteBarTrack}>
                  <View style={[styles.activeRouteBarFill, { width: `${milesPct}%`, backgroundColor: isDegraded ? '#f87171' : busColor }]} />
                </View>
                <Text style={styles.activeRouteBarLabel}>{Math.floor(bus.milesRemaining).toLocaleString()} mi left</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

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
    const levelMult = getBusLevelMultiplier(business);
    const nextLevelMult = Math.pow(1.12, business.level);
    const incomeMultPct = Math.round((levelMult - 1) * 100);
    const nextMultPct = Math.round((nextLevelMult - 1) * 100);

    const handleUpgrade = guard(() => {
      if (money < upgradeCost) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify(tf('alert_insufficient_funds'), tf('msg_96705', { v0: formatMoney(upgradeCost) }));
        return;
      }
      const upgraded = upgradeBusiness(business);
      if (!upgraded) return;
      onBusUpdate(upgraded, money - upgradeCost);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      notify(tf('upg_started'), tf('msg_18978', { v0: upgradeName }));
    });

    const handlePayTax = guard(() => {
      if (money < owed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify(tf('alert_insufficient_funds'), tf('msg_18310', { v0: formatMoney(owed) }));
        return;
      }
      const paid = payTax(business);
      onBusUpdate(paid, money - owed);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      notify(tf('tax_paid'), tf('msg_34964', { v0: formatMoney(owed) }));
    });

    return (
      <View>
        <Text style={styles.sectionTitle}>{t('tax_section')}</Text>
        <View style={[styles.finCard, suspended && styles.finCardDanger]}>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('status')}</Text>
            <Text style={[styles.finValue, suspended && { color: '#f87171' }]}>{suspended ? t('bus_status_suspended') : t('active')}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('tax_rate')}</Text>
            <Text style={styles.finValue}>{(getBusinessTaxRate({ type: 'bus' }) * 100).toFixed(0)}% Commercial</Text>
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
            <Text style={styles.finLabel}>{t('upg_bus_slots')}</Text>
            <Text style={styles.finValue}>{getMaxBusSlots(business)} max</Text>
          </View>
          {!maxed && (
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>{t('upg_next_level')}</Text>
              <Text style={[styles.finValue, { color: '#94a3b8' }]}>+{nextMultPct}% · {getMaxBusSlots({ ...business, level: business.level + 1 })} slots</Text>
            </View>
          )}
          <View style={styles.finUpgradeBox}>
            <Text style={styles.finUpgradeName}>{maxed ? t('fully_upgraded') : upgradeName}</Text>
            {upgrading && <UpgradeProgress business={business} onSkip={() => startWatchAdForUpgrade()} />}
            {!maxed && !upgrading && (
              <Pressable
                style={[styles.finUpgradeBtn, !canUpgrade && styles.finUpgradeBtnDisabled]}
                onPress={handleUpgrade}
                disabled={!canUpgrade}
              >
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
            <Text style={styles.finLabel}>{t('fin_fleet_value')}</Text>
            <Text style={styles.finValue}>{formatMoney((business.fleet || []).reduce((s, b) => s + (b.cost || 0), 0))}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('staff')}</Text>
            <Text style={styles.finValue}>{drivers.length} drivers</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.finValue, { color: '#f87171' }]}>{formatMoney(driverPayroll)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fbbf24" />
        </Pressable>
        <Text style={styles.headerTitle}>{business.name}</Text>
        <Pressable style={{ width: 40, alignItems: 'center' }} onPress={onOpenSettings}>
          <Ionicons name="settings" size={20} color="#fbbf24" />
        </Pressable>
      </View>
      {renderTabs()}
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={!isMapTouching}>
        {tab === 'fleet' && renderFleet()}
        {tab === 'store' && renderStore()}
        {tab === 'routes' && (
          <>
            <View style={styles.subTabBar}>
              <Pressable
                style={[styles.subTab, routeSubTab === 'map' && styles.subTabActive]}
                onPress={() => setRouteSubTab('map')}
              >
                <Ionicons name="map" size={12} color={routeSubTab === 'map' ? '#000' : '#64748b'} />
                <Text style={[styles.subTabText, routeSubTab === 'map' && styles.subTabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('map_route_map')}</Text>
              </Pressable>
              <Pressable
                style={[styles.subTab, routeSubTab === 'active' && styles.subTabActive]}
                onPress={() => setRouteSubTab('active')}
              >
                <Ionicons name="navigate" size={12} color={routeSubTab === 'active' ? '#000' : '#64748b'} />
                <Text style={[styles.subTabText, routeSubTab === 'active' && styles.subTabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('map_active_routes')}</Text>
              </Pressable>
            </View>
            {routeSubTab === 'map' && renderRoutes()}
            {routeSubTab === 'active' && renderActiveRoutes()}
          </>
        )}
        {tab === 'staff' && renderStaff()}
        {tab === 'finance' && renderFinances()}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Bus detail modal */}
      {detailBus && (
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={() => setDetailBusId(null)} />
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailEmoji}>{detailBus.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{detailBus.name}</Text>
                <Text style={styles.detailStatus}>
                  {!isBusDelivered(detailBus)
                    ? tf('bus_in_transit', { v0: formatDeliveryTime(getBusDeliveryTimeRemaining(detailBus)) })
                    : detailBus.needsMaintenance || detailBus.milesRemaining <= 0
                    ? t('bus_needs_maintenance')
                    : t('active')}
                </Text>
              </View>
              <Pressable onPress={() => setDetailBusId(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} showsVerticalScrollIndicator={false}>

            {BUS_IMAGES[detailBus.typeId] && (
              <Image
                source={BUS_IMAGES[detailBus.typeId]}
                style={styles.detailBusImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>{t('bus_miles_remaining')}</Text>
              <Text style={styles.detailValue}>
                {Math.floor(detailBus.milesRemaining).toLocaleString()} / {detailBus.maxMiles.toLocaleString()}
              </Text>
              <View style={styles.detailHealthBar}>
                <View style={[styles.detailHealthFill, {
                  width: `${Math.min(100, Math.max(0, (detailBus.milesRemaining / detailBus.maxMiles) * 100))}%`,
                  backgroundColor: detailBus.milesRemaining / detailBus.maxMiles > 0.3 ? '#34d399' : '#f87171',
                }]} />
              </View>
            </View>

            <View style={styles.detailStatsGrid}>
              <View style={styles.detailStatBox}>
                <Text style={styles.detailStatLabel}>{t('income')}</Text>
                <Text style={styles.detailStatValue}>{formatMoney(getBusCurrentIncomeHourly(detailBus, business))}/hr</Text>
              </View>
              <View style={styles.detailStatBox}>
                <Text style={styles.detailStatLabel}>{t('map_happiness')}</Text>
                <Text style={styles.detailStatValue}>+{(detailBus.passengerHappiness * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.detailStatBox}>
                <Text style={styles.detailStatLabel}>{t('map_popularity')}</Text>
                <Text style={styles.detailStatValue}>+{(detailBus.popularity * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.detailStatBox}>
                <Text style={styles.detailStatLabel}>{t('map_districts')}</Text>
                <Text style={styles.detailStatValue}>{getBusAssignedDistricts(detailBus).length}/{getBusType(detailBus.typeId)?.maxDistricts || 2}</Text>
              </View>
            </View>

            {isBusDelivered(detailBus) && (
              <View style={styles.detailMaintSection}>
                <Text style={styles.detailMaintLabel}>{t('bus_driver')}</Text>
                {(() => {
                  const assignedDriver = drivers.find((d) => d.id === detailBus.assignedDriverId);
                  const unassignedDrivers = drivers.filter((d) => !fleet.some((b) => b.assignedDriverId === d.id));
                  if (assignedDriver) {
                    return (
                      <View style={styles.driverAssignRow}>
                        <Ionicons name={assignedDriver.gender === 'female' ? 'woman' : 'man'} size={20} color={assignedDriver.gender === 'female' ? '#ec4899' : '#3b82f6'} />
                        <Text style={styles.driverAssignName}>{assignedDriver.name}</Text>
                        <Pressable style={styles.driverUnassignBtn} onPress={() => handleUnassignDriver(detailBus.instanceId)}>
                          <Text style={styles.driverUnassignBtnText}>{t('courier_unassign')}</Text>
                        </Pressable>
                      </View>
                    );
                  }
                  if (unassignedDrivers.length === 0) {
                    return <Text style={styles.driverNoneText}>{t('alert_no_available_drivers')}</Text>;
                  }
                  return (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.driverPickerRow}>
                      {unassignedDrivers.map((d) => (
                        <Pressable key={d.id} style={styles.driverChip} onPress={() => handleAssignDriver(detailBus.instanceId, d.id)}>
                          <Ionicons name={d.gender === 'female' ? 'woman' : 'man'} size={12} color={d.gender === 'female' ? '#ec4899' : '#3b82f6'} />
                          <Text style={styles.driverChipText}>{d.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  );
                })()}
              </View>
            )}

            {isBusDelivered(detailBus) && (
              <View style={styles.detailMaintSection}>
                <Text style={styles.detailMaintLabel}>{t('fin_insurance')}</Text>
                {detailBus.insured ? (
                  <Text style={styles.driverAssignName}>Insured - {formatMoney(getInsuranceDailyCost(detailBus))}/day (75% payout on scrap)</Text>
                ) : (
                  <>
                    <Text style={styles.driverNoneText}>
                      {canInsureBus(detailBus)
                        ? `Insure for ${formatMoney(getInsuranceDailyCost(detailBus))}/day. Pays 75% of bus value if scrapped.`
                        : `Health must be above ${Math.round(INSURANCE_HEALTH_THRESHOLD * 100)}% to insure.`}
                    </Text>
                    <Pressable
                      style={[styles.detailMaintBtn, !canInsureBus(detailBus) && styles.detailMaintBtnDisabled]}
                      onPress={() => handleBuyInsurance(detailBus)}
                      disabled={!canInsureBus(detailBus)}
                    >
                      <Text style={styles.detailMaintBtnText}>{t('bus_buy_insurance')}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {isBusDelivered(detailBus) && (
              <View style={styles.detailMaintSection}>
                <Text style={styles.detailMaintLabel}>Maintenance Cost: {formatMoney(getMaintenanceCost(detailBus))}</Text>
                {(() => {
                  const milesPct = detailBus.maxMiles > 0 ? detailBus.milesRemaining / detailBus.maxMiles : 0;
                  const scrapChance = Math.max(0, 0.3 * (1 - milesPct));
                  const scrapPct = Math.round(scrapChance * 100);
                  return (
                    <Text style={[styles.detailScrapChance, scrapPct > 15 ? { color: '#f87171' } : { color: '#4ade80' }]}>
                      {tf('scrap_risk', { v0: scrapPct })}{scrapPct === 0 ? t('scrap_safe') : scrapPct < 15 ? t('scrap_low') : scrapPct < 25 ? t('scrap_moderate') : t('scrap_high')}
                    </Text>
                  );
                })()}
                <Pressable
                  style={[styles.detailMaintBtn, money < getMaintenanceCost(detailBus) && styles.detailMaintBtnDisabled]}
                  onPress={() => handleMaintain(detailBus)}
                  disabled={money < getMaintenanceCost(detailBus)}
                >
                  <Text style={styles.detailMaintBtnText}>
                    {money < getMaintenanceCost(detailBus) ? t('alert_insufficient_funds') : t('send_to_maintenance')}
                  </Text>
                </Pressable>
              </View>
            )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Ad overlay */}

      <TeamRosterModal
        visible={showTeamRoster}
        onClose={() => setShowTeamRoster(false)}
        staffMembers={drivers}
        accentColor="#60a5fa"
        onFire={(m) => { onBusUpdate(fireBusDriver(business, m.id)); }}
        onRaise={(m) => { onBusUpdate(raiseBusDriver(business, m.id)); }}
        onTrain={(m) => { onBusUpdate(trainBusDriver(business, m.id)); }}
      />

      {/* Dropdown notifications - last child so it renders on top */}
      <View style={styles.notifContainer} pointerEvents="none">
        {notifications.map((n) => (
          <View key={n.id} style={[styles.notif, n.type === 'warning' ? styles.notifWarning : n.type === 'success' ? styles.notifSuccess : styles.notifError]}>
            <Ionicons name={n.type === 'warning' ? 'warning' : n.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color={n.type === 'warning' ? '#fbbf24' : n.type === 'success' ? '#4ade80' : '#f87171'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              <Text style={styles.notifMessage}>{n.message}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fbbf24',
  },
  tabText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  tabTextActive: {
    color: '#000',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: '#fbbf24',
  },
  subTabText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  subTabTextActive: {
    color: '#000',
  },
  content: {
    paddingBottom: 120,
  },
  sectionTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 1.5, marginTop: 18, marginBottom: 10 },
  slotBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    marginBottom: 14,
  },
  slotBarText: {
    fontSize: 12,
    color: '#fbbf24',
    fontWeight: '700',
  },
  // Garage bar (matches courier style)
  garageBar: { marginBottom: 16, paddingHorizontal: 4 },
  garageBarInfo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  garageBarLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  garageBarCount: { fontSize: 16, fontWeight: '800', color: '#fff' },
  garageBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  garageBarFill: { height: '100%', borderRadius: 3 },
  garageBarHint: { fontSize: 11, color: '#f87171', fontWeight: '600', marginTop: 6 },
  overviewCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  overviewLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  overviewValue: { fontSize: 42, fontWeight: '900', color: '#fff', marginBottom: 6 },
  overviewSub: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  incomeBreakdown: { width: '100%', marginTop: 14, marginBottom: 14, paddingHorizontal: 20 },
  incomeBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  incomeBreakdownLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  incomeBreakdownValue: { fontSize: 13, fontWeight: '700' },
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  staffGridItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  staffGridLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  staffGridValue: { fontSize: 16, color: '#fff', fontWeight: '700' },
  hireProgressCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  hireProgressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  hireProgressInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hireProgressLabel: { fontSize: 13, color: '#fff', fontWeight: '700' },
  hireProgressTime: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  hireProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  hireProgressBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#38bdf8' },
  hireSkipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  hireSkipBtnText: { fontSize: 11, color: '#fbbf24', fontWeight: '700' },
  hireRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  hireBtn: { flex: 1, backgroundColor: 'rgba(56,189,248,0.12)', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)' },
  hireBtnDisabled: { opacity: 0.4 },
  hireBtnCount: { fontSize: 16, color: '#fff', fontWeight: '800' },
  hireBtnCost: { fontSize: 12, color: '#38bdf8', fontWeight: '700', marginTop: 2 },
  hireBtnTime: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 2 },
  hireHint: { fontSize: 11, color: '#64748b', marginBottom: 16 },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '800',
  },
  routePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  routePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  routePillText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  emptyText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  busCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'visible',
    position: 'relative',
  },
  upperDeck: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upperDeckLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  upperDeckWindows: {
    flex: 1,
    height: 12,
    borderWidth: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  lifeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 8,
    overflow: 'hidden',
  },
  busBody: {
    padding: 16,
    paddingBottom: 8,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  busEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  busName: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '800',
  },
  busMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  busMiles: {
    fontSize: 13,
    fontWeight: '800',
  },
  wheels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 60,
    paddingTop: 4,
    position: 'absolute',
    bottom: -22,
    left: 0,
    right: 0,
  },
  wheel: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    borderWidth: 6,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelHub: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#475569',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  maintenanceBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  maintenanceBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  meterTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  meterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  busStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  busStat: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  driverRowText: { fontSize: 11, fontWeight: '700' },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    zIndex: 10,
  },
  routeInfoText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
    flex: 1,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  deliveryText: {
    fontSize: 13,
    color: '#fbbf24',
    fontWeight: '700',
  },
  busSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    marginLeft: 'auto',
  },
  busSkipBtnText: {
    fontSize: 11,
    color: '#fbbf24',
    fontWeight: '700',
  },
  storeCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  storeImage: {
    height: 220,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storeBusImage: {
    width: '100%',
    height: '100%',
  },
  storeBusImageShift: {
    transform: [{ translateY: 12 }],
  },
  storeBody: {
    padding: 16,
  },
  storeName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 4,
  },
  storeDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 14,
  },
  storeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  storeStat: {
    alignItems: 'center',
  },
  storeStatLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 2,
  },
  storeStatValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  buyBtn: {
    backgroundColor: '#fbbf24',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buyBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  buyBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 15,
  },
  mapLabel: {
    position: 'absolute',
    top: 10,
    left: 12,
    fontSize: 10,
    color: '#475569',
    fontWeight: '800',
    letterSpacing: 1.5,
    zIndex: 10,
  },
  areaLabel: {
    position: 'absolute',
    fontSize: 9,
    color: '#64748b',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 5,
  },
  roadSegment: {
    position: 'absolute',
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roadCenter: {
    height: 0,
    width: '100%',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
  },
  mapDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#000',
  },
  routeLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  routeInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  routeInfoName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 4,
  },
  routeInfoMeta: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
  },
  routeInfoValue: {
    fontSize: 16,
    color: '#4ade80',
    fontWeight: '800',
  },
  routeCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mapSection: {
    marginTop: 14,
  },
  mapArea: {
    height: 420,
    backgroundColor: '#0a0e14',
    overflow: 'hidden',
  },
  zoomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 14,
  },
  zoomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  zoomBtnLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  routeSummaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeSummaryLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  routeSummaryValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
  },
  clearRouteBtn: {
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
  },
  clearRouteBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
  },
  routeStepLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 6,
  },
  noBusesText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 14,
  },
  busSelectorScroll: {
    marginBottom: 16,
  },
  busSelectorContent: {
    gap: 12,
    paddingRight: 16,
  },
  busCard2: {
    width: 180,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  busCard2Active: {
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderColor: 'rgba(251,191,36,0.3)',
  },
  busCard2Accent: {
    height: 4,
    width: '100%',
  },
  busCard2Body: {
    padding: 14,
  },
  busCard2Top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  busCard2Emoji: {
    fontSize: 32,
  },
  busCard2Name: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 2,
  },
  busCard2NameActive: {
    color: '#fbbf24',
  },
  busCard2Income: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '700',
  },
  busCard2Idle: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  busCard2Progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busCard2ProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  busCard2ProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  busCard2ProgressLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  activeRoutesSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  activeRoutesTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  activeRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  activeRouteBus: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    flexShrink: 0,
  },
  activeRouteDistricts: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
    marginLeft: 8,
  },
  activeRouteRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelRouteSmallBtn: {
    padding: 2,
  },
  mapHint: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  activeRouteCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    marginBottom: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  activeRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  activeRouteEmoji: {
    fontSize: 24,
  },
  activeRouteName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '800',
  },
  activeRouteIncome: {
    fontSize: 13,
    color: '#4ade80',
    fontWeight: '700',
    marginTop: 2,
  },
  activeRouteStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeRouteStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeRoutePath: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 10,
  },
  activeRoutePathText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
    flex: 1,
  },
  activeRouteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeRouteBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  activeRouteBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  activeRouteBarLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  finCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  finCardDanger: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  finLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  finValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  finPayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  finPayBtn: { backgroundColor: '#fbbf24', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  finPayBtnText: { fontSize: 12, color: '#000', fontWeight: '800' },
  finUpgradeBox: { marginTop: 8 },
  finUpgradeName: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  finUpgradeBtn: { backgroundColor: '#fbbf24', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  finUpgradeBtnDisabled: { opacity: 0.4 },
  finUpgradeBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },
  notifContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    gap: 8,
  },
  // Ad overlay
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
  notif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.4,
  },
  notifError: {
    backgroundColor: 'rgba(40,15,15,0.95)',
    borderColor: 'rgba(248,113,113,0.5)',
  },
  notifWarning: {
    backgroundColor: 'rgba(40,35,15,0.95)',
    borderColor: 'rgba(251,191,36,0.5)',
  },
  notifSuccess: {
    backgroundColor: 'rgba(15,40,25,0.95)',
    borderColor: 'rgba(74,222,128,0.5)',
  },
  notifTitle: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  detailModal: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailEmoji: {
    fontSize: 36,
  },
  detailName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
  },
  detailStatus: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  detailBusImage: {
    width: '100%',
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  detailSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 8,
  },
  detailHealthBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  detailHealthFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
  },
  detailStatBox: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailStatLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 4,
  },
  detailStatValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '800',
  },
  detailMaintSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  detailMaintLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 6,
  },
  driverAssignRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driverAssignName: { flex: 1, fontSize: 13, color: '#4ade80', fontWeight: '700' },
  driverUnassignBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(248,113,113,0.15)' },
  driverUnassignBtnText: { fontSize: 11, color: '#f87171', fontWeight: '700' },
  driverNoneText: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  driverPickerRow: { flexDirection: 'row' },
  driverChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(56,189,248,0.12)', marginRight: 8 },
  driverChipText: { fontSize: 11, color: '#38bdf8', fontWeight: '700' },
  detailScrapChance: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
  },
  detailMaintBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
  },
  detailMaintBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  detailMaintBtnText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '800',
  },
  spacer: {
    height: 40,
  },
});
