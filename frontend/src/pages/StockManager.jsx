import { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function StockManager() {
  const [alerts, setAlerts] = useState([]);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAlerts = () => api.get('/stock/alerts').then(r => { setAlerts(r.data); setLoading(false); });
  useEffect(() => { loadAlerts(); }, []);

  async function loadHistory(product) {
    setHistoryProduct(product);
    const r = await api.get(`/stock/history/${product.id}`);
    setHistory(r.data);
  }

  async function handleAdjust(e) {
    e.preventDefault();
    try {
      const r = await api.patch(`/stock/adjust/${adjustModal.id}`, { quantity: parseInt(adjustQty) });
      toast.success(`Stock updated! New stock: ${r.data.new_stock}`);
      setAdjustModal(null);
      setAdjustQty('');
      loadAlerts();
    } catch { toast.error('Error updating stock'); }
  }

  if (loading) return <div className="empty-state"><i className="ti ti-loader" />Loading...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: historyProduct ? '1fr 1fr' : '1fr', gap: '1rem' }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem' }}>⚠️ Low Stock Alerts ({alerts.length})</h2>
        {alerts.length === 0 ? (
          <div className="empty-state"><i className="ti ti-circle-check" style={{ color: 'var(--accent2)' }} />All products have sufficient stock!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map(p => (
              <div key={p.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.shop_name} · {p.category}</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge ${p.stock === 0 ? 'badge-red' : 'badge-yellow'}`}>
                      {p.stock === 0 ? '🚫 Out of Stock' : `⚠️ Stock: ${p.stock}`}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => loadHistory(p)}><i className="ti ti-history" /> History</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setAdjustModal(p); setAdjustQty(''); }}><i className="ti ti-plus" /> Adjust</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {historyProduct && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>📋 History: {historyProduct.name}</h2>
            <button onClick={() => setHistoryProduct(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: 13 }}>
              Current stock: <strong style={{ color: historyProduct.stock <= 0 ? 'var(--danger)' : 'var(--accent2)' }}>{historyProduct.stock}</strong>
            </div>
            {history.length === 0 ? <div className="empty-state">No sales history</div> : (
              <table className="table">
                <thead><tr><th>Type</th><th>Invoice</th><th>Customer</th><th>Qty</th><th>Date</th></tr></thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td><span className={`badge ${h.type === 'sell' ? 'badge-green' : 'badge-purple'}`}>{h.type === 'sell' ? '💰 Sell' : '🔧 Repair'}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{h.invoice_no}</td>
                      <td>{h.customer_name}</td>
                      <td style={{ fontWeight: 600 }}>-{h.qty}</td>
                      <td style={{ fontSize: 11 }}>{new Date(h.created_at).toLocaleDateString('it-IT')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {adjustModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 400, padding: '1.5rem' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem' }}>📦 Adjust Stock: {adjustModal.name}</h3>
            <div style={{ marginBottom: '1rem', fontSize: 13 }}>Current stock: <strong>{adjustModal.stock}</strong></div>
            <form onSubmit={handleAdjust}>
              <div className="form-group">
                <label className="form-label">Quantity (negative to reduce, e.g. -5)</label>
                <input className="form-control" type="number" placeholder="e.g. +10 or -5" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} required autoFocus />
                {adjustQty && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                    New stock: <strong style={{ color: 'var(--accent2)' }}>{Math.max(0, adjustModal.stock + parseInt(adjustQty || 0))}</strong>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setAdjustModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}