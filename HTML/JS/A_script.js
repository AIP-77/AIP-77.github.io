// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
import { getArchiveNameForDate, getArchiveUrl, loadData, getLastAvailableDate } from './data.js';
import { renderCalendar, setupCalendarListeners } from './calendar.js';

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
let comparisonPeriodState = {
  startDate: '',
  endDate: '',
  selectedWorkTypes: []
};


// === ЭЛЕМЕНТЫ DOM ===
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const controlsDiv = document.getElementById('controls');
const selectedDateDiv = document.getElementById('selected-date');
const currentDateSpan = document.getElementById('current-date');
const lastUpdatedDiv = document.getElementById('last-updated');
const exportExcelBtn = document.getElementById('export-excel');
const Title = document.getElementById('-title');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const DaysContainer = document.getElementById('-days');
const loadingProgress = document.getElementById('loading-progress');
// Элементы для сравнения видов работ
const comparisonToggle = document.getElementById('comparison-toggle');
const comparisonContent = document.getElementById('comparison-content');
const comparisonStartDateInput = document.getElementById('comparison-start-date');
const comparisonEndDateInput = document.getElementById('comparison-end-date');
const workTypeSelector = document.getElementById('work-type-selector');
const applyComparisonBtn = document.getElementById('apply-comparison-btn');
const clearComparisonBtn = document.getElementById('clear-comparison-btn');
const comparisonResults = document.getElementById('comparison-results');

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

  render();

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
      render();
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
      render();
    }
  });

  setupToggleHandler('combined-toggle', 'combined-content');
  setupToggleHandler('charts-toggle', 'charts-content');
  setupToggleHandler('work-type-charts-toggle', 'work-type-charts-content');
  setupToggleHandler('departments-toggle', 'departments-content');
  setupToggleHandler('work-types-toggle', 'work-types-content');
  setupToggleHandler('comparison-toggle', 'comparison-content');

  // Обработчики для сравнения видов работ
  if (comparisonToggle && comparisonContent) {
    comparisonToggle.addEventListener('click', function() {
      const icon = this.querySelector('.toggle-icon');
      if (comparisonContent.classList.contains('hidden')) {
        comparisonContent.classList.remove('hidden');
        icon.textContent = '▼';
        populateWorkTypeSelector();
      } else {
        comparisonContent.classList.add('hidden');
        icon.textContent = '▶';
      }
    });
  }

  if (applyComparisonBtn) {
    applyComparisonBtn.addEventListener('click', renderWorkTypeComparison);
  }

  if (clearComparisonBtn) {
    clearComparisonBtn.addEventListener('click', clearComparison);
  }

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

  // Получаем последнюю доступную дату для инициализации
  getLastAvailableDate().then(lastDate => {
    if (lastDate) {
      selectedDate = lastDate;
      const dateObj = new Date(lastDate.split('.').reverse().join('-'));
      currentArchive = getArchiveNameForDate(dateObj);
    }

    // Вызываем loadData с правильными параметрами
    loadData(currentArchive, {
      loadingDiv: loadingDiv,
      errorDiv: errorDiv,
      controlsDiv: controlsDiv,
      lastUpdatedDiv: lastUpdatedDiv,
      updateProgress: updateProgress,
      initUI: initUI
    });
  });
});

// === ФУНКЦИИ ДЛЯ СРАВНЕНИЯ ВИДОВ РАБОТ ===

// Заполнение селектора видами работ
function populateWorkTypeSelector() {
  if (!workTypeSelector) return;

  const uniqueWorkTypes = [...new Set(records.map(r => r['Вид работ']))].filter(Boolean).sort();
  workTypeSelector.innerHTML = uniqueWorkTypes.map(wt =>
    `<option value="${wt}">${wt}</option>`
  ).join('');
}

// Очистка формы сравнения
function clearComparison() {
  if (comparisonStartDateInput) comparisonStartDateInput.value = '';
  if (comparisonEndDateInput) comparisonEndDateInput.value = '';
  if (workTypeSelector) {
    Array.from(workTypeSelector.options).forEach(opt => opt.selected = false);
  }
  if (comparisonResults) comparisonResults.innerHTML = '';
  comparisonPeriodState = { startDate: '', endDate: '', selectedWorkTypes: [] };
}

