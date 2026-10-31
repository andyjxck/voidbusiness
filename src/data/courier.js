import { formatMoney } from './market';
import { t, tf } from './i18n';
import { isSuspended } from './businesses';
import { scaleDuration } from './store';
import { CITY_MAP, getDistrictById } from './bus';

// ─── Car Types (delivery vehicles) ───
// Tier 1-2: food only, no district requirement
// Tier 3: food + parcel, requires Old Town or Industrial
// Tier 4: food + parcel, requires Industrial
// Tier 5: all jobs, requires Downtown or University
export const CAR_TYPES = [
  {
    id: 'bicycle',
    get name() { return t('dn_e_bike'); },
    color: '#4ade80',
    cost: 10000,
    baseHourlyIncome: 1400,
    maxMiles: 1200,
    tier: 1,
    jobTypes: ['food'],
    maxZones: 2,
    requiresDistrict: null,
    emoji: '🚲',
    get description() { return t('dd_cheap_and_nimble_food_deliveries_only'); },
  },
  {
    id: 'scooter',
    get name() { return t('dn_delivery_scooter'); },
    color: '#38bdf8',
    cost: 40000,
    baseHourlyIncome: 3500,
    maxMiles: 2000,
    tier: 2,
    jobTypes: ['food'],
    maxZones: 3,
    requiresDistrict: null,
    emoji: '🛵',
    get description() { return t('dd_fast_for_city_food_runs_food_deliveries_'); },
  },
  {
    id: 'hatchback',
    get name() { return t('dn_hatchback'); },
    color: '#fbbf24',
    cost: 120000,
    baseHourlyIncome: 8400,
    maxMiles: 3000,
    tier: 3,
    jobTypes: ['food', 'parcel'],
    maxZones: 3,
    requiresDistrict: ['oldtown', 'industrial'],
    emoji: '🚗',
    get description() { return t('dd_unlocks_parcel_delivery_versatile_city_c'); },
  },
  {
    id: 'van',
    get name() { return t('dn_delivery_van'); },
    color: '#a78bfa',
    cost: 300000,
    baseHourlyIncome: 21000,
    maxMiles: 5000,
    tier: 4,
    jobTypes: ['food', 'parcel'],
    maxZones: 5,
    requiresDistrict: ['industrial'],
    emoji: '🚐',
    get description() { return t('dd_big_capacity_premium_zones_for_parcels'); },
  },
  {
    id: 'luxury',
    get name() { return t('dn_luxury_sedan'); },
    color: '#f43f5e',
    cost: 800000,
    baseHourlyIncome: 30000,
    maxMiles: 10000,
    tier: 5,
    jobTypes: ['food', 'parcel', 'taxi'],
    maxZones: 7,
    requiresDistrict: ['downtown', 'university'],
    emoji: '🚘',
    get description() { return t('dd_unlocks_taxi_service_and_all_zones_top_t'); },
  },
];

// ─── Job Types ───
export const JOB_TYPES = {
  food: {
    id: 'food',
    get name() { return t('dn_food_delivery'); },
    emoji: '🍔',
    color: '#f97316',
    incomeMultiplier: 1.0,
    milesPerJob: 5,
    jobsPerHour: 3,
    deliveryTimeMins: 15,
    get description() { return t('dd_low_income_high_frequency_more_miles_les'); },
  },
  parcel: {
    id: 'parcel',
    get name() { return t('dn_parcel_delivery'); },
    emoji: '📦',
    color: '#8b5cf6',
    incomeMultiplier: 1.5,
    milesPerJob: 3,
    jobsPerHour: 1.5,
    deliveryTimeMins: 45,
    get description() { return t('dd_better_per_job_income_less_frequent_fewe'); },
  },
  taxi: {
    id: 'taxi',
    get name() { return t('dn_taxi_service'); },
    emoji: '🚕',
    color: '#fbbf24',
    incomeMultiplier: 3.0,
    milesPerJob: 10,
    jobsPerHour: 2.5,
    deliveryTimeMins: 30,
    get description() { return t('dd_highest_income_highest_frequency_most_mi'); },
  },
};

