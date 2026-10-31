module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__tests__/__mocks__/fileMock.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/', '__mocks__'],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
