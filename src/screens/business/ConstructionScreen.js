import { useState, useRef, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Modal, Dimensions, TextInput, Image, Animated } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import Svg, { G, Polygon, Text as SvgText, Circle, Path, Rect, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf } from '../../data/i18n';
import { showRewardedAd } from '../../data/ads';
import UpgradeProgress from '../../components/UpgradeProgress';
import TeamRosterModal from '../../components/TeamRosterModal';
import { formatMoney } from '../../data/market';
import { isReducedMotion } from '../../data/settings';
import {
  RESOURCES,
  JOB_TEMPLATES,
  MAX_ACTIVE_JOBS,
  STAFF_HIRE_COST,
  STAFF_SALARY_HOURLY,
  STAFF_HIRE_MIN_MS,
  STAFF_HIRE_MAX_MS,
  MAX_HIRING_AT_ONCE,
  BASE_STORAGE_PER_RESOURCE,
  JOB_REFRESH_HOURS,
  AVAILABLE_JOBS_COUNT,
  getStorageCapacity,
  getResource,
  getConstructionLevelMultiplier,
  buyResources,
  startJob,
  getCompletedJobs,
  completeJob,
  getJobTimeRemaining,
  hireStaff,
  instantHireStaff,
  completeHiredStaff,
  generateAvailableJobs,
  refreshJobs,
  getJobsRefreshTimeRemaining,
  getDeliveryTimeRemaining,
  getArrivedDeliveries,
  processDeliveries,
  CITY_MAP,
  CONSTRUCTION_ZONES,
  getUnlockedZones,
  getZoneById,
  getZonePayoutMult,
  getMaxZones,
  getSelectedZones,
  toggleZone,
  getDistrictCentroid,
  getStaffMembers, fireStaff, raiseStaff, trainStaff,
  getStaffSalaryHourly,
  getConstructionPendingPayout,
  getConstructionHourlyIncome,
  getAvailableStaff, getAvailableStaffCount, getAssignedStaffIds, getJobAssignedStaff,
} from '../../data/construction';
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