// ─── District plots (purchasable) ───
export const DISTRICT_PLOTS = {
  suburbs:    { id: 'suburbs',    get name() { return t('dn_suburbs'); },    cost: 40000,    unlockFleet: 0,  unlockDrivers: 0,  unlockEarnings: 0 },
  harbour:    { id: 'harbour',    get name() { return t('dn_harbour'); },    cost: 160000,    unlockFleet: 0,  unlockDrivers: 0,  unlockEarnings: 0 },
  park:       { id: 'park',       get name() { return t('dn_park'); },       cost: 160000,    unlockFleet: 0,  unlockDrivers: 0,  unlockEarnings: 0 },
  oldtown:    { id: 'oldtown',    get name() { return t('dn_old_town'); },   cost: 600000,   unlockFleet: 5,  unlockDrivers: 0,  unlockEarnings: 0 },
  industrial: { id: 'industrial', get name() { return t('dn_industrial'); }, cost: 600000,   unlockFleet: 5,  unlockDrivers: 0,  unlockEarnings: 0 },
  downtown:   { id: 'downtown',   get name() { return t('dn_downtown'); },   cost: 6000000,  unlockFleet: 7,  unlockDrivers: 14, unlockEarnings: 10000000 },
  university: { id: 'university', get name() { return t('dn_university'); }, cost: 6000000,  unlockFleet: 7,  unlockDrivers: 14, unlockEarnings: 10000000 },
};

// Zone income multipliers per job type
export const ZONE_JOB_MULTIPLIERS = {
  suburbs:  { food: 1.0, parcel: 1.0, taxi: 1.0 },
  harbour:  { food: 0.8, parcel: 1.2, taxi: 0.9 },
  park:     { food: 0.9, parcel: 0.8, taxi: 1.1 },
  oldtown:  { food: 1.3, parcel: 1.4, taxi: 1.3 },
  industrial:{ food: 1.5, parcel: 1.6, taxi: 1.2 },
  university:{ food: 1.8, parcel: 1.5, taxi: 1.6 },
  downtown:  { food: 2.5, parcel: 2.2, taxi: 2.8 },
};

// ─── Staff costs ───
export const STAFF_HIRE_COST = 30000;
export const STAFF_SALARY_HOURLY = 150;
export const STAFF_HIRE_MIN_MS = 3000;
export const STAFF_HIRE_MAX_MS = 45 * 60 * 1000;
export const MAX_HIRING_AT_ONCE = 3;

// ─── Insurance ───
export const INSURANCE_DAILY_RATE = 0.05;
export const INSURANCE_HEALTH_THRESHOLD = 0.55;
export const INSURANCE_SCRAP_REFUND_RATE = 0.75;

// ─── Delivery time ───
export const CAR_DELIVERY_HOURS = 0.1;

// ─── Driver names ───
import { generatePerson } from './names';

function generateDriver() {
  const person = generatePerson();
  return { name: person.name, gender: person.gender, age: person.age };
}

// ─── Migration (old anonymous staff → named drivers) ───
function migrateCourierBusiness(business) {
  if (business.courierMigrated) return business;

  const migrated = { ...business };

  if (typeof business.staff === 'number' && !business.staffMembers) {
    migrated.staffMembers = Array.from({ length: business.staff }, (_, i) => ({
      id: `courier_driver_migrated_${i}_${Date.now()}`,
      ...generateDriver(),
      hiredAt: Date.now(),
    }));
    delete migrated.staff;
  }

  if (business.hiringStaff) {
    migrated.hiringStaff = business.hiringStaff.map((h) => ({
      ...h,
      ...(h.name ? { name: h.name } : generateDriver()),
    }));
  }

  if (business.fleet) {
    migrated.fleet = business.fleet.map((car) => {
      const carType = getCarType(car.typeId);
      const { assignedZone, ...rest } = car;
      return {
        ...rest,
        assignedZones: car.assignedZones || (assignedZone ? [assignedZone] : []),
        activeJobType: car.activeJobType || (carType ? carType.jobTypes[0] : 'food'),
        assignedDriverId: car.assignedDriverId || null,
        insured: car.insured || false,
      };
    });
  }

  if (!migrated.ownedDistricts) {
    migrated.ownedDistricts = [];
  }

  migrated.courierMigrated = true;
  return migrated;
}

