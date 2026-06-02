import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/dashboard').then(r=>setStats(r.data)).catch(()=>{}); }, []);

  if (!stats) return <div className="empty-state"><i className="ti ti-loader" />Loading...</div>;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">{t.todayRevenue}</div><div className="stat-val" style={{color:'var(--accent2)'}}>€ {Number(stats.today_revenue).toLocaleString()}</div><div className="stat-sub">Sell + Repair</div></div>
        <div className="stat-card"><div className="stat-label">{t.totalInvoices}</div><div className="stat-val" style={{color:'var(--accent)'}}>{stats.total_invoices}</div><div className="stat-sub">All time</div></div>
        <div className="stat-card"><div className="stat-label">{t.repairsPending}</div><div className="stat-val" style={{color:'var(--accent3)'}}>{stats.pending_repairs}</div><div className="stat-sub">Pending + In Progress</div></div>
        <div className="stat-card"><div className="stat-label">{t.lowStock}</div><div className="stat-val" style={{color:'var(--warn)'}}>{stats.low_stock}</div><div className="stat-sub">Stock ≤ 5</div></div>
      </div>
      {user?.role==='admin' && stats.shop_stats?.length>0 && (
        <div className="card">
          <div style={{fontSize:12,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:'1rem'}}>{t.shopPerformance}</div>
          <table className="table">
            <thead><tr><th>{t.shop}</th><th>{t.selling}</th><th>{t.repair}</th><th>{t.revenue}</th><th>{t.invoices}</th></tr></thead>
            <tbody>
              {stats.shop_stats.map(s=>(
                <tr key={s.id}>
                  <td><div style={{fontWeight:500}}>{s.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{s.location}</div></td>
                  <td>€ {Number(s.sell_revenue).toLocaleString()}</td>
                  <td>€ {Number(s.repair_revenue).toLocaleString()}</td>
                  <td style={{fontWeight:600,color:'var(--accent2)'}}>€ {(Number(s.sell_revenue)+Number(s.repair_revenue)).toLocaleString()}</td>
                  <td>{s.invoice_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
