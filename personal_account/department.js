// ============================================
// 6. ОТДЕЛ
// ============================================
async function loadDepartmentData(departmentName) {
    try {
        deptDataLoading.classList.remove('hidden');
        deptDataContent.classList.add('hidden');
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
                const deptHasData = recs.some(r => r['Отдел'] === departmentName);
                if (deptHasData) {
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

        dataLastUpdated = loadedData.lastUpdated;
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

        deptEmployees.forEach(emp => {
            const empTasks = monthRecords.filter(task => task['Сотрудник'] === emp['Сотрудник'] && task['Рабочий день'] === latestDate);
            if (empTasks.length > 0) {
                present++;
                const eff = calculateEfficiency(calculateTotalTime(empTasks, 'Рабочее время'), calculateTotalTime(empTasks, 'Время по табелю'));
                totalEff += eff; effCount++;
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

        if (isDataOutdated && displayedMonthYear) {
            const monthNames = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
            showBanner(`⚠️ Внимание: Отчет за текущий месяц еще не сформирован. Показаны данные за ${monthNames[displayedMonthYear.month - 1]} ${displayedMonthYear.year}`, 'error', 0);
        }
    } catch (err) {
        deptDataLoading.innerHTML = '<p style="text-align:center;color:#e53935;">Ошибка</p>';
    }
}

async function initializeManagerView() {
    if (!isManager) return;
    try {
        const staffData = await fetchData(DATA_SOURCES.staff);
        const records = normalizeRecords(staffData);
        const departments = new Set();
        records.forEach(record => {
            if (managedDepartments.includes(record['Руководит отделом']) || currentUserData.managedDepartments.includes(record['Отдел'])) {
                departments.add(record['Отдел']);
            }
        });
        managedDepartments = Array.from(departments);
        if (managedDepartments.length > 0) renderDepartmentSelector();
    } catch (err) { console.error(err); }
}

function renderDepartmentSelector() {
    departmentSelect.innerHTML = '<option value="">— Выберите отдел —</option>';
    managedDepartments.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept; opt.textContent = dept;
        departmentSelect.appendChild(opt);
    });
    departmentSelector.classList.remove('hidden');
}
