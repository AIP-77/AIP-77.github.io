// === ИМПОРТЫ ИЗ СУЩЕСТВУЮЩИХ МОДУЛЕЙ ===
import {
    getArchiveNameForDate,
    loadData as loadArchiveData
} from './data.js';

import {
    parseTime,
    formatCurrency,
    workTypeColors
} from './utils.js';

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let allRecords = []; // Все загруженные данные
let availableWorkTypes = []; // Список всех видов работ
let isDataLoaded = false;

// === ЭЛЕМЕНТЫ DOM ===
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const workTypesListContainer = document.getElementById('workTypesList');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');
const resultsArea = document.getElementById('resultsArea');
const loadingOverlay = document.getElementById('loadingOverlay');

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', async () => {
    showLoading(true);

    try {
        // Устанавливаем даты по умолчанию (последние 30 дней)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        endDateInput.valueAsDate = today;
        startDateInput.valueAsDate = thirtyDaysAgo;

        // Загружаем все доступные архивы и собираем данные
        await loadAllAvailableData();

        // Заполняем список видов работ
        renderWorkTypesCheckboxes();

        showLoading(false);
    } catch (error) {
        console.error('Ошибка при инициализации:', error);
        resultsArea.innerHTML = `<div style="color: red; text-align: center;">Ошибка загрузки данных: ${error.message}</div>`;
        showLoading(false);
    }
});

// === ЗАГРУЗКА ДАННЫХ ===
async function loadAllAvailableData() {
    allRecords = [];
    const processedArchives = new Set();

    // Получаем диапазон дат из инпутов (если они уже установлены)
    const start = startDateInput.value ? new Date(startDateInput.value) : new Date(2024, 0, 1);
    const end = endDateInput.value ? new Date(endDateInput.value) : new Date();

    // Перебираем месяцы в диапазоне
    const current = new Date(start);
    current.setDate(1);

    while (current <= end) {
        const archiveName = getArchiveNameForDate(current);

        if (!processedArchives.has(archiveName)) {
            try {
                // Пытаемся загрузить архив
                // Примечание: loadData может требовать специфичных параметров в зависимости от реализации
                // Здесь мы предполагаем, что можем получить сырые данные
                const data = await fetchArchiveData(archiveName);

                if (data && data.length > 0) {
                    allRecords = [...allRecords, ...data];
                    processedArchives.add(archiveName);
                }
            } catch (e) {
                console.warn(`Не удалось загрузить архив ${archiveName}:`, e);
            }
        }

        // Переходим к следующему месяцу
        current.setMonth(current.getMonth() + 1);
    }

    // Извлекаем уникальные виды работ
    const workTypesSet = new Set();
    allRecords.forEach(record => {
        if (record['Вид работы']) {
            workTypesSet.add(record['Вид работы']);
        }
    });

    availableWorkTypes = Array.from(workTypesSet).sort();
    isDataLoaded = true;
}

// Функция для получения данных из архива (адаптирована под вашу структуру data.js)
async function fetchArchiveData(archiveName) {
    // Эта функция должна быть реализована в зависимости от того, как именно data.js возвращает данные
    // Если loadData возвращает Promise с данными, используем её
    // Иначе делаем fetch напрямую

    // Вариант 1: Если есть экспортированная функция для получения сырых данных
    // return await getRawData(archiveName);

    // Вариант 2: Прямой fetch (стандартный подход)
    const url = `archives/${archiveName}.json`; // Или другой путь, зависящий от вашей структуры

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.warn(`Архив ${archiveName} недоступен, пробуем альтернативный путь...`);
        // Попытка загрузить с основным путем, если archives папка не найдена
        const altUrl = `data/${archiveName}.json`;
        const altResponse = await fetch(altUrl);
        if (!altResponse.ok) throw new Error('Данные не найдены');
        return await altResponse.json();
    }
}

