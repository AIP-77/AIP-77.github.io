// ============================================
// КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

export const DATA_SOURCES = {
    // Исправлено: убран лишний пробел в конце строки
    staff: 'https://AIP-77.github.io/archive/staff.json',
    
    // Исправлено: убран лишний пробел после archive/ и %20 перед именем файла
    // Браузер сам корректно обработает пробел в имени файла при fetch
    monthlyData: (year, month) => `https://AIP-77.github.io/archive/${year}-${month.toString().padStart(2, '0')} fullData.json`
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
