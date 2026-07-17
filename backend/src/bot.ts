import { Telegraf, Markup } from 'telegraf';
import { isAdmin } from './database';

let bot: Telegraf | null = null;
let appUrl: string = '';

/**
 * Инициализация Telegram бота
 */
export function initializeBot(): Telegraf | null {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.log('⚠️ BOT_TOKEN не задан — бот не запущен');
    return null;
  }

  appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

  try {
    bot = new Telegraf(token);
  } catch (err) {
    console.error('❌ Ошибка инициализации бота:', err);
    return null;
  }

  // Команда /start
  bot.start(async (ctx) => {
    const telegramId = String(ctx.from.id);
    const isAllowed = isAdmin(telegramId);

    if (!isAllowed) {
      await ctx.reply(
        '❌ *Доступ запрещён*\n\n' +
        'У вас нет прав для использования этого бота.\n' +
        'Обратитесь к администратору для получения доступа.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const name = ctx.from.first_name || 'Пользователь';
    await ctx.reply(
      `👋 *Привет, ${name}!*\n\n` +
      'Это бот для управления заказами полиграфии.\n' +
      'Нажми кнопку ниже, чтобы открыть приложение:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.webApp('🚀 Открыть приложение', appUrl),
        ]),
      }
    );
  });

  // Команда /help
  bot.help(async (ctx) => {
    const telegramId = String(ctx.from.id);
    if (!isAdmin(telegramId)) {
      await ctx.reply('❌ Доступ запрещён');
      return;
    }

    await ctx.reply(
      '*📖 Помощь по боту "Ворк"*\n\n' +
      '*/start* — Открыть приложение\n' +
      '*/help* — Это сообщение\n\n' +
      '*📍 Вкладки приложения:*\n' +
      '1️⃣ *Услуги* — Управление ценами на полиграфию\n' +
      '2️⃣ *Калькулятор* — Расчёт стоимости + себестоимость + прибыль\n' +
      '3️⃣ *Закупки (полигр)* — Учёт закупок расходников\n' +
      '4️⃣ *Закупки (эпоксидка)* — Учёт материалов для заливки\n\n' +
      'При сохранении заказа вы получите уведомление в этот чат.',
      { parse_mode: 'Markdown' }
    );
  });

  // Обработчик текстовых сообщений
  bot.on('text', async (ctx) => {
    const telegramId = String(ctx.from.id);
    if (!isAdmin(telegramId)) {
      await ctx.reply('❌ Доступ запрещён');
      return;
    }

    await ctx.reply(
      'Используйте /start чтобы открыть приложение, или /help для справки.'
    );
  });

  return bot;
}

/**
 * Получить экземпляр бота
 */
export function getBot(): Telegraf | null {
  return bot;
}

/**
 * Запуск бота (polling для разработки, webhook для продакшена)
 */
export async function startBot(): Promise<void> {
  if (!bot) return;

  const isProduction = process.env.NODE_ENV === 'production';

  try {
    if (isProduction && appUrl.startsWith('https')) {
      // Webhook mode for production (Railway/Render)
      const webhookPath = '/bot-webhook';
      try {
        await bot.telegram.setWebhook(`${appUrl}${webhookPath}`);
        console.log(`✅ Webhook установлен: ${appUrl}${webhookPath}`);
      } catch (err) {
        console.error('❌ Ошибка установки webhook:', err);
        // Fallback to polling
        bot.launch().catch(e => console.error('❌ Ошибка запуска бота (polling):', e.message));
        console.log('🤖 Бот запущен в режиме polling (fallback)');
      }
    } else {
      // Polling mode for development
      console.log('🤖 Запуск бота в режиме polling...');
      bot.launch().then(() => {
        console.log('🤖 Бот запущен в режиме polling');
      }).catch(e => {
        console.error('❌ Ошибка запуска бота:', e.message);
        console.log('ℹ️  Сервер продолжает работу без бота');
      });
    }
  } catch (err: any) {
    console.error('❌ Ошибка запуска бота:', err.message);
    console.log('ℹ️  Сервер продолжает работу без бота');
  }
}
