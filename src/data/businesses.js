import { formatMoney } from './market';
import { t } from './i18n';
import { getBusHourlyIncome, processBusFleet } from './bus';
import { getCarHourlyIncome, processCourierFleet } from './courier';
import { getGameDevHourlyIncome, processGameDev } from './gamedev';
import { getConstructionHourlyIncome, processConstruction } from './construction';
import { getDealershipHourlyIncome, processDealership } from './dealership';
import { getClothingHourlyIncome, processClothingBusiness } from './clothing';
import { getBankHourlyIncome, processBankBusiness } from './bank';
import { getMovieStudioHourlyIncome, processMovieStudio, getMovieStudioPendingSales } from './moviestudio';
import { getCafeHourlyIncome, processCafeBusiness } from './cafe';
import { getPurchaseIncomeMultiplier, getTaxRateScale, getSuspensionWindowHours, scaleDuration } from './store';

export const BUSINESS_CATEGORIES = {
  cafe: {
    name: 'Cafe',
    subTypes: {
      local: { name: 'Local Cafe', cost: 5000, baseHourlyIncome: 250, maxLevel: 30, category: 'Local', stockPerHourPerLevel: 12, stockCostPerUnit: 0.5, startingStock: 50, growthRate: 1.12 },
    },
  },
  bus: {
    name: 'Bus Service',
    subTypes: {
      service: { name: 'Void City Bus Service', cost: 25000, baseHourlyIncome: 0, maxLevel: 30, category: 'Transport' },
    },
  },
  courier: {
    name: 'Courier Service',
    subTypes: {
      service: { name: 'Void City Courier', cost: 120000, baseHourlyIncome: 0, maxLevel: 30, category: 'Logistics' },
    },
  },
  clothing: {
    name: 'Clothing Factory',
    subTypes: {
      factory: { name: 'Clothing Factory', cost: 600000, baseHourlyIncome: 0, maxLevel: 30, category: 'Fashion' },
    },
  },
  construction: {
    name: 'Construction Company',
    subTypes: {
      firm: { name: 'Construction Firm', cost: 3000000, baseHourlyIncome: 0, maxLevel: 30, category: 'Construction' },
    },
  },
  dealership: {
    name: 'Vehicle Dealership',
    subTypes: {
      dealer: { name: 'Vehicle Dealership', cost: 15000000, baseHourlyIncome: 0, maxLevel: 30, category: 'Automotive' },
    },
  },
  gamedev: {
    name: 'Game Studio',
    subTypes: {
      indie: { name: 'Indie Studio', cost: 80000000, baseHourlyIncome: 0, maxLevel: 30, category: 'Game Dev' },
    },
  },
  moviestudio: {
    name: 'Movie Studio',
    subTypes: {
      studio: { name: 'Movie Studio', cost: 400000000, baseHourlyIncome: 0, maxLevel: 30, category: 'Entertainment' },
    },
  },
  bank: {
    name: 'Bank',
    subTypes: {
      bank: { name: 'Void City Bank', cost: 2500000000, baseHourlyIncome: 0, maxLevel: 30, category: 'Finance' },
    },
  },
};

export const TAX_RATE = 0.20; // 20% small business tax
export const CAFE_TAX_RATE = TAX_RATE;
export const BUS_TAX_RATE = 0.05; // 5% public transport tax (subsidised)
export const COURIER_TAX_RATE = 0.15; // 15% logistics tax
export const GAMEDEV_TAX_RATE = 0.25; // 25% entertainment tax
export const CONSTRUCTION_TAX_RATE = 0.12; // 12% construction tax (infrastructure)
export const DEALERSHIP_TAX_RATE = 0.18; // 18% dealership tax
export const CLOTHING_TAX_RATE = 0.22; // 22% retail tax
export const BANK_TAX_RATE = 0.28; // 28% banking tax
export const MOVIESTUDIO_TAX_RATE = 0.25; // 25% entertainment tax

