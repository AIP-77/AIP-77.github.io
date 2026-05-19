import { normalizeRecords, isResponsible, formatDateTime, formatDate, parseTime } from './utils.js';

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ ===
let standards = [];
let staffData = [];

// === ЭКСПОРТ ПЕРЕМЕННЫХ ===
export function getStandards() {
  return standards;
}

export function setStandards(value) {
  standards = value;
}

export function getStaffData() {
  return staffData;
}

export function setStaffData(value) {
  staffData = value;
}

// === ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ ===

export function getStandardForWork(workType, productGroup = null) {
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

export function analyzeStaffForRecords(records) {
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

export function calculateTimesheetTime(records) {
  const uniqueEmployees = [...new Set(records.map(r => r['Сотрудник']))].filter(Boolean);
  let totalTimesheetTime = 0;
  uniqueEmployees.forEach(employee => {
    const employeeRecords = records.filter(r => r['Сотрудник'] === employee);
    const employeeTime = employeeRecords.reduce((sum, r) => sum + parseTime(r['Рабочее время']), 0);
    totalTimesheetTime += employeeTime;
  });
  return totalTimesheetTime;
}

export function createTestData() {
  console.log('Создаем тестовые данные...');
  const testRecords = [];
  const workTypes = ['Погрузка', 'Разгрузка', 'Сортировка', 'Упаковка', 'Стикеровка', 'Перемещение'];
  const employees = ['Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Кузнецов К.К.', 'Николаев Н.Н.'];
  const productGroups = ['Диски', 'Шины', 'Аккумуляторы', 'Масла', 'Фильтры'];
  const today = new Date();
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    const dateStr = formatDate(date);
    for (let i = 0; i < 25; i++) {
      const workType = workTypes[i % workTypes.length];
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
        'Направление': workType === 'Погрузка' ? 'Исходящие' : 'Входящие',
        'Отдел': workType === 'Погрузка' ? 'Отгрузка' : 'Приемка'
      });
    }
  }

  // Создаем тестовые нормативы
  standards = [
    { 'Вид работ': 'Погрузка', 'Норматив': 50 },
    { 'Вид работ': 'Разгрузка', 'Норматив': 45 },
    { 'Вид работ': 'Сортировка', 'Норматив': 60 },
    { 'Вид работ': 'Упаковка', 'Норматив': 40 },
    { 'Вид работ': 'Стикеровка', 'Норматив': 80 },
    { 'Вид работ': 'Перемещение', 'Норматив': 70 }
  ];

  return testRecords;
}

export function getArchiveNameForDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getArchiveUrl(archiveName) {
  const encodedName = encodeURIComponent(`${archiveName} fullData.json`);
  return `${window.location.origin}/archive/${encodedName}`;
}

