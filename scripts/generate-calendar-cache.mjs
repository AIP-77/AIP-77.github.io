// scripts/generate-calendar-cache.mjs
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// ID таблицы и листа "Кэш календаря"
const SPREADSHEET_ID = '19x2J263xJryZFiucALL5vOISyUUVjAK1fr-sOH2O4K4';
const OUTPUT_PATH = './calendar-cache.json';

function fetchSheetAsCSV() {
  return new Promise((resolve, reject) => {
    // Экспорт конкретного листа: добавьте gid=...
    // Найдите GID листа в URL таблицы: ...#gid=123456789
    const GID = '1089459860'; // ← ЗАМЕНИТЕ на GID вашего листа "Кэш календаря"
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

function parseCSV(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const result = [];
  const regex = /("(?:[^"]|"")*"|[^,\r\n]*)(?=\s*,|\s*$)/g;
  for (const line of lines) {
    const matches = [...line.matchAll(regex)].map(m => m[1]);
    const parsed = matches.map(field => {
      if (field.startsWith('"') && field.endsWith('"')) {
        return field.slice(1, -1).replace(/""/g, '"');
      }
      return field;
    });
    result.push(parsed);
  }
  return result;
}

function csvToCalendarCache(csv) {
  const parsed = parseCSV(csv);
  if (parsed.length < 2) return {};

  const headers = parsed[0].map(h => h.trim());
  const telegramIdIndex = headers.indexOf('Telegram ID');
  if (telegramIdIndex === -1) throw new Error('Столбец "Telegram ID" не найден');

  const result = {};
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    const telegramId = row[telegramIdIndex]?.trim();
    if (!telegramId) continue;

    result[telegramId] = {};

    // Обрабатываем каждый месяц (все столбцы после ФИО)
    for (let j = 2; j < headers.length; j++) {
      const monthHeader = headers[j];
      if (!monthHeader || monthHeader === 'ФИО') continue;

      // Пример: "Сентябрь 2025" → "2025-09"
      const match = monthHeader.match(/(\w+)\s+(\d{4})/);
      if (!match) continue;

      const monthName = match[1];
      const year = match[2];
      const monthNum = getMonthNumber(monthName);
      if (monthNum === null) continue;

      const key = `${year}-${String(monthNum).padStart(2, '0')}`;
      const datesStr = row[j] || '[]';
      try {
        const dates = JSON.parse(datesStr);
        if (Array.isArray(dates)) {
          result[telegramId][key] = dates;
        }
      } catch (e) {
        console.warn(`Ошибка парсинга дат для ${telegramId} в ${monthHeader}:`, datesStr);
      }
    }
  }
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
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(json, null, 2));
    console.log(`✅ ${OUTPUT_PATH} создан. Пользователей: ${Object.keys(json).length}`);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

main();
