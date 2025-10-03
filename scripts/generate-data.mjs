// scripts/generate-data.mjs
import fs from 'fs';
import https from 'https';

const SPREADSHEET_ID = '19x2J263xJryZFiucALL5vOISyUUVjAK1fr-sOH2O4K4';
const OUTPUT_PATH = './data.json';

function fetchSheetAsCSV() {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function safeJsonParse(str) {
  try {
    // Google экранирует кавычки как ""
    str = str.replace(/""/g, '"');
    return JSON.parse(str);
  } catch (e) {
    console.warn('⚠️ Не удалось распарсить JSON:', str.substring(0, 50));
    return null;
  }
}

function csvToJson(csv) {
  const lines = csv.trim().split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return {};

  const headers = lines[0].split('\t').map(h => h.trim()); // ⚠️ Используем \t!
  const telegramIdIndex = headers.indexOf('telegramId');

  if (telegramIdIndex === -1) {
    throw new Error('Столбец "telegramId" не найден');
  }

  const result = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Разделяем по табуляции, но учитываем кавычки (простой способ)
    const values = line.split('\t').map(v => v.trim());

    const telegramId = values[telegramIdIndex];
    if (!telegramId) continue;

    // Парсим mainData
    const mainDataStr = values[headers.indexOf('mainData')] || '{}';
    const mainData = safeJsonParse(mainDataStr);

    if (!mainData) continue;

    // Берём общие поля (role, department) из первой записи
    if (!result[telegramId]) {
      result[telegramId] = {
        role: values[headers.indexOf('role')] || '',
        department: values[headers.indexOf('department')] || '',
        records: []
      };
    }

    // Добавляем запись по дате
    result[telegramId].records.push({
      date: mainData.date || values[headers.indexOf('workDate')] || '',
      worked: mainData.worked || '',
      planned: mainData.planned || '',
      efficiency: mainData.efficiency || '',
      payDay: mainData.payDay || '',
      payMonth: mainData.payMonth || '',
      xisBonusDay: mainData.xisBonusDay || ''
      // Можно добавить и другие поля из details, efficiencyData и т.д.
    });
  }

  return result;
}

async function main() {
  try {
    console.log('Загрузка данных из Google Таблицы...');
    const csv = await fetchSheetAsCSV();

    // 🔍 Отладка: покажем первые 200 символов
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
