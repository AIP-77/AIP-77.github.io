// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (UTILS)
// ============================================

import { EXCLUDED_WORK_TYPES } from './config.js';

/**
 * Нормализация данных в массив объектов
 */
export function normalizeRecords(data) {
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

/**
 * Парсинг русского формата числа (например, "1 234,56 ₽")
 */
export function parseRussianNumber(numberStr) {
    if (!numberStr || numberStr === '0,00 ₽') return 0;
    const cleanStr = numberStr.replace(/[^\d,\s]/g, '').replace(/\s/g, '').replace(',', '.');
    const result = parseFloat(cleanStr);
    return isNaN(result) ? 0 : result;
}

/**
 * Конвертация времени "HH:MM:SS" в секунды
 */
export function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    if (parts.length === 1) return parts[0] * 3600;
    return 0;
}

/**
 * Конвертация секунд в формат "HH:MM"
 */
export function secondsToTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Форматирование валюты
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount);
}

/**
 * Расчет оплаты за день
 */
export function calculateDayPay(tasks) {
    return tasks.reduce((sum, task) => sum + parseRussianNumber(task['Оплата']), 0);
}

/**
 * Расчет сезонной доплаты за день
 */
export function calculateXisBonus(tasks) {
    return tasks.reduce((sum, task) => sum + parseRussianNumber(task['Сезонная доплата']), 0);
}

/**
 * Расчет оплаты за месяц
 */
export function calculateMonthlyPay(tasksByDate) {
    let total = 0;
    for (const date in tasksByDate) {
        total += calculateDayPay(tasksByDate[date]);
    }
    return total;
}

/**
 * Расчет общего времени по полю
 */
export function calculateTotalTime(tasks, fieldName) {
    const totalSeconds = tasks.reduce((sum, task) => sum + timeToSeconds(task[fieldName]), 0);
    return secondsToTime(totalSeconds);
}

/**
 * Расчет производительности
 */
export function calculateEfficiency(worked, planned) {
    const workedSec = timeToSeconds(worked);
    const plannedSec = timeToSeconds(planned);
    if (plannedSec === 0) return '0%';
    return Math.round((workedSec / plannedSec) * 100) + '%';
}

/**
 * Определение цвета для норматива
 */
export function getNormativeColor(value) {
    if (value >= 100) return '#28a745';
    if (value >= 80) return '#ffc107';
    return '#dc3545';
}

/**
 * Проверка на исключенный вид работ
 */
export function isExcludedWorkType(workType) {
    return EXCLUDED_WORK_TYPES.some(excluded => workType.includes(excluded));
}

/**
 * Расчет среднего процента выполнения нормативов
 */
export function calculateAverageNormative(tasks, excludeTypes = true) {
    const validTasks = excludeTypes 
        ? tasks.filter(t => !isExcludedWorkType(t['Вид работы'])) 
        : tasks;
    
    if (validTasks.length === 0) return 0;
    
    const total = validTasks.reduce((sum, task) => {
        const normative = parseFloat(task['% норматива']);
        return sum + (isNaN(normative) ? 0 : normative);
    }, 0);
    
    return total / validTasks.length;
}

/**
 * Показать информационный баннер
 */
export function showBanner(message, type = 'info', duration = 3000) {
    let banner = document.getElementById('info-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'info-banner';
        banner.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            padding: 12px 24px; border-radius: 8px; color: white; font-weight: bold;
            z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none; transition: opacity 0.3s;
        `;
        document.body.appendChild(banner);
    }
    
    banner.textContent = message;
    banner.style.backgroundColor = type === 'error' ? '#e53935' : (type === 'success' ? '#43a047' : '#1e88e5');
    banner.style.display = 'block';
    banner.style.opacity = '1';

    if (duration > 0) {
        setTimeout(() => {
            banner.style.opacity = '0';
            setTimeout(() => banner.style.display = 'none', 300);
        }, duration);
    }
}

/**
 * Показать блок ошибки
 */
export function showError(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        errorEl.style.color = '#e53935';
        errorEl.style.padding = '10px';
        errorEl.style.textAlign = 'center';
    } else {
        console.error(message);
        alert(message);
    }
}

/**
 * Проверка, тёмный ли цвет
 */
export function isColorDark(color) {
    if (!color || color.charAt(0) !== '#') return false;
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 128;
}
