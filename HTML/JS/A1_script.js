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
  
  // Если selectedDate ещё не установлена, используем последнюю доступную дату
  const uniqueDates = [...new Set(records.map(r => r['Рабочий день']))].filter(Boolean).sort();
  if (uniqueDates.length > 0 && !selectedDate) {
    // Сортируем даты по убыванию и берём первую (последнюю по времени)
    uniqueDates.sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('.').map(Number);
      const [dayB, monthB, yearB] = b.split('.').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateB - dateA;
    });
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

// === ТОЧКА ВХОДА ===
document.addEventListener('DOMContentLoaded', function() {
  currentArchive = getArchiveNameForDate(new Date());
  loadData();
});
