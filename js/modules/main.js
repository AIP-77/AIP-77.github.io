import { state, DATA_SOURCES } from './config.js';

import { 
    timeToSeconds, 
    secondsToTime, 
    formatCurrency, 
    parseRussianNumber ,
    showError,    // Проверьте наличие в экспорте
    showBanner    // Проверьте наличие в экспорте
} from './utils.js';

// Убедитесь, что showError и showBanner экспортируются из utils.js или ui.js
import { 
    renderHeader, 
    renderDashboard, 
    renderGroupedTasks, 
    toggleTaskGroup, 
    showLoading, 
    clearInterface,

} from './ui.js'; 

import { loadMainData } from './dataService.js'; // Или откуда у вас эта функция

// Делаем функцию переключения групп доступной глобально
window.toggleTaskGroup = toggleTaskGroup;

/**
 * Обработка авторизации (Восстановленная логика)
 */
async function handleAuth() {
    const input = document.getElementById('login-input') || document.getElementById('telegram-id') || document.querySelector('input[type="text"]');
    const inputValue = input ? input.value.trim() : '';

    if (!inputValue) {
        if (typeof showBanner === 'function') showBanner('Введите Telegram ID, пароль или табельный номер', 'error');
        else alert('Введите данные для входа');
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

        console.log(`✅ Сотрудники загружены. Найдено записей: ${staffList.length}`);

        // 2. Поиск пользователя (Логика как в старом index.html)
        // Ищем точное совпадение строкового значения в ключевых полях
        const user = staffList.find(p => {
            // Получаем значения, приводим к строке, убираем пробелы
            const telId = String(p['Telegram ID'] || '').trim();
            const pass = String(p['Пароль'] || '').trim();
            const tabNum = String(p['Табельный номер'] || '').trim();
            // Проверяем оба возможных названия поля для имени
            const fio = String(p['ФИО'] || p['Сотрудник'] || '').trim();
            
            const inputStr = String(inputValue).trim();

            // Сравниваем
            if (telId === inputStr) return true;
            if (pass === inputStr) return true;
            if (tabNum === inputStr) return true;
            if (fio === inputStr) return true;
            
            return false;
        });

        if (user) {
            // ВАЖНО: Явно сохраняем имя сотрудника в универсальное поле 'ФИО'
            // Это нужно, чтобы loadMainData нашел его в архиве по ключу 'Сотрудник' или 'ФИО'
            const userName = user['ФИО'] || user['Сотрудник'] || 'Неизвестно';
            
            // Обновляем объект пользователя, чтобы везде было поле 'ФИО'
            state.currentUser = { ...user, 'ФИО': userName };
            
            console.log(`✅ Пользователь найден: ${userName}`);
            console.log(`🆔 Telegram ID: ${user['Telegram ID']}, Табельный: ${user['Табельный номер']}`);

            // 3. Переключение интерфейса
            const authForm = document.querySelector('.auth-container') || document.getElementById('auth-screen') || document.getElementById('auth-form');
            if (authForm) authForm.style.display = 'none';
            
            const appContent = document.getElementById('app-content') || document.getElementById('main-content') || document.querySelector('.app-container');
            if (appContent) {
                appContent.style.display = 'block';
                showLoading('main-content'); 
            }

            // 4. Загрузка данных из архива
            console.log(`🔍 Начало загрузки данных для: ${userName}`);
            
            try {
                await loadMainData(); // Эта функция теперь должна искать по state.currentUser['ФИО']
                
                // 5. Рендеринг после успешной загрузки
                clearInterface();
                renderHeader(state.currentUser);
                renderDashboard();
                
                // Передаем данные в рендер задач (предполагаем, что они сохранены в state.currentUserData)
                const tasks = state.currentUserData || state.currentMonthData || [];
                renderGroupedTasks(tasks);
                
                if (typeof showBanner === 'function') {
                    showBanner(`Добро пожаловать, ${userName}!`, 'success');
                }
            } catch (dataError) {
                console.error('❌ Ошибка загрузки данных:', dataError);
                if (typeof showError === 'function') {
                    showError('Данные за текущий период не найдены: ' + dataError.message);
                } else {
                    alert('Ошибка данных: ' + dataError.message);
                }
                // Не скрываем лоадер полностью, показываем сообщение
            }

        } else {
            console.warn(`⚠️ Пользователь не найден по значению: ${inputValue}`);
            if (typeof showBanner === 'function') {
                showBanner('Пользователь не найден. Проверьте введенные данные.', 'error');
            } else {
                alert('Пользователь не найден.');
            }
            if (input) {
                input.value = '';
                input.focus();
            }
        }

    } catch (error) {
        console.error('❌ Критическая ошибка авторизации:', error);
        if (typeof showError === 'function') {
            showError('Ошибка системы: ' + error.message);
        } else {
            alert('Ошибка: ' + error.message);
        }
    }
}
