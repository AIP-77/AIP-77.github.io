// === МОДАЛЬНЫЕ ОКНА ===
function showWorkTypeDetails(workType, date) {
  const allRecords = records.filter(r => r['Рабочий день'] === date && r['Вид работ'] === workType);
  const responsibleRecords = allRecords.filter(r => isResponsible(r['Должность']));
  
  let totalUnits = 0, totalTime = 0, totalAmount = 0, totalTasks = 0;
  responsibleRecords.forEach(r => {
    totalUnits += parseInt(r['Количество единиц']) || 0;
    totalTime += parseTime(r['Рабочее время']);
    totalTasks++;
  });
  allRecords.forEach(r => {
    totalAmount += parseCurrency(r['Расчетная сумма']);
  });
  
  const normative = calculateNormative(totalUnits, totalTime);
  const costPerUnit = totalUnits > 0 ? totalAmount / totalUnits : 0;
  const standard = getStandardForWork(workType);
  const { direction, department } = getDirectionAndDepartment(workType);
  const brigades = [...new Set(responsibleRecords.map(r => r['Сотрудник']))];
  const productGroups = [...new Set(allRecords.map(r => r['Группа товара']))];
  const supplies = [...new Set(allRecords.map(r => r['Поставка']))];
  
  let html = `
    <h3>🔍 Детализация по виду работ: ${workType}</h3>
    <p><strong>Дата:</strong> ${date}</p>
    <p><strong>Направление:</strong> ${direction} | <strong>Отдел:</strong> ${department}</p>
    <div class="analytics-grid" style="margin: 15px 0;">
      <div class="analytics-card">
        <h4>📊 Основные показатели</h4>
        <div class="analytics-value">${totalUnits}</div>
        <p class="analytics-label">Всего единиц</p>
        <div class="analytics-value">${totalTasks}</div>
        <p class="analytics-label">Задач</p>
        <div class="analytics-value">${brigades.length}</div>
        <p class="analytics-label">Бригад</p>
      </div>
      <div class="analytics-card">
        <h4>⚡ Эффективность</h4>
        <div class="analytics-value">${normative.toFixed(1)}</div>
        <p class="analytics-label">Норматив (шт/час)</p>
        <div class="analytics-value">${formatTime(totalTime)}</div>
        <p class="analytics-label">Время работы</p>
        <div class="analytics-value">${(totalTime / 3600).toFixed(1)}</div>
        <p class="analytics-label">Отработано часов</p>
      </div>
      <div class="analytics-card">
        <h4>💰 Расходы</h4>
        <div class="analytics-value">${formatCurrency(totalAmount)}</div>
        <p class="analytics-label">Общие расходы</p>
        <div class="analytics-value">р.${costPerUnit.toFixed(2)}</div>
        <p class="analytics-label">Расходы на 1 ед.</p>
        <div class="analytics-value">${formatCurrency(totalAmount / (totalTime / 3600))}</div>
        <p class="analytics-label">Расходы в час</p>
      </div>
    </div>
  `;
  
  if (standard > 0) {
    html += `
      <div style="background: #e8f5e9; padding: 10px; border-radius: 6px; margin: 15px 0;">
        <h4>🎯 Выполнение плана</h4>
        <div style="display: flex; align-items: center; gap: 15px;">
          <div style="flex: 1; background: #e0e0e0; border-radius: 10px; height: 20px;">
            <div style="background: #4caf50; height: 100%; border-radius: 10px; width: ${Math.min((normative / standard) * 100, 100)}%;"></div>
          </div>
          <div style="font-weight: bold;">
            ${((normative / standard) * 100).toFixed(1)}%
          </div>
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 5px;">
          Факт: ${normative.toFixed(1)} шт/час | План: ${standard} шт/час
        </div>
      </div>
    `;
  }
  
  html += `<h4>👥 Работа бригад</h4><div class="grouping-grid">`;
  
  const brigadeStats = {};
  responsibleRecords.forEach(record => {
    const brigade = record['Сотрудник'] || 'Не указано';
    const supply = record['Поставка'] || 'Без поставки';
    if (!brigadeStats[brigade]) {
      brigadeStats[brigade] = {
        units: 0,
        time: 0,
        tasks: 0,
        amount: 0,
        supplies: {}
      };
    }
    brigadeStats[brigade].units += parseInt(record['Количество единиц']) || 0;
    brigadeStats[brigade].time += parseTime(record['Рабочее время']);
    brigadeStats[brigade].tasks++;
    brigadeStats[brigade].amount += parseCurrency(record['Расчетная сумма']);
    
    if (!brigadeStats[brigade].supplies[supply]) {
      brigadeStats[brigade].supplies[supply] = {
        units: 0,
        time: 0,
        helpers: []
      };
    }
    brigadeStats[brigade].supplies[supply].units += parseInt(record['Количество единиц']) || 0;
    brigadeStats[brigade].supplies[supply].time += parseTime(record['Рабочее время']);
    
    const supplyRecords = allRecords.filter(r =>
      r['Поставка'] === supply &&
      r['Вид работ'] === workType &&
      !isResponsible(r['Должность'])
    );
    supplyRecords.forEach(helperRecord => {
      if (!brigadeStats[brigade].supplies[supply].helpers.find(h => h.name === helperRecord['Сотрудник'])) {
        brigadeStats[brigade].supplies[supply].helpers.push({
          name: helperRecord['Сотрудник'],
          role: helperRecord['Должность'] || 'Сотрудник'
        });
      }
    });
  });
  
  Object.entries(brigadeStats).forEach(([brigade, stats]) => {
    const brigadeNormative = stats.time > 0 ? calculateNormative(stats.units, stats.time) : 0;
    const brigadeCostPerUnit = stats.units > 0 ? stats.amount / stats.units : 0;
    
    html += `
      <div class="group-card">
        <h5>${brigade}</h5>
        <div class="group-stats">
          <div class="group-stat-item">
            <div class="group-stat-value">${stats.units}</div>
            <div class="group-stat-label">Единиц</div>
          </div>
          <div class="group-stat-item">
            <div class="group-stat-value">${stats.tasks}</div>
            <div class="group-stat-label">Задач</div>
          </div>
          <div class="group-stat-item">
            <div class="group-stat-value">${brigadeNormative.toFixed(1)}</div>
            <div class="group-stat-label">Норматив</div>
          </div>
          <div class="group-stat-item">
            <div class="group-stat-value">р.${brigadeCostPerUnit.toFixed(2)}</div>
            <div class="group-stat-label">Расходы на ед.</div>
          </div>
          <div class="group-stat-item">
            <div class="group-stat-value">${formatTime(stats.time)}</div>
            <div class="group-stat-label">Время</div>
          </div>
          <div class="group-stat-item">
            <div class="group-stat-value">${formatCurrency(stats.amount)}</div>
            <div class="group-stat-label">Расходы</div>
          </div>
        </div>
        <div style="margin-top: 10px;">
          <h6>Поставки:</h6>
          ${Object.entries(stats.supplies).map(([supply, supplyData]) => `
            <div class="supply-details-expanded">
              <div class="supply-header">${supply} (${supplyData.units} ед. | ${formatTime(supplyData.time)})</div>
              ${supplyData.helpers.length > 0 ? `
                <div class="helper-list">
                  <strong>Помощники:</strong>
                  ${supplyData.helpers.map(helper => `
                    <div class="helper-item">
                      <span class="helper-name">${helper.name}</span>
                      <span class="helper-role">${helper.role}</span>
                    </div>
                  `).join('')}
                </div>
              ` : '<div style="font-size: 11px; color: #999;">Нет помощников</div>'}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  document.getElementById('worktype-modal-content').innerHTML = html;
  document.getElementById('worktype-modal').style.display = 'block';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
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

function exportToExcel() {
  alert('Функция экспорта будет реализована позже');
}
