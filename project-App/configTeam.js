// configTeam.js
class ConfigLoader {
  constructor(configUrl = 'config.json') {
    this.configUrl = configUrl;
    this.config = null;
    this.data = null;
  }

  async loadConfig() {
    try {
      const response = await fetch(this.configUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.config = await response.json();
      console.log('✅ Config loaded:', this.config.version);
      return this.config;
    } catch (error) {
      console.error('❌ Failed to load config:', error);
      // Fallback defaults
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

async loadData(url) {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    this.data = await response.json();
    
    // 🔎 DEBUG: Логируем структуру
    console.log('📦 Data structure:', {
      type: typeof this.data,
      isArray: Array.isArray(this.data),
      keys: Object.keys(this.data),
      hasHours: 'hours' in this.data,
      hoursType: this.data.hours ? typeof this.data.hours : 'N/A',
      hoursLength: this.data.hours?.length
    });
    
    console.log('✅ Data loaded:', url);
    return this.data;
  } catch (error) {
    console.error('❌ Failed to load data:', error);
    return this.getEmptyData();
  }
}

  getShiftForDate(dateStr, team) {
    // dateStr format: "2026-03-15" or "15" for current month
    const day = parseInt(dateStr.split('-').pop() || dateStr);
    const schedule = this.config?.shifts?.march_2026?.[team];
    if (!schedule) return 'off';
    
    if (schedule.day.includes(day)) return 'day';
    if (schedule.night.includes(day)) return 'night';
    return 'off';
  }

  getDefaultConfig() {
    return {
      chartNorms: {
        assembly: { norm: 100, max: 3, name: "Сборка Шин", color: "#4285F4" },
        assembly_rim: { norm: 50, max: 1, name: "Сборка Диски", color: "#a834a4" },
        loading: { norm: 340, max: 1, name: "Погрузка", color: "#EA4335" },
        stickering: { norm: 150, max: 1, name: "Стикеровка", color: "#FBBC05" },
        palletizing: { norm: 124, max: 1, name: "Упаковка", color: "#34A853" }
      },
      shifts: { teams: ["A", "B", "C"] }
    };
  }

  getEmptyData() {
    // 24 hours structure
    const hours = Array.from({length: 24}, (_, i) => ({
      hour: i,
      assembly: 0, assembly_rim: 0, loading: 0, stickering: 0, palletizing: 0
    }));
    return { date: new Date().toISOString().slice(0,10), hours };
  }
}

// Global instance (только в браузере)
if (typeof window !== 'undefined') {
  window.configLoader = new ConfigLoader();
}

// Экспорт для Node.js тестов
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConfigLoader };
}
