

function showTooltip(event, element) {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
  const tooltip = document.getElementById('customTooltip');
  const text = element.getAttribute('data-tooltip');
  if (!text) return;
  tooltip.textContent = text;
  tooltip.style.display = 'block';
  
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  const top = rect.top - tooltipRect.height - 8;
  const windowWidth = window.innerWidth;
  const leftClamped = Math.max(0, Math.min(left, windowWidth - tooltipRect.width));
  tooltip.style.left = leftClamped + 'px';
  tooltip.style.top = Math.max(0, top) + 'px';
}

function hideTooltip() {
  tooltipTimeout = setTimeout(() => {
    const tooltip = document.getElementById('customTooltip');
    tooltip.style.display = 'none';
    tooltipTimeout = null;
  }, 1000);
}

// === DONUT CHART ===
function renderDonutChart(donutData) {
  const total = Object.values(donutData).reduce((sum, v) => sum + v, 0);
  if (total <= 0 || isNaN(total)) {
    return '<div class="chart-placeholder">Нет данных для отображения</div>';
  }
  
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  let startAngle = 0;
  let svgHtml = `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" style="max-width: 160px; margin: 0 auto;">`;
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#AB47BC', '#26C6DA'
  ];
  
  let i = 0;
  for (const [label, value] of Object.entries(donutData)) {
    if (value <= 0) continue;
    const percentage = (value / total) * 100;
    if (percentage < 0.1) continue;
    
    const endAngle = startAngle + (percentage * 3.6);
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = 80 + radius * Math.cos(startRad);
    const y1 = 80 + radius * Math.sin(startRad);
    const x2 = 80 + radius * Math.cos(endRad);
    const y2 = 80 + radius * Math.sin(endRad);
    
    const largeArcFlag = percentage > 50 ? 1 : 0;
    const path = `M 80,80 L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
    
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) continue;
    
    svgHtml += `<path d="${path}" fill="${colors[i % colors.length]}" />`;
    startAngle = endAngle;
    i++;
  }
  
  svgHtml += '</svg>';
  const centerText = `<div class="donut-center">${total.toFixed(0)} ч</div>`;
  return `<div class="chart-pie">${svgHtml}${centerText}</div>`;
}

// === НАСТРОЙКА ФИЛЬТРОВ DONUT ===
function setupDonutFilters(workTypeHours, allWorkTypes) {
  const checkboxes = document.querySelectorAll('.work-type-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (donutRenderTimeout) {
        clearTimeout(donutRenderTimeout);
      }
      
      donutRenderTimeout = setTimeout(() => {
        const selectedWorkTypes = Array.from(checkboxes)
          .filter(cb => cb.checked)
          .map(cb => cb.dataset.worktype);
        
        if (selectedWorkTypes.length === 0) {
          document.getElementById('donut-chart-container').innerHTML =
            '<div class="chart-placeholder">Выберите хотя бы один вид работ</div>';
          return;
        }
        
        const displayWorkTypes = selectedWorkTypes.slice(0, 6);
        const donutData = {};
        displayWorkTypes.forEach(workType => {
          donutData[workType] = workTypeHours[workType] || 0;
        });
        
        document.getElementById('donut-chart-container').innerHTML = renderDonutChart(donutData);
      }, 200);
    });
  });
}

// === 24-HOUR WORK CHART ===
function render24HourWorkChart(workType, records) {
  const hours = Array(24).fill(0);
  
  records.forEach(record => {
    if (record['Вид работ'] !== workType) return;
    const startTimeStr = record['Начало задачи'];
    if (!startTimeStr || typeof startTimeStr !== 'string') return;
    
    const hour = parseInt(startTimeStr.split(':')[0]) || 0;
    if (hour < 0 || hour >= 24) return;
    
    const units = parseInt(record['Количество единиц']) || 0;
    hours[hour] += units;
  });
  
  const maxVal = Math.max(...hours);
  const scale = maxVal > 0 ? 100 / maxVal : 1;
  const color = getWorkTypeColor(workType);
  
  let html = '<div class="chart-24h">';
  for (let h = 0; h < 24; h++) {
    const value = hours[h];
    const heightPercent = value > 0 ? (value * scale) : 0;
    const label = `${String(h).padStart(2, '0')}-${String(h + 1).padStart(2, '0')}`;
    
    html += `
      <div class="chart-24h-bar" title="${label}: ${value} ед.">
        <div class="chart-24h-bar-inner"
             style="height: ${heightPercent}%; background-color: ${color};">
        </div>
        <div class="chart-24h-label">${label}</div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

// === WORK TYPE CHARTS (С РАЗДЕЛЕНИЕМ НА СМЕНЫ) ===
function renderWorkTypeCharts(allRecords, responsibleRecords) {
  const workTypeTimeStats = {};
  
  // Сбор данных
  allRecords.forEach(record => {
    if (!isResponsible(record['Должность'])) return;
    const workType = record['Вид работ'] || 'Без вида работ';
    
    if (!workTypeTimeStats[workType]) {
      workTypeTimeStats[workType] = { totalUnits: 0, timeIntervals: {} };
    }
    workTypeTimeStats[workType].totalUnits += parseInt(record['Количество единиц']) || 0;
    
    const interval = getHourIntervalForWorkDay(record['Начало задачи'], selectedDate);
    if (!interval) return;
    
    if (!workTypeTimeStats[workType].timeIntervals[interval.key]) {
      workTypeTimeStats[workType].timeIntervals[interval.key] = { interval: interval, units: 0 };
    }
    workTypeTimeStats[workType].timeIntervals[interval.key].units += parseInt(record['Количество единиц']) || 0;
  });
  
  const workTypeOrder = [
    'Главная сборка','Сборка Шины','Сборка Шины-зона А','Сборка Шины (Исключение)','Сборка шины МП','Сборка шины МП-зона А','Стикеровка Шины',
    'Сборка Диски','Сборка Диски (Исключение)','Сборка Диски МП','Стикеровка Диски',
    'Упаковка паллеты',	'Транспортировка МП',	'Погрузка МП','Переупаковка паллеты',
    'Транспортировка товара по складу','Погрузка','Отгрузка',
    'Работа с расхождениями',
    'Разгрузка','Размещение','Размещение прихода шин','Размещение возвратов опт',
    'Другие виды работ'    
  ];
  
  let html = '<div class="charts-grid">';
  
  // Вспомогательная функция для отрисовки одной смены
  function renderShiftGraph(stats, shiftHoursArray, shiftName, isNight, currentWorkType, currentColor) {
    const hoursData = [];
    let maxUnitsInShift = 0;
    let totalShiftUnits = 0;
    
    shiftHoursArray.forEach(h => {
      const key = `${String(h).padStart(2,'0')}-${String(h+1).padStart(2,'0')}`;
      const data = stats.timeIntervals[key] || { units: 0 };
      hoursData.push({ hour: h, key, units: data.units });
      if (data.units > maxUnitsInShift) maxUnitsInShift = data.units;
      totalShiftUnits += data.units;
    });
    
    if (totalShiftUnits === 0) {
      return `<div class="shift-container empty">
                <div class="shift-title">${shiftName} <span style="font-size:11px; color:#666;">(0 ед.)</span></div>
                <div class="shift-empty">Нет активности</div>
              </div>`;
    }
    
    let barsHtml = '<div class="chart-bar">';
    hoursData.forEach(item => {
      const heightPercent = maxUnitsInShift > 0 ? (item.units / maxUnitsInShift) * 100 : 0;
      const percentage = stats.totalUnits > 0 ? (item.units / stats.totalUnits) * 100 : 0;
      
      barsHtml += `
        <div class="chart-bar-item"
             style="height: ${heightPercent}%; background-color: ${currentColor}; opacity: ${item.units > 0 ? 1 : 0.2};"
             data-tooltip="${item.key}: ${item.units} ед. (${percentage.toFixed(1)}%)"
             onmouseenter="showShiftTooltip(event, this)"
             onmouseleave="hideShiftTooltip()">
        </div>
      `;
    });
    barsHtml += '</div>';
    
    let labelsHtml = '<div class="chart-bar-labels" style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 9px; color: #666; text-align: center;">';
    hoursData.forEach(item => {
      const label = `${String(item.hour).padStart(2,'0')}-${String(item.hour+1).padStart(2,'0')}`;
      labelsHtml += `<div style="flex: 1; min-width: 0; word-break: break-all; transform: rotate(-90deg); transform-origin: top left; position: relative; top: 10px; width: 24px; text-align: center;">${label}</div>`;
    });
    labelsHtml += '</div>';
    
    return `
      <div class="shift-container ${isNight ? 'night-shift' : 'day-shift'}">
        <div class="shift-title">${shiftName} <span style="font-size:11px; color:#666;">(${totalShiftUnits} ед.)</span></div>
        ${barsHtml}
        ${labelsHtml}
      </div>
    `;
  }
  
  function processWorkType(workType, stats) {
    if (!stats || stats.totalUnits === 0) return '';
    
    const dayHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const nightHours = [21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8];
    
    const color = getWorkTypeColor(workType);
    const dayGraph = renderShiftGraph(stats, dayHours, '🌞 Дневная смена (09:00–21:00)', false, workType, color);
    const nightGraph = renderShiftGraph(stats, nightHours, '🌙 Ночная смена (21:00–09:00)', true, workType, color);
    
    return `
      <div class="chart-container split-shift-chart">
        <h4 class="chart-title">${workType} <span style="font-size:12px; font-weight:normal; color:#666;">(Всего: ${stats.totalUnits} ед.)</span></h4>
        <div class="shifts-wrapper">
          ${dayGraph}
          ${nightGraph}
        </div>
        <div style="text-align: center; font-size: 10px; color: #999; margin-top: 5px;">
          * Масштаб высоты столбцов индивидуален для каждой смены
        </div>
      </div>
    `;
  }
  
  workTypeOrder.forEach(workType => {
    const stats = workTypeTimeStats[workType];
    if (stats) html += processWorkType(workType, stats);
  });
  
  Object.entries(workTypeTimeStats).forEach(([workType, stats]) => {
    if (!workTypeOrder.includes(workType)) {
      html += processWorkType(workType, stats);
    }
  });
  
  html += '</div>';
  document.getElementById('work-type-charts-content').innerHTML = html;
}

// === WORK TYPE CHART (для блока "Детальные графики") ===
function renderWorkTypeChart(workTypeData) {
  const sortedWorkTypes = Object.entries(workTypeData)
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 8);
  
  if (sortedWorkTypes.length === 0) {
    return '<div class="chart-placeholder">Нет данных</div>';
  }
  
  const maxUnits = Math.max(...sortedWorkTypes.map(([_, data]) => data.units));
  let html = '<div class="chart-bar">';
  
  sortedWorkTypes.forEach(([workType, data]) => {
    const heightPercent = maxUnits > 0 ? (data.units / maxUnits) * 100 : 0;
    const normative = data.time > 0 ? calculateNormative(data.units, data.time) : 0;
    const displayName = chartLabels.workTypes[workType] || workType;
    const shortName = displayName.length > 12 ? displayName.substring(0, 10) + '...' : displayName;
    const tooltipText = `${displayName}: ${data.units} ед. (${normative.toFixed(1)} шт/час)`;
    
    html += `
      <div class="chart-bar-item"
           style="height: ${heightPercent}%; background-color: ${getWorkTypeColor(workType)}"
           data-tooltip="${tooltipText}"
           onmouseenter="showTooltip(event, this)"
           onmouseleave="hideTooltip()">
      </div>
    `;
  });
  
  html += '</div><div class="chart-bar-labels">';
  sortedWorkTypes.forEach(([workType, data]) => {
    const displayName = chartLabels.workTypes[workType] || workType;
    const shortName = displayName.length > 12 ? displayName.substring(0, 10) + '...' : displayName;
    html += `<div class="chart-bar-label">${shortName}</div>`;
  });
  html += '</div>';
  
  return html;
}

