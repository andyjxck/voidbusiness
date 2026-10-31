// iCloud key-value save: the 1 MB size guard and clearing on Reset Progress.

const mockStorage = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k) => (k in mockStorage ? mockStorage[k] : null)),
  setItem: jest.fn(async (k, v) => { mockStorage[k] = v; }),
  multiGet: jest.fn(async (keys) => keys.map((k) => [k, k in mockStorage ? mockStorage[k] : null])),
  multiSet: jest.fn(async (pairs) => { pairs.forEach(([k, v]) => { mockStorage[k] = v; }); }),
  multiRemove: jest.fn(async (keys) => { keys.forEach((k) => { delete mockStorage[k]; }); }),
}));

const mockCloud = {};
jest.mock('react-native-cloud-store', () => ({
  kvGetItem: jest.fn(async (k) => (k in mockCloud ? mockCloud[k] : undefined)),
  kvSetItem: jest.fn(async (k, v) => { mockCloud[k] = v; }),
  kvRemoveItem: jest.fn(async (k) => { delete mockCloud[k]; }),
  kvSync: jest.fn(async () => {}),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

function fresh() {
  let mod;
  jest.isolateModules(() => { mod = require('../src/data/cloudsave'); });
  return mod;
}

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  for (const k of Object.keys(mockCloud)) delete mockCloud[k];
  jest.clearAllMocks();
});

describe('utf8ByteLength', () => {
  const { utf8ByteLength } = fresh();
  it('counts UTF-8 bytes, not UTF-16 units', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('€')).toBe(3);
    expect(utf8ByteLength('😀')).toBe(4);
  });
});

describe('saveToCloud size guard', () => {
  it('pushes a normal save', async () => {
    mockStorage.tapGameMoney = '1000';
    mockStorage.tapGameLastUpdate = String(Date.now() - 1000);
    const cs = fresh();
    await expect(cs.saveToCloud()).resolves.toBe(true);
    expect(cs.getCloudSaveStatus()).toBe('ok');
    expect(Object.keys(mockCloud)).toHaveLength(1);
  });

  it('keeps an oversized save local and leaves the cloud copy untouched', async () => {
    mockCloud.voidbusiness_save_v1 = JSON.stringify({ version: 1, savedAt: 1, data: { tapGameMoney: '5', tapGameLastUpdate: '1' } });
    mockStorage.tapGameMoney = '1000';
    mockStorage.tapGameLastUpdate = String(Date.now() - 1000);
    mockStorage.tapGameBusinesses = 'x'.repeat(1000 * 1000);
    const cs = fresh();
    await expect(cs.saveToCloud()).resolves.toBe(false);
    expect(cs.getCloudSaveStatus()).toBe('too_large');
    expect(JSON.parse(mockCloud.voidbusiness_save_v1).data.tapGameMoney).toBe('5');
    expect(mockStorage.tapGameBusinesses).toHaveLength(1000 * 1000);
  });
});

describe('clearCloudSave', () => {
  it('removes the iCloud copy so a reinstall does not restore it', async () => {
    mockCloud.voidbusiness_save_v1 = JSON.stringify({ version: 1, savedAt: Date.now(), data: { tapGameMoney: '999', tapGameLastUpdate: String(Date.now()) } });
    const cs = fresh();
    await expect(cs.clearCloudSave()).resolves.toBe(true);
    expect(mockCloud.voidbusiness_save_v1).toBeUndefined();
    await expect(cs.restoreCloudIfNewer()).resolves.toBe(false);
    expect(mockStorage.tapGameMoney).toBeUndefined();
  });
});