export function getBusinessTaxRate(business) {
  let rate;
  switch (business.type) {
    case 'bus': rate = BUS_TAX_RATE; break;
    case 'courier': rate = COURIER_TAX_RATE; break;
    case 'gamedev': rate = GAMEDEV_TAX_RATE; break;
    case 'construction': rate = CONSTRUCTION_TAX_RATE; break;
    case 'dealership': rate = DEALERSHIP_TAX_RATE; break;
    case 'clothing': rate = CLOTHING_TAX_RATE; break;
    case 'bank': rate = BANK_TAX_RATE; break;
    case 'moviestudio': rate = MOVIESTUDIO_TAX_RATE; break;
    case 'cafe': rate = CAFE_TAX_RATE; break;
    default: rate = TAX_RATE;
  }
  return rate * getTaxRateScale();
}

const UPGRADE_TITLES = [
  'ut_artisan_refurb', 'ut_signature_roast', 'ut_grand_seating', 'ut_luxe_terrace', 'ut_golden_espresso',
  'ut_premium_lounge', 'ut_urban_roastery', 'ut_rooftop_menu', 'ut_sustainable_sourcing', 'ut_digital_ordering',
  'ut_global_branding', 'ut_heritage_blend', 'ut_boutique_patisserie', 'ut_exquisite_partnership', 'ut_metropolitan_delivery',
  'ut_elegant_ambience', 'ut_iconic_franchise', 'ut_organic_merchandise', 'ut_coastal_tasting', 'ut_vibrant_acquisition',
];

const BUS_UPGRADE_TITLES = [
  'ut_fleet_expansion', 'ut_route_optimization', 'ut_premium_branding', 'ut_eco_fleet', 'ut_smart_dispatch',
  'ut_express_lanes', 'ut_luxury_interiors', 'ut_night_service', 'ut_tourist_packages', 'ut_corporate_contracts',
  'ut_electric_charging', 'ut_real_time_tracking', 'ut_vip_service', 'ut_double_decker_fleet', 'ut_citywide_coverage',
  'ut_suburban_expansion', 'ut_airport_routes', 'ut_cross_city_express', 'ut_mega_hub', 'ut_flagship_terminal',
  'ut_autonomous_pilot', 'ut_green_initiative', 'ut_global_partnership', 'ut_premium_fleet', 'ut_ultimate_network',
  'ut_metro_domination', 'ut_inter_city_service', 'ut_gold_standard', 'ut_apex_operations', 'ut_transit_empire',
];

const COURIER_UPGRADE_TITLES = [
  'ut_local_contracts', 'ut_app_launch', 'ut_express_lane', 'ut_bulk_hiring', 'ut_zone_expansion',
  'ut_premium_branding', 'ut_cold_chain', 'ut_real_time_tracking', 'ut_corporate_accounts', 'ut_fleet_upgrade',
  'ut_night_shifts', 'ut_drone_pilot', 'ut_same_day_guarantee', 'ut_cross_city_network', 'ut_luxury_fleet',
  'ut_ai_dispatch', 'ut_suburban_coverage', 'ut_warehouse_hub', 'ut_priority_service', 'ut_global_logistics',
  'ut_autonomous_fleet', 'ut_green_delivery', 'ut_mega_depot', 'ut_vip_clients', 'ut_metro_domination',
  'ut_inter_city_express', 'ut_premium_network', 'ut_gold_standard', 'ut_apex_operations', 'ut_delivery_empire',
];

const GAMEDEV_UPGRADE_TITLES = [
  'ut_better_tools', 'ut_team_training', 'ut_indie_showcase', 'ut_engine_upgrade', 'ut_office_move',
  'ut_marketing_push', 'ut_qa_process', 'ut_motion_capture', 'ut_sound_studio', 'ut_publishing_deals',
  'ut_sequel_strategy', 'ut_merch_line', 'ut_convention_booth', 'ut_cloud_infrastructure', 'ut_vr_support',
  'ut_esports_entry', 'ut_mobile_division', 'ut_award_campaign', 'ut_talent_scout', 'ut_franchise_deal',
  'ut_hollywood_tie_in', 'ut_global_launch', 'ut_studio_acquisition', 'ut_industry_legend', 'ut_game_empire',
  'ut_next_gen_engine', 'ut_ai_procedural', 'ut_metaverse_ready', 'ut_hall_of_fame', 'ut_ultimate_studio',
];

