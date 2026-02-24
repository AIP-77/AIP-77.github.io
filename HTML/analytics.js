// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ АНАЛИТИКИ ===
let selectedDepartment = '';

function renderReport() {
  if (!selectedDate) {
    selectedDateDiv.classList.add('hidden');
    hideAllLevels();
    return;
  }
  
  const allRecords = records.filter(r => r['Рабочий день'] === selectedDate);
  if (allRecords.length === 0) {
    selectedDateDiv.classList.add('hidden');
    hideAllLevels();
    return;
  }
  
  selectedDateDiv.classList.remove('hidden');
  currentDateSpan.textContent = selectedDate;
  showAllLevels();
  
  renderLevel1Analytics(allRecords);
  renderLevel2Analytics(allRecords);
  renderLevel3Analytics(allRecords);
}

function hideAllLevels() {
  document.getElementById('level-1').classList.add('hidden');
  document.getElementById('level-2').classList.add('hidden');
  document.getElementById('level-3').classList.add('hidden');
}

function showAllLevels() {
  document.getElementById('level-1').classList.remove('hidden');
  document.getElementById('level-2').classList.remove('hidden');
  document.getElementById('level-3').classList.remove('hidden');
}

function renderLevel1Analytics(allRecords) {
  const responsibleRecords = allRecords.filter(r => isResponsible(r['Должность']));
  renderCombinedAnalytics(allRecords, responsibleRecords);
  renderCharts(allRecords, responsibleRecords);
  renderWorkTypeCharts(allRecords, responsibleRecords);
}

function renderLevel2Analytics(allRecords) {
  const allDepartments = [...new Set(allRecords.map(r => r['Отдел']))].filter(Boolean);
  let html = '';
  
  if (!selectedDepartment) {
    html = `
      <div class="department-selector">
        <h4>🏛️ Выберите отдел для детального анализа</h4>
        <div class="department-buttons">
          ${allDepartments.map(dept => `
            <button class="department-btn" onclick="selectDepartment('${dept}')">${dept}</button>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    const departmentRecords = allRecords.filter(r => r['Отдел'] === selectedDepartment);
    const responsibleRecords = departmentRecords.filter(r => isResponsible(r['Должность']));
    
    let totalUnits = 0, totalTime = 0, totalAmount = 0, totalTasks = 0;
    responsibleRecords.forEach(r => {
      totalUnits += parseInt(r['Количество единиц']) || 0;
      totalTime += parseTime(r['Рабочее время']);
      totalTasks++;
    });
    departmentRecords.forEach(r => {
      totalAmount += parseCurrency(r['Расчетная сумма']);
    });
    
    const normative = calculateNormative(totalUnits, totalTime);
    const costPerUnit = totalUnits > 0 ? totalAmount / totalUnits : 0;
    const totalHours = totalTime / 3600;
    const revenuePerHour = totalHours > 0 ? totalAmount / totalHours : 0;
    
    const workTypes = [...new Set(departmentRecords.map(r => r['Вид работ']))];
    const brigades = [...new Set(responsibleRecords.map(r => r['Сотрудник']))];
    const staffAnalysis = analyzeStaffForRecords(departmentRecords);
    const timesheetTime = calculateTimesheetTime(departmentRecords);
    
    html = `
      <div style="margin-bottom: 15px;">
        <button class="department-btn active" style="margin-right: 10px;">${selectedDepartment}</button>
        <button class="department-btn" onclick="selectDepartment('')">← Назад к выбору отдела</button>
      </div>
      <div class="analytics-grid">
        <div class="analytics-card">
          <h4>📊 Основные показатели</h4>
          <div class="analytics-value">${totalUnits}</div>
          <p class="analytics-label">Обработано единиц</p>
          <div class="analytics-value">${totalTasks}</div>
          <p class="analytics-label">Выполнено задач</p>
          <div class="analytics-value">${brigades.length}</div>
          <p class="analytics-label">Работало бригад</p>
        </div>
        <div class="analytics-card">
          <h4>⚡ Эффективность</h4>
          <div class="analytics-value">${normative.toFixed(1)}</div>
          <p class="analytics-label">Норматив (шт/час)</p>
          <div class="analytics-value">${formatTime(totalTime)}</div>
          <p class="analytics-label">Общее время работы</p>
          <div class="analytics-value">${formatTime(timesheetTime)}</div>
          <p class="analytics-label">Время по табелю</p>
        </div>
        <div class="analytics-card">
          <h4>💰 Расходы</h4>
          <div class="analytics-value">${formatCurrency(totalAmount)}</div>
          <p class="analytics-label">Общие расходы</p>
          <div class="analytics-value">р.${costPerUnit.toFixed(2)}</div>
          <p class="analytics-label">Расходы на 1 ед.</p>
          <div class="analytics-value">${formatCurrency(revenuePerHour)}</div>
          <p class="analytics-label">Расходы в час</p>
        </div>
        <div class="analytics-card">
          <h4>👥 Персонал отдела</h4>
          <div class="analytics-value">${staffAnalysis.total}</div>
          <p class="analytics-label">Всего сотрудников</p>
          <div class="analytics-value">${staffAnalysis.permanent}</div>
          <p class="analytics-label">Постоянные</p>
          <div class="analytics-value">${staffAnalysis.hired}</div>
          <p class="analytics-label">Наемные</p>
          <div class="analytics-value">${formatTime(staffAnalysis.totalWorkTime)}</div>
          <p class="analytics-label">Общее время работы</p>
          <div style="font-size: 11px; color: #666; margin-top: 5px;">
            Постоянные: ${formatTime(staffAnalysis.permanentWorkTime)}<br>
            Наемные: ${formatTime(staffAnalysis.hiredWorkTime)}
          </div>
        </div>
        <div class="analytics-card">
          <h4>🏢 Структура</h4>
          <div class="analytics-value">${workTypes.length}</div>
          <p class="analytics-label">Видов работ</p>
          <div class="analytics-value">${departmentRecords.length}</div>
          <p class="analytics-label">Всего операций</p>
        </div>
      </div>
    `;
  }
  
  document.getElementById('departments-content').innerHTML = html;
}

