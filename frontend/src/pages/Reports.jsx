import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function Reports() {
  const [period, setPeriod] = useState('daily');
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState({ selling: [], repair: [], profit: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/sales', { params: { period } }),
    ]).then(([s, r]) => {
      setSummary(s.data);
      setSales(r.data);
    }).finally(() => setLoading(false));
  }, [period]);

  const periods = [
    { v: 'daily', l: 'Daily (30 days)' },
    { v: 'weekly', l: 'Weekly (12 weeks)' },
    { v: 'monthly', l: 'Monthly (12 months)' },
  ];

  const maxRevenue = Math.max(...sales.selling.map(r => Number(r.revenue)), 1);

  if (loading) return <div className="empty-state"><i className="ti ti-loader" />Loading...</div>;

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Today Revenue</div>
          <div className="stat-val" style={{ color: 'var(--accent2)' }}>€ {Number(summary?.today_revenue || 0).toLocaleString()}</div>
          <div className="stat-sub">Sell + Repair</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Month</div>
          <div className="stat-val" style={{ color: 'var(--accent)' }}>€ {Number(summary?.month_revenue || 0).toLocaleString()}</div>
          <div className="stat-sub">Sell + Repair</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-val" style={{ color: 'var(--accent3)' }}>€ {Number(summary?.total_revenue || 0).toLocaleString()}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Profit</div>
          <div className="stat-val" style={{ color: 'var(--warn)' }}>€ {Number(summary?.total_profit || 0).toLocaleString()}</div>
          <div className="stat-sub">Selling margin</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        {periods.map(p => (
          <button key={p.v} className={`filter-tab ${period === p.v ? 'active' : ''}`} onClick={() => setPeriod(p.v)}>
            {p.l}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: '1rem' }}>
          📊 Selling Revenue
        </div>
        {sales.selling.length === 0 ? <div className="empty-state">No data</div> : (
          <table className="table">
            <thead><tr><th>Period</th><th>Revenue</th><th>Invoices</th><th>Chart</th></tr></thead>
            <tbody>
              {sales.selling.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.period}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent2)' }}>€ {Number(row.revenue).toLocaleString()}</td>
                  <td>{row.count}</td>
                  <td style={{ width: 200 }}>
                    <div style={{ background: 'var(--border)', borderRadius: 4, height: 8 }}>
                      <div style={{ background: 'var(--accent2)', borderRadius: 4, height: 8, width: `${(Number(row.revenue) / maxRevenue) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: '1rem' }}>
          🔧 Repair Revenue
        </div>
        {sales.repair.length === 0 ? <div className="empty-state">No data</div> : (
          <table className="table">
            <thead><tr><th>Period</th><th>Revenue</th><th>Invoices</th></tr></thead>
            <tbody>
              {sales.repair.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.period}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent3)' }}>€ {Number(row.revenue).toLocaleString()}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: '1rem' }}>
          💰 Profit (Selling margin)
        </div>
        {sales.profit.length === 0 ? <div className="empty-state">No data</div> : (
          <table className="table">
            <thead><tr><th>Period</th><th>Profit</th></tr></thead>
            <tbody>
              {sales.profit.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.period}</td>
                  <td style={{ fontWeight: 600, color: Number(row.profit) >= 0 ? 'var(--accent2)' : 'var(--danger)' }}>
                    € {Number(row.profit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}