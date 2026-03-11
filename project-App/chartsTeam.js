// charts.js
class ChartBuilder {
  constructor(canvasId, chartKey, configLoader) {
    this.canvasId = canvasId;
    this.chartKey = chartKey;
    this.configLoader = configLoader;
    this.chart = null;
    this.ctx = document.getElementById(canvasId)?.getContext('2d');
  }

  calculateBrigades(volume, norm, max) {
    if (!volume || !norm) return 0;
    const required = Math.ceil(volume / norm);
    return {
      required: Math.min(required, max), // Cap at max for display
      raw: required,
      isPeak: required > max,
      excess: Math.max(0, required - max)
    };
  }

  prepareData(hoursData, normConfig) {
    const labels = hoursData.map(h => `${h.hour}:00`);
    const volumes = hoursData.map(h => h[this.chartKey] || 0);
    const brigades = volumes.map(v => {
      const calc = this.calculateBrigades(v, normConfig.norm, normConfig.max);
      return calc.required;
    });
    const peakFlags = volumes.map(v => {
      const calc = this.calculateBrigades(v, normConfig.norm, normConfig.max);
      return calc.isPeak;
    });

    return { labels, volumes, brigades, peakFlags };
  }

  render(data, normConfig, shiftHighlight = null) {
    if (!this.ctx) {
      console.warn(`Canvas ${this.canvasId} not found`);
      return;
    }

    // Destroy existing chart
    if (this.chart) this.chart.destroy();

    // Color for peaks
    const peakColor = 'rgba(234, 67, 53, 0.6)';
    const normalColor = normConfig.color + '66'; // 40% opacity

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
            pointHoverRadius: 4
          },
          {
            type: 'bar',
            label: 'Бригады',
            data: data.brigades,
            backgroundColor: backgroundColor,
            borderColor: normConfig.color,
            borderWidth: 1,
            yAxisID: 'y1',
            barPercentage: 0.7,
            categoryPercentage: 0.9
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            callbacks: {
              label: (context) => {
                if (context.dataset.type === 'line') {
                  return `Объём: ${context.parsed.y} шт`;
                }
                const hour = context.label;
                const volume = data.volumes[context.dataIndex];
                const norm = normConfig.norm;
                const raw = Math.ceil(volume / norm);
                const max = normConfig.max;
                let text = `Бригады: ${context.parsed.y}/${max}`;
                if (raw > max) {
                  text += ` ⚠️ Пик! (нужно: ${raw})`;
                }
                return text;
              }
            },
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-card'),
            titleColor: getComputedStyle(document.body).getPropertyValue('--text-primary'),
            bodyColor: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
            borderColor: getComputedStyle(document.body).getPropertyValue('--border-color'),
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: getComputedStyle(document.body).getPropertyValue('--chart-grid') },
            ticks: { 
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary'),
              maxRotation: 0,
              font: { size: 10 }
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Шт/час', color: getComputedStyle(document.body).getPropertyValue('--text-secondary') },
            grid: { color: getComputedStyle(document.body).getPropertyValue('--chart-grid') },
            ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Бригады', color: normConfig.color },
            grid: { drawOnChartArea: false },
            ticks: { 
              color: normConfig.color,
              stepSize: 1,
              callback: (val) => val + ' бр.'
            },
            min: 0,
            max: normConfig.max + 1
          }
        }
      }
    });

    // Add shift highlight annotation (if Chart.js annotation plugin available)
    if (shiftHighlight && window.ChartAnnotation) {
      this.addShiftAnnotation(shiftHighlight);
    }
  }

  addShiftAnnotation(highlight) {
    // Requires chartjs-plugin-annotation
    if (!this.chart.options.plugins.annotation) {
      this.chart.options.plugins.annotation = { annotations: {} };
    }
    
    const items = Array.isArray(highlight) ? highlight : [highlight];
    items.forEach((item, idx) => {
      this.chart.options.plugins.annotation.annotations[`shift-${idx}`] = {
        type: 'box',
        xMin: item.start - 0.5,
        xMax: item.end - 0.5,
        backgroundColor: item.color,
        borderWidth: 0,
        drawTime: 'beforeDatasetsDraw'
      };
    });
    this.chart.update();
  }

  updateData(newHoursData) {
    const normConfig = this.configLoader.config?.chartNorms?.[this.chartKey];
    if (!normConfig) return;
    
    const prepared = this.prepareData(newHoursData, normConfig);
    const shiftHighlight = window.shiftManager?.getShiftHighlight();
    this.render(prepared, normConfig, shiftHighlight);
  }
}
