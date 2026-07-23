import { useState, useEffect } from 'react';
import {
  getServices, createOrder, getOrders, deleteOrder, calculatePrice, getUser,
  getPurchases, getPurchaseSummary
} from '../api';
import Autocomplete from './Autocomplete';
import type { Service, Order, CalculationResult, Purchase, PurchaseSummary } from '../types';

interface MaterialUsage {
  name: string;
  pieces_used: number;
  price_per_piece: number;
  total_cost: number;
}

export default function Calculator() {
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState('');

  // Форма
  const [clientName, setClientName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [needsDesign, setNeedsDesign] = useState(false);
  const [needsPackaging, setNeedsPackaging] = useState(false);
  const [error, setError] = useState('');

  // Результат
  const [result, setResult] = useState<CalculationResult | null>(null);

  // Себестоимость
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummary[]>([]);
  const [materialFilter, setMaterialFilter] = useState('');
  const [materialUsages, setMaterialUsages] = useState<MaterialUsage[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [piecesToUse, setPiecesToUse] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');

  // Клиенты для автодополнения
  const [recentClients, setRecentClients] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [svc, ord] = await Promise.all([
        getServices(),
        getOrders(),
      ]);
      setServices(svc);
      setOrders(ord);

      // Загружаем данные о материалах
      const [polyPurchases, epoxyPurchases, summary] = await Promise.all([
        getPurchases('poligraphy'),
        getPurchases('epoxy'),
        getPurchaseSummary(),
      ]);
      const allPurchases = [...polyPurchases, ...epoxyPurchases];
      setPurchases(allPurchases);
      setPurchaseSummary(summary);

      // Собираем уникальных клиентов
      const clients = [...new Set(ord.map(o => o.client_name))].slice(0, 10);
      setRecentClients(clients);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // Доступные склады (только то, что ещё не израсходовано)
  const availableMaterials = purchaseSummary.filter(s => s.remaining_pieces > 0);
  const filteredMaterials = availableMaterials.filter(s =>
    s.name.toLowerCase().includes(materialFilter.toLowerCase())
  );

  const addMaterial = () => {
    if (!selectedMaterial || !piecesToUse || Number(piecesToUse) < 1) {
      setError('Выберите материал и укажите количество штук');
      return;
    }

    const summary = purchaseSummary.find(s => s.name === selectedMaterial);
    if (!summary) return;

    const pieces = Number(piecesToUse);
    const alreadyUsed = materialUsages
      .filter(u => u.name === selectedMaterial)
      .reduce((sum, u) => sum + u.pieces_used, 0);

    if (alreadyUsed + pieces > summary.remaining_pieces) {
      setError(`Недостаточно "${selectedMaterial}". Осталось: ${summary.remaining_pieces} шт.`);
      return;
    }

    const pricePerPiece = summary.total_spent / summary.total_pieces;

    setMaterialUsages([...materialUsages, {
      name: selectedMaterial,
      pieces_used: pieces,
      price_per_piece: pricePerPiece,
      total_cost: pieces * pricePerPiece,
    }]);

    setSelectedMaterial('');
    setPiecesToUse('');
    setMaterialFilter('');
    setError('');
  };

  const removeMaterial = (index: number) => {
    setMaterialUsages(materialUsages.filter((_, i) => i !== index));
  };

  const totalCostPrice = materialUsages.reduce((sum, m) => sum + m.total_cost, 0);

  const handleCalculate = () => {
    setError('');

    if (!clientName.trim()) {
      setError('Введите имя клиента');
      return;
    }
    if (!serviceId) {
      setError('Выберите услугу');
      return;
    }
    if (!quantity || Number(quantity) < 1) {
      setError('Введите корректное количество');
      return;
    }

    const service = services.find(s => s.id === Number(serviceId));
    if (!service) {
      setError('Услуга не найдена');
      return;
    }

    const calc = calculatePrice(
      service.base_price,
      service.design_price,
      Number(quantity),
      needsDesign,
      needsPackaging
    );

    setResult(calc);
  };

  const handleSave = async () => {
    if (!result) return;

    const service = services.find(s => s.id === Number(serviceId));
    if (!service) return;

    setSaving(true);
    setError('');

    try {
      await createOrder({
        client_name: clientName.trim(),
        service_id: service.id,
        service_name: service.name,
        quantity: Number(quantity),
        needs_design: needsDesign ? 1 : 0,
        needs_packaging: needsPackaging ? 1 : 0,
        base_price: service.base_price,
        design_price: service.design_price,
        unit_price: result.unitPrice,
        total: result.total,
        cost_price: totalCostPrice,
        received_amount: Number(receivedAmount) || 0,
        materials: materialUsages.map(m => ({
          material_name: m.name,
          pieces_used: m.pieces_used,
          cost_price: m.total_cost,
        })),
      });

      showToast('✅ Заказ сохранён!');
      setClientName('');
      setQuantity('');
      setNeedsDesign(false);
      setNeedsPackaging(false);
      setResult(null);
      setServiceId('');
      setMaterialUsages([]);
      setReceivedAmount('');

      // Обновляем историю
      const ord = await getOrders();
      setOrders(ord);

      const clients = [...new Set(ord.map(o => o.client_name))].slice(0, 10);
      setRecentClients(clients);

      // Обновляем остатки
      const summary = await getPurchaseSummary();
      setPurchaseSummary(summary);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Удалить заказ из истории?')) return;
    try {
      await deleteOrder(id);
      const ord = await getOrders();
      setOrders(ord);
      showToast('🗑️ Заказ удалён');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const selectedService = services.find(s => s.id === Number(serviceId));
  const profit = result ? (Number(receivedAmount) || result.total) - totalCostPrice : 0;

  return (
    <div>
      <div className="tab-header">
        <div className="tab-title">🧮 Калькулятор</div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Форма заказа */}
      <div className="card">
        <div className="form-group">
          <label className="form-label">Имя клиента</label>
          <Autocomplete
            value={clientName}
            onChange={setClientName}
            suggestions={recentClients}
            placeholder="Введите имя"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Услуга</label>
          {services.length === 0 ? (
            <p className="text-muted text-sm">
              Сначала добавьте услуги во вкладке «Услуги»
            </p>
          ) : (
            <select
              className="form-select"
              value={serviceId}
              onChange={e => { setServiceId(e.target.value); setResult(null); }}
            >
              <option value="">— Выберите услугу —</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.format ? `(${s.format})` : ''} — {s.base_price.toFixed(2)} грн
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Количество (шт)</label>
            <input
              className="form-input"
              type="number"
              min="1"
              placeholder="100"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column' }}>
            <label className="form-label"> </label>
            <div style={{ fontSize: 11, color: 'var(--tg-hint)', lineHeight: 1.3 }}>
              Скидки:<br />
              100+ → 10% | 250+ → 15% | 500+ → 30%
            </div>
          </div>
        </div>

        <div className="form-row">
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={needsDesign}
              onChange={e => setNeedsDesign(e.target.checked)}
            />
            <span>🎨 Нужен макет</span>
          </label>
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={needsPackaging}
              onChange={e => setNeedsPackaging(e.target.checked)}
            />
            <span>📦 Упаковка (25 грн)</span>
          </label>
        </div>

        {/* Расход материалов (себестоимость) */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <label className="form-label" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            📊 Расход материалов (себестоимость)
          </label>

          {materialUsages.length > 0 && (
            <div className="card" style={{ padding: '8px 10px', marginBottom: 8, fontSize: 13 }}>
              {materialUsages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span>
                    {m.name} — <strong>{m.pieces_used}</strong> шт.
                    <span className="text-muted text-sm"> ({(m.price_per_piece).toFixed(2)} грн/шт)</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>{m.total_cost.toFixed(2)} грн</span>
                    <button className="btn btn-sm btn-danger" style={{ width: 28, height: 28, minHeight: 'auto', padding: 0 }}
                      onClick={() => removeMaterial(i)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.05)', fontWeight: 700 }}>
                <span>Себестоимость:</span>
                <span>{totalCostPrice.toFixed(2)} грн</span>
              </div>
            </div>
          )}

          {availableMaterials.length > 0 && (
            <div className="form-row" style={{ gap: 6 }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 6, position: 'relative' }}>
                <input
                  className="form-input"
                  style={{ fontSize: 13, padding: '8px 10px', minHeight: 36 }}
                  placeholder="Поиск материала..."
                  value={materialFilter}
                  onChange={e => setMaterialFilter(e.target.value)}
                />
                {materialFilter && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--tg-section-bg)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 8,
                    zIndex: 10,
                    maxHeight: 150,
                    overflowY: 'auto',
                  }}>
                    {filteredMaterials.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--tg-hint)' }}>
                        Ничего не найдено
                      </div>
                    ) : (
                      filteredMaterials.map(s => (
                        <div
                          key={s.name}
                          style={{
                            padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                            background: selectedMaterial === s.name ? 'var(--tg-secondary-bg)' : 'transparent',
                          }}
                          onClick={() => {
                            setSelectedMaterial(s.name);
                            setMaterialFilter(s.name);
                          }}
                        >
                          <strong>{s.name}</strong>
                          <span className="text-muted" style={{ marginLeft: 8 }}>
                            {s.remaining_pieces} шт. / {s.total_pieces} шт.
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="form-group" style={{ flex: '0 0 80px', marginBottom: 6 }}>
                <input
                  className="form-input"
                  style={{ fontSize: 13, padding: '8px 10px', minHeight: 36 }}
                  type="number"
                  min="1"
                  placeholder="шт"
                  value={piecesToUse}
                  onChange={e => setPiecesToUse(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: 'auto', marginTop: 0, minHeight: 36, flex: '0 0 60px', padding: '6px 8px' }}
                onClick={addMaterial}
                disabled={!selectedMaterial || !piecesToUse}
              >
                +
              </button>
            </div>
          )}
          {availableMaterials.length === 0 && (
            <p className="text-muted text-sm">
              Нет материалов в запасе. Добавьте закупки во вкладке «Закупки».
            </p>
          )}

          {/* Полученная сумма */}
          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label">💳 Полученная сумма от клиента (грн)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              min="0"
              placeholder="Например: 5000.00"
              value={receivedAmount}
              onChange={e => setReceivedAmount(e.target.value)}
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleCalculate} style={{ marginTop: 8 }}>
          🧮 Рассчитать
        </button>
      </div>

      {/* Результат */}
      {result && selectedService && (
        <div className="result-card" style={{ marginTop: 10 }}>
          <div className="result-item">
            <span className="result-label">Клиент</span>
            <span className="result-value">{clientName}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Услуга</span>
            <span className="result-value">{selectedService.name}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Количество</span>
            <span className="result-value">{quantity} шт.</span>
          </div>
          <div className="result-item">
            <span className="result-label">Цена за единицу</span>
            <span className="result-value">
              {result.unitPrice.toFixed(2)} грн
              {result.discountPercent > 0 && (
                <span className="badge badge-success" style={{ marginLeft: 8 }}>
                  -{result.discountPercent}%
                </span>
              )}
            </span>
          </div>
          {result.designCost > 0 && (
            <div className="result-item">
              <span className="result-label">🎨 Дизайн</span>
              <span className="result-value">+{result.designCost.toFixed(2)} грн</span>
            </div>
          )}
          {result.packagingCost > 0 && (
            <div className="result-item">
              <span className="result-label">📦 Упаковка</span>
              <span className="result-value">+{result.packagingCost.toFixed(2)} грн</span>
            </div>
          )}
          <div className="result-total result-item">
            <span className="result-label" style={{ fontSize: 16 }}>💵 ИТОГО К ОПЛАТЕ</span>
            <span className="result-value" style={{ fontSize: 22 }}>{result.total.toFixed(2)} грн</span>
          </div>

          {totalCostPrice > 0 && (
            <div className="result-item">
              <span className="result-label">📊 Себестоимость</span>
              <span className="result-value" style={{ color: 'var(--tg-hint)' }}>
                {totalCostPrice.toFixed(2)} грн
              </span>
            </div>
          )}

          {(Number(receivedAmount) > 0 || totalCostPrice > 0) && (
            <div className="result-item">
              <span className="result-label">💳 Получено</span>
              <span className="result-value">
                {receivedAmount ? `${Number(receivedAmount).toFixed(2)} грн` : '—'}
              </span>
            </div>
          )}

          {(Number(receivedAmount) > 0 || result.total > 0) && totalCostPrice > 0 && (
            <div className="result-item" style={{ background: profit >= 0 ? 'rgba(52,199,89,0.08)' : 'rgba(229,57,53,0.08)' }}>
              <span className="result-label" style={{ fontSize: 15, fontWeight: 700 }}>📈 Прибыль</span>
              <span className="result-value" style={{ fontSize: 18, color: profit >= 0 ? '#34c759' : 'var(--tg-destructive)' }}>
                {profit >= 0 ? '+' : ''}{profit.toFixed(2)} грн
              </span>
            </div>
          )}

          <div style={{ padding: 14 }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '⏳ Сохранение...' : '💾 Сохранить заказ'}
            </button>
          </div>
        </div>
      )}

      {/* История заказов */}
      <div className="history-section">
        <button className="history-toggle" onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? '▲' : '▼'} История заказов ({orders.length})
        </button>

        {showHistory && (
          loading ? (
            <div className="loading">
              <div className="spinner" />
              <span>Загрузка...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <p>Пока нет заказов</p>
            </div>
          ) : (
            orders.map(order => {
              const orderProfit = (order.received_amount || order.total) - (order.cost_price || 0);
              return (
                <div key={order.id} className="card" style={{ fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong>{order.client_name}</strong>
                    <span className="text-muted text-sm">{order.created_at?.slice(0, 10)}</span>
                  </div>
                  <div className="text-muted text-sm" style={{ marginBottom: 4 }}>
                    {order.service_name} · {order.quantity} шт.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{order.total.toFixed(2)} грн</strong>
                      {order.cost_price > 0 && (
                        <span className="text-muted text-sm" style={{ marginLeft: 8 }}>
                          (себ.: {order.cost_price.toFixed(2)} грн)
                        </span>
                      )}
                      {order.cost_price > 0 && (
                        <span style={{
                          marginLeft: 8,
                          color: orderProfit >= 0 ? '#34c759' : 'var(--tg-destructive)',
                          fontWeight: 600,
                        }}>
                          {orderProfit >= 0 ? '+' : ''}{orderProfit.toFixed(2)} грн
                        </span>
                      )}
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteOrder(order.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
