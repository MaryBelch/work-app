import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute, saveDb } from '../database';

const router = Router();

// GET /api/equipment — список обладнання
router.get('/', (_req: Request, res: Response) => {
  const items = queryAll<any>('SELECT * FROM equipment ORDER BY created_at DESC');
  res.json(items);
});

// GET /api/equipment/recoupment — зведення по окупності
router.get('/recoupment', (_req: Request, res: Response) => {
  // Загальна сума витрат на обладнання
  const equipTotal = queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(purchase_price * quantity), 0) as total FROM equipment'
  );

  // Загальний прибуток з усіх замовлень (received_amount - cost_price)
  const profitTotal = queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(received_amount - cost_price), 0) as total
     FROM orders
     WHERE received_amount > 0`
  );

  const totalEquipment = equipTotal?.total || 0;
  const totalProfit = profitTotal?.total || 0;
  const remaining = Math.max(0, totalEquipment - totalProfit);
  const recoupedPercent = totalEquipment > 0
    ? Math.min(100, Math.round((totalProfit / totalEquipment) * 100))
    : 0;

  res.json({
    total_equipment_cost: totalEquipment,
    total_profit: totalProfit,
    remaining_to_recoup: remaining,
    recouped_percent: recoupedPercent,
    is_recouped: remaining <= 0,
  });
});

// POST /api/equipment — додати обладнання
router.post('/', (req: Request, res: Response) => {
  const { name, purchase_price, quantity, notes } = req.body;

  if (!name || purchase_price === undefined) {
    res.status(400).json({ error: 'Название и цена обязательны' });
    return;
  }

  const result = execute(
    `INSERT INTO equipment (name, purchase_price, quantity, notes)
     VALUES (?, ?, ?, ?)`,
    [
      name,
      Number(purchase_price) || 0,
      Number(quantity) || 1,
      notes || '',
    ]
  );
  saveDb();

  const item = queryOne('SELECT * FROM equipment WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(item);
});

// PUT /api/equipment/:id
router.put('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Оборудование не найдено' });
    return;
  }

  const { name, purchase_price, quantity, notes } = req.body;

  execute(
    `UPDATE equipment SET
      name = ?, purchase_price = ?, quantity = ?, notes = ?
     WHERE id = ?`,
    [
      name ?? (existing as any).name,
      purchase_price !== undefined ? Number(purchase_price) : (existing as any).purchase_price,
      quantity !== undefined ? Number(quantity) : (existing as any).quantity,
      notes !== undefined ? notes : (existing as any).notes,
      req.params.id,
    ]
  );
  saveDb();

  const item = queryOne('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
  res.json(item);
});

// DELETE /api/equipment/:id
router.delete('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Оборудование не найдено' });
    return;
  }

  execute('DELETE FROM equipment WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ success: true });
});

export default router;