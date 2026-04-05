# Личный кабинет сотрудника

Система управления данными о сотрудниках, календарём явок и задачами.

## Описание

Проект представляет собой веб-приложение для отслеживания рабочего времени сотрудников, планирования смен и управления задачами.

## Структура проекта

```
├── index.html          # Главная страница приложения
├── manager.html        # Страница менеджера
├── sw.js               # Service Worker для PWA
├── manifest.json       # Манифест PWA
│
├── scripts/            # Скрипты генерации JSON
│   ├── generate-Archive.mjs
│   ├── generate-calendar-cache.mjs
│   ├── generate-current.mjs
│   ├── generate-fullData.mjs
│   └── generate-staff.mjs
│
├── archive/            # Архив данных по месяцам
│   ├── 2025-09 fullData.json
│   ├── 2025-10 fullData.json
│   ├── ... (другие месяцы)
│   └── staff.json
│
├── project-App/        # Основное приложение
│   ├── index.html
│   ├── shifts.html     # График смен
│   ├── summary.html    # Сводка
│   ├── settings.html   # Настройки
│   ├── appTeam.js      # Основная логика
│   ├── chartsTeam.js   # Графики и статистика
│   ├── config.json     # Конфигурация
│   └── data/           # Данные приложения
│
├── Excel/              # Excel файлы
├── HTML/               # Дополнительные HTML страницы
└── store/              # Магазин
```

## Файлы данных

| Файл | Описание |
|------|----------|
| `calendar-cache.json` | Календарь явок сотрудников |
| `current.json` | Данные за текущий месяц |
| `fullData.json` | Полная база данных системы |
| `staff.json` | Информация о сотрудниках |

## Скрипты генерации

В папке `scripts/` находятся модули для генерации данных:

- **generate-Archive.mjs** — создание архивных копий данных
- **generate-calendar-cache.mjs** — генерация календаря явок
- **generate-current.mjs** — обновление данных текущего месяца
- **generate-fullData.mjs** — формирование полной базы данных
- **generate-staff.mjs** — генерация данных о сотрудниках

## Установка и запуск

1. Клонируйте репозиторий
2. Откройте `index.html` в браузере
3. Для работы с данными запустите скрипты из папки `scripts/`

```bash
node scripts/generate-current.mjs
```

## Технологии

- HTML5 / CSS3 / JavaScript
- PWA (Progressive Web App)
- Service Worker для офлайн-работы
- Node.js для генерации данных

## Лицензия

Частный проект
