// scripts/generate-Archive.mjs
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const SPREADSHEET_ID = '19x2J263xJryZFiucALL5vOISyUUVjAK1fr-sOH2O4K4';
const GID = '46987733'; // ← Убедитесь, что это правильный GID листа с данными!
const OUTPUT_DIR = './AIP-77.github.io/archive/'; // Папка для архивов
const MAIN_OUTPUT_PATH = './fullData.json'; // Основной файл

// Убедимся, что папка существует
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchSheetAsTSV(spreadsheetId, gid) {
  return new Promise((resolve, reject) => {
    // ✅ Убраны лишние пробелы в URL!
    const originalUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv&gid=${gid}&t=${Date.now()}`;

    function followRedirects(url, redirectCount = 0) {
      if (redirectCount > 5) return reject(new Error('Слишком много редиректов'));
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (GitHub Actions)' }
      };

      const req = lib.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          followRedirects(new URL(res.headers.location, url).href, redirectCount + 1);
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

function parseTSV(tsv) {
  const lines = tsv.trim().split(/\r?\n/);
  return lines.map(line => line.split('\t').map(cell => cell.trim()));
}

function buildFullDataJson(parsed) {
  if (parsed.length < 2) return { records: [], lastUpdated: new Date().toISOString() };

  const headers = parsed[0];
  const timestampIdx = headers.indexOf('Отметка времени');
  let firstTimestamp = null;

  const records = [];
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    if (timestampIdx !== -1 && firstTimestamp === null && row[timestampIdx]) {
      firstTimestamp = row[timestampIdx];
    }

    const record = {};
    headers.forEach((header, idx) => {
      if (header !== 'Источник' && header !== 'Отметка времени') {
        record[header] = row[idx] || '';
      }
    });
    records.push(record);
  }

  return {
    lastUpdated: firstTimestamp || new Date().toISOString(),
    records
  };
}

// ✅ Новая функция: разбивка по месяцам
function splitRecordsByMonth(records) {
  const monthly = {};

  records.forEach(record => {
    const dateStr = record['Рабочий день']; // Формат: "01.10.2025"
    if (!dateStr || dateStr.length < 10) return;

    // Преобразуем "01.10.2025" → "2025-10"
    const [day, month, year] = dateStr.split('.');
    if (!year || year.length !== 4) return;

    const yearMonth = `${year}-${month}`;
    if (!monthly[yearMonth]) {
      monthly[yearMonth] = [];
    }
    monthly[yearMonth].push(record);
  });

  return monthly;
}

async function main() {
  try {
    console.log('Загрузка полных данных...');
    // ✅ Исправлено: используем GID, а не GID_FULL
    const tsv = await fetchSheetAsTSV(SPREADSHEET_ID, GID);
    const parsed = parseTSV(tsv);
    const fullJson = buildFullDataJson(parsed);

    // Сохраняем основной файл
    fs.writeFileSync(MAIN_OUTPUT_PATH, JSON.stringify(fullJson, null, 2), 'utf8');
    console.log(`✅ ${MAIN_OUTPUT_PATH} обновлён. Всего записей: ${fullJson.records.length}`);

    // Разбиваем по месяцам и сохраняем архивы
    const monthlyRecords = splitRecordsByMonth(fullJson.records);
    let archiveCount = 0;

    for (const [yearMonth, records] of Object.entries(monthlyRecords)) {
      const archivePath = `${OUTPUT_DIR}${yearMonth}.json`;
      const archiveJson = {
        lastUpdated: fullJson.lastUpdated,
        records
      };
      fs.writeFileSync(archivePath, JSON.stringify(archiveJson, null, 2), 'utf8');
      console.log(`✅ Архив сохранён: ${archivePath} (${records.length} записей)`);
      archiveCount++;
    }

    console.log(`✅ Всего архивов создано: ${archiveCount}`);
  } catch (err) {
    console.error('❌ Ошибка при генерации данных:', err.message);
    process.exit(1);
  }
}

main();
