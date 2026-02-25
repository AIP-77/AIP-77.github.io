// === ЦВЕТА И КОНСТАНТЫ ===
const workTypeColors = {
  'Погрузка': '#FF6B6B',
  'Разгрузка': '#4ECDC4',
  'Сортировка': '#45B7D1',
  'Упаковка': '#96CEB4',
  'Комплектация': '#FFEAA7',
  'Проверка': '#DDA0DD',
  'Маркировка': '#98D8C8',
  'Перемещение': '#F7DC6F',
  'Транспортировка': '#FFA726',
  'Сборка': '#AB47BC',
  'Распаковка': '#26C6DA',
  'Учет': '#66BB6A',
  'Инвентаризация': '#FFCA28',
  'Подготовка': '#78909C',
  'Обработка': '#EC407A',
  'Фасовка': '#8D6E63',
  'Контроль': '#42A5F5',
  'Отбор': '#7E57C2',
  'Стеллажирование': '#9CCC65',
  'Палетизация': '#FF7043',
  'Распределение': '#26A69A',
  'Стикеровка': '#5D4037',
  'Переупаковка': '#00897B',
  'По умолчанию': '#BBBBBB'
};

const chartLabels = {
  workTypes: {
    'Погрузка': 'Отгрузка',
    'Разгрузка': 'Главная обработка',
    'Сортировка': 'Упаковка продукции',
    'Упаковка': 'Стикеровка продукции',
    'Комплектация': 'Транспортировка',
    'Проверка': 'Работа с рекламациями',
    'Маркировка': 'Другие виды работ'
  },
  departments: {
    'Приемка': 'Отгрузка',
    'Отгрузка': 'МП',
    'Сортировка': 'Сборка',
    'Упаковка': 'Покупка'
  },
  timeIntervals: [
    '09:10', '10:11', '11:12', '12:13', '13:14', '14:15',
    '16:17', '17:18', '18:19'
  ],
  costDistribution: {
    'Погрузка': 'Главная обработка (23.2%)',
    'Разгрузка': 'Стикеровка продукции (22.7%)',
    'Сортировка': 'Другие виды работ (22.3%)',
    'Упаковка': 'Упаковка продукции (13.6%)',
    'Комплектация': 'Работа с рекламациями (10.9%)',
    'Проверка': 'Отгрузка (7.9%)'
  }
};

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function parseTime(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length !== 3) return 0;
  const [h, m, s] = parts;
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTimeHours(seconds) {
  const hours = seconds / 3600;
  return hours.toFixed(1);
}

function parseCurrency(str) {
  if (!str || typeof str !== 'string') return 0;
  let clean = str.trim().replace(/^р\.\s*/i, '');
  clean = clean.replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(amount) {
  return `р.${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

function getHourFromTime(timeStr) {
  if (!timeStr) return null;
  const [h] = timeStr.split(':');
  return parseInt(h) || 0;
}

function isResponsible(position) {
  return position === 'Ответственный' || position === 'Ответсвенный';
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function calculateNormative(units, seconds) {
  if (seconds <= 0) return 0;
  const hours = seconds / 3600;
  return units / hours;
}

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function getHourIntervalForWorkDay(timeStr, workDate) {
  if (!timeStr) return null;
  const hour = getHourFromTime(timeStr);
  if (hour === null) return null;
  if (hour < 9) {
    const displayStart = String(hour).padStart(2, '0');
    const displayEnd = String((hour + 1) % 24).padStart(2, '0');
    return {
      key: `${displayStart}-${displayEnd}`,
      display: `${displayStart}-${displayEnd} (ночь)`,
      shortDisplay: `${displayStart}–${displayEnd}`,
      isNight: true,
      sortKey: hour + 24
    };
  } else {
    const displayStart = String(hour).padStart(2, '0');
    const displayEnd = String(hour + 1).padStart(2, '0');
    return {
      key: `${displayStart}-${displayEnd}`,
      display: `${displayStart}-${displayEnd}`,
      shortDisplay: `${displayStart}–${displayEnd}`,
      isNight: false,
      sortKey: hour
    };
  }
}

function normalizeRecords(data) {
  if (data && data.columns && data.data) {
    return data.data.map(row => {
      const obj = {};
      data.columns.forEach((col, idx) => {
        obj[col] = row[idx] || '';
      });
      return obj;
    });
  }
  if (data && data.records && Array.isArray(data.records)) {
    return data.records;
  }
  return [];
}

function getWorkTypeColor(workType) {
  if (workTypeColors[workType]) {
    return workTypeColors[workType];
  }
  let hash = 0;
  for (let i = 0; i < workType.length; i++) {
    hash = workType.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  const colors = [
    '#FF9800', '#9C27B0', '#3F51B5', '#009688', '#795548',
    '#607D8B', '#E91E63', '#2196F3', '#4CAF50', '#FFC107',
    '#673AB7', '#00BCD4', '#8BC34A', '#FF5722', '#CDDC39',
    '#FFEB3B', '#03A9F4', '#8BC34A', '#FF9800', '#9C27B0'
  ];
  const color = colors[hash % colors.length];
  workTypeColors[workType] = color;
  return color;
}

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
  
  // Позиционируем tooltip рядом с курсором
  const tooltipWidth = tooltip.offsetWidth || 150; // Примерная ширина
  const tooltipHeight = tooltip.offsetHeight || 40; // Примерная высота
  
  // Отступы от курсора
  const offsetX = 15;
  const offsetY = 15;
  
  // Координаты мыши
  let left = event.clientX + offsetX;
  let top = event.clientY + offsetY;
  
  // Проверяем, не выходит ли tooltip за правый край экрана
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  if (left + tooltipWidth > windowWidth) {
    left = event.clientX - tooltipWidth - offsetX;
  }
  
  if (top + tooltipHeight > windowHeight) {
    top = event.clientY - tooltipHeight - offsetY;
  }
  
  // Учитываем прокрутку
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  tooltip.style.left = (left + scrollLeft) + 'px';
  tooltip.style.top = (top + scrollTop) + 'px';
}

function hideTooltip() {
  tooltipTimeout = setTimeout(() => {
    const tooltip = document.getElementById('customTooltip');
    tooltip.style.display = 'none';
    tooltipTimeout = null;
  }, 1000);
}
