// scripts/generate-current.mjs
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const SPREADSHEET_ID = '19x2J263xJryZFiucALL5vOISyUUVjAK1fr-sOH2O4K4';
const GID = '0'; // ← ЗАМЕНИТЕ на реальный GID вашего листа с данными!
const OUTPUT_PATH = './current.json';

function fetchSheetAsTSV() {
  return new Promise((resolve, reject) => {
    const originalUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=tsv&gid=${GID}&t=${Date.now()}`;

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

// --- Парсинг TSV ---
function parseTSV(tsv) {
  const lines = tsv.trim().split(/\r?\n/);
  const result = [];
  for (const line of lines) {
    const values = line.split('\t');
    result.push(values);
  }
  return result;
}

function csvToJson(tsv) {
  const parsed = parseTSV(tsv);
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

    const mainDataStr = row[headers.indexOf('mainData')] || '{}';
    let mainData = {};
    try {
      mainData = JSON.parse(mainDataStr);
    } catch (e) {
      console.warn(`⚠️ Ошибка парсинга mainData в строке ${i}:`, mainDataStr.substring(0, 50));
      continue;
    }

    const detailsStr = row[headers.indexOf('details')] || '[]';
    const efficiencyDataStr = row[headers.indexOf('efficiencyData')] || '[]';
    const earningsDataStr = row[headers.indexOf('earningsData')] || '[]';
    const managedDepartmentsStr = row[headers.indexOf('managedDepartments')] || '[]';

    let details = [], efficiencyData = [], earningsData = [], managedDepartments = [];
    try { details = JSON.parse(detailsStr); } catch (e) { console.warn(`⚠️ details parse error in row ${i}`); }
    try { efficiencyData = JSON.parse(efficiencyDataStr); } catch (e) { console.warn(`⚠️ efficiencyData parse error in row ${i}`); }
    try { earningsData = JSON.parse(earningsDataStr); } catch (e) { console.warn(`⚠️ earningsData parse error in row ${i}`); }
    try { managedDepartments = JSON.parse(managedDepartmentsStr); } catch (e) { console.warn(`⚠️ managedDepartments parse error in row ${i}`); }

    // Инициализируем пользователя, если ещё не создан
    if (!result[telegramId]) {
      result[telegramId] = {
        name: mainData.name || '',
        role: row[headers.indexOf('role')] || '',
        department: row[headers.indexOf('department')] || '',
        managedDepartments: [], // ← Будет заполнено ниже
        records: []
      };
    }

    // Сохраняем managedDepartments на уровне пользователя (только если ещё не задан и не пустой)
    if (Array.isArray(managedDepartments) && managedDepartments.length > 0 && result[telegramId].managedDepartments.length === 0) {
      result[telegramId].managedDepartments = managedDepartments;
    }

    // Добавляем запись БЕЗ managedDepartments
    result[telegramId].records.push({
      date: mainData.date || row[headers.indexOf('workDate')] || '',
      worked: mainData.worked || '',
      planned: mainData.planned || '',
      efficiency: mainData.efficiency || '',
      payDay: mainData.payDay || '',
      payMonth: mainData.payMonth || '',
      xisBonusDay: mainData.xisBonusDay || '',
      details: details,
      efficiencyData: efficiencyData,
      earningsData: earningsData
      // managedDepartments НЕ включаем сюда!
    });
  }

  return result;
}

async function main() {
  try {
    console.log('Загрузка данных из Google Таблицы...');
    const tsv = await fetchSheetAsTSV();
    console.log('TSV (фрагмент):', tsv.substring(0, 200));

    const json = csvToJson(tsv);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(json, null, 2));
    console.log(`✅ ${OUTPUT_PATH} обновлён. Всего пользователей: ${Object.keys(json).length}`);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

main();
