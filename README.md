# 📋 Work App — Telegram Mini App для управления заказами

Приложение для учёта заказов полиграфии и материалов. Работает как Telegram Mini App с ограниченным доступом по Telegram ID.

## ✨ Возможности

| Вкладка | Описание |
|---|---|
| 📋 **Услуги** | CRUD-таблица услуг полиграфии (название, формат, цены) |
| 🧮 **Калькулятор** | Расчёт стоимости заказа со скидками за тираж |
| 📦 **Материалы (полигр)** | Учёт расходников для полиграфии |
| 🧪 **Материалы (эпокси)** | Учёт материалов для эпоксидной смолы и гипса |

### 💰 Система скидок

- До 100 шт → полная стоимость
- 100–249 шт → скидка 10%
- 250–499 шт → скидка 15%
- 500+ шт → скидка 30%
- Упаковка: +25 грн (опционально)

### 🔒 Доступ

Только пользователи, чей Telegram ID добавлен в таблицу `admins`.

---

## 🚀 Быстрый старт (локальная разработка)

### 1. Клонирование

```bash
git clone <url-репозитория> work-app
cd work-app
```

### 2. Установка зависимостей

```bash
npm run install:all
```

### 3. Настройка переменных окружения

Создайте файл `backend/.env`:

```env
# Токен бота от @BotFather (обязательно)
BOT_TOKEN=123456789:ABCdefGHIjklmNOPqrstUVwxyz

# Telegram ID администраторов через запятую
ADMIN_TELEGRAM_IDS=123456789,987654321

# URL приложения (для продакшена)
APP_URL=https://your-app.railway.app

# Режим
NODE_ENV=development
```

### 4. Запуск

```bash
# Одновременный запуск бэкенда и фронтенда
npm run dev

# Или по отдельности:
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:5173
```

---

## 📦 Деплой на Railway

1. **Создайте бота** в [@BotFather](https://t.me/BotFather):
   - `/newbot` → название «Ворк» (или любое) → получаете токен
   - `/mybots` → ваш бот → Bot Settings → Menu Button → подключите Mini App URL

2. **Запушьте код на GitHub**

3. **На Railway**:
   - New Project → Deploy from GitHub repo
   - Root Directory: `backend/`
   - Build Command: `cd ../frontend && npm install && npm run build && cd ../backend && npm run build`
   - Start Command: `npm run start`
   - Добавьте переменные (см. выше)

4. **Настройте webhook**:
   ```bash
   curl -F "url=https://your-app.railway.app/bot-webhook" \
        https://api.telegram.org/bot<ТОКЕН_БОТА>/setWebhook
   ```

5. **Настройте Mini App**:
   - В @BotFather: `/setmenubutton` → выберите бота → отправьте URL вашего приложения
   - В @BotFather: `/setdomain` → выберите бота → отправьте домен Railway

---

## 🏗️ Архитектура проекта

```
work-app/
├── package.json                 # Корневой package.json
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/                    # SQLite БД (создаётся автоматически)
│   ├── public/                  # Собранный фронтенд (Vite → сюда)
│   └── src/
│       ├── index.ts             # Точка входа сервера
│       ├── database.ts          # SQLite через sql.js
│       ├── bot.ts               # Telegram бот (telegraf)
│       ├── types.ts             # Типы TypeScript
│       ├── middleware/
│       │   └── auth.ts          # Валидация initData + JWT
│       └── routes/
│           ├── services.ts      # CRUD услуг
│           ├── orders.ts        # CRUD заказов + уведомления
│           └── materials.ts     # CRUD материалов
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx              # 4 вкладки + авторизация
        ├── App.css              # Telegram-themed стили
        ├── api.ts               # API клиент + расчёт цен
        ├── types.ts
        └── components/
            ├── Services.tsx      # Вкладка 1
            ├── Calculator.tsx    # Вкладка 2
            ├── MaterialsPoly.tsx # Вкладка 3
            └── MaterialsEpoxy.tsx# Вкладка 4
```

---

## 🛠️ API Endpoints

| Метод | Путь | Описание | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Вход по initData | ❌ |
| GET | `/api/auth/me` | Инфо о пользователе | ✅ |
| GET | `/api/services` | Список услуг | ✅ |
| POST | `/api/services` | Создать услугу | ✅ |
| PUT | `/api/services/:id` | Обновить услугу | ✅ |
| DELETE | `/api/services/:id` | Удалить услугу | ✅ |
| GET | `/api/orders` | История заказов | ✅ |
| POST | `/api/orders` | Создать заказ | ✅ |
| DELETE | `/api/orders/:id` | Удалить заказ | ✅ |
| GET | `/api/materials/poligraphy` | Материалы полиграфия | ✅ |
| GET | `/api/materials/epoxy` | Материалы эпоксидка | ✅ |
| POST | `/api/materials/:type` | Добавить материал | ✅ |
| PUT | `/api/materials/:type/:id` | Обновить материал | ✅ |
| DELETE | `/api/materials/:type/:id` | Удалить материал | ✅ |

---

## 🔑 Как получить Telegram ID

1. Напишите боту [@userinfobot](https://t.me/userinfobot)
2. Отправьте любое сообщение
3. Бот покажет ваш `Id:` — это ваш Telegram ID

---

## 📝 Лицензия

MIT
