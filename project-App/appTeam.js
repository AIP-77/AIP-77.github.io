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
        const baseUrl = (window.configLoader.config?.data?.archiveBaseUrl || '').trim();
        const url = `${baseUrl}${encodeURIComponent(month)}%20fullData.json`;
        
        const rawData = await window.configLoader.loadData(url);
        
        console.log('📦 Raw data type:', typeof rawData);
        console.log('📦 Raw data length:', Array.isArray(rawData) ? rawData.length : 'N/A');
        
        // 🔹 АДАПТИВНАЯ ФИЛЬТРАЦИЯ ПО ДАТЕ
        let dayData = null;
        
        // Вариант 1: Данные уже отфильтрованы по дате в формате { "2026-03-12": { hours: [...] } }
        if (rawData?.[dateStr]?.hours && Array.isArray(rawData[dateStr].hours)) {
            dayData = rawData[dateStr].hours;
            console.log('✅ Вариант 1: Данные по дате найдены');
        }
        
        // Вариант 2: Структура с колонками (как в t.html)
        else if (rawData?.data && rawData?.columns && Array.isArray(rawData.data)) {
            console.log('🔍 Поиск колонки с датами...');
            const dateColIndex = rawData.columns.findIndex(col => 
                col.includes('Рабочий день') || 
                col.includes('Дата') || 
                col.includes('Day')
            );
            
            if (dateColIndex !== -1) {
                console.log(`✅ Дата-колонка найдена на позиции ${dateColIndex}`);
                
                // Фильтруем только одну дату
                const targetDate = dateStr.split('-')[2]; // extract "12" from "2026-03-12"
                const filteredRows = rawData.data.filter(row => {
                    return row[dateColIndex] === targetDate;
                });
                
                console.log(`📊 Найдено строк для ${targetDate}:`, filteredRows.length);
                
                if (filteredRows.length > 0) {
                    // Первая строка данных содержит часы
                    dayData = filteredRows[0];
                    console.log('✅ Вариант 2: Фильтрация по колонке выполнена');
                }
            }
        }
        
        // Вариант 3: Массив объектов с полем day/date
        else if (Array.isArray(rawData)) {
            console.log('🔍 Поиск по массиву данных...');
            const targetDate = dateStr.split('-')[2];
            const foundEntry = rawData.find(d => d.day === targetDate || d.date === dateStr);
            
            if (foundEntry?.hours) {
                dayData = foundEntry.hours;
                console.log('✅ Вариант 3: Найден объект с часами');
            }
        }
        
        // Fallback если ничего не нашли
        if (!dayData) {
            console.warn('⚠️ Данные не найдены, генерируем пустые 24 часа');
            dayData = Array.from({length: 24}, (_, i) => ({ hour: i }));
        }
        
        // Обновляем индикатор смены
        window.shiftManager?.updateShiftIndicator(dateStr);
        
        // Рендерим все графики
        Object.values(this.charts).forEach(chart => {
            console.log('📈 Render chart:', chart.chartKey, 'with', dayData.length, 'records');
            chart.updateData(dayData);
        });
        
    } catch (error) {
        console.error('❌ Error loading data for date:', dateStr, error);
        // Empty charts on error
        const fallback = Array.from({length: 24}, (_, h) => ({ hour: h }));
        Object.values(this.charts).forEach(chart => chart.updateData(fallback));
    } finally {
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

  // Team selector (кнопка переключения команды)
  const teamBtn = document.getElementById('teamSelector');
  const currentTeamEl = document.getElementById('currentTeam');
  let currentTeamIndex = 0; // 0=A, 1=B, 2=C
  
  if (teamBtn && window.shiftManager) {
    teamBtn.addEventListener('click', () => {
      currentTeamIndex = (currentTeamIndex + 1) % 3;
      const teams = ['A', 'B', 'C'];
      const newTeam = teams[currentTeamIndex];
      
      // Обновляем текст кнопки
      teamBtn.textContent = `🔄 Команда: ${newTeam}`;
      currentTeamEl.textContent = newTeam;
      
      // Обновляем текущую команду в shiftManager
      window.shiftManager.setTeam(newTeam);
      
      // Перерисовываем графики с новой подсветкой смен
      Object.values(this.charts).forEach(chart => {
        chart.updateData(window.configLoader.data?.hours || []);
      });
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