// Рендеринг сравнения видов работ
function renderWorkTypeComparison() {
  const startDate = comparisonStartDateInput?.value;
  const endDate = comparisonEndDateInput?.value;
  const selectedOptions = Array.from(workTypeSelector?.selectedOptions || []).map(opt => opt.value);

  if (!startDate || !endDate) {
    comparisonResults.innerHTML = '<div class="error" style="color: #f44336; padding: 10px;">⚠️ Выберите даты начала и окончания периода</div>';
    return;
  }

  if (selectedOptions.length === 0) {
    comparisonResults.innerHTML = '<div class="error" style="color: #f44336; padding: 10px;">⚠️ Выберите хотя бы один вид работ для сравнения</div>';
    return;
  }

  // Преобразуем даты из YYYY-MM-DD в DD.MM.YYYY
  const startParts = startDate.split('-');
  const endParts = endDate.split('-');
  const startDateFormatted = `${startParts[2]}.${startParts[1]}.${startParts[0]}`;
  const endDateFormatted = `${endParts[2]}.${endParts[1]}.${endParts[0]}`;

  // Получаем все даты в выбранном диапазоне
  const dateRange = getDateRange(startDateFormatted, endDateFormatted);

  // Фильтруем записи по датам и видам работ
  const filteredRecords = records.filter(r => {
    const recordDate = r['Рабочий день'];
    const isInDateRange = dateRange.includes(recordDate);
    const isSelectedWorkType = selectedOptions.includes(r['Вид работ']);
    return isInDateRange && isSelectedWorkType;
  });

  if (filteredRecords.length === 0) {
    comparisonResults.innerHTML = '<div class="warning" style="color: #ff9800; padding: 10px;">ℹ️ Нет данных за выбранный период для выбранных видов работ</div>';
    return;
  }

  // Агрегируем данные по видам работ
  const workTypeStats = {};
  selectedOptions.forEach(wt => {
    workTypeStats[wt] = {
      totalUnits: 0,
      totalTime: 0,
      totalAmount: 0,
      totalTasks: 0,
      responsibleTasks: 0,
      brigades: new Set(),
      daysWorked: new Set(),
      records: []
    };
  });

  filteredRecords.forEach(r => {
    const wt = r['Вид работ'];
    if (!workTypeStats[wt]) return;

    workTypeStats[wt].records.push(r);
    workTypeStats[wt].daysWorked.add(r['Рабочий день']);

    if (isResponsible(r['Должность'])) {
      workTypeStats[wt].totalUnits += parseInt(r['Количество единиц']) || 0;
      workTypeStats[wt].totalTime += parseTime(r['Рабочее время']);
      workTypeStats[wt].responsibleTasks++;
      if (r['Сотрудник']) {
        workTypeStats[wt].brigades.add(r['Сотрудник']);
      }
    }

    workTypeStats[wt].totalAmount += parseCurrency(r['Расчетная сумма']);
    workTypeStats[wt].totalTasks++;
  });

  // Генерируем HTML для сравнения
  let html = `
    <div style="margin-bottom: 20px;">
      <h4 style="color: #333;">📊 Сравнение видов работ за период: ${startDateFormatted} - ${endDateFormatted}</h4>
      <p style="color: #666; font-size: 14px;">Выбрано видов работ: ${selectedOptions.join(', ')}</p>
    </div>
  `;

  // Общая сводная таблица
  html += `
    <div class="comparison-summary" style="overflow-x: auto; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Вид работ</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Единиц</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Задач</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Бригад</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Дней работы</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Время (час)</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Норматив (шт/час)</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Расходы</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Расх./ед.</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Расх./час</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Сортируем по производительности (нормативу)
  const sortedWorkTypes = Object.entries(workTypeStats).sort((a, b) => {
    const normA = a[1].totalTime > 0 ? a[1].totalUnits / (a[1].totalTime / 3600) : 0;
    const normB = b[1].totalTime > 0 ? b[1].totalUnits / (b[1].totalTime / 3600) : 0;
    return normB - normA;
  });

  sortedWorkTypes.forEach(([workType, stats]) => {
    const totalHours = stats.totalTime / 3600;
    const normative = totalHours > 0 ? stats.totalUnits / totalHours : 0;
    const costPerUnit = stats.totalUnits > 0 ? stats.totalAmount / stats.totalUnits : 0;
    const costPerHour = totalHours > 0 ? stats.totalAmount / totalHours : 0;

    // Определяем лучший вид работ для подсветки
    const bestNormative = sortedWorkTypes.length > 0 ?
      Math.max(...sortedWorkTypes.map(([_, s]) => s.totalTime > 0 ? s.totalUnits / (s.totalTime / 3600) : 0)) : 0;
    const isBest = normative === bestNormative && normative > 0;

    html += `
      <tr style="${isBest ? 'background: #e8f5e9;' : ''}">
        <td style="padding: 10px; border: 1px solid #ddd; font-weight: ${isBest ? 'bold' : 'normal'};">${workType}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.totalUnits}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.totalTasks}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.brigades.size}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.daysWorked.size}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${totalHours.toFixed(1)}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${isBest ? '#4caf50' : '#333'};">${normative.toFixed(1)}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${formatCurrency(stats.totalAmount)}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">р.${costPerUnit.toFixed(2)}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${formatCurrency(costPerHour)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // Карточки с детальной информацией по каждому виду работ
  html += `<div class="work-type-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">`;

  sortedWorkTypes.forEach(([workType, stats], index) => {
    const totalHours = stats.totalTime / 3600;
    const normative = totalHours > 0 ? stats.totalUnits / totalHours : 0;
    const standard = getStandardForWork(workType);
    const performancePercent = standard > 0 ? (normative / standard) * 100 : 0;

    let performanceClass = 'performance-poor';
    let performanceText = 'Низкая';
    if (standard > 0) {
      if (performancePercent >= 90) {
        performanceClass = 'performance-good';
        performanceText = 'Высокая';
      } else if (performancePercent >= 70) {
        performanceClass = 'performance-average';
        performanceText = 'Средняя';
      }
      performanceText += ` (${performancePercent.toFixed(0)}%)`;
    }

    html += `
      <div class="comparison-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: #fafafa;">
        <h5 style="margin: 0 0 10px 0; color: #333;">🔧 ${workType}</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
          <div><strong>Единиц:</strong> ${stats.totalUnits}</div>
          <div><strong>Задач:</strong> ${stats.totalTasks}</div>
          <div><strong>Бригад:</strong> ${stats.brigades.size}</div>
          <div><strong>Дней:</strong> ${stats.daysWorked.size}</div>
          <div><strong>Время:</strong> ${formatTime(stats.totalTime)}</div>
          <div><strong>Норматив:</strong> ${normative.toFixed(1)} шт/час</div>
          <div><strong>Расходы:</strong> ${formatCurrency(stats.totalAmount)}</div>
          <div><strong>Расх./ед.:</strong> р.${(stats.totalUnits > 0 ? stats.totalAmount / stats.totalUnits : 0).toFixed(2)}</div>
        </div>
        ${standard > 0 ? `
          <div style="margin-top: 10px; padding: 8px; background: #e8f5e9; border-radius: 4px;">
            <div style="font-size: 12px;"><strong>Эффективность:</strong> <span class="${performanceClass}">${performanceText}</span></div>
            <div style="font-size: 11px; color: #666;">План: ${standard} шт/час</div>
          </div>
        ` : ''}
        ${index === 0 && normative > 0 ? `
          <div style="margin-top: 10px; padding: 8px; background: #fff3e0; border-radius: 4px;">
            <div style="font-size: 12px; color: #e65100;"><strong>🏆 Лидер по производительности</strong></div>
          </div>
        ` : ''}
      </div>
    `;
  });

  html += `</div>`;

  comparisonResults.innerHTML = html;
}

// Получить диапазон дат
function getDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const range = [];
  const current = new Date(start);

  while (current <= end) {
    range.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return range;
}
