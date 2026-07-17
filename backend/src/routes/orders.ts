import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute, saveDb } from '../database';
import type { Order } from '../types';
import { getBot } from '../bot';
import { getAdmins } from '../database';

const router = Router();

// GET /api/orders
router.get('/', (_req: Request, res: Response) => {
  const orders = queryAll<Order>('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(orders);
});

// GET /api/orders/:id — один заказ со списком материалов
router.get('/:id', (req: Request, res: Response) => {
  const order = queryOne<Order>('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }

  const materials = queryAll<any>(
    'SELECT * FROM order_materials WHERE order_id = ? ORDER BY id ASC',
    [req.params.id]
  );

  res.json({ ...order, materials });
});

// POST /api/orders
router.post('/', (req: Request, res: Response) => {
  const {
    client_name, service_id, service_name, quantity,
    needs_design, needs_packaging,
    base_price, design_price, unit_price, total,
    cost_price, received_amount,
    materials,
  } = req.body;

  if (!client_name || !service_id || !quantity || !total) {
    res.status(400).json({ error: 'Заполните обязательные поля' });
    return;
  }

  const user = (req as any).user;

  const result = execute(
    `INSERT INTO orders (
      client_name, service_id, service_name, quantity,
      needs_design, needs_packaging,
      base_price, design_price, unit_price, total,
      cost_price, received_amount,
      created_by_telegram_id, created_by_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      client_name,
      Number(service_id),
      service_name || '',
      Number(quantity),
      needs_design ? 1 : 0,
      needs_packaging ? 1 : 0,
      Number(base_price) || 0,
      Number(design_price) || 0,
      Number(unit_price) || 0,
      Number(total),
      Number(cost_price) || 0,
      Number(received_amount) || 0,
      user?.telegram_id || '',
      user?.name || '',
    ]
  );

  const orderId = result.lastInsertRowid;

  // Сохраняем материалы, потраченные в заказе
  if (materials && Array.isArray(materials) && materials.length > 0) {
    for (const mat of materials) {
      execute(
        `INSERT INTO order_materials (order_id, material_name, pieces_used, cost_price)
         VALUES (?, ?, ?, ?)`,
        [orderId, mat.material_name, Number(mat.pieces_used) || 0, Number(mat.cost_price) || 0]
      );
    }
  }

  saveDb();

  const order = queryOne<Order>('SELECT * FROM orders WHERE id = ?', [orderId]);

  // Отправляем уведомление в бота
  const bot = getBot();
  if (bot && order) {
    const admins = getAdmins();
    const designText = order.needs_design ? '✅ Да' : '❌ Нет';
    const packagingText = order.needs_packaging ? '✅ Да' : '❌ Нет';
    const profit = (order.received_amount || 0) - (order.cost_price || 0);

    let message =
      '🆕 *Новый заказ!*\n\n' +
      `👤 *Клиент:* ${order.client_name}\n` +
      `📋 *Услуга:* ${order.service_name}\n` +
      `📦 *Тираж:* ${order.quantity} шт.\n` +
      `🎨 *Макет:* ${designText}\n` +
      `📦 *Упаковка:* ${packagingText}\n\n` +
      `💰 *Цена за шт.:* ${order.unit_price.toFixed(2)} грн\n` +
      `💵 *Итого:* ${order.total.toFixed(2)} грн\n`;

    if (order.cost_price > 0) {
      message += `📊 *Себестоимость:* ${order.cost_price.toFixed(2)} грн\n`;
      message += `📈 *Прибыль:* ${profit.toFixed(2)} грн\n`;
    }
    if (order.received_amount > 0) {
      message += `💳 *Получено:* ${order.received_amount.toFixed(2)} грн\n`;
    }

    message += `\n👨‍💼 *Создал:* ${order.created_by_name}\n` +
      `🕐 *${order.created_at}*`;

    for (const admin of admins) {
      bot.telegram.sendMessage(admin.telegram_id, message, { parse_mode: 'Markdown' }).catch(err => {
        console.error(`❌ Не удалось отправить уведомление админу ${admin.telegram_id}:`, err.message);
      });
    }
  }

  res.status(201).json(order);
});

// DELETE /api/orders/:id
router.delete('/:id', (req: Request, res: Response) => {
  const existing = queryOne<Order>('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }

  // Материалы удалятся каскадно (ON DELETE CASCADE)
  execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ success: true });
});

export default router;
