// ============================================
// ЗАГРУЗКА И ОБРАБОТКА ДАННЫХ (DATA SERVICE)
// ============================================

import { DATA_SOURCES, state } from './config.js';
import { normalizeRecords, showError, showBanner } from './utils.js';

/**
 * Безопасная обёртка для fetch с обработкой ошибок
 */
export async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        throw error;
    }
}

/**
 * Загрузка данных календаря
 */
export async function loadCalendarData() {
    const calendarLoading = document.getElementById('calendar-loading');
    const calendarContent = document.getElementById('calendar-content');
    
    try {
        calendarLoading.classList.remove('hidden');
        calendarContent.classList.add('hidden');
        
        const now = new Date();
        state.availableMonths = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            state.availableMonths.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
        }
        
        if (state.availableMonths.length === 0) {
            throw new Error('Нет месяцев');
        }
        
        state.currentMonthIndex = state.availableMonths.length - 1;
        await renderCalendarForMonth(state.availableMonths[state.currentMonthIndex]);
    } catch (err) {
        calendarLoading.innerHTML = '<p style="text-align:center;color:#e53935;">Ошибка</p>';
        console.error('Calendar data error:', err);
    }
}

/**
 * Рендеринг календаря для конкретного месяца
 */
export async function renderCalendarForMonth(monthKey) {
    const calendarLoading = document.getElementById('calendar-loading');
    const calendarContent = document.getElementById('calendar-content');
    const currentMonthSpan = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    try {
        const [yearStr, monthStr] = monthKey.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        
        const monthData = await fetchData(DATA_SOURCES.monthlyData(year, month));
        const userDates = new Set();
        
        normalizeRecords(monthData).forEach(record => {
            if (record['Сотрудник'] === state.currentUserData.name && record['Рабочий день']) {
                userDates.add(record['Рабочий день']);
            }
        });
        
        // Импорт рендеринга из UI модуля
        const { renderCalendarGrid } = await import('./ui.js');
        renderCalendarGrid(year, month, userDates);
        
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        currentMonthSpan.textContent = `${monthNames[month - 1]} ${year}`;
        prevMonthBtn.disabled = state.currentMonthIndex === 0;
        nextMonthBtn.disabled = state.currentMonthIndex === state.availableMonths.length - 1;
        
        calendarLoading.classList.add('hidden');
        calendarContent.classList.remove('hidden');
    } catch (err) {
        calendarLoading.innerHTML = '<p style="text-align:center;color:#e53935;">Ошибка</p>';
        console.error('Render calendar error:', err);
    }
}

/**
 * Загрузка записи по дате
 */
export async function loadRecordByDate(year, month, day) {
    try {
        const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
        const monthData = await fetchData(DATA_SOURCES.monthlyData(year, month));
        const records = normalizeRecords(monthData);
        
        const userTasks = records.filter(record => 
            record['Сотрудник'] === state.currentUserData.name && 
            record['Рабочий день'] === dateStr
        );
        
        if (userTasks.length === 0) {
            showBanner(`Нет данных за ${dateStr}`, 'info', 3000);
            return;
        }
        
        const tasksByDate = {};
        records.filter(r => r['Сотрудник'] === state.currentUserData.name).forEach(task => {
            if (!tasksByDate[task['Рабочий день']]) tasksByDate[task['Рабочий день']] = [];
            tasksByDate[task['Рабочий день']].push(task);
        });
        
        // Обновление UI
        document.getElementById('date').textContent = dateStr;
        
        // Импорт утилит
        const { calculateTotalTime, calculateEfficiency, calculateAverageNormative, getNormativeColor, formatCurrency, calculateDayPay, calculateXisBonus } = await import('./utils.js');
        const { renderGroupedTasks } = await import('./ui.js');
        
        document.getElementById('worked').textContent = calculateTotalTime(userTasks, 'Рабочее время');
        document.getElementById('planned').textContent = calculateTotalTime(userTasks, 'Время по табелю');
        document.getElementById('efficiency').textContent = calculateEfficiency(
            calculateTotalTime(userTasks, 'Рабочее время'), 
            calculateTotalTime(userTasks, 'Время по табелю')
        ) + '%';
        
        const avgNorm = calculateAverageNormative(userTasks, true);
        const avgNormDisplay = avgNorm !== null ? `${avgNorm}%` : '—';
        const avgNormColor = avgNorm !== null ? getNormativeColor(avgNorm) : '#999';
        document.getElementById('avg-normative').innerHTML = `<span style="color: ${avgNormColor}; font-weight: bold;">${avgNormDisplay}</span>`;
        
        document.getElementById('pay-day').textContent = formatCurrency(calculateDayPay(userTasks));
        document.getElementById('xisBonusDay').textContent = formatCurrency(calculateXisBonus(userTasks));
        document.getElementById('pay-month').textContent = formatCurrency(calculateMonthlyPay(tasksByDate));
        
        renderGroupedTasks(userTasks);
        showBanner(`Данные за ${dateStr} загружены`, 'success', 3000);
    } catch (err) {
        showBanner(`Ошибка: ${err.message}`, 'error', 5000);
        console.error('Load record error:', err);
    }
}

