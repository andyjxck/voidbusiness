import { CITY_MAP } from './bus';
import { t } from './i18n';
import { generatePerson } from './names';
import { isSuspended } from './businesses';
import { scaleDuration } from './store';

export const CLOTHING_STAFF_TYPES = [
  { id: 'sales', get name() { return t('dn_sales_associate'); }, emoji: '🧑‍💼', hireCost: 30000, salaryHourly: 50, ratingMin: 45, ratingMax: 90 },
  { id: 'stock', get name() { return t('dn_stock_clerk'); }, emoji: '📦', hireCost: 30000, salaryHourly: 40, ratingMin: 40, ratingMax: 88 },
  { id: 'visual', get name() { return t('dn_visual_merchandiser'); }, emoji: '🎨', hireCost: 60000, salaryHourly: 70, ratingMin: 45, ratingMax: 92 },
  { id: 'manager', get name() { return t('dn_store_manager'); }, emoji: '📋', hireCost: 90000, salaryHourly: 120, ratingMin: 55, ratingMax: 95 },
];

export const CLOTHING_STOCK_TYPES = [
  { id: 'basics', get name() { return t('dn_basic_apparel'); }, emoji: '👕', unitCost: 100 },
  { id: 'denim', get name() { return t('dn_denim'); }, emoji: '👖', unitCost: 250 },
  { id: 'premium', get name() { return t('dn_premium_fabrics'); }, emoji: '🧵', unitCost: 600 },
  { id: 'accessories', get name() { return t('dn_accessories'); }, emoji: '👜', unitCost: 1500 },
];

export const CLOTHING_PRODUCTS = [
  { id: 'tshirt', get name() { return t('dn_t_shirt'); }, emoji: '👕', price: 300, demand: 20, stock: { basics: 1 } },
  { id: 'jeans', get name() { return t('dn_jeans'); }, emoji: '👖', price: 450, demand: 15, stock: { denim: 1 } },
  { id: 'sneakers', get name() { return t('dn_sneakers'); }, emoji: '👟', price: 900, demand: 12, stock: { basics: 1, denim: 1 } },
  { id: 'dress', get name() { return t('dn_dress'); }, emoji: '👗', price: 1200, demand: 9, stock: { premium: 1 } },
  { id: 'jacket', get name() { return t('dn_jacket'); }, emoji: '🧥', price: 1800, demand: 7, stock: { denim: 1, premium: 1 } },
  { id: 'handbag', get name() { return t('dn_handbag'); }, emoji: '👜', price: 3000, demand: 5, stock: { accessories: 1 } },
];

export const CLOTHING_STORES = [
  { id: 'suburbs', get name() { return t('dn_suburbs'); }, requiresStore: null, openCost: 0, footfall: 1, rentHourly: 200, capacity: 24 },
  { id: 'harbour', get name() { return t('dn_harbour'); }, requiresStore: 'suburbs', openCost: 700000, footfall: 1.15, rentHourly: 350, capacity: 30 },
  { id: 'park', get name() { return t('dn_park'); }, requiresStore: 'suburbs', openCost: 600000, footfall: 1.1, rentHourly: 300, capacity: 28 },
  { id: 'oldtown', get name() { return t('dn_old_town'); }, requiresStore: 'harbour', openCost: 1800000, footfall: 1.35, rentHourly: 550, capacity: 38 },
  { id: 'industrial', get name() { return t('dn_industrial'); }, requiresStore: 'oldtown', openCost: 3000000, footfall: 1.5, rentHourly: 850, capacity: 48 },
  { id: 'university', get name() { return t('dn_university'); }, requiresStore: 'industrial', openCost: 5000000, footfall: 1.7, rentHourly: 1200, capacity: 58 },
  { id: 'downtown', get name() { return t('dn_downtown'); }, requiresStore: 'university', openCost: 11000000, footfall: 2.3, rentHourly: 2500, capacity: 80 },
];

export const STAFF_HIRE_MIN_MS = 3000;
export const STAFF_HIRE_MAX_MS = 45 * 60 * 1000;
export const MAX_HIRE_BATCH = 5;
export const STORE_OPEN_MS_MIN = 3000;
export const STORE_OPEN_MS_MAX = 45 * 60 * 1000;
export const SUPPLY_DELIVERY_MIN_MS = 30 * 1000;
export const SUPPLY_DELIVERY_MAX_MS = 90 * 1000;

export function getOptimalStaffForStore(storeId) {
  const zone = getClothingStore(storeId);
  if (!zone) return 1;
  return Math.max(1, Math.ceil(zone.capacity / 8));
}