// === ОТРИСОВКА ЧЕКБОКСОВ ===
function renderWorkTypesCheckboxes() {
    if (!availableWorkTypes.length) {
        workTypesListContainer.innerHTML = '<div style="padding: 10px; color: #999;">Виды работ не найдены</div>';
        return;
    }

    workTypesListContainer.innerHTML = '';

    availableWorkTypes.forEach((workType, index) => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = workType;
        checkbox.id = `wt-${index}`;

        // Цветная метка рядом с названием
        const colorDot = document.createElement('span');
        colorDot.style.width = '12px';
        colorDot.style.height = '12px';
        colorDot.style.borderRadius = '50%';
        colorDot.style.display = 'inline-block';
        colorDot.style.backgroundColor = workTypeColors[workType] || '#ccc';

        const textSpan = document.createElement('span');
        textSpan.textContent = workType;

        label.appendChild(checkbox);
        label.appendChild(colorDot);
        label.appendChild(textSpan);

        workTypesListContainer.appendChild(label);
    });
}

// === ОБРАБОТЧИКИ СОБЫТИЙ ===
analyzeBtn.addEventListener('click', () => {
    if (!isDataLoaded) {
        alert('Данные еще загружаются. Пожалуйста, подождите.');
        return;
    }

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите даты начала и окончания периода.');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('Дата начала не может быть позже даты окончания.');
        return;
    }

    // Получаем выбранные виды работ
    const selectedCheckboxes = workTypesListContainer.querySelectorAll('input[type="checkbox"]:checked');
    const selectedWorkTypes = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (selectedWorkTypes.length === 0) {
        alert('Пожалуйста, выберите хотя бы один вид работы.');
        return;
    }

    performAnalysis(startDate, endDate, selectedWorkTypes);
});

resetBtn.addEventListener('click', () => {
    startDateInput.value = '';
    endDateInput.value = '';
    workTypesListContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    resultsArea.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">Выберите период и виды работ для начала анализа</div>';
});

// === АНАЛИЗ ДАННЫХ ===
function performAnalysis(startStr, endStr, workTypes) {
    showLoading(true);

    // Небольшая задержка, чтобы UI успел обновиться
    setTimeout(() => {
        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        endDate.setHours(23, 59, 59, 999); // Включаем весь последний день

        // Фильтрация данных по периоду и видам работ
        const filteredData = allRecords.filter(record => {
            const recordDate = parseDate(record['Рабочий день']);
            return recordDate >= startDate &&
                   recordDate <= endDate &&
                   workTypes.includes(record['Вид работы']);
        });

        // Группировка и агрегация данных по видам работ
        const analysisResults = {};

        workTypes.forEach(wt => {
            const wtData = filteredData.filter(r => r['Вид работы'] === wt);

            if (wtData.length === 0) {
                analysisResults[wt] = {
                    workType: wt,
                    units: 0,
                    tasks: 0,
                    brigades: new Set(),
                    workDays: new Set(),
                    totalHours: 0,
                    normativ: 0,
                    totalCost: 0,
                    hasData: false
                };
                return;
            }

            const units = wtData.reduce((sum, r) => sum + (parseFloat(r['Единицы']) || 0), 0);
            const tasks = wtData.length;
            const brigades = new Set(wtData.map(r => r['Бригада']).filter(Boolean));
            const workDays = new Set(wtData.map(r => r['Рабочий день']));

            let totalHours = 0;
            wtData.forEach(r => {
                const time = parseTime(r['Время работы']);
                totalHours += time;
            });

            // Берем норматив из первой записи (предполагаем, что он одинаков для вида работ)
            const normativ = parseFloat(wtData[0]['Норматив (шт/час)']) || 0;

            const totalCost = wtData.reduce((sum, r) => sum + (parseFloat(r['Расходы']) || 0), 0);

            analysisResults[wt] = {
                workType: wt,
                units,
                tasks,
                brigadesCount: brigades.size,
                workDaysCount: workDays.size,
                totalHours,
                normativ,
                totalCost,
                costPerUnit: units > 0 ? totalCost / units : 0,
                costPerHour: totalHours > 0 ? totalCost / totalHours : 0,
                productivity: totalHours > 0 ? units / totalHours : 0,
                hasData: true
            };
        });

        renderResults(analysisResults, workTypes);
        showLoading(false);
    }, 100);
}

