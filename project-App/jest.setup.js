// jest.setup.js
// Глобальные моки для тестов

// Мок для Chart.js
global.Chart = class MockChart {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.data = config.data;
    this.options = config.options;
  }
  
  update() {}
  destroy() {}
};

// Мок для localStorage
const localStorageMock = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

// Мок для console (чтобы видеть логи в тестах при необходимости)
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};