export const getClothingStaffType = (id) => CLOTHING_STAFF_TYPES.find((item) => item.id === id) || null;
export const getClothingStockType = (id) => CLOTHING_STOCK_TYPES.find((item) => item.id === id) || null;
export const getClothingProduct = (id) => CLOTHING_PRODUCTS.find((item) => item.id === id) || null;
export const getClothingStore = (id) => CLOTHING_STORES.find((item) => item.id === id) || null;
export const getClothingStaffMembers = (business, typeId) => (business.staffMembers || []).filter((member) => !typeId || member.typeId === typeId);
export const getClothingOwnedStores = (business) => business.branches || [];
export const getClothingStoreById = (business, storeId) => getClothingOwnedStores(business).find((branch) => branch.branchId === storeId) || null;
export const getClothingHireTimeRemaining = (hire) => Math.max(0, hire.completesAt - Date.now());

export function formatClothingTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${seconds % 60}s`;
}

const makeStaffMember = (typeId, rating) => {
  const type = getClothingStaffType(typeId);
  const person = generatePerson();
  return {
    id: `clothing_staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    typeId,
    name: person.name,
    gender: person.gender,
    age: person.age,
    rating: rating ?? Math.floor(type.ratingMin + Math.random() * (type.ratingMax - type.ratingMin + 1)),
    salary: type?.salaryHourly || 0,
  };
};

export function hydrateClothing(business) {
  if (business.clothingVersion === 2) {
    const needsMigration = (business.branches || []).some((b) => !b.assignedStaffIds);
    if (!needsMigration) return business;
    return {
      ...business,
      branches: (business.branches || []).map((b) => ({
        ...b,
        assignedStaffIds: b.assignedStaffIds || (b.openedAt ? (business.staffMembers || []).map((s) => s.id) : []),
      })),
    };
  }
  const oldStock = business.stock || 0;
  const existingBranches = business.branches || [];
  return {
    ...business,
    clothingVersion: 2,
    branches: existingBranches.length > 0
      ? existingBranches.map((b) => ({ ...b, assignedStaffIds: b.assignedStaffIds || (b.openedAt ? (business.staffMembers || []).map((s) => s.id) : []) }))
      : [{ branchId: 'suburbs', menuIds: ['tshirt', 'jeans', 'sneakers'], upgrades: {}, assignedStaffIds: [] }],
    staffMembers: business.staffMembers || [],
    hiringStaff: business.hiringStaff || [],
    supplies: business.supplies || { basics: Math.max(30, oldStock), denim: Math.max(30, oldStock), premium: Math.max(20, Math.floor(oldStock / 2)), accessories: 15 },
    pendingSupplies: business.pendingSupplies || [],
  };
}

