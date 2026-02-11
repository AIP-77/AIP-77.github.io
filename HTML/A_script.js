let tooltipTimeout = null;

function showTooltip(event, element) {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }

  const tooltip = document.getElementById('customTooltip');
  const text = element.getAttribute('data-tooltip');
  if (!text) return;

  tooltip.textContent = text;
  tooltip.style.display = 'block';

  // Получаем позицию элемента относительно viewport
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Позиционируем tooltip над центром столбца, с небольшим отступом сверху
  const left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  const top = rect.top - tooltipRect.height - 8; // 8px отступ сверху

  // Ограничиваем, чтобы tooltip не уходил за левую/правую границу окна
  const windowWidth = window.innerWidth;
  const leftClamped = Math.max(0, Math.min(left, windowWidth - tooltipRect.width));

  tooltip.style.left = leftClamped + 'px';
  tooltip.style.top = Math.max(0, top) + 'px';
}

function hideTooltip() {
  tooltipTimeout = setTimeout(() => {
    const tooltip = document.getElementById('customTooltip');
    tooltip.style.display = 'none';
    tooltipTimeout = null;
  }, 1000);
}
// функцию генерации диаграммы
function renderDonutChart(data) {
  // Пример данных: { "Комплектация": 42, "Упаковка": 23, "Погрузка": 15, ... }
  const total = Object.values(data).reduce((sum, v) => sum + v, 0);
  if (total === 0) return '<div class="donut-chart"><svg></svg><div class="donut-center">Нет данных</div></div>';

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let startAngle = 0;
  let svgHtml = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">`;

  // Цвета по порядку (можно расширить)
  const colors = [
    '#4285F4', // синий — Комплектация
    '#34A853', // зелёный — Упаковка
    '#FBBC05', // жёлтый — Погрузка
    '#EA4335', // красный — Администрация
    '#9C27B0', // фиолетовый — Сборка
    '#00ACC1', // бирюзовый — Транспорт
    '#FF9800', // оранжевый — Другие
  ];

  let i = 0;
  for (const [label, value] of Object.entries(data)) {
    const percentage = (value / total) * 100;
    const arcLength = (percentage / 100) * circumference;
    
    // Вычисляем начальный и конечный углы
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + (percentage / 100) * 360) * Math.PI) / 180;
    
    // Координаты начала и конца дуги
    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);
    
    // Большой сегмент? (больше 180°)
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    // SVG path для сектора
    const path = `
      M 100,100
      L ${x1},${y1}
      A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2}
      Z
    `;
    
    svgHtml += `<path d="${path}" fill="${colors[i % colors.length]}" />`;
    
    startAngle += (percentage / 100) * 360;
    i++;
  }

  svgHtml += '</svg>';
  svgHtml += `<div class="donut-center">${total} ч</div>`;

  // Легенда
  let legendHtml = '<div class="donut-legend">';
  i = 0;
  for (const [label, value] of Object.entries(data)) {
    const percentage = ((value / total) * 100).toFixed(1);
    legendHtml += `
      <div class="donut-legend-item">
        <div class="donut-color-box" style="background-color:${colors[i % colors.length]}"></div>
        <span>${label}: ${percentage}%</span>
      </div>
    `;
    i++;
  }
  legendHtml += '</div>';

  return `<div class="donut-chart">${svgHtml}${legendHtml}</div>`;
}
// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
    function parseTime(timeStr) {
      if (!timeStr) return 0;
      const parts = timeStr.split(':').map(Number);
      if (parts.length !== 3) return 0;
      const [h, m, s] = parts;
      return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    }
    function formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    function formatTimeHours(seconds) {
      const hours = seconds / 3600;
      return hours.toFixed(1);
    }
    function parseCurrency(str) {
      if (!str || typeof str !== 'string') return 0;
      let clean = str.trim().replace(/^р\.\s*/i, '');
      clean = clean.replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    function formatCurrency(amount) {
      return `р.${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
    }
    function getHourFromTime(timeStr) {
      if (!timeStr) return null;
      const [h] = timeStr.split(':');
      return parseInt(h) || 0;
    }
    function isResponsible(position) {
      return position === 'Ответственный' || position === 'Ответсвенный';
    }
    function formatDateTime(date) {
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(date);
    }
    function calculateNormative(units, seconds) {
      if (seconds <= 0) return 0;
      const hours = seconds / 3600;
      return units / hours;
    }
    function parseDate(dateStr) {
      const [day, month, year] = dateStr.split('.').map(Number);
      return new Date(year, month - 1, day);
    }
    function formatDate(date) {
      return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    }
    // === ФУНКЦИЯ ДЛЯ ЧАСОВЫХ ИНТЕРВАЛОВ ===
    function getHourIntervalForWorkDay(timeStr, workDate) {
      if (!timeStr) return null;
      const hour = getHourFromTime(timeStr);
      if (hour === null) return null;
      if (hour < 9) {
        const displayStart = String(hour).padStart(2, '0');
        const displayEnd = String((hour + 1) % 24).padStart(2, '0');
        return {
          key: `${displayStart}-${displayEnd}`,
          display: `${displayStart}-${displayEnd} (ночь)`,
          shortDisplay: `${displayStart}–${displayEnd}`,
          isNight: true,
          sortKey: hour + 24
        };
      } else {
        const displayStart = String(hour).padStart(2, '0');
        const displayEnd = String(hour + 1).padStart(2, '0');
        return {
          key: `${displayStart}-${displayEnd}`,
          display: `${displayStart}-${displayEnd}`,
          shortDisplay: `${displayStart}–${displayEnd}`,
          isNight: false,
          sortKey: hour
        };
      }
    }
    // === ОСТАЛЬНОЙ JS БЕЗ ИЗМЕНЕНИЙ, КРОМЕ МЕСТ ИСПОЛЬЗОВАНИЯ shortDisplay ===
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
    const workTypeColors = {
      'Погрузка': '#FF6B6B',
      'Разгрузка': '#4ECDC4', 
      'Сортировка': '#45B7D1',
      'Упаковка': '#96CEB4',
      'Комплектация': '#FFEAA7',
      'Проверка': '#DDA0DD',
      'Маркировка': '#98D8C8',
      'Перемещение': '#F7DC6F',
      'Транспортировка': '#FFA726',
      'Сборка': '#AB47BC',
      'Распаковка': '#26C6DA',
      'Учет': '#66BB6A',
      'Инвентаризация': '#FFCA28',
      'Подготовка': '#78909C',
      'Обработка': '#EC407A',
      'Фасовка': '#8D6E63',
      'Контроль': '#42A5F5',
      'Отбор': '#7E57C2',
      'Стеллажирование': '#9CCC65',
      'Палетизация': '#FF7043',
      'Распределение': '#26A69A',
      'Стикеровка': '#5D4037',
      'Переупаковка': '#00897B',
      'По умолчанию': '#BBBBBB'
    };
    const chartLabels = {
      workTypes: {
        'Погрузка': 'Отгрузка',
        'Разгрузка': 'Главная обработка',
        'Сортировка': 'Упаковка продукции',
        'Упаковка': 'Стикеровка продукции',
        'Комплектация': 'Транспортировка',
        'Проверка': 'Работа с рекламациями',
        'Маркировка': 'Другие виды работ'
      },
      departments: {
        'Приемка': 'Отгрузка',
        'Отгрузка': 'МП',
        'Сортировка': 'Сборка',
        'Упаковка': 'Покупка'
      },
      timeIntervals: [
        '09:10', '10:11', '11:12', '12:13', '13:14', '14:15',
        '16:17', '17:18', '18:19'
      ],
      costDistribution: {
        'Погрузка': 'Главная обработка (23.2%)',
        'Разгрузка': 'Стикеровка продукции (22.7%)',
        'Сортировка': 'Другие виды работ (22.3%)',
        'Упаковка': 'Упаковка продукции (13.6%)',
        'Комплектация': 'Работа с рекламациями (10.9%)',
        'Проверка': 'Отгрузка (7.9%)'
      }
    };
	// ============================================
// Универсальная функция для работы с любым форматом JSON
// ============================================
function normalizeRecords(data) {
  // Новый компактный формат: есть поле "columns" + "data"
  if (data && data.columns && data.data) {
    return data.data.map(row => {
      const obj = {};
      data.columns.forEach((col, idx) => {
        obj[col] = row[idx] || '';
      });
      return obj;
    });
  }
  // Старый формат: массив объектов в "records"
  if (data && data.records && Array.isArray(data.records)) {
    return data.records;
  }
  // Резервный вариант
  return [];
}
    function getWorkTypeColor(workType) {
      if (workTypeColors[workType]) {
        return workTypeColors[workType];
      }
      let hash = 0;
      for (let i = 0; i < workType.length; i++) {
        hash = workType.charCodeAt(i) + ((hash << 5) - hash);
      }
      hash = Math.abs(hash);
      const colors = [
        '#FF9800', '#9C27B0', '#3F51B5', '#009688', '#795548',
        '#607D8B', '#E91E63', '#2196F3', '#4CAF50', '#FFC107',
        '#673AB7', '#00BCD4', '#8BC34A', '#FF5722', '#CDDC39',
        '#FFEB3B', '#03A9F4', '#8BC34A', '#FF9800', '#9C27B0'
      ];
      const color = colors[hash % colors.length];
      workTypeColors[workType] = color;
      return color;
    }
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
    function updateProgress(percent) {
      if (loadingProgress) {
        loadingProgress.style.width = percent + '%';
      }
    }
    async function loadStandards() {
      const standardsUrl = `${window.location.origin}/archive/standard%20fullData.json`;
      try {
        console.log('Загрузка нормативов из:', standardsUrl);
        const response = await fetch(`${standardsUrl}?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        const normalizedRecords = normalizeRecords(data);
        if (Array.isArray(normalizedRecords)) {
          standards = normalizedRecords.filter(record =>
            isResponsible(record['Должность']) && record['Норматив 1']
          );
          console.log('Загружено нормативов:', standards.length);
        }
      } catch (err) {
        console.error('Ошибка загрузки нормативов:', err);
        standards = [
          {
            "Направление": "Входящие",
            "Отдел": "Приемка",
            "Вид работ": "Разгрузка",
            "Группа товара": "Все",
            "Норматив 1": "120"
          },
          {
            "Направление": "Входящие",
            "Отдел": "Приемка", 
            "Вид работ": "Сортировка",
            "Группа товара": "Все",
            "Норматив 1": "80"
          },
          {
            "Направление": "Исходящие",
            "Отдел": "Отгрузка",
            "Вид работ": "Погрузка",
            "Группа товара": "Все",
            "Норматив 1": "100"
          }
        ];
      }
    }
    async function loadStaffData() {
  const staffUrl = `${window.location.origin}/archive/staff%20fullData.json`;
  try {
    console.log('Загрузка данных персонала из:', staffUrl);
    const response = await fetch(`${staffUrl}?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();
    staffData = normalizeRecords(data);
    console.log('Загружено записей персонала:', staffData.length);
  } catch (err) {
    console.error('Ошибка загрузки данных персонала:', err);
    staffData = [
      {"Сотрудник": "Иванов И.И.", "Статус": "Постоянный", "Отдел": "Приемка"},
      {"Сотрудник": "Петров П.П.", "Статус": "Постоянный", "Отдел": "Приемка"},
      {"Сотрудник": "Сидоров С.С.", "Статус": "Наемный", "Отдел": "Приемка"},
      {"Сотрудник": "Кузнецов К.К.", "Статус": "Постоянный", "Отдел": "Отгрузка"},
      {"Сотрудник": "Николаев Н.Н.", "Статус": "Постоянный", "Отдел": "Отгрузка"},
      {"Сотрудник": "Васильев В.В.", "Статус": "Наемный", "Отдел": "Сортировка"},
      {"Сотрудник": "Алексеев А.А.", "Статус": "Постоянный", "Отдел": "Сортировка"},
      {"Сотрудник": "Григорьев Г.Г.", "Статус": "Постоянный", "Отдел": "Упаковка"},
      {"Сотрудник": "Дмитриев Д.Д.", "Статус": "Наемный", "Отдел": "Упаковка"},
      {"Сотрудник": "Егоров Е.Е.", "Статус": "Постоянный", "Отдел": "Комплектация"}
    ];
  }
}
    function getStandardForWork(workType, productGroup = null) {
      if (productGroup) {
        const specificStandard = standards.find(standard =>
          standard['Вид работ'] === workType &&
          standard['Группа товара'] === productGroup
        );
        if (specificStandard) return parseFloat(specificStandard['Норматив 1']);
      }
      const generalStandard = standards.find(standard =>
        standard['Вид работ'] === workType
      );
      return generalStandard ? parseFloat(generalStandard['Норматив 1']) : 0;
    }
    function getDirectionAndDepartment(workType) {
      const standard = standards.find(s => s['Вид работ'] === workType);
      return {
        direction: standard?.['Направление'] || 'Не указано',
        department: standard?.['Отдел'] || 'Не указано'
      };
    }
    function analyzeStaffForRecords(records) {
      const uniqueEmployees = [...new Set(records.map(r => r['Сотрудник']))].filter(Boolean);
      let totalStaff = 0;
      let permanentStaff = 0;
      let hiredStaff = 0;
      let totalWorkTime = 0;
      let permanentWorkTime = 0;
      let hiredWorkTime = 0;
      const validRecords = records.filter(r => (parseInt(r['Количество единиц']) || 0) > 0);
      uniqueEmployees.forEach(employee => {
        const employeeRecords = validRecords.filter(r => r['Сотрудник'] === employee);
        const employeeWorkTime = employeeRecords.reduce((sum, r) => sum + parseTime(r['Рабочее время']), 0);
        const staffInfo = staffData.find(s => s['Сотрудник'] === employee);
        if (staffInfo) {
          totalStaff++;
          totalWorkTime += employeeWorkTime;
          if (staffInfo['Статус'] === 'Постоянный') {
            permanentStaff++;
            permanentWorkTime += employeeWorkTime;
          } else {
            hiredStaff++;
            hiredWorkTime += employeeWorkTime;
          }
        } else {
          totalStaff++;
          hiredStaff++;
          totalWorkTime += employeeWorkTime;
          hiredWorkTime += employeeWorkTime;
        }
      });
      return {
        total: totalStaff,
        permanent: permanentStaff,
        hired: hiredStaff,
        totalWorkTime: totalWorkTime,
        permanentWorkTime: permanentWorkTime,
        hiredWorkTime: hiredWorkTime
      };
    }
    function calculateTimesheetTime(records) {
      const uniqueEmployees = [...new Set(records.map(r => r['Сотрудник']))].filter(Boolean);
      let totalTimesheetTime = 0;
      uniqueEmployees.forEach(employee => {
        const employeeRecords = records.filter(r => r['Сотрудник'] === employee);
        const employeeTime = employeeRecords.reduce((sum, r) => sum + parseTime(r['Рабочее время']), 0);
        totalTimesheetTime += employeeTime;
      });
      return totalTimesheetTime;
    }
    function createTestData() {
      console.log('Создаем тестовые данные...');
      const testRecords = [];
      const workTypesFromStandards = [...new Set(standards.map(s => s['Вид работ']))];
      const workTypes = workTypesFromStandards.length > 0 ? workTypesFromStandards : 
        ['Погрузка', 'Разгрузка', 'Сортировка', 'Упаковка', 'Стикеровка', 'Перемещение'];
      const employees = ['Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Кузнецов К.К.', 'Николаев Н.Н.'];
      const productGroups = ['Диски', 'Шины', 'Аккумуляторы', 'Масла', 'Фильтры'];
      const today = new Date();
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(today);
        date.setDate(today.getDate() - dayOffset);
        const dateStr = formatDate(date);
        for (let i = 0; i < 25; i++) {
          const workType = workTypes[i % workTypes.length];
          const { direction, department } = getDirectionAndDepartment(workType);
          const productGroup = productGroups[i % productGroups.length];
          testRecords.push({
            'Рабочий день': dateStr,
            'Начало задачи': `${8 + (i % 10)}:${String(i % 60).padStart(2, '0')}:00`,
            'Вид работ': workType,
            'Группа товара': productGroup,
            'Должность': i % 3 === 0 ? 'Ответственный' : 'Сотрудник',
            'Сотрудник': employees[i % employees.length],
            'Поставка': `Поставка ${Math.floor(i / 3) + 1}`,
            'Количество единиц': (Math.random() * 100 + 50).toFixed(0),
            'Рабочее время': '01:00:00',
            'Расчетная сумма': `р.${(Math.random() * 1000 + 500).toFixed(2)}`,
            'Направление': direction,
            'Отдел': department
          });
        }
      }
      return testRecords;
    }
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
    
    // === НОВЫЙ ФРАГМЕНТ: Распределение трудозатрат ===
    const workTypeHours = {};
    records.forEach(record => {
      const workType = record['Вид работ'] || 'Не указано';
      const timeStr = record['Время по табелю'];
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
    
    // Ограничиваем до 6 основных видов работ
    const topWorkTypes = Object.entries(workTypeHours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    
    const donutData = Object.fromEntries(topWorkTypes);
    // Сохраняем данные для использования в initUI()
    window.donutChartData = donutData;
    // === КОНЕЦ НОВОГО ФРАГМЕНТА ===
    
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
    
    // === НОВЫЙ ФРАГМЕНТ: Тестовые данные для диаграммы ===
    const testDonutData = {
      'Комплектация': 42.5,
      'Упаковка': 23.2,
      'Погрузка': 15.8,
      'Администрация': 8.3,
      'Сборка': 6.1,
      'Транспортировка': 4.1
    };
    window.donutChartData = testDonutData;
    // === КОНЕЦ ТЕСТОВОГО ФРАГМЕНТА ===
    
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
    function getArchiveNameForDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
    function getArchiveUrl(archiveName) {
      const encodedName = encodeURIComponent(`${archiveName} fullData.json`);
      return `${window.location.origin}/archive/${encodedName}`;
    }
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
    function renderCalendar() {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
      calendarTitle.textContent = `${monthNames[month]} ${year}`;
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const firstDayOfWeek = firstDay.getDay();
      calendarDaysContainer.innerHTML = '';
      const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      dayNames.forEach(name => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = name;
        calendarDaysContainer.appendChild(header);
      });
      for (let i = 0; i < (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1); i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day disabled';
        calendarDaysContainer.appendChild(empty);
      }
      const availableDates = new Set(records.map(r => r['Рабочий день']));
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
        const hasData = availableDates.has(dateStr);
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day${hasData ? ' has-data' : ''}${dateStr === selectedDate ? ' selected' : ''}`;
        dayEl.textContent = day;
        if (hasData) {
          dayEl.addEventListener('click', () => {
            selectedDate = dateStr;
            renderReport();
          });
        } else {
          dayEl.classList.add('disabled');
        }
        calendarDaysContainer.appendChild(dayEl);
      }
      const lastDayOfWeek = lastDay.getDay();
      const remaining = 6 - (lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1);
      for (let i = 0; i < remaining; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day disabled';
        calendarDaysContainer.appendChild(empty);
      }
    }
    function renderReport() {
      if (!selectedDate) {
        selectedDateDiv.classList.add('hidden');
        hideAllLevels();
        return;
      }
      const allRecords = records.filter(r => r['Рабочий день'] === selectedDate);
      if (allRecords.length === 0) {
        selectedDateDiv.classList.add('hidden');
        hideAllLevels();
        return;
      }
      selectedDateDiv.classList.remove('hidden');
      currentDateSpan.textContent = selectedDate;
      showAllLevels();
      renderLevel1Analytics(allRecords);
      renderLevel2Analytics(allRecords);
      renderLevel3Analytics(allRecords);
    }
    function hideAllLevels() {
      document.getElementById('level-1').classList.add('hidden');
      document.getElementById('level-2').classList.add('hidden');
      document.getElementById('level-3').classList.add('hidden');
    }
    function showAllLevels() {
      document.getElementById('level-1').classList.remove('hidden');
      document.getElementById('level-2').classList.remove('hidden');
      document.getElementById('level-3').classList.remove('hidden');
    }
    function renderLevel1Analytics(allRecords) {
      const responsibleRecords = allRecords.filter(r => isResponsible(r['Должность']));
      renderCombinedAnalytics(allRecords, responsibleRecords);
      renderCharts(allRecords, responsibleRecords);
      renderWorkTypeCharts(allRecords, responsibleRecords);
    }
    function renderLevel2Analytics(allRecords) {
      const allDepartments = [...new Set(allRecords.map(r => r['Отдел']))].filter(Boolean);
      let html = '';
      if (!selectedDepartment) {
        html = `
          <div class="department-selector">
            <h4>🏛️ Выберите отдел для детального анализа</h4>
            <div class="department-buttons">
              ${allDepartments.map(dept => `
                <button class="department-btn" onclick="selectDepartment('${dept}')">${dept}</button>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        const departmentRecords = allRecords.filter(r => r['Отдел'] === selectedDepartment);
        const responsibleRecords = departmentRecords.filter(r => isResponsible(r['Должность']));
        let totalUnits = 0, totalTime = 0, totalAmount = 0, totalTasks = 0;
        responsibleRecords.forEach(r => {
          totalUnits += parseInt(r['Количество единиц']) || 0;
          totalTime += parseTime(r['Рабочее время']);
          totalTasks++;
        });
        departmentRecords.forEach(r => {
          totalAmount += parseCurrency(r['Расчетная сумма']);
        });
        const normative = calculateNormative(totalUnits, totalTime);
        const costPerUnit = totalUnits > 0 ? totalAmount / totalUnits : 0;
        const totalHours = totalTime / 3600;
        const revenuePerHour = totalHours > 0 ? totalAmount / totalHours : 0;
        const workTypes = [...new Set(departmentRecords.map(r => r['Вид работ']))];
        const brigades = [...new Set(responsibleRecords.map(r => r['Сотрудник']))];
        const staffAnalysis = analyzeStaffForRecords(departmentRecords);
        const timesheetTime = calculateTimesheetTime(departmentRecords);
        html = `
          <div style="margin-bottom: 15px;">
            <button class="department-btn active" style="margin-right: 10px;">${selectedDepartment}</button>
            <button class="department-btn" onclick="selectDepartment('')">← Назад к выбору отдела</button>
          </div>
          <div class="analytics-grid">
            <div class="analytics-card">
              <h4>📊 Основные показатели</h4>
              <div class="analytics-value">${totalUnits}</div>
              <p class="analytics-label">Обработано единиц</p>
              <div class="analytics-value">${totalTasks}</div>
              <p class="analytics-label">Выполнено задач</p>
              <div class="analytics-value">${brigades.length}</div>
              <p class="analytics-label">Работало бригад</p>
            </div>
            <div class="analytics-card">
              <h4>⚡ Эффективность</h4>
              <div class="analytics-value">${normative.toFixed(1)}</div>
              <p class="analytics-label">Норматив (шт/час)</p>
              <div class="analytics-value">${formatTime(totalTime)}</div>
              <p class="analytics-label">Общее время работы</p>
              <div class="analytics-value">${formatTime(timesheetTime)}</div>
              <p class="analytics-label">Время по табелю</p>
            </div>
            <div class="analytics-card">
              <h4>💰 Расходы</h4>
              <div class="analytics-value">${formatCurrency(totalAmount)}</div>
              <p class="analytics-label">Общие расходы</p>
              <div class="analytics-value">р.${costPerUnit.toFixed(2)}</div>
              <p class="analytics-label">Расходы на 1 ед.</p>
              <div class="analytics-value">${formatCurrency(revenuePerHour)}</div>
              <p class="analytics-label">Расходы в час</p>
            </div>
            <div class="analytics-card">
              <h4>👥 Персонал отдела</h4>
              <div class="analytics-value">${staffAnalysis.total}</div>
              <p class="analytics-label">Всего сотрудников</p>
              <div class="analytics-value">${staffAnalysis.permanent}</div>
              <p class="analytics-label">Постоянные</p>
              <div class="analytics-value">${staffAnalysis.hired}</div>
              <p class="analytics-label">Наемные</p>
              <div class="analytics-value">${formatTime(staffAnalysis.totalWorkTime)}</div>
              <p class="analytics-label">Общее время работы</p>
              <div style="font-size: 11px; color: #666; margin-top: 5px;">
                Постоянные: ${formatTime(staffAnalysis.permanentWorkTime)}<br>
                Наемные: ${formatTime(staffAnalysis.hiredWorkTime)}
              </div>
            </div>
            <div class="analytics-card">
              <h4>🏢 Структура</h4>
              <div class="analytics-value">${workTypes.length}</div>
              <p class="analytics-label">Видов работ</p>
              <div class="analytics-value">${departmentRecords.length}</div>
              <p class="analytics-label">Всего операций</p>
            </div>
          </div>
        `;
      }
      document.getElementById('departments-content').innerHTML = html;
    }
    function renderLevel3Analytics(allRecords) {
      const directionStats = {};
      const unclassifiedWorkTypes = new Set();
      allRecords.forEach(record => {
        const direction = record['Направление'] || 'Не указано';
        const department = record['Отдел'] || 'Не указано';
        const workType = record['Вид работ'] || 'Без вида работ';
        const productGroup = record['Группа товара'] || 'Все';
        if (direction === 'Не указано' || department === 'Не указано') {
          unclassifiedWorkTypes.add(workType);
          return;
        }
        if (!directionStats[direction]) {
          directionStats[direction] = {
            departments: {},
            totalUnits: 0,
            totalTime: 0,
            totalAmount: 0
          };
        }
        if (!directionStats[direction].departments[department]) {
          directionStats[direction].departments[department] = {
            workTypes: {},
            totalUnits: 0,
            totalTime: 0,
            totalAmount: 0
          };
        }
        if (!directionStats[direction].departments[department].workTypes[workType]) {
          directionStats[direction].departments[department].workTypes[workType] = {
            totalUnits: 0,
            totalTime: 0,
            totalAmount: 0,
            tasks: 0,
            responsibleTasks: 0,
            brigades: new Set(),
            productGroups: new Set(),
            standard: getStandardForWork(workType, productGroup),
            records: []
          };
        }
        const workTypeStats = directionStats[direction].departments[department].workTypes[workType];
        workTypeStats.records.push(record);
        if (isResponsible(record['Должность'])) {
          workTypeStats.totalUnits += parseInt(record['Количество единиц']) || 0;
          workTypeStats.totalTime += parseTime(record['Рабочее время']);
          workTypeStats.responsibleTasks++;
          if (record['Сотрудник']) {
            workTypeStats.brigades.add(record['Сотрудник']);
          }
        }
        workTypeStats.totalAmount += parseCurrency(record['Расчетная сумма']);
        workTypeStats.tasks++;
        if (productGroup && productGroup !== 'Все') {
          workTypeStats.productGroups.add(productGroup);
        }
        if (isResponsible(record['Должность'])) {
          directionStats[direction].departments[department].totalUnits += parseInt(record['Количество единиц']) || 0;
          directionStats[direction].departments[department].totalTime += parseTime(record['Рабочее время']);
        }
        directionStats[direction].departments[department].totalAmount += parseCurrency(record['Расчетная сумма']);
        if (isResponsible(record['Должность'])) {
          directionStats[direction].totalUnits += parseInt(record['Количество единиц']) || 0;
          directionStats[direction].totalTime += parseTime(record['Рабочее время']);
        }
        directionStats[direction].totalAmount += parseCurrency(record['Расчетная сумма']);
      });
      let html = '';
      if (unclassifiedWorkTypes.size > 0) {
        html += `
          <div class="warning-note">
            <strong>⚠️ Внимание:</strong> Следующие виды работ не показаны в аналитике, 
            так как у них не указаны направление или отдел: 
            <strong>${Array.from(unclassifiedWorkTypes).join(', ')}</strong>
          </div>
        `;
      }
      Object.entries(directionStats).forEach(([direction, dirStats]) => {
        html += `
          <div class="direction-group">
            <div class="direction-header" onclick="toggleDirection('${direction}')">
              <h4 class="direction-title">
                <span class="toggle-icon">▶</span> ${direction}
                <span style="font-size: 14px; color: #666; margin-left: 10px;">
                  (${dirStats.totalUnits} ед. | ${formatTime(dirStats.totalTime)} | ${formatCurrency(dirStats.totalAmount)})
                </span>
              </h4>
            </div>
            <div class="direction-content">
        `;
        Object.entries(dirStats.departments).forEach(([department, deptStats]) => {
          html += `
            <div class="department-group">
              <div class="department-subheader" onclick="toggleDepartment('${direction}', '${department}')">
                <h5 class="department-subtitle">
                  <span class="toggle-icon">▶</span> ${department}
                  <span style="font-size: 12px; color: #666; margin-left: 10px;">
                    (${deptStats.totalUnits} ед. | ${formatTime(deptStats.totalTime)} | ${formatCurrency(deptStats.totalAmount)})
                  </span>
                </h5>
              </div>
              <div class="department-content" id="dept-${direction}-${department}">
                <div class="work-types-grid">
          `;
          Object.entries(deptStats.workTypes).forEach(([workType, stats]) => {
            const totalHours = stats.totalTime / 3600;
            const normative = totalHours > 0 ? stats.totalUnits / totalHours : 0;
            const revenuePerHour = totalHours > 0 ? stats.totalAmount / totalHours : 0;
            const costPerUnit = stats.totalUnits > 0 ? stats.totalAmount / stats.totalUnits : 0;
            let performanceClass = 'performance-poor';
            let performanceText = 'Низкая';
            if (stats.standard > 0) {
              const percentage = (normative / stats.standard) * 100;
              if (percentage >= 90) {
                performanceClass = 'performance-good';
                performanceText = 'Высокая';
              } else if (percentage >= 70) {
                performanceClass = 'performance-average';
                performanceText = 'Средняя';
              }
              performanceText += ` (${percentage.toFixed(0)}%)`;
            }
            html += `
              <div class="work-type-card" onclick="showWorkTypeDetails('${workType}', '${selectedDate}')">
                <div class="work-type-header">
                  <h4 class="work-type-name">${workType}</h4>
                  <div class="${performanceClass} performance-indicator">
                    ${performanceText}
                  </div>
                </div>
                <div class="work-type-stats">
                  <div class="stat-item">
                    <div class="stat-value">${stats.totalUnits}</div>
                    <div class="stat-label">Единиц</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${stats.tasks}</div>
                    <div class="stat-label">Задач</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${stats.brigades.size}</div>
                    <div class="stat-label">Бригад</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${formatTime(stats.totalTime)}</div>
                    <div class="stat-label">Время</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${normative.toFixed(1)}</div>
                    <div class="stat-label">Норматив</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${formatCurrency(stats.totalAmount)}</div>
                    <div class="stat-label">Расходы</div>
                  </div>
                </div>
                <div style="margin-top: 10px; font-size: 11px; color: #666;">
                  ${stats.standard > 0 ? `План: ${stats.standard} шт/час | ` : ''}
                  Расходы на ед.: р.${costPerUnit.toFixed(2)} | 
                  Расходы/час: ${formatCurrency(revenuePerHour)} | 
                  Группы товаров: ${stats.productGroups.size}
                </div>
              </div>
            `;
          });
          html += `
                </div>
              </div>
            </div>
          `;
        });
        html += `
            </div>
          </div>
        `;
      });
      document.getElementById('work-types-content').innerHTML = html;
    }
    function renderCombinedAnalytics(allRecords, responsibleRecords) {
      let totalUnits = 0, totalTimeSec = 0, totalTasks = 0, totalAmount = 0;
      const uniqueResponsibles = [...new Set(responsibleRecords.map(r => r['Сотрудник']))];
      responsibleRecords.forEach(r => {
        totalUnits += parseInt(r['Количество единиц']) || 0;
        totalTimeSec += parseTime(r['Рабочее время']);
        totalTasks++;
      });
      allRecords.forEach(r => {
        totalAmount += parseCurrency(r['Расчетная сумма']);
      });
      const factNormative = calculateNormative(totalUnits, totalTimeSec);
      const totalHours = totalTimeSec / 3600;
      const avgRevenuePerHour = totalHours > 0 ? totalAmount / totalHours : 0;
      const costPerUnit = totalUnits > 0 ? totalAmount / totalUnits : 0;
      const uniqueWorkTypes = [...new Set(allRecords.map(r => r['Вид работ']))].filter(Boolean);
      const uniqueBrigades = [...new Set(responsibleRecords.map(r => r['Сотрудник']))];
      const uniqueDepartments = [...new Set(allRecords.map(r => r['Отдел']))].filter(Boolean);
      const staffAnalysis = analyzeStaffForRecords(allRecords);
      const timesheetTime = calculateTimesheetTime(allRecords);
      let html = `
        <div class="analytics-grid">
          <div class="analytics-card">
            <h4>📦 Производство</h4>
            <div class="analytics-value">${totalUnits}</div>
            <p class="analytics-label">Обработано единиц</p>
            <div class="analytics-value">${totalTasks}</div>
            <p class="analytics-label">Выполнено задач</p>
            <div class="analytics-value">${uniqueBrigades.length}</div>
            <p class="analytics-label">Работало бригад</p>
          </div>
          <div class="analytics-card">
            <h4>⚡ Эффективность</h4>
            <div class="analytics-value">${factNormative.toFixed(1)}</div>
            <p class="analytics-label">Норматив (шт/час)</p>
            <div class="analytics-value">${formatTime(totalTimeSec)}</div>
            <p class="analytics-label">Общее время работы</p>
            <div class="analytics-value">${formatTime(timesheetTime)}</div>
            <p class="analytics-label">Время по табелю</p>
          </div>
          <div class="analytics-card">
            <h4>💰 Расходы</h4>
            <div class="analytics-value">${formatCurrency(totalAmount)}</div>
            <p class="analytics-label">Общие расходы</p>
            <div class="analytics-value">р.${costPerUnit.toFixed(2)}</div>
            <p class="analytics-label">Расходы на 1 ед.</p>
            <div class="analytics-value">${formatCurrency(avgRevenuePerHour)}</div>
            <p class="analytics-label">Расходы в час</p>
          </div>
          <div class="analytics-card">
            <h4>👥 Персонал</h4>
            <div class="analytics-value">${staffAnalysis.total}</div>
            <p class="analytics-label">Всего сотрудников</p>
            <div class="analytics-value">${staffAnalysis.permanent}</div>
            <p class="analytics-label">Постоянные</p>
            <div class="analytics-value">${staffAnalysis.hired}</div>
            <p class="analytics-label">Наемные</p>
            <div class="analytics-value">${formatTime(staffAnalysis.totalWorkTime)}</div>
            <p class="analytics-label">Общее время работы</p>
            <div style="font-size: 11px; color: #666; margin-top: 5px;">
              Постоянные: ${formatTime(staffAnalysis.permanentWorkTime)}<br>
              Наемные: ${formatTime(staffAnalysis.hiredWorkTime)}
            </div>
          </div>
          <div class="analytics-card">
            <h4>🏢 Структура</h4>
            <div class="analytics-value">${uniqueDepartments.length}</div>
            <p class="analytics-label">Отделов</p>
            <div class="analytics-value">${uniqueWorkTypes.length}</div>
            <p class="analytics-label">Видов работ</p>
          </div>
        </div>
      `;
      html += renderComparisonAnalytics(selectedDate);
      document.getElementById('combined-content').innerHTML = html;
    }
function renderCharts(allRecords, responsibleRecords) {
  // === Сбор данных для всех графиков ===
  const workTypeData = {};
  const timeDistribution = {};
  const departmentData = {};
  const workTypeHours = {};

  // Собираем данные по трудозатратам
  allRecords.forEach(record => {
    const workType = record['Вид работ'] || 'Не указано';
    const timeStr = record['Время по табелю'];
    let hours = 0;
    
    if (timeStr && typeof timeStr === 'string') {
      const parts = timeStr.split(':').map(Number);
      if (parts.length >= 2) {
        const h = parts[0] || 0;
        const m = parts[1] || 0;
        hours = h + (m / 60);
      }
    }
    workTypeHours[workType] = (workTypeHours[workType] || 0) + hours;
  });

  // Исключаем "Рабочий день" и "Дополнительное время для работ" по умолчанию
  const excludedByDefault = ['Рабочий день', 'Дополнительное время для работ'];
  const allWorkTypes = Object.keys(workTypeHours).filter(type => !excludedByDefault.includes(type));
  
  // Сортируем по убыванию
  const sortedWorkTypes = allWorkTypes.sort((a, b) => workTypeHours[b] - workTypeHours[a]);
  
  // Ограничиваем до 10 видов работ для чекбоксов
  const topWorkTypes = sortedWorkTypes.slice(0, 10);

  // === Генерация HTML для фильтров ===
  let filterHtml = '<div class="donut-filters"><strong>Фильтр видов работ:</strong><br>';
  topWorkTypes.forEach(workType => {
    const displayName = chartLabels.workTypes[workType] || workType;
    const shortName = displayName.length > 20 ? displayName.substring(0, 20) + '...' : displayName;
    filterHtml += `
      <label class="donut-filter-item">
        <input type="checkbox" 
               class="work-type-checkbox" 
               data-worktype="${workType}" 
               checked>
        ${shortName}
      </label>
    `;
  });
  filterHtml += '</div>';

  // === Генерация данных для диаграммы (только выбранные) ===
  const initialDonutData = {};
  topWorkTypes.slice(0, 6).forEach(workType => {
    initialDonutData[workType] = workTypeHours[workType];
  });

  // === Остальные данные (для других графиков) ===
  responsibleRecords.forEach(record => {
    const workType = record['Вид работ'] || 'Без вида работ';
    if (!workTypeData[workType]) {
      workTypeData[workType] = { units: 0, time: 0, amount: 0 };
    }
    workTypeData[workType].units += parseInt(record['Количество единиц']) || 0;
    workTypeData[workType].time += parseTime(record['Рабочее время']);
    workTypeData[workType].amount += parseCurrency(record['Расчетная сумма']);
  });

  responsibleRecords.forEach(record => {
    const interval = getHourIntervalForWorkDay(record['Начало задачи'], selectedDate);
    if (!interval) return;
    if (!timeDistribution[interval.key]) {
      timeDistribution[interval.key] = { interval, units: 0, tasks: 0 };
    }
    timeDistribution[interval.key].units += parseInt(record['Количество единиц']) || 0;
    timeDistribution[interval.key].tasks++;
  });

  responsibleRecords.forEach(record => {
    const department = record['Отдел'] || 'Не указано';
    if (!departmentData[department]) {
      departmentData[department] = { units: 0, time: 0, amount: 0 };
    }
    departmentData[department].units += parseInt(record['Количество единиц']) || 0;
    departmentData[department].time += parseTime(record['Рабочее время']);
    departmentData[department].amount += parseCurrency(record['Расчетная сумма']);
  });

  // === Финальный HTML ===
  const html = `
    <div class="charts-grid">
      <!-- 1. Распределение трудозатрат -->
      <div class="chart-container">
        <h4 class="chart-title">📊 Распределение Трудозатрат</h4>
        <p>Структура фонда рабочего времени. Анализ показывает, что операции комплектации и упаковки потребляют большую часть ресурсов.</p>
        ${filterHtml}
        <div class="chart-real" id="donut-chart-container">
          ${renderDonutChart(initialDonutData)}
        </div>
      </div>

      <!-- Остальные графики -->
      <div class="chart-container">
        <h4 class="chart-title">📊 Распределение по видам работ</h4>
        <div class="chart-real">
          ${renderWorkTypeChart(workTypeData)}
        </div>
      </div>
      <div class="chart-container">
        <h4 class="chart-title">⏰ Активность по времени суток</h4>
        <div class="chart-real">
          ${renderTimeDistributionChart(timeDistribution)}
        </div>
      </div>
      <div class="chart-container">
        <h4 class="chart-title">🏢 Эффективность отделов</h4>
        <div class="chart-real">
          ${renderDepartmentChart(departmentData)}
        </div>
      </div>
    </div>
  `;

  document.getElementById('charts-content').innerHTML = html;
  
  // === Настраиваем обработчики чекбоксов ===
  setupDonutFilters(workTypeHours, topWorkTypes);
}

// === Новая функция: настройка фильтров ===
function setupDonutFilters(workTypeHours, allWorkTypes) {
  const checkboxes = document.querySelectorAll('.work-type-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // Собираем выбранные виды работ
      const selectedWorkTypes = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.worktype);
      
      // Ограничиваем до 6 видов работ для диаграммы
      const displayWorkTypes = selectedWorkTypes.slice(0, 6);
      
      if (displayWorkTypes.length === 0) {
        document.getElementById('donut-chart-container').innerHTML = '<div class="chart-placeholder">Выберите виды работ</div>';
        return;
      }
      
      // Формируем данные для диаграммы
      const donutData = {};
      displayWorkTypes.forEach(workType => {
        donutData[workType] = workTypeHours[workType];
      });
      
      // Обновляем диаграмму
      document.getElementById('donut-chart-container').innerHTML = renderDonutChart(donutData);
    });
  });
}

