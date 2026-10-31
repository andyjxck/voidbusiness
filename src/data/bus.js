import { formatMoney } from './market';
import { t } from './i18n';
import { isSuspended } from './businesses';
import { scaleDuration } from './store';

export const BUS_TYPES = [
  {
    id: 'minibus',
    get name() { return t('dn_minibus'); },
    color: '#60a5fa',
    cost: 30000,
    baseHourlyIncome: 600,
    maxMiles: 1500,
    passengerHappiness: 0.02,
    popularity: 0.01,
    maxDistricts: 2,
    emoji: '🚐',
    get description() { return t('dd_small_and_nimble_perfect_for_tight_city_'); },
  },
  {
    id: 'citybus',
    get name() { return t('dn_city_bus'); },
    color: '#34d399',
    cost: 80000,
    baseHourlyIncome: 800,
    maxMiles: 3000,
    passengerHappiness: 0.03,
    popularity: 0.02,
    maxDistricts: 2,
    emoji: '🚌',
    get description() { return t('dd_the_backbone_of_any_public_transport_fle'); },
  },
  {
    id: 'doubledecker',
    get name() { return t('dn_double_decker'); },
    color: '#fbbf24',
    cost: 200000,
    baseHourlyIncome: 1200,
    maxMiles: 6000,
    passengerHappiness: 0.06,
    popularity: 0.04,
    maxDistricts: 3,
    emoji: '🚍',
    get description() { return t('dd_big_capacity_and_a_real_tourist_draw'); },
  },
  {
    id: 'coach',
    get name() { return t('dn_luxury_coach'); },
    color: '#a78bfa',
    cost: 500000,
    baseHourlyIncome: 1800,
    maxMiles: 12000,
    passengerHappiness: 0.09,
    popularity: 0.06,
    maxDistricts: 5,
    emoji: '🚎',
    get description() { return t('dd_long_distance_comfort_for_premium_fares'); },
  },
  {
    id: 'electricbus',
    get name() { return t('dn_electric_bus'); },
    color: '#22d3ee',
    cost: 1200000,
    baseHourlyIncome: 2400,
    maxMiles: 20000,
    passengerHappiness: 0.12,
    popularity: 0.08,
    maxDistricts: 7,
    emoji: '🔋',
    get description() { return t('dd_whisper_quiet_and_good_for_the_brand'); },
  },
];

export const STAFF_HIRE_COST = 8000;
export const STAFF_SALARY_HOURLY = 60;
export const STAFF_HIRE_MIN_MS = 3000;
export const STAFF_HIRE_MAX_MS = 45 * 60 * 1000;
export const MAX_HIRING_AT_ONCE = 3;

export const INSURANCE_DAILY_RATE = 0.05;
export const INSURANCE_HEALTH_THRESHOLD = 0.55;
export const INSURANCE_SCRAP_REFUND_RATE = 0.75;

export const ROUTES = [
  { id: 'suburbs', get name() { return t('dn_suburban_loop'); }, incomeMultiplier: 1.0, speedMph: 18, color: '#94a3b8', get description() { return t('dd_reliable_local_loop_through_quiet_neighb'); } },
  { id: 'industrial', get name() { return t('dn_industrial_estate'); }, incomeMultiplier: 1.25, speedMph: 22, color: '#fbbf24', get description() { return t('dd_workers_commute_early_and_pay_steady_far'); } },
  { id: 'university', get name() { return t('dn_university_run'); }, incomeMultiplier: 1.4, speedMph: 20, color: '#a78bfa', get description() { return t('dd_busy_student_traffic_with_packed_buses_a'); } },
  { id: 'airport', get name() { return t('dn_airport_shuttle'); }, incomeMultiplier: 1.8, speedMph: 30, color: '#38bdf8', get description() { return t('dd_premium_express_route_for_travellers_wit'); } },
  { id: 'towncentre', get name() { return t('dn_town_centre'); }, incomeMultiplier: 2.3, speedMph: 12, color: '#34d399', get description() { return t('dd_the_money_maker_slow_traffic_high_passen'); } },
];

