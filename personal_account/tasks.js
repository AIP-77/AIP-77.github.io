// ============================================
// 4. ГРУППИРОВКА ЗАДАЧ
// ============================================
function groupTasksByType(tasks) {
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

        // Собираем значения норматива для расчета среднего (исключая определенные виды работ)
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

function renderGroupedTasks(tasks) {
    if (!tasks || tasks.length === 0) {
        tasksGrouped.innerHTML = '<p style="text-align:center;color:var(--tg-hint-color);">Нет данных</p>';
        return;
    }
    const groups = groupTasksByType(tasks);
    let html = '';
    Object.keys(groups).sort().forEach(workType => {
        const group = groups[workType];
        const totalTimeFormatted = secondsToTime(group.totalTime);
        const totalPayFormatted = formatCurrency(group.totalPay);
        const totalXisBonusFormatted = formatCurrency(group.totalXisBonus);

        // === ДОБАВЛЕНО: Расчет среднего норматива для группы ===
        let avgNormativeHtml = '';
        if (group.normativeValues.length > 0) {
            const avgNorm = Math.round((group.normativeValues.reduce((a, b) => a + b, 0) / group.normativeValues.length) * 100) / 100;
            const normColor = getNormativeColor(avgNorm);
            avgNormativeHtml = `<div class="task-group-summary-item"><span>📊</span><span style="color: ${normColor};">Ср: ${avgNorm}%</span></div>`;
        }

        html += `
        <div class="task-group">
        <div class="task-group-header" onclick="toggleTaskGroup(this)">
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
            // === ИЗМЕНЕНО: Цвет и отображение норматива ===
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
    tasksGrouped.innerHTML = html;
}

function toggleTaskGroup(header) {
    const group = header.parentElement;
    group.classList.toggle('expanded');
}
