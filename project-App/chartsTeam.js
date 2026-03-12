// chartsTeam.js
class ChartBuilder {
  constructor(canvasId, chartKey, configLoader) {
    this.canvasId = canvasId;
    this.chartKey = chartKey;
    this.configLoader = configLoader;
    this.chart = null;
    this.ctx = document.getElementById(canvasId)?.getContext('2d');
  }

  // 🔹 Расчёт необходимого количества бригад
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

  // 🔹 Подготовка данных: нормализация + расчёт бригад
  prepareData(rawData, normConfig) {
    let hoursData = [];
    
    // Извлекаем массив часов из разных форматов
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
    
    // Гарантируем 24 часа
    if (hoursData.length !== 24) {
      console.warn(`⚠️ Expected 24 hours, got ${hoursData.length}. Padding with zeros.`);
      const existing = {};
      hoursData.forEach(h => { if (typeof h.hour === 'number') existing[h.hour] = h; });
      hoursData = Array.from({length: 24}, (_, h) => 
        existing[h] || { hour: h, [this.chartKey]: 0 }
      );
    }
    
    // Нормализуем: гарантируем поля hour и chartKey
    hoursData = hoursData.map((item, idx) => ({
      hour: typeof item.hour === 'number' ? item.hour : idx,
      [this.chartKey]: item[this.chartKey] ?? item.value ?? item.count ?? item.volume ?? 0
    })).sort((a, b) => a.hour - b.hour);
    
    // Расчёт
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

  // 🔹 Отрисовка графика
  render(data, normConfig, shiftHighlight = null) {
    // Проверка: загружена ли Chart.js
    if (typeof Chart === 'undefined') {
      console.error('❌ Chart.js not loaded! Check script order in indexTeam.html');
      const container = document.getElementById(this.canvasId)?.parentElement;
      if (container) {
        container.innerHTML = `<div class="error-state">⚠️ Ошибка: библиотека графиков не загружена</div>`;
      }
      return;
    }
    
    if (!this.ctx) {
      console.warn(`Canvas ${this.canvasId} not found`);
      return;
    }

    try {
      // Уничтожаем старый график
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      const peakColor = 'rgba(234, 67, 53, 0.7)';
      const normalColor = normConfig.color + '66';
      const backgroundColor = data.brigades.map((_, i) => 
        data.peakFlags[i] ? peakColor : normalColor
      );

      this.chart = new Chart(this.ctx, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [
            {
              type: 'line',
              label: 'Объём (шт)',
              data: data.volumes,
              borderColor: normConfig.color,
              backgroundColor: normConfig.color + '33',
              yAxisID: 'y',
              tension: 0.3,
              pointRadius: 2,
              pointHoverRadius: 4,
              order: 2
            },
            {
              type: 'bar',
              label: 'Бригады',
              data: data.brigades,
              backgroundColor: backgroundColor,
              borderColor: normConfig.color,
              borderWidth: 1,
              yAxisID: 'y1',
              barPercentage: 0.8,
              categoryPercentage: 0.9,
              order: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { 
                color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
                padding: 15,
                font: { size: 11 }
              }
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: (context) => {
                  if (context.dataset.type === 'line' || context.dataset.index === 0) {
                    return `📦 Объём: ${context.parsed.y} шт`;
                  }
                  const volume = data.volumes[context.dataIndex];
                  const norm = normConfig.norm;
                  const max = normConfig.max;
                  const raw = Math.ceil(volume / norm);
                  let text = `👥 Бригады: ${context.parsed.y}/${max}`;
                  if (raw > max) {
                    text += ` ⚠️ ПИК! Требуется: ${raw}`;
                  }
                  return text;
                },
                afterLabel: (context) => {
                  if (context.dataset.index === 1) {
                    const volume = data.volumes[context.dataIndex];
                    return `📊 Норма: ${normConfig.norm} шт/ч`;
                  }
                  return '';
                }
              },
              backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-card'),
              titleColor: getComputedStyle(document.body).getPropertyValue('--text-primary'),
              bodyColor: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
              borderColor: getComputedStyle(document.body).getPropertyValue('--border-color'),
              borderWidth: 1,
              padding: 10,
              displayColors: true
            }
          },
          scales: {
            x: {
              grid: { 
                color: getComputedStyle(document.body).getPropertyValue('--chart-grid'),
                display: true 
              },
              ticks: { 
                color: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
                maxRotation: 0,
                font: { size: 10 }
              },
              title: {
                display: true,
                text: 'Часы',
                color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
              }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: { 
                display: true, 
                text: 'Шт/час', 
                color: getComputedStyle(document.body).getPropertyValue('--text-secondary') 
              },
              grid: { 
                color: getComputedStyle(document.body).getPropertyValue('--chart-grid') 
              },
              ticks: { 
                color: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
                callback: (val) => val + ' шт'
              },
              beginAtZero: true
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: { 
                display: true, 
                text: 'Бригады', 
                color: normConfig.color 
              },
              grid: { drawOnChartArea: false },
              ticks: { 
                color: normConfig.color,
                stepSize: 1,
                callback: (val) => val + ' бр.'
              },
              min: 0,
              max: normConfig.max + 1,
              beginAtZero: true
            }
          }
        }
      });

    } catch (error) {
      console.error(`❌ Error rendering chart ${this.chartKey}:`, error);
      const container = document.getElementById(this.canvasId)?.parentElement;
      if (container) {
        container.innerHTML = `<div class="error-state">⚠️ Ошибка: ${error.message}</div>`;
      }
    }
  }

  // 🔹 Обновление данных графика
  updateData(newHoursData) {
    const normConfig = this.configLoader.config?.chartNorms?.[this.chartKey];
    if (!normConfig) {
      console.warn(`⚠️ No norm config for ${this.chartKey}`);
      return;
    }
    
    const prepared = this.prepareData(newHoursData, normConfig);
    const shiftHighlight = window.shiftManager?.getShiftHighlight?.();
    this.render(prepared, normConfig, shiftHighlight);
    
    // В методе updateData() после render():
if (this.chart && data.volumes.length > 0) {
  const maxVolume = Math.max(...data.volumes);
  const totalBrigades = data.brigades.reduce((a, b) => a + b, 0) / data.brigades.length;
  
  const legendEl = document.getElementById(`legend-${this.chartKey}`);
  if (legendEl) {
    legendEl.innerHTML = `
      📦 Объём: <strong>${maxVolume} шт/ч</strong> | 
      👥 Среднее: <strong>${totalBrigades.toFixed(1)}</strong>/
      <strong>${this.configLoader.config?.chartNorms?.[this.chartKey]?.max || 1}</strong> бригады
    `;
  }
}
  }
}

// Экспорт для глобального доступа
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartBuilder;
}