const DEALERSHIP_UPGRADE_TITLES = [
  'ut_better_signage', 'ut_showroom_lighting', 'ut_sales_training', 'ut_online_listings', 'ut_bigger_lot',
  'ut_customer_lounge', 'ut_financing_options', 'ut_trade_in_program', 'ut_detail_bay', 'ut_delivery_service',
  'ut_fleet_discounts', 'ut_brand_partnership', 'ut_vip_showroom', 'ut_virtual_tours', 'ut_premium_display',
  'ut_marketing_campaign', 'ut_awards_display', 'ut_celebrity_endorsement', 'ut_mega_showroom', 'ut_city_expansion',
  'ut_regional_chain', 'ut_national_brand', 'ut_luxury_wing', 'ut_ev_charging_hub', 'ut_auto_empire',
  'ut_global_import', 'ut_factory_direct', 'ut_exclusive_deals', 'ut_premier_dealer', 'ut_automotive_kingdom',
];

const CLOTHING_UPGRADE_TITLES = [
  'ut_better_display', 'ut_storefront_lighting', 'ut_staff_training', 'ut_online_shop', 'ut_bigger_warehouse',
  'ut_vip_fitting_room', 'ut_brand_collab', 'ut_loyalty_program', 'ut_quality_control', 'ut_same_day_delivery',
  'ut_bulk_sourcing', 'ut_designer_partnership', 'ut_premium_packaging', 'ut_virtual_try_on', 'ut_seasonal_collection',
  'ut_marketing_campaign', 'ut_pop_up_stores', 'ut_celebrity_endorsement', 'ut_flagship_store', 'ut_city_expansion',
  'ut_regional_chain', 'ut_national_brand', 'ut_luxury_line', 'ut_eco_fashion', 'ut_fashion_empire',
  'ut_global_sourcing', 'ut_factory_direct', 'ut_exclusive_deals', 'ut_premier_brand', 'ut_fashion_kingdom',
];

const BANK_UPGRADE_TITLES = [
  'ut_better_training', 'ut_compliance_program', 'ut_risk_management', 'ut_quality_service', 'ut_customer_relations',
  'ut_banking_license', 'ut_federal_charter', 'ut_insurance_license', 'ut_investment_license', 'ut_international_license',
  'ut_regional_expansion', 'ut_national_expansion', 'ut_marketing_campaign', 'ut_brand_trust', 'ut_premium_service',
  'ut_digital_infrastructure', 'ut_mobile_platform', 'ut_ai_integration', 'ut_global_network', 'ut_financial_empire',
  'ut_sovereign_wealth', 'ut_global_custody', 'ut_private_equity', 'ut_mega_fund', 'ut_banking_dynasty',
  'ut_central_bank_ties', 'ut_void_monetary_seat', 'ut_reserve_status', 'ut_financial_dynasty', 'ut_eternal_bank',
];

const MOVIESTUDIO_UPGRADE_TITLES = [
  'ut_better_cameras', 'ut_sound_stage', 'ut_lighting_rig', 'ut_wardrobe_dept', 'ut_props_warehouse',
  'ut_stunt_team', 'ut_vfx_studio', 'ut_editing_suite', 'ut_color_grading', 'ut_sound_mixing',
  'ut_script_department', 'ut_talent_agency', 'ut_distribution_deal', 'ut_film_festival', 'ut_award_campaign',
  'ut_international_rights', 'ut_streaming_deal', 'ut_premiere_event', 'ut_celebrity_cast', 'ut_blockbuster_budget',
  'ut_franchise_launch', 'ut_global_release', 'ut_studio_tour', 'ut_theme_park', 'ut_movie_empire',
  'ut_streaming_network', 'ut_award_sweep', 'ut_hollywood_legend', 'ut_mega_franchise', 'ut_cinema_dynasty',
];

const CONSTRUCTION_UPGRADE_TITLES = [
  'ut_bigger_yard', 'ut_tool_upgrade', 'ut_extra_crew', 'ut_concrete_mixer', 'ut_crane_rental',
  'ut_steel_supplier', 'ut_warehouse_expansion', 'ut_forklift_fleet', 'ut_safety_training', 'ut_blueprint_software',
  'ut_prefabrication', 'ut_welding_gear', 'ut_scaffolding_system', 'ut_survey_drone', 'ut_piling_rig',
  'ut_asphalt_plant', 'ut_bulk_discount', 'ut_logistics_hub', 'ut_tower_crane', 'ut_site_security',
  'ut_3d_printing', 'ut_modular_construction', 'ut_green_building', 'ut_mega_warehouse', 'ut_city_contracts',
  'ut_harbor_expansion', 'ut_tunnel_boring', 'ut_bridge_division', 'ut_mega_projects', 'ut_construction_empire',
];

