import { formatMoney } from './market';
import { t } from './i18n';
import { CITY_MAP } from './bus';
import { generatePerson } from './names';
import { isSuspended } from './businesses';
import { scaleDuration } from './store';

// ─── Resources ───
export const RESOURCES = [
  { id: 'brick',  get name() { return t('dn_brick'); },  emoji: '🧱', cost: 2750 },
  { id: 'wood',   get name() { return t('dn_wood'); },   emoji: '🪵', cost: 1650 },
  { id: 'glass',  get name() { return t('dn_glass'); },  emoji: '🪟', cost: 4400 },
  { id: 'metal',  get name() { return t('dn_metal'); },  emoji: '⛓️', cost: 6600 },
  { id: 'cement', get name() { return t('dn_cement'); }, emoji: '🪨', cost: 2200 },
  { id: 'pipe',   get name() { return t('dn_pipes'); },  emoji: '🛢️', cost: 4950 },
];

export function getResource(id) {
  return RESOURCES.find((r) => r.id === id);
}

// ─── Staff ───
export const STAFF_HIRE_COST = 825000;
export const STAFF_SALARY_HOURLY = 4400;
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

export function getStaffSalaryHourly(business) {
  return (business.staffMembers || []).reduce((total, m) => total + (m.salary || STAFF_SALARY_HOURLY), 0);
}

export function getAssignedStaffIds(business) {
  const activeJobs = (business.jobs || []).filter((j) => !j.completedAt);
  const assigned = new Set();
  for (const job of activeJobs) {
    for (const id of (job.assignedStaffIds || [])) assigned.add(id);
  }
  return assigned;
}

export function getAvailableStaff(business) {
  const assignedIds = getAssignedStaffIds(business);
  return (business.staffMembers || []).filter((s) => !assignedIds.has(s.id));
}

export function getJobAssignedStaff(business, jobInstanceId) {
  const job = (business.jobs || []).find((j) => j.instanceId === jobInstanceId && !j.completedAt);
  if (!job) return [];
  const ids = job.assignedStaffIds || [];
  return (business.staffMembers || []).filter((s) => ids.includes(s.id));
}

