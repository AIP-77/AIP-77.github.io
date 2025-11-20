import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const SPREADSHEET_ID = '19x2J263xJryZFiucALL5vOISyUUVjAK1fr-sOH2O4K4';
const GID = '46987733';
const OUTPUT_DIR = './archive/';
const MAIN_OUTPUT_PATH = './fullData.json';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchSheetAsTSV(spreadsheetId, gid) {
  return new Promise((resolve, reject) => {
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
        headers: { 
          'User-Agent': 'Mozilla/5.0 (GitHub Actions)',
          'Accept': 'text/tab-separated-values'
        }
      };

      const req = lib.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).href;
          console.log(`Редирект на: ${redirectUrl}`);
          followRedirects(redirectUrl, redirectCount + 1);
        } else if (res.statusCode === 200) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            console.log(`Загружено ${data.length} байт TSV данных`);
            resolve(data);
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });

      req.on('error', reject);
      req.setTimeout(30000, () => req.destroy(new Error('Таймаут')));
      req.end();
    }

    followRedirects(originalUrl);
  });
}

function parseTSV(tsv) {
  const lines = tsv.trim().split(/\r?\n/);
  console.log(`Найдено ${lines.length} строк в TSV`);
  return lines.map((line, index) => {
    const cells = line.split('\t').map(cell => cell.trim());
    if (index === 0) {
      console.log('Заголовки:', cells);
    }
    return cells;
  });
}

function buildFullDataJson(parsed) {
  if (parsed.length < 2) {
    console.warn('Недостаточно данных в таблице');
    return { records: [], lastUpdated: new Date().toISOString() };
  }

  const headers = parsed[0];
  const timestampIdx = headers.indexOf('Отметка времени');
  let firstTimestamp = null;

  const records = [];
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    
    // Находим первую временную метку для lastUpdated
    if (timestampIdx !== -1 && firstTimestamp === null && row[timestampIdx]) {
      firstTimestamp = row[timestampIdx];
    }

    const record = {};
    headers.forEach((header, idx) => {
      if (header !== 'Источник' && header !== 'Отметка времени') {
        record[header] = row[idx] || '';
      }
    });
    
    // Проверяем, что запись не пустая
    const hasData = Object.values(record).some(value => value && value.trim() !== '');
    if (hasData) {
      records.push(record);
    }
  }

  console.log(`Обработано ${records.length} записей`);
  return {
    lastUpdated: firstTimestamp || new Date().toISOString(),
    records
  };
}

function splitRecordsByMonth(records) {
  const monthly = {};
  let skippedCount = 0;

  records.forEach((record, index) => {
    const dateStr = record['Рабочий день'];
    if (!dateStr) {
      skippedCount++;
      return;
    }

    // Более надежный парсинг даты
    const dateMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!dateMatch) {
      if (dateStr.trim() !== '') {
        console.warn(`Строка ${index + 1}: некорректный формат даты: "${dateStr}"`);
      }
      skippedCount++;
      return;
    }

    const [_, day, month, year] = dateMatch;
    const paddedMonth = month.padStart(2, '0');
    const yearMonth = `${year}-${paddedMonth}`;
    
    if (!monthly[yearMonth]) {
      monthly[yearMonth] = [];
    }
    monthly[yearMonth].push(record);
  });

  if (skippedCount > 0) {
    console.log(`Пропущено ${skippedCount} записей с некорректными датами`);
  }

  return monthly;
}

async function main() {
  try {
    console.log('🔄 Загрузка данных из Google Sheets...');
    const tsv = await fetchSheetAsTSV(SPREADSHEET_ID, GID);
    const parsed = parseTSV(tsv);
    const fullJson = buildFullDataJson(parsed);

    // Сохраняем основной файл
    fs.writeFileSync(MAIN_OUTPUT_PATH, JSON.stringify(fullJson, null, 2), 'utf8');
    console.log(`✅ ${MAIN_OUTPUT_PATH} обновлён. Записей: ${fullJson.records.length}`);

    // Разбиваем по месяцам
    const monthlyRecords = splitRecordsByMonth(fullJson.records);
    let archiveCount = 0;

    for (const [yearMonth, records] of Object.entries(monthlyRecords)) {
      const archivePath = `${OUTPUT_DIR}${yearMonth} fullData.json`;
      const archiveJson = {
        lastUpdated: fullJson.lastUpdated,
        records
      };
      fs.writeFileSync(archivePath, JSON.stringify(archiveJson, null, 2), 'utf8');
      console.log(`✅ Архив: ${archivePath} (${records.length} записей)`);
      archiveCount++;
    }

    console.log(`🎉 Всего архивов создано: ${archiveCount}`);
    
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
