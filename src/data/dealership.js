import { formatMoney } from './market';
import { t } from './i18n';
import { CITY_MAP, getDistrictById } from './bus';
import { generatePerson } from './names';
import { isSuspended } from './businesses';
import { DEALERSHIP_TAX_RATE, startBusiness } from './businesses';
import { scaleDuration, getTaxRateScale } from './store';

// ─── Vehicle types (wholesale → retail) ───
export const VEHICLE_TYPES = [
  {
    id: 'compact',
    get name() { return t('dn_compact_car'); },
    emoji: '🚗',
    color: '#60a5fa',
    wholesale: 750000,
    retail: 1050000,
    sellHours: 3,
    levelUnlock: 1,
    needsBusLicense: false,
    get desc() { return t('dd_entry_level_commuter_cheap_to_buy_quick_'); }
  },
  {
    id: 'sedan',
    get name() { return t('dn_sedan'); },
    emoji: '🚙',
    color: '#34d399',
    wholesale: 1875000,
    retail: 2812500,
    sellHours: 3,
    levelUnlock: 1,
    needsBusLicense: false,
    get desc() { return t('dd_mid_range_family_sedan_with_broad_appeal'); }
  },
  {
    id: 'suv',
    get name() { return t('dn_suv'); },
    emoji: '🚐',
    color: '#fbbf24',
    wholesale: 3750000,
    retail: 6000000,
    sellHours: 4,
    levelUnlock: 3,
    needsBusLicense: false,
    get desc() { return t('dd_spacious_and_practical_strong_resale_val'); }
  },
  {
    id: 'luxury',
    get name() { return t('dn_luxury_sedan'); },
    emoji: '🚘',
    color: '#a78bfa',
    wholesale: 9375000,
    retail: 15750000,
    sellHours: 2.5,
    levelUnlock: 5,
    needsBusLicense: false,
    get desc() { return t('dd_leather_tech_and_status_wealthy_buyers_o'); }
  },
  {
    id: 'sports',
    get name() { return t('dn_sports_car'); },
    emoji: '🏎️',
    color: '#f43f5e',
    wholesale: 18750000,
    retail: 31875000,
    sellHours: 6,
    levelUnlock: 8,
    needsBusLicense: false,
    get desc() { return t('dd_head_turning_performance_car_for_enthusi'); }
  },
  {
    id: 'bus',
    get name() { return t('dn_city_bus'); },
    emoji: '🚌',
    color: '#22d3ee',
    wholesale: 4500000,
    retail: 7500000,
    sellHours: 4,
    levelUnlock: 5,
    needsBusLicense: true,
    get desc() { return t('dd_fleet_vehicle_for_transit_operators_lice'); }
  },
  {
    id: 'evcar',
    get name() { return t('dn_electric_car'); },
    emoji: '⚡',
    color: '#4ade80',
    wholesale: 11250000,
    retail: 18750000,
    sellHours: 5,
    levelUnlock: 10,
    needsBusLicense: false,
    get desc() { return t('dd_electric_commuter_tax_incentives_drive_d'); }
  },
  {
    id: 'evsuv',
    get name() { return t('dn_electric_suv'); },
    emoji: '🔋',
    color: '#2dd4bf',
    wholesale: 16875000,
    retail: 28125000,
    sellHours: 5,
    levelUnlock: 12,
    needsBusLicense: false,
    get desc() { return t('dd_electric_suv_with_premium_range_and_feat'); }
  },
  {
    id: 'supercar',
    get name() { return t('dn_supercar'); },
    emoji: '🏁',
    color: '#fb7185',
    wholesale: 45000000,
    retail: 82500000,
    sellHours: 3,
    levelUnlock: 15,
    needsBusLicense: false,
    get desc() { return t('dd_limited_production_collectors_and_enthus'); }
  },
  {
    id: 'evbus',
    get name() { return t('dn_electric_bus'); },
    emoji: '🚍',
    color: '#38bdf8',
    wholesale: 22500000,
    retail: 37500000,
    sellHours: 6,
    levelUnlock: 15,
    needsBusLicense: true,
    get desc() { return t('dd_zero_emission_fleet_vehicle_license_requ'); }
  },
  {
    id: 'hypercar',
    get name() { return t('dn_hypercar'); },
    emoji: '🚀',
    color: '#facc15',
    wholesale: 112500000,
    retail: 206250000,
    sellHours: 3.5,
    levelUnlock: 20,
    needsBusLicense: false,
    get desc() { return t('dd_hand_built_exotic_seven_figure_clientele'); }
  },
  {
    id: 'autonomous',
    get name() { return t('dn_autonomous_vehicle'); },
    emoji: '🤖',
    color: '#c084fc',
    wholesale: 67500000,
    retail: 127500000,
    sellHours: 3.5,
    levelUnlock: 25,
    needsBusLicense: false,
    get desc() { return t('dd_ai_piloted_luxury_pod_cutting_edge_tech'); }
  },
];