export function getUpgradeName(business) {
  const sub = getSubType(business.type, business.subType);
  if (!sub || business.level >= sub.maxLevel) return 'Fully upgraded';
  const titles = business.type === 'bus'
    ? BUS_UPGRADE_TITLES
    : business.type === 'courier'
    ? COURIER_UPGRADE_TITLES
    : business.type === 'gamedev'
    ? GAMEDEV_UPGRADE_TITLES
    : business.type === 'construction'
    ? CONSTRUCTION_UPGRADE_TITLES
    : business.type === 'dealership'
    ? DEALERSHIP_UPGRADE_TITLES
    : business.type === 'clothing'
    ? CLOTHING_UPGRADE_TITLES
    : business.type === 'bank'
    ? BANK_UPGRADE_TITLES
    : business.type === 'moviestudio'
    ? MOVIESTUDIO_UPGRADE_TITLES
    : UPGRADE_TITLES;
  const title = titles[(business.level - 1) % titles.length];
  const phase = Math.floor((business.level - 1) / titles.length) + 1;
  return `${t(title)} · ${t('label_phase')} ${phase}`;
}

export function getSubType(type, subTypeKey) {
  return BUSINESS_CATEGORIES[type]?.subTypes?.[subTypeKey];
}

export function safeLevel(business) {
  const l = Number(business && business.level);
  return Number.isFinite(l) && l >= 1 ? Math.floor(l) : 1;
}

// Lump-sum payouts (vehicle sales, construction jobs) are not rate-based, so
// the temporary 10x ad boost does not apply to them; permanent/VIP does.
const LUMP_SUM_TYPES = ['dealership', 'construction'];

export function getUpgradeCost(business) {
  const sub = getSubType(business.type, business.subType);
  if (!sub) return Infinity;
  const level = safeLevel(business);
  const base = sub.cost * 0.1;
  return Math.floor(base * Math.pow(1.15, level));
}

export function getGlobalBoostMultiplier(boostExpiresAt) {
  const boost = boostExpiresAt && boostExpiresAt > Date.now() ? 10 : 1;
  return boost * getPurchaseIncomeMultiplier();
}

export function getMaxHourlyIncome(business, boostExpiresAt) {
  const sub = getSubType(business.type, business.subType);
  if (!sub || isSuspended(business)) return 0;
  if (business.type === 'cafe') return getCafeHourlyIncome(business);
  if (business.type === 'bus') return getBusHourlyIncome(business);
  if (business.type === 'courier') return getCarHourlyIncome(business);
  if (business.type === 'gamedev') return getGameDevHourlyIncome(business);
  if (business.type === 'construction') return getConstructionHourlyIncome(business);
  if (business.type === 'moviestudio') return getMovieStudioHourlyIncome(business);
  if (business.type === 'dealership') return getDealershipHourlyIncome(business);
  if (business.type === 'clothing') return getClothingHourlyIncome(business);
  if (business.type === 'bank') return getBankHourlyIncome(business);
  const base = sub.baseHourlyIncome;
  const level = safeLevel(business);
  const growthRate = sub.growthRate || 1.15;
  const income = Math.floor(base * Math.pow(growthRate, level - 1));
  return income * getGlobalBoostMultiplier(boostExpiresAt);
}

export function getHourlyStockUsage(business) {
  const sub = getSubType(business.type, business.subType);
  if (!sub) return 0;
  return (sub.stockPerHourPerLevel || 0) * safeLevel(business);
}

// Income before suspension/boost; never consults tax state (no recursion).
function getRawHourlyIncome(business) {
  const sub = getSubType(business.type, business.subType);
  if (!sub) return 0;
  switch (business.type) {
    case 'cafe': return getCafeHourlyIncome(business);
    case 'bus': return getBusHourlyIncome(business);
    case 'courier': return getCarHourlyIncome(business);
    case 'gamedev': return getGameDevHourlyIncome(business);
    case 'construction': return getConstructionHourlyIncome(business);
    case 'dealership': return getDealershipHourlyIncome(business);
    case 'clothing': return getClothingHourlyIncome(business);
    case 'bank': return getBankHourlyIncome(business);
    case 'moviestudio': return getMovieStudioHourlyIncome(business);
    default:
      return Math.floor(sub.baseHourlyIncome * Math.pow(sub.growthRate || 1.15, safeLevel(business) - 1));
  }
}