export const ROUTE_STOPS = {
  suburbs: [
    { x: 20, y: 30 }, { x: 45, y: 25 }, { x: 70, y: 35 }, { x: 80, y: 55 }, { x: 55, y: 70 }, { x: 30, y: 60 },
  ],
  industrial: [
    { x: 15, y: 80 }, { x: 35, y: 75 }, { x: 55, y: 78 }, { x: 75, y: 82 }, { x: 90, y: 70 },
  ],
  university: [
    { x: 25, y: 15 }, { x: 40, y: 30 }, { x: 50, y: 45 }, { x: 60, y: 25 }, { x: 75, y: 10 },
  ],
  airport: [
    { x: 85, y: 15 }, { x: 75, y: 30 }, { x: 60, y: 40 }, { x: 45, y: 50 }, { x: 30, y: 45 },
  ],
  towncentre: [
    { x: 50, y: 50 }, { x: 40, y: 40 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 40, y: 60 },
  ],
};

export const ROAD_PATHS = {
  suburbs: [
    { x: 15, y: 32 }, { x: 22, y: 29 }, { x: 32, y: 26 }, { x: 42, y: 25 }, { x: 52, y: 24 }, { x: 62, y: 28 }, { x: 72, y: 34 }, { x: 78, y: 42 }, { x: 80, y: 52 }, { x: 75, y: 60 }, { x: 65, y: 66 }, { x: 55, y: 70 }, { x: 45, y: 68 }, { x: 35, y: 64 }, { x: 28, y: 62 }, { x: 22, y: 56 }, { x: 18, y: 48 }, { x: 16, y: 40 }, { x: 15, y: 32 },
  ],
  industrial: [
    { x: 10, y: 84 }, { x: 18, y: 79 }, { x: 28, y: 76 }, { x: 38, y: 75 }, { x: 48, y: 77 }, { x: 58, y: 78 }, { x: 68, y: 80 }, { x: 78, y: 82 }, { x: 88, y: 78 }, { x: 94, y: 72 }, { x: 92, y: 66 }, { x: 85, y: 62 }, { x: 75, y: 60 }, { x: 65, y: 58 }, { x: 55, y: 56 }, { x: 45, y: 58 }, { x: 35, y: 60 }, { x: 25, y: 64 }, { x: 15, y: 70 }, { x: 10, y: 76 }, { x: 10, y: 84 },
  ],
  university: [
    { x: 20, y: 18 }, { x: 26, y: 15 }, { x: 34, y: 18 }, { x: 40, y: 24 }, { x: 45, y: 32 }, { x: 48, y: 40 }, { x: 50, y: 48 }, { x: 54, y: 42 }, { x: 58, y: 34 }, { x: 64, y: 26 }, { x: 72, y: 18 }, { x: 80, y: 10 }, { x: 70, y: 8 }, { x: 60, y: 12 }, { x: 50, y: 18 }, { x: 40, y: 14 }, { x: 28, y: 14 }, { x: 20, y: 18 },
  ],
  airport: [
    { x: 90, y: 12 }, { x: 85, y: 16 }, { x: 80, y: 22 }, { x: 76, y: 30 }, { x: 70, y: 36 }, { x: 62, y: 40 }, { x: 54, y: 44 }, { x: 46, y: 48 }, { x: 38, y: 50 }, { x: 30, y: 48 }, { x: 24, y: 44 }, { x: 22, y: 38 }, { x: 28, y: 32 }, { x: 38, y: 30 }, { x: 50, y: 32 }, { x: 62, y: 28 }, { x: 74, y: 20 }, { x: 84, y: 14 }, { x: 90, y: 12 },
  ],
  towncentre: [
    { x: 50, y: 52 }, { x: 44, y: 48 }, { x: 38, y: 42 }, { x: 40, y: 36 }, { x: 46, y: 34 }, { x: 54, y: 34 }, { x: 62, y: 36 }, { x: 64, y: 42 }, { x: 64, y: 50 }, { x: 64, y: 58 }, { x: 60, y: 64 }, { x: 54, y: 66 }, { x: 46, y: 66 }, { x: 40, y: 62 }, { x: 38, y: 56 }, { x: 42, y: 50 }, { x: 50, y: 52 },
  ],
};

export function getRoadPath(routeId) {
  return ROAD_PATHS[routeId] || [];
}

