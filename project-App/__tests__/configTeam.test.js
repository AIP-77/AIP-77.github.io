// __tests__/configTeam.test.js
// Тесты для ConfigLoader

const { ConfigLoader } = require('../configTeam.js');

describe('ConfigLoader', () => {
  let configLoader;

  beforeEach(() => {
    // Очищаем глобальный инстанс перед каждым тестом
    global.window = undefined;
    configLoader = new ConfigLoader();
  });

  describe('constructor', () => {
    test('должен создавать экземпляр с URL по умолчанию', () => {
      expect(configLoader.configUrl).toBe('config.json');
      expect(configLoader.config).toBeNull();
      expect(configLoader.data).toBeNull();
    });

    test('должен принимать кастомный URL конфига', () => {
      const customLoader = new ConfigLoader('custom-config.json');
      expect(customLoader.configUrl).toBe('custom-config.json');
    });
  });

  describe('getDefaultConfig', () => {
    test('должен возвращать конфиг с chartNorms', () => {
      const defaultConfig = configLoader.getDefaultConfig();
      
      expect(defaultConfig.chartNorms).toBeDefined();
      expect(defaultConfig.chartNorms.assembly).toBeDefined();
      expect(defaultConfig.chartNorms.assembly.norm).toBe(100);
      expect(defaultConfig.chartNorms.assembly.max).toBe(3);
      expect(defaultConfig.chartNorms.assembly.name).toBe('Сборка Шин');
    });

    test('должен содержать все типы графиков', () => {
      const defaultConfig = configLoader.getDefaultConfig();
      const expectedCharts = ['assembly', 'assembly_rim', 'loading', 'stickering', 'palletizing'];
      
      expectedCharts.forEach(chart => {
        expect(defaultConfig.chartNorms[chart]).toBeDefined();
      });
    });

    test('должен возвращать конфиг с командами смен', () => {
      const defaultConfig = configLoader.getDefaultConfig();
      expect(defaultConfig.shifts.teams).toEqual(['A', 'B', 'C']);
    });
  });

  describe('getEmptyData', () => {
    test('должен возвращать структуру с 24 часами', () => {
      const emptyData = configLoader.getEmptyData();
      
      expect(emptyData.date).toBeDefined();
      expect(emptyData.hours).toBeDefined();
      expect(emptyData.hours).toHaveLength(24);
    });

    test('должен генерировать часы от 0 до 23', () => {
      const emptyData = configLoader.getEmptyData();
      
      emptyData.hours.forEach((hourData, index) => {
        expect(hourData.hour).toBe(index);
      });
    });

    test('должен содержать нулевые значения для всех метрик', () => {
      const emptyData = configLoader.getEmptyData();
      
      emptyData.hours.forEach(hourData => {
        expect(hourData.assembly).toBe(0);
        expect(hourData.assembly_rim).toBe(0);
        expect(hourData.loading).toBe(0);
        expect(hourData.stickering).toBe(0);
        expect(hourData.palletizing).toBe(0);
      });
    });
  });

  describe('getShiftForDate', () => {
    beforeEach(() => {
      // Устанавливаем тестовый конфиг
      configLoader.config = {
        shifts: {
          march_2026: {
            A: { day: [1, 2, 3], night: [4, 5, 6] },
            B: { day: [7, 8, 9], night: [10, 11, 12] },
            C: { day: [13, 14, 15], night: [16, 17, 18] }
          }
        }
      };
    });

    test('должен возвращать "day" для дневной смены', () => {
      const shift = configLoader.getShiftForDate('2026-03-01', 'A');
      expect(shift).toBe('day');
    });

    test('должен возвращать "night" для ночной смены', () => {
      const shift = configLoader.getShiftForDate('2026-03-04', 'A');
      expect(shift).toBe('night');
    });

    test('должен возвращать "off" для выходного', () => {
      const shift = configLoader.getShiftForDate('2026-03-07', 'A');
      expect(shift).toBe('off');
    });

    test('должен работать с форматом даты без года', () => {
      const shift = configLoader.getShiftForDate('15', 'C');
      expect(shift).toBe('day');
    });

    test('должен возвращать "off" при отсутствии конфига смен', () => {
      configLoader.config = {};
      const shift = configLoader.getShiftForDate('2026-03-01', 'A');
      expect(shift).toBe('off');
    });

    test('должен возвращать "off" для несуществующей команды', () => {
      const shift = configLoader.getShiftForDate('2026-03-01', 'D');
      expect(shift).toBe('off');
    });
  });

  describe('loadConfig (мок)', () => {
    test('должен загружать конфиг через fetch', async () => {
      const mockConfig = { version: '1.0.0', chartNorms: {} };
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig
      });

      await configLoader.loadConfig();

      expect(global.fetch).toHaveBeenCalledWith('config.json', { cache: 'no-cache' });
      expect(configLoader.config).toEqual(mockConfig);
    });

    test('должен использовать fallback при ошибке загрузки', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await configLoader.loadConfig();

      expect(configLoader.config).toEqual(configLoader.getDefaultConfig());
    });

    test('должен использовать fallback при HTTP ошибке', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      await configLoader.loadConfig();

      expect(configLoader.config).toEqual(configLoader.getDefaultConfig());
    });
  });

  describe('loadData (мок)', () => {
    test('должен загружать данные через fetch', async () => {
      const mockData = { date: '2026-03-12', hours: [] };
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData
      });

      const result = await configLoader.loadData('test-data.json');

      expect(global.fetch).toHaveBeenCalledWith('test-data.json', { cache: 'no-cache' });
      expect(result).toEqual(mockData);
      expect(configLoader.data).toEqual(mockData);
    });

    test('должен возвращать пустые данные при ошибке', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await configLoader.loadData('test-data.json');

      expect(result.hours).toHaveLength(24);
    });
  });
});
