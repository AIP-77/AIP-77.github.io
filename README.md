<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Панель сотрудника</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1, h2 {
      margin: 0 0 8px 0;
      color: #1a8cd8;
    }
    .btn {
      background: #1a8cd8;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-size: 16px;
      width: 100%;
      margin-top: 10px;
      cursor: pointer;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>📊 Панель сотрудника</h1>
  <div id="loading">Загрузка данных...</div>
  <div id="content" style="display: none;">
    <div class="card">
      <h2>📌 Ваш отчёт за <span id="report-date"></span></h2>
      <p><b>Отработано:</b> <span id="worked"></span></p>
      <p><b>Итого по табелю:</b> <span id="planned"></span></p>
      <p><b>Производительность:</b> <span id="efficiency"></span></p>
      <p><b>Заработано за день:</b> <span id="pay-day"></span></p>
      <p><b>Заработано за месяц:</b> <span id="pay-month"></span></p>
    </div>

    <div class="card">
      <h2>📋 Детализация задач</h2>
      <pre id="details"></pre>
    </div>

    <div class="card">
      <h2>📈 Производительность (рабочие дни)</h2>
      <pre id="chart"></pre>
    </div>

    <button class="btn" onclick="downloadPDF()">Скачать PDF</button>
  </div>

  <script>
    // Инициализация Telegram WebApp
    Telegram.WebApp.ready();
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (!user) {
      document.getElementById('loading').textContent = 'Ошибка авторизации';
      document.getElementById('content').style.display = 'none';
      throw new Error('No user data');
    }

    // Загружаем данные
    fetch('https://script.google.com/macros/s/ВАШ_СКРИПТ/exec?employee=' + encodeURIComponent(user.first_name + ' ' + user.last_name))
      .then(res => res.json())
      .then(data => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';

        document.getElementById('report-date').textContent = data.date;
        document.getElementById('worked').textContent = data.worked;
        document.getElementById('planned').textContent = data.planned;
        document.getElementById('efficiency').textContent = data.efficiency;
        document.getElementById('pay-day').textContent = data.payDay;
        document.getElementById('pay-month').textContent = data.payMonth;
        document.getElementById('details').textContent = data.details.join('\n');
        document.getElementById('chart').textContent = data.chart;

      })
      .catch(err => {
        document.getElementById('loading').textContent = 'Ошибка загрузки: ' + err.message;
      });

    function downloadPDF() {
      alert("Функция PDF будет добавлена");
    }
  </script>
</body>
</html>