// === TIME DISTRIBUTION CHART ===
function renderTimeDistributionChart(timeDistribution) {
  const sortedIntervals = Object.values(timeDistribution)
    .sort((a, b) => a.interval.sortKey - b.interval.sortKey);
  const maxUnits = Math.max(...sortedIntervals.map(stats => stats.units));
  
  let html = '<div class="chart-bar">';
  sortedIntervals.forEach(stats => {
    const heightPercent = maxUnits > 0 ? (stats.units / maxUnits) * 100 : 0;
    const color = stats.interval.isNight ? '#5c6bc0' : '#2196f3';
    const tooltipText = `${stats.interval.display}: ${stats.units} ед.`;
    
    html += `
      <div class="chart-bar-item"
           style="height: ${heightPercent}%; background-color: ${color}"
           data-tooltip="${tooltipText}"
           onmouseenter="showTooltip(event, this)"
           onmouseleave="hideTooltip()">
      </div>
    `;
  });
  html += '</div>';
  html += '<div class="chart-bar-labels" style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 10px; color: #666; text-align: center;">';
  sortedIntervals.forEach(stats => {
    const label = stats.interval.shortDisplay;
    html += `<div style="flex: 1; min-width: 0; word-break: break-all;">${label}</div>`;
  });
  html += '</div>';
  
  return html;
}

