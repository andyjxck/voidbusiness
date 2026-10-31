// Rewarded ads: no preload for VIPs, and the waiting state that drives the
// loading overlay.

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  multiGet: jest.fn(async (keys) => keys.map((k) => [k, null])),
  multiSet: jest.fn(async () => {}),
}));

const mockAds = { created: 0, listeners: {}, initialize: jest.fn(async () => true) };
jest.mock('react-native-google-mobile-ads', () => {
  const RewardedAd = {
    createForAdRequest: jest.fn(() => {
      mockAds.created += 1;
      const ad = {
        listeners: {},
        addAdEventListener: (type, cb) => { ad.listeners[type] = cb; return () => {}; },
        load: jest.fn(),
        show: jest.fn(),
      };
      mockAds.lastAd = ad;
      return ad;
    }),
  };
  return {
    __esModule: true,
    default: () => ({ initialize: mockAds.initialize }),
    RewardedAd,
    RewardedInterstitialAd: RewardedAd,
    RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'earned' },
    AdEventType: { ERROR: 'error', CLOSED: 'closed' },
    TestIds: { REWARDED: 'test', REWARDED_INTERSTITIAL: 'test' },
  };
});

let mockVip = false;
jest.mock('../src/data/store', () => ({ isVip: () => mockVip }));
jest.mock('../src/data/stats', () => ({ recordAdWatched: jest.fn() }));

// Fake timers so the 10s wait, 30s retry and 5-min show watchdog never keep
// Jest alive; setImmediate stays real for flushing promises.
const flush = () => new Promise((r) => setImmediate(r));

function freshAds() {
  let ads;
  jest.isolateModules(() => { ads = require('../src/data/ads'); });
  return ads;
}

beforeEach(() => {
  mockAds.created = 0;
  mockAds.lastAd = null;
  mockVip = false;
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('rewarded ad preload', () => {
  it('starts the SDK but requests no ad for a VIP', async () => {
    mockVip = true;
    const ads = freshAds();
    ads.initAds();
    await flush();
    expect(mockAds.initialize).toHaveBeenCalled();
    expect(mockAds.created).toBe(0);
    const onReward = jest.fn();
    ads.showRewardedAd(onReward);
    expect(onReward).toHaveBeenCalledTimes(1);
    expect(mockAds.created).toBe(0);
  });

  it('preloads one ad at launch for everyone else', async () => {
    const ads = freshAds();
    ads.initAds();
    await flush();
    expect(mockAds.created).toBe(1);
  });
});

describe('waiting for an ad', () => {
  it('reports waiting until the ad loads, then shows it', async () => {
    const ads = freshAds();
    ads.initAds();
    await flush();
    const states = [];
    ads.subscribeAdWaiting((w) => states.push(w));
    ads.showRewardedAd(jest.fn());
    expect(ads.isWaitingForAd()).toBe(true);
    mockAds.lastAd.listeners.loaded();
    expect(ads.isWaitingForAd()).toBe(false);
    expect(mockAds.lastAd.show).toHaveBeenCalled();
    expect(states).toEqual([true, false]);
  });

  it('cancel drops the request without a reward', async () => {
    const ads = freshAds();
    ads.initAds();
    await flush();
    const onReward = jest.fn();
    ads.showRewardedAd(onReward);
    ads.cancelPendingAd();
    expect(ads.isWaitingForAd()).toBe(false);
    mockAds.lastAd.listeners.loaded();
    expect(mockAds.lastAd.show).not.toHaveBeenCalled();
    expect(onReward).not.toHaveBeenCalled();
  });
});
