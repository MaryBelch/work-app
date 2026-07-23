import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './database';
import { initializeBot, startBot, getBot } from './bot';
import { loginHandler, meHandler, authMiddleware } from './middleware/auth';
import servicesRouter from './routes/services';
import ordersRouter from './routes/orders';
import materialsRouter from './routes/materials';
import purchasesRouter from './routes/purchases';
import equipmentRouter from './routes/equipment';

async function main() {
  // Инициализация БД
  await initDatabase();

  // Инициализация бота (только если BOT_TOKEN задан)
  initializeBot();

  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Статические файлы фронтенда (из public/)
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // ===== Health Check =====
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // ===== API Роуты =====

  // Авторизация (без JWT)
  app.post('/api/auth/login', loginHandler);

  // Защищённые роуты
  app.get('/api/auth/me', authMiddleware, meHandler);
  app.use('/api/services', authMiddleware, servicesRouter);
  app.use('/api/orders', authMiddleware, ordersRouter);
  app.use('/api/materials', authMiddleware, materialsRouter);
  app.use('/api/purchases', authMiddleware, purchasesRouter);
app.use('/api/equipment', authMiddleware, equipmentRouter);

  // ===== Bot Webhook Handler =====
  const bot = getBot();
  if (bot) {
    app.use(bot.webhookCallback('/bot-webhook'));
  }

  // ===== SPA fallback =====
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
      if (err) {
        res.status(200).send(`
          <html>
            <head><meta charset="utf-8"><title>Work App</title></head>
            <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1a2e;color:#fff">
              <div style="text-align:center">
                <h1>⚙️ Work App</h1>
                <p>Сервер запущен. Ожидается сборка фронтенда...</p>
                <p style="color:#888;font-size:14px">Запустите <code>npm run build</code> в папке frontend/</p>
              </div>
            </body>
          </html>
        `);
      }
    });
  });

  // Запуск сервера
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  });

  // Запуск бота (неблокирующий, не ломает сервер при ошибке)
  startBot().catch((err: Error) => {
    console.error('❌ Ошибка бота (продолжаем работу):', err.message);
  });
}

// Глобальные обработчики для graceful shutdown
let shuttingDown = false;

process.once('SIGINT', () => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n👋 Остановка...');
  getBot()?.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  if (shuttingDown) return;
  shuttingDown = true;
  getBot()?.stop('SIGTERM');
  process.exit(0);
});

main().catch(err => {
  console.error('❌ Фатальная ошибка:', err);
  process.exit(1);
});
