// scripts/generate-data.mjs
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const SPREADSHEET_ID = '19x2J263xJryZFiucALL5vOISyUUVjAK1fr-sOH2O4K4';
const OUTPUT_PATH = './data.json';

function fetchSheetAsCSV() {
  return new Promise((resolve, reject) => {
    const originalUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;

    function followRedirects(url, redirectCount = 0) {
      if (redirectCount > 5) {
        return reject(new Error('Слишком много редиректов'));
      }

      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (GitHub Actions)'
        }
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

// --- Парсинг CSV ---
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

function csvToJson(csv) {
  const parsed = parseCSV(csv);
  if (parsed.length < 2) return {};

  const headers = parsed[0].map(h => h.trim());
  const telegramIdIndex = headers.indexOf('telegramId');

  if (telegramIdIndex === -1) {
    console.error('Заголовки:', headers);
    throw new Error('Столбец "telegramId" не найден');
  }

  const result = {};
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    const telegramId = row[telegramIdIndex]?.trim();
    if (!telegramId) continue;

    // Парсим mainData
    const mainDataStr = row[headers.indexOf('mainData')] || '{}';
    let mainData = {};
    try {
      mainData = JSON.parse(mainDataStr);
    } catch (e) {
      console.warn(`⚠️ Ошибка парсинга mainData в строке ${i}:`, mainDataStr.substring(0, 50));
      continue;
    }

    // Парсим другие JSON-поля
    const detailsStr = row[headers.indexOf('details')] || '[]';
    const efficiencyDataStr = row[headers.indexOf('efficiencyData')] || '[]';
    const earningsDataStr = row[headers.indexOf('earningsData')] || '[]';
    const managedDepartmentsStr = row[headers.indexOf('managedDepartments')] || '[]';

    let details = [];
    let efficiencyData = [];
    let earningsData = [];
    let managedDepartments = [];

    try { details = JSON.parse(detailsStr); } catch (e) {}
    try { efficiencyData = JSON.parse(efficiencyDataStr); } catch (e) {}
    try { earningsData = JSON.parse(earningsDataStr); } catch (e) {}
    try { managedDepartments = JSON.parse(managedDepartmentsStr); } catch (e) {}

    if (!result[telegramId]) {
      result[telegramId] = {
        role: row[headers.indexOf('role')] || '',
        department: row[headers.indexOf('department')] || '',
        records: []
      };
    }

    result[telegramId].records.push({
      date: mainData.date || row[headers.indexOf('workDate')] || '',
      worked: mainData.worked || '',
      planned: mainData.planned || '',
      efficiency: mainData.efficiency || '',
      payDay: mainData.payDay || '',
      payMonth: mainData.payMonth || '',
      xisBonusDay: mainData.xisBonusDay || '',

      // Добавляем все остальные поля
      details: details,
      efficiencyData: efficiencyData,
      earningsData: earningsData,
      managedDepartments: managedDepartments,

      // Можно добавить и raw-данные, если нужно
      // raw: {
      //   workDate: row[headers.indexOf('workDate')],
      //   updateTimestamp: row[headers.indexOf('updateTimestamp')]
      // }
    });
  }

  return result;
}

// --- Запуск ---
async function main() {
  try {
    console.log('Загрузка данных из Google Таблицы...');
    const csv = await fetchSheetAsCSV();
    console.log('CSV (фрагмент):', csv.substring(0, 200));

    const json = csvToJson(csv);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(json, null, 2));
    console.log(`✅ data.json обновлён. Всего пользователей: ${Object.keys(json).length}`);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

main();