export function getAvailableStaffCount(business) {
  return getAvailableStaff(business).length;
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

// ─── Storage ───
export const BASE_STORAGE_PER_RESOURCE = 50;
export function getStorageCapacity(business, resourceId) {
  const level = Math.max(1, business.level || 1);
  return BASE_STORAGE_PER_RESOURCE * level;
}

// ─── Material delivery ───
export const MATERIAL_DELIVERY_MIN_MS = 1 * 60 * 1000; // 1 min
export const MATERIAL_DELIVERY_MAX_MS = 3 * 60 * 1000; // 3 min

// ─── Job templates (base definitions, actual jobs are generated with random materials) ───
// Tier 1: ~1hr, 1 staff | Tier 2: ~3hr, 2 staff | Tier 3: ~8hr, 4 staff
// Tier 4: ~24hr, 8 staff | Tier 5: ~48hr, 15 staff | Tier 6: ~96hr, 25 staff
// Tier 7: ~144hr, 40 staff | Tier 8: ~240hr, 60 staff
export const JOB_TEMPLATES = [
  // ── Tier 1: Small residential (~1hr, 1 staff) ──
  { id: 'shed', get name() { return t('dn_garden_shed'); }, emoji: '🏚️', get desc() { return t('dd_a_simple_backyard_shed'); }, gradient: ['#3b2f2f', '#1c1917'], durationHours: 1, payout: 110000, staffReq: 1, staffUnlock: 0, materialBudget: 27500, minMaterials: 1, maxMaterials: 2 },
  { id: 'driveway', get name() { return t('dn_driveway'); }, emoji: '🛣️', get desc() { return t('dd_a_concrete_driveway'); }, gradient: ['#4b5563', '#1f2937'], durationHours: 1, payout: 110000, staffReq: 1, staffUnlock: 0, materialBudget: 27500, minMaterials: 1, maxMaterials: 2 },
  { id: 'fence', get name() { return t('dn_fence'); }, emoji: '🚧', get desc() { return t('dd_a_boundary_fence'); }, gradient: ['#52525b', '#27272a'], durationHours: 1, payout: 110000, staffReq: 1, staffUnlock: 0, materialBudget: 27500, minMaterials: 1, maxMaterials: 2 },
  { id: 'patio', get name() { return t('dn_patio'); }, emoji: '🧱', get desc() { return t('dd_a_garden_patio'); }, gradient: ['#78716c', '#292524'], durationHours: 1, payout: 110000, staffReq: 1, staffUnlock: 0, materialBudget: 27500, minMaterials: 1, maxMaterials: 2 },
  { id: 'garden_wall', get name() { return t('dn_garden_wall'); }, emoji: '🪨', get desc() { return t('dd_a_low_garden_wall'); }, gradient: ['#57534e', '#1c1917'], durationHours: 1, payout: 110000, staffReq: 1, staffUnlock: 0, materialBudget: 27500, minMaterials: 1, maxMaterials: 2 },

  // ── Tier 2: Small builds (~3hr, 2 staff) ──
  { id: 'garage', get name() { return t('dn_single_garage'); }, emoji: '🚗', get desc() { return t('dd_a_standalone_garage'); }, gradient: ['#374151', '#1f2937'], durationHours: 3, payout: 396000, staffReq: 2, staffUnlock: 0, materialBudget: 99000, minMaterials: 2, maxMaterials: 3 },
  { id: 'playground', get name() { return t('dn_playground'); }, emoji: '🛝', get desc() { return t('dd_a_children_s_playground'); }, gradient: ['#15803d', '#14532d'], durationHours: 3, payout: 396000, staffReq: 2, staffUnlock: 0, materialBudget: 99000, minMaterials: 2, maxMaterials: 3 },
  { id: 'pier', get name() { return t('dn_wooden_pier'); }, emoji: '🛟', get desc() { return t('dd_a_small_wooden_pier'); }, gradient: ['#92400e', '#451a03'], durationHours: 3, payout: 396000, staffReq: 2, staffUnlock: 0, materialBudget: 99000, minMaterials: 2, maxMaterials: 3 },
  { id: 'workshop', get name() { return t('dn_workshop'); }, emoji: '🔨', get desc() { return t('dd_a_small_industrial_workshop'); }, gradient: ['#7c2d12', '#431407'], durationHours: 3, payout: 396000, staffReq: 2, staffUnlock: 0, materialBudget: 99000, minMaterials: 2, maxMaterials: 3 },
  { id: 'bandstand', get name() { return t('dn_bandstand'); }, emoji: '🎵', get desc() { return t('dd_an_outdoor_bandstand'); }, gradient: ['#166534', '#14532d'], durationHours: 3, payout: 396000, staffReq: 2, staffUnlock: 0, materialBudget: 99000, minMaterials: 2, maxMaterials: 3 },

  // ── Tier 3: Medium builds (~8hr, 4 staff) ──
  { id: 'house', get name() { return t('dn_family_home'); }, emoji: '🏠', get desc() { return t('dd_a_residential_house'); }, gradient: ['#1e3a5f', '#0c4a6e'], durationHours: 8, payout: 1320000, staffReq: 4, staffUnlock: 0, materialBudget: 330000, minMaterials: 3, maxMaterials: 5 },
  { id: 'boat_house', get name() { return t('dn_boat_house'); }, emoji: '🛖', get desc() { return t('dd_a_waterfront_boat_house'); }, gradient: ['#0e7490', '#164e63'], durationHours: 8, payout: 1320000, staffReq: 4, staffUnlock: 0, materialBudget: 330000, minMaterials: 3, maxMaterials: 5 },
  { id: 'townhouse', get name() { return t('dn_townhouse'); }, emoji: '🏘️', get desc() { return t('dd_a_narrow_townhouse'); }, gradient: ['#7c2d12', '#431407'], durationHours: 8, payout: 1320000, staffReq: 4, staffUnlock: 0, materialBudget: 330000, minMaterials: 3, maxMaterials: 5 },
  { id: 'factory_unit', get name() { return t('dn_factory_unit'); }, emoji: '🏭', get desc() { return t('dd_a_small_factory_unit'); }, gradient: ['#52525b', '#27272a'], durationHours: 8, payout: 1320000, staffReq: 4, staffUnlock: 0, materialBudget: 330000, minMaterials: 3, maxMaterials: 5 },
  { id: 'pavilion', get name() { return t('dn_pavilion'); }, emoji: '⛲', get desc() { return t('dd_a_park_pavilion'); }, gradient: ['#15803d', '#14532d'], durationHours: 8, payout: 1320000, staffReq: 4, staffUnlock: 0, materialBudget: 330000, minMaterials: 3, maxMaterials: 5 },

  // ── Tier 4: Large builds (~24hr, 8 staff, unlock 5) ──
  { id: 'apartment', get name() { return t('dn_apartment_block'); }, emoji: '🏢', get desc() { return t('dd_a_small_apartment_building'); }, gradient: ['#1e293b', '#0f172a'], durationHours: 24, payout: 5280000, staffReq: 8, staffUnlock: 5, materialBudget: 1320000, minMaterials: 4, maxMaterials: 6 },
  { id: 'warehouse', get name() { return t('dn_warehouse'); }, emoji: '📦', get desc() { return t('dd_a_large_storage_warehouse'); }, gradient: ['#52525b', '#27272a'], durationHours: 24, payout: 5280000, staffReq: 8, staffUnlock: 5, materialBudget: 1320000, minMaterials: 4, maxMaterials: 6 },
  { id: 'heritage_restoration', get name() { return t('dn_heritage_restoration'); }, emoji: '🏛️', get desc() { return t('dd_restoring_a_historic_building'); }, gradient: ['#78716c', '#292524'], durationHours: 24, payout: 5280000, staffReq: 8, staffUnlock: 5, materialBudget: 1320000, minMaterials: 4, maxMaterials: 6 },
  { id: 'dormitory', get name() { return t('dn_dormitory'); }, emoji: '🏫', get desc() { return t('dd_a_student_dormitory'); }, gradient: ['#1e3a5f', '#0c4a6e'], durationHours: 24, payout: 5280000, staffReq: 8, staffUnlock: 5, materialBudget: 1320000, minMaterials: 4, maxMaterials: 6 },
  { id: 'retail_complex', get name() { return t('dn_retail_complex'); }, emoji: '🛍️', get desc() { return t('dd_a_small_shopping_complex'); }, gradient: ['#7c2d12', '#431407'], durationHours: 24, payout: 5280000, staffReq: 8, staffUnlock: 5, materialBudget: 1320000, minMaterials: 4, maxMaterials: 6 },

  // ── Tier 5: Big projects (~48hr, 15 staff, unlock 10) ──
  { id: 'office', get name() { return t('dn_office_tower'); }, emoji: '🏬', get desc() { return t('dd_a_commercial_office_building'); }, gradient: ['#312e81', '#1e1b4b'], durationHours: 48, payout: 22000000, staffReq: 15, staffUnlock: 10, materialBudget: 5500000, minMaterials: 4, maxMaterials: 6 },
  { id: 'marina', get name() { return t('dn_marina'); }, emoji: '⛵', get desc() { return t('dd_a_boat_marina_with_docks'); }, gradient: ['#0e7490', '#164e63'], durationHours: 48, payout: 22000000, staffReq: 15, staffUnlock: 10, materialBudget: 5500000, minMaterials: 4, maxMaterials: 6 },
  { id: 'library', get name() { return t('dn_library'); }, emoji: '📚', get desc() { return t('dd_a_public_library'); }, gradient: ['#78716c', '#292524'], durationHours: 48, payout: 22000000, staffReq: 15, staffUnlock: 10, materialBudget: 5500000, minMaterials: 4, maxMaterials: 6 },
  { id: 'lecture_hall', get name() { return t('dn_lecture_hall'); }, emoji: '🎓', get desc() { return t('dd_a_university_lecture_hall'); }, gradient: ['#1e3a5f', '#0c4a6e'], durationHours: 48, payout: 22000000, staffReq: 15, staffUnlock: 10, materialBudget: 5500000, minMaterials: 4, maxMaterials: 6 },
  { id: 'hotel', get name() { return t('dn_hotel'); }, emoji: '🏨', get desc() { return t('dd_a_mid_size_hotel'); }, gradient: ['#7c2d12', '#431407'], durationHours: 48, payout: 22000000, staffReq: 15, staffUnlock: 10, materialBudget: 5500000, minMaterials: 4, maxMaterials: 6 },

  // ── Tier 6: Mega projects (~96hr, 25 staff, unlock 20) ──
  { id: 'skyscraper', get name() { return t('dn_skyscraper'); }, emoji: '🏙️', get desc() { return t('dd_a_towering_skyscraper'); }, gradient: ['#0c4a6e', '#082f49'], durationHours: 96, payout: 88000000, staffReq: 25, staffUnlock: 20, materialBudget: 22000000, minMaterials: 5, maxMaterials: 6 },
  { id: 'convention_center', get name() { return t('dn_convention_center'); }, emoji: '🎪', get desc() { return t('dd_a_large_convention_center'); }, gradient: ['#312e81', '#1e1b4b'], durationHours: 96, payout: 88000000, staffReq: 25, staffUnlock: 20, materialBudget: 22000000, minMaterials: 5, maxMaterials: 6 },
  { id: 'sports_complex', get name() { return t('dn_sports_complex'); }, emoji: '🏟️', get desc() { return t('dd_a_university_sports_complex'); }, gradient: ['#15803d', '#14532d'], durationHours: 96, payout: 88000000, staffReq: 25, staffUnlock: 20, materialBudget: 22000000, minMaterials: 5, maxMaterials: 6 },
  { id: 'research_building', get name() { return t('dn_research_building'); }, emoji: '🔬', get desc() { return t('dd_a_research_facility'); }, gradient: ['#1e3a5f', '#0c4a6e'], durationHours: 96, payout: 88000000, staffReq: 25, staffUnlock: 20, materialBudget: 22000000, minMaterials: 5, maxMaterials: 6 },
  { id: 'power_station', get name() { return t('dn_power_station'); }, emoji: '⚡', get desc() { return t('dd_a_power_generation_station'); }, gradient: ['#52525b', '#27272a'], durationHours: 96, payout: 88000000, staffReq: 25, staffUnlock: 20, materialBudget: 22000000, minMaterials: 5, maxMaterials: 6 },

  // ── Tier 7: Huge infrastructure (~144hr, 40 staff, unlock 35) ──
  { id: 'bridge', get name() { return t('dn_city_bridge'); }, emoji: '🌉', get desc() { return t('dd_a_major_infrastructure_project'); }, gradient: ['#334155', '#1e293b'], durationHours: 144, payout: 264000000, staffReq: 40, staffUnlock: 35, materialBudget: 66000000, minMaterials: 4, maxMaterials: 6 },
  { id: 'container_terminal', get name() { return t('dn_container_terminal'); }, emoji: '🚢', get desc() { return t('dd_a_shipping_container_terminal'); }, gradient: ['#0e7490', '#164e63'], durationHours: 144, payout: 264000000, staffReq: 40, staffUnlock: 35, materialBudget: 66000000, minMaterials: 4, maxMaterials: 6 },
  { id: 'hospital', get name() { return t('dn_hospital'); }, emoji: '🏥', get desc() { return t('dd_a_large_hospital'); }, gradient: ['#15803d', '#14532d'], durationHours: 144, payout: 264000000, staffReq: 40, staffUnlock: 35, materialBudget: 66000000, minMaterials: 4, maxMaterials: 6 },
  { id: 'airport_terminal', get name() { return t('dn_airport_terminal'); }, emoji: '✈️', get desc() { return t('dd_an_airport_terminal_building'); }, gradient: ['#52525b', '#27272a'], durationHours: 144, payout: 264000000, staffReq: 40, staffUnlock: 35, materialBudget: 66000000, minMaterials: 4, maxMaterials: 6 },
  { id: 'stadium', get name() { return t('dn_stadium'); }, emoji: '🏟️', get desc() { return t('dd_a_large_sports_stadium'); }, gradient: ['#7c2d12', '#431407'], durationHours: 144, payout: 264000000, staffReq: 40, staffUnlock: 35, materialBudget: 66000000, minMaterials: 4, maxMaterials: 6 },

  // ── Tier 8: Legendary (~240hr, 60 staff, unlock 50) ──
  { id: 'mega_stadium', get name() { return t('dn_mega_stadium'); }, emoji: '🏟️', get desc() { return t('dd_a_world_class_mega_stadium'); }, gradient: ['#7c2d12', '#431407'], durationHours: 240, payout: 880000000, staffReq: 60, staffUnlock: 50, materialBudget: 220000000, minMaterials: 5, maxMaterials: 6 },
  { id: 'shipyard', get name() { return t('dn_shipyard'); }, emoji: '🚢', get desc() { return t('dd_a_massive_shipyard_facility'); }, gradient: ['#0e7490', '#164e63'], durationHours: 240, payout: 880000000, staffReq: 60, staffUnlock: 50, materialBudget: 220000000, minMaterials: 5, maxMaterials: 6 },
  { id: 'refinery', get name() { return t('dn_refinery'); }, emoji: '🏗️', get desc() { return t('dd_an_oil_refinery_complex'); }, gradient: ['#52525b', '#27272a'], durationHours: 240, payout: 880000000, staffReq: 60, staffUnlock: 50, materialBudget: 220000000, minMaterials: 5, maxMaterials: 6 },
  { id: 'metro_tunnel', get name() { return t('dn_metro_tunnel'); }, emoji: '🚇', get desc() { return t('dd_an_underground_metro_tunnel'); }, gradient: ['#1e293b', '#0f172a'], durationHours: 240, payout: 880000000, staffReq: 60, staffUnlock: 50, materialBudget: 220000000, minMaterials: 5, maxMaterials: 6 },
  { id: 'sky_bridge', get name() { return t('dn_sky_bridge'); }, emoji: '🌌', get desc() { return t('dd_a_pedestrian_sky_bridge'); }, gradient: ['#312e81', '#1e1b4b'], durationHours: 240, payout: 880000000, staffReq: 60, staffUnlock: 50, materialBudget: 220000000, minMaterials: 5, maxMaterials: 6 },
];

export function getJobTemplate(id) {
  return JOB_TEMPLATES.find((j) => j.id === id);
}

export const MAX_ACTIVE_JOBS = 4;
export const JOB_REFRESH_HOURS = 2;
export const AVAILABLE_JOBS_COUNT = 6;

// ─── Construction zones (same map as bus/courier) ───
// Zones unlock by business level. Better zones = higher payout multiplier.
// Each zone only gets job types that make sense for that area.
export const CONSTRUCTION_ZONES = [
  { id: 'suburbs',    get name() { return t('dn_suburbs'); },    levelUnlock: 1,  payoutMult: 1.0, get desc() { return t('dd_quiet_residential_area'); },     jobTypes: ['shed', 'driveway', 'fence', 'patio', 'garden_wall', 'garage', 'house'] },
  { id: 'harbour',    get name() { return t('dn_harbour'); },    levelUnlock: 1,  payoutMult: 1.1, get desc() { return t('dd_waterfront_development'); },     jobTypes: ['pier', 'boat_house', 'warehouse', 'marina', 'apartment', 'bridge', 'container_terminal', 'shipyard'] },
  { id: 'park',       get name() { return t('dn_park'); },       levelUnlock: 1,  payoutMult: 1.0, get desc() { return t('dd_green_space_projects'); },       jobTypes: ['shed', 'fence', 'garden_wall', 'playground', 'bandstand', 'pavilion', 'house'] },
  { id: 'oldtown',    get name() { return t('dn_old_town'); },   levelUnlock: 5,  payoutMult: 1.3, get desc() { return t('dd_historic_renovations'); },       jobTypes: ['garage', 'house', 'townhouse', 'heritage_restoration', 'apartment', 'library', 'office'] },
  { id: 'industrial', get name() { return t('dn_industrial'); }, levelUnlock: 8,  payoutMult: 1.4, get desc() { return t('dd_heavy_construction_zone'); },    jobTypes: ['workshop', 'factory_unit', 'warehouse', 'office', 'power_station', 'container_terminal', 'airport_terminal', 'refinery'] },
  { id: 'university', get name() { return t('dn_university'); }, levelUnlock: 12, payoutMult: 1.6, get desc() { return t('dd_campus_construction'); },        jobTypes: ['dormitory', 'lecture_hall', 'library', 'sports_complex', 'research_building', 'hospital', 'stadium', 'mega_stadium'] },
  { id: 'downtown',   get name() { return t('dn_downtown'); },   levelUnlock: 18, payoutMult: 2.0, get desc() { return t('dd_premium_commercial_builds'); },  jobTypes: ['apartment', 'retail_complex', 'office', 'hotel', 'skyscraper', 'convention_center', 'bridge', 'metro_tunnel', 'sky_bridge', 'mega_stadium'] },
];

export function getUnlockedZones(business) {
  const level = business.level || 1;
  return CONSTRUCTION_ZONES.filter((z) => level >= z.levelUnlock);
}

export function getZoneById(zoneId) {
  return CONSTRUCTION_ZONES.find((z) => z.id === zoneId) || null;
}

export function getZonePayoutMult(zoneId) {
  const z = getZoneById(zoneId);
  return z ? z.payoutMult : 1.0;
}

// Max zones you can work in simultaneously (based on staff)
export function getMaxZones(business) {
  const staff = (business.staffMembers || []).length;
  if (staff >= 40) return 6;
  if (staff >= 25) return 5;
  if (staff >= 15) return 4;
  if (staff >= 8) return 3;
  return 2;
}

export function getSelectedZones(business) {
  return business.selectedZones || [];
}

export function toggleZone(business, zoneId) {
  const current = getSelectedZones(business);
  const max = getMaxZones(business);
  if (current.includes(zoneId)) {
    return { ...business, selectedZones: current.filter((z) => z !== zoneId) };
  }
  if (current.length >= max) return { error: 'max_zones', max };
  return { ...business, selectedZones: [...current, zoneId] };
}

// Get the polygon centroid for a district (for map pins)
export function getDistrictCentroid(districtId) {
  const d = CITY_MAP.districts.find((d) => d.id === districtId);
  if (!d) return null;
  const pts = d.polygon.split(' ').map((pt) => pt.split(',').map(Number));
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  return { x: cx / pts.length, y: cy / pts.length };
}

// Get a random point inside a district polygon (for job pin placement)
export function getRandomPointInDistrict(districtId) {
  const d = CITY_MAP.districts.find((d) => d.id === districtId);
  if (!d) return null;
  const pts = d.polygon.split(' ').map((pt) => pt.split(',').map(Number));
  // Bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  // Ray casting point-in-polygon test
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
  // Try up to 50 times to find a point inside
  for (let i = 0; i < 50; i++) {
    const px = minX + Math.random() * (maxX - minX);
    const py = minY + Math.random() * (maxY - minY);
    if (inside(px, py)) return { x: px, y: py };
  }
  // Fallback to centroid
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  return { x: cx / pts.length, y: cy / pts.length };
}

export { CITY_MAP };

// ─── Generate random material requirements for a job ───
function generateMaterialRequirements(template) {
  const numMaterials = template.minMaterials + Math.floor(Math.random() * (template.maxMaterials - template.minMaterials + 1));
  const shuffled = [...RESOURCES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, numMaterials);

  const materialPct = 0.20 + Math.random() * 0.24; // 20%-44% of payout
  const totalBudget = template.payout * materialPct;

  const weights = selected.map(() => 0.5 + Math.random());
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  const requirements = {};
  for (let i = 0; i < selected.length; i++) {
    const allocation = (totalBudget * weights[i]) / totalWeight;
    const quantity = Math.max(1, Math.round(allocation / selected[i].cost));
    requirements[selected[i].id] = quantity;
  }

  return requirements;
}

// ─── Generate a set of available jobs ───
export function generateAvailableJobs(business) {
  const staff = (business.staffMembers || []).length;
  const level = business.level || 1;
  const unlockedZones = getUnlockedZones(business);
  const unlockedJobIds = new Set(JOB_TEMPLATES.filter((t) => staff >= t.staffUnlock).map((t) => t.id));

  // For each zone, find which unlocked job types can go there
  const zoneJobPool = unlockedZones.map((zone) => {
    const validJobs = zone.jobTypes.filter((jt) => unlockedJobIds.has(jt));
    return { zoneId: zone.id, jobs: validJobs };
  }).filter((z) => z.jobs.length > 0);

  if (zoneJobPool.length === 0) {
    // Fallback: just use unlocked jobs in any zone
    const fallbackJobs = JOB_TEMPLATES.filter((t) => staff >= t.staffUnlock);
    const fallbackZones = unlockedZones.length > 0 ? unlockedZones : CONSTRUCTION_ZONES.slice(0, 3);
    const picked = [...fallbackJobs].sort(() => Math.random() - 0.5).slice(0, Math.min(AVAILABLE_JOBS_COUNT, fallbackJobs.length));
    return picked.map((template) => {
      const zone = fallbackZones[Math.floor(Math.random() * fallbackZones.length)];
      const pinPos = getRandomPointInDistrict(zone.id) || getDistrictCentroid(zone.id);
      return makeJob(template, zone.id, zone.payoutMult, zone.name, pinPos);
    });
  }

  // Pick up to AVAILABLE_JOBS_COUNT jobs, distributing across zones
  const result = [];
  const usedZones = [...zoneJobPool];
  while (result.length < AVAILABLE_JOBS_COUNT && usedZones.length > 0) {
    // Pick a random zone from the pool
    const zoneIdx = Math.floor(Math.random() * usedZones.length);
    const zp = usedZones[zoneIdx];
    // Pick a random job type from that zone
    const typeId = zp.jobs[Math.floor(Math.random() * zp.jobs.length)];
    const template = JOB_TEMPLATES.find((t) => t.id === typeId);
    if (template) {
      const zone = getZoneById(zp.zoneId);
      const pinPos = getRandomPointInDistrict(zp.zoneId) || getDistrictCentroid(zp.zoneId);
      result.push(makeJob(template, zp.zoneId, zone.payoutMult, zone.name, pinPos));
    }
    // Remove this zone from the pool if we've used all its job types or to ensure variety
    usedZones.splice(zoneIdx, 1);
  }

  // If we still need more jobs, cycle through all zone-job combos
  if (result.length < AVAILABLE_JOBS_COUNT && zoneJobPool.length > 0) {
    const allCombos = [];
    for (const zp of zoneJobPool) {
      for (const typeId of zp.jobs) {
        allCombos.push({ zoneId: zp.zoneId, typeId });
      }
    }
    const shuffled = allCombos.sort(() => Math.random() - 0.5);
    for (const combo of shuffled) {
      if (result.length >= AVAILABLE_JOBS_COUNT) break;
      const template = JOB_TEMPLATES.find((t) => t.id === combo.typeId);
      if (template) {
        const zone = getZoneById(combo.zoneId);
        const pinPos = getRandomPointInDistrict(combo.zoneId) || getDistrictCentroid(combo.zoneId);
        result.push(makeJob(template, combo.zoneId, zone.payoutMult, zone.name, pinPos));
      }
    }
  }

  return result;
}

function makeJob(template, zoneId, zoneMult, zoneName, pinPos) {
  return {
    instanceId: `jobopt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    typeId: template.id,
    name: template.name,
    emoji: template.emoji,
    desc: template.desc,
    gradient: template.gradient,
    durationHours: template.durationHours,
    payout: Math.round(template.payout * zoneMult),
    staffReq: template.staffReq,
    resources: generateMaterialRequirements(template),
    zoneId,
    zoneName,
    zoneMult,
    pinX: pinPos.x,
    pinY: pinPos.y,
  };
}

// ─── Pending payout (construction has no hourly income, only pays on completion) ───
export function getConstructionLevelMultiplier(business) {
  const level = Math.max(1, business.level || 1);
  return Math.pow(1.12, level - 1);
}

export function getConstructionPendingPayout(business) {
  const levelMult = getConstructionLevelMultiplier(business);
  const activeJobs = (business.jobs || []).filter((j) => !j.completedAt);
  return Math.floor(activeJobs.reduce((sum, j) => sum + j.payout, 0) * levelMult);
}

export function getConstructionHourlyIncome(business) {
  const levelMult = getConstructionLevelMultiplier(business);
  const activeJobs = (business.jobs || []).filter((j) => !j.completedAt);
  if (activeJobs.length === 0) return 0;
  const hourlyRate = activeJobs.reduce((sum, j) => {
    const duration = j.durationHours || 1;
    return sum + (j.payout * levelMult) / duration;
  }, 0);
  const salary = getStaffSalaryHourly(business);
  return Math.floor(hourlyRate - salary);
}

// ─── Buy resources (creates a pending delivery) ───
export function buyResources(business, resourceId, quantity) {
  const resource = getResource(resourceId);
  if (!resource || quantity <= 0) return null;
  const capacity = getStorageCapacity(business, resourceId);
  const current = (business.resources || {})[resourceId] || 0;
  const pending = (business.pendingResources || {})[resourceId] || 0;
  if (current + pending + quantity > capacity) return { error: 'storage_full', capacity, current: current + pending };
  const cost = resource.cost * quantity;
  const now = Date.now();
  const deliveryMs = MATERIAL_DELIVERY_MIN_MS + Math.random() * (MATERIAL_DELIVERY_MAX_MS - MATERIAL_DELIVERY_MIN_MS);
  const delivery = {
    instanceId: `delivery_${now}_${Math.random().toString(36).slice(2, 6)}`,
    resourceId,
    quantity,
    orderedAt: now,
    arrivesAt: now + scaleDuration(Math.random() < 0.3 ? 0 : deliveryMs),
  };
  const pendingResources = { ...(business.pendingResources || {}), [resourceId]: pending + quantity };
  return {
    business: { ...business, pendingResources, deliveries: [...(business.deliveries || []), delivery] },
    cost,
  };
}

// ─── Check for arrived deliveries ───
export function getArrivedDeliveries(business) {
  const now = Date.now();
  return (business.deliveries || []).filter((d) => d.arrivesAt <= now);
}

// ─── Process arrived deliveries ───
export function processDeliveries(business) {
  const now = Date.now();
  const deliveries = business.deliveries || [];
  const arrived = deliveries.filter((d) => d.arrivesAt <= now);
  if (arrived.length === 0) return business;
  const remaining = deliveries.filter((d) => d.arrivesAt > now);

  const resources = { ...(business.resources || {}) };
  const pendingResources = { ...(business.pendingResources || {}) };

  for (const d of arrived) {
    resources[d.resourceId] = (resources[d.resourceId] || 0) + d.quantity;
    pendingResources[d.resourceId] = Math.max(0, (pendingResources[d.resourceId] || 0) - d.quantity);
  }

  return { ...business, resources, pendingResources, deliveries: remaining };
}

// ─── Get delivery time remaining ───
export function getDeliveryTimeRemaining(delivery) {
  return Math.max(0, delivery.arrivesAt - Date.now());
}

// ─── Start a construction job ───
export function startJob(business, jobOption) {
  if (!jobOption) return null;
  const availableStaff = getAvailableStaff(business);
  if (availableStaff.length < jobOption.staffReq) return { error: 'staff', available: availableStaff.length, required: jobOption.staffReq };
  const activeJobs = (business.jobs || []).filter((j) => !j.completedAt);
  if (activeJobs.length >= MAX_ACTIVE_JOBS) return { error: 'slots' };

  const resources = { ...(business.resources || {}) };
  for (const [resId, amount] of Object.entries(jobOption.resources)) {
    if ((resources[resId] || 0) < amount) return { error: 'resources', missing: resId };
  }
  for (const [resId, amount] of Object.entries(jobOption.resources)) {
    resources[resId] = (resources[resId] || 0) - amount;
  }

  const assignedStaffIds = availableStaff.slice(0, jobOption.staffReq).map((s) => s.id);

  const now = Date.now();
  const completesAt = now + scaleDuration(Math.random() < 0.3 ? 0 : jobOption.durationHours * 60 * 60 * 1000);
  const job = {
    instanceId: `job_${now}_${Math.random().toString(36).slice(2, 7)}`,
    typeId: jobOption.typeId,
    name: jobOption.name,
    emoji: jobOption.emoji,
    desc: jobOption.desc,
    gradient: jobOption.gradient,
    startedAt: now,
    completesAt,
    completedAt: null,
    payout: jobOption.payout,
    resources: jobOption.resources,
    durationHours: jobOption.durationHours,
    staffReq: jobOption.staffReq,
    assignedStaffIds,
  };

  const availableJobs = (business.availableJobs || []).filter((j) => j.instanceId !== jobOption.instanceId);

  return {
    business: {
      ...business,
      resources,
      jobs: [...(business.jobs || []), job],
      availableJobs,
    },
  };
}

// ─── Check for completed jobs ───
export function getCompletedJobs(business) {
  const now = Date.now();
  return (business.jobs || []).filter((j) => !j.completedAt && j.completesAt <= now);
}

// ─── Complete a job (pays out) ───
export function completeJob(business, jobInstanceId) {
  const jobs = business.jobs || [];
  const job = jobs.find((j) => j.instanceId === jobInstanceId && !j.completedAt);
  if (!job) return null;
  const now = Date.now();
  if (job.completesAt > now) return null;

  const updatedJobs = jobs.map((j) =>
    j.instanceId === jobInstanceId ? { ...j, completedAt: now } : j
  );

  const levelMult = getConstructionLevelMultiplier(business);
  const payout = Math.floor(job.payout * levelMult);

  return {
    business: { ...business, jobs: updatedJobs },
    payout,
    tax: Math.round(payout * 0.15),
  };
}

// ─── Get job time remaining ───
export function getJobTimeRemaining(job) {
  if (!job || job.completedAt) return 0;
  return Math.max(0, job.completesAt - Date.now());
}

// ─── Refresh available jobs ───
export function refreshJobs(business) {
  const availableJobs = generateAvailableJobs(business);
  return { ...business, availableJobs, jobsRefreshedAt: Date.now() };
}

// ─── Check if jobs need refresh ───
export function getJobsRefreshTimeRemaining(business) {
  const refreshedAt = business.jobsRefreshedAt || 0;
  const nextRefresh = refreshedAt + scaleDuration(JOB_REFRESH_HOURS * 60 * 60 * 1000);
  return Math.max(0, nextRefresh - Date.now());
}

// ─── Hire staff ───
export function hireStaff(business, count) {
  if (count <= 0) return null;
  const now = Date.now();
  const hiringStaff = [...(business.hiringStaff || [])];
  for (let i = 0; i < count; i++) {
    const duration = STAFF_HIRE_MIN_MS + Math.random() * (STAFF_HIRE_MAX_MS - STAFF_HIRE_MIN_MS);
    const member = makeStaffMember();
    hiringStaff.push({
      instanceId: `hire_${now}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      completesAt: now + scaleDuration(Math.random() < 0.3 ? 0 : duration),
      staffMember: member,
    });
  }
  return { ...business, hiringStaff };
}

