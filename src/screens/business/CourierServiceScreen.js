import { useState, useRef, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import Svg, { G, Polygon, Text as SvgText, Circle, Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf } from '../../data/i18n';
import { showRewardedAd } from '../../data/ads';
import UpgradeProgress from '../../components/UpgradeProgress';
import TeamRosterModal from '../../components/TeamRosterModal';
import {
  CAR_TYPES,
  JOB_TYPES,
  CITY_MAP,
  DISTRICT_PLOTS,
  getCarType,
  getCarTier,
  getJobType,
  getMaxCarSlots,
  getActiveCars,
  getCarLevelMultiplier,
  isCarDelivered,
  getCarDeliveryTimeRemaining,
  buyCar,
  canBuyCarType,
  maintainCar,
  getMaintenanceCost,
  getDrivers,
  hireDrivers,
  completeHiredDrivers,
  instantHireDriver,
  assignCarDriver,
  unassignCarDriver,
  fireDriver,
  raiseDriver, trainDriver,
  getHireTimeRemaining,
  getHiringCount,
  canHireMore,
  getCarAssignedZones,
  canAddZone,
  canRemoveZone,
  toggleCarZone,
  setCarJobType,
  getCarHourlyIncome,
  getCarActualIncomeHourly,
  getCarRevenueHourly,
  getCarPayrollHourly,
  getCarInsuranceCostHourly,
  getCarHealthPct,
  canInsureCar,
  getInsuranceDailyCost,
  buyCarInsurance,
  isDistrictOwned,
  isDistrictUnlocked,
  getDistrictUnlockStatus,
  buyDistrict,
  getOwnedDistricts,
  formatDeliveryTime,
  STAFF_HIRE_COST,
  STAFF_SALARY_HOURLY,
  STAFF_HIRE_MIN_MS,
  STAFF_HIRE_MAX_MS,
  MAX_HIRING_AT_ONCE,
  INSURANCE_DAILY_RATE,
  INSURANCE_HEALTH_THRESHOLD,
  INSURANCE_SCRAP_REFUND_RATE,
  ZONE_JOB_MULTIPLIERS,
  getDistrictById,
} from '../../data/courier';
import { COURIER_IMAGES } from '../../data/courier_images';
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
import { formatMoney } from '../../data/market';

const { width: screenW } = Dimensions.get('window');

const polygonPoints = (polyStr) => polyStr.split(' ').map((pt) => pt.split(',').map(Number));
const polygonCentroid = (polyStr) => {
  const pts = polygonPoints(polyStr);
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  return { x: cx / pts.length, y: cy / pts.length };
};

export default function CourierServiceScreen({ business, money, boostExpiresAt, onBack, onOpenSettings, onCourierUpdate }) {
  useLanguage();
  const [tab, setTab] = useState('fleet');
  const [detailCarId, setDetailCarId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const [, setTick] = useState(0);
  const [showTeamRoster, setShowTeamRoster] = useState(false);
  // Map state
  const MAP_VIEW_H = 420;
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
  const [isMapTouching, setIsMapTouching] = useState(false);
  const [selectedCarIdx, setSelectedCarIdx] = useState(null);
  const [mapSubTab, setMapSubTab] = useState('map');

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
  const onCourierUpdateRef = useRef(onCourierUpdate);
  onCourierUpdateRef.current = onCourierUpdate;

  const notify = useCallback((title, message, type = 'error') => {
    const id = notifIdRef.current++;
    setNotifications((prev) => [...prev, { id, title, message, type }].slice(-2));
    later(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const biz = businessRef.current;
      const hiring = biz.hiringStaff || [];
      if (hiring.length === 0) return;
      const now = Date.now();
      const completed = hiring.filter((h) => h.completesAt <= now);
      if (completed.length > 0) {
        const updated = completeHiredDrivers(biz);
        onCourierUpdateRef.current(updated, moneyRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(t('staff_ready'), `${completed.length} new driver${completed.length > 1 ? 's' : ''} joined!`, 'success');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  const fleet = business.fleet || [];
  const detailCar = detailCarId ? fleet.find((c) => c.instanceId === detailCarId) : null;
  const income = getCarHourlyIncome(business);
  const suspended = isSuspended(business);
  const revenue = getCarRevenueHourly(business);
  const payroll = getCarPayrollHourly(business);
  const insuranceCost = getCarInsuranceCostHourly(business);
  const maxSlots = getMaxCarSlots(business);
  const drivers = getDrivers(business);
  const hiringDrivers = business.hiringStaff || [];
  const activeCarCount = getActiveCars(business);
  const inTransitCars = fleet.filter((c) => !isCarDelivered(c));
  const ownedDistricts = getOwnedDistricts(business);

  const canAfford = (cost) => money >= cost;
  const selectedCar = selectedCarIdx != null ? fleet[selectedCarIdx] : null;

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

  const handleBuyCar = guard((type) => {
    if (fleet.length >= maxSlots) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('bus_garage_full'), tf('msg_09453', { v0: fleet.length, v1: maxSlots }));
      return;
    }
    if (!canBuyCarType(business, type.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const districtNames = type.requiresDistrict?.map((d) => DISTRICT_PLOTS[d]?.name).join(' or ');
      notify(tf('map_district_required'), tf('msg_26214', { v0: districtNames }), 'warning');
      return;
    }
    if (!canAfford(type.cost)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_40436', { v0: formatMoney(type.cost), v1: type.name }));
      return;
    }
    const updated = buyCar(business, type.id);
    onCourierUpdate(updated, money - type.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('courier_vehicle_ordered'), tf('msg_15615', { v0: type.name }), 'warning');
  });

  const handleBuyDistrict = guard((districtId) => {
    const plot = DISTRICT_PLOTS[districtId];
    if (!plot) return;
    if (isDistrictOwned(business, districtId)) return;
    if (!isDistrictUnlocked(business, districtId)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const status = getDistrictUnlockStatus(business, districtId);
      notify(t('courier_locked'), status.reasons.length > 0 ? status.reasons.join(', ') : t('map_requirements_not_met'), 'warning');
      return;
    }
    if (!canAfford(plot.cost)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_40075', { v0: formatMoney(plot.cost), v1: plot.name }));
      return;
    }
    const updated = buyDistrict(business, districtId);
    if (!updated) return;
    onCourierUpdate(updated, money - plot.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('map_district_purchased'), tf('msg_18507', { v0: plot.name }), 'success');
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
    const updated = hireDrivers(business, count);
    if (!updated) return;
    onCourierUpdate(updated, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('staff_hiring_drivers'), tf('msg_65801', { v0: count, v1: count > 1 ? 's' : '' }), 'success');
  });

  const startWatchAdViaAdmob = (target) => { showRewardedAd(() => finishWatchAd(target)); };
  const startWatchAdForHire = (hireId) => { startWatchAdViaAdmob(`hire:${hireId}`); };
  const startWatchAdForCar = (instanceId) => { startWatchAdViaAdmob(`car:${instanceId}`); };
  const startWatchAdForUpgrade = () => { startWatchAdViaAdmob('upgrade'); };
  const finishWatchAd = guard((passedTarget) => {if (!passedTarget) return;
    if (passedTarget.startsWith('hire:')) {
      const hireId = passedTarget.slice(5);
      const updated = instantHireDriver(business, hireId);
      onCourierUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('staff_hired'), t('staff_new_driver_instant'), 'success');
    } else if (passedTarget.startsWith('car:')) {
      const instanceId = passedTarget.slice(4);
      const updated = {
        ...business,
        fleet: (business.fleet || []).map((c) =>
          c.instanceId === instanceId ? { ...c, deliveredAt: Date.now() } : c
        ),
      };
      onCourierUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const car = (business.fleet || []).find((c) => c.instanceId === instanceId);
      notify(tf('courier_vehicle_delivered'), tf('msg_99630', { v0: car?.name || t('fallback_vehicle') }), 'success');
    } else if (passedTarget === 'upgrade') {
      const updated = completeUpgradeNow(business);
      onCourierUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('upg_complete'), t('upg_business_upgraded'), 'success');
    }
    });
  const handleZoneTap = (zoneId) => {
    if (!selectedCar) return;
    handleToggleZone(selectedCar.instanceId, zoneId);
  };

  const handleToggleZone = (instanceId, zoneId) => {
    const car = fleet.find((c) => c.instanceId === instanceId);
    if (!car) return;
    const currentZones = getCarAssignedZones(car);
    const isAssigned = currentZones.includes(zoneId);
    const carType = getCarType(car.typeId);
    if (!isAssigned) {
      if (!isDistrictOwned(business, zoneId)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify(tf('map_district_not_owned'), tf('msg_02399', { v0: getDistrictById(zoneId)?.name }), 'warning');
        return;
      }
      if (currentZones.length >= (carType?.maxZones || 2)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify(tf('map_max_zones_reached'), tf('msg_53417', { v0: carType?.name, v1: carType?.maxZones || 2 }), 'warning');
        return;
      }
      if (!canAddZone(business, zoneId, currentZones)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify(t('map_not_adjacent'), t('map_adjacent_warning'), 'warning');
        return;
      }
    } else {
      if (!canRemoveZone(zoneId, currentZones)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify(t('courier_cannot_remove'), t('map_disconnect_warning'), 'warning');
        return;
      }
    }
    const updated = toggleCarZone(business, instanceId, zoneId);
    onCourierUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify(
      isAssigned ? t('alert_zone_removed') : t('alert_zone_assigned'),
      isAssigned
        ? tf('msg_zone_removed_from', { v0: getDistrictById(zoneId)?.name, v1: carType?.name })
        : tf('msg_zone_assigned_to', { v0: getDistrictById(zoneId)?.name, v1: carType?.name }),
      'success'
    );
  };

  const handleClearZones = () => {
    if (!selectedCar) return;
    const updated = {
      ...business,
      fleet: business.fleet.map((c) =>
        c.instanceId === selectedCar.instanceId ? { ...c, assignedZones: [] } : c
      ),
    };
    onCourierUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSetJobType = (instanceId, jobType) => {
    const updated = setCarJobType(business, instanceId, jobType);
    onCourierUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify(tf('courier_job_type_set'), tf('msg_12668', { v0: getJobType(jobType)?.name }), 'success');
  };

  const handleAssignDriver = (carInstanceId, driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    const car = fleet.find((c) => c.instanceId === carInstanceId);
    const updated = assignCarDriver(business, carInstanceId, driverId);
    onCourierUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify(tf('bus_driver_assigned'), tf('msg_73227', { v0: driver?.name || t('fallback_driver'), v1: car?.name || t('fallback_the_vehicle') }), 'success');
  };

  const handleUnassignDriver = (carInstanceId) => {
    const car = fleet.find((c) => c.instanceId === carInstanceId);
    const driver = drivers.find((d) => d.id === car?.assignedDriverId);
    const updated = unassignCarDriver(business, carInstanceId);
    onCourierUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify(tf('bus_driver_unassigned'), tf('msg_33585', { v0: driver?.name || t('fallback_driver'), v1: car?.name || t('fallback_the_vehicle') }), 'warning');
  };

  const handleBuyInsurance = guard((car) => {
    if (!canInsureCar(car)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('bus_cannot_insure'), tf('msg_62217', { v0: Math.round(INSURANCE_HEALTH_THRESHOLD * 100) }));
      return;
    }
    const updated = buyCarInsurance(business, car.instanceId);
    onCourierUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('bus_insured'), tf('msg_97239', { v0: car.name, v1: formatMoney(getInsuranceDailyCost(car)) }), 'success');
  });

  const handleMaintain = guard((instanceId) => {
    const car = fleet.find((c) => c.instanceId === instanceId);
    if (!car) return;
    const cost = getMaintenanceCost(car);
    if (!canAfford(cost)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_47360', { v0: formatMoney(cost) }));
      return;
    }
    const { business: updated, refund, scrapped } = maintainCar(business, instanceId);
    const newMoney = money - cost + refund;
    onCourierUpdate(updated, newMoney);
    setDetailCarId(null);
    if (scrapped) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('courier_vehicle_scrapped'), tf('msg_40388', { v0: car.name, v1: formatMoney(refund) }), 'warning');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      notify(tf('bus_maintained'), tf('msg_56581', { v0: car.name }), 'success');
    }
  });

  // ─── Tabs ───
  const renderTabs = () => (
    <View style={styles.tabBar}>
      {[
        { id: 'fleet', label: t('tab_fleet'), icon: 'car-sport' },
        { id: 'map', label: t('tab_map'), icon: 'map' },
        { id: 'store', label: t('tab_store'), icon: 'storefront' },
        { id: 'staff', label: t('tab_staff'), icon: 'people' },
        { id: 'finance', label: t('tab_finance'), icon: 'card' },
      ].map((tabItem) => {
        const active = tab === tabItem.id;
        return (
          <Pressable key={tabItem.id} style={[styles.tab, active && styles.tabActive]} onPress={() => { setTab(tabItem.id); setSelectedCarIdx(null); }}>
            <Ionicons name={tabItem.icon} size={13} color={active ? '#000' : '#64748b'} />
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{tabItem.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  // ─── Fleet tab ───
  const renderFleet = () => (
    <View>
      <View style={styles.overviewCard}>
        <Text style={styles.overviewLabel}>{t('fin_net_income_hr')}</Text>
        <Text style={[styles.overviewValue, (income < 0 || suspended) && { color: '#ef4444' }]}>{formatMoney(income)}</Text>
        {suspended && <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>{t('fin_suspended')}</Text>}
        <View style={styles.incomeBreakdown}>
          <View style={styles.incomeBreakdownRow}>
            <Text style={styles.incomeBreakdownLabel}>{t('fin_fleet_revenue')}</Text>
            <Text style={[styles.incomeBreakdownValue, { color: '#4ade80' }]}>{formatMoney(revenue)}</Text>
          </View>
          <View style={styles.incomeBreakdownRow}>
            <Text style={styles.incomeBreakdownLabel}>{t('fin_driver_payroll')}</Text>
            <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(payroll)}</Text>
          </View>
          <View style={styles.incomeBreakdownRow}>
            <Text style={styles.incomeBreakdownLabel}>{t('fin_insurance')}</Text>
            <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(Math.floor(insuranceCost))}</Text>
          </View>
        </View>
        <Text style={styles.overviewSub}>Level {business.level} / 30 - {fleet.length}/{maxSlots} vehicles - {inTransitCars.length} in transit</Text>
      </View>

      <View style={styles.garageBar}>
        <View style={styles.garageBarInfo}>
          <Text style={styles.garageBarLabel}>{t('courier_garage')}</Text>
          <Text style={[styles.garageBarCount, fleet.length >= maxSlots && { color: '#f87171' }]}>{fleet.length}/{maxSlots}</Text>
        </View>
        <View style={styles.garageBarTrack}>
          <View style={[styles.garageBarFill, { width: `${Math.min(100, (fleet.length / maxSlots) * 100)}%`, backgroundColor: fleet.length >= maxSlots ? '#f87171' : '#38bdf8' }]} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('courier_your_vehicles')}</Text>
      {fleet.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="car-sport" size={40} color="#475569" />
          <Text style={styles.emptyText}>{t('alert_no_vehicles_store')}</Text>
        </View>
      )}

      <View style={styles.carGrid}>
        {fleet.map((car) => {
          const carType = getCarType(car.typeId);
          const milesPct = Math.min(100, Math.max(0, (car.milesRemaining / car.maxMiles) * 100));
          const isDegraded = car.milesRemaining <= 0 || car.needsMaintenance;
          const carColor = car.color || carType?.color || '#34d399';
          const healthColor = isDegraded ? '#f87171' : carColor;
          const delivered = isCarDelivered(car);
          const zones = getCarAssignedZones(car);
          const zoneNames = zones.map((z) => getDistrictById(z)?.name).filter(Boolean);
          const driver = drivers.find((d) => d.id === car.assignedDriverId);

          return (
            <Pressable
              key={car.instanceId}
              style={[styles.carCard, { borderColor: carColor, opacity: delivered ? 1 : 0.6 }]}
              onPress={() => delivered && setDetailCarId(car.instanceId)}
            >
              <View
                style={[
                  styles.carLifeFill,
                  {
                    width: `${milesPct}%`,
                    backgroundColor: isDegraded ? 'rgba(248,113,113,0.22)' : `${carColor}33`,
                  },
                ]}
              />
              <View style={styles.carCardBody}>
                <View style={styles.carCardHeader}>
                  {COURIER_IMAGES[car.typeId] ? (
                    <Image source={COURIER_IMAGES[car.typeId]} style={styles.carCardImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.carCardEmoji}>{car.emoji}</Text>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.carCardName} numberOfLines={1}>{car.name}</Text>
                    <Text style={styles.carCardMeta}>{Math.floor(car.milesRemaining).toLocaleString()} / {car.maxMiles.toLocaleString()} mi</Text>
                  </View>
                  <Text style={[styles.carCardMiles, { color: healthColor }]}>{Math.floor(milesPct)}%</Text>
                </View>
                {delivered ? (
                  <>
                    <View style={styles.carCardStats}>
                      <Text style={styles.carCardStat}>{formatMoney(getCarActualIncomeHourly(car, business))}/hr</Text>
                      <Text style={styles.carCardStat}>{zoneNames.length} zones</Text>
                      <Text style={styles.carCardStat}>{isDegraded ? t('maint_short') : t('active')}</Text>
                    </View>
                    <View style={styles.driverRow}>
                      <Ionicons name={driver?.gender === 'female' ? 'woman' : 'man'} size={12} color={driver ? (driver.gender === 'female' ? '#ec4899' : '#3b82f6') : '#f87171'} />
                      <Text style={[styles.driverRowText, { color: driver ? '#4ade80' : '#f87171' }]}>
                        {driver ? driver.name : t('no_driver_assigned')}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.carCardTransitRow}>
                    <Ionicons name="time" size={12} color="#fbbf24" />
                    <Text style={styles.carCardTransitText}>{formatDeliveryTime(getCarDeliveryTimeRemaining(car))}</Text>
                    <Pressable style={styles.carCardSkipBtn} onPress={() => startWatchAdForCar(car.instanceId)}>
                      <Ionicons name="play-circle" size={11} color="#fbbf24" />
                      <Text style={styles.carCardSkipBtnText}>{t('ad_label')}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
              {delivered && zoneNames.length > 0 && (
                <View style={styles.carCardZoneRow}>
                  <Ionicons name="location" size={10} color={carColor} />
                  <Text style={styles.carCardZoneText} numberOfLines={1}>{zoneNames.join(', ')}</Text>
                </View>
              )}
              {delivered && car.insured && (
                <View style={styles.carCardInsuredRow}>
                  <Ionicons name="shield-checkmark" size={10} color="#4ade80" />
                  <Text style={styles.carCardInsuredText}>{t('bus_insured')}</Text>
                </View>
              )}
              <View style={styles.carCardWheels}>
                <View style={[styles.carCardWheel, { borderColor: `${carColor}88` }]}>
                  <View style={[styles.carCardWheelHub, { backgroundColor: `${carColor}66` }]} />
                </View>
                <View style={[styles.carCardWheel, { borderColor: `${carColor}88` }]}>
                  <View style={[styles.carCardWheelHub, { backgroundColor: `${carColor}66` }]} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  // ─── Map tab: district purchase + multi-zone vehicle assignment on the actual map ───
  const renderMap = () => {
    const scaledW = CITY_MAP.width * zoom;
    const scaledH = CITY_MAP.height * zoom;

    const handleDistrictTap = (d) => {
      if (!isDistrictOwned(business, d.id)) {
        handleBuyDistrict(d.id);
        return;
      }
      if (selectedCar) {
        handleZoneTap(d.id);
      }
    };

    return (
      <View>
        {/* Vehicle selector */}
        <Text style={styles.routeStepLabel}>{t('map_select_vehicle_zones')}</Text>
        {fleet.length === 0 ? (
          <Text style={styles.noBusesText}>{t('alert_no_vehicles_store_buy')}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.busSelectorScroll} contentContainerStyle={styles.busSelectorContent}>
            {fleet.map((car) => {
              const idx = fleet.indexOf(car);
              const isSelected = selectedCarIdx === idx;
              const carType = getCarType(car.typeId);
              const zones = getCarAssignedZones(car);
              const zoneNames = zones.map((z) => getDistrictById(z)?.name).filter(Boolean);
              const delivered = isCarDelivered(car);
              const jobType = car.activeJobType || carType?.jobTypes[0] || 'food';
              const job = getJobType(jobType);
              const carIncome = getCarActualIncomeHourly(car, business);
              const maxZones = carType?.maxZones || 2;
              const zonePct = (zones.length / maxZones) * 100;
              return (
                <Pressable
                  key={car.instanceId}
                  style={[styles.carSelectCard, isSelected && styles.carSelectCardActive]}
                  onPress={() => setSelectedCarIdx(isSelected ? null : idx)}
                >
                  <View style={[styles.carSelectAccent, { backgroundColor: isSelected ? '#38bdf8' : 'rgba(255,255,255,0.1)' }]} />
                  <View style={styles.carSelectBody}>
                    <View style={styles.carSelectTop}>
                      {COURIER_IMAGES[car.typeId] ? (
                        <Image source={COURIER_IMAGES[car.typeId]} style={styles.carSelectImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.carSelectEmoji}>{car.emoji}</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.carSelectName, isSelected && styles.carSelectNameActive]}>
                          {carType?.name || car.typeId}
                        </Text>
                        {!delivered ? (
                          <Text style={styles.carSelectTransit}>{tf('bus_in_transit', { v0: formatDeliveryTime(getCarDeliveryTimeRemaining(car)) })}</Text>
                        ) : zones.length > 0 ? (
                          <Text style={styles.carSelectIncome}>{formatMoney(Math.floor(carIncome))}/hr</Text>
                        ) : (
                          <Text style={styles.carSelectIdle}>{t('bus_idle')}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.carSelectProgress}>
                      <View style={styles.carSelectProgressTrack}>
                        <View style={[styles.carSelectProgressFill, { width: `${zonePct}%`, backgroundColor: isSelected ? '#38bdf8' : '#4ade80' }]} />
                      </View>
                      <Text style={styles.carSelectProgressLabel}>{zones.length}/{maxZones}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.mapSection}>
          <Text style={styles.routeStepLabel}>{t('map_tap_district_buy')}</Text>

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
                  const owned = isDistrictOwned(business, d.id);
                  const status = getDistrictUnlockStatus(business, d.id);
                  const assignedZones = selectedCar ? getCarAssignedZones(selectedCar) : [];
                  const assigned = assignedZones.includes(d.id);
                  const plot = DISTRICT_PLOTS[d.id];
                  const fill = assigned
                    ? 'rgba(56,189,248,0.4)'
                    : owned
                      ? 'rgba(74,222,128,0.12)'
                      : status.unlocked
                        ? 'rgba(251,191,36,0.15)'
                        : 'rgba(248,113,113,0.08)';
                  const stroke = assigned
                    ? '#38bdf8'
                    : owned
                      ? 'rgba(74,222,128,0.4)'
                      : status.unlocked
                        ? 'rgba(251,191,36,0.5)'
                        : 'rgba(248,113,113,0.3)';
                  const points = polygonPoints(d.polygon).map(([x, y]) => `${x},${y}`).join(' ');
                  const labelPos = polygonCentroid(d.polygon);
                  return (
                    <G key={d.id}>
                      <Polygon
                        points={points}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={assigned ? 3 : owned ? 1.5 : status.unlocked ? 2 : 1}
                        onPress={() => handleDistrictTap(d)}
                      />
                      {/* District name label */}
                      <SvgText x={labelPos.x} y={labelPos.y - 8} fontSize={13} fontWeight="900" fill={assigned ? '#38bdf8' : owned ? '#4ade80' : status.unlocked ? '#fbbf24' : '#f87171'} textAnchor="middle">
                        {d.name}
                      </SvgText>
                      {/* Price for unowned unlocked districts */}
                      {!owned && status.unlocked && (
                        <SvgText x={labelPos.x} y={labelPos.y + 8} fontSize={10} fontWeight="700" fill="rgba(251,191,36,0.9)" textAnchor="middle">
                          {formatMoney(plot.cost)}
                        </SvgText>
                      )}
                      {/* Assigned indicator */}
                      {assigned && (
                        <SvgText x={labelPos.x} y={labelPos.y + 8} fontSize={10} fontWeight="700" fill="rgba(56,189,248,0.7)" textAnchor="middle">
                          {t('map_zone_assigned')}
                        </SvgText>
                      )}
                      {/* Lock icon for locked districts */}
                      {!owned && !status.unlocked && (
                        <G>
                          <Circle cx={labelPos.x} cy={labelPos.y + 10} r={14} fill="rgba(248,113,113,0.85)" />
                          <Path
                            d={`M ${labelPos.x - 5} ${labelPos.y + 11} L ${labelPos.x - 5} ${labelPos.y + 6} A 5 5 0 0 1 ${labelPos.x + 5} ${labelPos.y + 6} L ${labelPos.x + 5} ${labelPos.y + 11} Z`}
                            fill="rgba(15,23,42,0.95)"
                          />
                          <Rect x={labelPos.x - 7} y={labelPos.y + 11} width={14} height={10} rx={2} fill="rgba(15,23,42,0.95)" />
                        </G>
                      )}
                    </G>
                  );
                })}
              </Svg>
            </View>
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

          {/* Route summary */}
          {selectedCar && (
            <View style={styles.routeSummaryCard}>
              <View style={styles.routeSummaryRow}>
                <View>
                  <Text style={styles.routeSummaryLabel}>{t('map_zones_upper')}</Text>
                  <Text style={styles.routeSummaryValue}>{getCarAssignedZones(selectedCar).length}</Text>
                </View>
                <View>
                  <Text style={styles.routeSummaryLabel}>{t('courier_vehicle_income_hr')}</Text>
                  <Text style={styles.routeSummaryValue}>{formatMoney(Math.floor(getCarActualIncomeHourly(selectedCar, business)))}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.routeSummaryLabel}>{t('courier_fleet_total_hr')}</Text>
                  <Text style={[styles.routeSummaryValue, { color: '#4ade80' }]}>{formatMoney(getCarHourlyIncome(business))}</Text>
                </View>
              </View>
              {getCarAssignedZones(selectedCar).length > 0 && (
                <Pressable style={styles.clearRouteBtn} onPress={handleClearZones}>
                  <Text style={styles.clearRouteBtnText}>{t('map_clear_zones')}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─── Active Zones sub-tab ───
  const renderActiveZones = () => {
    const carsWithZones = fleet.filter((c) => getCarAssignedZones(c).length > 0);
    if (carsWithZones.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Ionicons name="location" size={40} color="#475569" />
          <Text style={styles.emptyText}>{t('map_no_active_zones')}</Text>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.sectionTitle}>{t('map_active_zones_upper')}</Text>
        {carsWithZones.map((car) => {
          const carType = getCarType(car.typeId);
          const carColor = car.color || carType?.color || '#38bdf8';
          const zones = getCarAssignedZones(car);
          const zoneNames = zones.map((id) => getDistrictById(id)?.name).filter(Boolean);
          const carIncome = getCarActualIncomeHourly(car, business);
          const milesPct = Math.min(100, Math.max(0, (car.milesRemaining / car.maxMiles) * 100));
          const isDegraded = car.needsMaintenance || car.milesRemaining <= 0;
          const jobType = car.activeJobType || carType?.jobTypes[0] || 'food';
          const job = getJobType(jobType);
          return (
            <View key={car.instanceId} style={[styles.activeRouteCard, { borderLeftColor: carColor }]}>
              <View style={styles.activeRouteHeader}>
                {COURIER_IMAGES[car.typeId] ? (
                  <Image source={COURIER_IMAGES[car.typeId]} style={styles.activeRouteImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.activeRouteEmoji}>{car.emoji}</Text>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeRouteName}>{car.name}</Text>
                  <Text style={styles.activeRouteIncome}>{formatMoney(Math.floor(carIncome))}/hr</Text>
                </View>
                <View style={[styles.activeRouteStatus, { backgroundColor: isDegraded ? 'rgba(248,113,113,0.15)' : `${carColor}20` }]}>
                  <Text style={[styles.activeRouteStatusText, { color: isDegraded ? '#f87171' : carColor }]}>
                    {isDegraded ? t('bus_status_grounded') : t('bus_status_running')}
                  </Text>
                </View>
              </View>
              <View style={styles.activeRoutePath}>
                <Ionicons name="location" size={14} color={carColor} />
                <Text style={styles.activeRoutePathText}>{zoneNames.join(', ')} · {job?.emoji} {job?.name}</Text>
              </View>
              <View style={styles.activeRouteBar}>
                <View style={styles.activeRouteBarTrack}>
                  <View style={[styles.activeRouteBarFill, { width: `${milesPct}%`, backgroundColor: isDegraded ? '#f87171' : carColor }]} />
                </View>
                <Text style={styles.activeRouteBarLabel}>{Math.floor(car.milesRemaining).toLocaleString()} mi left</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Store tab: district-gated vehicle cards ───
  const renderStore = () => {
    const slotsFull = fleet.length >= maxSlots;
    return (
      <View>
        <View style={styles.garageBar}>
          <View style={styles.garageBarInfo}>
            <Text style={styles.garageBarLabel}>{t('courier_garage')}</Text>
            <Text style={[styles.garageBarCount, slotsFull && { color: '#f87171' }]}>{fleet.length}/{maxSlots}</Text>
          </View>
          <View style={styles.garageBarTrack}>
            <View style={[styles.garageBarFill, { width: `${Math.min(100, (fleet.length / maxSlots) * 100)}%`, backgroundColor: slotsFull ? '#f87171' : '#38bdf8' }]} />
          </View>
          {slotsFull && <Text style={styles.garageBarHint}>{t('upg_upgrade_unlock_more')}</Text>}
        </View>
        <Text style={styles.sectionTitle}>{t('courier_vehicle_store')}</Text>
        {CAR_TYPES.map((type) => {
          const affordable = canAfford(type.cost);
          const districtOk = canBuyCarType(business, type.id);
          const districtNames = type.requiresDistrict?.map((d) => DISTRICT_PLOTS[d]?.name).join(' or ');
          return (
            <View key={type.id} style={styles.storeCard}>
              <View style={[styles.storeImage, { backgroundColor: `${type.color}10` }]}>
                {COURIER_IMAGES[type.id] ? (
                  <Image source={COURIER_IMAGES[type.id]} style={styles.storeVehicleImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.storeEmoji}>{type.emoji}</Text>
                )}
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
                    <Text style={styles.storeStatLabel}>{t('map_zones')}</Text>
                    <Text style={styles.storeStatValue}>{type.maxZones}</Text>
                  </View>
                  <View style={styles.storeStat}>
                    <Text style={styles.storeStatLabel}>{t('constr_jobs')}</Text>
                    <Text style={styles.storeStatValue}>{type.jobTypes.map((j) => getJobType(j)?.emoji).join('')}</Text>
                  </View>
                </View>
                {!districtOk && (
                  <View style={styles.districtReqBar}>
                    <Ionicons name="lock-closed" size={12} color="#fbbf24" />
                    <Text style={styles.districtReqBarText}>Requires: {districtNames}</Text>
                  </View>
                )}
                <Pressable
                  style={[styles.buyBtn, (!affordable || slotsFull || !districtOk) && styles.buyBtnDisabled]}
                  onPress={() => handleBuyCar(type)}
                  disabled={!affordable || slotsFull || !districtOk}
                >
                  <Text style={styles.buyBtnText}>
                    {slotsFull ? t('garage_full') : !districtOk ? t('district_required') : affordable ? tf('buy_for', { v0: formatMoney(type.cost) }) : t('insufficient_funds')}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Staff tab ───
  const renderStaff = () => {
    const hiringSlots = MAX_HIRING_AT_ONCE - hiringDrivers.length;
    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_team_size')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.overviewValue}>{drivers.length}</Text>
            <Pressable onPress={() => setShowTeamRoster(true)} style={{ padding: 4 }}>
              <Ionicons name="people-circle-outline" size={22} color="#38bdf8" />
            </Pressable>
          </View>
          <Text style={styles.overviewSub}>{formatMoney(revenue)}/hr revenue - {formatMoney(payroll)}/hr payroll</Text>
        </View>

        <View style={styles.staffGrid}>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_revenue_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#4ade80' }]}>{formatMoney(revenue)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_payroll_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#f87171' }]}>{formatMoney(payroll)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_net_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: income >= 0 ? '#4ade80' : '#f87171' }]}>{formatMoney(income)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_per_driver')}</Text>
            <Text style={styles.staffGridValue}>{drivers.length > 0 ? formatMoney(Math.floor(revenue / drivers.length)) : '-'}</Text>
          </View>
        </View>

        {hiringDrivers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>PENDING HIRES ({hiringDrivers.length}/{MAX_HIRING_AT_ONCE})</Text>
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
            const affordable = canAfford(cost);
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
        <Text style={styles.hireHint}>Max {MAX_HIRING_AT_ONCE} at a time. Every vehicle needs an assigned driver to earn income. Assign drivers from a vehicle&apos;s detail view in the Fleet tab.</Text>
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

    const handlePayTax = guard(() => {
      if (money < owed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify(tf('alert_insufficient_funds'), tf('msg_18310', { v0: formatMoney(owed) }));
        return;
      }
      const paid = payTax(business);
      onCourierUpdate(paid, money - owed);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      notify(tf('tax_paid'), tf('msg_34964', { v0: formatMoney(owed) }));
    });

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
            <Text style={styles.finValue}>{(getBusinessTaxRate({ type: 'courier' }) * 100).toFixed(0)}% Logistics</Text>
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
          {(() => {
            const maxed = business.level >= 30;
            const upgradeCost = getUpgradeCost(business);
            const upgradeName = getUpgradeName(business);
            const upgrading = business.upgradeCompletesAt && business.upgradeCompletesAt > Date.now();
            const canUpgrade = !maxed && money >= upgradeCost && !upgrading;
            const nextMultPct = Math.round((Math.pow(1.12, business.level) - 1) * 100);
            const handleUpgrade = guard(() => {
              if (money < upgradeCost) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                notify(tf('alert_insufficient_funds'), tf('msg_96705', { v0: formatMoney(upgradeCost) }));
                return;
              }
              const upgraded = upgradeBusiness(business);
              if (!upgraded) return;
              onCourierUpdate(upgraded, money - upgradeCost);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              notify(tf('upg_started'), tf('msg_18978', { v0: upgradeName }), 'success');
            });
            return (
              <>
                <View style={styles.finRow}>
                  <Text style={styles.finLabel}>{t('level')}</Text>
                  <Text style={styles.finValue}>{business.level} / 30</Text>
                </View>
                <View style={styles.finRow}>
                  <Text style={styles.finLabel}>{t('upg_income_multiplier')}</Text>
                  <Text style={[styles.finValue, { color: '#4ade80' }]}>+{Math.round((getCarLevelMultiplier(business) - 1) * 100)}%</Text>
                </View>
                <View style={styles.finRow}>
                  <Text style={styles.finLabel}>{t('upg_vehicle_slots')}</Text>
                  <Text style={styles.finValue}>{maxSlots} max</Text>
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
              </>
            );
          })()}
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
            <Text style={styles.finValue}>{formatMoney(fleet.reduce((s, c) => s + (c.cost || 0), 0))}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('staff')}</Text>
            <Text style={styles.finValue}>{drivers.length} drivers</Text>
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
          <Ionicons name="arrow-back" size={22} color="#38bdf8" />
        </Pressable>
        <Text style={styles.headerTitle}>{business.name}</Text>
        <Pressable style={{ width: 40, alignItems: 'center' }} onPress={onOpenSettings}>
          <Ionicons name="settings" size={20} color="#38bdf8" />
        </Pressable>
      </View>
      {renderTabs()}
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={!isMapTouching}>
        {tab === 'fleet' && renderFleet()}
        {tab === 'map' && (
          <>
            <View style={styles.subTabBar}>
              <Pressable
                style={[styles.subTab, mapSubTab === 'map' && styles.subTabActive]}
                onPress={() => setMapSubTab('map')}
              >
                <Ionicons name="map" size={12} color={mapSubTab === 'map' ? '#000' : '#64748b'} />
                <Text style={[styles.subTabText, mapSubTab === 'map' && styles.subTabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('map_zone_map')}</Text>
              </Pressable>
              <Pressable
                style={[styles.subTab, mapSubTab === 'active' && styles.subTabActive]}
                onPress={() => setMapSubTab('active')}
              >
                <Ionicons name="navigate" size={12} color={mapSubTab === 'active' ? '#000' : '#64748b'} />
                <Text style={[styles.subTabText, mapSubTab === 'active' && styles.subTabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('map_active_zones')}</Text>
              </Pressable>
            </View>
            {mapSubTab === 'map' && renderMap()}
            {mapSubTab === 'active' && renderActiveZones()}
          </>
        )}
        {tab === 'store' && renderStore()}
        {tab === 'staff' && renderStaff()}
        {tab === 'finance' && renderFinances()}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Vehicle detail modal (ID-based) */}
      {detailCarId && (() => {
        const car = fleet.find((c) => c.instanceId === detailCarId);
        if (!car) return null;
        const carType = getCarType(car.typeId);
        const driver = drivers.find((d) => d.id === car.assignedDriverId);
        const unassignedDrivers = drivers.filter((d) => !fleet.some((c) => c.assignedDriverId === d.id));
        const zones = getCarAssignedZones(car);
        const currentJob = car.activeJobType || carType?.jobTypes[0] || 'food';
        return (
          <View style={styles.detailOverlay}>
            <Pressable style={styles.detailBackdrop} onPress={() => setDetailCarId(null)} />
            <View style={styles.detailModal}>
              <View style={styles.detailHeader}>
                {COURIER_IMAGES[car.typeId] ? (
                  <Image source={COURIER_IMAGES[car.typeId]} style={styles.detailImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.detailEmoji}>{car.emoji}</Text>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{car.name}</Text>
                  <Text style={styles.detailStatus}>
                    {!isCarDelivered(car)
                      ? `In Transit - ${formatDeliveryTime(getCarDeliveryTimeRemaining(car))}`
                      : car.needsMaintenance || car.milesRemaining <= 0
                      ? t('bus_needs_maintenance')
                      : t('active')}
                  </Text>
                </View>
                <Pressable onPress={() => setDetailCarId(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('bus_miles_remaining')}</Text>
                <Text style={styles.detailValue}>
                  {Math.floor(car.milesRemaining).toLocaleString()} / {car.maxMiles.toLocaleString()}
                </Text>
                <View style={styles.detailHealthBar}>
                  <View style={[styles.detailHealthFill, {
                    width: `${Math.min(100, Math.max(0, (car.milesRemaining / car.maxMiles) * 100))}%`,
                    backgroundColor: car.milesRemaining / car.maxMiles > 0.3 ? '#34d399' : '#f87171',
                  }]} />
                </View>
              </View>

              <View style={styles.detailStatsGrid}>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatBoxLabel}>{t('income')}</Text>
                  <Text style={styles.detailStatBoxValue}>{formatMoney(getCarActualIncomeHourly(car, business))}/hr</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatBoxLabel}>{t('courier_tier')}</Text>
                  <Text style={styles.detailStatBoxValue}>{getCarTier(car.typeId)}</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatBoxLabel}>{t('map_max_zones')}</Text>
                  <Text style={styles.detailStatBoxValue}>{carType?.maxZones || 2}</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatBoxLabel}>{t('constr_jobs')}</Text>
                  <Text style={styles.detailStatBoxValue}>{carType?.jobTypes.map((j) => getJobType(j)?.emoji).join('')}</Text>
                </View>
              </View>

              {isCarDelivered(car) && (
                <>
                  {/* Driver assignment */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('courier_driver')}</Text>
                    {driver ? (
                      <View style={styles.driverAssignRow}>
                        <Ionicons name={driver.gender === 'female' ? 'woman' : 'man'} size={20} color={driver.gender === 'female' ? '#ec4899' : '#3b82f6'} />
                        <Text style={styles.driverAssignName}>{driver.name}</Text>
                        <Pressable style={styles.driverUnassignBtn} onPress={() => handleUnassignDriver(car.instanceId)}>
                          <Text style={styles.driverUnassignBtnText}>{t('courier_unassign')}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.driverNoneText}>{t('courier_no_driver')}</Text>
                        {unassignedDrivers.length > 0 ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.driverPickerRow}>
                            {unassignedDrivers.map((d) => (
                              <Pressable key={d.id} style={styles.driverChip} onPress={() => handleAssignDriver(car.instanceId, d.id)}>
                                <Ionicons name={d.gender === 'female' ? 'woman' : 'man'} size={12} color={d.gender === 'female' ? '#ec4899' : '#3b82f6'} />
                                <Text style={styles.driverChipText}>{d.name}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        ) : (
                          <Text style={styles.driverNoneText}>{t('courier_hire_more')}</Text>
                        )}
                      </>
                    )}
                  </View>

                  {/* Insurance */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('courier_insurance_upper')}</Text>
                    {car.insured ? (
                      <View style={styles.driverAssignRow}>
                        <Ionicons name="shield-checkmark" size={20} color="#4ade80" />
                        <Text style={styles.driverAssignName}>{t('bus_insured')}</Text>
                        <Text style={styles.detailStatBoxValue}>{formatMoney(INSURANCE_DAILY_RATE)}/day</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.buyBtn, !canAfford(INSURANCE_DAILY_RATE) && styles.buyBtnDisabled]}
                        onPress={() => handleBuyInsurance(car)}
                        disabled={!canAfford(INSURANCE_DAILY_RATE)}
                      >
                        <Text style={styles.buyBtnText}>
                          {canAfford(INSURANCE_DAILY_RATE) ? tf('buy_insurance_for', { v0: formatMoney(INSURANCE_DAILY_RATE) }) : t('insufficient_funds')}
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Job type toggle */}
                  {carType?.jobTypes.length > 1 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>{t('courier_job_type')}</Text>
                      <View style={styles.jobTypeRow}>
                        {carType.jobTypes.map((jt) => {
                          const job = getJobType(jt);
                          const active = currentJob === jt;
                          return (
                            <Pressable
                              key={jt}
                              style={[styles.jobTypePill, active && { backgroundColor: job?.color, borderColor: job?.color }]}
                              onPress={() => handleSetJobType(car.instanceId, jt)}
                            >
                              <Text style={styles.jobTypeEmoji}>{job?.emoji}</Text>
                              <Text style={[styles.jobTypeText, active && { color: '#000' }]}>{job?.name}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Maintenance */}
                  <View style={styles.detailMaintSection}>
                    <Text style={styles.detailMaintLabel}>Maintenance Cost: {formatMoney(getMaintenanceCost(car))}</Text>
                    {(() => {
                      const milesPct = car.maxMiles > 0 ? car.milesRemaining / car.maxMiles : 0;
                      const scrapChance = Math.max(0, 0.3 * (1 - milesPct));
                      const scrapPct = Math.round(scrapChance * 100);
                      return (
                        scrapPct > 0 && (
                          <Text style={styles.detailMaintWarning}>
                            ⚠ {scrapPct}% chance of scrapping during maintenance
                          </Text>
                        )
                      );
                    })()}
                    <Pressable
                      style={[styles.detailMaintBtn, !canAfford(getMaintenanceCost(car)) && styles.detailMaintBtnDisabled]}
                      onPress={() => { handleMaintain(car.instanceId); setDetailCarId(null); }}
                      disabled={!canAfford(getMaintenanceCost(car))}
                    >
                      <Text style={styles.detailMaintBtnText}>
                        {!canAfford(getMaintenanceCost(car)) ? t('alert_insufficient_funds') : t('send_to_maintenance')}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              {!isCarDelivered(car) && (
                <View style={styles.detailMaintSection}>
                  <Pressable
                    style={styles.detailMaintBtn}
                    onPress={() => startWatchAdForCar(car.instanceId)}
                  >
                    <Text style={styles.detailMaintBtnText}>{t('ad_watch_deliver_now')}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        );
      })()}

      {/* Ad overlay */}

      <TeamRosterModal
        visible={showTeamRoster}
        onClose={() => setShowTeamRoster(false)}
        staffMembers={drivers}
        accentColor="#38bdf8"
        onFire={(m) => { onCourierUpdate(fireDriver(business, m.id)); }}
        onRaise={(m) => { onCourierUpdate(raiseDriver(business, m.id)); }}
        onTrain={(m) => { onCourierUpdate(trainDriver(business, m.id)); }}
      />

      {/* Notifications */}
      <View style={styles.notifContainer} pointerEvents="none">
        {notifications.map((n) => (
          <View key={n.id} style={[styles.notif, n.type === 'warning' && styles.notifWarning, n.type === 'success' && styles.notifSuccess]}>
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
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(56,189,248,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#fff' },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, marginHorizontal: 16, marginBottom: 14, gap: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10 },
  tabActive: { backgroundColor: '#38bdf8' },
  tabText: { color: '#64748b', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  tabTextActive: { color: '#000' },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  sectionTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 1.5, marginTop: 18, marginBottom: 10 },
  overviewCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  overviewLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  overviewValue: { fontSize: 42, fontWeight: '900', color: '#fff', marginBottom: 6 },
  overviewSub: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  incomeBreakdown: { width: '100%', marginTop: 14, marginBottom: 14, paddingHorizontal: 20 },
  incomeBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  incomeBreakdownLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  incomeBreakdownValue: { fontSize: 13, fontWeight: '700' },
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  jobSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  jobPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  jobPillLocked: { opacity: 0.5 },
  jobEmoji: { fontSize: 14 },
  jobPillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: '#64748b', fontSize: 14 },
  // Car grid (2-column) - compact car cards, half-size bus cards
  carGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  carCard: {
    width: (screenW - 42) / 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'visible',
    position: 'relative',
  },
  carLifeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 6,
    overflow: 'hidden',
  },
  carCardBody: {
    padding: 14,
    paddingBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    minHeight: 80,
  },
  carCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  carCardEmoji: {
    fontSize: 26,
    marginRight: 8,
  },
  carCardImage: {
    width: 30,
    height: 30,
    borderRadius: 8,
    marginRight: 8,
  },
  carSelectImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 8,
  },
  activeRouteImage: {
    width: 30,
    height: 30,
    borderRadius: 8,
    marginRight: 8,
  },
  storeVehicleImage: {
    width: '100%',
    height: '100%',
  },
  detailImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 8,
  },
  carCardName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '800',
  },
  carCardMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  carCardMiles: {
    fontSize: 15,
    fontWeight: '800',
  },
  carCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  carCardStat: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  carCardTransitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  carCardTransitText: {
    fontSize: 11,
    color: '#fbbf24',
    fontWeight: '600',
  },
  carCardSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    marginLeft: 'auto',
  },
  carCardSkipBtnText: {
    fontSize: 10,
    color: '#fbbf24',
    fontWeight: '700',
  },
  carCardZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: 10,
    marginBottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  carCardZoneText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
    flex: 1,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  driverRowText: { fontSize: 11, fontWeight: '700' },
  carCardInsuredRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 10, marginBottom: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(74,222,128,0.08)' },
  carCardInsuredText: { fontSize: 10, color: '#4ade80', fontWeight: '600' },
  // District grid
  districtGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  districtCard: { width: (screenW - 42) / 2, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  districtCardOwned: { borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.06)' },
  districtCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  districtCardName: { fontSize: 14, color: '#fff', fontWeight: '800' },
  districtCardCost: { fontSize: 13, color: '#fbbf24', fontWeight: '700' },
  districtReqs: { marginBottom: 8 },
  districtReqText: { fontSize: 10, color: '#94a3b8', marginBottom: 2 },
  districtBuyBtn: { paddingVertical: 8, borderRadius: 10, backgroundColor: '#38bdf8', alignItems: 'center', justifyContent: 'center' },
  districtBuyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  districtBuyBtnLocked: { backgroundColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', gap: 4 },
  districtBuyBtnText: { fontSize: 12, color: '#000', fontWeight: '800' },
  // Job type selector
  jobTypeSection: { marginTop: 14, marginBottom: 14 },
  jobTypeRow: { flexDirection: 'row', gap: 8 },
  jobTypePill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  jobTypeEmoji: { fontSize: 14 },
  jobTypeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  // Store district requirement bar
  districtReqBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)', marginBottom: 12 },
  districtReqBarText: { fontSize: 11, color: '#fbbf24', fontWeight: '600', flex: 1 },
  // Staff grid (Cafe-style)
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  staffGridItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  staffGridLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  staffGridValue: { fontSize: 16, color: '#fff', fontWeight: '700' },
  // Driver detail modal
  driverAssignRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driverAssignName: { flex: 1, fontSize: 13, color: '#4ade80', fontWeight: '700' },
  driverUnassignBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(248,113,113,0.15)' },
  driverUnassignBtnText: { fontSize: 11, color: '#f87171', fontWeight: '700' },
  driverNoneText: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  driverPickerRow: { flexDirection: 'row' },
  driverChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(56,189,248,0.12)', marginRight: 8 },
  driverChipText: { fontSize: 11, color: '#38bdf8', fontWeight: '700' },
  detailScrapChance: { fontSize: 13, fontWeight: '700', marginBottom: 14 },
  carCardWheels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    position: 'absolute',
    bottom: -16,
    left: 0,
    right: 0,
  },
  carCardWheel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carCardWheelHub: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Map
  routeStepLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '700', marginBottom: 10 },
  noBusesText: { fontSize: 13, color: '#475569', fontStyle: 'italic', marginBottom: 14 },
  busSelectorScroll: { marginBottom: 16 },
  busSelectorContent: { gap: 12, paddingRight: 16 },
  carSelectCard: { width: 180, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  carSelectCardActive: { backgroundColor: 'rgba(56,189,248,0.08)', borderColor: 'rgba(56,189,248,0.3)' },
  carSelectAccent: { height: 4, width: '100%' },
  carSelectBody: { padding: 14 },
  carSelectTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  carSelectEmoji: { fontSize: 32 },
  carSelectName: { fontSize: 14, color: '#fff', fontWeight: '800', marginBottom: 2 },
  carSelectNameActive: { color: '#38bdf8' },
  carSelectZone: { fontSize: 12, color: '#4ade80', fontWeight: '700' },
  carSelectIncome: { fontSize: 12, color: '#4ade80', fontWeight: '700' },
  carSelectIdle: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },
  carSelectTransit: { fontSize: 12, color: '#fbbf24', fontWeight: '600' },
  carSelectProgress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  carSelectProgressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  carSelectProgressFill: { height: '100%', borderRadius: 3 },
  carSelectProgressLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  mapSection: { marginTop: 14 },
  mapArea: { height: 420, backgroundColor: '#0a0e14', overflow: 'hidden' },
  zoomRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 14 },
  zoomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  zoomBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  routeSummaryCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 14 },
  routeSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeSummaryLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  routeSummaryValue: { fontSize: 16, color: '#fff', fontWeight: '800' },
  clearRouteBtn: { marginTop: 12, backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  clearRouteBtnText: { color: '#f87171', fontSize: 13, fontWeight: '700' },
  // Sub-tabs (matching Bus screen)
  subTabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, marginHorizontal: 0, marginBottom: 14, gap: 4 },
  subTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8 },
  subTabActive: { backgroundColor: '#38bdf8' },
  subTabText: { color: '#64748b', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  subTabTextActive: { color: '#000' },
  // Active zone cards (matching Bus active route cards)
  activeRouteCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderLeftWidth: 3, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  activeRouteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  activeRouteEmoji: { fontSize: 28 },
  activeRouteName: { fontSize: 14, color: '#fff', fontWeight: '800' },
  activeRouteIncome: { fontSize: 12, color: '#4ade80', fontWeight: '700', marginTop: 2 },
  activeRouteStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeRouteStatusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  activeRoutePath: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  activeRoutePathText: { fontSize: 12, color: '#94a3b8', fontWeight: '600', flex: 1 },
  activeRouteBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeRouteBarTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  activeRouteBarFill: { height: '100%', borderRadius: 3 },
  activeRouteBarLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  transitNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)' },
  transitNoticeText: { fontSize: 11, color: '#fbbf24', fontWeight: '600', flex: 1 },
  activeRoutesSection: { marginTop: 10, marginBottom: 10 },
  activeRoutesTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  activeRouteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  activeRouteBus: { fontSize: 13, color: '#fff', fontWeight: '700', flexShrink: 0 },
  activeRouteDistricts: { fontSize: 11, color: '#94a3b8', flex: 1, marginLeft: 8 },
  cancelRouteSmallBtn: { padding: 2 },
  // Store
  garageBar: { marginBottom: 16, paddingHorizontal: 4 },
  garageBarInfo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  garageBarLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  garageBarCount: { fontSize: 16, fontWeight: '800', color: '#fff' },
  garageBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  garageBarFill: { height: '100%', borderRadius: 3 },
  garageBarHint: { fontSize: 11, color: '#f87171', fontWeight: '600', marginTop: 6 },
  storeCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 22, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  storeImage: { height: 160, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  storeEmoji: { fontSize: 72 },
  storeBody: { padding: 16 },
  storeName: { fontSize: 18, color: '#fff', fontWeight: '800', marginBottom: 4 },
  storeDesc: { fontSize: 13, color: '#94a3b8', marginBottom: 14 },
  storeStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  storeStat: { alignItems: 'center' },
  storeStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  storeStatValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  buyBtn: { backgroundColor: '#38bdf8', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  buyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  buyBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
  // Staff
  hireRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  hireBtn: { flex: 1, backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  hireBtnDisabled: { opacity: 0.4 },
  hireBtnCount: { fontSize: 16, fontWeight: '800', color: '#4ade80' },
  hireBtnCost: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  hireBtnTime: { fontSize: 9, color: '#64748b', marginTop: 2 },
  hireHint: { fontSize: 11, color: '#64748b', marginBottom: 16, paddingHorizontal: 4 },
  // Staff hero card
  staffHeroCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  staffHeroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  staffHeroItem: { alignItems: 'center' },
  staffHeroNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  staffHeroLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  staffHeroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  staffShortageBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)' },
  staffShortageText: { fontSize: 11, color: '#fbbf24', fontWeight: '600', flex: 1 },
  // Hire progress cards
  hirePendingSection: { marginBottom: 16 },
  hirePendingSectionTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  hireProgressCard: { backgroundColor: 'rgba(56,189,248,0.06)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.15)', borderRadius: 14, padding: 14, marginBottom: 8 },
  hireProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hireProgressInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hireProgressLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  hireProgressTime: { fontSize: 12, color: '#38bdf8', fontWeight: '700' },
  hireProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 10 },
  hireProgressBarFill: { height: '100%', backgroundColor: '#38bdf8', borderRadius: 3 },
  hireSkipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 8 },
  hireSkipBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  // Finances
  finCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  finCardDanger: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  finLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  finValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  finPayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  finPayBtn: { backgroundColor: '#38bdf8', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  finPayBtnText: { fontSize: 12, color: '#000', fontWeight: '800' },
  finUpgradeBox: { marginTop: 8 },
  finUpgradeName: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  finUpgradeBtn: { backgroundColor: '#38bdf8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  finUpgradeBtnDisabled: { opacity: 0.4 },
  finUpgradeBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },
  // Detail modal (matches bus screen style)
  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  detailBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
  detailModal: { width: '90%', maxHeight: '85%', backgroundColor: '#0f172a', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  detailEmoji: { fontSize: 36 },
  detailName: { fontSize: 18, color: '#fff', fontWeight: '800' },
  detailStatus: { fontSize: 13, color: '#64748b', marginTop: 2 },
  detailSection: { paddingHorizontal: 20, paddingVertical: 14 },
  detailLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  detailValue: { fontSize: 16, color: '#fff', fontWeight: '800', marginBottom: 8 },
  detailHealthBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  detailHealthFill: { height: '100%', borderRadius: 4 },
  detailStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingBottom: 14, gap: 8 },
  detailStatBox: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  detailStatBoxLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  detailStatBoxValue: { fontSize: 14, color: '#fff', fontWeight: '800' },
  detailSectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  zoneScroll: { flexDirection: 'row', marginBottom: 4 },
  zoneChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', marginRight: 8 },
  zoneChipActive: { backgroundColor: '#38bdf8' },
  zoneChipLocked: { opacity: 0.4 },
  zoneChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  detailMaintSection: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  detailMaintLabel: { fontSize: 14, color: '#fff', fontWeight: '700', marginBottom: 6 },
  detailMaintWarning: { fontSize: 12, color: '#fbbf24', fontWeight: '700', marginBottom: 14 },
  detailMaintBtn: { paddingVertical: 14, borderRadius: 14, backgroundColor: '#fbbf24', alignItems: 'center' },
  detailMaintBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  detailMaintBtnText: { fontSize: 15, color: '#000', fontWeight: '800' },
  // Ad overlay
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
  // Notifications
  notifContainer: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999, elevation: 9999, gap: 8 },
  notif: { backgroundColor: 'rgba(239,68,68,0.95)', borderRadius: 12, padding: 14 },
  notifWarning: { backgroundColor: 'rgba(251,191,36,0.95)' },
  notifSuccess: { backgroundColor: 'rgba(74,222,128,0.95)' },
  notifTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  notifMsg: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  spacer: { height: 40 },
});
