import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../database';
import type { Service } from '../types';

const router = Router();

// GET /api/services
router.get('/', (_req: Request, res: Response) => {
  const services = queryAll<Service>('SELECT * FROM services ORDER BY name ASC');
  res.json(services);
});

// GET /api/services/:id
router.get('/:id', (req: Request, res: Response) => {
  const service = queryOne<Service>('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!service) {
    res.status(404).json({ error: 'Услуга не найдена' });
    return;
  }
  res.json(service);
});

// POST /api/services
router.post('/', (req: Request, res: Response) => {
  const { name, format, base_price, design_price } = req.body;
  if (!name || base_price === undefined) {
    res.status(400).json({ error: 'Название и базовая цена обязательны' });
    return;
  }

  const result = execute(
    'INSERT INTO services (name, format, base_price, design_price) VALUES (?, ?, ?, ?)',
    [name, format || '', Number(base_price), Number(design_price) || 0]
  );

  const service = queryOne<Service>('SELECT * FROM services WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(service);
});

// PUT /api/services/:id
router.put('/:id', (req: Request, res: Response) => {
  const { name, format, base_price, design_price } = req.body;
  const existing = queryOne<Service>('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Услуга не найдена' });
    return;
  }

  execute(
    `UPDATE services SET name = ?, format = ?, base_price = ?, design_price = ?,
     updated_at = datetime('now') WHERE id = ?`,
    [
      name ?? existing.name,
      format !== undefined ? format : existing.format,
      base_price !== undefined ? Number(base_price) : existing.base_price,
      design_price !== undefined ? Number(design_price) : existing.design_price,
      req.params.id,
    ]
  );

  const service = queryOne<Service>('SELECT * FROM services WHERE id = ?', [req.params.id]);
  res.json(service);
});

// DELETE /api/services/:id
router.delete('/:id', (req: Request, res: Response) => {
  const existing = queryOne<Service>('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Услуга не найдена' });
    return;
  }

  execute('DELETE FROM services WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