// Вспомогательная функция парсинга даты в формате DD.MM.YYYY
function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const [day, month, year] = dateStr.split('.').map(Number);
    return new Date(year, month - 1, day);
}

// === ОТРИСОВКА РЕЗУЛЬТАТОВ ===
function renderResults(results, workTypesOrder) {
    if (!results || Object.keys(results).length === 0) {
        resultsArea.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">Нет данных для выбранных критериев</div>';
        return;
    }

    // Находим лидера по производительности (если есть данные)
    let maxProductivity = 0;
    let leaderWorkType = null;

    Object.values(results).forEach(res => {
        if (res.hasData && res.productivity > maxProductivity) {
            maxProductivity = res.productivity;
            leaderWorkType = res.workType;
        }
    });

    // 1. Сводная таблица
    let tableHTML = `
        <div class="comparison-table-wrapper">
            <h2>📋 Сводная таблица показателей</h2>
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Вид работы</th>
                        <th>Единицы</th>
                        <th>Задачи</th>
                        <th>Бригады</th>
                        <th>Дни работы</th>
                        <th>Время (часы)</th>
                        <th>Норматив (шт/час)</th>
                        <th>Расходы (общие)</th>
                        <th>Расходы на ед.</th>
                        <th>Расходы на час</th>
                        <th>Производительность</th>
                    </tr>
                </thead>
                <tbody>
    `;

    workTypesOrder.forEach(wt => {
        const res = results[wt];
        const isLeader = res.workType === leaderWorkType && res.hasData;
        const rowClass = isLeader ? 'highlight-leader' : '';

        tableHTML += `
            <tr class="${rowClass}">
                <td><strong>${res.workType}</strong>${isLeader ? ' 🏆' : ''}</td>
                <td>${res.units.toLocaleString('ru-RU')}</td>
                <td>${res.tasks}</td>
                <td>${res.brigadesCount || 0}</td>
                <td>${res.workDaysCount || 0}</td>
                <td>${res.totalHours.toFixed(2)}</td>
                <td>${res.normativ.toFixed(2)}</td>
                <td>${formatCurrency(res.totalCost)}</td>
                <td>${res.units > 0 ? formatCurrency(res.costPerUnit) : '-'}</td>
                <td>${res.totalHours > 0 ? formatCurrency(res.costPerHour) : '-'}</td>
                <td>${res.hasData ? res.productivity.toFixed(2) : '-'}</td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    // 2. Карточки деталей
    let cardsHTML = `<div class="cards-container"><h2 style="grid-column: 1/-1;">📊 Детализация по видам работ</h2>`;

    workTypesOrder.forEach(wt => {
        const res = results[wt];
        const isLeader = res.workType === leaderWorkType && res.hasData;
        const cardClass = isLeader ? 'stat-card highlight-leader' : 'stat-card';

        cardsHTML += `
            <div class="${cardClass}">
                <h3>${res.workType}${isLeader ? ' 🏆' : ''}</h3>
                <div class="stat-row">
                    <span class="stat-label">Объем работ:</span>
                    <span class="stat-value">${res.units.toLocaleString('ru-RU')} ед.</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Количество задач:</span>
                    <span class="stat-value">${res.tasks}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Задействовано бригад:</span>
                    <span class="stat-value">${res.brigadesCount || 0}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Рабочих дней:</span>
                    <span class="stat-value">${res.workDaysCount || 0}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Общее время:</span>
                    <span class="stat-value">${res.totalHours.toFixed(2)} ч.</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Норматив:</span>
                    <span class="stat-value">${res.normativ.toFixed(2)} шт/час</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Общие расходы:</span>
                    <span class="stat-value">${formatCurrency(res.totalCost)}</span>
                </div>
                ${res.hasData ? `
                <div class="stat-row" style="border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">
                    <span class="stat-label">Производительность:</span>
                    <span class="stat-value" style="color: #27ae60;">${res.productivity.toFixed(2)} шт/час</span>
                </div>
                ` : ''}
            </div>
        `;
    });

    cardsHTML += `</div>`;

    resultsArea.innerHTML = tableHTML + cardsHTML;
}

// === УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ ===
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}