export function getHourlyIncome(business, boostExpiresAt) {
  if (business.type === 'cafe') return getCafeHourlyIncome(business) * getGlobalBoostMultiplier(boostExpiresAt);
  if (business.type === 'bus') return getBusHourlyIncome(business) * getGlobalBoostMultiplier(boostExpiresAt);
  if (business.type === 'courier') return getCarHourlyIncome(business) * getGlobalBoostMultiplier(boostExpiresAt);
  if (business.type === 'gamedev') return getGameDevHourlyIncome(business) * getGlobalBoostMultiplier(boostExpiresAt);
  if (business.type === 'construction') return getConstructionHourlyIncome(business) * getGlobalBoostMultiplier(boostExpiresAt);
  if (business.type === 'dealership') return getDealershipHourlyIncome(business) * getGlobalBoostMultiplier(boostExpiresAt);
  if (business.type === 'clothing') return getClothingHourlyIncome(business) * getGlobalBoostMultiplier(boostExpiresAt);
  if (business.type === 'bank') return getBankHourlyIncome(business) * getGlobalBoostMultiplier(boostExpiresAt);
  if (business.type === 'moviestudio') return getMovieStudioHourlyIncome(business) * getGlobalBoostMultiplier(boostExpiresAt);
  const max = getMaxHourlyIncome(business, boostExpiresAt);
  const usage = getHourlyStockUsage(business);
  if (usage <= 0) return max;
  const stock = business.stock || 0;
  if (stock <= 0) return 0;
  const factor = Math.min(1, stock / usage);
  return Math.floor(max * factor);
}

export function getStockCost(business, quantity) {
  const sub = getSubType(business.type, business.subType);
  if (!sub) return Infinity;
  return Math.ceil(quantity * (sub.stockCostPerUnit || 0));
}

export function processBusinesses(ownedBusinesses, minutesElapsed, boostExpiresAt) {
  const { updatedBusinesses: afterUpgrades } = completePendingUpgrades(ownedBusinesses);
  const businesses = afterUpgrades;
  let totalIncome = 0;
  const now = Date.now();
  const safeMinutes = Number.isFinite(minutesElapsed) && minutesElapsed > 0 ? minutesElapsed : 0;
  const lastUpdate = now - safeMinutes * 60 * 1000;
  const processors = {
    cafe: processCafeBusiness,
    bus: processBusFleet,
    courier: processCourierFleet,
    gamedev: processGameDev,
    construction: processConstruction,
    dealership: processDealership,
    clothing: processClothingBusiness,
    bank: processBankBusiness,
    moviestudio: processMovieStudio,
  };
  const updated = businesses.map((business) => {
    const suspensionAt = getSuspensionTimestamp(business);
    const windowStart = Math.max(lastUpdate, business.startedAt || 0);
    const activeMs = Math.max(0, Math.min(now, suspensionAt) - windowStart);
    const activeMinutes = activeMs / 60000;
    const processor = processors[business.type];
    let updatedBusiness;
    let income;
    if (processor) {
      ({ updatedBusiness, income } = processor(business, activeMinutes));
    } else {
      const maxIncome = getMaxHourlyIncome(business, boostExpiresAt);
      const usage = getHourlyStockUsage(business);
      const hoursFraction = activeMinutes / 60;
      const needed = usage * hoursFraction;
      const stock = business.stock || 0;
      const use = Math.min(stock, needed);
      income = needed > 0 ? maxIncome * hoursFraction * (use / needed) : maxIncome * hoursFraction;
      updatedBusiness = {
        ...business,
        stock: Math.max(0, stock - use),
        allTimeEarnings: (business.allTimeEarnings || 0) + income,
      };
    }
    if (!Number.isFinite(income)) income = 0;
    const multiplier = processor
      ? (LUMP_SUM_TYPES.includes(business.type) ? getPurchaseIncomeMultiplier() : getGlobalBoostMultiplier(boostExpiresAt))
      : 1;
    totalIncome += income * multiplier;
    // Tax accrues on what the business actually earned, so parking staff or
    // running dry never erases a bill. Dealerships are taxed per sale already.
    if (business.type !== 'dealership' && income > 0) {
      const accrued = (Number.isFinite(updatedBusiness.taxAccrued) ? updatedBusiness.taxAccrued : 0)
        + income * getBusinessTaxRate(business);
      updatedBusiness = { ...updatedBusiness, taxAccrued: accrued };
    }
    return updatedBusiness;
  });
  return { updatedBusinesses: updated, totalIncome: Number.isFinite(totalIncome) ? totalIncome : 0 };
}

