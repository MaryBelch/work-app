import { useState, useEffect } from 'react';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '../api';
import type { Material } from '../types';

export default function MaterialsEpoxy() {
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState({ name: '', price: '' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await getMaterials('epoxy');
      setItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', price: '' });
    setShowModal(true);
  };

  const openEdit = (item: Material) => {
    setEditing(item);
    setForm({ name: item.name, price: String(item.price) });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      setError('Заполните название и цену');
      return;
    }
    try {
      const data = { name: form.name, price: Number(form.price) };
      if (editing) {
        await updateMaterial('epoxy', editing.id, data);
      } else {
        await createMaterial('epoxy', data);
      }
      setShowModal(false);
      setError('');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить материал?')) return;
    try {
      await deleteMaterial('epoxy', id);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const total = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <div>
      <div className="tab-header">
        <div className="tab-title">🧪 Материалы (эпоксидка/гипс)</div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          + Добавить
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
        <span className="text-muted">Всего материалов: {items.length}</span>
        <span>
          <span className="text-muted">На сумму: </span>
          <strong>{total.toFixed(2)} грн</strong>
        </span>
      </div>

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
          <div className="empty-icon">🧪</div>
          <p>Материалы не найдены</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Наименование</th>
                <th className="text-right">Цена (грн)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td className="text-right">{item.price.toFixed(2)}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {editing ? '✏️ Редактировать' : '➕ Новый материал'}
            </div>
            <div className="form-group">
              <label className="form-label">Наименование *</label>
              <input
                className="form-input"
                placeholder="Например: Эпоксидная смола A+B"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Цена (грн) *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
              />
            </div>
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