// ─── Helpers ───
export function getCarType(typeId) {
  return CAR_TYPES.find((c) => c.id === typeId);
}

export function getCarTier(typeId) {
  const car = getCarType(typeId);
  return car ? car.tier : 0;
}

export function getJobType(jobId) {
  return JOB_TYPES[jobId] || null;
}

export function getCarLevelMultiplier(business) {
  const level = Math.max(1, business.level || 1);
  return Math.pow(1.12, level - 1);
}

export function getMaxCarSlots(business) {
  const level = Math.max(1, business.level || 1);
  return Math.floor(3 + (30 - 3) * (level - 1) / 29);
}

export function getActiveCars(business) {
  const fleet = business.fleet || [];
  return fleet.filter(
    (c) => isCarDelivered(c) && c.milesRemaining > 0 && !c.needsMaintenance && c.assignedDriverId
  ).length;
}

// ─── District functions ───
export function getOwnedDistricts(business) {
  return business.ownedDistricts || [];
}

export function isDistrictOwned(business, districtId) {
  return getOwnedDistricts(business).includes(districtId);
}

export function isDistrictUnlocked(business, districtId) {
  const plot = DISTRICT_PLOTS[districtId];
  if (!plot) return false;
  const fleetSize = (business.fleet || []).length;
  const driverCount = (business.staffMembers || []).length;
  const earnings = Math.max(0, business.allTimeEarnings || 0);
  return fleetSize >= plot.unlockFleet && driverCount >= plot.unlockDrivers && (plot.unlockEarnings <= 0 || earnings >= plot.unlockEarnings);
}

export function getDistrictUnlockStatus(business, districtId) {
  const plot = DISTRICT_PLOTS[districtId];
  if (!plot) return { unlocked: false, owned: false, reasons: [] };
  const owned = isDistrictOwned(business, districtId);
  if (owned) return { unlocked: true, owned: true, reasons: [] };
  const fleetSize = (business.fleet || []).length;
  const driverCount = (business.staffMembers || []).length;
  const earnings = Math.max(0, business.allTimeEarnings || 0);
  const reasons = [];
  if (fleetSize < plot.unlockFleet) reasons.push(tf('courier_req_vehicles', { v0: fleetSize, v1: plot.unlockFleet }));
  if (driverCount < plot.unlockDrivers) reasons.push(tf('courier_req_drivers', { v0: driverCount, v1: plot.unlockDrivers }));
  if (plot.unlockEarnings > 0 && earnings < plot.unlockEarnings) reasons.push(tf('courier_req_earnings', { v0: formatMoney(earnings), v1: formatMoney(plot.unlockEarnings) }));
  return { unlocked: reasons.length === 0, owned: false, reasons };
}

export function buyDistrict(business, districtId) {
  if (isDistrictOwned(business, districtId)) return null;
  const plot = DISTRICT_PLOTS[districtId];
  if (!plot) return null;
  if (!isDistrictUnlocked(business, districtId)) return null;
  return {
    ...business,
    ownedDistricts: [...getOwnedDistricts(business), districtId],
    capitalisation: (business.capitalisation || 0) + plot.cost,
  };
}

// ─── Car delivery ───
export function isCarDelivered(car) {
  if (!car.deliveredAt) return true;
  return Date.now() >= car.deliveredAt;
}

export function getCarDeliveryTimeRemaining(car) {
  if (!car.deliveredAt) return 0;
  return Math.max(0, car.deliveredAt - Date.now());
}

