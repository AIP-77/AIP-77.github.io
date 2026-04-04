// ============================================
// РЕНДЕРИНГ И UI ФУНКЦИИ
// ============================================

import { state } from './config.js';
import { 
    timeToSeconds, 
    secondsToTime, 
    formatCurrency, 
    parseRussianNumber,
    calculateDayPay,
    calculateXisBonus,
    getNormativeColor,
    isExcludedWorkType
} from './utils.js';

/**
 * Отображение индикатора загрузки
 */
export function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = '<div class="loading-spinner">Загрузка данных...</div>';
        el.style.display = 'block';
    }
}

/**
 * Очистка интерфейса перед новой загрузкой
 */
export function clearInterface() {
    const mainContent = document.getElementById('main-content');
    const tasksGrouped = document.getElementById('tasks-grouped');
    const calendar = document.getElementById('calendar');
    
    if (mainContent) mainContent.style.display = 'none';
    if (tasksGrouped) tasksGrouped.innerHTML = '';
    if (calendar) calendar.innerHTML = '';
    
    // Скрываем сообщения об ошибках
    const errorEl = document.getElementById('error-message');
    if (errorEl) errorEl.style.display = 'none';
}

/**
 * Рендеринг шапки профиля пользователя
 */
export function renderHeader(user) {
    const headerEl = document.getElementById('user-header');
    if (!headerEl || !user) return;

    const fio = user['ФИО'] || 'Неизвестно';
    const department = user['Отдел'] || user['Департамент'] || 'Нет данных';
    const role = user['Роль'] || 'Сотрудник';
    const shift = user['Смена'] ? `Смена ${user['Смена']}` : '';

    headerEl.innerHTML = `
        <div class="profile-avatar">${fio.charAt(0)}</div>
        <div class="profile-info">
            <h2 class="profile-name">${fio}</h2>
            <div class="profile-details">
                <span class="badge">${role}</span>
                <span>${department}</span>
                ${shift ? `<span>• ${shift}</span>` : ''}
            </div>
        </div>
    `;
    headerEl.style.display = 'flex';
}

/**
 * Рендеринг персонального отчета (сводка)
 */
