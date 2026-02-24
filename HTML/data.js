// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДАННЫХ ===
let records = [];
let standards = [];
let staffData = [];
let allWorkTypes = [];

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

function getArchiveNameForDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getArchiveUrl(archiveName) {
  const encodedName = encodeURIComponent(`${archiveName} fullData.json`);
  return `${window.location.origin}/archive/${encodedName}`;
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
    // === Распределение трудозатрат ===
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
    // === КОНЕЦ ФРАГМЕНТА ===
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