export function buyStock(business, quantity) {
  const sub = getSubType(business.type, business.subType);
  if (!sub || quantity <= 0) return null;
  return {
    ...business,
    stock: (business.stock || 0) + quantity,
  };
}

function hoursSinceTaxPaid(business) {
  const base = business.taxLastPaidAt || business.startedAt || Date.now();
  return Math.max(0, (Date.now() - base) / (1000 * 60 * 60));
}

// Legacy projection used only to seed taxAccrued on saves that predate it.
export function legacyProjectedTax(business) {
  const sub = getSubType(business.type, business.subType);
  if (!sub) return 0;
  const net = Math.max(0, getRawHourlyIncome(business));
  return Math.max(0, Math.floor(net * getBusinessTaxRate(business) * hoursSinceTaxPaid(business)));
}

export function getTaxOwed(business) {
  const sub = getSubType(business.type, business.subType);
  if (!sub) return 0;
  const accrued = Number(business.taxAccrued);
  return Number.isFinite(accrued) && accrued > 0 ? Math.floor(accrued) : 0;
}

export function isSuspended(business) {
  if (getTaxOwed(business) <= 0) return false;
  return hoursSinceTaxPaid(business) >= getSuspensionWindowHours();
}

export function getHoursUntilSuspension(business) {
  return Math.max(0, getSuspensionWindowHours() - hoursSinceTaxPaid(business));
}

export function getDailyTax(business) {
  const sub = getSubType(business.type, business.subType);
  if (!sub) return 0;
  const net = Math.max(0, getHourlyIncome(business));
  return Math.floor(net * getBusinessTaxRate(business) * 24);
}

export function getSuspensionTimestamp(business) {
  return (business.taxLastPaidAt || business.startedAt || Date.now()) + getSuspensionWindowHours() * 60 * 60 * 1000;
}

export function getSellPrice(business) {
  const sub = getSubType(business.type, business.subType);
  if (!sub) return 0;
  let upgradeTotal = 0;
  for (let l = 1; l < safeLevel(business); l++) {
    const tempBiz = { ...business, level: l };
    upgradeTotal += getUpgradeCost(tempBiz);
  }
  if (business.upgradeCompletesAt) upgradeTotal += getUpgradeCost(business);
  const earningsValue = 0;
  const taxPenalty = getTaxOwed(business);
  const fleetValue = (business.type === 'bus' || business.type === 'courier')
    ? (business.fleet || []).reduce((sum, v) => sum + (v.cost || 0), 0)
    : business.type === 'gamedev'
    ? (business.games || []).reduce((sum, g) => sum + (g.income || 0), 0) * 0.5
    : business.type === 'construction'
    ? (business.jobs || []).reduce((sum, j) => sum + (j.payout || 0), 0) * 0.3
    : business.type === 'dealership'
    ? (business.dealerships || []).reduce((sum, dp) => sum + (dp.inventory || []).reduce((s, v) => s + (v.wholesale || 0), 0), 0)
    : business.type === 'clothing'
    ? (business.branches || []).reduce((sum, b) => sum + (b.assignedStaffIds || []).length * 5000, 0)
    : business.type === 'bank'
    ? (business.branches || []).reduce((sum, b) => sum + (b.currentDeposits || 0) * 0.1, 0)
    : business.type === 'moviestudio'
    ? (business.movies || []).reduce((sum, m) => sum + (m.income || 0), 0) * 0.5
    : 0;
  return Math.max(0, Math.floor(sub.cost + upgradeTotal + earningsValue + fleetValue - taxPenalty));
}

