import { CITY_MAP } from './bus';
import { t, tf } from './i18n';
import { generatePerson } from './names';
import { isSuspended } from './businesses';
import { scaleDuration } from './store';

// ─── Bank zones (one per city district) ───
export const BANK_ZONES = [
  {
    id: 'suburbs',
    get name() { return t('dn_suburbs'); },
    staffUnlock: 0,
    openCost: 0,
    population: 8000,
    wealth: 0.8,
    get desc() { return t('dd_residential_area_steady_small_deposits'); },
  },
  {
    id: 'harbour',
    get name() { return t('dn_harbour'); },
    staffUnlock: 6,
    openCost: 75000000,
    population: 5000,
    wealth: 1.0,
    get desc() { return t('dd_waterfront_district_merchant_deposits'); },
  },
  {
    id: 'park',
    get name() { return t('dn_park'); },
    staffUnlock: 6,
    openCost: 60000000,
    population: 4000,
    wealth: 1.5,
    get desc() { return t('dd_upscale_residential_wealthy_clients'); },
  },
  {
    id: 'oldtown',
    get name() { return t('dn_old_town'); },
    staffUnlock: 12,
    openCost: 150000000,
    population: 12000,
    wealth: 1.1,
    get desc() { return t('dd_historic_centre_established_businesses'); },
  },
  {
    id: 'industrial',
    get name() { return t('dn_industrial'); },
    staffUnlock: 22,
    openCost: 225000000,
    population: 15000,
    wealth: 0.9,
    get desc() { return t('dd_factory_district_high_volume_low_wealth'); },
  },
  {
    id: 'university',
    get name() { return t('dn_university'); },
    staffUnlock: 34,
    openCost: 300000000,
    population: 10000,
    wealth: 1.2,
    get desc() { return t('dd_student_faculty_area_growing_deposits'); },
  },
  {
    id: 'downtown',
    get name() { return t('dn_downtown'); },
    staffUnlock: 50,
    openCost: 750000000,
    population: 20000,
    wealth: 2.5,
    get desc() { return t('dd_commercial_core_corporate_accounts'); },
  },
];

export function getBankZone(zoneId) {
  return BANK_ZONES.find((z) => z.id === zoneId) || null;
}

export function getUnlockedBankZones(business) {
  const staffCount = typeof business.staff === 'number' ? business.staff : 0;
  return BANK_ZONES.filter((z) => staffCount >= (z.staffUnlock || 0));
}

export function getOwnedBranches(business) {
  return business.branches || [];
}

export function getBranchByZone(business, zoneId) {
  return (business.branches || []).find((b) => b.zoneId === zoneId) || null;
}

// ─── Staff ───
export const STAFF_HIRE_COST = 125000000;
export const STAFF_SALARY_HOURLY = 2500;
export const STAFF_HIRE_MIN_MS = 3000;
export const STAFF_HIRE_MAX_MS = 45 * 60 * 1000;
export const MAX_HIRING_AT_ONCE = 3;

export function getStaffSalaryHourly(business) {
  const members = Array.isArray(business.staffMembers) ? business.staffMembers : [];
  return members.reduce((total, m) => total + (m.salary || STAFF_SALARY_HOURLY), 0);
}

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
    staff: Math.max(0, (typeof business.staff === 'number' ? business.staff : 0) - 1),
    staffMembers: (Array.isArray(business.staffMembers) ? business.staffMembers : []).filter((s) => s.id !== staffId),
  };
}