export function renderPersonalReport(userData) {
    const reportEl = document.getElementById('personal-report-summary');
    if (!reportEl || !userData) return;

    // Предполагаем, что userData - это массив задач или объект с данными
    // Если это массив задач из loadMainData:
    const tasks = Array.isArray(userData) ? userData : [];
    
    const totalPay = calculateDayPay(tasks);
    const totalXis = calculateXisBonus(tasks);
    const totalTimeSec = tasks.reduce((sum, t) => sum + timeToSeconds(t['Рабочее время'] || '0'), 0);
    const avgNorm = tasks.length > 0 ? (tasks.reduce((sum, t) => {
        const n = parseFloat(t['Выполнение норматива']);
        return sum + (isNaN(n) ? 0 : n);
    }, 0) / tasks.filter(t => t['Выполнение норматива']).length) : 0;

    reportEl.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Отработано</div>
            <div class="stat-value">${secondsToTime(totalTimeSec)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Начислено</div>
            <div class="stat-value" style="color: var(--tg-link-color);">${formatCurrency(totalPay)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Премия XIS</div>
            <div class="stat-value seasonal-bonus">${formatCurrency(totalXis)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Ср. норматив</div>
            <div class="stat-value" style="color: ${getNormativeColor(avgNorm)}">${avgNorm.toFixed(1)}%</div>
        </div>
    `;
    reportEl.style.display = 'grid';
}

/**
 * Группировка задач по типу работ
 */
export function groupTasksByType(tasks) {
    const groups = {};
    tasks.forEach(task => {
        const workType = task['Вид работ'] || 'Другие виды работ';
        if (!groups[workType]) {
            groups[workType] = {
                tasks: [],
                totalCount: 0,
                totalTime: 0,
                totalPay: 0,
                totalXisBonus: 0,
                normativeValues: []
            };
        }
        const count = parseFloat(task['Количество единиц'] || '0');
        const time = task['Рабочее время'] || '00:00';
        const pay = parseRussianNumber(task['Расчетная сумма'] || '0');
        const xisBonus = parseRussianNumber(task['Доплата XIS'] || '0');
        const startTime = task['Начало задачи'] || '--:--';
        const supply = task['Поставка'] || '—';
        const normative = task['Выполнение норматива'] !== undefined ? task['Выполнение норматива'] : null;
        
        groups[workType].tasks.push({
            count: count,
            time: time,
            pay: pay,
            xisBonus: xisBonus,
            startTime: startTime,
            supply: supply,
            normative: normative,
            calculatedPay: task['Расчетная сумма'] || '0,00 ₽',
            calculatedXisBonus: task['Доплата XIS'] || '0,00 ₽'
        });
        
        // Собираем значения норматива для расчета среднего
        if (!isExcludedWorkType(workType) && normative !== null && normative !== undefined && normative !== '') {
            const num = parseFloat(normative);
            if (!isNaN(num)) {
                groups[workType].normativeValues.push(num);
            }
        }
        
        groups[workType].totalCount += count;
        groups[workType].totalTime += timeToSeconds(time);
        groups[workType].totalPay += (pay + xisBonus);
        groups[workType].totalXisBonus += xisBonus;
    });
    return groups;
}

/**
 * Рендеринг сгруппированных задач
 */
export function renderGroupedTasks(tasks) {
    const tasksGrouped = document.getElementById('tasks-grouped');
    
    if (!tasks || tasks.length === 0) {
        if (tasksGrouped) tasksGrouped.innerHTML = '<p style="text-align:center;color:var(--tg-hint-color);">Нет данных за выбранный период</p>';
        return;
    }
    
    const groups = groupTasksByType(tasks);
    let html = '';
    
    Object.keys(groups).sort().forEach(workType => {
        const group = groups[workType];
        const totalTimeFormatted = secondsToTime(group.totalTime);
        const totalPayFormatted = formatCurrency(group.totalPay);
        const totalXisBonusFormatted = formatCurrency(group.totalXisBonus);
        
        // Расчет среднего норматива для группы
        let avgNormativeHtml = '';
        if (group.normativeValues.length > 0) {
            const avgNorm = Math.round((group.normativeValues.reduce((a, b) => a + b, 0) / group.normativeValues.length) * 100) / 100;
            const normColor = getNormativeColor(avgNorm);
            avgNormativeHtml = `<div class="task-group-summary-item"><span>📊</span><span style="color: ${normColor};">Ср: ${avgNorm}%</span></div>`;
        }
        
        html += `
        <div class="task-group">
        <div class="task-group-header" onclick="window.toggleTaskGroup(this)">
        <div style="flex: 1;">
        <div>${workType}</div>
        <div class="task-group-summary">
        <div class="task-group-summary-item">
        <span>📊</span>
        <span>${group.totalCount.toFixed(2)} ед.</span>
        </div>
        <div class="task-group-summary-item">
        <span>⏱️</span>
        <span>${totalTimeFormatted}</span>
        </div>
        <div class="task-group-summary-item">
        <span>💰</span>
        <span class="task-total">${totalPayFormatted}</span>
        </div>
        ${group.totalXisBonus > 0 ? `
        <div class="task-group-summary-item">
        <span>🎁</span>
        <span class="seasonal-bonus">${totalXisBonusFormatted}</span>
        </div>
        ` : ''}
        ${avgNormativeHtml}
        </div>
        </div>
        <div class="expand-icon">▼</div>
        </div>
        <div class="task-group-content">
        `;
        
        group.tasks.forEach((task, index) => {
            const normativeColor = getNormativeColor(task.normative);
            const normativeDisplay = (task.normative !== null && task.normative !== undefined && task.normative !== '') 
                ? `${task.normative}%` 
                : '—';
            
            html += `
            <div class="task-item">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
            <div>
            <strong>${task.count.toFixed(2)} ед.</strong>
            ${task.normative !== null && task.normative !== undefined && task.normative !== '' ? 
                `<span class="task-normative" style="color: ${normativeColor}; margin-left: 8px;">📊 ${task.normative}%</span>` : ''}
            </div>
            <div class="task-time-info">
            <span class="task-start-time">№ ${task.supply}</span>
            <span> | </span>
            <span class="task-start-time">Начало: ${task.startTime}</span>
            <span> | </span>
            <span>Время работы: ${task.time}</span>
            </div>
            </div>
            <div style="text-align: right;">
            <div class="task-payment-info">
            <span>${task.calculatedPay}</span>
            ${task.xisBonus > 0 ? `<span class="seasonal-bonus">${task.calculatedXisBonus}</span>` : ''}
            </div>
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
    
    if (tasksGrouped) tasksGrouped.innerHTML = html;
}

/**
 * Переключение раскрытия группы задач
 */
export function toggleTaskGroup(header) {
    const group = header.parentElement;
    if (group) {
        group.classList.toggle('expanded');
    }
}

/**
 * Рендеринг сетки календаря
 */
export function renderCalendarGrid(year, monthNum, userDates) {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const firstDay = new Date(year, monthNum - 1, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    
    let html = '';
    for (let i = 0; i < adjustedFirstDay; i++) {
        html += `<div></div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasData = userDates.has(dateKey);
        const isToday = new Date().toISOString().split('T')[0] === dateKey;
        const dayClass = hasData ? 'day available' : 'day';
        const todayStyle = isToday ? 'border: 2px solid var(--tg-link-color);' : '';
        
        html += `<div class="${dayClass}" style="${todayStyle}" data-date="${dateKey}">${day}</div>`;
    }
    
    calendar.innerHTML = html;
    const monthLabel = document.getElementById('currentMonth');
    if (monthLabel) monthLabel.textContent = `${monthNames[monthNum - 1]} ${year}`;
}
