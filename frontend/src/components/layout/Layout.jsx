import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';

export default function Layout() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const { pathname } = useLocation();

  const titles = {
    '/':                t.dashboard,
    '/products':        t.products,
    '/selling-invoice': t.sellingInvoice,
    '/wholesale': 'Wholesale Orders',
    '/repair-invoice':  t.repairInvoice,
    '/history':         t.invoiceHistory,
    '/shops':           t.shops,
    '/users':           t.users,
    '/reports':   'Reports & Analytics',
'/stock':     'Stock Management',
'/customers': 'Customers',
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <header style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 1.5rem', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <h1 style={{ fontSize:15, fontWeight:600 }}>{titles[pathname] || 'Phonezone'}</h1>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {user?.role==='manager' && user?.shop_name && (
              <span style={{ background:'rgba(0,184,148,.12)', color:'var(--accent2)', fontSize:11, padding:'4px 10px', borderRadius:20, border:'1px solid rgba(0,184,148,.3)' }}>
                <i className="ti ti-building-store" style={{ fontSize:12 }} /> {user.shop_name}
              </span>
            )}
            <span style={{ background:'rgba(108,92,231,.12)', color:'var(--accent)', fontSize:11, padding:'4px 10px', borderRadius:20, border:'1px solid rgba(108,92,231,.3)' }}>
              {user?.role==='admin' ? '⚡ Admin' : '👤 Manager'}
            </span>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
      </div>
    </div>
  );
}
