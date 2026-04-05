// ============================================
// 5. КАЛЕНДАРЬ
// ============================================
async function loadCalendarData() {
    try {
        calendarLoading.classList.remove('hidden');
        calendarContent.classList.add('hidden');
        const now = new Date();
        availableMonths = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            availableMonths.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
        }
        if (availableMonths.length === 0) throw new Error('Нет месяцев');
        currentMonthIndex = availableMonths.length - 1;
        await renderCalendarForMonth(availableMonths[currentMonthIndex]);
    } catch (err) {
        calendarLoading.innerHTML = '<p style="text-align:center;color:#e53935;">Ошибка</p>';
    }
}

async function renderCalendarForMonth(monthKey) {
    try {
        const [yearStr, monthStr] = monthKey.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        const monthData = await fetchData(DATA_SOURCES.monthlyData(year, month));
        const userDates = new Set();
        normalizeRecords(monthData).forEach(record => {
            if (record['Сотрудник'] === currentUserData.name && record['Рабочий день']) {
                userDates.add(record['Рабочий день']);
            }
        });
        renderCalendarGrid(year, month, userDates);
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        currentMonthSpan.textContent = `${monthNames[month - 1]} ${year}`;
        prevMonthBtn.disabled = currentMonthIndex === 0;
        nextMonthBtn.disabled = currentMonthIndex === availableMonths.length - 1;
        calendarLoading.classList.add('hidden');
        calendarContent.classList.remove('hidden');
    } catch (err) {
        calendarLoading.innerHTML = '<p style="text-align:center;color:#e53935;">Ошибка</p>';
    }
}

function renderCalendarGrid(year, monthNum, userDates) {
    calendar.innerHTML = '';
    ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(day => {
        const el = document.createElement('div');
        el.textContent = day;
        el.style.fontWeight = 'bold';
        el.style.textAlign = 'center';
        calendar.appendChild(el);
    });
    const firstDay = new Date(year, monthNum - 1, 1);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const lastDayNum = new Date(year, monthNum, 0).getDate();
    for (let i = 0; i < startDay; i++) calendar.appendChild(document.createElement('div'));
    for (let day = 1; day <= lastDayNum; day++) {
        const el = document.createElement('div');
        el.className = 'day';
        el.textContent = day;
        const dateStr = `${String(day).padStart(2, '0')}.${String(monthNum).padStart(2, '0')}.${year}`;
        if (userDates.has(dateStr)) {
            el.classList.add('available');
            el.addEventListener('click', () => loadRecordByDate(year, monthNum, day));
        } else {
            el.style.color = 'var(--tg-hint-color)';
            el.style.cursor = 'default';
        }
        calendar.appendChild(el);
    }
}

async function loadRecordByDate(year, month, day) {
    try {
        const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
        const monthData = await fetchData(DATA_SOURCES.monthlyData(year, month));
        const records = normalizeRecords(monthData);
        const userTasks = records.filter(record => record['Сотрудник'] === currentUserData.name && record['Рабочий день'] === dateStr);
        if (userTasks.length === 0) {
            showBanner(`Нет данных за ${dateStr}`, 'info', 3000);
            return;
        }
        const tasksByDate = {};
        records.filter(r => r['Сотрудник'] === currentUserData.name).forEach(task => {
            if (!tasksByDate[task['Рабочий день']]) tasksByDate[task['Рабочий день']] = [];
            tasksByDate[task['Рабочий день']].push(task);
        });
        document.getElementById('date').textContent = dateStr;
        document.getElementById('worked').textContent = calculateTotalTime(userTasks, 'Рабочее время');
        document.getElementById('planned').textContent = calculateTotalTime(userTasks, 'Время по табелю');
        document.getElementById('efficiency').textContent = calculateEfficiency(calculateTotalTime(userTasks, 'Рабочее время'), calculateTotalTime(userTasks, 'Время по табелю')) + '%';

        // === ДОБАВЛЕНО: Расчет среднего норматива для даты ===
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
    }
}
