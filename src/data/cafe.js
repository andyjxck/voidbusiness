import { isSuspended } from './businesses';
import { scaleDuration } from './store';
import { t } from './i18n';

export const CAFE_STAFF_TYPES = [
  { id: 'barista', get name() { return t('dn_barista'); }, emoji: '☕', hireCost: 350, salaryHourly: 4, ratingMin: 45, ratingMax: 90 },
  { id: 'server', get name() { return t('dn_server'); }, emoji: '🍽️', hireCost: 300, salaryHourly: 3, ratingMin: 40, ratingMax: 88 },
  { id: 'kitchen', get name() { return t('dn_kitchen_staff'); }, emoji: '🥐', hireCost: 450, salaryHourly: 5, ratingMin: 45, ratingMax: 92 },
  { id: 'manager', get name() { return t('dn_manager'); }, emoji: '📋', hireCost: 900, salaryHourly: 9, ratingMin: 55, ratingMax: 95 },
];

export const CAFE_INGREDIENTS = [
  { id: 'beans', get name() { return t('dn_coffee_beans'); }, emoji: '🫘', unitCost: 2 },
  { id: 'milk', get name() { return t('dn_milk'); }, emoji: '🥛', unitCost: 1 },
  { id: 'pastry', get name() { return t('dn_pastries'); }, emoji: '🥐', unitCost: 3 },
  { id: 'produce', get name() { return t('dn_fresh_produce'); }, emoji: '🥬', unitCost: 3 },
];

export const CAFE_MENU = [
  { id: 'espresso', get name() { return t('dn_espresso'); }, emoji: '☕', price: 10, demand: 20, ingredients: { beans: 1 } },
  { id: 'latte', get name() { return t('dn_latte'); }, emoji: '🥛', price: 15, demand: 18, ingredients: { beans: 1, milk: 1 } },
  { id: 'pastry', get name() { return t('dn_pastry'); }, emoji: '🥐', price: 12, demand: 14, ingredients: { pastry: 1 } },
  { id: 'brunch', get name() { return t('dn_brunch_plate'); }, emoji: '🍳', price: 26, demand: 9, ingredients: { produce: 1, pastry: 1 } },
];

export const CAFE_BRANCHES = [
  { id: 'suburbs', get name() { return t('dn_suburbs'); }, requiresBranch: null, openCost: 0, footfall: 1, rentHourly: 5, capacity: 24 },
  { id: 'harbour', get name() { return t('dn_harbour'); }, requiresBranch: 'suburbs', openCost: 7000, footfall: 1.15, rentHourly: 8, capacity: 30 },
  { id: 'park', get name() { return t('dn_park'); }, requiresBranch: 'suburbs', openCost: 6000, footfall: 1.1, rentHourly: 7, capacity: 28 },
  { id: 'oldtown', get name() { return t('dn_old_town'); }, requiresBranch: 'harbour', openCost: 18000, footfall: 1.35, rentHourly: 13, capacity: 38 },
  { id: 'industrial', get name() { return t('dn_industrial'); }, requiresBranch: 'oldtown', openCost: 30000, footfall: 1.5, rentHourly: 20, capacity: 48 },
  { id: 'university', get name() { return t('dn_university'); }, requiresBranch: 'industrial', openCost: 50000, footfall: 1.7, rentHourly: 30, capacity: 58 },
  { id: 'downtown', get name() { return t('dn_downtown'); }, requiresBranch: 'university', openCost: 110000, footfall: 2.3, rentHourly: 55, capacity: 80 },
];

export const STAFF_HIRE_MIN_MS = 3000;
export const STAFF_HIRE_MAX_MS = 45 * 60 * 1000;
export const MAX_HIRE_BATCH = 5;
export const BRANCH_OPEN_MS_MIN = 3000;
export const BRANCH_OPEN_MS_MAX = 45 * 60 * 1000;
export const SUPPLY_DELIVERY_MIN_MS = 30 * 1000;
export const SUPPLY_DELIVERY_MAX_MS = 90 * 1000;

