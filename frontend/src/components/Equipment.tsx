import { useState, useEffect } from 'react';
import { getEquipment, getRecoupment, createEquipment, deleteEquipment, exportDataCsv } from '../api';
import type { Equipment as EquipmentItem, RecoupmentSummary } from '../types';

export default function Equipment() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [recoupment, setRecoupment] = useState<RecoupmentSummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [eq, rec] = await Promise.all([
      getEquipment(),
      getRecoupment(),
    ]);
    setItems(eq);
    setRecoupment(rec);
  }

  async function handleAdd() {
    if (!name || !price) return;
    await createEquipment({
      name,
      purchase_price: Number(price),
      quantity: Number(quantity) || 1,
      notes,
    });
    setName('');
    setPrice('');
    setQuantity('1');
    setNotes('');
    setShowForm(false);
    await loadData();
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить это оборудование?')) return;
    await deleteEquipment(id);
    await loadData();
  }

  return (
    <div className="tab-content">
      {/* Карточка окупаемости */}
      {recoupment && (
        <div className="card" style={{ background: recoupment.is_recouped ? 'rgba(52,199,89,0.1)' : undefined }}>
          <div className="card-header">
            <span className="card-title">💰 Окупаемость</span>
            {recoupment.is_recouped
              ? <span className="badge badge-success">Окупилось!</span>
              : <span style={{ fontSize: 13, color: 'var(--tg-hint)' }}>{recoupment.recouped_percent}%</span>
            }
          </div>

          {/* Progress bar */}
          <div style={{
            height: 8,
            background: 'var(--tg-secondary-bg)',
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 12,
          }}>
            <div style={{
              height: '100%',
              width: `${recoupment.recouped_percent}%`,
              background: recoupment.is_recouped ? '#34c759' : 'var(--tg-button)',
              borderRadius: 4,
              transition: 'width 0.3s',
            }} />
          </div>

          <div className="result-card">
            <div className="result-item">
              <span className="result-label">Витрати на обладнання</span>
              <span className="result-value">{recoupment.total_equipment_cost.toLocaleString()} грн</span>
            </div>
            <div className="result-item">
              <span className="result-label">Прибуток із замовлень</span>
              <span className="result-value">{recoupment.total_profit.toLocaleString()} грн</span>
            </div>
            {!recoupment.is_recouped && (
              <div className="result-item">
                <span className="result-label">Залишилось окупити</span>
                <span className="result-value" style={{ color: 'var(--tg-destructive)' }}>
                  {recoupment.remaining_to_recoup.toLocaleString()} грн
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Кнопка добавить */}
      <button className="btn btn-primary" onClick={() => setShowForm(true)}>
        ➕ Додати обладнання
      </button>

      {/* Форма добавления */}
      {showForm && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="form-group">
            <label className="form-label">Назва</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Принтер, резак..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ціна (грн)</label>
              <input className="form-input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Кількість</label>
              <input className="form-input" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Примітка</label>
            <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Де куплено, модель..." />
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={handleAdd}>Зберегти</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Скасувати</button>
          </div>
        </div>
      )}

      {/* Список обладнання */}
      {/* Кнопка экспорта */}
      <div className="card" style={{ marginTop: 12, background: 'var(--tg-secondary-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>💾 Бекап даних</div>
            <div className="text-muted text-sm">Завантажити всі дані (CSV для Excel)</div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ width: 'auto', padding: '8px 16px' }} onClick={exportDataCsv}>
            ⬇️ Експорт
          </button>
        </div>
      </div>

      {items.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-icon">🖨️</div>
          <p>Обладнання ще не додано</p>
          <p className="text-sm text-muted">Додайте принтер, резак та інше обладнання для відстеження окупності</p>
        </div>
      )}

      {items.map(item => (
        <div className="card" key={item.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</div>
              {item.notes && <div className="text-muted text-sm">{item.notes}</div>}
              {item.quantity > 1 && <div className="text-muted text-sm">×{item.quantity}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {(item.purchase_price * item.quantity).toLocaleString()} грн
              </div>
              {item.quantity > 1 && (
                <div className="text-muted text-sm">{item.purchase_price.toLocaleString()} грн / шт</div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-sm btn-outline" style={{ width: 'auto', color: 'var(--tg-destructive)', borderColor: 'var(--tg-destructive)' }} onClick={() => handleDelete(item.id)}>
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}