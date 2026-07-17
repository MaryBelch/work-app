import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute, saveDb } from '../database';
import type { Material } from '../types';

const router = Router();

type MaterialTable = 'materials_poligraphy' | 'materials_epoxy';

function getTable(type: string): MaterialTable | null {
  if (type === 'poligraphy') return 'materials_poligraphy';
  if (type === 'epoxy') return 'materials_epoxy';
  return null;
}

// GET /api/materials/:type
router.get('/:type', (req: Request, res: Response) => {
  const table = getTable(req.params.type);
  if (!table) {
    res.status(400).json({ error: 'Неверный тип. Используйте: poligraphy, epoxy' });
    return;
  }

  const materials = queryAll<Material>(`SELECT * FROM ${table} ORDER BY name ASC`);
  res.json(materials);
});

// POST /api/materials/:type
router.post('/:type', (req: Request, res: Response) => {
  const table = getTable(req.params.type);
  if (!table) {
    res.status(400).json({ error: 'Неверный тип. Используйте: poligraphy, epoxy' });
    return;
  }

  const { name, price } = req.body;
  if (!name || price === undefined) {
    res.status(400).json({ error: 'Название и цена обязательны' });
    return;
  }

  const result = execute(
    `INSERT INTO ${table} (name, price) VALUES (?, ?)`,
    [name, Number(price)]
  );
  saveDb();

  const material = queryOne<Material>(`SELECT * FROM ${table} WHERE id = ?`, [result.lastInsertRowid]);
  res.status(201).json(material);
});

// PUT /api/materials/:type/:id
router.put('/:type/:id', (req: Request, res: Response) => {
  const table = getTable(req.params.type);
  if (!table) {
    res.status(400).json({ error: 'Неверный тип. Используйте: poligraphy, epoxy' });
    return;
  }

  const { name, price } = req.body;
  const existing = queryOne<Material>(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Материал не найден' });
    return;
  }

  execute(
    `UPDATE ${table} SET name = ?, price = ? WHERE id = ?`,
    [
      name ?? existing.name,
      price !== undefined ? Number(price) : existing.price,
      req.params.id,
    ]
  );
  saveDb();

  const material = queryOne<Material>(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
  res.json(material);
});

// DELETE /api/materials/:type/:id
router.delete('/:type/:id', (req: Request, res: Response) => {
  const table = getTable(req.params.type);
  if (!table) {
    res.status(400).json({ error: 'Неверный тип. Используйте: poligraphy, epoxy' });
    return;
  }

  const existing = queryOne<Material>(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Материал не найден' });
    return;
  }

  execute(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
  saveDb();
  res.json({ success: true });
});

export default router;
