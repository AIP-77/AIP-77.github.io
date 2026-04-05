// ============================================
// ГЛАВНЫЙ МОДУЛЬ (ТОЧКА ВХОДА)
// ============================================

import { state, DATA_SOURCES } from './config.js';
import { 
    timeToSeconds, 
    secondsToTime, 
    formatCurrency, 
    parseRussianNumber ,
    showError,
    showBanner
} from './utils.js';

import { 
    renderHeader, 
    renderPersonalReport, 
    renderDashboard, 
    renderCalendarGrid, 
    renderGroupedTasks, 
    toggleTaskGroup, 
    showLoading, 
    clearInterface,
} from './ui.js';

// Делаем функцию переключения групп доступной глобально для onclick в HTML
window.toggleTaskGroup = toggleTaskGroup;

/**
 * Загрузка основных данных за текущий или предыдущий месяц
 */
async function loadMainData() {
    if (!state.currentUser) {
        throw new Error('Пользователь не авторизован (currentUser is null)');
    }

    const fio = state.currentUser['ФИО'] || state.currentUser['Сотрудник'];
    if (!fio) {
        console.error('❌ У пользователя не найдено поле ФИО или Сотрудник', state.currentUser);
        throw new Error('Некорректные данные пользователя: отсутствует имя');
    }

    console.log(`🔍 Начало загрузки данных для: ${fio}`);
    
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
        const url = `https://AIP-77.github.io/archive/${fileName}`;
        
        console.log(`📂 Проверка файла: ${fileName}`);

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`⚠️ Файл не найден (404), переходим к следующему...`);
                    continue; 
                }
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            const jsonData = await response.json();
            
            // Новая логика: структура { columns, data: [...] }
            const recordsArray = jsonData.data || jsonData;
            
            if (!Array.isArray(recordsArray)) {
                console.warn(`⚠️ В файле ${fileName} поле 'data' не является массивом.`);
                continue;
            }

            // Поиск записи сотрудника в массиве
            const userRecord = recordsArray.find(record => {
                // Ищем по полю "Сотрудник" или "ФИО" внутри записи данных
                const recFio = String(record['Сотрудник'] || record['ФИО'] || '');
                return recFio === fio;
            });

            if (userRecord) {
                console.log(`✅ Данные найдены за ${month}.${year}`);
                loadedData = userRecord;
                state.dataPeriod = { year, month };
                break; 
            } else {
                console.log(`⚠️ В файле за ${month}.${year} сотрудник "${fio}" не найден.`);
                lastError = new Error('Данные сотрудника отсутствуют в файле');
            }

        } catch (error) {
            console.error(`❌ Ошибка загрузки ${fileName}:`, error);
            lastError = error;
        }
    }

    if (!loadedData) {
        const errorMsg = lastError ? lastError.message : 'Нет данных за последние 2 месяца';
        console.error('Load main data error:', errorMsg);
        throw new Error(errorMsg);
    }

    // Сохраняем данные. 
    // ВАЖНО: loadMainData возвращает ОДНУ запись (объект), но для рендеринга списка задач
    // нам может понадобиться массив. В старой версии данные за месяц фильтровались.
    // Здесь мы сохраняем найденную запись. Если нужно собрать все задачи за месяц,
    // логику нужно расширить (собирать все совпадения, а не break после первого).
    // Для текущего примера предполагаем, что нам нужны все задачи пользователя за этот файл.
    
    // ПЕРЕОПРЕДЕЛЕНИЕ: Ищем ВСЕ записи пользователя в файле, а не одну
    const allUserRecords = recordsArray.filter(record => {
        const recFio = String(record['Сотрудник'] || record['ФИО'] || '');
        return recFio === fio;
    });

    state.currentUserData = allUserRecords; 
    state.currentMonthData = allUserRecords;
    state.lastUpdate = new Date();
    
    return allUserRecords;
}

/**
 * Обработка авторизации пользователя
 */
async function handleAuth() {
    const input = document.getElementById('login-input') || 
                  document.getElementById('telegram-id') || 
                  document.querySelector('input[type="text"]');
    
    const inputValue = input ? input.value.trim() : '';

    if (!inputValue) {
        showBanner('Введите Telegram ID или пароль', 'error');
        return;
    }

    console.log('🔘 Кнопка авторизации нажата');
    console.log(`📝 Введенное значение: "${inputValue}"`);

    try {
        // 1. Загрузка списка сотрудников
        console.log('📥 Загрузка файла сотрудников...');
        const response = await fetch(DATA_SOURCES.staff);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const rawData = await response.json();

        // Преобразование формата {columns, data} -> массив объектов
        let staffList = [];
        if (rawData.data && Array.isArray(rawData.data) && rawData.columns) {
            staffList = rawData.data.map(row => {
                const obj = {};
                rawData.columns.forEach((col, idx) => {
                    obj[col] = row[idx];
                });
                return obj;
            });
        } else if (Array.isArray(rawData)) {
            staffList = rawData;
        } else {
            throw new Error('Неверный формат файла сотрудников');
        }

        console.log(`Найдено записей: ${staffList.length}`);

        // 2. Поиск пользователя
        const user = staffList.find(p => {
            const telId = String(p['Telegram ID'] || '');
            const pass = String(p['Пароль'] || '');
            const tabNum = String(p['Табельный номер'] || '');
            const fio = String(p['ФИО'] || '');
            
            return telId === inputValue || pass === inputValue || tabNum === inputValue || fio === inputValue;
        });

        if (user) {
            console.log(`✅ Пользователь найден: ${user['ФИО'] || user['Сотрудник']}`);
            
            state.currentUser = user;
            state.currentUserData = null;

            // 3. Скрываем форму входа, показываем приложение
            const authForm = document.querySelector('.auth-container') || 
                             document.getElementById('auth-screen') || 
                             document.getElementById('auth-form');
            if (authForm) authForm.style.display = 'none';
            
            const appContent = document.getElementById('app-content') || 
                               document.getElementById('main-content') || 
                               document.querySelector('.app-container');
            if (appContent) {
                appContent.style.display = 'block';
                showLoading('main-content'); 
            }

            // 4. Загружаем основные данные
            await loadMainData();

            // 5. Рендерим интерфейс
            clearInterface();
            
            renderHeader(user);
            renderDashboard(); 
            renderGroupedTasks(state.currentUserData || []);
            
            showBanner('Авторизация успешна! Данные загружены.', 'success');

        } else {
            console.warn(`⚠️ Пользователь не найден по значению: ${inputValue}`);
            showBanner('Пользователь не найден. Проверьте введенные данные.', 'error');
            if (input) {
                input.value = '';
                input.focus();
            }
        }

    } catch (error) {
        console.error('❌ Ошибка авторизации:', error);
        showError('Ошибка загрузки данных: ' + error.message);
        showBanner('Произошла ошибка при входе', 'error');
        
        // Возвращаем форму входа если произошла критическая ошибка
        const authForm = document.querySelector('.auth-container') || document.getElementById('auth-form');
        const appContent = document.getElementById('app-content') || document.getElementById('main-content');
        if (authForm) authForm.style.display = 'block';
        if (appContent) appContent.style.display = 'none';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.auth-btn') || document.getElementById('login-btn');
    if (btn) {
        btn.addEventListener('click', handleAuth);
    }
    
    // Поддержка Enter в поле ввода
    const input = document.getElementById('login-input') || document.getElementById('telegram-id');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAuth();
        });
    }
});
