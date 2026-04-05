// ============================================
// 7. ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
// ============================================
async function loadUserData() {
    try {
        // 1. Загружаем справочник сотрудников
        const staffData = await fetchData(DATA_SOURCES.staff);
        const staffRecords = normalizeRecords(staffData); // === ВАЖНО: Используем нормализацию ===

        // 2. Если ID не определен, запрашиваем вручную
        if (!chatId || chatId === 'undefined' || chatId === 'null') {
            const manualInput = prompt('Введите ваш Telegram ID или пароль:', '');
            if (!manualInput) throw new Error('Идентификатор не указан');
            chatId = manualInput.trim();
        }

        // 3. Ищем пользователя (сравниваем как строки, игнорируя пробелы)
        // Проверяем оба поля: и 'Telegram ID', и 'Пароль'
        let userRecord = staffRecords.find(record => {
            const recordTgId = String(record['Telegram ID'] || '').trim();
            const recordPass = String(record['Пароль'] || '').trim();
            const inputId = String(chatId).trim();

            return recordTgId === inputId || recordPass === inputId;
        });

        // 4. Если не нашли — выводим подробную ошибку
        if (!userRecord) {
            console.error('Введенный ID:', chatId);
            console.error('Доступные ID в системе:', staffRecords.slice(0, 5).map(r => r['Telegram ID']));
            throw new Error('Идентификатор не найден в системе. Проверьте правильность ввода.');
        }

        // 5. Сохраняем данные пользователя
        currentUserData = {
            name: userRecord['Сотрудник'],
            department: userRecord['Отдел'],
            role: userRecord['Роль'],
            managedDepartments: userRecord['Руководит отделом'] ? [userRecord['Руководит отделом']] : []
        };

        isManager = ['менеджер', 'руководитель', 'админ'].includes(currentUserData.role.toLowerCase());
        isAdmin = currentUserData.role.toLowerCase() === 'админ';
        managedDepartments = currentUserData.managedDepartments;

        // 6. Умная загрузка данных месяца (текущий или прошлый)
        const now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth() + 1;
        let attemptCount = 0;
        let loadedData = null;
        displayedMonthYear = null;
        isDataOutdated = false;

        while (attemptCount < 2 && !loadedData) {
            try {
                const data = await fetchData(DATA_SOURCES.monthlyData(year, month));
                const recs = normalizeRecords(data);
                const userHasData = recs.some(r => String(r['Сотрудник']).trim() === String(currentUserData.name).trim());

                if (userHasData) {
                    loadedData = data;
                    displayedMonthYear = { year, month };
                    if (month !== now.getMonth() + 1 || year !== now.getFullYear()) isDataOutdated = true;
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

        currentMonthData = loadedData;
        dataLastUpdated = currentMonthData.lastUpdated;
        updateVersionInfo();
        await generatePersonalReport();
        await loadCalendarData();
        renderUI();
        loading.classList.add('hidden');
    } catch (err) {
        loading.classList.add('hidden');
        showError('Ошибка: ' + err.message);
    }
}

async function generatePersonalReport() {
    if (!currentMonthData || !currentUserData) return;
    const userTasks = normalizeRecords(currentMonthData).filter(record => record['Сотрудник'] === currentUserData.name);
    if (userTasks.length === 0) {
        showBanner('Нет данных о задачах за текущий месяц', 'info');
        return;
    }
    const tasksByDate = {};
    userTasks.forEach(task => {
        if (!tasksByDate[task['Рабочий день']]) tasksByDate[task['Рабочий день']] = [];
        tasksByDate[task['Рабочий день']].push(task);
    });
    const dates = Object.keys(tasksByDate).sort((a, b) => {
        const [d1,m1,y1] = a.split('.').map(Number);
        const [d2,m2,y2] = b.split('.').map(Number);
        return new Date(y2,m2-1,d2) - new Date(y1,m1-1,d1);
    });
    if (dates.length === 0) return;
    const latestTasks = tasksByDate[dates[0]];

    // === ДОБАВЛЕНО: Расчет среднего норматива ===
    const avgNorm = calculateAverageNormative(latestTasks, true);
    const avgNormDisplay = avgNorm !== null ? `${avgNorm}%` : '—';
    const avgNormColor = avgNorm !== null ? getNormativeColor(avgNorm) : '#999';

    currentRecord = {
        date: dates[0],
        worked: calculateTotalTime(latestTasks, 'Рабочее время'),
        planned: calculateTotalTime(latestTasks, 'Время по табелю'),
        efficiency: calculateEfficiency(calculateTotalTime(latestTasks, 'Рабочее время'), calculateTotalTime(latestTasks, 'Время по табелю')) + '%',
        avgNormative: `<span style="color: ${avgNormColor}; font-weight: bold;">${avgNormDisplay}</span>`,
        payDay: formatCurrency(calculateDayPay(latestTasks)),
        xisBonusDay: formatCurrency(calculateXisBonus(latestTasks)),
        payMonth: formatCurrency(calculateMonthlyPay(tasksByDate)),
        details: latestTasks
    };
    updateMainData();
    updateDetails();
}

function updateDetails() {
    if (!currentRecord?.details) {
        tasksGrouped.innerHTML = '<p style="text-align:center;color:var(--tg-hint-color);">Нет данных</p>';
        return;
    }
    renderGroupedTasks(currentRecord.details);
    detailsLoading.classList.add('hidden');
    detailsContent.classList.remove('hidden');
}

function updateMainData() {
    if (!currentUserData || !currentRecord) return;
    document.getElementById('name').textContent = currentUserData.name;
    document.getElementById('department').textContent = currentUserData.department;
    document.getElementById('date').textContent = currentRecord.date;
    document.getElementById('worked').textContent = currentRecord.worked;
    document.getElementById('planned').textContent = currentRecord.planned;
    document.getElementById('efficiency').textContent = currentRecord.efficiency;
    document.getElementById('avg-normative').innerHTML = currentRecord.avgNormative;
    document.getElementById('pay-day').textContent = currentRecord.payDay;
    document.getElementById('xisBonusDay').textContent = currentRecord.xisBonusDay;
    document.getElementById('pay-month').textContent = currentRecord.payMonth;
    mainDataLoading.classList.add('hidden');
    mainDataContent.classList.remove('hidden');
}

function renderUI() {
    if (isManager) tabManager.classList.remove('hidden');
    if (isAdmin) tabAdmin.classList.remove('hidden');
    employeeView.classList.remove('hidden');
    updateLastUpdate();
    if (isManager) initializeManagerView();

    if (isDataOutdated && displayedMonthYear) {
        const monthNames = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
        showBanner(`⚠️ Внимание: Отчет за текущий месяц еще не сформирован. Показаны данные за ${monthNames[displayedMonthYear.month - 1]} ${displayedMonthYear.year}`, 'error', 0);
    }
}
