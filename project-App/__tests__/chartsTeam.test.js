// __tests__/chartsTeam.test.js
// Тесты для ChartBuilder

const { ConfigLoader } = require('../configTeam.js');

// Мок для Chart.js (как в jest.setup.js)
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

// Упрощённая версия ChartBuilder для тестирования
class ChartBuilder {
  constructor(canvasId, chartKey, configLoader) {
    this.canvasId = canvasId;
    this.chartKey = chartKey;
    this.configLoader = configLoader;
    this.chart = null;
    this.ctx = { canvas: { id: canvasId } }; // Мок контекста
  }

  calculateBrigades(volume, norm, max) {
    if (!volume || !norm) return { required: 0, raw: 0, isPeak: false, excess: 0 };
    const raw = Math.ceil(volume / norm);
    return {
      required: Math.min(raw, max),
      raw: raw,
      isPeak: raw > max,
      excess: Math.max(0, raw - max)
    };
  }

  prepareData(rawData, normConfig) {
    let hoursData = [];
    
    if (Array.isArray(rawData)) {
      hoursData = rawData;
    } else if (rawData?.hours && Array.isArray(rawData.hours)) {
      hoursData = rawData.hours;
    } else if (rawData?.data && Array.isArray(rawData.data)) {
      hoursData = rawData.data;
    } else if (typeof rawData === 'object' && rawData !== null) {
      hoursData = Object.values(rawData).filter(item => 
        typeof item === 'object' && item !== null && 'hour' in item
      );
    }
    
    if (hoursData.length !== 24) {
      const existing = {};
      hoursData.forEach(h => { if (typeof h.hour === 'number') existing[h.hour] = h; });
      hoursData = Array.from({length: 24}, (_, h) => 
        existing[h] || { hour: h, [this.chartKey]: 0 }
      );
    }
    
    hoursData = hoursData.map((item, idx) => ({
      hour: typeof item.hour === 'number' ? item.hour : idx,
      [this.chartKey]: item[this.chartKey] ?? item.value ?? item.count ?? item.volume ?? 0
    })).sort((a, b) => a.hour - b.hour);
    
    const labels = hoursData.map(h => `${String(h.hour).padStart(2, '0')}:00`);
    const volumes = hoursData.map(h => h[this.chartKey]);
    
    const brigades = volumes.map(v => 
      this.calculateBrigades(v, normConfig.norm, normConfig.max).required
    );
    const peakFlags = volumes.map(v => 
      this.calculateBrigades(v, normConfig.norm, normConfig.max).isPeak
    );

    return { labels, volumes, brigades, peakFlags };
  }

  render(data, normConfig, shiftHighlight = null) {
    if (!this.ctx) return;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const peakColor = 'rgba(234, 67, 53, 0.7)';
    const normalColor = normConfig.color + '66';
    const backgroundColor = data.brigades.map((_, i) => 
      data.peakFlags[i] ? peakColor : normalColor
    );

    this.chart = new global.Chart(this.ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            type: 'line',
            label: 'Объём (шт)',
            data: data.volumes,
            borderColor: normConfig.color,
            yAxisID: 'y'
          },
          {
            type: 'bar',
            label: 'Бригады',
            data: data.brigades,
            backgroundColor: backgroundColor,
            borderColor: normConfig.color,
            yAxisID: 'y1'
          }
        ]
      },
      options: {}
    });
  }

  updateData(newHoursData) {
    const normConfig = this.configLoader.config?.chartNorms?.[this.chartKey];
    if (!normConfig) return;
    
    const prepared = this.prepareData(newHoursData, normConfig);
    this.render(prepared, normConfig);
  }
}

