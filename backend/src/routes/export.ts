import { Request, Response } from 'express';
import { queryAll } from '../database';

/**
 * Экспорт всех данных в JSON (для бекапа)
 */
export function exportHandler(_req: Request, res: Response) {
  const data: Record<string, any[]> = {};

  // Все таблицы, которые экспортируем
  const tables = [
    'services',
    'orders',
    'order_materials',
    'purchases',
    'equipment',
    'materials_poligraphy',
    'materials_epoxy',
  ];

  for (const table of tables) {
    try {
      data[table] = queryAll<any>(`SELECT * FROM ${table} ORDER BY id`);
    } catch {
      data[table] = [];
    }
  }

  // Мета-информация
  const meta = {
    exported_at: new Date().toISOString(),
    version: '1.0',
    table_counts: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v.length])
    ),
  };

  res.json({ meta, data });
}

/**
 * Экспорт в CSV (для Excel)
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Если есть запятые, кавычки или переносы — оборачиваем в кавычки
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function tableToCsv(tableName: string, rows: any[]): string {
  if (rows.length === 0) return `=== ${tableName} ===\n(пусто)\n\n`;

  const columns = Object.keys(rows[0]);
  const header = columns.map(escapeCsv).join(',');
  const lines = rows.map(row =>
    columns.map(col => escapeCsv(row[col])).join(',')
  );

  return `=== ${tableName} ===\n${header}\n${lines.join('\n')}\n\n`;
}

export function csvExportHandler(_req: Request, res: Response) {
  const tables = [
    'services',
    'orders',
    'order_materials',
    'purchases',
    'equipment',
    'materials_poligraphy',
    'materials_epoxy',
  ];

  // UTF-8 BOM для корректного отображения кириллицы в Excel
  let csv = '﻿';
  csv += '=== WORK APP — ЭКСПОРТ ДАННЫХ ===\n';
  csv += `Дата экспорта: ${new Date().toLocaleString('ru-RU')}\n\n`;

  for (const table of tables) {
    try {
      const rows = queryAll<any>(`SELECT * FROM ${table} ORDER BY id`);
      csv += tableToCsv(table, rows);
    } catch {
      csv += `=== ${table} ===\n(таблица не найдена)\n\n`;
    }
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="work-app-backup-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}