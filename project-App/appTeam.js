// app.js
class DashboardApp {
  constructor() {
    this.charts = {};
    this.currentDate = new Date().toISOString().slice(0, 10);
    this.init();
  }

  async init() {
    // 1. Load config
    await window.configLoader.loadConfig();
    
    // 2. Initialize charts
    this.initCharts();
    
    // 3. Load and render data
    await this.loadDataForDate(this.currentDate);
    
    // 4. Setup event listeners
    this.setupListeners();
    
    // 5. Update footer
    this.updateFooter();
    
    console.log('✅ Dashboard initialized');
  }

  initCharts() {
    const norms = window.configLoader.config?.chartNorms || {};
    
    Object.entries(norms).forEach(([key, config]) => {
      const canvasId = `chart-${key}`;
      if (document.getElementById(canvasId)) {
        this.charts[key] = new ChartBuilder(canvasId, key, window.configLoader);
      }
    });
  }

async loadDataForDate(dateStr) {
  // Show loading state
  document.querySelectorAll('.chart-container').forEach(el => {
    el.innerHTML = '<div class="loading-spinner">⏳ Загрузка...</div>';
  });

  try {
    // Load data
    const month = dateStr.slice(0, 7);
    const url = `${window.configLoader.config?.data?.archiveBaseUrl}${month}%20fullData.json`;
    const rawData = await window.configLoader.loadData(url);
    
    // 🔹 Адаптивное извлечение данных для конкретной даты
    let dayData;
    
    // Вариант 1: данные уже отфильтрованы по дате
    if (rawData?.hours && Array.isArray(rawData.hours)) {
      dayData = rawData.hours;
    } 
    // Вариант 2: данные по дням { "2026-03-15": { hours: [...] } }
    else if (rawData?.[dateStr]) {
      dayData = rawData[dateStr].hours || rawData[dateStr];
    }
    // Вариант 3: массив дней, ищем по дате
    else if (Array.isArray(rawData)) {
      const dayEntry = rawData.find(d => d.date === dateStr || d.day === dateStr.slice(-2));
      dayData = dayEntry?.hours || dayEntry || rawData[0];
    }
    // Fallback
    else {
      dayData = rawData;
    }
    
    // Update shift indicator
    window.shiftManager?.updateShiftIndicator(dateStr);
    
    // Render all charts
    Object.values(this.charts).forEach(chart => {
      chart.updateData(dayData);
    });
    
  } catch (error) {
    console.error('❌ Error loading data for date:', dateStr, error);
    // Render empty charts on error
    Object.values(this.charts).forEach(chart => {
      chart.updateData(window.configLoader.getEmptyData().hours);
    });
  } finally {
    // Remove loading spinners
    document.querySelectorAll('.loading-spinner').forEach(el => el.remove());
  }
}

  setupListeners() {
    // Month selector
    const monthSel = document.getElementById('monthSelector');
    if (monthSel) {
      monthSel.addEventListener('change', (e) => {
        // For demo: just reload with new month prefix
        const newDate = e.target.value + '-' + this.currentDate.slice(-2);
        this.loadDataForDate(newDate);
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '🔄...';
        await this.loadDataForDate(this.currentDate);
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Обновить';
      });
    }

    // Theme change listener
    if (window.themeManager) {
      // Re-render charts on theme change
      const observer = new MutationObserver(() => {
        Object.values(this.charts).forEach(chart => {
          if (chart.chart) chart.chart.update('none');
        });
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  updateFooter() {
    const dateEl = document.getElementById('currentDate');
    const updateEl = document.getElementById('lastUpdate');
    
    if (dateEl) {
      dateEl.textContent = new Date(this.currentDate).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    }
    if (updateEl) {
      updateEl.textContent = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit'
      });
    }
  }
}

// Start app when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new DashboardApp();
});
