// scripts/generate-calendar-cache.mjs
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const SPREADSHEET_ID = '19x2J263xJryZFiucALL5vOISyUUVjAK1fr-sOH2O4K4';
const OUTPUT_PATH = './calendar-cache.json';

function fetchSheetAsCSV() {
  return new Promise((resolve, reject) => {
    const GID = '1089459860'; // ← ЗАМЕНИТЕ на реальный GID вашего листа "Кэш календаря"
    const originalUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID}`;

    function followRedirects(url, redirectCount = 0) {
      if (redirectCount > 5) return reject(new Error('Слишком много редиректов'));
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (GitHub Actions)' }
      };
      const req = lib.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const nextUrl = new URL(res.headers.location, url).href;
          followRedirects(nextUrl, redirectCount + 1);
        } else if (res.statusCode === 200) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
      req.on('error', reject);
      req.end();
    }
    followRedirects(originalUrl);
  });
}

// Простой парсер CSV
function parseCSV(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const result = [];
  for (let line of lines) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    result.push(values);
  }
  return result;
}

function csvToCalendarCache(csv) {
  const parsed = parseCSV(csv);
  if (parsed.length < 2) {
    console.log('⚠️ CSV пуст или содержит меньше 2 строк');
    return {};
  }

  // Заменяем неразрывные пробелы на обычные
  const headers = parsed[0].map(h => h.trim().replace(/\u00A0/g, ' '));
  console.log('✅ Заголовки:', headers);

  const telegramIdIndex = headers.indexOf('Telegram ID');
  if (telegramIdIndex === -1) {
    console.error('❌ Столбец "Telegram ID" не найден. Доступные заголовки:', headers);
    return {};
  }

  const result = {};
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    const telegramId = row[telegramIdIndex]?.trim();
    if (!telegramId) {
      console.warn(`⚠️ Пустой Telegram ID в строке ${i}`);
      continue;
    }

    result[String(telegramId)] = {};

    for (let j = 2; j < headers.length; j++) {
      const monthHeader = headers[j];
      if (!monthHeader || monthHeader === 'ФИО') continue;

      // Улучшенная регулярка с поддержкой неразрывного пробела
      const match = monthHeader.match(/(\w+)[\s\u00A0]+(\d{4})/);
      if (!match) {
        console.warn(`⚠️ Не удалось распознать месяц из "${monthHeader}"`);
        continue;
      }

      const monthName = match[1];
      const year = match[2];
      const monthNum = getMonthNumber(monthName);
      if (monthNum === null) {
        console.warn(`⚠️ Неизвестный месяц: "${monthName}"`);
        continue;
      }

      const key = `${year}-${String(monthNum).padStart(2, '0')}`;
      const datesStr = row[j] || '[]';
      try {
        const dates = JSON.parse(datesStr);
        if (Array.isArray(dates)) {
          result[String(telegramId)][key] = dates;
        } else {
          console.warn(`⚠️ Не массив: ${datesStr}`);
        }
      } catch (e) {
        console.warn(`⚠️ Ошибка парсинга дат для ${telegramId} в ${monthHeader}:`, datesStr.substring(0, 50));
      }
    }
  }

  console.log(`✅ Всего пользователей в кэше: ${Object.keys(result).length}`);
  return result;
}

function getMonthNumber(name) {
  const months = {
    'Январь': 1, 'Февраль': 2, 'Март': 3, 'Апрель': 4, 'Май': 5, 'Июнь': 6,
    'Июль': 7, 'Август': 8, 'Сентябрь': 9, 'Октябрь': 10, 'Ноябрь': 11, 'Декабрь': 12
  };
  return months[name] || null;
}

async function main() {
  try {
    console.log('Генерация calendar-cache.json...');
    const csv = await fetchSheetAsCSV();
    const json = csvToCalendarCache(csv);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(json, null, 2), 'utf8');
    console.log(`✅ ${OUTPUT_PATH} создан. Пользователей: ${Object.keys(json).length}`);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

main();