function renderLevel3Analytics(allRecords) {
  const directionStats = {};
  const unclassifiedWorkTypes = new Set();
  
  allRecords.forEach(record => {
    const direction = record['Направление'] || 'Не указано';
    const department = record['Отдел'] || 'Не указано';
    const workType = record['Вид работ'] || 'Без вида работ';
    const productGroup = record['Группа товара'] || 'Все';
    
    if (direction === 'Не указано' || department === 'Не указано') {
      unclassifiedWorkTypes.add(workType);
      return;
    }
    
    if (!directionStats[direction]) {
      directionStats[direction] = {
        departments: {},
        totalUnits: 0,
        totalTime: 0,
        totalAmount: 0
      };
    }
    
    if (!directionStats[direction].departments[department]) {
      directionStats[direction].departments[department] = {
        workTypes: {},
        totalUnits: 0,
        totalTime: 0,
        totalAmount: 0
      };
    }
    
    if (!directionStats[direction].departments[department].workTypes[workType]) {
      directionStats[direction].departments[department].workTypes[workType] = {
        totalUnits: 0,
        totalTime: 0,
        totalAmount: 0,
        tasks: 0,
        responsibleTasks: 0,
        brigades: new Set(),
        productGroups: new Set(),
        standard: getStandardForWork(workType, productGroup),
        records: []
      };
    }
    
    const workTypeStats = directionStats[direction].departments[department].workTypes[workType];
    workTypeStats.records.push(record);
    
    if (isResponsible(record['Должность'])) {
      workTypeStats.totalUnits += parseInt(record['Количество единиц']) || 0;
      workTypeStats.totalTime += parseTime(record['Рабочее время']);
      workTypeStats.responsibleTasks++;
      if (record['Сотрудник']) {
        workTypeStats.brigades.add(record['Сотрудник']);
      }
    }
    
    workTypeStats.totalAmount += parseCurrency(record['Расчетная сумма']);
    workTypeStats.tasks++;
    
    if (productGroup && productGroup !== 'Все') {
      workTypeStats.productGroups.add(productGroup);
    }
    
    if (isResponsible(record['Должность'])) {
      directionStats[direction].departments[department].totalUnits += parseInt(record['Количество единиц']) || 0;
      directionStats[direction].departments[department].totalTime += parseTime(record['Рабочее время']);
    }
    directionStats[direction].departments[department].totalAmount += parseCurrency(record['Расчетная сумма']);
    
    if (isResponsible(record['Должность'])) {
      directionStats[direction].totalUnits += parseInt(record['Количество единиц']) || 0;
      directionStats[direction].totalTime += parseTime(record['Рабочее время']);
    }
    directionStats[direction].totalAmount += parseCurrency(record['Расчетная сумма']);
  });
  
  let html = '';
  
  if (unclassifiedWorkTypes.size > 0) {
    html += `
      <div class="warning-note">
        <strong>⚠️ Внимание:</strong> Следующие виды работ не показаны в аналитике,
        так как у них не указаны направление или отдел:
        <strong>${Array.from(unclassifiedWorkTypes).join(', ')}</strong>
      </div>
    `;
  }
  
  Object.entries(directionStats).forEach(([direction, dirStats]) => {
    html += `
      <div class="direction-group">
        <div class="direction-header" onclick="toggleDirection('${direction}')">
          <h4 class="direction-title">
            <span class="toggle-icon">▶</span> ${direction}
            <span style="font-size: 14px; color: #666; margin-left: 10px;">
              (${dirStats.totalUnits} ед. | ${formatTime(dirStats.totalTime)} | ${formatCurrency(dirStats.totalAmount)})
            </span>
          </h4>
        </div>
        <div class="direction-content">
    `;
    
    Object.entries(dirStats.departments).forEach(([department, deptStats]) => {
      html += `
        <div class="department-group">
          <div class="department-subheader" onclick="toggleDepartment('${direction}', '${department}')">
            <h5 class="department-subtitle">
              <span class="toggle-icon">▶</span> ${department}
              <span style="font-size: 12px; color: #666; margin-left: 10px;">
                (${deptStats.totalUnits} ед. | ${formatTime(deptStats.totalTime)} | ${formatCurrency(deptStats.totalAmount)})
              </span>
            </h5>
          </div>
          <div class="department-content" id="dept-${direction}-${department}">
            <div class="work-types-grid">
      `;
      
      Object.entries(deptStats.workTypes).forEach(([workType, stats]) => {
        const totalHours = stats.totalTime / 3600;
        const normative = totalHours > 0 ? stats.totalUnits / totalHours : 0;
        const revenuePerHour = totalHours > 0 ? stats.totalAmount / totalHours : 0;
        const costPerUnit = stats.totalUnits > 0 ? stats.totalAmount / stats.totalUnits : 0;
        
        let performanceClass = 'performance-poor';
        let performanceText = 'Низкая';
        if (stats.standard > 0) {
          const percentage = (normative / stats.standard) * 100;
          if (percentage >= 90) {
            performanceClass = 'performance-good';
            performanceText = 'Высокая';
          } else if (percentage >= 70) {
            performanceClass = 'performance-average';
            performanceText = 'Средняя';
          }
          performanceText += ` (${percentage.toFixed(0)}%)`;
        }
        
        html += `
          <div class="work-type-card" onclick="showWorkTypeDetails('${workType}', '${selectedDate}')">
            <div class="work-type-header">
              <h4 class="work-type-name">${workType}</h4>
              <div class="${performanceClass} performance-indicator">
                ${performanceText}
              </div>
            </div>
            <div class="work-type-stats">
              <div class="stat-item">
                <div class="stat-value">${stats.totalUnits}</div>
                <div class="stat-label">Единиц</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${stats.tasks}</div>
                <div class="stat-label">Задач</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${stats.brigades.size}</div>
                <div class="stat-label">Бригад</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${formatTime(stats.totalTime)}</div>
                <div class="stat-label">Время</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${normative.toFixed(1)}</div>
                <div class="stat-label">Норматив</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${formatCurrency(stats.totalAmount)}</div>
                <div class="stat-label">Расходы</div>
              </div>
            </div>
            <div style="margin-top: 10px; font-size: 11px; color: #666;">
              ${stats.standard > 0 ? `План: ${stats.standard} шт/час | ` : ''}
              Расходы на ед.: р.${costPerUnit.toFixed(2)} |
              Расходы/час: ${formatCurrency(revenuePerHour)} |
              Группы товаров: ${stats.productGroups.size}
            </div>
          </div>
        `;
      });
      
      html += `
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
  
  document.getElementById('work-types-content').innerHTML = html;
}

function selectDepartment(department) {
  selectedDepartment = department;
  const allRecords = records.filter(r => r['Рабочий день'] === selectedDate);
  renderLevel2Analytics(allRecords);
}

function toggleDirection(direction) {
  let directionEl = null;
  document.querySelectorAll('.direction-title').forEach(el => {
    if (el.textContent.includes(direction)) {
      directionEl = el.closest('.direction-group');
    }
  });
  if (!directionEl) return;
  
  const content = directionEl.querySelector('.direction-content');
  const icon = directionEl.querySelector('.toggle-icon');
  
  if (!content.style.display || content.style.display === 'none') {
    content.style.display = 'block';
    icon.textContent = '▼';
  } else {
    content.style.display = 'none';
    icon.textContent = '▶';
  }
}

function toggleDepartment(direction, department) {
  const deptContent = document.getElementById(`dept-${direction}-${department}`);
  if (!deptContent) return;
  
  const departmentEl = deptContent.closest('.department-group');
  const icon = departmentEl.querySelector('.toggle-icon');
  
  if (!deptContent.style.display || deptContent.style.display === 'none') {
    deptContent.style.display = 'block';
    icon.textContent = '▼';
  } else {
    deptContent.style.display = 'none';
    icon.textContent = '▶';
  }
}