// ─── Interactive City Map (district-based) ───
export const CITY_MAP = {
  image: require('../../assets/maps/busmap.jpg'),
  width: 1200,
  height: 900,
  districts: [
    {
      id: 'suburbs',
      get name() { return t('dn_suburbs'); },
      get description() { return t('dd_quiet_residential_streets_medium_ridersh'); },
      incomePerHr: 600,
      speedMph: 25,
      milesPerDay: 120,
      popularity: 'Medium',
      minBusType: 'citybus',
      polygon: '408,628 404,663 412,713 420,756 414,785 395,819 376,853 347,851 281,848 236,840 204,826 161,800 127,772 85,725 57,681 43,647 37,611 32,574 34,549 39,457 61,457 92,337 122,285 188,224 239,198 271,274 298,291 254,353 226,403 223,477 253,554 319,612',
      adjacent: ['oldtown', 'harbour'],
    },
    {
      id: 'oldtown',
      get name() { return t('dn_old_town'); },
      get description() { return t('dd_historic_winding_streets_medium_traffic'); },
      incomePerHr: 400,
      speedMph: 18,
      milesPerDay: 100,
      popularity: 'Medium',
      minBusType: 'minibus',
      polygon: '411,617 462,537 524,498 514,427 466,340 425,305 354,301 320,299 271,351 240,406 233,453 249,519 290,577 348,610',
      adjacent: ['suburbs', 'downtown', 'harbour', 'industrial'],
    },
    {
      id: 'downtown',
      get name() { return t('dn_downtown'); },
      get description() { return t('dd_busy_commercial_core_very_high_ridership'); },
      incomePerHr: 1600,
      speedMph: 15,
      milesPerDay: 200,
      popularity: 'Very High',
      minBusType: 'doubledecker',
      polygon: '571,437 546,364 652,308 761,301 830,318 911,382 926,453 908,546 835,608 722,520 623,487 578,482',
      adjacent: ['oldtown', 'harbour', 'university', 'industrial', 'park'],
    },
    {
      id: 'university',
      get name() { return t('dn_university'); },
      get description() { return t('dd_student_heavy_area_high_demand'); },
      incomePerHr: 1000,
      speedMph: 20,
      milesPerDay: 180,
      popularity: 'High',
      minBusType: 'doubledecker',
      polygon: '752,282 754,75 872,66 1123,87 1028,228 922,366 853,309 803,292',
      adjacent: ['downtown', 'industrial', 'park'],
    },
    {
      id: 'industrial',
      get name() { return t('dn_industrial'); },
      get description() { return t('dd_factory_workers_and_shift_traffic_high_d'); },
      incomePerHr: 800,
      speedMph: 28,
      milesPerDay: 150,
      popularity: 'High',
      minBusType: 'citybus',
      polygon: '403,194 393,224 370,253 450,265 499,308 531,344 615,305 665,289 736,280 734,64 422,65 409,74 405,102',
      adjacent: ['oldtown', 'downtown', 'university'],
    },
    {
      id: 'harbour',
      get name() { return t('dn_harbour'); },
      get description() { return t('dd_waterfront_docks_and_shipping_low_traffi'); },
      incomePerHr: 300,
      speedMph: 22,
      milesPerDay: 90,
      popularity: 'Low',
      minBusType: 'minibus',
      polygon: '442,784 438,741 420,678 433,604 479,549 532,515 532,499 582,491 585,505 660,510 760,567 843,656 928,763 942,796 909,814 867,749 765,625 678,568 592,526 579,507 536,523 544,544 495,579 462,622 460,687 490,754 556,725 574,769 500,796 473,832 458,819 451,809',
      adjacent: ['oldtown', 'downtown', 'park', 'suburbs'],
    },
    {
      id: 'park',
      get name() { return t('dn_park'); },
      get description() { return t('dd_green_space_and_recreation_low_but_stead'); },
      incomePerHr: 350,
      speedMph: 30,
      milesPerDay: 70,
      popularity: 'Low',
      minBusType: 'minibus',
      polygon: '968,808 833,626 920,566 950,476 921,384 1144,90 1195,95 1197,750 1038,743 982,797',
      adjacent: ['university', 'harbour', 'downtown'],
    },
  ],
};

export function getDistrictById(districtId) {
  return CITY_MAP.districts.find((d) => d.id === districtId) || null;
}

const BUS_TYPE_TIER = { minibus: 0, citybus: 1, doubledecker: 2, coach: 3, electricbus: 4 };

export function busMeetsRequirement(busTypeId, minBusType) {
  return (BUS_TYPE_TIER[busTypeId] ?? 0) >= (BUS_TYPE_TIER[minBusType] ?? 0);
}

export function getBusAssignedDistricts(bus) {
  return bus.assignedDistricts || [];
}

export function getBusTierMultiplier(bus) {
  const busType = getBusType(bus.typeId);
  const baseIncome = busType ? busType.baseHourlyIncome : (bus.baseHourlyIncome || BUS_TYPES[0].baseHourlyIncome);
  const reference = BUS_TYPES[0].baseHourlyIncome;
  return baseIncome / reference;
}