export function instantHireStaff(business, hireId) {
  const hiringStaff = (business.hiringStaff || []).filter((h) => h.instanceId !== hireId);
  let staffMembers = business.staffMembers || [];
  if (staffMembers.length === 0 && (business.staff || 0) > 0) {
    staffMembers = Array.from({ length: business.staff }, () => makeStaffMember());
  }
  return { ...business, staff: (business.staff || 0) + 1, staffMembers: [...staffMembers, makeStaffMember()], hiringStaff };
}

export function completeHiredStaff(business) {
  const now = Date.now();
  const completed = (business.hiringStaff || []).filter((h) => h.completesAt <= now);
  if (completed.length === 0) return business;
  const remaining = (business.hiringStaff || []).filter((h) => h.completesAt > now);
  const newMembers = completed.map((h) => h.staffMember || makeStaffMember());
  return {
    ...business,
    staff: (business.staff || 0) + completed.length,
    staffMembers: [...(business.staffMembers || []), ...newMembers],
    hiringStaff: remaining,
  };
}

// ─── Process construction business (called every tick) ───
export function processConstruction(business, minutesElapsed) {
  const hoursFraction = minutesElapsed / 60;
  const levelMult = getConstructionLevelMultiplier(business);
  let income = 0;

  let updatedBusiness = processDeliveries(business);
  updatedBusiness = completeHiredStaff(updatedBusiness);

  const now = Date.now();
  const jobs = (updatedBusiness.jobs || []).map((j) => {
    if (!j.completedAt && j.completesAt <= now) {
      income += Math.floor(j.payout * levelMult);
      return { ...j, completedAt: now };
    }
    return j;
  });
  updatedBusiness = { ...updatedBusiness, jobs };

  const salary = getStaffSalaryHourly(updatedBusiness) * hoursFraction;
  income -= salary;

  return { updatedBusiness, income };
}

export { formatMoney };