export function raiseStaff(business, staffId) {
  const members = (Array.isArray(business.staffMembers) ? business.staffMembers : []).map((s) => {
    if (s.id === staffId) return { ...s, salary: Math.round((s.salary || STAFF_SALARY_HOURLY) * 1.15) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function trainStaff(business, staffId) {
  const members = (Array.isArray(business.staffMembers) ? business.staffMembers : []).map((s) => {
    if (s.id === staffId) return { ...s, skill: Math.min(10, (s.skill || 5) + 1) };
    return s;
  });
  return { ...business, staffMembers: members };
}

export function hireStaff(business) {
  const hiring = business.hiringStaff || [];
  if (hiring.length >= MAX_HIRING_AT_ONCE) return { error: 'max_hiring' };
  const now = Date.now();
  const duration = STAFF_HIRE_MIN_MS + Math.random() * (STAFF_HIRE_MAX_MS - STAFF_HIRE_MIN_MS);
  const member = makeStaffMember();
  return {
    ...business,
    hiringStaff: [...hiring, {
      id: `hire_${now}_${Math.random().toString(36).slice(2, 6)}`,
      instanceId: `hire_${now}_${Math.random().toString(36).slice(2, 6)}`,
      hiredAt: now,
      completesAt: now + scaleDuration(duration),
      staffMember: member,
    }],
  };
}

export function completeHiredStaff(business) {
  const hiring = business.hiringStaff || [];
  const completed = hiring.filter((h) => h.completesAt <= Date.now());
  if (completed.length === 0) return business;
  let staffMembers = Array.isArray(business.staffMembers) ? business.staffMembers : [];
  if (staffMembers.length === 0 && (typeof business.staff === 'number' ? business.staff : 0) > 0) {
    staffMembers = Array.from({ length: business.staff }, () => makeStaffMember());
  }
  const newMembers = completed.map((h) => h.staffMember || makeStaffMember());
  return {
    ...business,
    staff: (typeof business.staff === 'number' ? business.staff : 0) + completed.length,
    staffMembers: [...staffMembers, ...newMembers],
    hiringStaff: hiring.filter((h) => h.completesAt > Date.now()),
  };
}

export function instantHireStaff(business, hireId) {
  const hiring = business.hiringStaff || [];
  const hire = hiring.find((h) => h.instanceId === hireId || h.id === hireId);
  if (!hire) return business;
  let staffMembers = Array.isArray(business.staffMembers) ? business.staffMembers : [];
  if (staffMembers.length === 0 && (typeof business.staff === 'number' ? business.staff : 0) > 0) {
    staffMembers = Array.from({ length: business.staff }, () => makeStaffMember());
  }
  return {
    ...business,
    staff: (typeof business.staff === 'number' ? business.staff : 0) + 1,
    staffMembers: [...staffMembers, hire.staffMember || makeStaffMember()],
    hiringStaff: hiring.filter((h) => h.instanceId !== hireId && h.id !== hireId),
  };
}

// ─── Vault upgrades (per branch) ───
export const VAULT_MAX_LEVEL = 10;
export const VAULT_UPGRADE_NAMES = [
  'ut_reinforced_steel',
  'ut_time_lock_system',
  'ut_biometric_scanner',
  'ut_alarm_upgrade',
  'ut_secondary_vault',
  'ut_gold_reserve_room',
  'ut_safe_deposit_boxes',
  'ut_armoured_transport',
  'ut_underground_bunker',
  'ut_fort_knox_protocol',
];

export function getVaultUpgradeName(level) {
  const key = VAULT_UPGRADE_NAMES[level - 1];
  return key ? t(key) : t('ut_vault_upgrade');
}

export function getVaultUpgradeCost(branch, vaultLevel) {
  const zone = getBankZone(branch.zoneId);
  const base = 75000000 * (zone?.wealth || 1);
  return Math.floor(base * Math.pow(1.5, vaultLevel));
}

export function getVaultCapacity(branch, business) {
  const zone = getBankZone(branch.zoneId);
  if (!zone) return 0;
  const vaultLevel = branch.vaultLevel || 1;
  const levelBonus = Math.floor((business.level || 1) / 5) * 0.1;
  const staffBonus = Math.floor((typeof business.staff === 'number' ? business.staff : 0) / 5) * 0.05;
  const baseCap = 42000000 * zone.wealth * vaultLevel;
  return Math.floor(baseCap * (1 + levelBonus + staffBonus));
}

// ─── Deposit & Credit rates ───
export const MIN_DEPOSIT_RATE = 1;
export const MAX_DEPOSIT_RATE = 10;
export const MIN_CREDIT_RATE = 5;
export const MAX_CREDIT_RATE = 25;
export const DEFAULT_DEPOSIT_RATE = 3;
export const DEFAULT_CREDIT_RATE = 12;

export function setDepositRate(business, zoneId, rate) {
  const clamped = Math.max(MIN_DEPOSIT_RATE, Math.min(MAX_DEPOSIT_RATE, rate));
  const branches = (business.branches || []).map((b) =>
    b.zoneId === zoneId ? { ...b, depositRate: clamped } : b
  );
  return { ...business, branches };
}

export function setCreditRate(business, zoneId, rate) {
  const clamped = Math.max(MIN_CREDIT_RATE, Math.min(MAX_CREDIT_RATE, rate));
  const branches = (business.branches || []).map((b) =>
    b.zoneId === zoneId ? { ...b, creditRate: clamped } : b
  );
  return { ...business, branches };
}

// ─── Depositor attraction & income ───

// Higher deposit rate attracts more depositors
function getDepositorAttractiveness(depositRate) {
  // 1% = 0.3x, 10% = 1.5x
  return 0.3 + (depositRate - 1) * (1.2 / 9);
}

// Higher credit rate means fewer borrowers
function getBorrowerAppetite(creditRate) {
  // 5% = 1.5x, 25% = 0.3x
  return 1.5 - (creditRate - 5) * (1.2 / 20);
}

// Staff efficiency: more staff = more depositor onboarding capacity
// 0 staff = 0 efficiency (branches can't operate without staff)
function getStaffEfficiency(business) {
  const staff = typeof business.staff === 'number' ? business.staff : 0;
  if (staff === 0) return 0;
  return staff * 0.05;
}

export function getBranchDepositors(branch, business) {
  const zone = getBankZone(branch.zoneId);
  if (!zone) return 0;
  const depositRate = branch.depositRate || DEFAULT_DEPOSIT_RATE;
  const attract = getDepositorAttractiveness(depositRate);
  const staffEff = getStaffEfficiency(business);
  const levelMult = Math.pow(1.12, Math.max(1, business.level || 1) - 1);
  const base = zone.population * 0.15 * attract * staffEff * levelMult;
  return Math.floor(base);
}

export function getBranchTargetDeposits(branch, business) {
  const zone = getBankZone(branch.zoneId);
  if (!zone) return 0;
  const depositors = getBranchDepositors(branch, business);
  const avgDeposit = 920000 * zone.wealth;
  const totalDeposits = depositors * avgDeposit;
  const capacity = getVaultCapacity(branch, business);
  return Math.min(totalDeposits, capacity);
}

export function getBranchDeposits(branch, business) {
  return branch.currentDeposits || 0;
}

export function getBranchLoanRevenue(branch, business) {
  const deposits = getBranchDeposits(branch, business);
  const creditRate = branch.creditRate || DEFAULT_CREDIT_RATE;
  const borrowerAppetite = getBorrowerAppetite(creditRate);
  // Lend out deposits at credit rate, scaled by borrower appetite
  const loanedOut = deposits * borrowerAppetite;
  return Math.floor(loanedOut * creditRate / 100);
}

export function getBranchDepositCost(branch, business) {
  const deposits = getBranchDeposits(branch, business);
  const depositRate = branch.depositRate || DEFAULT_DEPOSIT_RATE;
  return Math.floor(deposits * depositRate / 100);
}

export function getBankLevelMultiplier(business) {
  return Math.pow(1.12, Math.max(1, business.level || 1) - 1);
}

export function getBranchNetIncome(branch, business) {
  const revenue = getBranchLoanRevenue(branch, business);
  const cost = getBranchDepositCost(branch, business);
  return (revenue - cost) * getBankLevelMultiplier(business);
}

export function getBankHourlyIncome(business) {
  const branches = business.branches || [];
  if (branches.length === 0) {
    return -getStaffSalaryHourly(business);
  }
  let total = 0;
  for (const b of branches) {
    if (!isBranchOpen(b)) continue;
    total += getBranchNetIncome(b, business);
  }
  const salary = getStaffSalaryHourly(business);
  return Math.floor(total - salary);
}

// ─── Branch opening (4 hour timer) ───
export const BRANCH_OPEN_MS_MIN = 3000;
export const BRANCH_OPEN_MS_MAX = 45 * 60 * 1000;

export function getOpeningTimeRemaining(branch) {
  if (!branch || !branch.openingAt) return 0;
  return Math.max(0, branch.openingAt - Date.now());
}

export function isBranchOpen(branch) {
  if (!branch) return false;
  return !branch.openingAt || branch.openingAt <= Date.now();
}

export function getOpeningBranches(business) {
  return (business.branches || []).filter((b) => !isBranchOpen(b));
}

export function completeOpeningBranches(business) {
  return {
    ...business,
    branches: (business.branches || []).map((b) => ({
      ...b,
      openingAt: b.openingAt && b.openingAt <= Date.now() ? null : b.openingAt,
    })),
  };
}

export function openBranch(business, zoneId) {
  const zone = getBankZone(zoneId);
  if (!zone) return { error: 'invalid_zone' };
  const staffCount = typeof business.staff === 'number' ? business.staff : 0;
  if (staffCount < (zone.staffUnlock || 0)) return { error: 'staff_locked' };
  if (getBranchByZone(business, zoneId)) return { error: 'already_exists' };
  const openCost = zone.openCost;
  const branch = {
    zoneId,
    name: tf('branch_name', { v0: zone.name }),
    vaultLevel: 1,
    depositRate: DEFAULT_DEPOSIT_RATE,
    creditRate: DEFAULT_CREDIT_RATE,
    depositors: 0,
    currentDeposits: 0,
    fillMinutes: 360 + Math.random() * 120,
    openingAt: Date.now() + scaleDuration(Math.random() < 0.3 ? 0 : BRANCH_OPEN_MS_MIN + Math.random() * (BRANCH_OPEN_MS_MAX - BRANCH_OPEN_MS_MIN)),
    openedAt: null,
    transactionHistory: [],
  };
  return {
    ...business,
    branches: [...(business.branches || []), branch],
    capitalisation: (business.capitalisation || 0) + openCost,
    cost: openCost,
  };
}

export function instantOpenBranch(business, zoneId) {
  const zone = getBankZone(zoneId);
  if (!zone) return { error: 'invalid_zone' };
  const branches = (business.branches || []).map((b) => {
    if (b.zoneId === zoneId && b.openingAt) {
      return { ...b, openingAt: null, openedAt: Date.now() };
    }
    return b;
  });
  return { ...business, branches };
}

// ─── Vault upgrade (timer-based) ───
export function getVaultUpgradeDurationMs(vaultLevel) {
  const instantChance = vaultLevel < 10 ? 0.05 : 0.01;
  if (Math.random() < instantChance) return 3000;
  const minMs = 3000;
  const maxMs = 45 * 60 * 1000;
  return minMs + Math.random() * (maxMs - minMs);
}

export function getVaultUpgradeTimeRemaining(branch) {
  if (!branch || !branch.vaultUpgradeCompletesAt) return 0;
  return Math.max(0, branch.vaultUpgradeCompletesAt - Date.now());
}

export function isVaultUpgrading(branch) {
  return branch && branch.vaultUpgradeCompletesAt && branch.vaultUpgradeCompletesAt > Date.now();
}

export function completeVaultUpgrades(business) {
  const branches = (business.branches || []).map((b) => {
    if (b.vaultUpgradeCompletesAt && b.vaultUpgradeCompletesAt <= Date.now()) {
      return { ...b, vaultLevel: (b.vaultLevel || 1) + 1, vaultUpgradeCompletesAt: null };
    }
    return b;
  });
  return { ...business, branches };
}

export function instantCompleteVaultUpgrade(business, zoneId) {
  const branches = (business.branches || []).map((b) => {
    if (b.zoneId === zoneId && b.vaultUpgradeCompletesAt) {
      return { ...b, vaultLevel: (b.vaultLevel || 1) + 1, vaultUpgradeCompletesAt: null };
    }
    return b;
  });
  return { ...business, branches };
}

export function upgradeVault(business, zoneId) {
  let cost = 0;
  const branches = (business.branches || []).map((b) => {
    if (b.zoneId !== zoneId) return b;
    if ((b.vaultLevel || 1) >= VAULT_MAX_LEVEL) return b;
    if (b.vaultUpgradeCompletesAt && b.vaultUpgradeCompletesAt > Date.now()) return b;
    cost = getVaultUpgradeCost(b, b.vaultLevel || 1);
    const duration = Math.random() < 0.3 ? 0 : getVaultUpgradeDurationMs(b.vaultLevel || 1);
    return { ...b, vaultUpgradeCompletesAt: Date.now() + scaleDuration(duration) };
  });
  return { ...business, branches, cost };
}

export function processBankBusiness(business, minutesElapsed) {
  const branches = business.branches || [];
  if (branches.length === 0) {
    const salary = getStaffSalaryHourly(business);
    return { updatedBusiness: business, income: -salary * (minutesElapsed / 60) };
  }

  const now = Date.now();
  let totalRevenue = 0;
  let totalDepositCost = 0;
  let newTransactions = 0;

  const updatedBranches = branches.map((b) => {
    if (!isBranchOpen(b)) return b;

    const depositors = getBranchDepositors(b, business);
    const targetDeposits = getBranchTargetDeposits(b, business);
    const fillMinutes = b.fillMinutes || 420;
    const prevDeposits = b.currentDeposits || 0;
    const fillRate = targetDeposits / fillMinutes;
    let currentDeposits;
    if (targetDeposits >= prevDeposits) {
      currentDeposits = Math.min(targetDeposits, prevDeposits + fillRate * minutesElapsed);
    } else {
      currentDeposits = Math.max(targetDeposits, prevDeposits - fillRate * minutesElapsed);
    }
    const deposits = Math.floor(currentDeposits);

    const branchWithDeposits = { ...b, currentDeposits, depositors };
    const revenue = getBranchLoanRevenue(branchWithDeposits, business);
    const depositCost = getBranchDepositCost(branchWithDeposits, business);

    const hourlyRevenue = revenue * (minutesElapsed / 60);
    const hourlyDepositCost = depositCost * (minutesElapsed / 60);

    totalRevenue += hourlyRevenue;
    totalDepositCost += hourlyDepositCost;
    newTransactions++;

    const txHistory = (b.transactionHistory || []).slice(-20);
    if (txHistory.length < 20 || now - (txHistory[txHistory.length - 1]?.timestamp || 0) > 60000) {
      txHistory.push({
        timestamp: now,
        depositors,
        deposits,
        revenue: Math.floor(hourlyRevenue),
        depositCost: Math.floor(hourlyDepositCost),
        net: Math.floor(hourlyRevenue - hourlyDepositCost),
      });
    }

    return {
      ...b,
      currentDeposits,
      depositors,
      openedAt: b.openedAt || now,
      transactionHistory: txHistory,
    };
  });

  const salary = getStaffSalaryHourly(business);
  const netIncome = totalRevenue - totalDepositCost - salary * (minutesElapsed / 60);
  const updatedBusiness = {
    ...business,
    branches: updatedBranches,
    allTimeEarnings: (business.allTimeEarnings || 0) + netIncome,
    completedTransactions: (business.completedTransactions || 0) + newTransactions,
  };
  return { updatedBusiness, income: netIncome };
}

// ─── Get all transaction history across branches ───
export function getAllTransactions(business) {
  const branches = business.branches || [];
  const all = [];
  for (const b of branches) {
    for (const tx of (b.transactionHistory || [])) {
      all.push({ ...tx, zoneId: b.zoneId, zoneName: getBankZone(b.zoneId)?.name || '' });
    }
  }
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
}

// ─── Map helpers ───
export function getPendingForZone(business, zoneId) {
  return (business.pendingDeliveries || []).filter((d) => d.zoneId === zoneId);
}

export function getDistrictCentroid(districtId) {
  const district = CITY_MAP.districts.find((d) => d.id === districtId);
  if (!district || !district.polygon) return { x: 600, y: 450 };
  const points = district.polygon.split(' ').map((p) => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x: cx, y: cy };
}

// ─── Migration for old saved state ───
export function migrateBank(business) {
  const migrated = { ...business };
  if (typeof migrated.staff !== 'number') {
    migrated.staff = 0;
  }
  if (!Array.isArray(migrated.staffMembers)) {
    migrated.staffMembers = [];
  }
  if (!Array.isArray(migrated.hiringStaff)) {
    migrated.hiringStaff = [];
  }
  if (!Array.isArray(migrated.branches)) {
    migrated.branches = [];
  }
  return migrated;
}