export function getBusRouteIncome(bus) {
  const districts = getBusAssignedDistricts(bus);
  if (districts.length === 0) return 0;
  const base = districts.reduce((sum, id) => {
    const d = getDistrictById(id);
    return sum + (d ? d.incomePerHr : 0);
  }, 0);
  return base * getBusTierMultiplier(bus) * (1 + bus.passengerHappiness) * (1 + bus.popularity);
}

export function getRouteSegmentIncome(segmentIds) {
  if (!segmentIds || segmentIds.length === 0) return 0;
  return segmentIds.reduce((sum, id) => {
    const d = getDistrictById(id);
    return sum + (d ? d.incomePerHr : 0);
  }, 0);
}

export function getCustomRouteIncome(business) {
  if (!business.fleet || business.fleet.length === 0) return 0;
  let total = 0;
  for (const bus of business.fleet) {
    if (bus.milesRemaining <= 0 || bus.needsMaintenance) continue;
    if (!bus.assignedDriverId) continue;
    total += getBusRouteIncome(bus);
  }
  return Math.floor(total);
}

export function canAddSegment(newSegId, currentSegmentIds) {
  if (currentSegmentIds.length === 0) return true;
  const newSeg = getDistrictById(newSegId);
  if (!newSeg) return false;
  for (const segId of currentSegmentIds) {
    if (newSeg.adjacent.includes(segId)) return true;
  }
  return false;
}

export function areSegmentsConnected(segmentIds) {
  if (segmentIds.length <= 1) return true;
  const visited = new Set();
  const queue = [segmentIds[0]];
  visited.add(segmentIds[0]);
  while (queue.length > 0) {
    const id = queue.shift();
    const d = getDistrictById(id);
    if (!d) continue;
    for (const adj of d.adjacent) {
      if (segmentIds.includes(adj) && !visited.has(adj)) {
        visited.add(adj);
        queue.push(adj);
      }
    }
  }
  return visited.size === segmentIds.length;
}

export function canRemoveSegment(segId, currentSegmentIds) {
  const remaining = currentSegmentIds.filter((id) => id !== segId);
  return areSegmentsConnected(remaining);
}

export function getBusType(typeId) {
  return BUS_TYPES.find((b) => b.id === typeId) || null;
}

export function getRoute(routeId) {
  return ROUTES.find((r) => r.id === routeId) || null;
}

export function getStops(routeId) {
  return ROUTE_STOPS[routeId] || [];
}

export function getBusLevelMultiplier(business) {
  const level = Math.max(1, business.level || 1);
  return Math.pow(1.12, level - 1);
}

export function getBusCurrentIncomeHourly(bus, business) {
  if (!isBusDelivered(bus)) return 0;
  if (bus.milesRemaining <= 0 || bus.needsMaintenance) return 0;
  if (!bus.assignedDriverId) return 0;
  const levelMult = getBusLevelMultiplier(business);
  const assigned = getBusAssignedDistricts(bus);
  let raw = 0;
  if (assigned.length > 0) {
    raw = getBusRouteIncome(bus);
  } else {
    const route = getRoute(business.selectedRoute);
    if (route) {
      raw = (getBusType(bus.typeId)?.baseHourlyIncome || bus.baseHourlyIncome) * route.incomeMultiplier * (1 + bus.passengerHappiness) * (1 + bus.popularity);
    }
  }
  return raw * levelMult;
}

export function getBusRevenueHourly(business) {
  if (!business.fleet || business.fleet.length === 0) return 0;
  let total = 0;
  for (const bus of business.fleet) {
    total += getBusCurrentIncomeHourly(bus, business);
  }
  return Math.floor(total);
}

export function getBusPayrollHourly(business) {
  return (business.staffMembers || []).reduce((total, m) => total + (m.salary || STAFF_SALARY_HOURLY), 0);
}

export function getBusInsuranceCostHourly(business) {
  const fleet = business.fleet || [];
  let total = 0;
  for (const bus of fleet) {
    if (bus.insured) total += (bus.cost * INSURANCE_DAILY_RATE) / 24;
  }
  return total;
}

export function getBusHourlyIncome(business) {
  const revenue = getBusRevenueHourly(business);
  const payroll = getBusPayrollHourly(business);
  const insurance = getBusInsuranceCostHourly(business);
  return Math.floor(revenue - payroll - insurance);
}