// === DEPARTMENT CHART ===
function renderDepartmentChart(departmentData) {
  const sortedDepartments = Object.entries(departmentData)
    .filter(([dept]) => dept !== 'Не указано')
    .sort((a, b) => {
      const normativeA = a[1].time > 0 ? calculateNormative(a[1].units, a[1].time) : 0;
      const normativeB = b[1].time > 0 ? calculateNormative(b[1].units, b[1].time) : 0;
      return normativeB - normativeA;
    })
    .slice(0, 6);
  
  const maxNormative = Math.max(...sortedDepartments.map(([_, data]) => {
    return data.time > 0 ? calculateNormative(data.units, data.time) : 0;
  }));
  
  let html = '<div class="chart-bar">';
  sortedDepartments.forEach(([department, data]) => {
    const normative = data.time > 0 ? calculateNormative(data.units, data.time) : 0;
    const heightPercent = maxNormative > 0 ? (normative / maxNormative) * 100 : 0;
    const displayName = chartLabels.departments[department] || department;
    const shortName = displayName.length > 10 ? displayName.substring(0, 8) + '...' : displayName;
    const tooltipText = `${displayName}: ${normative.toFixed(1)} шт/час`;
    
    html += `
      <div class="chart-bar-item"
           style="height: ${heightPercent}%; background-color: #4caf50"
           data-tooltip="${tooltipText}"
           onmouseenter="showTooltip(event, this)"
           onmouseleave="hideTooltip()">
      </div>
    `;
  });
  html += '</div><div class="chart-bar-labels">';
  sortedDepartments.forEach(([department, data]) => {
    const displayName = chartLabels.departments[department] || department;
    const shortName = displayName.length > 10 ? displayName.substring(0, 8) + '...' : displayName;
    const normative = data.time > 0 ? calculateNormative(data.units, data.time) : 0;
    html += `<div class="chart-bar-label" title="${normative.toFixed(1)} шт/час">${shortName}</div>`;
  });
  html += '</div>';
  
  return html;
}

