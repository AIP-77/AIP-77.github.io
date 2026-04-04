// ============================================
// ГЛАВНЫЙ МОДУЛЬ ПРИЛОЖЕНИЯ (MAIN)
// ============================================

import { state, DATA_SOURCES } from './config.js';
import { 
    timeToSeconds, 
    secondsToTime, 
    formatCurrency, 
    parseRussianNumber 
} from './utils.js';
import { 
    renderHeader, 
    renderPersonalReport, 
    renderCalendarGrid, 
    renderGroupedTasks, 
    toggleTaskGroup, 
    showLoading, 
    clearInterface 
} from './ui.js';

// Делаем функцию переключения групп доступной глобально для onclick в HTML
window.toggleTaskGroup = toggleTaskGroup;

import { 
    fetchData, 
    loadCalendarData, 
    renderCalendarForMonth, 
    loadRecordByDate, 
    loadDepartmentData,
    updateVersionInfo 
} from './dataService.js';

// DOM элементы
const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    employeeView: document.getElementById('employee-view'),
    managerView: document.getElementById('manager-view'),
    banner: document.getElementById('banner'),
    versionInfo: document.getElementById('version-info'),
    tasksGrouped: document.getElementById('tasks-grouped'),
    tabEmployee: document.getElementById('tab-employee'),
    tabManager: document.getElementById('tab-manager'),
    tabInfo: document.getElementById('tab-info'),
    tabAdmin: document.getElementById('tab-admin'),
    tabStatistics: document.getElementById('tab-statistics'),
    mainDataLoading: document.getElementById('main-data-loading'),
    mainDataContent: document.getElementById('main-data-content'),
    detailsLoading: document.getElementById('details-loading'),
    detailsContent: document.getElementById('details-content'),
    calendarLoading: document.getElementById('calendar-loading'),
    calendarContent: document.getElementById('calendar-content'),
    refreshBtn: document.getElementById('refreshBtn'),
    clearCacheBtn: document.getElementById('clearCacheBtn'),
    prevMonthBtn: document.getElementById('prevMonth'),
    nextMonthBtn: document.getElementById('nextMonth'),
    currentMonthSpan: document.getElementById('currentMonth'),
    calendar: document.getElementById('calendar'),
    authForm: document.getElementById('auth-form'),
    authInput: document.getElementById('auth-input'),
    authSubmit: document.getElementById('auth-submit'),
    departmentSelect: document.getElementById('departmentSelect'),
    departmentSelector: document.getElementById('department-selector'),
    departmentReport: document.getElementById('department-report'),
    changeDepartmentBtn: document.getElementById('change-department-btn'),
    deptDataLoading: document.getElementById('dept-data-loading'),
    deptDataContent: document.getElementById('dept-data-content')
};

/**
 * Применение темы Telegram
 */
function applyTelegramTheme() {
    if (!window.Telegram?.WebApp) return;
    
    const theme = Telegram.WebApp.themeParams;
    const root = document.documentElement;
    
    root.style.setProperty('--tg-bg-color', theme.bg_color || '#f0f2f5');
    root.style.setProperty('--tg-text-color', theme.text_color || '#1c1e21');
    root.style.setProperty('--tg-hint-color', theme.hint_color || '#999');
    root.style.setProperty('--tg-link-color', theme.link_color || '#d71923');
    root.style.setProperty('--tg-button-color', theme.button_color || '#1a8cd8');
    root.style.setProperty('--tg-button-text-color', theme.button_text_color || '#ffffff');
    
    const isDark = theme.bg_color && isColorDark(theme.bg_color);
    
    if (isDark) {
        root.style.setProperty('--card-bg', '#242424');
        root.style.setProperty('--card-border', '#383838');
        root.style.setProperty('--input-bg', '#2f2f2f');
        root.style.setProperty('--input-border', '#444444');
        root.style.setProperty('--hover-bg', '#333333');
    } else {
        root.style.setProperty('--card-bg', '#ffffff');
        root.style.setProperty('--card-border', '#e0e0e0');
        root.style.setProperty('--input-bg', '#ffffff');
        root.style.setProperty('--input-border', '#cccccc');
        root.style.setProperty('--hover-bg', '#f5f5f5');
    }
}

/**
 * Обновление времени последнего обновления
 */