export function processBusFleet(business, minutesElapsed) {
  business = completeHiredDrivers(business);
  // allTimeEarnings tracks cumulative revenue only — payroll/insurance never
  // reduce it. Heal older saves where costs could push it negative.
  if ((business.allTimeEarnings || 0) < 0) business = { ...business, allTimeEarnings: 0 };
  const hoursFraction = minutesElapsed / 60;
  if (!business.fleet || business.fleet.length === 0) {
    const payroll = getBusPayrollHourly(business) * hoursFraction;
    return { updatedBusiness: business, income: -payroll };
  }
  const route = getRoute(business.selectedRoute);
  const levelMult = getBusLevelMultiplier(business);
  let income = 0;
  let grossEarned = 0;
  const updatedFleet = business.fleet.map((bus) => {
    if (!isBusDelivered(bus)) return bus;
    if (bus.milesRemaining <= 0 || bus.needsMaintenance) return bus;
    if (!bus.assignedDriverId) return bus;
    const assigned = getBusAssignedDistricts(bus);
    let busIncome;
    let milesPerDay;
    if (assigned.length > 0) {
      busIncome = getBusRouteIncome(bus);
      const dists = assigned.map((id) => getDistrictById(id)).filter(Boolean);
      milesPerDay = dists.length > 0 ? dists.reduce((s, d) => s + (d.milesPerDay || 0), 0) : 0;
    } else if (route) {
      busIncome = bus.baseHourlyIncome * route.incomeMultiplier * (1 + bus.passengerHappiness) * (1 + bus.popularity);
      milesPerDay = route.speedMph * 6;
    } else {
      return bus;
    }
    const milesPerMinute = milesPerDay / (24 * 60);
    if (!(milesPerMinute > 0) || !Number.isFinite(busIncome)) return bus;
    const milesToUse = milesPerMinute * minutesElapsed;
    let earned = 0;
    let miles = bus.milesRemaining;
    if (miles >= milesToUse) {
      earned = busIncome * hoursFraction;
      miles = miles - milesToUse;
    } else {
      const availableMinutes = miles / milesPerMinute;
      earned = busIncome * (availableMinutes / 60);
      miles = 0;
    }
    income += earned * levelMult;
    grossEarned += earned * levelMult;
    return { ...bus, milesRemaining: miles, needsMaintenance: miles <= 0 ? true : bus.needsMaintenance };
  });
  const payroll = getBusPayrollHourly(business) * hoursFraction;
  const insurance = getBusInsuranceCostHourly(business) * hoursFraction;
  income -= (payroll + insurance);
  const updatedBusiness = {
    ...business,
    fleet: updatedFleet,
    allTimeEarnings: (business.allTimeEarnings || 0) + grossEarned,
  };
  return { updatedBusiness, income };
}

export const BUS_DELIVERY_HOURS = 0.25;

export function isBusDelivered(bus) {
  if (!bus.deliveredAt) return true;
  return Date.now() >= bus.deliveredAt;
}

export function getBusDeliveryTimeRemaining(bus) {
  if (!bus.deliveredAt) return 0;
  return Math.max(0, bus.deliveredAt - Date.now());
}

export function getMaxBusSlots(business) {
  const level = Math.max(1, business.level || 1);
  return Math.floor(3 + (30 - 3) * (level - 1) / 29);
}

export function buyBus(business, typeId) {
  const type = getBusType(typeId);
  if (!type) return null;
  const bus = {
    instanceId: `${typeId}_${Date.now()}`,
    typeId,
    name: type.name,
    cost: type.cost,
    baseHourlyIncome: type.baseHourlyIncome,
    maxMiles: type.maxMiles,
    milesRemaining: type.maxMiles,
    passengerHappiness: type.passengerHappiness,
    popularity: type.popularity,
    emoji: type.emoji,
    color: type.color,
    needsMaintenance: false,
    assignedDriverId: null,
    insured: false,
    deliveredAt: Date.now() + scaleDuration(Math.random() < 0.3 ? 0 : BUS_DELIVERY_HOURS * 60 * 60 * 1000),
  };
  return {
    ...business,
    fleet: [...(business.fleet || []), bus],
    capitalisation: (business.capitalisation || 0) + type.cost,
  };
}