// === ПОЛУЧЕНИЕ ПОСЛЕДНЕЙ ДОСТУПНОЙ ДАТЫ ===
export async function getLastAvailableDate() {
  const currentArchive = getArchiveNameForDate(new Date());
  const url = getArchiveUrl(currentArchive);

  try {
    const response = await fetch(`${url}?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const normalizedData = normalizeRecords(data);

    const uniqueDates = [...new Set(normalizedData.map(r => r['Рабочий день']))].filter(Boolean);
    if (uniqueDates.length > 0) {
      uniqueDates.sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('.').map(Number);
        const [dayB, monthB, yearB] = b.split('.').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateB - dateA;
      });
      return uniqueDates[0];
    }
  } catch (err) {
    console.log('Не удалось получить данные для определения последней даты:', err.message);
  }

  return formatDate(new Date());
}

// === ЗАГРУЗКА ДАННЫХ ===
export async function loadData(dateStr, uiCallbacks) {
  const {
    loadingDiv,
    errorDiv,
    controlsDiv,
    lastUpdatedDiv,
    updateProgress,
    initUI
  } = uiCallbacks;

  const dateToUse = dateStr ? new Date(dateStr.split('.').reverse().join('-')) : new Date();
  const currentArchive = getArchiveNameForDate(dateToUse);
  const url = getArchiveUrl(currentArchive);

  try {
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    controlsDiv.classList.add('hidden');

    updateProgress(10);

    // Загрузка нормативов
    const standardsUrl = `${window.location.origin}/archive/standard.json`;
    try {
      const standardsResponse = await fetch(`${standardsUrl}?t=${Date.now()}`);
      if (standardsResponse.ok) {
        const standardsData = await standardsResponse.json();
        const normalizedStandards = normalizeRecords(standardsData);
        if (Array.isArray(normalizedStandards)) {
          standards = normalizedStandards.filter(record =>
            isResponsible(record['Должность']) && record['Норматив 1']
          );
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки нормативов:', err);
      standards = [
        {"Направление": "Входящие", "Отдел": "Приемка", "Вид работ": "Разгрузка", "Группа товара": "Все", "Норматив 1": "120"},
        {"Направление": "Входящие", "Отдел": "Приемка", "Вид работ": "Сортировка", "Группа товара": "Все", "Норматив 1": "80"},
        {"Направление": "Исходящие", "Отдел": "Отгрузка", "Вид работ": "Погрузка", "Группа товара": "Все", "Норматив 1": "100"}
      ];
    }

    // Загрузка данных персонала
    const staffUrl = `${window.location.origin}/archive/staff.json`;
    try {
      const staffResponse = await fetch(`${staffUrl}?t=${Date.now()}`);
      if (staffResponse.ok) {
        const staffResponseData = await staffResponse.json();
        staffData = normalizeRecords(staffResponseData);
      }
    } catch (err) {
      console.error('Ошибка загрузки данных персонала:', err);
      staffData = [
        {"Сотрудник": "Иванов И.И.", "Статус": "Постоянный", "Отдел": "Приемка"},
        {"Сотрудник": "Петров П.П.", "Статус": "Постоянный", "Отдел": "Приемка"},
        {"Сотрудник": "Сидоров С.С.", "Статус": "Наемный", "Отдел": "Приемка"}
      ];
    }

    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Загрузка данных архива ${currentArchive}<span class="loading-dots"></span></span>
    `;

    updateProgress(30);

    const response = await fetch(`${url}?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    updateProgress(60);
    const data = await response.json();
    let records = normalizeRecords(data);

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
          hours = (parts[0] || 0) + ((parts[1] || 0) / 60) + ((parts[2] || 0) / 3600);
        }
      }
      workTypeHours[workType] = (workTypeHours[workType] || 0) + hours;
    });

    const topWorkTypes = Object.entries(workTypeHours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    window.donutChartData = Object.fromEntries(topWorkTypes);

    records.forEach(record => {
      const { direction, department } = getDirectionAndDepartment(record['Вид работ']);
      record['Направление'] = direction;
      record['Отдел'] = department;
    });

    const allWorkTypes = [...new Set(records.map(r => r['Вид работ']).filter(Boolean))].sort();

    if (lastUpdatedDiv) {
      lastUpdatedDiv.textContent = `Обновлено: ${formatDateTime(new Date())} | Архив: ${currentArchive} | Нормативов: ${standards.length} | Сотрудников: ${staffData.length}`;
    }

    updateProgress(100);
    setTimeout(() => {
      if (initUI) initUI(records, standards, staffData, allWorkTypes);
      updateProgress(0);
    }, 500);

    return { records, standards, staffData, allWorkTypes };

  } catch (err) {
    console.error('Ошибка загрузки, используем тестовые данные:', err);
    let records = createTestData();
    const allWorkTypes = [...new Set(records.map(r => r['Вид работ']).filter(Boolean))].sort();

    window.donutChartData = {
      'Комплектация': 42.5,
      'Упаковка': 23.2,
      'Погрузка': 15.8,
      'Администрация': 8.3,
      'Сборка': 6.1,
      'Транспортировка': 4.1
    };

    if (lastUpdatedDiv) {
      lastUpdatedDiv.textContent = `Обновлено: ${formatDateTime(new Date())} | ТЕСТОВЫЕ ДАННЫЕ | Нормативов: ${standards.length} | Записей: ${records.length}`;
    }
    if (errorDiv) {
      errorDiv.textContent = `⚠️ Не удалось загрузить данные: ${err.message}. Используются тестовые данные.`;
      errorDiv.classList.remove('hidden');
    }

    updateProgress(100);
    setTimeout(() => {
      if (initUI) initUI();
      updateProgress(0);
    }, 500);

    return { records, standards, staffData, allWorkTypes };
  }
}