export function getVehicleType(typeId) {
  return VEHICLE_TYPES.find((v) => v.id === typeId) || null;
}

// ─── Dealership zones (one per city district) ───
export const DEALERSHIP_ZONES = [
  {
    id: 'suburbs',
    get name() { return t('dn_suburbs'); },
    levelUnlock: 1,
    openCost: 0,
    footfall: 1.0,
    lotCapacity: 6,
    popularVehicles: ['compact', 'sedan', 'suv'],
    get desc() { return t('dd_quiet_residential_area_steady_family_car'); },
  },
  {
    id: 'harbour',
    get name() { return t('dn_harbour'); },
    levelUnlock: 3,
    openCost: 3000000,
    footfall: 0.8,
    lotCapacity: 5,
    popularVehicles: ['luxury', 'sports'],
    get desc() { return t('dd_waterfront_premium_buyers'); },
  },
  {
    id: 'park',
    get name() { return t('dn_park'); },
    levelUnlock: 3,
    openCost: 2250000,
    footfall: 0.8,
    lotCapacity: 4,
    popularVehicles: ['compact', 'evcar'],
    get desc() { return t('dd_green_neighbourhood_eco_conscious_buyers'); },
  },
  {
    id: 'oldtown',
    get name() { return t('dn_old_town'); },
    levelUnlock: 5,
    openCost: 5625000,
    footfall: 1.1,
    lotCapacity: 7,
    popularVehicles: ['sedan', 'luxury', 'bus'],
    get desc() { return t('dd_historic_area_mixed_demand'); },
  },
  {
    id: 'industrial',
    get name() { return t('dn_industrial'); },
    levelUnlock: 8,
    openCost: 7500000,
    footfall: 1.3,
    lotCapacity: 10,
    popularVehicles: ['bus', 'suv', 'evbus'],
    get desc() { return t('dd_heavy_traffic_commercial_vehicle_hub'); },
  },
  {
    id: 'university',
    get name() { return t('dn_university'); },
    levelUnlock: 12,
    openCost: 13125000,
    footfall: 1.4,
    lotCapacity: 12,
    popularVehicles: ['compact', 'evcar', 'sports'],
    get desc() { return t('dd_young_buyers_trendy_vehicles'); },
  },
  {
    id: 'downtown',
    get name() { return t('dn_downtown'); },
    levelUnlock: 18,
    openCost: 30000000,
    footfall: 2.0,
    lotCapacity: 15,
    popularVehicles: ['luxury', 'supercar', 'hypercar'],
    get desc() { return t('dd_premium_location_high_end_buyers'); },
  },
];

export function getDealershipZone(zoneId) {
  return DEALERSHIP_ZONES.find((z) => z.id === zoneId) || null;
}

export function getUnlockedZones(business) {
  const level = business.level || 1;
  return DEALERSHIP_ZONES.filter((z) => level >= z.levelUnlock);
}

export function getOwnedDealerships(business) {
  return business.dealerships || [];
}

export function getDealershipByZone(business, zoneId) {
  return (business.dealerships || []).find((d) => d.zoneId === zoneId) || null;
}

// ─── Bus license ───
export const BUS_LICENSE_COST = 15000;

export function hasBusLicense(business) {
  return !!business.busLicense;
}

export function canBuyBusLicense(business, ownedBusinesses) {
  if (hasBusLicense(business)) return false;
  const hasBusCompany = (ownedBusinesses || []).some((b) => b.type === 'bus');
  return hasBusCompany;
}