export const CAFE_TUTORIAL_STEPS = [
  { id: 0, get title() { return t('dn_hire_your_first_staff'); }, get desc() { return t('dd_tap_this_button_to_hire_a_barista'); }, tab: 'staff', targetKey: 'hireBtn' },
  { id: 1, get title() { return t('dn_buy_some_supplies'); }, get desc() { return t('dd_tap_this_button_to_order_coffee_beans'); }, tab: 'supplies', targetKey: 'supplyBuy' },
  { id: 2, get title() { return t('dn_open_your_branch'); }, get desc() { return t('dd_tap_your_suburbs_branch_to_view_it'); }, tab: 'cafe', targetKey: 'branchCard' },
  { id: 3, get title() { return t('dn_assign_your_staff'); }, get desc() { return t('dd_tap_a_staff_member_to_assign_them_to_thi'); }, tab: 'cafe', targetKey: 'assignStaff' },
  { id: 4, get title() { return t('dn_open_for_business'); }, get desc() { return t('dd_tap_here_to_open_your_branch_and_start_e'); }, tab: 'cafe', targetKey: 'openBranch' },
  { id: 5, get title() { return t('dn_tutorial_complete'); }, get desc() { return t('dd_your_branch_is_opening_hire_more_staff_s'); }, tab: 'cafe', targetKey: null },
];

export function getOptimalStaffForBranch(branchId) {
  const zone = getCafeBranch(branchId);
  if (!zone) return 1;
  return Math.max(1, Math.ceil(zone.capacity / 8));
}

import { generatePerson } from './names';

export const getCafeStaffType = (id) => CAFE_STAFF_TYPES.find((item) => item.id === id) || null;
export const getCafeIngredient = (id) => CAFE_INGREDIENTS.find((item) => item.id === id) || null;
export const getCafeMenuItem = (id) => CAFE_MENU.find((item) => item.id === id) || null;
export const getCafeBranch = (id) => CAFE_BRANCHES.find((item) => item.id === id) || null;
export const getCafeStaffMembers = (business, typeId) => (business.staffMembers || []).filter((member) => !typeId || member.typeId === typeId);
export const getCafeOwnedBranches = (business) => business.branches || [];
export const getCafeBranchById = (business, branchId) => getCafeOwnedBranches(business).find((branch) => branch.branchId === branchId) || null;
export const getCafeHireTimeRemaining = (hire) => Math.max(0, hire.completesAt - Date.now());

export function formatCafeTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${seconds % 60}s`;
}

const makeStaffMember = (typeId, rating) => {
  const type = getCafeStaffType(typeId);
  const person = generatePerson();
  return {
    id: `cafe_staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    typeId,
    name: person.name,
    gender: person.gender,
    age: person.age,
    rating: rating ?? Math.floor(type.ratingMin + Math.random() * (type.ratingMax - type.ratingMin + 1)),
    salary: type?.salaryHourly || 0,
  };
};

export function hydrateCafe(business) {
  if (business.cafeVersion === 2) {
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
    cafeVersion: 2,
    branches: existingBranches.length > 0
      ? existingBranches.map((b) => ({ ...b, assignedStaffIds: b.assignedStaffIds || (b.openedAt ? (business.staffMembers || []).map((s) => s.id) : []) }))
      : [{ branchId: 'suburbs', menuIds: ['espresso', 'latte', 'pastry'], upgrades: {}, assignedStaffIds: [] }],
    staffMembers: business.staffMembers || [],
    hiringStaff: business.hiringStaff || [],
    supplies: business.supplies || { beans: Math.max(30, oldStock), milk: Math.max(30, oldStock), pastry: Math.max(20, Math.floor(oldStock / 2)), produce: 15 },
    pendingSupplies: business.pendingSupplies || [],
    tutorialStep: business.tutorialStep || 0,
  };
}

