import { useState, useEffect } from 'react';
import { getServices, createService, updateService, deleteService } from '../api';
import type { Service } from '../types';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: '', format: '', base_price: '', design_price: '' });
  const [error, setError] = useState('');

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await getServices();
      setServices(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.format.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', format: '', base_price: '', design_price: '' });
    setShowModal(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      name: service.name,
      format: service.format,
      base_price: String(service.base_price),
      design_price: String(service.design_price),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.base_price) {
      setError('Заполните название и цену');
      return;
    }

    try {
      const data = {
        name: form.name,
        format: form.format,
        base_price: Number(form.base_price),
        design_price: Number(form.design_price) || 0,
      };

      if (editing) {
        await updateService(editing.id, data);
      } else {
        await createService(data);
      }

      setShowModal(false);
      setError('');
      await loadServices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту услугу?')) return;
    try {
      await deleteService(id);
      await loadServices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="tab-header">
        <div className="tab-title">📋 Услуги полиграфии</div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          + Добавить
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-wrapper search-box">
        <input
          className="search-input"
          placeholder="Поиск услуг..."
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
          <div className="empty-icon">📭</div>
          <p>Услуги не найдены</p>
          <p className="text-muted">Добавьте первую услугу</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Формат</th>
                <th className="text-right">Цена/шт</th>
                <th className="text-right">Дизайн</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td className="text-muted">{s.format || '—'}</td>
                  <td className="text-right">{s.base_price.toFixed(2)}</td>
                  <td className="text-right">
                    {s.design_price > 0 ? `${s.design_price.toFixed(2)}` : '—'}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(s)}>
                        ✏️
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>
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

      {/* Модалка создания/редактирования */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {editing ? '✏️ Редактировать услугу' : '➕ Новая услуга'}
            </div>

            <div className="form-group">
              <label className="form-label">Название *</label>
              <input
                className="form-input"
                placeholder="Например: Визитка"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Формат</label>
              <input
                className="form-input"
                placeholder="Например: 90х50, А5, А4"
                value={form.format}
                onChange={e => setForm({ ...form, format: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Базовая цена (грн) *</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.base_price}
                  onChange={e => setForm({ ...form, base_price: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Цена дизайна (грн)</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.design_price}
                  onChange={e => setForm({ ...form, design_price: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editing ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