/**
 * Загрузка данных отдела
 */
export async function loadDepartmentData(departmentName) {
    const deptDataLoading = document.getElementById('dept-data-loading');
    const deptDataContent = document.getElementById('dept-data-content');
    
    try {
        deptDataLoading.classList.remove('hidden');
        deptDataContent.classList.add('hidden');
        
        const now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth() + 1;
        let attemptCount = 0;
        let loadedData = null;
        state.displayedMonthYear = null;
        state.isDataOutdated = false;
        
        while (attemptCount < 2 && !loadedData) {
            try {
                const data = await fetchData(DATA_SOURCES.monthlyData(year, month));
                const recs = normalizeRecords(data);
                const deptHasData = recs.some(r => r['Отдел'] === departmentName);
                
                if (deptHasData) {
                    loadedData = data;
                    state.displayedMonthYear = { year, month };
                    if (month !== now.getMonth() + 1 || year !== now.getFullYear()) {
                        state.isDataOutdated = true;
                    }
                } else {
                    throw new Error('Нет данных за этот месяц');
                }
            } catch (e) {
                month--;
                if (month === 0) { month = 12; year--; }
                attemptCount++;
            }
        }
        
        if (!loadedData) throw new Error('Нет данных за последние 3 месяца');
        
        state.dataLastUpdated = loadedData.lastUpdated;
        updateVersionInfo();
        
        const staffData = await fetchData(DATA_SOURCES.staff);
        const staffRecords = normalizeRecords(staffData);
        const monthRecords = normalizeRecords(loadedData);
        const deptEmployees = staffRecords.filter(r => r['Отдел'] === departmentName);
        
        if (deptEmployees.length === 0) throw new Error('Сотрудники не найдены');
        
        const tasksByDate = {};
        monthRecords.forEach(task => {
            if (deptEmployees.some(e => e['Сотрудник'] === task['Сотрудник'])) {
                if (!tasksByDate[task['Рабочий день']]) tasksByDate[task['Рабочий день']] = [];
                tasksByDate[task['Рабочий день']].push(task);
            }
        });
        
        const dates = Object.keys(tasksByDate).sort((a, b) => {
            const [d1,m1,y1] = a.split('.').map(Number);
            const [d2,m2,y2] = b.split('.').map(Number);
            return new Date(y2,m2-1,d2) - new Date(y1,m1-1,d1);
        });
        
        const latestDate = dates.length > 0 ? dates[0] : '—';
        let present = 0, totalEff = 0, effCount = 0, stats = [];
        
        const { calculateTotalTime, calculateEfficiency } = await import('./utils.js');
        
        deptEmployees.forEach(emp => {
            const empTasks = monthRecords.filter(task => 
                task['Сотрудник'] === emp['Сотрудник'] && 
                task['Рабочий день'] === latestDate
            );
            
            if (empTasks.length > 0) {
                present++;
                const eff = calculateEfficiency(
                    calculateTotalTime(empTasks, 'Рабочее время'), 
                    calculateTotalTime(empTasks, 'Время по табелю')
                );
                totalEff += eff; 
                effCount++;
                stats.push(`${emp['Сотрудник']}: ${eff}%`);
            } else {
                stats.push(`${emp['Сотрудник']}: отсутствует`);
            }
        });
        
        document.getElementById('dept-report-date').textContent = latestDate;
        document.getElementById('dept-attendance').textContent = `${present} из ${deptEmployees.length}`;
        document.getElementById('dept-attendance-percent').textContent = `${deptEmployees.length ? Math.round(present/deptEmployees.length*100) : 0}%`;
        document.getElementById('dept-employees-list').textContent = stats.join('\n');
        document.getElementById('dept-avg-efficiency').textContent = `${effCount ? Math.round(totalEff/effCount*100)/100 : 0}%`;
        document.getElementById('dept-last-update').textContent = `Последнее обновление: ${new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`;
        
        deptDataLoading.classList.add('hidden');
        deptDataContent.classList.remove('hidden');
        
        if (state.isDataOutdated && state.displayedMonthYear) {
            const monthNames = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
            showBanner(`⚠️ Внимание: Отчет за текущий месяц еще не сформирован. Показаны данные за ${monthNames[state.displayedMonthYear.month - 1]} ${state.displayedMonthYear.year}`, 'error', 0);
        }
    } catch (err) {
        deptDataLoading.innerHTML = '<p style="text-align:center;color:#e53935;">Ошибка</p>';
        console.error('Department data error:', err);
    }
}

/**
 * Обновление информации о версии
 */
export function updateVersionInfo() {
    const versionInfo = document.getElementById('version-info');
    
    if (!state.dataLastUpdated) {
        versionInfo.textContent = '(🛠 V.2026.04.03 🛠)';
        return;
    }
    
    try {
        const updateDate = new Date(state.dataLastUpdated);
        versionInfo.innerHTML = `(🛠 V.2026.04.03 | Данные: ${updateDate.toLocaleDateString('ru-RU')} ${updateDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})} 🛠)`;
    } catch (err) {
        versionInfo.textContent = '(🛠 V.2026.04.03 🛠)';
    }
}
