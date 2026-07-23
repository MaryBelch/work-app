import { useState, useEffect } from 'react';
import { getPurchases, createPurchase, updatePurchase, deletePurchase, getPurchaseSummary } from '../api';
import Autocomplete from './Autocomplete';
import type { Purchase, PurchaseSummary } from '../types';

interface Props {
  type: 'poligraphy' | 'epoxy';
}

export default function Purchases({ type }: Props) {
  const [items, setItems] = useState<Purchase[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [form, setForm] = useState({
    name: '',
    quantity_packages: '1',
    pieces_per_package: '1',
    price_per_package: '0',
  });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [data, sum] = await Promise.all([
        getPurchases(type),
        getPurchaseSummary(),
      ]);
      setItems(data);
      setSummary(sum);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [type]);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', quantity_packages: '1', pieces_per_package: '1', price_per_package: '0' });
    setShowModal(true);
  };

  const openEdit = (item: Purchase) => {
    setEditing(item);
    setForm({
      name: item.name,
      quantity_packages: String(item.quantity_packages),
      pieces_per_package: String(item.pieces_per_package),
      price_per_package: String(item.price_per_package),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      setError('Введите название материала');
      return;
    }
    try {
      const data = {
        type,
        name: form.name,
        quantity_packages: Number(form.quantity_packages) || 0,
        pieces_per_package: Number(form.pieces_per_package) || 1,
        price_per_package: Number(form.price_per_package) || 0,
      };
      if (editing) {
        await updatePurchase(editing.id, data);
      } else {
        await createPurchase(data);
      }
      setShowModal(false);
      setError('');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись о закупке?')) return;
    try {
      await deletePurchase(id);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totalSpent = items.reduce((sum, i) => sum + i.price_total, 0);
  const totalPieces = items.reduce((sum, i) => sum + i.pieces_total, 0);

  // Сводка по текущему типу
  const typeSummary = summary.filter(s => s.type === type);

  return (
    <div>
      <div className="tab-header">
        <div className="tab-title">
          {type === 'poligraphy' ? '📦 Закупки (полиграфия)' : '🧪 Закупки (эпоксидка)'}
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          + Закупка
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Сводка */}
      <div className="card" style={{ padding: '10px 14px', fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="text-muted">Всего закупок:</span>
          <strong>{items.length}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="text-muted">Всего потрачено:</span>
          <strong>{totalSpent.toFixed(2)} грн</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="text-muted">Всего штук в запасе:</span>
          <strong>{totalPieces.toLocaleString()} шт.</strong>
        </div>
      </div>

      {/* Сводка по каждому материалу */}
      {typeSummary.length > 0 && (
        <div className="card" style={{ padding: '10px 14px', fontSize: 13 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>📊 Остатки</div>
          {typeSummary.map(s => (
            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>{s.name}</span>
              <span>
                <strong>{s.remaining_pieces.toLocaleString()}</strong>
                <span className="text-muted"> / {s.total_pieces.toLocaleString()} шт.</span>
                <span className="text-muted" style={{ marginLeft: 8 }}>
                  ({s.total_spent.toFixed(0)} грн)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="search-wrapper search-box">
        <input
          className="search-input"
          placeholder="Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>Загрузка...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{type === 'poligraphy' ? '📦' : '🧪'}</div>
          <p>Закупок пока нет</p>
          <p className="text-muted">Добавьте первую, нажав «+ Закупка»</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Наименование</th>
                <th className="text-right">Упаковок</th>
                <th className="text-right">Шт/уп</th>
                <th className="text-right">Всего шт</th>
                <th className="text-right">Цена/уп</th>
                <th className="text-right">Сумма</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const itemSummary = typeSummary.find(s => s.name === item.name);
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td className="text-right">{item.quantity_packages}</td>
                    <td className="text-right">{item.pieces_per_package}</td>
                    <td className="text-right">{item.pieces_total.toLocaleString()}</td>
                    <td className="text-right">{item.price_per_package.toFixed(2)}</td>
                    <td className="text-right">{item.price_total.toFixed(2)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)}>
                          ✏️
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {editing ? '✏️ Редактировать закупку' : '➕ Новая закупка'}
            </div>

            {editing && (
              <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, color: 'var(--tg-hint)' }}>
                {editing.name} — всего {editing.pieces_total} шт.
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Наименование *</label>
              <Autocomplete
                value={form.name}
                onChange={v => setForm({ ...form, name: v })}
                suggestions={items.map(i => i.name).filter((v, idx, a) => a.indexOf(v) === idx)}
                placeholder="Например: Бумага А4 350г"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Количество упаковок</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="3"
                  value={form.quantity_packages}
                  onChange={e => setForm({ ...form, quantity_packages: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Штук в упаковке</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="500"
                  value={form.pieces_per_package}
                  onChange={e => setForm({ ...form, pieces_per_package: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Цена за упаковку (грн)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="200.00"
                value={form.price_per_package}
                onChange={e => setForm({ ...form, price_per_package: e.target.value })}
              />
            </div>

            {/* Предпросмотр */}
            {form.quantity_packages && form.pieces_per_package && (
              <div className="card" style={{ padding: '10px 14px', fontSize: 13, marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Всего штук:</span>
                  <strong>
                    {(Number(form.quantity_packages) * Number(form.pieces_per_package)).toLocaleString()}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Сумма:</span>
                  <strong>
                    {(Number(form.quantity_packages) * Number(form.price_per_package)).toFixed(2)} грн
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Цена за штуку:</span>
                  <strong>
                    {Number(form.pieces_per_package) > 0
                      ? (Number(form.price_per_package) / Number(form.pieces_per_package)).toFixed(2)
                      : '0.00'} грн
                  </strong>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editing ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