export function hireClothingStaff(business, typeId, count) {
  const type = getClothingStaffType(typeId);
  if (!type || count < 1 || count > MAX_HIRE_BATCH) return { error: 'invalid_hire' };
  if ((business.hiringStaff || []).some((hire) => hire.typeId === typeId)) return { error: 'type_hiring' };
  const isFirstHireEver = (business.staffMembers || []).length === 0 && (business.hiringStaff || []).length === 0;
  const now = Date.now();
  const hires = Array.from({ length: count }, () => {
    const duration = STAFF_HIRE_MIN_MS + Math.random() * (STAFF_HIRE_MAX_MS - STAFF_HIRE_MIN_MS);
    return { id: `clothing_hire_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, typeId, rating: Math.floor(type.ratingMin + Math.random() * (type.ratingMax - type.ratingMin + 1)), completesAt: isFirstHireEver || Math.random() < 0.3 ? now : now + scaleDuration(duration) };
  });
  return { ...business, hiringStaff: [...(business.hiringStaff || []), ...hires] };
}

export function completeClothingHires(business) {
  const ready = (business.hiringStaff || []).filter((hire) => hire.completesAt <= Date.now());
  if (!ready.length) return business;
  return { ...business, staffMembers: [...(business.staffMembers || []), ...ready.map((hire) => makeStaffMember(hire.typeId, hire.rating))], hiringStaff: (business.hiringStaff || []).filter((hire) => hire.completesAt > Date.now()) };
}

export function instantHireClothingStaff(business, hireId) {
  const hire = (business.hiringStaff || []).find((item) => item.id === hireId);
  if (!hire) return business;
  return { ...business, staffMembers: [...(business.staffMembers || []), makeStaffMember(hire.typeId, hire.rating)], hiringStaff: business.hiringStaff.filter((item) => item.id !== hireId) };
}

export function fireClothingStaff(business, staffId) {
  const branches = getClothingOwnedStores(business).map((b) => ({
    ...b,
    assignedStaffIds: (b.assignedStaffIds || []).filter((id) => id !== staffId),
  }));
  return {
    ...business,
    branches,
    staffMembers: (business.staffMembers || []).filter((s) => s.id !== staffId),
  };
}

export function raiseClothingStaff(business, staffId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === staffId) {
      const type = getClothingStaffType(s.typeId);
      const currentSalary = type?.salaryHourly || 0;
      return { ...s, salary: Math.round((s.salary || currentSalary) * 1.15) };
    }
    return s;
  });
  return { ...business, staffMembers: members };
}

export function trainClothingStaff(business, staffId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === staffId) return { ...s, rating: Math.min(10, (s.rating || 5) + 1) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function isClothingStoreUnlocked(business, storeId) {
  const store = getClothingStore(storeId);
  if (!store) return false;
  if (!store.requiresStore) return true;
  return !!getClothingStoreById(business, store.requiresStore);
}

export function getUnlockedClothingStores(business) {
  return CLOTHING_STORES.filter((b) => isClothingStoreUnlocked(business, b.id));
}

export function openClothingStore(business, storeId) {
  const store = getClothingStore(storeId);
  if (!store) return { error: 'invalid_store' };
  if (!isClothingStoreUnlocked(business, storeId)) return { error: 'locked' };
  if (getClothingStoreById(business, storeId)) return { error: 'owned' };
  return { ...business, branches: [...getClothingOwnedStores(business), { branchId: storeId, menuIds: ['tshirt', 'jeans', 'sneakers'], upgrades: {}, assignedStaffIds: [] }] };
}

export function getAssignedStaff(business, storeId) {
  const branch = getClothingStoreById(business, storeId);
  if (!branch) return [];
  return (branch.assignedStaffIds || []).map((id) => (business.staffMembers || []).find((s) => s.id === id)).filter(Boolean);
}

export function assignClothingStaff(business, storeId, staffId) {
  const branch = getClothingStoreById(business, storeId);
  if (!branch) return business;
  if (!(business.staffMembers || []).some((s) => s.id === staffId)) return business;
  const branches = getClothingOwnedStores(business).map((b) => {
    if (b.branchId === storeId) {
      return { ...b, assignedStaffIds: [...new Set([...(b.assignedStaffIds || []), staffId])] };
    }
    return { ...b, assignedStaffIds: (b.assignedStaffIds || []).filter((id) => id !== staffId) };
  });
  return { ...business, branches };
}

export function unassignClothingStaff(business, storeId, staffId) {
  const branch = getClothingStoreById(business, storeId);
  if (!branch) return business;
  const branches = getClothingOwnedStores(business).map((b) =>
    b.branchId === storeId
      ? { ...b, assignedStaffIds: (b.assignedStaffIds || []).filter((id) => id !== staffId) }
      : b
  );
  return { ...business, branches };
}

export function getClothingStaffBranchId(business, staffId) {
  const branch = getClothingOwnedStores(business).find((b) => (b.assignedStaffIds || []).includes(staffId));
  return branch ? branch.branchId : null;
}

export function canOpenClothingStore(business, storeId) {
  const branch = getClothingStoreById(business, storeId);
  if (!branch) return { canOpen: false, reason: 'invalid_store' };
  if (branch.openedAt || branch.openingAt) return { canOpen: false, reason: 'already_open' };
  const assigned = getAssignedStaff(business, storeId);
  if (assigned.length === 0) return { canOpen: false, reason: 'no_staff' };
  const supplies = business.supplies || {};
  const hasSupplies = CLOTHING_STOCK_TYPES.some((ing) => (supplies[ing.id] || 0) > 0);
  if (!hasSupplies) return { canOpen: false, reason: 'no_supplies' };
  return { canOpen: true };
}

export function startClothingStoreOpening(business, storeId) {
  const check = canOpenClothingStore(business, storeId);
  if (!check.canOpen) return { error: check.reason };
  const isFirstStoreEver = getClothingOwnedStores(business).every((b) => !b.openedAt);
  const openMs = isFirstStoreEver ? 5000 : Math.random() < 0.3 ? 0 : STORE_OPEN_MS_MIN + Math.random() * (STORE_OPEN_MS_MAX - STORE_OPEN_MS_MIN);
  const branches = getClothingOwnedStores(business).map((b) =>
    b.branchId === storeId ? { ...b, openingAt: Date.now() + scaleDuration(openMs) } : b
  );
  return { ...business, branches };
}

export const completeClothingOpenings = (business) => ({ ...business, branches: getClothingOwnedStores(business).map((branch) => branch.openingAt && branch.openingAt <= Date.now() ? { ...branch, openedAt: Date.now(), openingAt: null } : branch) });

export function instantOpenClothingStore(business, storeId) {
  const branches = getClothingOwnedStores(business).map((b) =>
    b.branchId === storeId && b.openingAt ? { ...b, openedAt: Date.now(), openingAt: null } : b
  );
  return { ...business, branches };
}

export function buyClothingSupplies(business, stockTypeId, quantity) {
  const stockType = getClothingStockType(stockTypeId);
  if (!stockType || quantity <= 0) return null;
  const isFirstSupplyEver = (business.pendingSupplies || []).length === 0
    && Object.values(business.supplies || {}).every((v) => !v);
  const deliveryMs = isFirstSupplyEver ? 0 : SUPPLY_DELIVERY_MIN_MS + Math.random() * (SUPPLY_DELIVERY_MAX_MS - SUPPLY_DELIVERY_MIN_MS);
  const delivery = {
    id: `clothing_supply_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    stockTypeId,
    quantity,
    deliveredAt: Date.now() + scaleDuration(Math.random() < 0.3 ? 0 : deliveryMs),
  };
  return { business: { ...business, pendingSupplies: [...(business.pendingSupplies || []), delivery] }, cost: stockType.unitCost * quantity };
}

export function getClothingSupplyDeliveryTimeRemaining(delivery) {
  return Math.max(0, delivery.deliveredAt - Date.now());
}

export function getArrivedClothingSupplies(business) {
  const now = Date.now();
  return (business.pendingSupplies || []).filter((d) => d.deliveredAt <= now);
}

export function completeClothingSupplies(business) {
  const arrived = getArrivedClothingSupplies(business);
  if (!arrived.length) return business;
  const pending = (business.pendingSupplies || []).filter((d) => d.deliveredAt > Date.now());
  const supplies = { ...(business.supplies || {}) };
  for (const d of arrived) supplies[d.stockTypeId] = (supplies[d.stockTypeId] || 0) + d.quantity;
  return { ...business, pendingSupplies: pending, supplies };
}

export function instantClothingSupply(business, deliveryId) {
  const delivery = (business.pendingSupplies || []).find((d) => d.id === deliveryId);
  if (!delivery) return business;
  const updated = { ...business, pendingSupplies: (business.pendingSupplies || []).map((d) => d.id === deliveryId ? { ...d, deliveredAt: Date.now() } : d) };
  return completeClothingSupplies(updated);
}

export const setClothingMenu = (business, storeId, menuIds) => ({ ...business, branches: getClothingOwnedStores(business).map((branch) => branch.branchId === storeId && !branch.openingAt ? { ...branch, menuIds } : branch) });

export function getClothingSalaryHourly(business) {
  return getClothingStaffMembers(business).reduce((total, member) => total + (member.salary || getClothingStaffType(member.typeId)?.salaryHourly || 0), 0);
}

export function getClothingLevelMultiplier(business) {
  const level = Math.max(1, business.level || 1);
  return Math.pow(1.12, level - 1);
}

export function getClothingSalesHourly(business) {
  const levelMult = getClothingLevelMultiplier(business);
  let total = 0;
  for (const branch of getClothingOwnedStores(business)) {
    if (branch.openingAt || !branch.openedAt) continue;
    const zone = getClothingStore(branch.branchId);
    const assignedStaff = (branch.assignedStaffIds || []).map((id) => (business.staffMembers || []).find((s) => s.id === id)).filter(Boolean);
    const assignedCount = assignedStaff.length;
    const optimalStaff = getOptimalStaffForStore(branch.branchId);
    const capacityFactor = Math.min(1, assignedCount / optimalStaff);
    const managerCount = assignedStaff.filter((s) => s.typeId === 'manager').length;
    total += (branch.menuIds || []).reduce((sum, id) => {
      const item = getClothingProduct(id);
      return sum + (item ? item.price * item.demand * zone.footfall * capacityFactor * (1 + managerCount * 0.03) : 0);
    }, 0);
  }
  return total * levelMult;
}

export function getClothingStockCostHourly(business) {
  const levelMult = getClothingLevelMultiplier(business);
  let total = 0;
  for (const branch of getClothingOwnedStores(business)) {
    if (branch.openingAt || !branch.openedAt) continue;
    const zone = getClothingStore(branch.branchId);
    const assignedStaff = (branch.assignedStaffIds || []).map((id) => (business.staffMembers || []).find((s) => s.id === id)).filter(Boolean);
    const assignedCount = assignedStaff.length;
    const optimalStaff = getOptimalStaffForStore(branch.branchId);
    const capacityFactor = Math.min(1, assignedCount / optimalStaff);
    for (const id of branch.menuIds || []) {
      const item = getClothingProduct(id);
      if (!item) continue;
      for (const [stockTypeId, units] of Object.entries(item.stock)) total += item.demand * zone.footfall * capacityFactor * units * (getClothingStockType(stockTypeId)?.unitCost || 0);
    }
  }
  return total * levelMult;
}

export function getClothingStoreNetIncomeHourly(business, storeId) {
  const branch = getClothingStoreById(business, storeId);
  if (!branch || branch.openingAt || !branch.openedAt) return 0;
  const zone = getClothingStore(storeId);
  if (!zone) return 0;
  const assignedStaff = (branch.assignedStaffIds || []).map((id) => (business.staffMembers || []).find((s) => s.id === id)).filter(Boolean);
  const assignedCount = assignedStaff.length;
  const optimalStaff = getOptimalStaffForStore(storeId);
  const capacityFactor = Math.min(1, assignedCount / optimalStaff);
  const managerCount = assignedStaff.filter((s) => s.typeId === 'manager').length;
  let revenue = 0;
  let stockCost = 0;
  for (const id of branch.menuIds || []) {
    const item = getClothingProduct(id);
    if (!item) continue;
    revenue += item.price * item.demand * zone.footfall * capacityFactor * (1 + managerCount * 0.03);
    for (const [stockTypeId, units] of Object.entries(item.stock)) {
      stockCost += item.demand * zone.footfall * capacityFactor * units * (getClothingStockType(stockTypeId)?.unitCost || 0);
    }
  }
  const payroll = assignedStaff.reduce((sum, s) => sum + (getClothingStaffType(s.typeId)?.salaryHourly || 0), 0);
  return revenue - stockCost - payroll - zone.rentHourly;
}

export function getClothingRentHourly(business) {
  return getClothingOwnedStores(business).filter((branch) => branch.openedAt && !branch.openingAt).reduce((total, branch) => total + (getClothingStore(branch.branchId)?.rentHourly || 0), 0);
}

export function getClothingHourlyIncome(business) {
  const hydrated = hydrateClothing(business);
  return Math.floor(getClothingSalesHourly(hydrated) - getClothingStockCostHourly(hydrated) - getClothingSalaryHourly(hydrated) - getClothingRentHourly(hydrated));
}

export function processClothingBusiness(business, minutesElapsed) {
  let updated = hydrateClothing(business);
  updated = completeClothingHires(updated);
  updated = completeClothingOpenings(updated);
  updated = completeClothingSupplies(updated);
  const hours = minutesElapsed / 60;
  const stockNeeds = {};
  for (const branch of getClothingOwnedStores(updated)) {
    if (branch.openingAt || !branch.openedAt) continue;
    const zone = getClothingStore(branch.branchId);
    const assignedCount = (branch.assignedStaffIds || []).length;
    const optimalStaff = getOptimalStaffForStore(branch.branchId);
    const capacityFactor = Math.min(1, assignedCount / optimalStaff);
    for (const id of branch.menuIds || []) {
      const item = getClothingProduct(id);
      if (!item) continue;
      for (const [stockTypeId, units] of Object.entries(item.stock)) stockNeeds[stockTypeId] = (stockNeeds[stockTypeId] || 0) + item.demand * zone.footfall * capacityFactor * units * hours;
    }
  }
  const supplyFactor = Object.entries(stockNeeds).reduce((factor, [id, needed]) => needed > 0 ? Math.min(factor, (updated.supplies?.[id] || 0) / needed) : factor, 1);
  const grossSales = getClothingSalesHourly(updated) * hours * Math.max(0, Math.min(1, supplyFactor));
  const stockCost = getClothingStockCostHourly(updated) * hours * Math.max(0, Math.min(1, supplyFactor));
  const payroll = getClothingSalaryHourly(updated) * hours;
  const rent = getClothingRentHourly(updated) * hours;
  const supplies = { ...(updated.supplies || {}) };
  Object.entries(stockNeeds).forEach(([id, needed]) => { supplies[id] = Math.max(0, (supplies[id] || 0) - needed * Math.max(0, Math.min(1, supplyFactor))); });
  const income = grossSales - stockCost - payroll - rent;
  return { updatedBusiness: { ...updated, supplies, allTimeEarnings: (updated.allTimeEarnings || 0) + income }, income };
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
