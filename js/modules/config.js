// ============================================
// КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

export const DATA_SOURCES = {
    staff: 'https://AIP-77.github.io/archive/staff.json',
    monthlyData: (year, month) => `https://AIP-77.github.io/archive/${year}-${month.toString().padStart(2, '0')}%20fullData.json`
};

// Виды работ, которые исключаются из расчета норматива
export const EXCLUDED_WORK_TYPES = [
    'Дополнительное время для работ',
    'Рабочий день',
    'Переупаковка паллеты',
    'Другие виды работ'
];

// Глобальное состояние приложения
export const state = {
    chatId: null,
    isManager: false,
    isAdmin: false,
    currentUserData: null,
    currentRecord: null,
    currentMonthData: null,
    managedDepartments: [],
    dataLastUpdated: null,
    availableMonths: [],
    currentMonthIndex: 0,
    displayedMonthYear: null,
    isDataOutdated: false
};
