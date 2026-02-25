// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let records = [];
let standards = [];
let staffData = [];
let selectedDate = '';
let allWorkTypes = [];
let currentMonth = new Date();
currentMonth.setDate(1);
let currentArchive = null;
let uiInitialized = false;
let selectedDepartment = '';
let donutRenderTimeout = null; // ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ГРАФИКОВ 
let tooltipTimeout = null; //  ФУНКЦИИ TOOLTIP 

// === ЭЛЕМЕНТЫ DOM ===
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const controlsDiv = document.getElementById('controls');
const selectedDateDiv = document.getElementById('selected-date');
const currentDateSpan = document.getElementById('current-date');
const lastUpdatedDiv = document.getElementById('last-updated');
const exportExcelBtn = document.getElementById('export-excel');
const calendarTitle = document.getElementById('calendar-title');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const calendarDaysContainer = document.getElementById('calendar-days');
const loadingProgress = document.getElementById('loading-progress');

// === ПРОГРЕСС БАР ===
function updateProgress(percent) {
  if (loadingProgress) {
    loadingProgress.style.width = percent + '%';
  }
}

// === ИНИЦИАЛИЗАЦИЯ UI ===
function initUI() {
  loadingDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
  controlsDiv.classList.remove('hidden');
  
  renderCalendar();
  
  if (!uiInitialized) {
    setupEventListeners();
    uiInitialized = true;
  }
  
  const donutContainer = document.getElementById('donut-container');
  if (donutContainer && window.donutChartData) {
    donutContainer.innerHTML = renderDonutChart(window.donutChartData);
  }
  
  const uniqueDates = [...new Set(records.map(r => r['Рабочий день']))].filter(Boolean).sort();
  if (uniqueDates.length > 0 && !selectedDate) {
    selectedDate = uniqueDates[0];
    renderReport();
  }
}

// === НАСТРОЙКА СОБЫТИЙ ===
function setupEventListeners() {
  exportExcelBtn.addEventListener('click', exportToExcel);
  
  prevMonthBtn.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    const targetArchive = getArchiveNameForDate(currentMonth);
    if (currentArchive !== targetArchive) {
      currentArchive = targetArchive;
      selectedDate = '';
      loadData();
    } else {
      renderCalendar();
    }
  });
  
  nextMonthBtn.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    const targetArchive = getArchiveNameForDate(currentMonth);
    if (currentArchive !== targetArchive) {
      currentArchive = targetArchive;
      selectedDate = '';
      loadData();
    } else {
      renderCalendar();
    }
  });
  
  setupToggleHandler('combined-toggle', 'combined-content');
  setupToggleHandler('charts-toggle', 'charts-content');
  setupToggleHandler('work-type-charts-toggle', 'work-type-charts-content');
  setupToggleHandler('departments-toggle', 'departments-content');
  setupToggleHandler('work-types-toggle', 'work-types-content');
  
  window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

function setupToggleHandler(toggleId, contentId) {
  const toggle = document.getElementById(toggleId);
  const content = document.getElementById(contentId);
  if (toggle && content) {
    toggle.addEventListener('click', function() {
      const icon = this.querySelector('.toggle-icon');
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.textContent = '▼';
      } else {
        content.classList.add('hidden');
        icon.textContent = '▶';
      }
    });
  }
}

// === ЗАГРУЗКА ДАННЫХ ===
async function loadData() {
  if (!currentArchive) {
    currentArchive = getArchiveNameForDate(new Date());
  }
  const url = getArchiveUrl(currentArchive);
  
  try {
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    controlsDiv.classList.add('hidden');
    
    updateProgress(10);
    await Promise.all([loadStandards(), loadStaffData()]);
    
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Загрузка данных архива ${currentArchive}<span class="loading-dots"></span></span>
    `;
    
    console.log('Пытаемся загрузить данные из:', url);
    const urlWithCacheBust = `${url}?t=${Date.now()}`;
    updateProgress(30);
    
    const response = await fetch(urlWithCacheBust);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    
    updateProgress(60);
    const data = await response.json();
    records = normalizeRecords(data);
    
    if (!Array.isArray(records)) {
      throw new Error('Неверный формат данных');
    }
    
    updateProgress(80);
    
    // Распределение трудозатрат
    const workTypeHours = {};
    records.forEach(record => {
      const workType = record['Вид работ'] || 'Не указано';
      const timeStr = record['Рабочее время'];
      let hours = 0;
      if (timeStr && typeof timeStr === 'string') {
        const parts = timeStr.split(':').map(Number);
        if (parts.length >= 2) {
          const h = parts[0] || 0;
          const m = parts[1] || 0;
          const s = parts[2] || 0;
          hours = h + (m / 60) + (s / 3600);
        }
      }
      workTypeHours[workType] = (workTypeHours[workType] || 0) + hours;
    });
    
    const topWorkTypes = Object.entries(workTypeHours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const donutData = Object.fromEntries(topWorkTypes);
    window.donutChartData = donutData;
    
    records.forEach(record => {
      const { direction, department } = getDirectionAndDepartment(record['Вид работ']);
      record['Направление'] = direction;
      record['Отдел'] = department;
    });
    
    allWorkTypes = [...new Set(records.map(r => r['Вид работ']).filter(Boolean))].sort();
    lastUpdatedDiv.textContent = `Обновлено: ${formatDateTime(new Date())} | Архив: ${currentArchive} | Нормативов: ${standards.length} | Сотрудников: ${staffData.length}`;
    
    updateProgress(100);
    setTimeout(() => {
      initUI();
      updateProgress(0);
    }, 500);
    
  } catch (err) {
    console.error('Ошибка загрузки, используем тестовые данные:', err);
    records = createTestData();
    allWorkTypes = [...new Set(records.map(r => r['Вид работ']).filter(Boolean))].sort();
    
    const testDonutData = {
      'Комплектация': 42.5,
      'Упаковка': 23.2,
      'Погрузка': 15.8,
      'Администрация': 8.3,
      'Сборка': 6.1,
      'Транспортировка': 4.1
    };
    window.donutChartData = testDonutData;
    
    lastUpdatedDiv.textContent = `Обновлено: ${formatDateTime(new Date())} | ТЕСТОВЫЕ ДАННЫЕ | Нормативов: ${standards.length} | Сотрудников: ${staffData.length}`;
    errorDiv.textContent = `⚠️ Не удалось загрузить данные: ${err.message}. Используются тестовые данные.`;
    errorDiv.classList.remove('hidden');
    
    updateProgress(100);
    setTimeout(() => {
      initUI();
      updateProgress(0);
    }, 500);
  }
}

// === ТОЧКА ВХОДА ===
document.addEventListener('DOMContentLoaded', function() {
  currentArchive = getArchiveNameForDate(new Date());
  loadData();
});