export function startBusiness(type, subTypeKey) {
  const sub = getSubType(type, subTypeKey);
  if (!sub) return null;
  const now = Date.now();
  const base = {
    id: `${type}_${subTypeKey}_${now}`,
    type,
    subType: subTypeKey,
    name: sub.name,
    level: 1,
    allTimeEarnings: 0,
    capitalisation: sub.cost,
    stock: sub.startingStock || 0,
    taxLastPaidAt: now,
    startedAt: now,
  };
  if (type === 'cafe') {
    return { ...base, cafeVersion: 2, branches: [{ branchId: 'suburbs', menuIds: ['espresso', 'latte', 'pastry'], upgrades: {}, assignedStaffIds: [] }], staffMembers: [], hiringStaff: [], supplies: { beans: 0, milk: 0, pastry: 0, produce: 0 }, pendingSupplies: [], tutorialStep: 0 };
  }
  if (type === 'bus') {
    return { ...base, fleet: [], selectedRoute: 'towncentre' };
  }
  if (type === 'courier') {
    return { ...base, fleet: [], staff: 3, hiringStaff: [], activeJobType: 'food' };
  }
  if (type === 'gamedev') {
    return { ...base, games: [], contracts: [], availableContracts: [], staff: 2, hiringStaff: [], contractsRefreshedAt: now };
  }
  if (type === 'construction') {
    return { ...base, jobs: [], resources: {}, pendingResources: {}, deliveries: [], availableJobs: [], jobsRefreshedAt: now, selectedZones: [], staff: 2, hiringStaff: [] };
  }
  if (type === 'dealership') {
    return { ...base, dealerships: [], pendingDeliveries: [], staff: 0, hiringStaff: [], busLicense: false, completedSales: 0 };
  }
  if (type === 'clothing') {
    return { ...base, clothingVersion: 2, branches: [{ branchId: 'suburbs', menuIds: ['tshirt', 'jeans', 'sneakers'], upgrades: {}, assignedStaffIds: [] }], staffMembers: [], hiringStaff: [], supplies: { basics: 0, denim: 0, premium: 0, accessories: 0 }, pendingSupplies: [] };
  }
  if (type === 'bank') {
    return { ...base, branches: [], staff: 0, staffMembers: [], hiringStaff: [], completedTransactions: 0 };
  }
  if (type === 'moviestudio') {
    return { ...base, movies: [], staff: 2, staffMembers: [], hiringStaff: [], sets: [] };
  }
  return base;
}

export function getUpgradeDuration(level) {
  const minMs = 3000;
  const maxMs = 45 * 60 * 1000;
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

export function upgradeBusiness(business) {
  const cost = getUpgradeCost(business);
  const sub = getSubType(business.type, business.subType);
  if (!sub || business.level >= sub.maxLevel) return null;
  if (business.upgradeCompletesAt && business.upgradeCompletesAt > Date.now()) return null;
  const duration = scaleDuration(Math.random() < 0.3 ? 0 : getUpgradeDuration(business.level));
  try { require('./stats').recordBusinessUpgraded(); } catch (e) { /* stats best-effort */ }
  return {
    ...business,
    upgradeCompletesAt: Date.now() + duration,
    upgradeDuration: Math.max(1, duration),
  };
}

export function completePendingUpgrades(businesses) {
  const now = Date.now();
  let anyChanged = false;
  const updated = businesses.map((business) => {
    if (business.upgradeCompletesAt && business.upgradeCompletesAt <= now) {
      const cost = getUpgradeCost(business);
      anyChanged = true;
      const { upgradeCompletesAt, upgradeDuration, ...rest } = business;
      return {
        ...rest,
        level: business.level + 1,
        capitalisation: (business.capitalisation || 0) + cost,
      };
    }
    return business;
  });
  return { updatedBusinesses: updated, anyChanged };
}

export function completeUpgradeNow(business) {
  if (!business.upgradeCompletesAt) return business;
  const cost = getUpgradeCost(business);
  const { upgradeCompletesAt, upgradeDuration, ...rest } = business;
  return {
    ...rest,
    level: business.level + 1,
    capitalisation: (business.capitalisation || 0) + cost,
  };
}

export function getUpgradeProgress(business) {
  if (!business.upgradeCompletesAt) return null;
  const now = Date.now();
  const duration = Math.max(1, business.upgradeDuration || getUpgradeDuration(business.level));
  const remaining = Math.max(0, business.upgradeCompletesAt - now);
  const elapsed = duration - remaining;
  const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100)) || 0;
  return { remaining, pct, duration };
}

export function payTax(business) {
  return {
    ...business,
    taxAccrued: 0,
    taxLastPaidAt: Date.now(),
  };
}

export { formatMoney };
