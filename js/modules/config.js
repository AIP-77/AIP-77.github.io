// ============================================
// КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

export const DATA_SOURCES = {
    // Убраны пробелы в конце строки
    staff: 'https://AIP-77.github.io/archive/staff.json',
    
    // Убраны пробелы после archive/ и перед именем файла
    monthlyData: (year, month) => `https://AIP-77.github.io/archive/${year}-${month.toString().padStart(2, '0')} fullData.json`
};

export const EXCLUDED_WORK_TYPES = [
    'Дополнительное время для работ',
    'Рабочий день',
    'Переупаковка паллеты',
    'Другие виды работ'
];

export const state = {
    chatId: null,
    isManager: false,
    isAdmin: false,
    currentUser: null, // Важно для новой логики
    currentUserData: null,
    currentRecord: null,
    currentMonthData: null,
    managedDepartments: [],
    dataLastUpdated: null,
    availableMonths: [],
    currentMonthIndex: 0,
    displayedMonthYear: null,
    isDataOutdated: false,
    currentData: null, // Для хранения массива записей
    lastUpdate: null
};