export function maintainBus(business, instanceId) {
  const bus = business.fleet.find((b) => b.instanceId === instanceId);
  if (!bus) return { business, refund: 0, scrapped: false };
  const milesPct = bus.maxMiles > 0 ? bus.milesRemaining / bus.maxMiles : 0;
  const scrapChance = Math.max(0, 0.3 * (1 - milesPct));
  const scrap = Math.random() < scrapChance;
  if (scrap) {
    const refund = Math.floor(bus.cost * (bus.insured ? INSURANCE_SCRAP_REFUND_RATE : 0.2));
    const updatedFleet = business.fleet.filter((b) => b.instanceId !== instanceId);
    return {
      business: {
        ...business,
        fleet: updatedFleet,
        capitalisation: Math.max(0, (business.capitalisation || 0) - bus.cost),
      },
      refund,
      scrapped: true,
    };
  }
  const updatedFleet = business.fleet.map((b) =>
    b.instanceId === instanceId ? { ...b, milesRemaining: b.maxMiles, needsMaintenance: false } : b
  );
  return { business: { ...business, fleet: updatedFleet }, refund: 0, scrapped: false };
}

export function selectRoute(business, routeId) {
  return { ...business, selectedRoute: routeId };
}

export function getMaintenanceCost(bus) {
  return Math.floor(bus.cost * 0.08);
}

// ─── Drivers ───
import { generatePerson } from './names';

export const getBusDrivers = (business) => business.staffMembers || [];
export const getHiringCount = (business) => (business.hiringStaff || []).length;
export const canHireMore = (business) => getHiringCount(business) < MAX_HIRING_AT_ONCE;

export function hireBusDrivers(business, count) {
  const current = business.hiringStaff || [];
  const availableSlots = MAX_HIRING_AT_ONCE - current.length;
  const toHire = Math.min(count, availableSlots);
  if (toHire <= 0) return null;
  const isFirstHireEver = (business.staffMembers || []).length === 0 && current.length === 0;
  const now = Date.now();
  const cost = toHire * STAFF_HIRE_COST;
  const newHires = Array.from({ length: toHire }, (_, i) => {
    const duration = STAFF_HIRE_MIN_MS + Math.random() * (STAFF_HIRE_MAX_MS - STAFF_HIRE_MIN_MS);
    const person = generatePerson();
    return {
      id: `bus_driver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${i}`,
      name: person.name,
      gender: person.gender,
      age: person.age,
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
  return Math.max(0, hire.completesAt - Date.now());
}

export function assignBusDriver(business, busInstanceId, driverId) {
  const driverExists = (business.staffMembers || []).some((s) => s.id === driverId);
  if (!driverExists) return business;
  const fleet = (business.fleet || []).map((b) => {
    if (b.instanceId === busInstanceId) return { ...b, assignedDriverId: driverId };
    if (b.assignedDriverId === driverId) return { ...b, assignedDriverId: null };
    return b;
  });
  return { ...business, fleet };
}

export function unassignBusDriver(business, busInstanceId) {
  const fleet = (business.fleet || []).map((b) =>
    b.instanceId === busInstanceId ? { ...b, assignedDriverId: null } : b
  );
  return { ...business, fleet };
}

export function fireBusDriver(business, driverId) {
  const fleet = (business.fleet || []).map((b) =>
    b.assignedDriverId === driverId ? { ...b, assignedDriverId: null } : b
  );
  return {
    ...business,
    fleet,
    staffMembers: (business.staffMembers || []).filter((s) => s.id !== driverId),
  };
}

export function raiseBusDriver(business, driverId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === driverId) return { ...s, salary: Math.round((s.salary || STAFF_SALARY_HOURLY) * 1.15) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function trainBusDriver(business, driverId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === driverId) return { ...s, skill: Math.min(10, (s.skill || 5) + 1) };
    return s;
  });
  return { ...business, staffMembers: members };
}

// ─── Insurance ───
export function getBusHealthPct(bus) {
  return bus.maxMiles > 0 ? bus.milesRemaining / bus.maxMiles : 0;
}

export function canInsureBus(bus) {
  return !bus.insured && getBusHealthPct(bus) > INSURANCE_HEALTH_THRESHOLD;
}

export function getInsuranceDailyCost(bus) {
  return Math.floor(bus.cost * INSURANCE_DAILY_RATE);
}

export function buyBusInsurance(business, instanceId) {
  const bus = (business.fleet || []).find((b) => b.instanceId === instanceId);
  if (!bus || !canInsureBus(bus)) return business;
  const fleet = business.fleet.map((b) => (b.instanceId === instanceId ? { ...b, insured: true } : b));
  return { ...business, fleet };
}

export { formatMoney };
