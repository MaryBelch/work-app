import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { isAdmin, getAdminName } from '../database';
import { JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'work-app-secret-change-in-production';

/**
 * Валидация initData от Telegram Mini App.
 * Проверяет HMAC-SHA256 подпись данных.
 */
function validateInitData(initData: string): { user?: { id: number; first_name: string; last_name?: string; username?: string } } | null {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    console.error('BOT_TOKEN не задан');
    return null;
  }

  try {
    // Парсим initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    // Сортируем параметры по ключу
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаём секретный ключ из токена бота
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисляем HMAC
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');

    if (computedHash !== hash) {
      console.error('❌ Неверная подпись initData');
      return null;
    }

    // Парсим user из initData
    const userStr = params.get('user');
    if (!userStr) return {};

    return { user: JSON.parse(userStr) };
  } catch (err) {
    console.error('❌ Ошибка валидации initData:', err);
    return null;
  }
}

/**
 * Промежуточный слой: проверяет JWT токен
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

/**
 * Login: валидирует initData и возвращает JWT
 */
export function loginHandler(req: Request, res: Response): void {
  const { initData } = req.body;
  if (!initData) {
    res.status(400).json({ error: 'initData обязателен' });
    return;
  }

  const result = validateInitData(initData);
  if (!result || !result.user) {
    res.status(401).json({ error: 'Недействительные данные авторизации' });
    return;
  }

  const telegramId = String(result.user.id);
  const name = result.user.first_name + (result.user.last_name ? ` ${result.user.last_name}` : '');

  // Проверяем, есть ли пользователь в админах
  if (!isAdmin(telegramId)) {
    res.status(403).json({ error: 'Доступ запрещён' });
    return;
  }

  // Создаём JWT
  const token = jwt.sign(
    { telegram_id: telegramId, name } as JwtPayload,
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      telegram_id: telegramId,
      name,
    },
  });
}

/**
 * Получение информации о текущем пользователе
 */
export function meHandler(req: Request, res: Response): void {
  const user = (req as any).user as JwtPayload;
  const name = getAdminName(user.telegram_id);
  res.json({
    telegram_id: user.telegram_id,
    name: name || user.name,
  });
}
