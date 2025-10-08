// scripts/generate-staff.mjs
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const SPREADSHEET_ID = '19x2J263xJryZFiucALL5vOISyUUVjAK1fr-sOH2O4K4';
const GID_STAFF = '1762619214'; // ← ЗАМЕНИТЕ на GID листа "Персонал"
const OUTPUT_PATH = './staff.json';

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

function buildStaffJson(parsed) {
  if (parsed.length < 2) return [];

  const headers = parsed[0];
  const nameIdx = headers.indexOf('Сотрудник');
  const departmentIdx = headers.indexOf('Отдел');
  const divisionIdx = headers.indexOf('Департамент');
  const roleIdx = headers.indexOf('Роль');
  const managesIdx = headers.indexOf('Руководит отделом');
  const timestampIdx = headers.indexOf('Отметка времени');

  const staff = [];
  let firstTimestamp = null;

  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    const name = row[nameIdx] || '';
    if (!name) continue;

    const manages = row[managesIdx] ? row[managesIdx].split(',').map(s => s.trim()).filter(Boolean) : [];

    // Сохраняем первую отметку времени
    if (firstTimestamp === null && timestampIdx !== -1 && row[timestampIdx]) {
      firstTimestamp = row[timestampIdx];
    }

    staff.push({
      name,
      department: row[departmentIdx] || '',
      division: row[divisionIdx] || '',
      role: row[roleIdx] || '',
      managedDepartments: manages
    });
  }

  return {
    lastUpdated: firstTimestamp || new Date().toISOString(),
    staff
  };
}

async function main() {
  try {
    console.log('Загрузка данных по персоналу...');
    const tsv = await fetchSheetAsTSV(SPREADSHEET_ID, GID_STAFF);
    const parsed = parseTSV(tsv);
    const json = buildStaffJson(parsed);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(json, null, 2), 'utf8');
    console.log(`✅ ${OUTPUT_PATH} обновлён. Всего сотрудников: ${json.staff.length}`);
  } catch (err) {
    console.error('❌ Ошибка при генерации staff.json:', err.message);
    process.exit(1);
  }
}

main();
