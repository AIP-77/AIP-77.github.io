// ============================================
// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function normalizeRecords(data) {
    if (data && data.columns && data.data) {
        return data.data.map(row => {
            const obj = {};
            data.columns.forEach((col, idx) => { obj[col] = row[idx] || ''; });
            return obj;
        });
    }
    if (data && data.records && Array.isArray(data.records)) return data.records;
    return [];
}

function parseRussianNumber(numberStr) {
    if (!numberStr || numberStr === '0,00 ₽') return 0;
    const cleanStr = numberStr.replace(/[^\d,\s]/g, '').replace(/\s/g, '').replace(',', '.');
    const result = parseFloat(cleanStr);
    return isNaN(result) ? 0 : result;
}

function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    if (parts.length === 1) return parts[0] * 3600;
    return 0;
}

function secondsToTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatCurrency(amount) {
    return amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2 });
}

function calculateDayPay(tasks) {
    let total = 0;
    tasks.forEach(task => {
        total += (parseRussianNumber(task['Расчетная сумма'] || '0') + parseRussianNumber(task['Доплата XIS'] || '0'));
    });
    return total;
}

function calculateXisBonus(tasks) {
    let total = 0;
    tasks.forEach(task => { total += parseRussianNumber(task['Доплата XIS'] || '0'); });
    return total;
}

function calculateMonthlyPay(tasksByDate) {
    let total = 0;
    Object.values(tasksByDate).forEach(tasks => {
        tasks.forEach(task => {
            total += (parseRussianNumber(task['Расчетная сумма'] || '0') + parseRussianNumber(task['Доплата XIS'] || '0'));
        });
    });
    return total;
}

function calculateTotalTime(tasks, fieldName) {
    let totalSeconds = 0;
    tasks.forEach(task => {
        if (task[fieldName]) totalSeconds += timeToSeconds(task[fieldName]);
    });
    return secondsToTime(totalSeconds);
}

function calculateEfficiency(worked, planned) {
    const workedSec = timeToSeconds(worked);
    const plannedSec = timeToSeconds(planned);
    if (plannedSec === 0) return 0;
    return Math.round(((workedSec / plannedSec) * 100) * 100) / 100;
}

// === ФУНКЦИЯ: Цвет норматива ===
function getNormativeColor(value) {
    if (value === null || value === undefined || value === '' || isNaN(value)) return '#999999';
    const num = parseFloat(value);
    if (num < 70) return '#e53935';
    if (num < 95) return '#fb8c00';
    if (num <= 120) return '#43a047';
    return '#1565c0';
}

// === ФУНКЦИЯ: Проверка на исключенный вид работ ===
function isExcludedWorkType(workType) {
    return EXCLUDED_WORK_TYPES.includes(workType);
}

// === ФУНКЦИЯ: Расчет среднего норматива ===
function calculateAverageNormative(tasks, excludeTypes = true) {
    let total = 0;
    let count = 0;
    tasks.forEach(task => {
        const workType = task['Вид работ'] || '';
        const normative = task['Выполнение норматива'];

        if (excludeTypes && isExcludedWorkType(workType)) return;

        if (normative !== null && normative !== undefined && normative !== '') {
            const num = parseFloat(normative);
            if (!isNaN(num)) {
                total += num;
                count++;
            }
        }
    });
    return count > 0 ? Math.round((total / count) * 100) / 100 : null;
}

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
    return await response.json();
}

function showError(msg) {
    loading.classList.add('hidden');
    error.textContent = msg;
    error.classList.remove('hidden');
}

function showBanner(message, type = 'info', duration = 5000) {
    banner.textContent = message;
    banner.className = `banner show ${type}`;
    if (duration > 0) setTimeout(() => banner.classList.remove('show'), duration);
}

function applyTelegramTheme() {
    if (!window.Telegram?.WebApp) return;

    const theme = Telegram.WebApp.themeParams;
    const root = document.documentElement;

    // Базовые цвета Telegram
    root.style.setProperty('--tg-bg-color', theme.bg_color || '#f0f2f5');
    root.style.setProperty('--tg-text-color', theme.text_color || '#1c1e21');
    root.style.setProperty('--tg-hint-color', theme.hint_color || '#999');
    root.style.setProperty('--tg-link-color', theme.link_color || '#d71923');
    root.style.setProperty('--tg-button-color', theme.button_color || '#1a8cd8');
    root.style.setProperty('--tg-button-text-color', theme.button_text_color || '#ffffff');

    // === ИСПРАВЛЕНИЕ: Определяем темную тему и задаем цвет карточек ===
    const isDark = theme.bg_color && isColorDark(theme.bg_color);

    if (isDark) {
        // Темная тема - карточки темно-серые
        root.style.setProperty('--card-bg', '#242424');
        root.style.setProperty('--card-border', '#383838');
        root.style.setProperty('--input-bg', '#2f2f2f');
        root.style.setProperty('--input-border', '#444444');
        root.style.setProperty('--hover-bg', '#333333');
    } else {
        // Светлая тема - карточки белые
        root.style.setProperty('--card-bg', '#ffffff');
        root.style.setProperty('--card-border', '#e0e0e0');
        root.style.setProperty('--input-bg', '#ffffff');
        root.style.setProperty('--input-border', '#cccccc');
        root.style.setProperty('--hover-bg', '#f5f5f5');
    }
}

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Проверка темного цвета ===
function isColorDark(color) {
    if (!color) return false;
    // Удаляем # если есть
    color = color.replace('#', '');
    // Конвертируем в RGB
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    // Формула яркости
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
}

function updateLastUpdate() {
    const now = new Date();
    document.getElementById('last-update').textContent = `Последнее обновление: ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

function updateVersionInfo() {
    if (!dataLastUpdated) {
        versionInfo.textContent = '(🛠 V.2026.02.06 🛠)';
        return;
    }
    try {
        const updateDate = new Date(dataLastUpdated);
        versionInfo.innerHTML = `(🛠 V.2026.02.06 | Данные: ${updateDate.toLocaleDateString('ru-RU')} ${updateDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})} 🛠)`;
    } catch (err) {
        versionInfo.textContent = '(🛠 V.2026.02.06 🛠)';
    }
}
