// appTeam.js
class DashboardApp {
  constructor() {
    this.charts = {};
    this.currentDate = new Date().toISOString().slice(0, 10);
    this.init();
  }

  async init() {
    try {
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
    } catch (error) {
      console.error('❌ Dashboard init failed:', error);
    }
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
      // 🔹 Trim URL to avoid 404 from trailing spaces
      const baseUrl = (window.configLoader.config?.data?.archiveBaseUrl || '').trim();
      const url = `${baseUrl}${encodeURIComponent(month)}%20fullData.json`;
      
      const rawData = await window.configLoader.loadData(url);
      
      // 🔹 Адаптивное извлечение данных для конкретной даты
      let dayData;
      
      if (rawData?.hours && Array.isArray(rawData.hours)) {
        dayData = rawData.hours;
      } else if (rawData?.[dateStr]) {
        dayData = rawData[dateStr].hours || rawData[dateStr];
      } else if (Array.isArray(rawData)) {
        const dayEntry = rawData.find(d => d.date === dateStr || d.day === dateStr.slice(-2));
        dayData = dayEntry?.hours || dayEntry || rawData[0];
      } else {
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
      const fallback = Array.from({length: 24}, (_, h) => ({ hour: h }));
      Object.values(this.charts).forEach(chart => {
        chart.updateData(fallback);
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

// ✅ Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new DashboardApp();
  
  setTimeout(() => {
    console.log('🔍 Env check:', {
      Chart: typeof Chart !== 'undefined' ? 'OK' : 'MISSING',
      dashboard: typeof window.dashboard !== 'undefined' ? 'OK' : 'MISSING'
    });
  }, 1000);
});
