module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleFileExtensions: ['js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['*.js', '!node_modules/'],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['./jest.setup.js']
};
