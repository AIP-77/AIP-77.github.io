// scripts/generate-fullData.mjs
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const SPREADSHEET_ID = '19x2J263xJryZFiucALL5vOISyUUVjAK1fr-sOH2O4K4';
const GID_FULL = '1589998035'; // ← ЗАМЕНИТЕ на GID листа "Полные данные"
const OUTPUT_PATH = './fullData.json';

// (Функции fetchSheetAsTSV и parseTSV — те же, что выше. Можно вынести в отдельный модуль, но для простоты дублируем)
function fetchSheetAsTSV(spreadsheetId, gid) {
  return new Promise((resolve, reject) => {
    const originalUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv&gid=${gid}&t=${Date.now()}`;
    // ... (код тот же, что в generate-staff.mjs)
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
      // Пропускаем "Источник" и "Отметка времени" в записи, но сохраняем их один раз глобально
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

async function main() {
  try {
    console.log('Загрузка полных данных...');
    const tsv = await fetchSheetAsTSV(SPREADSHEET_ID, GID_FULL);
    const parsed = parseTSV(tsv);
    const json = buildFullDataJson(parsed);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(json, null, 2), 'utf8');
    console.log(`✅ ${OUTPUT_PATH} обновлён. Всего записей: ${json.records.length}`);
  } catch (err) {
    console.error('❌ Ошибка при генерации fullData.json:', err.message);
    process.exit(1);
  }
}

main();