export function buyBusLicense(business) {
  return { ...business, busLicense: true };
}

// ─── Staff ───
export const STAFF_HIRE_COST = 750000;
export const STAFF_SALARY_HOURLY = 1125;
export const STAFF_HIRE_MIN_MS = 3000;
export const STAFF_HIRE_MAX_MS = 45 * 60 * 1000;
export const MAX_HIRING_AT_ONCE = 3;

function makeStaffMember() {
  const person = generatePerson();
  return {
    id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: person.name,
    gender: person.gender,
    age: person.age,
    skill: Math.floor(Math.random() * 5) + 3,
    salary: STAFF_SALARY_HOURLY,
    hiredAt: Date.now(),
  };
}

export function getStaffMembers(business) {
  return business.staffMembers || [];
}

export function fireStaff(business, staffId) {
  return {
    ...business,
    staff: Math.max(0, (business.staff || 0) - 1),
    staffMembers: (business.staffMembers || []).filter((s) => s.id !== staffId),
  };
}

export function raiseStaff(business, staffId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === staffId) return { ...s, salary: Math.round((s.salary || STAFF_SALARY_HOURLY) * 1.15) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function trainStaff(business, staffId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === staffId) return { ...s, skill: Math.min(10, (s.skill || 5) + 1) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function getMaxLotCapacity(zoneId) {
  const zone = getDealershipZone(zoneId);
  return zone ? zone.lotCapacity : 0;
}

export function getStaffSalaryHourly(business) {
  return (business.staffMembers || []).reduce((total, m) => total + (m.salary || STAFF_SALARY_HOURLY), 0);
}

export function hireStaff(business) {
  const hiring = business.hiringStaff || [];
  if (hiring.length >= MAX_HIRING_AT_ONCE) return { error: 'max_hiring' };
  const duration = Math.random() < 0.3 ? 0 : STAFF_HIRE_MIN_MS + Math.random() * (STAFF_HIRE_MAX_MS - STAFF_HIRE_MIN_MS);
  const completesAt = Date.now() + scaleDuration(duration);
  return {
    ...business,
    hiringStaff: [...hiring, { instanceId: `hire_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, completesAt }],
  };
}

export function completeHiredStaff(business) {
  const hiring = business.hiringStaff || [];
  const completed = hiring.filter((h) => h.completesAt <= Date.now());
  if (completed.length === 0) return business;
  let staffMembers = business.staffMembers || [];
  if (staffMembers.length === 0 && (business.staff || 0) > 0) {
    staffMembers = Array.from({ length: business.staff }, () => makeStaffMember());
  }
  const newMembers = completed.map(() => makeStaffMember());
  return {
    ...business,
    staff: (business.staff || 0) + completed.length,
    staffMembers: [...staffMembers, ...newMembers],
    hiringStaff: hiring.filter((h) => h.completesAt > Date.now()),
  };
}

export function instantHireStaff(business, hireId) {
  const hiring = business.hiringStaff || [];
  const hire = hiring.find((h) => h.instanceId === hireId);
  if (!hire) return business;
  let staffMembers = business.staffMembers || [];
  if (staffMembers.length === 0 && (business.staff || 0) > 0) {
    staffMembers = Array.from({ length: business.staff }, () => makeStaffMember());
  }
  return {
    ...business,
    staff: (business.staff || 0) + 1,
    staffMembers: [...staffMembers, makeStaffMember()],
    hiringStaff: hiring.filter((h) => h.instanceId !== hireId),
  };
}

// ─── Vehicle delivery ───
export const VEHICLE_DELIVERY_MIN_MS = 1 * 60 * 1000; // 1 min
export const VEHICLE_DELIVERY_MAX_MS = 3 * 60 * 1000; // 3 min

export const VEHICLE_MAX_UPGRADES = 10;
const VEHICLE_UPGRADE_NAME_KEYS = [
  'dn_body_kit',
  'dn_custom_paint',
  'dn_alloy_wheels',
  'dn_lowered_suspension',
  'dn_tinted_windows',
  'dn_leather_interior',
  'dn_premium_audio',
  'dn_turbo_upgrade',
  'dn_carbon_trim',
  'dn_ceramic_coating',
];
export const VEHICLE_UPGRADE_NAMES = new Proxy(VEHICLE_UPGRADE_NAME_KEYS, {
  get(target, prop) {
    const v = target[prop];
    return typeof v === 'string' && v.startsWith('dn_') ? t(v) : v;
  },
});

export function getVehicleUpgradeCost(vehicle, level) {
  return Math.round(vehicle.wholesale * 0.025 * (level + 1));
}

export function getUpgradedRetail(vehicle) {
  const upgrades = vehicle.upgrades || 0;
  const mult = 1 + upgrades * 0.30;
  const base = vehicle.baseRetail || vehicle.retail || 0;
  return Math.round(base * mult);
}

export function getDeliveryTimeRemaining(delivery) {
  if (!delivery.deliveredAt) return 0;
  return Math.max(0, delivery.deliveredAt - Date.now());
}

export function getArrivedDeliveries(business) {
  const now = Date.now();
  return (business.pendingDeliveries || []).filter((d) => d.deliveredAt <= now);
}

export function processDeliveries(business) {
  const arrived = getArrivedDeliveries(business);
  if (arrived.length === 0) return business;
  const pending = (business.pendingDeliveries || []).filter((d) => d.deliveredAt > Date.now());
  let dealerships = [...(business.dealerships || [])];
  for (const d of arrived) {
    const idx = dealerships.findIndex((dp) => dp.zoneId === d.zoneId);
    if (idx >= 0) {
      const zone = getDealershipZone(d.zoneId);
      const type = getVehicleType(d.typeId);
      const isPopular = zone && type && zone.popularVehicles.includes(type.id);
      const popularityMult = isPopular ? 2.0 : 1.0;
      const sellSpeedMult = 1 + (Math.max(1, business.level || 1) - 1) * 0.015;
      const footfall = zone ? zone.footfall : 1.0;
      const sellHours = type ? type.sellHours : 4;
      const sellMs = sellHours * 60 * 60 * 1000 / (footfall * popularityMult * sellSpeedMult);
      dealerships[idx] = {
        ...dealerships[idx],
        inventory: [...(dealerships[idx].inventory || []), {
          instanceId: d.instanceId,
          typeId: d.typeId,
          name: d.name,
          emoji: d.emoji,
          color: d.color,
          wholesale: d.wholesale,
          baseRetail: d.retail,
          retail: d.retail,
          upgrades: 0,
          listedAt: null,
          sellsAt: null,
        }],
      };
    }
  }
  return { ...business, pendingDeliveries: pending, dealerships };
}

export function instantDelivery(business, deliveryId) {
  const delivery = (business.pendingDeliveries || []).find((d) => d.instanceId === deliveryId);
  if (!delivery) return business;
  const updated = {
    ...business,
    pendingDeliveries: (business.pendingDeliveries || []).map((d) =>
      d.instanceId === deliveryId ? { ...d, deliveredAt: Date.now() } : d
    ),
  };
  return processDeliveries(updated);
}

// ─── Buy vehicle (wholesale) ───
export function buyVehicle(business, typeId, zoneId) {
  const type = getVehicleType(typeId);
  if (!type) return { error: 'invalid_type' };
  const level = business.level || 1;
  if (level < type.levelUnlock) return { error: 'level_locked' };
  if (type.needsBusLicense && !hasBusLicense(business)) return { error: 'no_license' };
  const dealership = getDealershipByZone(business, zoneId);
  if (!dealership) return { error: 'no_dealership' };
  const cap = getMaxLotCapacity(zoneId, business);
  const currentInv = (dealership.inventory || []).length;
  const pending = (business.pendingDeliveries || []).filter((d) => d.zoneId === zoneId).length;
  if (currentInv + pending >= cap) return { error: 'lot_full', capacity: cap };
  const deliveryMs = VEHICLE_DELIVERY_MIN_MS + Math.random() * (VEHICLE_DELIVERY_MAX_MS - VEHICLE_DELIVERY_MIN_MS);
  const delivery = {
    instanceId: `delivery_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    typeId,
    name: type.name,
    emoji: type.emoji,
    color: type.color,
    wholesale: type.wholesale,
    retail: type.retail,
    zoneId,
    deliveredAt: Date.now() + scaleDuration(Math.random() < 0.3 ? 0 : deliveryMs),
  };
  return {
    ...business,
    pendingDeliveries: [...(business.pendingDeliveries || []), delivery],
    capitalisation: (business.capitalisation || 0) + type.wholesale,
    cost: type.wholesale,
  };
}

// ─── Open a new dealership (6 hour timer) ───
export const DEALERSHIP_OPEN_MS_MIN = 3000;
export const DEALERSHIP_OPEN_MS_MAX = 45 * 60 * 1000;

export function getOpeningTimeRemaining(dealership) {
  if (!dealership || !dealership.openingAt) return 0;
  return Math.max(0, dealership.openingAt - Date.now());
}

export function isDealershipOpen(dealership) {
  if (!dealership) return false;
  return !dealership.openingAt || dealership.openingAt <= Date.now();
}

export function getOpeningDealerships(business) {
  return (business.dealerships || []).filter((dp) => !isDealershipOpen(dp));
}

export function completeOpeningDealerships(business) {
  const dealerships = (business.dealerships || []).map((dp) => {
    if (dp.openingAt && dp.openingAt <= Date.now()) {
      const { openingAt, ...rest } = dp;
      return rest;
    }
    return dp;
  });
  return { ...business, dealerships };
}

export function openDealership(business, zoneId) {
  const zone = getDealershipZone(zoneId);
  if (!zone) return { error: 'invalid_zone' };
  const level = business.level || 1;
  if (level < zone.levelUnlock) return { error: 'level_locked' };
  const existing = getDealershipByZone(business, zoneId);
  if (existing) return { error: 'already_owned' };
  const dealership = {
    zoneId,
    name: `${zone.name} Dealership`,
    inventory: [],
    openedAt: Date.now(),
    openingAt: Date.now() + scaleDuration(Math.random() < 0.3 ? 0 : DEALERSHIP_OPEN_MS_MIN + Math.random() * (DEALERSHIP_OPEN_MS_MAX - DEALERSHIP_OPEN_MS_MIN)),
  };
  return {
    ...business,
    dealerships: [...(business.dealerships || []), dealership],
    capitalisation: (business.capitalisation || 0) + zone.openCost,
    cost: zone.openCost,
  };
}

export function instantOpenDealership(business, zoneId) {
  const dealerships = (business.dealerships || []).map((dp) => {
    if (dp.zoneId === zoneId && dp.openingAt) {
      const { openingAt, ...rest } = dp;
      return rest;
    }
    return dp;
  });
  return { ...business, dealerships };
}

// ─── Sell mechanics ───
// When a vehicle is listed, it gets a sellsAt timestamp based on:
// base sellHours / (footfall * popularityMult * levelMult)
export function listVehicleForSale(dealership, vehicle, business) {
  const zone = getDealershipZone(dealership.zoneId);
  if (!zone) return vehicle;
  const sellSpeedMult = 1 + (Math.max(1, business.level || 1) - 1) * 0.015;
  const sellMs = (vehicle.sellHours || 4) * 60 * 60 * 1000 / (zone.footfall * sellSpeedMult);
  return { ...vehicle, listedAt: Date.now(), sellsAt: Date.now() + scaleDuration(Math.random() < 0.3 ? 0 : sellMs) };
}

export function upgradeVehicle(business, zoneId, vehicleId) {
  let cost = 0;
  const dealerships = (business.dealerships || []).map((dp) => {
    if (dp.zoneId !== zoneId) return dp;
    const vehicle = (dp.inventory || []).find((v) => v.instanceId === vehicleId);
    if (!vehicle) return dp;
    if ((vehicle.upgrades || 0) >= VEHICLE_MAX_UPGRADES) return dp;
    if (vehicle.sellsAt) return dp;
    cost = getVehicleUpgradeCost(vehicle, vehicle.upgrades || 0);
    const newUpgrades = (vehicle.upgrades || 0) + 1;
    const base = vehicle.baseRetail || vehicle.retail;
    const newRetail = Math.round(base * (1 + newUpgrades * 0.30));
    return {
      ...dp,
      inventory: (dp.inventory || []).map((v) =>
        v.instanceId === vehicleId
          ? { ...v, baseRetail: base, upgrades: newUpgrades, retail: newRetail }
          : v
      ),
    };
  });
  return { ...business, dealerships, cost };
}

export function sellVehicle(business, zoneId, vehicleId) {
  const dealerships = (business.dealerships || []).map((dp) => {
    if (dp.zoneId !== zoneId) return dp;
    const vehicle = (dp.inventory || []).find((v) => v.instanceId === vehicleId);
    if (!vehicle) return dp;
    if (vehicle.sellsAt) return dp;
    const updated = listVehicleForSale(dp, vehicle, business);
    return {
      ...dp,
      inventory: (dp.inventory || []).map((v) =>
        v.instanceId === vehicleId ? updated : v
      ),
    };
  });
  return { ...business, dealerships };
}

export function instantSellVehicle(business, zoneId, vehicleId) {
  let soldVehicle = null;
  const dealerships = (business.dealerships || []).map((dp) => {
    if (dp.zoneId !== zoneId) return dp;
    const vehicle = (dp.inventory || []).find((v) => v.instanceId === vehicleId);
    if (!vehicle) return dp;
    soldVehicle = vehicle;
    const profit = vehicle.retail - vehicle.wholesale;
    const tax = Math.round(Math.max(0, profit) * DEALERSHIP_TAX_RATE * getTaxRateScale());
    return {
      ...dp,
      inventory: (dp.inventory || []).filter((v) => v.instanceId !== vehicleId),
      soldHistory: [...(dp.soldHistory || []), { ...vehicle, soldAt: Date.now(), tax }].slice(-50),
    };
  });
  if (!soldVehicle) return business;
  const profit = soldVehicle.retail - soldVehicle.wholesale;
  const tax = Math.round(Math.max(0, profit) * DEALERSHIP_TAX_RATE * getTaxRateScale());
  const netRevenue = soldVehicle.retail - tax;
  return {
    ...business,
    dealerships,
    allTimeEarnings: (business.allTimeEarnings || 0) + netRevenue,
    completedSales: (business.completedSales || 0) + 1,
  };
}

// Process sales - called from processDealership
export function processDealership(business, minutesElapsed) {
  const dealerships = business.dealerships || [];
  if (dealerships.length === 0) {
    const salary = getStaffSalaryHourly(business);
    return { updatedBusiness: business, income: -salary * (minutesElapsed / 60) };
  }
  const now = Date.now();
  let totalRevenue = 0;
  let totalTax = 0;
  const level = business.level || 1;
  let newSalesCount = 0;
  const updatedDealerships = dealerships.map((dp) => {
    if (!isDealershipOpen(dp)) return dp;
    const zone = getDealershipZone(dp.zoneId);
    if (!zone) return dp;
    const remainingInv = [];
    const soldLog = [];
    for (const v of (dp.inventory || [])) {
      if (v.sellsAt && v.sellsAt <= now) {
        const profit = v.retail - v.wholesale;
        const tax = Math.round(Math.max(0, profit) * DEALERSHIP_TAX_RATE * getTaxRateScale());
        totalRevenue += v.retail - tax;
        totalTax += tax;
        soldLog.push({ ...v, soldAt: now, tax });
        newSalesCount++;
      } else {
        remainingInv.push(v);
      }
    }
    return {
      ...dp,
      inventory: remainingInv,
      soldHistory: [...(dp.soldHistory || []), ...soldLog].slice(-50),
    };
  });
  const salary = getStaffSalaryHourly(business);
  const netIncome = totalRevenue - salary * (minutesElapsed / 60);
  const updatedBusiness = {
    ...business,
    dealerships: updatedDealerships,
    allTimeEarnings: (business.allTimeEarnings || 0) + netIncome,
    completedSales: (business.completedSales || 0) + newSalesCount,
  };
  return { updatedBusiness, income: netIncome, tax: totalTax };
}

// ─── Income calculation ───
export function getDealershipLevelMultiplier(business) {
  return Math.pow(1.12, Math.max(1, business.level || 1) - 1);
}

export function getDealershipBranchProfitHourly(dp, business) {
  if (!isDealershipOpen(dp)) return 0;
  const zone = getDealershipZone(dp.zoneId);
  if (!zone) return 0;
  const level = business.level || 1;
  const levelMult = getDealershipLevelMultiplier(business);
  let total = 0;
  for (const v of (dp.inventory || [])) {
    if (!v.sellsAt) continue;
    const type = getVehicleType(v.typeId);
    if (!type) continue;
    const sellSpeedMult = 1 + (Math.max(1, level) - 1) * 0.015;
    const effectiveSellHours = type.sellHours / (zone.footfall * sellSpeedMult);
    const profitPerHour = (v.retail - v.wholesale) / effectiveSellHours;
    total += profitPerHour * levelMult;
  }
  return total;
}

export function getDealershipProfitHourly(business) {
  const dealerships = business.dealerships || [];
  if (dealerships.length === 0) return 0;
  let total = 0;
  for (const dp of dealerships) {
    total += getDealershipBranchProfitHourly(dp, business);
  }
  return total;
}

export function getDealershipHourlyIncome(business) {
  const total = getDealershipProfitHourly(business);
  const salary = getStaffSalaryHourly(business);
  return Math.floor(total - salary);
}

export function getDealershipPendingSales(business) {
  const dealerships = business.dealerships || [];
  let total = 0;
  for (const dp of dealerships) {
    for (const v of (dp.inventory || [])) {
      if (v.sellsAt) {
        const profit = v.retail - v.wholesale;
        const tax = Math.round(Math.max(0, profit) * DEALERSHIP_TAX_RATE * getTaxRateScale());
        total += v.retail - tax;
      }
    }
  }
  return total;
}

// ─── Get completed sales across all dealerships ───
export function getAllCompletedSales(business) {
  const dealerships = business.dealerships || [];
  const all = [];
  for (const dp of dealerships) {
    for (const sale of (dp.soldHistory || [])) {
      all.push({ ...sale, zoneId: dp.zoneId, zoneName: getDealershipZone(dp.zoneId)?.name || '' });
    }
  }
  return all.sort((a, b) => (b.soldAt || 0) - (a.soldAt || 0));
}

// ─── Get pending deliveries for a zone ───
export function getPendingForZone(business, zoneId) {
  return (business.pendingDeliveries || []).filter((d) => d.zoneId === zoneId);
}

// ─── Random point in district (for map pins) ───
export function getRandomPointInDistrict(districtId) {
  const d = CITY_MAP.districts.find((d) => d.id === districtId);
  if (!d) return null;
  const pts = d.polygon.split(' ').map((pt) => pt.split(',').map(Number));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const inside = (px, py) => {
    let odd = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        odd = !odd;
      }
    }
    return odd;
  };
  for (let i = 0; i < 50; i++) {
    const px = minX + Math.random() * (maxX - minX);
    const py = minY + Math.random() * (maxY - minY);
    if (inside(px, py)) return { x: px, y: py };
  }
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  return { x: cx / pts.length, y: cy / pts.length };
}

export function getDistrictCentroid(districtId) {
  const d = CITY_MAP.districts.find((d) => d.id === districtId);
  if (!d) return null;
  const pts = d.polygon.split(' ').map((pt) => pt.split(',').map(Number));
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  return { x: cx / pts.length, y: cy / pts.length };
}

export { CITY_MAP };

// ─── Founders Bundle ───
// A ready-to-earn dealership: suburbs lot already open (no openingAt timer)
// with a starter inventory already listed for sale, so it earns immediately.
export function createFoundersDealership() {
  const business = startBusiness('dealership', 'dealer');
  if (!business) return null;
  const mkVehicle = (typeId, i) => {
    const type = getVehicleType(typeId);
    const vehicle = {
      instanceId: `founders_${typeId}_${Date.now()}_${i}`,
      typeId,
      name: type.name,
      emoji: type.emoji,
      color: type.color,
      wholesale: type.wholesale,
      baseRetail: type.retail,
      retail: type.retail,
      upgrades: 0,
      listedAt: null,
      sellsAt: null,
    };
    return listVehicleForSale({ zoneId: 'suburbs' }, vehicle, business);
  };
  const inventory = [mkVehicle('compact', 0), mkVehicle('compact', 1), mkVehicle('sedan', 2)];
  return {
    ...business,
    name: 'Founders Dealership',
    dealerships: [{
      zoneId: 'suburbs',
      name: 'Suburbs Dealership',
      inventory,
      openedAt: Date.now(),
    }],
  };
}
