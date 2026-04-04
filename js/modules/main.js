// ============================================
// ГЛАВНЫЙ МОДУЛЬ ПРИЛОЖЕНИЯ (MAIN)
// ============================================

import { state, DATA_SOURCES } from './config.js';
import { 
    normalizeRecords, 
    showError, 
    showBanner, 
    isColorDark,
    calculateTotalTime,
    calculateEfficiency,
    calculateAverageNormative,
    getNormativeColor,
    formatCurrency,
    calculateDayPay,
    calculateXisBonus,
    calculateMonthlyPay
} from './utils.js';
import { renderGroupedTasks, toggleTaskGroup } from './ui.js';
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
    const telegramId = document.getElementById('telegramId').value.trim();
    
    if (!telegramId) {
        showNotification('Введите Telegram ID', 'error');
        return;
    }

    toggleLoading(true);
    state.error = null;

    try {
        console.log('🔐 Попытка авторизации по ID:', telegramId);
        
        // Загружаем файл сотрудников
        const response = await fetch(DATA_SOURCES.staff);
        if (!response.ok) throw new Error(`Ошибка загрузки staff.json: ${response.status}`);
        
        const staffData = await response.json();
        
        // Ищем пользователя. 
        // ВНИМАНИЕ: Проверяем разные варианты ключей, так как структура может отличаться
        let user = null;
        
        // Вариант 1: Массив объектов (как в новой структуре)
        if (Array.isArray(staffData)) {
            user = staffData.find(s => 
                String(s['Telegram ID']) === telegramId || 
                String(s['ChatID']) === telegramId ||
                String(s['chat_id']) === telegramId
            );
        } 
        // Вариант 2: Объект с ключами (старая структура)
        else if (typeof staffData === 'object') {
            // Пробуем найти по значению в объекте
            Object.values(staffData).forEach(person => {
                if (String(person['Telegram ID']) === telegramId || 
                    String(person['ChatID']) === telegramId ||
                    String(person['chat_id']) === telegramId) {
                    user = person;
                }
            });
        }

        if (!user) {
            throw new Error('Пользователь не найден. Проверьте Telegram ID.');
        }

        console.log('✅ Пользователь найден:', user['ФИО'] || user['FIO']);

        // Сохраняем пользователя в состояние
        state.currentUser = user;
        state.chatId = telegramId;
        
        // Определяем права доступа
        const role = user['Должность'] || user['Role'] || '';
        state.isManager = role.includes('Начальник') || role.includes('Менеджер');
        state.isAdmin = role.includes('Администратор') || role.includes('Admin');

        // Скрываем форму входа, показываем приложение
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('appContent').classList.remove('hidden');
        
        // Загружаем основные данные
        await loadMainData();
        
        // Рендерим интерфейс
        renderDashboard();
        renderPersonalReport();
        renderCharts();

    } catch (error) {
        console.error('Ошибка авторизации:', error);
        showNotification(`Ошибка авторизации: ${error.message}`, 'error');
        toggleLoading(false);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Загрузка основных данных за текущий или предыдущий месяц
 */
async function loadMainData() {
    if (!state.currentUserData) throw new Error('Пользователь не авторизован');

    console.log(`🔍 Начало загрузки данных для: ${state.currentUserData['ФИО']}`);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Формируем список месяцев для проверки (текущий и предыдущий)
    const monthsToCheck = [];
    
    // Текущий месяц
    monthsToCheck.push({ year: currentYear, month: currentMonth });
    
    // Предыдущий месяц
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear--;
    }
    monthsToCheck.push({ year: prevYear, month: prevMonth });

    let loadedData = null;
    let lastError = null;

    // Перебираем месяцы
    for (const { year, month } of monthsToCheck) {
        // Используем исправленную функцию из config.js
        const url = DATA_SOURCES.monthlyData(year, month);
        const fileName = `${year}-${month.toString().padStart(2, '0')} fullData.json`;
        
        console.log(`📂 Проверка файла: ${fileName}`);
        console.log(`📡 Запрос к URL: ${url}`);

        try {
            const response = await fetch(url);
            console.log(`📥 Статус ответа: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`⚠️ Файл не найден (404), переходим к следующему месяцу...`);
                    continue; 
                }
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            const jsonData = await response.json();
            
            // Пытаемся найти данные пользователя по разным ключам
            // В рабочей версии использовалось обращение по ФИО или Табельному номеру
            const userData = jsonData[state.currentUserData['ФИО']] || 
                             jsonData[state.currentUserData['Табельный номер']] ||
                             jsonData[state.currentUserData['id']];

            if (userData) {
                console.log(`✅ Данные найдены за ${month}.${year}`);
                loadedData = userData;
                break; 
            } else {
                console.log(`⚠️ Файл загружен, но данных для "${state.currentUserData['ФИО']}" не найдено.`);
                console.log(`Доступные ключи в файле (первые 5):`, Object.keys(jsonData).slice(0, 5));
                lastError = new Error('Данные сотрудника отсутствуют в файле');
            }

        } catch (error) {
            console.error(`❌ Ошибка при загрузке ${fileName}:`, error);
            lastError = error;
        }
    }

    if (!loadedData) {
        const errorMsg = lastError ? lastError.message : 'Нет данных за последние 2 месяца';
        console.error('Load main data error:', errorMsg);
        throw new Error(errorMsg);
    }

    state.currentMonthData = loadedData;
    state.dataLastUpdated = new Date();
    
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