describe('ChartBuilder', () => {
  let chartBuilder;
  let configLoader;

  beforeEach(() => {
    configLoader = new ConfigLoader();
    configLoader.config = configLoader.getDefaultConfig();
    chartBuilder = new ChartBuilder('test-canvas', 'assembly', configLoader);
  });

  describe('calculateBrigades', () => {
    test('должен рассчитывать правильное количество бригад', () => {
      const result = chartBuilder.calculateBrigades(250, 100, 3);
      
      expect(result.raw).toBe(3);
      expect(result.required).toBe(3);
      expect(result.isPeak).toBe(false);
      expect(result.excess).toBe(0);
    });

    test('должен определять пиковую нагрузку', () => {
      const result = chartBuilder.calculateBrigades(350, 100, 3);
      
      expect(result.raw).toBe(4);
      expect(result.required).toBe(3);
      expect(result.isPeak).toBe(true);
      expect(result.excess).toBe(1);
    });

    test('должен возвращать 0 при нулевом объёме', () => {
      const result = chartBuilder.calculateBrigades(0, 100, 3);
      
      expect(result.required).toBe(0);
      expect(result.isPeak).toBe(false);
    });

    test('должен возвращать 0 при отсутствии нормы', () => {
      const result = chartBuilder.calculateBrigades(100, null, 3);
      
      expect(result.required).toBe(0);
    });

    test('должен ограничивать максимальным количеством бригад', () => {
      const result = chartBuilder.calculateBrigades(1000, 100, 3);
      
      expect(result.required).toBe(3);
      expect(result.raw).toBe(10);
      expect(result.excess).toBe(7);
    });
  });

  describe('prepareData', () => {
    test('должен обрабатывать массив данных', () => {
      const rawData = Array.from({length: 24}, (_, i) => ({ hour: i, assembly: i * 10 }));
      const normConfig = { norm: 100, max: 3 };
      
      const result = chartBuilder.prepareData(rawData, normConfig);
      
      expect(result.labels).toHaveLength(24);
      expect(result.volumes).toHaveLength(24);
      expect(result.brigades).toHaveLength(24);
      expect(result.labels[0]).toBe('00:00');
      expect(result.labels[23]).toBe('23:00');
    });

    test('должен обрабатывать объект с hours', () => {
      const rawData = {
        hours: Array.from({length: 24}, (_, i) => ({ hour: i, assembly: 50 }))
      };
      const normConfig = { norm: 100, max: 3 };
      
      const result = chartBuilder.prepareData(rawData, normConfig);
      
      expect(result.volumes.every(v => v === 50)).toBe(true);
    });

    test('должен дополнять до 24 часов нулями', () => {
      const rawData = [{ hour: 0, assembly: 100 }, { hour: 1, assembly: 200 }];
      const normConfig = { norm: 100, max: 3 };
      
      const result = chartBuilder.prepareData(rawData, normConfig);
      
      expect(result.labels).toHaveLength(24);
      expect(result.volumes.slice(2)).toEqual(Array(22).fill(0));
    });

    test('должен сортировать по часам', () => {
      const rawData = [
        { hour: 23, assembly: 100 },
        { hour: 0, assembly: 50 },
        { hour: 12, assembly: 75 }
      ];
      const normConfig = { norm: 100, max: 3 };
      
      const result = chartBuilder.prepareData(rawData, normConfig);
      
      expect(result.volumes[0]).toBe(50);
      expect(result.volumes[12]).toBe(75);
      expect(result.volumes[23]).toBe(100);
    });

    test('должен использовать альтернативные поля (value, count, volume)', () => {
      const rawData = [{ hour: 0, value: 100 }, { hour: 1, count: 200 }, { hour: 2, volume: 300 }];
      const normConfig = { norm: 100, max: 3, color: '#000' };
      
      chartBuilder.chartKey = 'assembly';
      const result = chartBuilder.prepareData(rawData, normConfig);
      
      expect(result.volumes[0]).toBe(100);
      expect(result.volumes[1]).toBe(200);
      expect(result.volumes[2]).toBe(300);
    });
  });

  describe('render', () => {
    test('должен создавать график с правильными данными', () => {
      const data = {
        labels: ['00:00', '01:00'],
        volumes: [100, 200],
        brigades: [1, 2],
        peakFlags: [false, false]
      };
      const normConfig = { norm: 100, max: 3, color: '#4285F4' };
      
      chartBuilder.render(data, normConfig);
      
      expect(chartBuilder.chart).toBeDefined();
      expect(chartBuilder.chart.data.labels).toEqual(data.labels);
      expect(chartBuilder.chart.data.datasets).toHaveLength(2);
    });

    test('должен уничтожать старый график перед созданием нового', () => {
      const data = {
        labels: ['00:00'],
        volumes: [100],
        brigades: [1],
        peakFlags: [false]
      };
      const normConfig = { norm: 100, max: 3, color: '#4285F4' };
      
      chartBuilder.render(data, normConfig);
      const oldChart = chartBuilder.chart;
      
      chartBuilder.render(data, normConfig);
      
      expect(chartBuilder.chart).not.toBe(oldChart);
    });

    test('должен устанавливать цвета фона для пиков и нормальных значений', () => {
      const data = {
        labels: ['00:00', '01:00'],
        volumes: [100, 350],
        brigades: [1, 3],
        peakFlags: [false, true]
      };
      const normConfig = { norm: 100, max: 3, color: '#4285F4' };
      
      chartBuilder.render(data, normConfig);
      
      const colors = chartBuilder.chart.data.datasets[1].backgroundColor;
      expect(colors[0]).toContain('66'); // Полупрозрачный нормальный цвет
      expect(colors[1]).toBe('rgba(234, 67, 53, 0.7)'); // Пиковый цвет
    });
  });

  describe('updateData', () => {
    test('должен обновлять данные графика', () => {
      const newData = Array.from({length: 24}, (_, i) => ({ hour: i, assembly: i * 10 }));
      
      chartBuilder.updateData(newData);
      
      expect(chartBuilder.chart).toBeDefined();
      expect(chartBuilder.chart.data.datasets[0].data).toHaveLength(24);
    });

    test('должен игнорировать обновление без конфига', () => {
      configLoader.config = {};
      chartBuilder = new ChartBuilder('test-canvas', 'unknown', configLoader);
      
      chartBuilder.updateData([]);
      
      expect(chartBuilder.chart).toBeNull();
    });
  });
});