// ─── Vehicle purchase ───
export function canBuyCarType(business, typeId) {
  const type = getCarType(typeId);
  if (!type) return false;
  if (!type.requiresDistrict) return true;
  const owned = getOwnedDistricts(business);
  return type.requiresDistrict.some((d) => owned.includes(d));
}

export function buyCar(business, typeId) {
  const type = getCarType(typeId);
  if (!type) return null;
  const car = {
    instanceId: `${typeId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    typeId,
    name: type.name,
    cost: type.cost,
    baseHourlyIncome: type.baseHourlyIncome,
    maxMiles: type.maxMiles,
    milesRemaining: type.maxMiles,
    color: type.color,
    emoji: type.emoji,
    needsMaintenance: false,
    assignedDriverId: null,
    assignedZones: [],
    activeJobType: type.jobTypes[0],
    insured: false,
    deliveredAt: Date.now() + scaleDuration(Math.random() < 0.3 ? 0 : CAR_DELIVERY_HOURS * 60 * 60 * 1000),
  };
  return {
    ...business,
    fleet: [...(business.fleet || []), car],
    capitalisation: (business.capitalisation || 0) + type.cost,
  };
}

// ─── Maintenance ───
export function getMaintenanceCost(car) {
  const milesPct = car.maxMiles > 0 ? car.milesRemaining / car.maxMiles : 0;
  const scrapRisk = Math.max(0, 0.3 * (1 - milesPct));
  return Math.floor((car.cost || 0) * (0.08 + scrapRisk * 0.12));
}

export function maintainCar(business, instanceId) {
  const car = (business.fleet || []).find((c) => c.instanceId === instanceId);
  if (!car) return { business, refund: 0, scrapped: false };
  const milesPct = car.maxMiles > 0 ? car.milesRemaining / car.maxMiles : 0;
  const scrapChance = Math.max(0, 0.3 * (1 - milesPct));

  if (Math.random() < scrapChance) {
    const refund = Math.floor((car.cost || 0) * (car.insured ? INSURANCE_SCRAP_REFUND_RATE : 0.1));
    return {
      business: {
        ...business,
        fleet: business.fleet.filter((c) => c.instanceId !== instanceId),
        capitalisation: Math.max(0, (business.capitalisation || 0) - (car.cost || 0)),
      },
      refund,
      scrapped: true,
    };
  }

  return {
    business: {
      ...business,
      fleet: business.fleet.map((c) =>
        c.instanceId === instanceId
          ? { ...c, milesRemaining: c.maxMiles, needsMaintenance: false }
          : c
      ),
    },
    refund: 0,
    scrapped: false,
  };
}

// ─── Drivers ───
export const getDrivers = (business) => business.staffMembers || [];
export const getHiringCount = (business) => (business.hiringStaff || []).length;
export const canHireMore = (business) => getHiringCount(business) < MAX_HIRING_AT_ONCE;

export function hireDrivers(business, count) {
  const current = business.hiringStaff || [];
  const availableSlots = MAX_HIRING_AT_ONCE - current.length;
  const toHire = Math.min(count, availableSlots);
  if (toHire <= 0) return null;
  const isFirstHireEver = (business.staffMembers || []).length === 0 && current.length === 0;
  const now = Date.now();
  const cost = toHire * STAFF_HIRE_COST;
  const newHires = Array.from({ length: toHire }, (_, i) => {
    const duration = STAFF_HIRE_MIN_MS + Math.random() * (STAFF_HIRE_MAX_MS - STAFF_HIRE_MIN_MS);
    return {
      id: `courier_driver_${now}_${Math.random().toString(36).slice(2, 7)}_${i}`,
      ...generateDriver(),
      completesAt: (isFirstHireEver && i === 0) || Math.random() < 0.3 ? now : now + scaleDuration(duration),
    };
  });
  return {
    ...business,
    hiringStaff: [...current, ...newHires],
    capitalisation: (business.capitalisation || 0) + cost,
  };
}

export function completeHiredDrivers(business) {
  const now = Date.now();
  const hiring = business.hiringStaff || [];
  const completed = hiring.filter((h) => h.completesAt <= now);
  if (completed.length === 0) return business;
  const remaining = hiring.filter((h) => h.completesAt > now);
  return {
    ...business,
    staff: (business.staff || 0) + completed.length,
    staffMembers: [...(business.staffMembers || []), ...completed.map((h) => ({ id: h.id, name: h.name, gender: h.gender, age: h.age, skill: Math.floor(Math.random() * 5) + 3, salary: STAFF_SALARY_HOURLY, hiredAt: now }))],
    hiringStaff: remaining,
  };
}

export function instantHireDriver(business, hireId) {
  const hiring = business.hiringStaff || [];
  const target = hiring.find((h) => h.id === hireId);
  if (!target) return business;
  return {
    ...business,
    staff: (business.staff || 0) + 1,
    staffMembers: [...(business.staffMembers || []), { id: target.id, name: target.name, gender: target.gender, age: target.age, skill: Math.floor(Math.random() * 5) + 3, salary: STAFF_SALARY_HOURLY, hiredAt: Date.now() }],
    hiringStaff: hiring.filter((h) => h.id !== hireId),
  };
}

export function getHireTimeRemaining(hire) {
  if (!hire.completesAt) return 0;
  return Math.max(0, hire.completesAt - Date.now());
}

export function assignCarDriver(business, carInstanceId, driverId) {
  const driverExists = (business.staffMembers || []).some((s) => s.id === driverId);
  if (!driverExists) return business;
  const fleet = (business.fleet || []).map((c) => {
    if (c.instanceId === carInstanceId) return { ...c, assignedDriverId: driverId };
    if (c.assignedDriverId === driverId) return { ...c, assignedDriverId: null };
    return c;
  });
  return { ...business, fleet };
}

export function unassignCarDriver(business, carInstanceId) {
  const fleet = (business.fleet || []).map((c) =>
    c.instanceId === carInstanceId ? { ...c, assignedDriverId: null } : c
  );
  return { ...business, fleet };
}

export function fireDriver(business, driverId) {
  const fleet = (business.fleet || []).map((c) =>
    c.assignedDriverId === driverId ? { ...c, assignedDriverId: null } : c
  );
  return {
    ...business,
    fleet,
    staffMembers: (business.staffMembers || []).filter((s) => s.id !== driverId),
  };
}

export function raiseDriver(business, driverId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === driverId) return { ...s, salary: Math.round((s.salary || STAFF_SALARY_HOURLY) * 1.15) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function trainDriver(business, driverId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === driverId) return { ...s, skill: Math.min(10, (s.skill || 5) + 1) };
    return s;
  });
  return { ...business, staffMembers: members };
}

// ─── Insurance ───
export function getCarHealthPct(car) {
  return car.maxMiles > 0 ? car.milesRemaining / car.maxMiles : 0;
}

export function canInsureCar(car) {
  return !car.insured && getCarHealthPct(car) > INSURANCE_HEALTH_THRESHOLD;
}

export function getInsuranceDailyCost(car) {
  return Math.floor((car.cost || 0) * INSURANCE_DAILY_RATE);
}

export function buyCarInsurance(business, instanceId) {
  const car = (business.fleet || []).find((c) => c.instanceId === instanceId);
  if (!car || !canInsureCar(car)) return business;
  const fleet = business.fleet.map((c) => (c.instanceId === instanceId ? { ...c, insured: true } : c));
  return { ...business, fleet };
}

// ─── Multi-district zone assignment ───
export function getCarAssignedZones(car) {
  return car.assignedZones || [];
}

export function canAddZone(business, newZoneId, currentZoneIds) {
  if (!isDistrictOwned(business, newZoneId)) return false;
  if (currentZoneIds.includes(newZoneId)) return false;
  if (currentZoneIds.length === 0) return true;
  const newSeg = getDistrictById(newZoneId);
  if (!newSeg) return false;
  for (const segId of currentZoneIds) {
    if (newSeg.adjacent.includes(segId)) return true;
  }
  return false;
}

export function areZonesConnected(zoneIds) {
  if (zoneIds.length <= 1) return true;
  const visited = new Set();
  const queue = [zoneIds[0]];
  visited.add(zoneIds[0]);
  while (queue.length > 0) {
    const id = queue.shift();
    const d = getDistrictById(id);
    if (!d) continue;
    for (const adj of d.adjacent) {
      if (zoneIds.includes(adj) && !visited.has(adj)) {
        visited.add(adj);
        queue.push(adj);
      }
    }
  }
  return visited.size === zoneIds.length;
}

export function canRemoveZone(zoneId, currentZoneIds) {
  const remaining = currentZoneIds.filter((id) => id !== zoneId);
  return areZonesConnected(remaining);
}

export function toggleCarZone(business, instanceId, zoneId) {
  const car = (business.fleet || []).find((c) => c.instanceId === instanceId);
  if (!car) return business;
  const carType = getCarType(car.typeId);
  if (!carType) return business;
  const current = getCarAssignedZones(car);
  if (current.includes(zoneId)) {
    if (!canRemoveZone(zoneId, current)) return business;
    return {
      ...business,
      fleet: business.fleet.map((c) =>
        c.instanceId === instanceId ? { ...c, assignedZones: current.filter((z) => z !== zoneId) } : c
      ),
    };
  }
  if (current.length >= carType.maxZones) return business;
  if (!canAddZone(business, zoneId, current)) return business;
  return {
    ...business,
    fleet: business.fleet.map((c) =>
      c.instanceId === instanceId ? { ...c, assignedZones: [...current, zoneId] } : c
    ),
  };
}

export function setCarJobType(business, instanceId, jobType) {
  const car = (business.fleet || []).find((c) => c.instanceId === instanceId);
  if (!car) return business;
  const carType = getCarType(car.typeId);
  if (!carType || !carType.jobTypes.includes(jobType)) return business;
  return {
    ...business,
    fleet: business.fleet.map((c) =>
      c.instanceId === instanceId ? { ...c, activeJobType: jobType } : c
    ),
  };
}

// ─── Income calculation ───
export function getCarActualIncomeHourly(car, business) {
  if (!isCarDelivered(car)) return 0;
  if (car.milesRemaining <= 0 || car.needsMaintenance) return 0;
  if (!car.assignedDriverId) return 0;
  const carType = getCarType(car.typeId);
  if (!carType) return 0;
  const jobType = car.activeJobType || carType.jobTypes[0];
  const job = getJobType(jobType);
  if (!job) return 0;
  const zones = getCarAssignedZones(car);
  if (zones.length === 0) return 0;
  const levelMult = getCarLevelMultiplier(business);
  let carIncome = 0;
  for (const zoneId of zones) {
    const zoneMult = ZONE_JOB_MULTIPLIERS[zoneId]?.[jobType] || 1.0;
    carIncome += carType.baseHourlyIncome * job.incomeMultiplier * zoneMult;
  }
  return Math.floor(carIncome * levelMult);
}

export function getCarRevenueHourly(business) {
  const fleet = business.fleet || [];
  if (fleet.length === 0) return 0;
  const levelMult = getCarLevelMultiplier(business);
  let total = 0;

  for (const car of fleet) {
    if (!isCarDelivered(car)) continue;
    if (car.milesRemaining <= 0 || car.needsMaintenance) continue;
    if (!car.assignedDriverId) continue;
    const carType = getCarType(car.typeId);
    if (!carType) continue;
    const jobType = car.activeJobType || carType.jobTypes[0];
    const job = getJobType(jobType);
    if (!job) continue;
    const zones = getCarAssignedZones(car);
    if (zones.length === 0) continue;

    let carIncome = 0;
    for (const zoneId of zones) {
      const zoneMult = ZONE_JOB_MULTIPLIERS[zoneId]?.[jobType] || 1.0;
      carIncome += carType.baseHourlyIncome * job.incomeMultiplier * zoneMult;
    }
    total += carIncome;
  }

  return Math.floor(total * levelMult);
}

export function getCarPayrollHourly(business) {
  return (business.staffMembers || []).reduce((total, m) => total + (m.salary || STAFF_SALARY_HOURLY), 0);
}

export function getCarInsuranceCostHourly(business) {
  const fleet = business.fleet || [];
  let total = 0;
  for (const car of fleet) {
    if (car.insured) total += ((car.cost || 0) * INSURANCE_DAILY_RATE) / 24;
  }
  return total;
}

export function getCarHourlyIncome(business) {
  const revenue = getCarRevenueHourly(business);
  const payroll = getCarPayrollHourly(business);
  const insurance = getCarInsuranceCostHourly(business);
  return Math.floor(revenue - payroll - insurance);
}

// ─── Process fleet (degradation + income) ───
export function processCourierFleet(business, minutesElapsed) {
  business = migrateCourierBusiness(business);
  business = completeHiredDrivers(business);

  // allTimeEarnings tracks cumulative revenue only — operating costs never
  // reduce it. Heal older saves where payroll could push it negative.
  if ((business.allTimeEarnings || 0) < 0) {
    business = { ...business, allTimeEarnings: 0 };
  }

  const fleet = business.fleet || [];
  const hoursFraction = minutesElapsed / 60;
  const levelMult = getCarLevelMultiplier(business);

  if (fleet.length === 0) {
    const payroll = getCarPayrollHourly(business) * hoursFraction;
    return { updatedBusiness: business, income: -payroll };
  }

  let income = 0;
  let grossEarned = 0;
  const updatedFleet = fleet.map((car) => {
    if (!isCarDelivered(car)) return car;
    if (car.milesRemaining <= 0 || car.needsMaintenance) return car;
    if (!car.assignedDriverId) return car;

    const carType = getCarType(car.typeId);
    if (!carType) return car;

    const jobType = car.activeJobType || carType.jobTypes[0];
    const job = getJobType(jobType);
    if (!job) return car;

    const zones = getCarAssignedZones(car);
    if (zones.length === 0) return car;

    let carIncomePerHour = 0;
    for (const zoneId of zones) {
      const zoneMult = ZONE_JOB_MULTIPLIERS[zoneId]?.[jobType] || 1.0;
      carIncomePerHour += carType.baseHourlyIncome * job.incomeMultiplier * zoneMult;
    }

    const milesPerHour = job.milesPerJob * job.jobsPerHour;
    const milesPerMinute = milesPerHour / 60;
    if (!(milesPerMinute > 0) || !Number.isFinite(carIncomePerHour)) return car;
    const milesToUse = milesPerMinute * minutesElapsed;

    let earned = 0;
    let miles = car.milesRemaining;

    if (miles >= milesToUse) {
      earned = carIncomePerHour * hoursFraction;
      miles = miles - milesToUse;
    } else {
      const availableMinutes = miles / milesPerMinute;
      earned = carIncomePerHour * (availableMinutes / 60);
      miles = 0;
    }

    income += earned * levelMult;
    grossEarned += earned * levelMult;
    return {
      ...car,
      milesRemaining: miles,
      needsMaintenance: miles <= 0 ? true : car.needsMaintenance,
    };
  });

  const payroll = getCarPayrollHourly(business) * hoursFraction;
  const insurance = getCarInsuranceCostHourly(business) * hoursFraction;
  income -= (payroll + insurance);

  const updatedBusiness = {
    ...business,
    fleet: updatedFleet,
    allTimeEarnings: (business.allTimeEarnings || 0) + grossEarned,
  };

  return { updatedBusiness, income };
}

// ─── Format helpers ───
export function formatDeliveryTime(ms) {
  if (ms <= 0) return 'Delivered';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export { CITY_MAP, getDistrictById };