// === COMBINED ANALYTICS CHARTS ===
function renderCharts(allRecords, responsibleRecords) {
  const workTypeHours = {};
  allRecords.forEach(record => {
    const workType = record['Вид работ'] || 'Не указано';
    let timeStr;
    if (record['Рабочее время'] && record['Рабочее время'].trim() !== '') {
      timeStr = record['Рабочее время'];
    } else if (record['Время по табелю'] && record['Время по табелю'].trim() !== '') {
      timeStr = record['Время по табелю'];
    } else {
      return;
    }
    let hours = 0;
    if (typeof timeStr === 'string') {
      const parts = timeStr.split(':').map(Number);
      if (parts.length >= 2) {
        const h = parts[0] || 0;
        const m = parts[1] || 0;
        hours = h + (m / 60);
      }
    }
    workTypeHours[workType] = (workTypeHours[workType] || 0) + hours;
  });
  
  const excluded = ['Рабочий день', 'Дополнительное время для работ'];
  const allWorkTypes = Object.keys(workTypeHours)
    .filter(type => !excluded.includes(type))
    .sort((a, b) => workTypeHours[b] - workTypeHours[a]);
  const topWorkTypes = allWorkTypes.slice(0, 10);
  
  let filterHtml = '<div class="donut-filters"><strong>Фильтр видов работ:</strong><br>';
  topWorkTypes.forEach(workType => {
    const displayName = chartLabels.workTypes[workType] || workType;
    const shortName = displayName.length > 20 ? displayName.substring(0, 20) + '...' : displayName;
    filterHtml += `
      <label class="donut-filter-item">
        <input type="checkbox" class="work-type-checkbox" data-worktype="${workType}">
        ${shortName}
      </label>
    `;
  });
  filterHtml += '</div>';
  
  const workTypeData = {};
  const timeDistribution = {};
  const departmentData = {};
  
  responsibleRecords.forEach(record => {
    const workType = record['Вид работ'] || 'Без вида работ';
    if (!workTypeData[workType]) workTypeData[workType] = { units: 0, time: 0, amount: 0 };
    workTypeData[workType].units += parseInt(record['Количество единиц']) || 0;
    workTypeData[workType].time += parseTime(record['Рабочее время']);
    workTypeData[workType].amount += parseCurrency(record['Расчетная сумма']);
  });
  
  responsibleRecords.forEach(record => {
    const interval = getHourIntervalForWorkDay(record['Начало задачи'], selectedDate);
    if (!interval) return;
    if (!timeDistribution[interval.key]) {
      timeDistribution[interval.key] = { interval, units: 0, tasks: 0 };
    }
    timeDistribution[interval.key].units += parseInt(record['Количество единиц']) || 0;
    timeDistribution[interval.key].tasks++;
  });
  
  responsibleRecords.forEach(record => {
    const department = record['Отдел'] || 'Не указано';
    if (!departmentData[department]) {
      departmentData[department] = { units: 0, time: 0, amount: 0 };
    }
    departmentData[department].units += parseInt(record['Количество единиц']) || 0;
    departmentData[department].time += parseTime(record['Рабочее время']);
    departmentData[department].amount += parseCurrency(record['Расчетная сумма']);
  });
  
  const html = `
    <div class="charts-grid">
      <div class="chart-container donut-full">
        <h4 class="chart-title">📊 Распределение Трудозатрат</h4>
        <p>Выберите виды работ для анализа.</p>
        ${filterHtml}
        <div class="chart-real" id="donut-chart-container">
          ${renderDonutChart({})}
        </div>
      </div>
      <div class="chart-container">
        <h4 class="chart-title">📊 Распределение по видам работ</h4>
        <div class="chart-real">
          ${renderWorkTypeChart(workTypeData)}
        </div>
      </div>
      <div class="chart-container">
        <h4 class="chart-title">⏰ Активность по времени суток</h4>
        <div class="chart-real">
          ${renderTimeDistributionChart(timeDistribution)}
        </div>
      </div>
      <div class="chart-container">
        <h4 class="chart-title">🏢 Эффективность отделов</h4>
        <div class="chart-real">
          ${renderDepartmentChart(departmentData)}
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('charts-content').innerHTML = html;
  setupDonutFilters(workTypeHours, topWorkTypes);
}

// === COMPARISON ANALYTICS ===
function renderComparisonAnalytics(currentDate) {
  const currentDateObj = parseDate(currentDate);
  const previousDates = [];
  for (let i = 1; i <= 7; i++) {
    const date = new Date(currentDateObj);
    date.setDate(currentDateObj.getDate() - i);
    const dateStr = formatDate(date);
    previousDates.push({ date: dateStr, records: records.filter(r => r['Рабочий день'] === dateStr) });
  }
  
  const currentDayRecords = records.filter(r => r['Рабочий день'] === currentDate);
  const currentResponsibleRecords = currentDayRecords.filter(r => isResponsible(r['Должность']));
  
  let currentUnits = 0, currentTime = 0, currentAmount = 0;
  currentResponsibleRecords.forEach(r => {
    currentUnits += parseInt(r['Количество единиц']) || 0;
    currentTime += parseTime(r['Рабочее время']);
  });
  currentDayRecords.forEach(r => {
    currentAmount += parseCurrency(r['Расчетная сумма']);
  });
  
  const currentNormative = calculateNormative(currentUnits, currentTime);
  const currentCostPerUnit = currentUnits > 0 ? currentAmount / currentUnits : 0;
  
  let html = '<h4 style="margin: 20px 0 15px 0; color: #333;">📈 Сравнение с предыдущими днями</h4><div class="comparison-grid">';
  
  const previousUnits = previousDates.map(d => {
    const respRecords = d.records.filter(r => isResponsible(r['Должность']));
    return respRecords.reduce((sum, r) => sum + (parseInt(r['Количество единиц']) || 0), 0);
  }).filter(val => val > 0);
  const avgUnits = previousUnits.length > 0 ? previousUnits.reduce((a, b) => a + b) / previousUnits.length : 0;
  const unitsTrend = currentUnits - avgUnits;
  const unitsPercent = avgUnits > 0 ? ((unitsTrend / avgUnits) * 100).toFixed(1) : 0;
  const unitsIsGood = unitsTrend >= 0;
  
  html += `
    <div class="comparison-card">
      <h4>📦 Единицы</h4>
      <div class="analytics-value">${currentUnits}</div>
      <p class="analytics-label">Сегодня</p>
      <div class="analytics-value ${unitsIsGood ? 'trend-up' : 'trend-down'}">
        ${unitsIsGood ? '↗' : '↘'} ${Math.abs(unitsPercent)}%
      </div>
      <p class="analytics-label">Среднее: ${avgUnits.toFixed(0)}</p>
    </div>
  `;
  
  const previousNorms = previousDates.map(d => {
    const respRecords = d.records.filter(r => isResponsible(r['Должность']));
    const units = respRecords.reduce((sum, r) => sum + (parseInt(r['Количество единиц']) || 0), 0);
    const time = respRecords.reduce((sum, r) => sum + parseTime(r['Рабочее время']), 0);
    return calculateNormative(units, time);
  }).filter(val => val > 0);
  const avgNorm = previousNorms.length > 0 ? previousNorms.reduce((a, b) => a + b) / previousNorms.length : 0;
  const normTrend = currentNormative - avgNorm;
  const normPercent = avgNorm > 0 ? ((normTrend / avgNorm) * 100).toFixed(1) : 0;
  const normIsGood = normTrend >= 0;
  
  html += `
    <div class="comparison-card">
      <h4>⚡ Норматив</h4>
      <div class="analytics-value">${currentNormative.toFixed(1)}</div>
      <p class="analytics-label">Сегодня (шт/час)</p>
      <div class="analytics-value ${normIsGood ? 'trend-up' : 'trend-down'}">
        ${normIsGood ? '↗' : '↘'} ${Math.abs(normPercent)}%
      </div>
      <p class="analytics-label">Среднее: ${avgNorm.toFixed(1)}</p>
    </div>
  `;
  
  const previousAmounts = previousDates.map(d =>
    d.records.reduce((sum, r) => sum + parseCurrency(r['Расчетная сумма']), 0)
  ).filter(val => val > 0);
  const avgAmount = previousAmounts.length > 0 ? previousAmounts.reduce((a, b) => a + b) / previousAmounts.length : 0;
  const amountTrend = currentAmount - avgAmount;
  const amountPercent = avgAmount > 0 ? ((amountTrend / avgAmount) * 100).toFixed(1) : 0;
  const amountIsGood = amountTrend < 0;
  
  const previousCosts = previousDates.map(d => {
    const respRecords = d.records.filter(r => isResponsible(r['Должность']));
    const units = respRecords.reduce((sum, r) => sum + (parseInt(r['Количество единиц']) || 0), 0);
    const amount = d.records.reduce((sum, r) => sum + parseCurrency(r['Расчетная сумма']), 0);
    return units > 0 ? amount / units : 0;
  }).filter(val => val > 0);
  const avgCost = previousCosts.length > 0 ? previousCosts.reduce((a, b) => a + b) / previousCosts.length : 0;
  const costTrend = currentCostPerUnit - avgCost;
  const costPercent = avgCost > 0 ? ((costTrend / avgCost) * 100).toFixed(1) : 0;
  const costIsGood = costTrend < 0;
  
  html += `
    <div class="comparison-card">
      <h4>💰 Расходы</h4>
      <div class="analytics-value">${formatCurrency(currentAmount)}</div>
      <p class="analytics-label">Сегодня</p>
      <div class="analytics-value ${amountIsGood ? 'trend-up' : 'trend-down'}">
        ${amountIsGood ? '↗' : '↘'} ${Math.abs(amountPercent)}%
      </div>
      <p class="analytics-label">Среднее: ${formatCurrency(avgAmount)}</p>
    </div>
    <div class="comparison-card">
      <h4>💵 Расходы на ед.</h4>
      <div class="analytics-value">р.${currentCostPerUnit.toFixed(2)}</div>
      <p class="analytics-label">Сегодня</p>
      <div class="analytics-value ${costIsGood ? 'trend-up' : 'trend-down'}">
        ${costIsGood ? '↗' : '↘'} ${Math.abs(costPercent)}%
      </div>
      <p class="analytics-label">Среднее: р.${avgCost.toFixed(2)}</p>
    </div>
  `;
  
  html += '</div>';
  return html;
}
