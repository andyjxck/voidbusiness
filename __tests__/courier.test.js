// Unit tests for the courier business economy fixes.
// Verifies: zero-requirement districts always unlock, payroll/costs never
// corrupt allTimeEarnings (the progression gate), and negative saves heal.

jest.mock('../src/data/market', () => ({
  ...jest.requireActual('../src/data/market'),
  formatMoney: (n) => '$' + String(n),
  getCurrencySymbol: () => '$',
}));

const {
  isDistrictUnlocked,
  getDistrictUnlockStatus,
  processCourierFleet,
  DISTRICT_PLOTS,
} = require('../src/data/courier');
const { processBusFleet } = require('../src/data/bus');

const baseCourier = {
  type: 'courier',
  subType: 'courier',
  level: 1,
  allTimeEarnings: 0,
  staffMembers: [{ id: 'd1', salary: 150, hiredAt: 0 }],
  hiringStaff: [],
  fleet: [],
  ownedDistricts: [],
  courierMigrated: true,
};

describe('courier district unlocks', () => {
  it('unlocks zero-requirement districts even with negative allTimeEarnings', () => {
    const biz = { ...baseCourier, allTimeEarnings: -5000 };
    for (const id of ['suburbs', 'harbour', 'park']) {
      expect(isDistrictUnlocked(biz, id)).toBe(true);
      const status = getDistrictUnlockStatus(biz, id);
      expect(status.unlocked).toBe(true);
      expect(status.reasons).toHaveLength(0);
    }
  });

  it('still gates districts that have real requirements', () => {
    const biz = { ...baseCourier, allTimeEarnings: -5000, fleet: [] };
    expect(isDistrictUnlocked(biz, 'oldtown')).toBe(false); // needs 5 vehicles
    const status = getDistrictUnlockStatus(biz, 'downtown');
    expect(status.unlocked).toBe(false);
    expect(status.reasons.length).toBeGreaterThan(0);
  });

  it('does not report an earnings reason for zero-requirement districts', () => {
    const biz = { ...baseCourier, allTimeEarnings: -99999 };
    const status = getDistrictUnlockStatus(biz, 'suburbs');
    expect(status.reasons).toEqual([]);
  });
});

describe('processCourierFleet allTimeEarnings', () => {
  it('heals a negative allTimeEarnings on the first tick', () => {
    const biz = { ...baseCourier, allTimeEarnings: -5000 };
    const { updatedBusiness } = processCourierFleet(biz, 60);
    expect(updatedBusiness.allTimeEarnings).toBeGreaterThanOrEqual(0);
  });

  it('does not reduce allTimeEarnings when staff exist but no fleet', () => {
    const biz = { ...baseCourier, allTimeEarnings: 1000, fleet: [] };
    const { updatedBusiness, income } = processCourierFleet(biz, 60);
    expect(income).toBeLessThan(0); // payroll still drains cash
    expect(updatedBusiness.allTimeEarnings).toBe(1000); // stat untouched
  });

  it('accumulates gross revenue, not net income', () => {
    const biz = {
      ...baseCourier,
      allTimeEarnings: 0,
      ownedDistricts: ['suburbs'],
      fleet: [{
        instanceId: 'c1', typeId: 'scooter', milesRemaining: 2000, maxMiles: 2000,
        assignedDriverId: 'd1', assignedZones: ['suburbs'], activeJobType: 'food',
        deliveredAt: 0, needsMaintenance: false, insured: false,
      }],
    };
    const { updatedBusiness, income } = processCourierFleet(biz, 60);
    expect(income).toBeGreaterThan(0);
    // gross scooter food income in suburbs = 3500 * 1.0 * 1.0 * levelMult(1) = 3500
    expect(updatedBusiness.allTimeEarnings).toBe(3500);
  });
});

describe('processBusFleet allTimeEarnings', () => {
  it('does not reduce allTimeEarnings with no fleet and heals negatives', () => {
    const biz = { type: 'bus', staffMembers: [{ id: 'd1', salary: 150 }], hiringStaff: [], fleet: [], allTimeEarnings: -300 };
    const { updatedBusiness } = processBusFleet(biz, 60);
    expect(updatedBusiness.allTimeEarnings).toBe(0);
  });
});