export function hireCafeStaff(business, typeId, count) {
  const type = getCafeStaffType(typeId);
  if (!type || count < 1 || count > MAX_HIRE_BATCH) return { error: 'invalid_hire' };
  if ((business.hiringStaff || []).some((hire) => hire.typeId === typeId)) return { error: 'type_hiring' };
  const isFirstHireEver = (business.staffMembers || []).length === 0 && (business.hiringStaff || []).length === 0;
  const now = Date.now();
  const hires = Array.from({ length: count }, () => {
    const duration = STAFF_HIRE_MIN_MS + Math.random() * (STAFF_HIRE_MAX_MS - STAFF_HIRE_MIN_MS);
    return { id: `cafe_hire_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, typeId, rating: Math.floor(type.ratingMin + Math.random() * (type.ratingMax - type.ratingMin + 1)), completesAt: isFirstHireEver || Math.random() < 0.3 ? now : now + scaleDuration(duration) };
  });
  return { ...business, hiringStaff: [...(business.hiringStaff || []), ...hires] };
}

export function completeCafeHires(business) {
  const ready = (business.hiringStaff || []).filter((hire) => hire.completesAt <= Date.now());
  if (!ready.length) return business;
  return { ...business, staffMembers: [...(business.staffMembers || []), ...ready.map((hire) => makeStaffMember(hire.typeId, hire.rating))], hiringStaff: (business.hiringStaff || []).filter((hire) => hire.completesAt > Date.now()) };
}

export function instantHireCafeStaff(business, hireId) {
  const hire = (business.hiringStaff || []).find((item) => item.id === hireId);
  if (!hire) return business;
  return { ...business, staffMembers: [...(business.staffMembers || []), makeStaffMember(hire.typeId, hire.rating)], hiringStaff: business.hiringStaff.filter((item) => item.id !== hireId) };
}

export function fireCafeStaff(business, staffId) {
  const branches = getCafeOwnedBranches(business).map((b) => ({
    ...b,
    assignedStaffIds: (b.assignedStaffIds || []).filter((id) => id !== staffId),
  }));
  return {
    ...business,
    branches,
    staffMembers: (business.staffMembers || []).filter((s) => s.id !== staffId),
  };
}

export function raiseCafeStaff(business, staffId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === staffId) {
      const type = getCafeStaffType(s.typeId);
      const currentSalary = type?.salaryHourly || 0;
      return { ...s, salary: Math.round((s.salary || currentSalary) * 1.15) };
    }
    return s;
  });
  return { ...business, staffMembers: members };
}

export function trainCafeStaff(business, staffId) {
  const members = (business.staffMembers || []).map((s) => {
    if (s.id === staffId) return { ...s, rating: Math.min(10, (s.rating || 5) + 1) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function isCafeBranchUnlocked(business, branchId) {
  const branch = getCafeBranch(branchId);
  if (!branch) return false;
  if (!branch.requiresBranch) return true;
  return !!getCafeBranchById(business, branch.requiresBranch);
}

export function getUnlockedCafeBranches(business) {
  return CAFE_BRANCHES.filter((b) => isCafeBranchUnlocked(business, b.id));
}

export function openCafeBranch(business, branchId) {
  const branch = getCafeBranch(branchId);
  if (!branch) return { error: 'invalid_branch' };
  if (!isCafeBranchUnlocked(business, branchId)) return { error: 'locked' };
  if (getCafeBranchById(business, branchId)) return { error: 'owned' };
  return { ...business, branches: [...getCafeOwnedBranches(business), { branchId, menuIds: ['espresso', 'latte', 'pastry'], upgrades: {}, assignedStaffIds: [] }] };
}

export function getAssignedStaff(business, branchId) {
  const branch = getCafeBranchById(business, branchId);
  if (!branch) return [];
  return (branch.assignedStaffIds || []).map((id) => (business.staffMembers || []).find((s) => s.id === id)).filter(Boolean);
}

export function assignCafeStaff(business, branchId, staffId) {
  const branch = getCafeBranchById(business, branchId);
  if (!branch) return business;
  if (!(business.staffMembers || []).some((s) => s.id === staffId)) return business;
  const branches = getCafeOwnedBranches(business).map((b) => {
    if (b.branchId === branchId) {
      return { ...b, assignedStaffIds: [...new Set([...(b.assignedStaffIds || []), staffId])] };
    }
    return { ...b, assignedStaffIds: (b.assignedStaffIds || []).filter((id) => id !== staffId) };
  });
  return { ...business, branches };
}

export function unassignCafeStaff(business, branchId, staffId) {
  const branch = getCafeBranchById(business, branchId);
  if (!branch) return business;
  const branches = getCafeOwnedBranches(business).map((b) =>
    b.branchId === branchId
      ? { ...b, assignedStaffIds: (b.assignedStaffIds || []).filter((id) => id !== staffId) }
      : b
  );
  return { ...business, branches };
}

export function getCafeStaffBranchId(business, staffId) {
  const branch = getCafeOwnedBranches(business).find((b) => (b.assignedStaffIds || []).includes(staffId));
  return branch ? branch.branchId : null;
}

export function canOpenCafeBranch(business, branchId) {
  const branch = getCafeBranchById(business, branchId);
  if (!branch) return { canOpen: false, reason: 'invalid_branch' };
  if (branch.openedAt || branch.openingAt) return { canOpen: false, reason: 'already_open' };
  const assigned = getAssignedStaff(business, branchId);
  if (assigned.length === 0) return { canOpen: false, reason: 'no_staff' };
  const supplies = business.supplies || {};
  const hasSupplies = CAFE_INGREDIENTS.some((ing) => (supplies[ing.id] || 0) > 0);
  if (!hasSupplies) return { canOpen: false, reason: 'no_supplies' };
  return { canOpen: true };
}

export function startCafeBranchOpening(business, branchId) {
  const check = canOpenCafeBranch(business, branchId);
  if (!check.canOpen) return { error: check.reason };
  const isFirstBranchEver = getCafeOwnedBranches(business).every((b) => !b.openedAt);
  const openMs = isFirstBranchEver ? 5000 : Math.random() < 0.3 ? 0 : BRANCH_OPEN_MS_MIN + Math.random() * (BRANCH_OPEN_MS_MAX - BRANCH_OPEN_MS_MIN);
  const branches = getCafeOwnedBranches(business).map((b) =>
    b.branchId === branchId ? { ...b, openingAt: Date.now() + scaleDuration(openMs) } : b
  );
  return { ...business, branches };
}

export const completeCafeOpenings = (business) => ({ ...business, branches: getCafeOwnedBranches(business).map((branch) => branch.openingAt && branch.openingAt <= Date.now() ? { ...branch, openedAt: Date.now(), openingAt: null } : branch) });

export function instantOpenCafeBranch(business, branchId) {
  const branches = getCafeOwnedBranches(business).map((b) =>
    b.branchId === branchId && b.openingAt ? { ...b, openedAt: Date.now(), openingAt: null } : b
  );
  return { ...business, branches };
}

export function buyCafeSupplies(business, ingredientId, quantity) {
  const ingredient = getCafeIngredient(ingredientId);
  if (!ingredient || quantity <= 0) return null;
  const isFirstSupplyEver = (business.pendingSupplies || []).length === 0
    && Object.values(business.supplies || {}).every((v) => !v);
  const deliveryMs = isFirstSupplyEver ? 0 : SUPPLY_DELIVERY_MIN_MS + Math.random() * (SUPPLY_DELIVERY_MAX_MS - SUPPLY_DELIVERY_MIN_MS);
  const delivery = {
    id: `cafe_supply_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ingredientId,
    quantity,
    deliveredAt: Date.now() + scaleDuration(Math.random() < 0.3 ? 0 : deliveryMs),
  };
  return { business: { ...business, pendingSupplies: [...(business.pendingSupplies || []), delivery] }, cost: ingredient.unitCost * quantity };
}

export function getCafeSupplyDeliveryTimeRemaining(delivery) {
  return Math.max(0, delivery.deliveredAt - Date.now());
}

export function getArrivedCafeSupplies(business) {
  const now = Date.now();
  return (business.pendingSupplies || []).filter((d) => d.deliveredAt <= now);
}

export function completeCafeSupplies(business) {
  const arrived = getArrivedCafeSupplies(business);
  if (!arrived.length) return business;
  const pending = (business.pendingSupplies || []).filter((d) => d.deliveredAt > Date.now());
  const supplies = { ...(business.supplies || {}) };
  for (const d of arrived) supplies[d.ingredientId] = (supplies[d.ingredientId] || 0) + d.quantity;
  return { ...business, pendingSupplies: pending, supplies };
}

export function instantCafeSupply(business, deliveryId) {
  const delivery = (business.pendingSupplies || []).find((d) => d.id === deliveryId);
  if (!delivery) return business;
  const updated = { ...business, pendingSupplies: (business.pendingSupplies || []).map((d) => d.id === deliveryId ? { ...d, deliveredAt: Date.now() } : d) };
  return completeCafeSupplies(updated);
}

export const setCafeMenu = (business, branchId, menuIds) => ({ ...business, branches: getCafeOwnedBranches(business).map((branch) => branch.branchId === branchId && !branch.openingAt ? { ...branch, menuIds } : branch) });

export function getCafeSalaryHourly(business) {
  return getCafeStaffMembers(business).reduce((total, member) => total + (member.salary || getCafeStaffType(member.typeId)?.salaryHourly || 0), 0);
}

export function getCafeLevelMultiplier(business) {
  const level = Math.max(1, business.level || 1);
  return Math.pow(1.12, level - 1);
}

export function getCafeSalesHourly(business) {
  const levelMult = getCafeLevelMultiplier(business);
  let total = 0;
  for (const branch of getCafeOwnedBranches(business)) {
    if (branch.openingAt || !branch.openedAt) continue;
    const zone = getCafeBranch(branch.branchId);
    const assignedStaff = (branch.assignedStaffIds || []).map((id) => (business.staffMembers || []).find((s) => s.id === id)).filter(Boolean);
    const assignedCount = assignedStaff.length;
    const optimalStaff = getOptimalStaffForBranch(branch.branchId);
    const capacityFactor = Math.min(1, assignedCount / optimalStaff);
    const managerCount = assignedStaff.filter((s) => s.typeId === 'manager').length;
    const footfallVolumeMult = 1 + zone.footfall * 0.15;
    total += (branch.menuIds || []).reduce((sum, id) => {
      const item = getCafeMenuItem(id);
      return sum + (item ? item.price * item.demand * zone.footfall * capacityFactor * (1 + managerCount * 0.03) : 0);
    }, 0) * footfallVolumeMult;
  }
  return total * levelMult;
}

export function getCafeIngredientCostHourly(business) {
  const levelMult = getCafeLevelMultiplier(business);
  let total = 0;
  for (const branch of getCafeOwnedBranches(business)) {
    if (branch.openingAt || !branch.openedAt) continue;
    const zone = getCafeBranch(branch.branchId);
    const assignedStaff = (branch.assignedStaffIds || []).map((id) => (business.staffMembers || []).find((s) => s.id === id)).filter(Boolean);
    const assignedCount = assignedStaff.length;
    const optimalStaff = getOptimalStaffForBranch(branch.branchId);
    const capacityFactor = Math.min(1, assignedCount / optimalStaff);
    for (const id of branch.menuIds || []) {
      const item = getCafeMenuItem(id);
      if (!item) continue;
      for (const [ingredientId, units] of Object.entries(item.ingredients)) total += item.demand * zone.footfall * capacityFactor * units * (getCafeIngredient(ingredientId)?.unitCost || 0);
    }
  }
  return total * levelMult;
}

export function getCafeBranchNetIncomeHourly(business, branchId) {
  const branch = getCafeBranchById(business, branchId);
  if (!branch || branch.openingAt || !branch.openedAt) return 0;
  const zone = getCafeBranch(branchId);
  if (!zone) return 0;
  const assignedStaff = (branch.assignedStaffIds || []).map((id) => (business.staffMembers || []).find((s) => s.id === id)).filter(Boolean);
  const assignedCount = assignedStaff.length;
  const optimalStaff = getOptimalStaffForBranch(branchId);
  const capacityFactor = Math.min(1, assignedCount / optimalStaff);
  const managerCount = assignedStaff.filter((s) => s.typeId === 'manager').length;
  const footfallVolumeMult = 1 + zone.footfall * 0.15;
  let revenue = 0;
  let ingredientCost = 0;
  for (const id of branch.menuIds || []) {
    const item = getCafeMenuItem(id);
    if (!item) continue;
    revenue += item.price * item.demand * zone.footfall * capacityFactor * (1 + managerCount * 0.03) * footfallVolumeMult;
    for (const [ingredientId, units] of Object.entries(item.ingredients)) {
      ingredientCost += item.demand * zone.footfall * capacityFactor * units * (getCafeIngredient(ingredientId)?.unitCost || 0);
    }
  }
  const payroll = assignedStaff.reduce((sum, s) => sum + (getCafeStaffType(s.typeId)?.salaryHourly || 0), 0);
  return revenue - ingredientCost - payroll - zone.rentHourly;
}

export function getCafeRentHourly(business) {
  return getCafeOwnedBranches(business).filter((branch) => branch.openedAt && !branch.openingAt).reduce((total, branch) => total + (getCafeBranch(branch.branchId)?.rentHourly || 0), 0);
}

export function getCafeHourlyIncome(business) {
  const hydrated = hydrateCafe(business);
  return Math.floor(getCafeSalesHourly(hydrated) - getCafeIngredientCostHourly(hydrated) - getCafeSalaryHourly(hydrated) - getCafeRentHourly(hydrated));
}

export function processCafeBusiness(business, minutesElapsed) {
  let updated = hydrateCafe(business);
  updated = completeCafeHires(updated);
  updated = completeCafeOpenings(updated);
  updated = completeCafeSupplies(updated);
  const hours = minutesElapsed / 60;
  const ingredientNeeds = {};
  for (const branch of getCafeOwnedBranches(updated)) {
    if (branch.openingAt || !branch.openedAt) continue;
    const zone = getCafeBranch(branch.branchId);
    const assignedCount = (branch.assignedStaffIds || []).length;
    const optimalStaff = getOptimalStaffForBranch(branch.branchId);
    const capacityFactor = Math.min(1, assignedCount / optimalStaff);
    for (const id of branch.menuIds || []) {
      const item = getCafeMenuItem(id);
      if (!item) continue;
      for (const [ingredientId, units] of Object.entries(item.ingredients)) ingredientNeeds[ingredientId] = (ingredientNeeds[ingredientId] || 0) + item.demand * zone.footfall * capacityFactor * units * hours;
    }
  }
  const supplyFactor = Object.entries(ingredientNeeds).reduce((factor, [id, needed]) => needed > 0 ? Math.min(factor, (updated.supplies?.[id] || 0) / needed) : factor, 1);
  const grossSales = getCafeSalesHourly(updated) * hours * Math.max(0, Math.min(1, supplyFactor));
  const ingredientCost = getCafeIngredientCostHourly(updated) * hours * Math.max(0, Math.min(1, supplyFactor));
  const payroll = getCafeSalaryHourly(updated) * hours;
  const rent = getCafeRentHourly(updated) * hours;
  const supplies = { ...(updated.supplies || {}) };
  Object.entries(ingredientNeeds).forEach(([id, needed]) => { supplies[id] = Math.max(0, (supplies[id] || 0) - needed * Math.max(0, Math.min(1, supplyFactor))); });
  const income = grossSales - ingredientCost - payroll - rent;
  return { updatedBusiness: { ...updated, supplies, allTimeEarnings: (updated.allTimeEarnings || 0) + income }, income };
}
