// ============================================
// 1. КОНФИГУРАЦИЯ
// ============================================
const DATA_SOURCES = {
    staff: 'https://AIP-77.github.io/archive/staff%20fullData.json',
    monthlyData: (year, month) => `https://AIP-77.github.io/archive/${year}-${month.toString().padStart(2, '0')}%20fullData.json`
};

let chatId = null;
let isManager = false;
let isAdmin = false;
let currentUserData = null;
let currentRecord = null;
let currentMonthData = null;
let managedDepartments = [];
let dataLastUpdated = null;
let availableMonths = [];
let currentMonthIndex = 0;
let displayedMonthYear = null;
let isDataOutdated = false;

// Виды работ, которые исключаются из расчета норматива
const EXCLUDED_WORK_TYPES = [
    'Дополнительное время для работ',
    'Рабочий день',
    'Переупаковка паллеты',
    'Другие виды работ'
];