function renderDonutChart(donutData) {
  const total = Object.values(donutData).reduce((sum, v) => sum + v, 0);
  if (total === 0) return '<div class="chart-placeholder">Нет данных</div>';

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let startAngle = 0;
  let svgHtml = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">`;

  // Цвета для видов работ (можно расширить)
  const colors = [
    '#FF6B6B', // Красный — Главная сборка / Погрузка
    '#4ECDC4', // Бирюзовый — Сортировка / Разгрузка
    '#45B7D1', // Голубой — Упаковка / Транспортировка
    '#96CEB4', // Зелёный — Комплектация
    '#FFEAA7', // Жёлтый — Сборка A-зоны
    '#DDA0DD', // Фиолетовый — Другие виды работ
    '#AB47BC', // Темно-фиолетовый
    '#26C6DA'  // Светло-голубой
  ];

  let i = 0;
  for (const [label, value] of Object.entries(donutData)) {
    const percentage = (value / total) * 100;
    const arcLength = (percentage / 100) * circumference;
    
    // Вычисляем углы
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + percentage * 3.6) * Math.PI) / 180; // 360° / 100 = 3.6
    
    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);
    
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    // SVG path для сектора
    const path = `
      M 100,100
      L ${x1},${y1}
      A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2}
      Z
    `;
    
    svgHtml += `<path d="${path}" fill="${colors[i % colors.length]}" />`;
    
    startAngle += percentage * 3.6;
    i++;
  }

  svgHtml += '</svg>';
  
  // Центральный текст
  const centerText = `<div class="donut-center">${total.toFixed(0)} ч</div>`;
  
  // Легенда
  let legendHtml = '<div class="chart-legend">';
  i = 0;
  for (const [label, value] of Object.entries(donutData)) {
    const percentage = ((value / total) * 100).toFixed(1);
    const color = colors[i % colors.length];
    legendHtml += `
      <div class="chart-legend-item">
        <div class="legend-color" style="background-color:${color};"></div>
        <span>${label}: ${percentage}%</span>
      </div>
    `;
    i++;
  }
  legendHtml += '</div>';

  return `<div class="chart-pie">${svgHtml}${centerText}</div>${legendHtml}`;
}
    function renderWorkTypeCharts(allRecords, responsibleRecords) {
  const workTypeTimeStats = {};
  allRecords.forEach(record => {
    if (!isResponsible(record['Должность'])) return;
    const workType = record['Вид работ'] || 'Без вида работ';
    if (!workTypeTimeStats[workType]) {
      workTypeTimeStats[workType] = {
        totalUnits: 0,
        timeIntervals: {}
      };
    }
    workTypeTimeStats[workType].totalUnits += parseInt(record['Количество единиц']) || 0;
  });
  allRecords.forEach(record => {
    if (!isResponsible(record['Должность'])) return;
    const workType = record['Вид работ'] || 'Без вида работ';
    const interval = getHourIntervalForWorkDay(record['Начало задачи'], selectedDate);
    if (!interval) return;
    if (!workTypeTimeStats[workType].timeIntervals[interval.key]) {
      workTypeTimeStats[workType].timeIntervals[interval.key] = {
        interval: interval,
        units: 0
      };
    }
    workTypeTimeStats[workType].timeIntervals[interval.key].units += parseInt(record['Количество единиц']) || 0;
  });

  // Определяем правильную последовательность видов работ
  const workTypeOrder = [
    'Сборка А-зона',
	'Главная сборка',
    'Стикеровка Шины',
	  
	'Сборка Диски',
    'Стикеровка Диски',
	  
    'Упаковка паллеты',
    'Транспортировка товара по складу',
    'Отгрузка',
	'Погрузка',
	'Погрузка МП',
	  
    'Работа с расхождениями',
	'Оптимизация', 
	'Цикличная инвентаризация',
	  
    'Другие виды работ',
    'Главная обработка',
    'Переупаковка паллеты'
  ];

  let html = '<div class="charts-grid">';
  
  // Сначала отображаем виды работ в указанной последовательности
  workTypeOrder.forEach(workType => {
    const stats = workTypeTimeStats[workType];
    if (!stats || stats.totalUnits === 0) return;
    
    const sortedIntervals = Object.values(stats.timeIntervals).sort((a, b) => a.interval.sortKey - b.interval.sortKey);
    const maxUnits = Math.max(...sortedIntervals.map(timeStat => timeStat.units));

    html += `
      <div class="chart-container">
        <h4 class="chart-title">${workType}</h4>
        <div class="chart-real">
          <div class="chart-bar">
    `;
    sortedIntervals.forEach(timeStat => {
      const heightPercent = maxUnits > 0 ? (timeStat.units / maxUnits) * 100 : 0;
      const percentage = (timeStat.units / stats.totalUnits) * 100;
      html += `
        <div class="chart-bar-item" 
             style="height: ${heightPercent}%; background-color: ${getWorkTypeColor(workType)}"
             title="${timeStat.interval.display}: ${timeStat.units} ед. (${percentage.toFixed(1)}%)">
        </div>
      `;
    });
    html += `
          </div>
          <div class="chart-bar-labels" style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 10px; color: #666; text-align: center;">
    `;
    sortedIntervals.forEach(timeStat => {
      const label = timeStat.interval.shortDisplay;
      html += `<div style="flex: 1; min-width: 0; word-break: break-all;">${label}</div>`;
    });
    html += `
          </div>
          <div style="text-align: center; font-size: 11px; color: #666; margin-top: 5px;">
            Всего: ${stats.totalUnits} ед.
          </div>
        </div>
      </div>
    `;
  });

  // Затем отображаем остальные виды работ, которых нет в основном списке
  Object.entries(workTypeTimeStats).forEach(([workType, stats]) => {
    if (workTypeOrder.includes(workType) || stats.totalUnits === 0) return;
    
    const sortedIntervals = Object.values(stats.timeIntervals).sort((a, b) => a.interval.sortKey - b.interval.sortKey);
    const maxUnits = Math.max(...sortedIntervals.map(timeStat => timeStat.units));

    html += `
      <div class="chart-container">
        <h4 class="chart-title">${workType}</h4>
        <div class="chart-real">
          <div class="chart-bar">
    `;
    sortedIntervals.forEach(timeStat => {
      const heightPercent = maxUnits > 0 ? (timeStat.units / maxUnits) * 100 : 0;
      const percentage = (timeStat.units / stats.totalUnits) * 100;
      html += `
        <div class="chart-bar-item" 
             style="height: ${heightPercent}%; background-color: ${getWorkTypeColor(workType)}"
             title="${timeStat.interval.display}: ${timeStat.units} ед. (${percentage.toFixed(1)}%)">
        </div>
      `;
    });
    html += `
          </div>
          <div class="chart-bar-labels" style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 10px; color: #666; text-align: center;">
    `;
    sortedIntervals.forEach(timeStat => {
      const label = timeStat.interval.shortDisplay;
      html += `<div style="flex: 1; min-width: 0; word-break: break-all;">${label}</div>`;
    });
    html += `
          </div>
          <div style="text-align: center; font-size: 11px; color: #666; margin-top: 5px;">
            Всего: ${stats.totalUnits} ед.
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  document.getElementById('work-type-charts-content').innerHTML = html;
}
    function renderWorkTypeChart(workTypeData) {
  const sortedWorkTypes = Object.entries(workTypeData)
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 8);
  const maxUnits = Math.max(...sortedWorkTypes.map(([_, data]) => data.units));
  let html = '<div class="chart-bar">';
  sortedWorkTypes.forEach(([workType, data]) => {
    const heightPercent = maxUnits > 0 ? (data.units / maxUnits) * 100 : 0;
    const normative = data.time > 0 ? calculateNormative(data.units, data.time) : 0;
    const displayName = chartLabels.workTypes[workType] || workType;
    const shortName = displayName.length > 12 ? displayName.substring(0, 10) + '...' : displayName;
    const tooltipText = `${displayName}: ${data.units} ед. (${normative.toFixed(1)} шт/час)`;
    
    html += `
      <div class="chart-bar-item"
           style="height: ${heightPercent}%; background-color: ${getWorkTypeColor(workType)}"
           data-tooltip="${tooltipText}"
           onmouseenter="showTooltip(event, this)"
           onmouseleave="hideTooltip()">
      </div>
    `;
  });
  html += '</div><div class="chart-bar-labels">';
  sortedWorkTypes.forEach(([workType, data]) => {
    const displayName = chartLabels.workTypes[workType] || workType;
    const shortName = displayName.length > 12 ? displayName.substring(0, 10) + '...' : displayName;
    html += `<div class="chart-bar-label">${shortName}</div>`;
  });
  html += '</div>';
  return html;
}
    function renderTimeDistributionChart(timeDistribution) {
  const sortedIntervals = Object.values(timeDistribution)
    .sort((a, b) => a.interval.sortKey - b.interval.sortKey);
  const maxUnits = Math.max(...sortedIntervals.map(stats => stats.units));
  let html = '<div class="chart-bar">';
  sortedIntervals.forEach(stats => {
    const heightPercent = maxUnits > 0 ? (stats.units / maxUnits) * 100 : 0;
    const color = stats.interval.isNight ? '#5c6bc0' : '#2196f3';
    const tooltipText = `${stats.interval.display}: ${stats.units} ед.`;
    
    html += `
      <div class="chart-bar-item"
           style="height: ${heightPercent}%; background-color: ${color}"
           data-tooltip="${tooltipText}"
           onmouseenter="showTooltip(event, this)"
           onmouseleave="hideTooltip()">
      </div>
    `;
  });
  html += `
  </div>
  <div class="chart-bar-labels" style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 10px; color: #666; text-align: center;">
  `;
  sortedIntervals.forEach(stats => {
    const label = stats.interval.shortDisplay;
    html += `<div style="flex: 1; min-width: 0; word-break: break-all;">${label}</div>`;
  });
  html += `</div>`;
  return html;
}
    function renderDepartmentChart(departmentData) {
  const sortedDepartments = Object.entries(departmentData)
    .filter(([dept]) => dept !== 'Не указано')
    .sort((a, b) => {
      const normativeA = a[1].time > 0 ? calculateNormative(a[1].units, a[1].time) : 0;
      const normativeB = b[1].time > 0 ? calculateNormative(b[1].units, b[1].time) : 0;
      return normativeB - normativeA;
    })
    .slice(0, 6);
  const maxNormative = Math.max(...sortedDepartments.map(([_, data]) => {
    return data.time > 0 ? calculateNormative(data.units, data.time) : 0;
  }));
  let html = '<div class="chart-bar">';
  sortedDepartments.forEach(([department, data]) => {
    const normative = data.time > 0 ? calculateNormative(data.units, data.time) : 0;
    const heightPercent = maxNormative > 0 ? (normative / maxNormative) * 100 : 0;
    const displayName = chartLabels.departments[department] || department;
    const shortName = displayName.length > 10 ? displayName.substring(0, 8) + '...' : displayName;
    const tooltipText = `${displayName}: ${normative.toFixed(1)} шт/час`;
    
    html += `
      <div class="chart-bar-item"
           style="height: ${heightPercent}%; background-color: #4caf50"
           data-tooltip="${tooltipText}"
           onmouseenter="showTooltip(event, this)"
           onmouseleave="hideTooltip()">
      </div>
    `;
  });
  html += '</div><div class="chart-bar-labels">';
  sortedDepartments.forEach(([department, data]) => {
    const displayName = chartLabels.departments[department] || department;
    const shortName = displayName.length > 10 ? displayName.substring(0, 8) + '...' : displayName;
    const normative = data.time > 0 ? calculateNormative(data.units, data.time) : 0;
    html += `<div class="chart-bar-label" title="${normative.toFixed(1)} шт/час">${shortName}</div>`;
  });
  html += '</div>';
  return html;
}
    function renderCostDistributionChart(costDistribution) {
      const sortedCosts = Object.entries(costDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      const totalCost = sortedCosts.reduce((sum, [_, amount]) => sum + amount, 0);
      let html = '<div class="chart-pie">';
      let currentAngle = 0;
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
      sortedCosts.forEach(([workType, amount], index) => {
        const percentage = totalCost > 0 ? (amount / totalCost) * 100 : 0;
        const angle = (percentage / 100) * 360;
        const color = colors[index % colors.length];
        const displayName = chartLabels.costDistribution[workType] || workType;
        html += `
          <div style="
            position: absolute;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: conic-gradient(
              ${color} ${currentAngle}deg ${currentAngle + angle}deg,
              transparent ${currentAngle + angle}deg 360deg
            );
          "></div>
        `;
        currentAngle += angle;
      });
      html += '</div><div class="chart-legend">';
      sortedCosts.forEach(([workType, amount], index) => {
        const percentage = totalCost > 0 ? (amount / totalCost) * 100 : 0;
        const displayName = chartLabels.costDistribution[workType] || workType;
        const shortName = displayName.length > 20 ? displayName.substring(0, 18) + '...' : displayName;
        html += `
          <div class="chart-legend-item">
            <div class="legend-color" style="background-color: ${colors[index % colors.length]}"></div>
            <span>${shortName}</span>
          </div>
        `;
      });
      html += '</div>';
      return html;
    }
    function renderComparisonAnalytics(currentDate) {
      const currentDateObj = parseDate(currentDate);
      const previousDates = [];
      for (let i = 1; i <= 7; i++) {
        const date = new Date(currentDateObj);
        date.setDate(currentDateObj.getDate() - i);
        const dateStr = formatDate(date);
        previousDates.push({ date: dateStr, records: records.filter(r => r['Рабочий день'] === dateStr) });
      }
      const currentDayRecords = records.filter(r => r['Рабочий день'] === currentDate);
      const currentResponsibleRecords = currentDayRecords.filter(r => isResponsible(r['Должность']));
      let currentUnits = 0, currentTime = 0, currentAmount = 0;
      currentResponsibleRecords.forEach(r => {
        currentUnits += parseInt(r['Количество единиц']) || 0;
        currentTime += parseTime(r['Рабочее время']);
      });
      currentDayRecords.forEach(r => {
        currentAmount += parseCurrency(r['Расчетная сумма']);
      });
      const currentNormative = calculateNormative(currentUnits, currentTime);
      const currentCostPerUnit = currentUnits > 0 ? currentAmount / currentUnits : 0;
      let html = '<h4 style="margin: 20px 0 15px 0; color: #333;">📈 Сравнение с предыдущими днями</h4><div class="comparison-grid">';
      const previousUnits = previousDates.map(d => {
        const respRecords = d.records.filter(r => isResponsible(r['Должность']));
        return respRecords.reduce((sum, r) => sum + (parseInt(r['Количество единиц']) || 0), 0);
      }).filter(val => val > 0);
      const avgUnits = previousUnits.length > 0 ? previousUnits.reduce((a, b) => a + b) / previousUnits.length : 0;
      const unitsTrend = currentUnits - avgUnits;
      const unitsPercent = avgUnits > 0 ? ((unitsTrend / avgUnits) * 100).toFixed(1) : 0;
      const unitsIsGood = unitsTrend >= 0;
      html += `
        <div class="comparison-card">
          <h4>📦 Единицы</h4>
          <div class="analytics-value">${currentUnits}</div>
          <p class="analytics-label">Сегодня</p>
          <div class="analytics-value ${unitsIsGood ? 'trend-up' : 'trend-down'}">
            ${unitsIsGood ? '↗' : '↘'} ${Math.abs(unitsPercent)}%
          </div>
          <p class="analytics-label">Среднее: ${avgUnits.toFixed(0)}</p>
        </div>
      `;
      const previousNorms = previousDates.map(d => {
        const respRecords = d.records.filter(r => isResponsible(r['Должность']));
        const units = respRecords.reduce((sum, r) => sum + (parseInt(r['Количество единиц']) || 0), 0);
        const time = respRecords.reduce((sum, r) => sum + parseTime(r['Рабочее время']), 0);
        return calculateNormative(units, time);
      }).filter(val => val > 0);
      const avgNorm = previousNorms.length > 0 ? previousNorms.reduce((a, b) => a + b) / previousNorms.length : 0;
      const normTrend = currentNormative - avgNorm;
      const normPercent = avgNorm > 0 ? ((normTrend / avgNorm) * 100).toFixed(1) : 0;
      const normIsGood = normTrend >= 0;
      html += `
        <div class="comparison-card">
          <h4>⚡ Норматив</h4>
          <div class="analytics-value">${currentNormative.toFixed(1)}</div>
          <p class="analytics-label">Сегодня (шт/час)</p>
          <div class="analytics-value ${normIsGood ? 'trend-up' : 'trend-down'}">
            ${normIsGood ? '↗' : '↘'} ${Math.abs(normPercent)}%
          </div>
          <p class="analytics-label">Среднее: ${avgNorm.toFixed(1)}</p>
        </div>
      `;
      const previousAmounts = previousDates.map(d => 
        d.records.reduce((sum, r) => sum + parseCurrency(r['Расчетная сумма']), 0)
      ).filter(val => val > 0);
      const avgAmount = previousAmounts.length > 0 ? previousAmounts.reduce((a, b) => a + b) / previousAmounts.length : 0;
      const amountTrend = currentAmount - avgAmount;
      const amountPercent = avgAmount > 0 ? ((amountTrend / avgAmount) * 100).toFixed(1) : 0;
      const amountIsGood = amountTrend < 0;
      const previousCosts = previousDates.map(d => {
        const respRecords = d.records.filter(r => isResponsible(r['Должность']));
        const units = respRecords.reduce((sum, r) => sum + (parseInt(r['Количество единиц']) || 0), 0);
        const amount = d.records.reduce((sum, r) => sum + parseCurrency(r['Расчетная сумма']), 0);
        return units > 0 ? amount / units : 0;
      }).filter(val => val > 0);
      const avgCost = previousCosts.length > 0 ? previousCosts.reduce((a, b) => a + b) / previousCosts.length : 0;
      const costTrend = currentCostPerUnit - avgCost;
      const costPercent = avgCost > 0 ? ((costTrend / avgCost) * 100).toFixed(1) : 0;
      const costIsGood = costTrend < 0;
      html += `
        <div class="comparison-card">
          <h4>💰 Расходы</h4>
          <div class="analytics-value">${formatCurrency(currentAmount)}</div>
          <p class="analytics-label">Сегодня</p>
          <div class="analytics-value ${amountIsGood ? 'trend-up' : 'trend-down'}">
            ${amountIsGood ? '↗' : '↘'} ${Math.abs(amountPercent)}%
          </div>
          <p class="analytics-label">Среднее: ${formatCurrency(avgAmount)}</p>
        </div>
        <div class="comparison-card">
          <h4>💵 Расходы на ед.</h4>
          <div class="analytics-value">р.${currentCostPerUnit.toFixed(2)}</div>
          <p class="analytics-label">Сегодня</p>
          <div class="analytics-value ${costIsGood ? 'trend-up' : 'trend-down'}">
            ${costIsGood ? '↗' : '↘'} ${Math.abs(costPercent)}%
          </div>
          <p class="analytics-label">Среднее: р.${avgCost.toFixed(2)}</p>
        </div>
      `;
      html += '</div>';
      return html;
    }
    function toggleDirection(direction) {
      let directionEl = null;
      document.querySelectorAll('.direction-title').forEach(el => {
        if (el.textContent.includes(direction)) {
          directionEl = el.closest('.direction-group');
        }
      });
      if (!directionEl) return;
      const content = directionEl.querySelector('.direction-content');
      const icon = directionEl.querySelector('.toggle-icon');
      if (!content.style.display || content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
      } else {
        content.style.display = 'none';
        icon.textContent = '▶';
      }
    }
    function toggleDepartment(direction, department) {
      const deptContent = document.getElementById(`dept-${direction}-${department}`);
      if (!deptContent) return;
      const departmentEl = deptContent.closest('.department-group');
      const icon = departmentEl.querySelector('.toggle-icon');
      if (!deptContent.style.display || deptContent.style.display === 'none') {
        deptContent.style.display = 'block';
        icon.textContent = '▼';
      } else {
        deptContent.style.display = 'none';
        icon.textContent = '▶';
      }
    }
    function selectDepartment(department) {
      selectedDepartment = department;
      const allRecords = records.filter(r => r['Рабочий день'] === selectedDate);
      renderLevel2Analytics(allRecords);
    }
    function showWorkTypeDetails(workType, date) {
      const allRecords = records.filter(r => r['Рабочий день'] === date && r['Вид работ'] === workType);
      const responsibleRecords = allRecords.filter(r => isResponsible(r['Должность']));
      let totalUnits = 0, totalTime = 0, totalAmount = 0, totalTasks = 0;
      responsibleRecords.forEach(r => {
        totalUnits += parseInt(r['Количество единиц']) || 0;
        totalTime += parseTime(r['Рабочее время']);
        totalTasks++;
      });
      allRecords.forEach(r => {
        totalAmount += parseCurrency(r['Расчетная сумма']);
      });
      const normative = calculateNormative(totalUnits, totalTime);
      const costPerUnit = totalUnits > 0 ? totalAmount / totalUnits : 0;
      const standard = getStandardForWork(workType);
      const { direction, department } = getDirectionAndDepartment(workType);
      const brigades = [...new Set(responsibleRecords.map(r => r['Сотрудник']))];
      const productGroups = [...new Set(allRecords.map(r => r['Группа товара']))];
      const supplies = [...new Set(allRecords.map(r => r['Поставка']))];
      let html = `
        <h3>🔍 Детализация по виду работ: ${workType}</h3>
        <p><strong>Дата:</strong> ${date}</p>
        <p><strong>Направление:</strong> ${direction} | <strong>Отдел:</strong> ${department}</p>
        <div class="analytics-grid" style="margin: 15px 0;">
          <div class="analytics-card">
            <h4>📊 Основные показатели</h4>
            <div class="analytics-value">${totalUnits}</div>
            <p class="analytics-label">Всего единиц</p>
            <div class="analytics-value">${totalTasks}</div>
            <p class="analytics-label">Задач</p>
            <div class="analytics-value">${brigades.length}</div>
            <p class="analytics-label">Бригад</p>
          </div>
          <div class="analytics-card">
            <h4>⚡ Эффективность</h4>
            <div class="analytics-value">${normative.toFixed(1)}</div>
            <p class="analytics-label">Норматив (шт/час)</p>
            <div class="analytics-value">${formatTime(totalTime)}</div>
            <p class="analytics-label">Время работы</p>
            <div class="analytics-value">${(totalTime / 3600).toFixed(1)}</div>
            <p class="analytics-label">Отработано часов</p>
          </div>
          <div class="analytics-card>
            <h4>💰 Расходы</h4>
            <div class="analytics-value">${formatCurrency(totalAmount)}</div>
            <p class="analytics-label">Общие расходы</p>
            <div class="analytics-value">р.${costPerUnit.toFixed(2)}</div>
            <p class="analytics-label">Расходы на 1 ед.</p>
            <div class="analytics-value">${formatCurrency(totalAmount / (totalTime / 3600))}</div>
            <p class="analytics-label">Расходы в час</p>
          </div>
        </div>
        ${standard > 0 ? `
        <div style="background: #e8f5e9; padding: 10px; border-radius: 6px; margin: 15px 0;">
          <h4>🎯 Выполнение плана</h4>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="flex: 1; background: #e0e0e0; border-radius: 10px; height: 20px;">
              <div style="background: #4caf50; height: 100%; border-radius: 10px; width: ${Math.min((normative / standard) * 100, 100)}%;"></div>
            </div>
            <div style="font-weight: bold;">
              ${((normative / standard) * 100).toFixed(1)}%
            </div>
          </div>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">
            Факт: ${normative.toFixed(1)} шт/час | План: ${standard} шт/час
          </div>
        </div>
        ` : ''}
        <h4>👥 Работа бригад</h4>
        <div class="grouping-grid">
      `;
      const brigadeStats = {};
      responsibleRecords.forEach(record => {
        const brigade = record['Сотрудник'] || 'Не указано';
        const supply = record['Поставка'] || 'Без поставки';
        if (!brigadeStats[brigade]) {
          brigadeStats[brigade] = {
            units: 0,
            time: 0,
            tasks: 0,
            amount: 0,
            supplies: {}
          };
        }
        brigadeStats[brigade].units += parseInt(record['Количество единиц']) || 0;
        brigadeStats[brigade].time += parseTime(record['Рабочее время']);
        brigadeStats[brigade].tasks++;
        brigadeStats[brigade].amount += parseCurrency(record['Расчетная сумма']);
        if (!brigadeStats[brigade].supplies[supply]) {
          brigadeStats[brigade].supplies[supply] = {
            units: 0,
            time: 0,
            helpers: []
          };
        }
        brigadeStats[brigade].supplies[supply].units += parseInt(record['Количество единиц']) || 0;
        brigadeStats[brigade].supplies[supply].time += parseTime(record['Рабочее время']);
        const supplyRecords = allRecords.filter(r => 
          r['Поставка'] === supply && 
          r['Вид работ'] === workType &&
          !isResponsible(r['Должность'])
        );
        supplyRecords.forEach(helperRecord => {
          if (!brigadeStats[brigade].supplies[supply].helpers.find(h => h.name === helperRecord['Сотрудник'])) {
            brigadeStats[brigade].supplies[supply].helpers.push({
              name: helperRecord['Сотрудник'],
              role: helperRecord['Должность'] || 'Сотрудник'
            });
          }
        });
      });
      Object.entries(brigadeStats).forEach(([brigade, stats]) => {
        const brigadeNormative = stats.time > 0 ? calculateNormative(stats.units, stats.time) : 0;
        const brigadeCostPerUnit = stats.units > 0 ? stats.amount / stats.units : 0;
        html += `
          <div class="group-card">
            <h5>${brigade}</h5>
            <div class="group-stats">
              <div class="group-stat-item">
                <div class="group-stat-value">${stats.units}</div>
                <div class="group-stat-label">Единиц</div>
              </div>
              <div class="group-stat-item">
                <div class="group-stat-value">${stats.tasks}</div>
                <div class="group-stat-label">Задач</div>
              </div>
              <div class="group-stat-item">
                <div class="group-stat-value">${brigadeNormative.toFixed(1)}</div>
                <div class="group-stat-label">Норматив</div>
              </div>
              <div class="group-stat-item">
                <div class="group-stat-value">р.${brigadeCostPerUnit.toFixed(2)}</div>
                <div class="group-stat-label">Расходы на ед.</div>
              </div>
              <div class="group-stat-item">
                <div class="group-stat-value">${formatTime(stats.time)}</div>
                <div class="group-stat-label">Время</div>
              </div>
              <div class="group-stat-item">
                <div class="group-stat-value">${formatCurrency(stats.amount)}</div>
                <div class="group-stat-label">Расходы</div>
              </div>
            </div>
            <div style="margin-top: 10px;">
              <h6>Поставки:</h6>
              ${Object.entries(stats.supplies).map(([supply, supplyData]) => `
                <div class="supply-details-expanded">
                  <div class="supply-header">${supply} (${supplyData.units} ед. | ${formatTime(supplyData.time)})</div>
                  ${supplyData.helpers.length > 0 ? `
                    <div class="helper-list">
                      <strong>Помощники:</strong>
                      ${supplyData.helpers.map(helper => `
                        <div class="helper-item">
                          <span class="helper-name">${helper.name}</span>
                          <span class="helper-role">${helper.role}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : '<div style="font-size: 11px; color: #999;">Нет помощников</div>'}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });
      html += `</div>`;
      document.getElementById('worktype-modal-content').innerHTML = html;
      document.getElementById('worktype-modal').style.display = 'block';
    }
    function closeModal(modalId) {
      document.getElementById(modalId).style.display = 'none';
    }
    function exportToExcel() {
      alert('Функция экспорта будет реализована позже');
    }
    document.addEventListener('DOMContentLoaded', function() {
      currentArchive = getArchiveNameForDate(new Date());
      loadData();
    });
