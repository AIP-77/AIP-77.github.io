// scripts/generate-data.mjs
import fs from 'fs';
import https from 'https';

const SPREADSHEET_ID = '1aBcDeFgHiJkLmNoPqRsTuVwXyZ'; // ← замените на ваш ID!
const OUTPUT_PATH = './data.json';

function fetchSheetAsCSV() {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_ID}/pub?output=csv`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function csvToJson(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const result = {};

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1')); // убираем кавычки
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      let value = values[j];
      // Попытка превратить число в число (но telegram_id оставим строкой!)
      if (headers[j] !== 'telegram_id' && !isNaN(value) && value !== '') {
        value = Number(value);
      }
      row[headers[j]] = value;
    }

    const id = String(row.telegram_id);
    if (id && id !== 'undefined') {
      const { telegram_id, ...rest } = row; // убираем telegram_id из данных
      result[id] = rest;
    }
  }

  return result;
}

async function main() {
  try {
    console.log('Загрузка данных из Google Таблицы...');
    const csv = await fetchSheetAsCSV();
    const json = csvToJson(csv);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(json, null, 2));
    console.log(`✅ data.json обновлён. Всего записей: ${Object.keys(json).length}`);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

main();
