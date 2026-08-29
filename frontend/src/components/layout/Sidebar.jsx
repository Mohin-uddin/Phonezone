import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();

  const navItems = [
    { to:'/',                end:true, icon:'ti-layout-dashboard', label:t.dashboard,      section:'Main' },
    { to:'/products',                  icon:'ti-packages',          label:t.products,       section:'Main' },
    { to:'/selling-invoice',           icon:'ti-receipt',           label:t.sellingInvoice, section:'Invoices' },
    { to:'/repair-invoice',            icon:'ti-tool',              label:t.repairInvoice,  section:'Invoices' },
    { to:'/history',                   icon:'ti-history',           label:t.invoiceHistory, section:'Invoices' },
    { to:'/shops',  adminOnly:true,    icon:'ti-building-store',    label:t.shops,          section:'Settings' },
    { to:'/users',  adminOnly:true,    icon:'ti-users',             label:t.users,          section:'Settings' },
    { to:'/reports',   icon:'ti-chart-bar',  label:'Reports',   section:'Analytics' },
{ to:'/stock',     icon:'ti-box',        label:'Stock',      section:'Analytics' },
{ to:'/customers', icon:'ti-users',      label:'Customers',  section:'Analytics' },
  ];

  const filtered = navItems.filter(i => !i.adminOnly || user?.role==='admin');
  const sections = ['Main', 'Analytics', 'Invoices', 'Settings'];

  function handleLogout() { logout(); toast.success(t.logout); navigate('/login'); }

  return (
    <aside style={{ width:230, background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100vh', flexShrink:0 }}>
      {/* Brand */}
      <div style={{ padding:'1.2rem 1.25rem 1rem', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:24 }}>📱</span>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--accent)', letterSpacing:.5 }}>Phonezone</div>
            <div style={{ fontSize:10, color:'var(--muted)' }}>{t.phonezoneBranch}</div>
          </div>
        </div>
        {/* Language toggle */}
        <button className="lang-btn" onClick={toggleLang} style={{ marginTop:10, width:'100%', justifyContent:'center' }}>
          {lang==='en' ? '🇮🇹 Italiano' : '🇬🇧 English'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'0.5rem 0' }}>
        {sections.map(section => {
          const items = filtered.filter(i=>i.section===section);
          if (!items.length) return null;
          return (
            <div key={section}>
              <div style={{ fontSize:10, color:'var(--muted)', padding:'0.75rem 1.25rem 0.3rem', textTransform:'uppercase', letterSpacing:1, opacity:.6 }}>{section}</div>
              {items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end}
                  style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:10, padding:'9px 1.25rem',
                    cursor:'pointer', fontSize:13, textDecoration:'none',
                    color: isActive ? 'var(--accent)' : 'var(--muted)',
                    background: isActive ? 'rgba(108,92,231,.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    transition:'all .15s',
                  })}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:16, width:18 }} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding:'1rem 1.25rem', borderTop:'1px solid var(--border)' }}>
        <div style={{ fontSize:12, fontWeight:500, marginBottom:2 }}>{user?.name}</div>
        <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>
          {user?.role==='admin' ? '⚡ Admin' : `🏪 ${user?.shop_name||'Manager'}`}
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ width:'100%', justifyContent:'center' }}>
          <i className="ti ti-logout" /> {t.logout}
        </button>
      </div>
    </aside>
  );
}
