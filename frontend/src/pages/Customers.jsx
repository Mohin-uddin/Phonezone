import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      api.get('/customers', { params: { search: search || undefined } })
        .then(r => { setCustomers(r.data); setLoading(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function loadHistory(customer) {
    setSelected(customer);
    setHistory(null);
    const r = await api.get(`/customers/${customer.id}/history`);
    setHistory(r.data);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr', gap: '1rem' }}>
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <input className="form-control" placeholder="🔍 Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? <div className="empty-state"><i className="ti ti-loader" />Loading...</div> :
         customers.length === 0 ? <div className="empty-state"><i className="ti ti-users-off" />No customers found</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {customers.map(c => (
              <div key={c.id} className="card" style={{ padding: '0.9rem 1rem', cursor: 'pointer', border: selected?.id === c.id ? '1px solid var(--accent)' : '1px solid var(--border)' }} onClick={() => loadHistory(c)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>📞 {c.phone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent2)', fontSize: 13 }}>€ {Number(c.total_spent).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{c.sell_count} sell · {c.repair_count} repair</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>{selected.name}</h2>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selected.phone}</div>
            </div>
            <button onClick={() => { setSelected(null); setHistory(null); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
          {!history ? <div className="empty-state"><i className="ti ti-loader" />Loading...</div> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1rem' }}>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div className="stat-label" style={{ fontSize: 10 }}>Total Spent</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent2)', fontSize: 14 }}>€ {Number(selected.total_spent).toLocaleString()}</div>
                </div>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div className="stat-label" style={{ fontSize: 10 }}>Sell Invoices</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{history.sells.length}</div>
                </div>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div className="stat-label" style={{ fontSize: 10 }}>Repair Invoices</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent3)', fontSize: 14 }}>{history.repairs.length}</div>
                </div>
              </div>

              {history.sells.length > 0 && (
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: '0.75rem' }}>💰 Selling Invoices</div>
                  <table className="table">
                    <thead><tr><th>Invoice</th><th>Shop</th><th>Total</th><th>Date</th></tr></thead>
                    <tbody>
                      {history.sells.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.invoice_no}</td>
                          <td style={{ fontSize: 11 }}>{s.shop_name}</td>
                          <td style={{ fontWeight: 600, color: 'var(--accent2)' }}>€ {Number(s.grand_total).toLocaleString()}</td>
                          <td style={{ fontSize: 11 }}>{new Date(s.created_at).toLocaleDateString('it-IT')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {history.repairs.length > 0 && (
                <div className="card">
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: '0.75rem' }}>🔧 Repair Invoices</div>
                  <table className="table">
                    <thead><tr><th>Invoice</th><th>Device</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
                    <tbody>
                      {history.repairs.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.invoice_no}</td>
                          <td style={{ fontSize: 11 }}>{r.device_model}</td>
                          <td><span className={`badge ${r.status === 'delivered' || r.status === 'done' ? 'badge-green' : r.status === 'in_progress' ? 'badge-yellow' : 'badge-red'}`}>{r.status}</span></td>
                          <td style={{ fontWeight: 600, color: 'var(--accent3)' }}>€ {Number(r.grand_total).toLocaleString()}</td>
                          <td style={{ fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString('it-IT')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {history.sells.length === 0 && history.repairs.length === 0 && <div className="empty-state">No invoice history</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}