function updateLastUpdate() {
    const now = new Date();
    document.getElementById('last-update').textContent = `Последнее обновление: ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Рендеринг селектора отделов
 */
export function renderDepartmentSelector() {
    const { managedDepartments, departmentSelect } = state;
    departmentSelect.innerHTML = '<option value="">— Выберите отдел —</option>';
    managedDepartments.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept; 
        opt.textContent = dept;
        departmentSelect.appendChild(opt);
    });
}

/**
 * Инициализация представления менеджера
 */
export async function initializeManagerView() {
    if (!state.isManager) return;
    
    try {
        const staffData = await fetchData(DATA_SOURCES.staff);
        const records = normalizeRecords(staffData);
        const departments = new Set();
        
        records.forEach(record => {
            if (state.managedDepartments.includes(record['Руководит отделом']) || 
                state.currentUserData.managedDepartments.includes(record['Отдел'])) {
                departments.add(record['Отдел']);
            }
        });
        
        state.managedDepartments = Array.from(departments);
        if (state.managedDepartments.length > 0) renderDepartmentSelector();
    } catch (err) { 
        console.error(err); 
    }
}

/**
 * Переключение вкладок
 */
export function switchTab(tabName) {
    const tabs = ['employee', 'manager', 'info', 'admin', 'statistics'];
    const views = {
        employee: elements.employeeView,
        manager: elements.managerView
    };
    
    tabs.forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        if (tabEl) {
            tabEl.classList.toggle('active', t === tabName);
        }
    });
    
    Object.keys(views).forEach(key => {
        if (views[key]) {
            views[key].classList.toggle('hidden', key !== tabName);
        }
    });
    
    if (tabName === 'employee' && state.currentRecord) {
        updateMainData();
    }
}

/**
 * Обновление основных данных
 */
export function updateMainData() {
    if (!state.currentRecord) return;
    
    const record = state.currentRecord;
    const tasks = state.currentMonthData.filter(r => r['Сотрудник'] === record['Сотрудник']);
    const tasksByDate = {};
    
    tasks.forEach(task => {
        if (!tasksByDate[task['Рабочий день']]) tasksByDate[task['Рабочий день']] = [];
        tasksByDate[task['Рабочий день']].push(task);
    });
    
    document.getElementById('name').textContent = record['Сотрудник'] || '—';
    document.getElementById('department').textContent = record['Отдел'] || '—';
    document.getElementById('date').textContent = record['Рабочий день'] || '—';
    document.getElementById('worked').textContent = calculateTotalTime(tasks, 'Рабочее время');
    document.getElementById('planned').textContent = calculateTotalTime(tasks, 'Время по табелю');
    document.getElementById('efficiency').textContent = calculateEfficiency(
        calculateTotalTime(tasks, 'Рабочее время'), 
        calculateTotalTime(tasks, 'Время по табелю')
    ) + '%';
    
    const avgNorm = calculateAverageNormative(tasks, true);
    const avgNormDisplay = avgNorm !== null ? `${avgNorm}%` : '—';
    const avgNormColor = avgNorm !== null ? getNormativeColor(avgNorm) : '#999';
    document.getElementById('avg-normative').innerHTML = `<span style="color: ${avgNormColor}; font-weight: bold;">${avgNormDisplay}</span>`;
    
    document.getElementById('pay-day').textContent = formatCurrency(calculateDayPay(tasks));
    document.getElementById('xisBonusDay').textContent = formatCurrency(calculateXisBonus(tasks));
    document.getElementById('pay-month').textContent = formatCurrency(calculateMonthlyPay(tasksByDate));
    
    renderGroupedTasks(tasks);
}

/**
 * Основная инициализация приложения
 */
export async function init() {
    applyTelegramTheme();
    
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }
    
    elements.authForm.style.display = 'block';
    elements.loading.classList.add('hidden');
    
    elements.authSubmit.addEventListener('click', handleAuth);
    elements.refreshBtn.addEventListener('click', handleRefresh);
    elements.clearCacheBtn.addEventListener('click', handleClearCache);
    elements.prevMonthBtn.addEventListener('click', () => {
        if (state.currentMonthIndex > 0) {
            state.currentMonthIndex--;
            renderCalendarForMonth(state.availableMonths[state.currentMonthIndex]);
        }
    });
    elements.nextMonthBtn.addEventListener('click', () => {
        if (state.currentMonthIndex < state.availableMonths.length - 1) {
            state.currentMonthIndex++;
            renderCalendarForMonth(state.availableMonths[state.currentMonthIndex]);
        }
    });
    elements.changeDepartmentBtn.addEventListener('click', () => {
        elements.departmentSelector.classList.remove('hidden');
        elements.departmentReport.classList.add('hidden');
    });
    elements.departmentSelect.addEventListener('change', async (e) => {
        if (e.target.value) {
            elements.departmentSelector.classList.add('hidden');
            elements.departmentReport.classList.remove('hidden');
            document.getElementById('dept-name').textContent = e.target.value;
            await loadDepartmentData(e.target.value);
        }
    });
    
    // Экспорт функций для глобального доступа
    window.toggleTaskGroup = toggleTaskGroup;
    
    // Обработка глобальных ошибок
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showError('Ошибка: ' + event.message);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showError('Ошибка: ' + event.reason);
    });
}


/**
 * Обработка авторизации
 */
async function handleAuth() {
    console.log('🔘 Кнопка авторизации нажата');
    
    const authInput = document.getElementById('login-input') || 
                      document.getElementById('telegram-id') || 
                      document.querySelector('input[type="text"]');
    
    if (!authInput) {
        console.error('❌ Поле ввода не найдено! Проверьте ID в HTML.');
        return;
    }

    const inputValue = authInput.value.trim();
    console.log(`📝 Введенное значение: "${inputValue}"`);

    if (!inputValue) {
        alert('Пожалуйста, введите Telegram ID, Пароль или Табельный номер');
        return;
    }

    try {
        console.log('📥 Загрузка файла сотрудников...');
        const response = await fetch(DATA_SOURCES.staff);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const json = await response.json();
        
        // 1. Извлекаем массив данных из поля 'data'
        const staffArray = json.data || [];
        
        if (!Array.isArray(staffArray)) {
            throw new Error('Формат файла сотрудников неверен: поле data не является массивом');
        }

        console.log(`✅ Сотрудники загружены. Найдено записей: ${staffArray.length}`);

        // Структура столбцов из файла: 
        // ["Сотрудник","Telegram ID","Отдел","Департамент","Роль","Статус","Руководит отделом","Смена","Источник","Отметка времени"]
        // Индексы: 0=ФИО, 1=Telegram ID, 2=Отдел, 3=Департамент, 4=Роль, 5=Статус
        
        let foundUser = null;
        let userRecordObj = {};

        // 2. Перебираем массив строк
        for (const row of staffArray) {
            if (!Array.isArray(row) || row.length < 2) continue;

            // Преобразуем строку в объект для удобства (как в старой версии)
            const record = {
                'ФИО': row[0] || '',
                'Telegram ID': String(row[1] || ''),
                'Отдел': row[2] || '',
                'Департамент': row[3] || '',
                'Роль': row[4] || '',
                'Статус': row[5] || '',
                'Руководит отделом': row[6] || '',
                'Смена': row[7] || '',
                'Табельный номер': row[8] || '' // Предположим, что источник или смена могут быть табельным, либо добавим отдельно
            };
            
            // Если у вас есть отдельное поле "Табельный номер" в файле, уточните его индекс. 
            // Сейчас я предполагаю, что поиск идет по Telegram ID (индекс 1) или ФИО (индекс 0).
            // Если "Пароль" хранится где-то еще, нужно добавить проверку.

            const fio = String(record['ФИО']).toLowerCase();
            const telegramId = String(record['Telegram ID']);
            // Попытка найти табельный номер, если он есть в данных (иногда он в других колонках)
            const tabNum = String(row[8] || record['Табельный номер'] || ''); 

            // Сравнение введенного значения с данными
            // Приводим ввод к строке для сравнения с Telegram ID
            if (telegramId === inputValue) {
                foundUser = record;
                userRecordObj = record;
                break;
            }
            
            // Если ввод совпадает с ФИО (частично или полностью)
            if (fio.includes(inputValue.toLowerCase())) {
                 foundUser = record;
                 userRecordObj = record;
                 break;
            }

            // Если ввод совпадает с табельным номером (если он есть в строке)
            if (tabNum && tabNum === inputValue) {
                foundUser = record;
                userRecordObj = record;
                break;
            }
        }

        if (foundUser) {
            console.log('✅ Пользователь найден:', foundUser['ФИО']);
            
            // Сохраняем пользователя в состояние
            state.currentUser = foundUser;
            state.currentUserData = foundUser; // Для совместимости
            
            // Скрываем форму входа, показываем приложение
            const authForm = document.querySelector('.auth-container') || document.getElementById('auth-screen');
            if (authForm) authForm.style.display = 'none';
            
            const appContent = document.getElementById('app-content') || document.querySelector('.app-container');
            if (appContent) appContent.style.display = 'block';

            // Загружаем основные данные
            await loadMainData();
            
            // Рендерим интерфейс
            renderHeader();
            renderDashboard();
            
        } else {
            console.warn(`⚠️ Пользователь не найден по значению: ${inputValue}`);
            alert('Пользователь не найден. Проверьте введенный Telegram ID или ФИО.');
        }

    } catch (error) {
        console.error('❌ Ошибка авторизации:', error);
        alert('Ошибка загрузки данных сотрудников: ' + error.message);
    }
}


/**
 * Загрузка основных данных за текущий или предыдущий месяц
 */
/**
 * Загрузка основных данных за текущий или предыдущий месяц
 */
async function loadMainData() {
    if (!state.currentUser) {
        console.error('❌ Ошибка: state.currentUser не определен');
        throw new Error('Пользователь не авторизован');
    }

    const userFio = state.currentUser['ФИО'];
    console.log(`🔍 Начало загрузки данных для: ${userFio}`);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Формируем список месяцев для проверки (текущий и предыдущий)
    const monthsToCheck = [];
    monthsToCheck.push({ year: currentYear, month: currentMonth });
    
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear--;
    }
    monthsToCheck.push({ year: prevYear, month: prevMonth });

    let loadedData = null; 
    let lastError = null;

    for (const { year, month } of monthsToCheck) {
        const monthStr = month.toString().padStart(2, '0');
        const fileName = `${year}-${monthStr} fullData.json`;
        // Убираем лишний пробел в URL, который был в логах
        const url = `https://AIP-77.github.io/archive/${fileName}`;
        
        console.log(`📂 Проверка файла: ${fileName}`);

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`⚠️ Файл не найден (404)`);
                    continue; 
                }
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            const jsonData = await response.json();
            
            // Получаем массив данных. Структура: { data: [ ["Дата", "Время", "ФИО", ...], ... ] }
            const rows = jsonData.data;
            
            if (!Array.isArray(rows)) {
                console.warn(`⚠️ В файле ${fileName} поле 'data' отсутствует или не является массивом.`);
                continue;
            }

            console.log(`📊 В файле за ${month}.${year} записей: ${rows.length}. Поиск сотрудника...`);

            // Ищем строки, где ФИО (индекс 2) совпадает с искомым
            // Структура строки согласно примеру: [0]="Дата", [1]="Время", [2]="Сотрудник"
            const userRows = rows.filter(row => {
                // Проверяем, что строка достаточно длинная и элемент существует
                if (row.length > 2) {
                    const rowFio = String(row[2]).trim();
                    return rowFio === userFio;
                }
                return false;
            });

            if (userRows.length > 0) {
                console.log(`✅ Найдено записей для сотрудника: ${userRows.length}`);
                
                // Преобразуем массив массивов обратно в удобный формат, если нужно, 
                // или сохраняем как есть. Для совместимости со старым кодом, 
                // который мог ожидать объект, можно создать обертку, но лучше работать с массивом.
                // Старый код, скорее всего, просто брал данные и строил графики.
                // Сохраним найденные строки в состояние.
                
                loadedData = {
                    columns: jsonData.columns || [],
                    data: userRows,
                    meta: { year, month, count: userRows.length }
                };
                
                state.dataPeriod = { year, month };
                break; 
            } else {
                console.log(`⚠️ В файле за ${month}.${year} сотрудник "${userFio}" не найден.`);
                lastError = new Error('Данные сотрудника отсутствуют в файле');
            }

        } catch (error) {
            console.error(`❌ Ошибка загрузки ${fileName}:`, error);
            lastError = error;
        }
    }

    if (!loadedData) {
        const errorMsg = 'Нет данных за последние 2 месяца';
        console.error('Load main data error:', errorMsg);
        throw new Error(errorMsg);
    }

    state.currentUserData = loadedData;
    state.currentMonthData = loadedData;
    state.lastUpdate = new Date();
    state.dataLastUpdated = new Date();
    
    console.log('✅ Данные успешно загружены и готовы к отображению');
    return loadedData;
}

/**
 * Обработка обновления данных
 */
async function handleRefresh() {
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.textContent = 'Обновление...';
    
    try {
        await loadMainData();
        await loadCalendarData();
        showBanner('Данные обновлены', 'success', 3000);
    } catch (err) {
        showBanner('Ошибка обновления: ' + err.message, 'error', 5000);
    } finally {
        elements.refreshBtn.disabled = false;
        elements.refreshBtn.textContent = '🔄 Обновить данные';
    }
}

/**
 * Обработка очистки кэша
 */
async function handleClearCache() {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
    }
    
    localStorage.clear();
    sessionStorage.clear();
    
    showBanner('Кэш очищен. Перезагрузка...', 'success', 2000);
    setTimeout(() => location.reload(), 2000);
}

// Экспорт основного API модуля
export {
    handleAuth,
    loadMainData,
    handleRefresh,
    handleClearCache
};
