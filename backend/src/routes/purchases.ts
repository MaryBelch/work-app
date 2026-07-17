import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute, saveDb } from '../database';

const router = Router();

// GET /api/purchases?type=poligraphy|epoxy
router.get('/', (req: Request, res: Response) => {
  const { type } = req.query;

  let sql = 'SELECT * FROM purchases';
  const params: any[] = [];

  if (type === 'poligraphy' || type === 'epoxy') {
    sql += ' WHERE type = ?';
    params.push(type);
  }

  sql += ' ORDER BY created_at DESC';

  const purchases = queryAll<any>(sql, params);
  res.json(purchases);
});

// GET /api/purchases/summary?type=poligraphy|epoxy
router.get('/summary', (_req: Request, res: Response) => {
  // Сводка по каждому материалу: общее количество, остаток
  const rows = queryAll<any>(`
    SELECT
      p.name,
      p.type,
      COUNT(*) as purchase_count,
      SUM(p.pieces_total) as total_pieces,
      SUM(p.price_total) as total_spent
    FROM purchases p
    GROUP BY p.type, p.name
    ORDER BY p.type, p.name
  `);

  // Сколько уже потрачено (по order_materials)
  const used = queryAll<any>(`
    SELECT
      om.material_name,
      SUM(om.pieces_used) as used_pieces,
      SUM(om.cost_price) as used_cost
    FROM order_materials om
    GROUP BY om.material_name
  `);

  const usedMap = new Map(used.map(u => [u.material_name, u]));

  const result = rows.map(r => ({
    ...r,
    used_pieces: usedMap.get(r.name)?.used_pieces || 0,
    used_cost: usedMap.get(r.name)?.used_cost || 0,
    remaining_pieces: r.total_pieces - (usedMap.get(r.name)?.used_pieces || 0),
  }));

  res.json(result);
});

// POST /api/purchases
router.post('/', (req: Request, res: Response) => {
  const { type, name, quantity_packages, pieces_per_package, price_per_package } = req.body;

  if (!type || !name || quantity_packages === undefined) {
    res.status(400).json({ error: 'Тип, название и количество обязательны' });
    return;
  }

  if (!['poligraphy', 'epoxy'].includes(type)) {
    res.status(400).json({ error: 'Неверный тип. Используйте: poligraphy, epoxy' });
    return;
  }

  const result = execute(
    `INSERT INTO purchases (type, name, quantity_packages, pieces_per_package, price_per_package)
     VALUES (?, ?, ?, ?, ?)`,
    [
      type,
      name,
      Number(quantity_packages) || 0,
      Number(pieces_per_package) || 1,
      Number(price_per_package) || 0,
    ]
  );
  saveDb();

  const purchase = queryOne('SELECT * FROM purchases WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(purchase);
});

// PUT /api/purchases/:id
router.put('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Закупка не найдена' });
    return;
  }

  const { name, quantity_packages, pieces_per_package, price_per_package } = req.body;

  execute(
    `UPDATE purchases SET
      name = ?, quantity_packages = ?, pieces_per_package = ?, price_per_package = ?
     WHERE id = ?`,
    [
      name ?? (existing as any).name,
      quantity_packages !== undefined ? Number(quantity_packages) : (existing as any).quantity_packages,
      pieces_per_package !== undefined ? Number(pieces_per_package) : (existing as any).pieces_per_package,
      price_per_package !== undefined ? Number(price_per_package) : (existing as any).price_per_package,
      req.params.id,
    ]
  );
  saveDb();

  const purchase = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
  res.json(purchase);
});

// DELETE /api/purchases/:id
router.delete('/:id', (req: Request, res: Response) => {
  const existing = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Закупка не найдена' });
    return;
  }

  execute('DELETE FROM purchases WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ success: true });
});

export default router;