export default function ConstructionScreen({ business, money, boostExpiresAt, onBack, onOpenSettings, onConstructionUpdate }) {
  useLanguage();
  const [tab, setTab] = useState('yard');
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const [, setTick] = useState(0);
  const [detailJob, setDetailJob] = useState(null);
  const [buyQuantities, setBuyQuantities] = useState({});
  const [selectedJobPin, setSelectedJobPin] = useState(null);
  const [isMapTouching, setIsMapTouching] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showTeamRoster, setShowTeamRoster] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
  const onConstructionUpdateRef = useRef(onConstructionUpdate);
  onConstructionUpdateRef.current = onConstructionUpdate;

  const notify = (title, message, type) => {
    const id = notifIdRef.current++;
    setNotifications((prev) => [...prev, { id, title, message, type: type || 'success' }].slice(-2));
    later(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 3500);
  };

  // Pulse animation for Missing Materials button
  useEffect(() => {
    if (!selectedJobPin) return;
    const job = availableJobs.find((j) => j.instanceId === selectedJobPin);
    if (!job) return;
    const hasResources = Object.entries(job.resources).every(([resId, amount]) => (resources[resId] || 0) >= amount);
    if (hasResources) return;
    if (isReducedMotion()) {
      pulseAnim.setValue(1);
      return () => {};
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, [selectedJobPin, availableJobs, resources]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      const biz = businessRef.current;
      const cash = moneyRef.current;

      // Process deliveries
      const arrived = getArrivedDeliveries(biz);
      if (arrived.length > 0) {
        const updated = processDeliveries(biz);
        onConstructionUpdateRef.current(updated, cash);
        const resNames = arrived.map((d) => getResource(d.resourceId)?.name).filter(Boolean);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('constr_delivery_arrived'), tf('msg_85843', { v0: resNames.join(', ') }));
      }

      // Auto-complete finished jobs
      const completed = getCompletedJobs(biz);
      if (completed.length > 0) {
        let totalPayout = 0;
        let totalTax = 0;
        let updated = { ...biz };
        for (const job of completed) {
          const result = completeJob(updated, job.instanceId);
          if (result) {
            updated = result.business;
            totalPayout += result.payout - result.tax;
            totalTax += result.tax;
          }
        }
        // Add tax to owed, track allTimeEarnings
        updated = {
          ...updated,
          allTimeEarnings: (updated.allTimeEarnings || 0) + totalPayout,
        };
        onConstructionUpdateRef.current(updated, cash + totalPayout);
        const jobNames = completed.map((j) => j.name).filter(Boolean);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('constr_job_complete'), tf('msg_35968', { v0: jobNames.join(', '), v1: formatMoney(totalPayout), v2: formatMoney(totalTax) }));
      }

      // Auto-complete hired staff
      const hiring = biz.hiringStaff || [];
      const completedHires = hiring.filter((h) => h.completesAt <= Date.now());
      if (completedHires.length > 0) {
        const updated = completeHiredStaff(biz);
        onConstructionUpdateRef.current(updated, cash);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notify(tf('staff_ready'), tf('msg_30866', { v0: completedHires.length, v1: completedHires.length > 1 ? 's' : '' }));
      }

      // Auto-refresh jobs
      const refreshRemaining = getJobsRefreshTimeRemaining(biz);
      if (refreshRemaining <= 0 && (biz.availableJobs || []).length < AVAILABLE_JOBS_COUNT) {
        const updated = refreshJobs(biz);
        onConstructionUpdateRef.current(updated, cash);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.id]);

  const pendingPayout = getConstructionPendingPayout(business);
  const suspended = isSuspended(business);
  const staff = business.staff || 0;
  const staffMembers = getStaffMembers(business);
  const availableStaff = getAvailableStaff(business);
  const availableStaffCount = availableStaff.length;
  const assignedStaffCount = staffMembers.length - availableStaffCount;
  const jobs = business.jobs || [];
  const resources = business.resources || {};
  const pendingResources = business.pendingResources || {};
  const deliveries = business.deliveries || [];
  const hiringStaff = business.hiringStaff || [];
  const availableJobs = business.availableJobs || [];
  const activeJobs = jobs.filter((j) => !j.completedAt);
  const completedJobs = jobs.filter((j) => j.completedAt);

  const startWatchAd = (target) => { showRewardedAd(() => finishWatchAd(target)); };

  const finishWatchAd = guard((passedTarget) => {if (!passedTarget) return;
    if (passedTarget.startsWith('hire:')) {
      const hireId = passedTarget.slice(5);
      const updated = instantHireStaff(business, hireId);
      onConstructionUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('staff_hired'), t('staff_new_worker_instant'));
    } else if (passedTarget === 'refresh') {
      const updated = refreshJobs(business);
      onConstructionUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('alert_jobs_refreshed'), t('alert_new_opportunities'));
    } else if (passedTarget.startsWith('delivery:')) {
      const deliveryId = passedTarget.slice(9);
      const delivery = (business.deliveries || []).find((d) => d.instanceId === deliveryId);
      if (delivery) {
        const updated = processDeliveries({
          ...business,
          deliveries: (business.deliveries || []).map((d) =>
            d.instanceId === deliveryId ? { ...d, arrivesAt: Date.now() } : d
          ),
        });
        onConstructionUpdate(updated, money);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const res = getResource(delivery.resourceId);
        notify(tf('constr_delivery_instant'), tf('msg_34177', { v0: delivery.quantity, v1: res?.name }));
      }
    } else if (passedTarget.startsWith('job:')) {
      const jobId = passedTarget.slice(4);
      const job = (business.jobs || []).find((j) => j.instanceId === jobId && !j.completedAt);
      if (job) {
        const updated = {
          ...business,
          jobs: (business.jobs || []).map((j) =>
            j.instanceId === jobId ? { ...j, completesAt: Date.now() } : j
          ),
        };
        const result = completeJob(updated, jobId);
        if (result) {
          onConstructionUpdate(result.business, money + result.payout);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          notify(tf('constr_job_complete'), tf('msg_93696', { v0: job.name, v1: formatMoney(result.payout) }));
        }
      }
    } else if (passedTarget === 'upgrade') {
      const updated = completeUpgradeNow(business);
      onConstructionUpdate(updated, money);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify(t('upg_complete'), t('upg_business_upgraded'));
    }
    });
  const handleHireStaff = guard((count) => {
    if (hiringStaff.length + count > MAX_HIRING_AT_ONCE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('staff_hiring_full'), tf('msg_35390', { v0: MAX_HIRING_AT_ONCE }));
      return;
    }
    const cost = count * STAFF_HIRE_COST;
    if (money < cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_47007', { v0: count, v1: formatMoney(cost) }));
      return;
    }
    const updated = hireStaff(business, count);
    if (!updated) return;
    onConstructionUpdate(updated, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('staff_hiring_started'), tf('msg_60776', { v0: count, v1: count > 1 ? 's' : '' }), 'warning');
  });

  const handleBuyResources = guard((resourceId, quantity) => {
    const result = buyResources(business, resourceId, quantity);
    if (!result) return;
    if (result.error === 'storage_full') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(t('constr_storage_full'), t('msg_storage_full_upgrade'));
      return;
    }
    if (money < result.cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_31836', { v0: quantity, v1: formatMoney(result.cost) }));
      return;
    }
    onConstructionUpdate(result.business, money - result.cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = getResource(resourceId);
    notify(tf('dealer_order_placed'), tf('msg_88423', { v0: quantity, v1: res?.name }), 'warning');
  });

  const handleStartJob = guard((jobOption) => {
    const result = startJob(business, jobOption);
    if (!result) return;
    if (result.error === 'staff') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(t('staff_not_enough'), tf('msg_job_requires_staff', { v0: jobOption.name, v1: result.required, v2: result.available }));
      return;
    }
    if (result.error === 'slots') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('constr_slots_full'), tf('msg_21335', { v0: MAX_ACTIVE_JOBS }));
      return;
    }
    if (result.error === 'resources') {
      const res = getResource(result.missing);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('constr_missing_resources'), tf('msg_74295', { v0: res?.name }));
      return;
    }
    onConstructionUpdate(result.business, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('constr_construction_started'), tf('msg_60058', { v0: jobOption.name, v1: formatTimeRemaining(jobOption.durationHours * 60 * 60 * 1000) }), 'warning');
  });

  const handleRefreshJobs = guard(() => {
    const updated = refreshJobs(business);
    onConstructionUpdate(updated, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify(t('alert_jobs_refreshed'), t('alert_new_opportunities_period'));
  });

  const handleToggleZone = (zoneId) => {
    const result = toggleZone(business, zoneId);
    if (result.error === 'max_zones') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('map_max_zones'), tf('msg_81350', { v0: result.max }));
      return;
    }
    onConstructionUpdate(result, money);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUpgrade = guard(() => {
    const cost = getUpgradeCost(business);
    if (money < cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_96705', { v0: formatMoney(cost) }));
      return;
    }
    const upgraded = upgradeBusiness(business);
    if (!upgraded) return;
    onConstructionUpdate(upgraded, money - cost);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify(tf('upg_started'), tf('msg_18978', { v0: getUpgradeName(business) }));
  });

  const handlePayTax = guard(() => {
    const owed = getTaxOwed(business);
    if (owed <= 0) return;
    if (money < owed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify(tf('alert_insufficient_funds'), tf('msg_79485', { v0: formatMoney(owed) }));
      return;
    }
    const paid = payTax(business);
    onConstructionUpdate(paid, money - owed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify(tf('tax_paid'), tf('msg_34964', { v0: formatMoney(owed) }));
  });

  // ─── Tabs ───
  const renderTabs = () => (
    <View style={styles.tabBar}>
      <Pressable style={[styles.tab, tab === 'yard' && styles.tabActive]} onPress={() => setTab('yard')}>
        <Ionicons name="home" size={14} color={tab === 'yard' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'yard' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('biz_yard')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'materials' && styles.tabActive]} onPress={() => setTab('materials')}>
        <Ionicons name="cube" size={14} color={tab === 'materials' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'materials' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('constr_materials')}</Text>
      </Pressable>
      <Pressable style={[styles.tab, tab === 'jobs' && styles.tabActive]} onPress={() => setTab('jobs')}>
        <Ionicons name="hammer" size={14} color={tab === 'jobs' ? '#000' : '#64748b'} />
        <Text style={[styles.tabText, tab === 'jobs' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('constr_jobs')}</Text>
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

  // ─── Yard tab ───
  const renderYard = () => {
    const salaryCost = getStaffSalaryHourly(business);

    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_pending_payout')}</Text>
          <Text style={[styles.overviewValue, suspended && { color: '#ef4444' }]}>{formatMoney(pendingPayout)}</Text>
          {suspended && <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>{t('fin_suspended')}</Text>}
          <View style={styles.incomeBreakdown}>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_income_hr')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#4ade80' }]}>{formatMoney(getConstructionHourlyIncome(business))}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('constr_active_jobs')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#4ade80' }]}>{activeJobs.length}/{MAX_ACTIVE_JOBS}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('fin_salary_hr')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#f87171' }]}>-{formatMoney(salaryCost)}</Text>
            </View>
            <View style={styles.incomeBreakdownRow}>
              <Text style={styles.incomeBreakdownLabel}>{t('staff_assigned_label')}</Text>
              <Text style={[styles.incomeBreakdownValue, { color: '#94a3b8' }]}>{assignedStaffCount}/{staffMembers.length}</Text>
            </View>
          </View>
          <Text style={styles.overviewSub}>Level {business.level} / 30 - {staff} staff - {availableStaffCount} available</Text>
        </View>

        {/* Active jobs */}
        <Text style={styles.sectionTitle}>ACTIVE JOBS ({activeJobs.length}/{MAX_ACTIVE_JOBS})</Text>
        {activeJobs.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="hammer-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_no_active_jobs')}</Text>
          </View>
        )}
        {activeJobs.map((job) => {
          const remaining = getJobTimeRemaining(job);
          const total = job.completesAt - job.startedAt;
          const elapsed = total - remaining;
          const pct = Math.min(100, (elapsed / total) * 100);
          const assignedCount = (job.assignedStaffIds || []).length;
          return (
            <Pressable
              key={job.instanceId}
              style={styles.jobCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDetailJob(job);
              }}
            >
              <View style={styles.jobCardTop}>
                <Text style={styles.jobCardEmoji}>{job.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobCardTitle}>{job.name}</Text>
                  <Text style={styles.jobCardMeta}>{job.desc} · {assignedCount} staff · {formatMoney(job.payout)}</Text>
                </View>
                <Text style={styles.jobCardTime}>{formatTimeRemaining(remaining)}</Text>
              </View>
              <View style={styles.devProgressBar}>
                <View style={[styles.devProgressFill, { width: `${pct}%` }]} />
              </View>
              <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd(`job:${job.instanceId}`)}>
                <Ionicons name="play-circle" size={14} color="#fbbf24" />
                <Text style={styles.adSkipBtnText}>{t('ad_watch_skip')}</Text>
              </Pressable>
            </Pressable>
          );
        })}

        {/* Pending deliveries */}
        {deliveries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('clothing_pending_deliveries')}</Text>
            {deliveries.map((d) => {
              const res = getResource(d.resourceId);
              const remaining = getDeliveryTimeRemaining(d);
              return (
                <View key={d.instanceId} style={styles.deliveryCard}>
                  <Text style={styles.deliveryEmoji}>{res?.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deliveryText}>{d.quantity} {res?.name}</Text>
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

        {/* Completed jobs moved to Finance tab modal */}
      </View>
    );
  };

  // ─── Materials tab (2-column grid) ───
  const renderMaterials = () => {
    return (
      <View>
        <Text style={styles.sectionTitle}>{t('constr_storage')}</Text>
        <View style={styles.storageInfoCard}>
          <Ionicons name="information-circle-outline" size={16} color="#64748b" />
          <Text style={styles.storageInfoText}>Upgrade to increase storage capacity (currently {BASE_STORAGE_PER_RESOURCE * business.level} per material). Orders take 1-3 min to deliver.</Text>
        </View>

        <View style={styles.resourceGrid}>
          {RESOURCES.map((res) => {
            const current = resources[res.id] || 0;
            const pending = pendingResources[res.id] || 0;
            const capacity = getStorageCapacity(business, res.id);
            const fillPct = Math.min(100, (current / capacity) * 100);
            const spaceLeft = capacity - current - pending;
            const maxAffordable = Math.floor(money / res.cost);
            const maxBuy = Math.min(spaceLeft, maxAffordable);
            const inputQty = buyQuantities[res.id] || '';
            const qty = parseInt(inputQty, 10) || 0;
            const totalCost = qty * res.cost;
            const canBuy = qty > 0 && qty <= spaceLeft && totalCost <= money;
            const resDeliveries = deliveries.filter((d) => d.resourceId === res.id);
            const nextDelivery = resDeliveries.length > 0 ? resDeliveries.sort((a, b) => a.arrivesAt - b.arrivesAt)[0] : null;
            const deliveryRemaining = nextDelivery ? getDeliveryTimeRemaining(nextDelivery) : 0;
            const deliverySecs = Math.ceil(deliveryRemaining / 1000);

            return (
              <View key={res.id} style={styles.resourceCard}>
                {nextDelivery && (
                  <View style={styles.deliveryBadge}>
                    <Ionicons name="time-outline" size={10} color="#fbbf24" />
                    <Text style={styles.deliveryBadgeText}>
                      {deliverySecs > 60 ? `${Math.ceil(deliverySecs / 60)}m` : `${deliverySecs}s`}
                    </Text>
                  </View>
                )}
                <View style={styles.resourceHeader}>
                  <Text style={styles.resourceEmoji}>{res.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resourceName}>{res.name}</Text>
                    <Text style={styles.resourceStock}>{current} / {capacity}{pending > 0 ? ` (+${pending})` : ''}</Text>
                  </View>
                </View>
                <View style={styles.resourceBar}>
                  <View style={[styles.resourceFill, { width: `${fillPct}%`, backgroundColor: fillPct > 60 ? '#4ade80' : fillPct > 30 ? '#fbbf24' : '#f87171' }]} />
                </View>
                <View style={styles.buyRow}>
                  <TextInput
                    style={styles.buyInput}
                    value={inputQty}
                    onChangeText={(text) => setBuyQuantities((prev) => ({ ...prev, [res.id]: text.replace(/[^0-9]/g, '') }))}
                    placeholder="0"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                  />
                  <Pressable
                    style={styles.maxBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBuyQuantities((prev) => ({ ...prev, [res.id]: String(maxBuy) }));
                    }}
                  >
                    <Text style={styles.maxBtnText}>{t('constr_max')}</Text>
                  </Pressable>
                </View>
                <Text style={styles.maxInfoText}>max: {maxBuy}</Text>
                <Pressable
                  style={[styles.buyConfirmBtn, !canBuy && styles.buyConfirmBtnDisabled]}
                  onPress={() => {
                    if (!canBuy) return;
                    handleBuyResources(res.id, qty);
                    setBuyQuantities((prev) => ({ ...prev, [res.id]: '' }));
                  }}
                  disabled={!canBuy}
                >
                  <Text style={[styles.buyConfirmBtnText, !canBuy && styles.buyConfirmBtnTextDisabled]}>
                    {qty > 0 ? tf('order_n_for', { v0: qty, v1: formatMoney(totalCost) }) : t('enter_quantity')}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ─── Jobs tab (map with pins, detail expands on map) ───
  const renderJobs = () => {
    const refreshRemaining = getJobsRefreshTimeRemaining(business);
    const refreshH = Math.floor(refreshRemaining / (60 * 60 * 1000));
    const refreshM = Math.floor((refreshRemaining % (60 * 60 * 1000)) / (60 * 1000));
    const refreshS = Math.floor((refreshRemaining % (60 * 1000)) / 1000);
    const scaledW = CITY_MAP.width * zoom;
    const scaledH = CITY_MAP.height * zoom;
    const unlockedZones = getUnlockedZones(business);
    const unlockedIds = new Set(unlockedZones.map((z) => z.id));
    const selectedJob = selectedJobPin ? availableJobs.find((j) => j.instanceId === selectedJobPin) : null;

    return (
      <View>
        <View style={styles.jobsHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('constr_available_jobs')}</Text>
          </View>
          <View style={styles.refreshBox}>
            <Text style={styles.refreshLabel}>{t('constr_refresh')}</Text>
            <Text style={styles.refreshTime}>{refreshH > 0 ? `${refreshH}h ${refreshM}m` : `${refreshM}m ${refreshS}s`}</Text>
            <Pressable style={styles.adSkipBtn} onPress={() => startWatchAd('refresh')}>
              <Ionicons name="play-circle" size={14} color="#fbbf24" />
              <Text style={styles.adSkipBtnText}>{t('ad_watch')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Map with job pins */}
        <View
          style={styles.mapArea}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <View style={{ position: 'absolute', top: panY, left: panX, width: scaledW, height: scaledH }}>
            <Image source={CITY_MAP.image} style={{ width: scaledW, height: scaledH }} resizeMode="stretch" />
            <Svg width={scaledW} height={scaledH} viewBox={`0 0 ${CITY_MAP.width} ${CITY_MAP.height}`} style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* District polygons - just outlines, no selection */}
              {CITY_MAP.districts.map((d) => {
                const unlocked = unlockedIds.has(d.id);
                const points = polygonPoints(d.polygon).map(([x, y]) => `${x},${y}`).join(' ');
                const labelPos = polygonCentroid(d.polygon);
                return (
                  <G key={d.id}>
                    <Polygon
                      points={points}
                      fill={unlocked ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.06)'}
                      stroke={unlocked ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.2)'}
                      strokeWidth={1}
                    />
                    <SvgText x={labelPos.x} y={labelPos.y} fontSize={12} fontWeight="700" fill={unlocked ? 'rgba(255,255,255,0.4)' : 'rgba(248,113,113,0.5)'} textAnchor="middle">
                      {d.name}
                    </SvgText>
                    {!unlocked && (
                      <G>
                        <Circle cx={labelPos.x} cy={labelPos.y + 16} r={10} fill="rgba(248,113,113,0.7)" />
                        <Path
                          d={`M ${labelPos.x - 4} ${labelPos.y + 18} L ${labelPos.x - 4} ${labelPos.y + 14} A 4 4 0 0 1 ${labelPos.x + 4} ${labelPos.y + 14} L ${labelPos.x + 4} ${labelPos.y + 18} Z`}
                          fill="rgba(15,23,42,0.95)"
                        />
                        <Rect x={labelPos.x - 5} y={labelPos.y + 18} width={10} height={7} rx={1} fill="rgba(15,23,42,0.95)" />
                      </G>
                    )}
                  </G>
                );
              })}

              {/* Job pins at random positions inside zones */}
              {availableJobs.map((job) => {
                const px = job.pinX || getDistrictCentroid(job.zoneId || 'suburbs')?.x || 600;
                const py = job.pinY || getDistrictCentroid(job.zoneId || 'suburbs')?.y || 450;
                const isSelected = selectedJobPin === job.instanceId;
                const pinColor = isSelected ? '#fbbf24' : '#f97316';
                return (
                  <G key={job.instanceId} onPress={() => { setSelectedJobPin(isSelected ? null : job.instanceId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    {/* Pin shadow */}
                    <Circle cx={px} cy={py + 3} r={isSelected ? 18 : 16} fill="rgba(0,0,0,0.5)" />
                    {/* Pin outer */}
                    <Circle cx={px} cy={py} r={isSelected ? 18 : 16} fill={pinColor} stroke="#fff" strokeWidth={2} />
                    {/* Pin inner */}
                    <Circle cx={px} cy={py} r={isSelected ? 9 : 8} fill="rgba(15,23,42,0.95)" />
                    {/* Payout label above pin */}
                    <Rect x={px - 40} y={py - 32} width={80} height={16} rx={6} fill="rgba(15,23,42,0.95)" />
                    <SvgText x={px} y={py - 20} fontSize={10} fontWeight="700" fill="#4ade80" textAnchor="middle">
                      {formatMoney(job.payout)}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>

          {/* Expanded job detail overlay - React Native, positioned at pin screen location */}
          {selectedJobPin && (() => {
            const job = availableJobs.find((j) => j.instanceId === selectedJobPin);
            if (!job) return null;
            const px = job.pinX || getDistrictCentroid(job.zoneId || 'suburbs')?.x || 600;
            const py = job.pinY || getDistrictCentroid(job.zoneId || 'suburbs')?.y || 450;
            const screenX = panX + px * zoom;
            const screenY = panY + py * zoom;
            const enoughStaff = availableStaffCount >= job.staffReq;
            const slotsAvailable = activeJobs.length < MAX_ACTIVE_JOBS;
            const hasResources = Object.entries(job.resources).every(([resId, amount]) => (resources[resId] || 0) >= amount);
            const canStart = enoughStaff && slotsAvailable && hasResources;
            const zone = getZoneById(job.zoneId);
            // Clamp card position to stay within map area
            const cardW = 240;
            const cardH = 200;
            const cardX = Math.max(8, Math.min(mapAreaW - cardW - 8, screenX - cardW / 2));
            const cardY = Math.max(8, Math.min(MAP_VIEW_H - cardH - 8, screenY - cardH - 30));
            return (
              <View style={[styles.jobOverlayCard, { left: cardX, top: cardY, width: cardW }]}>
                <View style={styles.jobOverlayHeader}>
                  <Text style={styles.jobOverlayEmoji}>{job.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobOverlayName}>{job.name}</Text>
                    <Text style={styles.jobOverlayZone}>{zone?.name} · {job.zoneMult?.toFixed(1) || '1.0'}x payout</Text>
                  </View>
                  <Pressable hitSlop={12} onPress={() => setSelectedJobPin(null)}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </Pressable>
                </View>
                <Text style={styles.jobOverlayDesc}>{job.desc}</Text>
                <View style={styles.jobOverlayStats}>
                  <View style={styles.jobOverlayStat}>
                    <Text style={styles.jobOverlayStatLabel}>{t('fin_payout')}</Text>
                    <Text style={[styles.jobOverlayStatValue, { color: '#4ade80' }]}>{formatMoney(job.payout)}</Text>
                  </View>
                  <View style={styles.jobOverlayStat}>
                    <Text style={styles.jobOverlayStatLabel}>{t('constr_time')}</Text>
                    <Text style={styles.jobOverlayStatValue}>{job.durationHours < 1 ? `${Math.round(job.durationHours * 60)}m` : `${job.durationHours}h`}</Text>
                  </View>
                  <View style={styles.jobOverlayStat}>
                    <Text style={styles.jobOverlayStatLabel}>{t('staff')}</Text>
                    <Text style={[styles.jobOverlayStatValue, !enoughStaff && { color: '#f87171' }]}>{job.staffReq}</Text>
                  </View>
                  <View style={styles.jobOverlayStat}>
                    <Text style={styles.jobOverlayStatLabel}>{t('tax_15pct')}</Text>
                    <Text style={[styles.jobOverlayStatValue, { color: '#f87171' }]}>{formatMoney(Math.round(job.payout * 0.15))}</Text>
                  </View>
                </View>
                <View style={styles.materialsRow}>
                  {Object.entries(job.resources).map(([resId, amount]) => {
                    const res = getResource(resId);
                    const have = resources[resId] || 0;
                    const enough = have >= amount;
                    return (
                      <View key={resId} style={styles.materialChip}>
                        <Text style={styles.materialChipEmoji}>{res?.emoji}</Text>
                        <Text style={[styles.materialChipText, !enough && { color: '#f87171' }]}>{amount}</Text>
                      </View>
                    );
                  })}
                </View>
                <Animated.View style={!canStart && slotsAvailable && enoughStaff ? { opacity: pulseAnim } : undefined}>
                <Pressable
                  style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
                  onPress={() => {
                    if (!canStart) {
                      if (!hasResources) {
                        const needed = {};
                        for (const [resId, amount] of Object.entries(job.resources)) {
                          const have = resources[resId] || 0;
                          const need = Math.max(0, amount - have);
                          if (need > 0) needed[resId] = String(need);
                        }
                        setBuyQuantities(needed);
                        setSelectedJobPin(null);
                        setTab('materials');
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      return;
                    }
                    handleStartJob(job);
                    setSelectedJobPin(null);
                  }}
                  disabled={canStart ? false : (slotsAvailable && enoughStaff ? false : true)}
                >
                  <Text style={[styles.startBtnText, !canStart && !slotsAvailable && styles.startBtnTextDisabled]}>
                    {!slotsAvailable ? t('slots_full') : !enoughStaff ? tf('need_n_available_staff_count', { v0: job.staffReq, v1: availableStaffCount }) : !hasResources ? t('missing_materials') : t('start_construction')}
                  </Text>
                </Pressable>
                </Animated.View>
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

        {/* No jobs available */}
        {availableJobs.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="hammer-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>{t('alert_no_jobs_refresh')}</Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Staff tab (matching GameDevScreen pattern) ───
  const renderStaff = () => {
    const hiringSlots = MAX_HIRING_AT_ONCE - hiringStaff.length;
    const salaryCost = getStaffSalaryHourly(business);

    return (
      <View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('fin_team_size')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.overviewValue}>{staff}</Text>
            <Pressable onPress={() => setShowTeamRoster(true)} style={{ padding: 4 }}>
              <Ionicons name="people-circle-outline" size={22} color="#f97316" />
            </Pressable>
          </View>
          <Text style={styles.overviewSub}>{availableStaffCount} available - {assignedStaffCount} assigned - {formatMoney(salaryCost)}/hr salary</Text>
        </View>

        <View style={styles.staffGrid}>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_pending_payout')}</Text>
            <Text style={[styles.staffGridValue, { color: '#4ade80' }]}>{formatMoney(pendingPayout)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.staffGridValue, { color: '#f87171' }]}>{formatMoney(salaryCost)}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('available')}</Text>
            <Text style={[styles.staffGridValue, { color: '#4ade80' }]}>{availableStaffCount}</Text>
          </View>
          <View style={styles.staffGridItem}>
            <Text style={styles.staffGridLabel}>{t('constr_assigned')}</Text>
            <Text style={[styles.staffGridValue, { color: '#fbbf24' }]}>{assignedStaffCount}</Text>
          </View>
        </View>

        {hiringStaff.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>PENDING HIRES ({hiringStaff.length}/{MAX_HIRING_AT_ONCE})</Text>
            {hiringStaff.map((hire) => {
              const remaining = Math.max(0, hire.completesAt - Date.now());
              const total = hire.completesAt - (hire.completesAt - (STAFF_HIRE_MAX_MS));
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
        <Text style={styles.hireHint}>Takes {`3s-45m`} per hire. Max {MAX_HIRING_AT_ONCE} at a time. Watch ad to skip.</Text>
      </View>
    );
  };

  // ─── Finance tab (matching GameDevScreen pattern) ───
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
            <Text style={styles.finValue}>{(getBusinessTaxRate({ type: 'construction' }) * 100).toFixed(0)}% Construction</Text>
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
            <Text style={styles.finLabel}>{t('upg_payout_multiplier')}</Text>
            <Text style={[styles.finValue, { color: '#4ade80' }]}>+{Math.round((getConstructionLevelMultiplier(business) - 1) * 100)}%</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('constr_storage_material')}</Text>
            <Text style={styles.finValue}>{BASE_STORAGE_PER_RESOURCE * business.level}</Text>
          </View>
          {!maxed && (
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>{t('upg_next_level')}</Text>
              <Text style={[styles.finValue, { color: '#94a3b8' }]}>+{Math.round((Math.pow(1.12, business.level) - 1) * 100)}% payout · {BASE_STORAGE_PER_RESOURCE * (business.level + 1)} storage</Text>
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
            <Text style={styles.finLabel}>{t('fin_pending_payout')}</Text>
            <Text style={[styles.finValue, { color: '#4ade80' }]}>{formatMoney(pendingPayout)}</Text>
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
            <Text style={styles.finValue}>{staff} workers</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('fin_salary_hr')}</Text>
            <Text style={[styles.finValue, { color: '#f87171' }]}>{formatMoney(getStaffSalaryHourly(business))}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('constr_jobs_completed')}</Text>
            <Pressable style={styles.finCompletedBtn} onPress={() => setShowCompletedModal(true)}>
              <Text style={styles.finCompletedBtnText}>{completedJobs.length}  View →</Text>
            </Pressable>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>{t('constr_active_jobs')}</Text>
            <Text style={styles.finValue}>{activeJobs.length}</Text>
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
        {tab === 'yard' && renderYard()}
        {tab === 'materials' && renderMaterials()}
        {tab === 'jobs' && renderJobs()}
        {tab === 'staff' && renderStaff()}
        {tab === 'finance' && renderFinances()}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Job detail modal */}
      {detailJob && (() => {
        const remaining = getJobTimeRemaining(detailJob);
        const total = detailJob.completesAt - detailJob.startedAt;
        const elapsed = total - remaining;
        const pct = Math.min(100, (elapsed / total) * 100);
        return (
          <View style={styles.detailOverlay}>
            <Pressable style={styles.detailBackdrop} onPress={() => setDetailJob(null)} />
            <View style={styles.detailModal}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailEmoji}>{detailJob.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{detailJob.name}</Text>
                  <Text style={styles.detailStatus}>{detailJob.desc}</Text>
                </View>
                <Pressable onPress={() => setDetailJob(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>
              <View style={styles.detailBody}>
                <View style={styles.detailStatsGrid}>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('fin_payout')}</Text>
                    <Text style={[styles.detailStatValue, { color: '#4ade80' }]}>{formatMoney(detailJob.payout)}</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatLabel}>{t('constr_time_left')}</Text>
                    <Text style={styles.detailStatValue}>{formatTimeRemaining(remaining)}</Text>
                  </View>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('constr_progress')}</Text>
                  <View style={styles.detailHealthBar}>
                    <View style={[styles.detailHealthFill, { width: `${pct}%`, backgroundColor: ACCENT }]} />
                  </View>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('constr_materials_used')}</Text>
                  <View style={styles.materialsUsedRow}>
                    {Object.entries(detailJob.resources || {}).map(([resId, amount]) => {
                      const res = getResource(resId);
                      return (
                        <View key={resId} style={styles.materialChip}>
                          <Text style={styles.materialChipEmoji}>{res?.emoji}</Text>
                          <Text style={styles.materialChipText}>{amount}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ASSIGNED CREW ({(detailJob.assignedStaffIds || []).length})</Text>
                  {(detailJob.assignedStaffIds || []).length > 0 ? (
                    <View style={styles.materialsUsedRow}>
                      {(detailJob.assignedStaffIds || []).map((id) => {
                        const member = staffMembers.find((s) => s.id === id);
                        return (
                          <View key={id} style={styles.materialChip}>
                            <Ionicons name="person" size={12} color="#fbbf24" />
                            <Text style={styles.materialChipText}>{member?.name || t('unknown_staff')}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.detailStatus}>{t('staff_no_crew')}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Ad overlay */}

      {/* Completed jobs modal */}
      {showCompletedModal && (
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={() => setShowCompletedModal(false)} />
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailName}>{t('constr_completed_jobs')}</Text>
              <Pressable hitSlop={12} onPress={() => setShowCompletedModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            {completedJobs.length === 0 ? (
              <Text style={styles.emptyText}>{t('alert_no_completed_jobs')}</Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {completedJobs.slice().reverse().map((job) => (
                  <View key={job.instanceId} style={styles.completedJobCard}>
                    <Text style={styles.jobCardEmoji}>{job.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.completedJobTitle}>{job.name}</Text>
                      <Text style={styles.completedJobMeta}>Paid {formatMoney(job.payout)}</Text>
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
        accentColor="#f97316"
        onFire={(m) => { onConstructionUpdate(fireStaff(business, m.id)); }}
        onRaise={(m) => { onConstructionUpdate(raiseStaff(business, m.id)); }}
        onTrain={(m) => { onConstructionUpdate(trainStaff(business, m.id)); }}
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
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#fff' },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, marginHorizontal: 16, marginBottom: 14, gap: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: ACCENT },
  tabText: { fontSize: 11, color: '#64748b', fontWeight: '700', flexShrink: 1 },
  tabTextActive: { color: '#000', fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  spacer: { height: 60 },
  // Overview card
  overviewCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  overviewLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  overviewValue: { fontSize: 42, fontWeight: '900', color: '#fff', marginBottom: 6 },
  overviewSub: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  incomeBreakdown: { width: '100%', marginTop: 14, marginBottom: 14, paddingHorizontal: 20 },
  incomeBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  incomeBreakdownLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  incomeBreakdownValue: { fontSize: 13, fontWeight: '700' },
  // Section
  sectionTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 1.5, marginTop: 18, marginBottom: 10 },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  // Job cards (active)
  jobCard: { backgroundColor: 'rgba(249,115,22,0.06)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)', borderRadius: 14, padding: 14, marginBottom: 10 },
  jobCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  jobCardEmoji: { fontSize: 24 },
  jobCardTitle: { fontSize: 14, color: '#fff', fontWeight: '700' },
  jobCardMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  jobCardTime: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  devProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  devProgressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  // Deliveries
  deliveryCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  deliveryEmoji: { fontSize: 20 },
  deliveryText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  deliveryTime: { fontSize: 12, color: '#fbbf24', fontWeight: '700' },
  // Completed jobs
  completedJobCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  completedJobTitle: { fontSize: 13, color: '#fff', fontWeight: '700' },
  completedJobMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  finCompletedBtn: { backgroundColor: 'rgba(249,115,22,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  finCompletedBtnText: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  // Resource grid (2 columns)
  resourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resourceCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', position: 'relative' },
  deliveryBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(251, 191, 36, 0.15)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  deliveryBadgeText: { fontSize: 10, color: '#fbbf24', fontWeight: '700' },
  resourceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resourceEmoji: { fontSize: 22 },
  resourceName: { fontSize: 13, color: '#fff', fontWeight: '700' },
  resourceStock: { fontSize: 10, color: '#64748b', marginTop: 2 },
  resourceBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  resourceFill: { height: '100%', borderRadius: 3 },
  buyRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
  buyInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, color: '#fff', fontSize: 13, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  maxBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  maxBtnText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  maxInfoText: { fontSize: 9, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  buyConfirmBtn: { backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  buyConfirmBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.06)' },
  buyConfirmBtnText: { fontSize: 11, fontWeight: '800', color: '#000' },
  buyConfirmBtnTextDisabled: { color: '#475569' },
  storageInfoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  storageInfoText: { fontSize: 11, color: '#64748b', flex: 1 },
  // Jobs store cards
  jobsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  refreshBox: { alignItems: 'flex-end' },
  refreshLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  refreshTime: { fontSize: 13, color: ACCENT, fontWeight: '700' },
  storeCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 22, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  storeImage: { height: 160, alignItems: 'center', justifyContent: 'center' },
  storeEmoji: { fontSize: 64 },
  storeBody: { padding: 16 },
  storeName: { fontSize: 18, color: '#fff', fontWeight: '800', marginBottom: 4 },
  storeDesc: { fontSize: 13, color: '#94a3b8', marginBottom: 14 },
  storeStats: { flexDirection: 'row', gap: 20, marginBottom: 14 },
  storeStat: { alignItems: 'center' },
  storeStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  storeStatValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  materialsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  materialChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  materialChipEmoji: { fontSize: 14 },
  materialChipText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  startBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  startBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.06)' },
  startBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },
  startBtnTextDisabled: { color: '#64748b' },
  buyMaterialsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 8, paddingVertical: 8, marginTop: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  buyMaterialsBtnText: { fontSize: 12, color: '#fbbf24', fontWeight: '700' },
  // Map & zones
  mapArea: { height: 380, backgroundColor: '#0f172a', borderRadius: 16, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  zoomRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  zoomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 10 },
  zoomBtnLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  zoneSummaryCard: { backgroundColor: 'rgba(249,115,22,0.08)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)', borderRadius: 12, padding: 12, marginBottom: 12 },
  zoneSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  zoneSummaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', letterSpacing: 1 },
  zoneSummaryValue: { fontSize: 16, color: ACCENT, fontWeight: '800' },
  zoneHint: { fontSize: 11, color: '#94a3b8' },
  jobPinCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)' },
  jobPinHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  jobPinEmoji: { fontSize: 28 },
  jobPinName: { fontSize: 16, color: '#fff', fontWeight: '800' },
  jobPinZone: { fontSize: 11, color: ACCENT, fontWeight: '600', marginTop: 2 },
  jobPinDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  jobPinStats: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  jobPinStat: { alignItems: 'center' },
  jobPinStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  jobPinStatValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  jobListCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  jobListEmoji: { fontSize: 22 },
  jobListName: { fontSize: 14, color: '#fff', fontWeight: '700' },
  jobListZone: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  // Job overlay card (on-map detail)
  jobOverlayCard: { position: 'absolute', backgroundColor: 'rgba(15,23,42,0.98)', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#fbbf24', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10 },
  jobOverlayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  jobOverlayEmoji: { fontSize: 28 },
  jobOverlayName: { fontSize: 15, color: '#fff', fontWeight: '800' },
  jobOverlayZone: { fontSize: 11, color: ACCENT, fontWeight: '600', marginTop: 2 },
  jobOverlayDesc: { fontSize: 11, color: '#94a3b8', marginBottom: 10 },
  jobOverlayStats: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  jobOverlayStat: { alignItems: 'center' },
  jobOverlayStatLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', marginBottom: 2 },
  jobOverlayStatValue: { fontSize: 12, color: '#fff', fontWeight: '700' },
  // Staff (matching GameDevScreen)
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  staffGridItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  staffGridLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  staffGridValue: { fontSize: 16, color: '#fff', fontWeight: '700' },
  hireProgressCard: { backgroundColor: 'rgba(249,115,22,0.06)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)', borderRadius: 14, padding: 14, marginBottom: 8 },
  hireProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hireProgressInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hireProgressLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  hireProgressTime: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  hireProgressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 10 },
  hireProgressBarFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  hireSkipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 8 },
  hireSkipBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  adSkipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
  adSkipBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  hireRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  hireBtn: { flex: 1, backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  hireBtnDisabled: { opacity: 0.4 },
  hireBtnCount: { fontSize: 16, fontWeight: '800', color: '#4ade80' },
  hireBtnCost: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  hireBtnTime: { fontSize: 9, color: '#64748b', marginTop: 2 },
  hireHint: { fontSize: 11, color: '#64748b', marginBottom: 16, paddingHorizontal: 4 },
  // Finance (matching GameDevScreen)
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
  // Detail modal
  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, elevation: 10000, justifyContent: 'center', alignItems: 'center' },
  detailBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
  detailModal: { width: '90%', maxHeight: '85%', backgroundColor: '#0f172a', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  detailEmoji: { fontSize: 36 },
  detailName: { fontSize: 18, color: '#fff', fontWeight: '800' },
  detailStatus: { fontSize: 13, color: '#64748b', marginTop: 2 },
  detailBody: { padding: 20 },
  detailStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  detailStatBox: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  detailStatLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  detailStatValue: { fontSize: 15, color: '#fff', fontWeight: '800' },
  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 11, color: '#64748b', fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  detailHealthBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  detailHealthFill: { height: '100%', borderRadius: 4 },
  materialsUsedRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  // Ad overlay
  btnDisabled: { opacity: 0.5 },
  // Notifications
  notifContainer: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 10002, elevation: 10002, gap: 8 },
  notif: { backgroundColor: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)' },
  notifWarning: { borderColor: 'rgba(251,191,36,0.2)' },
  notifTitle: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 2 },
  notifMsg: { fontSize: 12, color: '#94a3b8' },
});
