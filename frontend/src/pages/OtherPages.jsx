// ── InvoiceHistory ──────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export function InvoiceHistory() {
  const { user } = useAuth();
  const { t } = useLang();
  const [type,   setType]    = useState('all');
  const [shops,  setShops]   = useState([]);
  const [shopId, setShopId]  = useState('');
  const [selling,setSelling] = useState([]);
  const [repair, setRepair]  = useState([]);

  useEffect(()=>{ api.get('/shops').then(r=>setShops(r.data)); },[]);
  useEffect(()=>{
    const p = shopId?{shop_id:shopId}:{};
    if(type!=='repair')  api.get('/selling-invoices',{params:p}).then(r=>setSelling(r.data.data||[]));
    if(type!=='selling') api.get('/repair-invoices', {params:p}).then(r=>setRepair(r.data.data||[]));
  },[type,shopId]);

  const combined = [
    ...(type!=='repair'  ? selling.map(i=>({...i,_type:'Selling'})) : []),
    ...(type!=='selling' ? repair .map(i=>({...i,_type:'Repair'}))  : []),
  ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  async function updateStatus(id,status) {
    await api.patch(`/repair-invoices/${id}/status`,{status});
    api.get('/repair-invoices').then(r=>setRepair(r.data.data||[]));
  }

  const statusOpts = [
    {v:'pending',    l:t.pending},
    {v:'in_progress',l:t.inProgress},
    {v:'done',       l:t.done},
    {v:'delivered',  l:t.delivered},
  ];

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap',alignItems:'center'}}>
        {['all','selling','repair'].map(tp=>(
          <button key={tp} className={`filter-tab ${type===tp?'active':''}`} onClick={()=>setType(tp)}>
            {tp==='all'?t.allInvoices:tp==='selling'?t.selling:t.repair}
          </button>
        ))}
        {user?.role==='admin' && (
          <select className="form-control" style={{width:'auto',padding:'5px 12px',fontSize:12,marginLeft:'auto'}} value={shopId} onChange={e=>setShopId(e.target.value)}>
            <option value="">{t.allShops}</option>
            {shops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table className="table">
          <thead><tr><th>Invoice</th><th>{t.date}</th><th>{t.customer}</th><th>{t.type}</th><th>{t.details}</th><th>{t.amount}</th><th>{t.status}</th></tr></thead>
          <tbody>
            {combined.map(inv=>(
              <tr key={`${inv._type}-${inv.id}`}>
                <td><span style={{fontWeight:600,fontFamily:'monospace',fontSize:12}}>#{inv.invoice_no}</span></td>
                <td style={{fontSize:12,color:'var(--muted)'}}>{new Date(inv.created_at).toLocaleDateString('it-IT')}</td>
                <td><div style={{fontWeight:500}}>{inv.customer_name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{inv.customer_phone}</div></td>
                <td><span className={`badge ${inv._type==='Repair'?'badge-purple':'badge-blue'}`}>{inv._type==='Repair'?t.repair:t.selling}</span></td>
                <td style={{fontSize:12,color:'var(--muted)'}}>{inv._type==='Repair'?inv.device_model:inv.shop_name}</td>
                <td style={{fontWeight:600,color:'var(--accent2)'}}>€ {Number(inv.grand_total).toLocaleString()}</td>
                <td>{inv._type==='Repair'?(
                  <select className="form-control" style={{padding:'3px 8px',fontSize:11,width:'auto'}} value={inv.status} onChange={e=>updateStatus(inv.id,e.target.value)}>
                    {statusOpts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ):<span className="badge badge-green">{t.done}</span>}</td>
              </tr>
            ))}
            {!combined.length&&<tr><td colSpan={7}><div className="empty-state"><i className="ti ti-file-off"/>No invoices</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Shops ───────────────────────────────────────────────────────────────────
import toast from 'react-hot-toast';

export function Shops() {
  const { t } = useLang();
  const [shops,  setShops]  = useState([]);
  const [show,   setShow]   = useState(false);
  const [editing,setEdit]   = useState(null);
  const [form,   setForm]   = useState({name:'',location:'',phone:''});

  const load = ()=>api.get('/shops').then(r=>setShops(r.data));
  useEffect(()=>{load();},[]);

  function openAdd()  { setEdit(null); setForm({name:'',location:'',phone:''}); setShow(true); }
  function openEdit(s){ setEdit(s); setForm({name:s.name,location:s.location,phone:s.phone}); setShow(true); }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if(editing) await api.put(`/shops/${editing.id}`,{...form,is_active:1});
      else        await api.post('/shops',form);
      toast.success(editing?t.editShop:t.addShop); setShow(false); load();
    } catch(err){ toast.error(err.response?.data?.message||'Error'); }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'1rem'}}>
        <button className="btn btn-primary" onClick={openAdd}><i className="ti ti-plus"/>{t.addShop}</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
        {shops.map(s=>(
          <div key={s.id} className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div><div style={{fontWeight:600,fontSize:15}}>{s.name}</div><div style={{fontSize:12,color:'var(--muted)'}}>{s.location}</div></div>
              <span className={`badge ${s.is_active?'badge-green':'badge-red'}`}>{s.is_active?t.active:t.inactive}</span>
            </div>
            <table className="table" style={{fontSize:12}}><tbody>
              <tr><td style={{color:'var(--muted)'}}>{t.phone}</td><td>{s.phone||'—'}</td></tr>
            </tbody></table>
            <button className="btn btn-outline btn-sm" style={{marginTop:10,width:'100%'}} onClick={()=>openEdit(s)}><i className="ti ti-edit"/>{t.editShop}</button>
          </div>
        ))}
      </div>
      {show&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'1rem'}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,width:'100%',maxWidth:420}}>
            <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{fontSize:15,fontWeight:600}}>{editing?t.editShop:t.addShop}</h3>
              <button onClick={()=>setShow(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20}}>×</button>
            </div>
            <form onSubmit={handleSave} style={{padding:'1.5rem'}}>
              <div className="form-group"><label className="form-label">{t.shopName}</label><input className="form-control" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">{t.location}</label><input className="form-control" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">{t.phone}</label><input className="form-control" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-outline" onClick={()=>setShow(false)}>{t.cancel}</button>
                <button type="submit" className="btn btn-primary">{t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Users ───────────────────────────────────────────────────────────────────
export function Users() {
  const { t } = useLang();
  const [users, setUsers]   = useState([]);
  const [shops, setShops]   = useState([]);
  const [show,  setShow]    = useState(false);
  const [editing,setEdit]   = useState(null);
  const [form,  setForm]    = useState({name:'',email:'',password:'',role:'manager',shop_id:''});

  const load = ()=>api.get('/users').then(r=>setUsers(r.data));
  useEffect(()=>{ load(); api.get('/shops').then(r=>setShops(r.data)); },[]);

  function openAdd()  { setEdit(null); setForm({name:'',email:'',password:'',role:'manager',shop_id:''}); setShow(true); }
  function openEdit(u){ setEdit(u); setForm({name:u.name,email:u.email,password:'',role:u.role,shop_id:u.shop_id||''}); setShow(true); }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if(editing) await api.put(`/users/${editing.id}`,{...form,is_active:1});
      else        await api.post('/users',form);
      toast.success(editing?t.editUser:t.addUser); setShow(false); load();
    } catch(err){ toast.error(err.response?.data?.message||'Error'); }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'1rem'}}>
        <button className="btn btn-primary" onClick={openAdd}><i className="ti ti-plus"/>{t.addUser}</button>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table className="table">
          <thead><tr><th>{t.fullName}</th><th>{t.email}</th><th>{t.role}</th><th>{t.shop}</th><th>{t.status}</th><th>{t.action}</th></tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id}>
                <td style={{fontWeight:500}}>{u.name}</td>
                <td style={{fontSize:12,color:'var(--muted)'}}>{u.email}</td>
                <td><span className={`badge ${u.role==='admin'?'badge-purple':'badge-blue'}`}>{u.role}</span></td>
                <td style={{fontSize:12}}>{u.shop_name||'—'}</td>
                <td><span className={`badge ${u.is_active?'badge-green':'badge-red'}`}>{u.is_active?t.active:t.inactive}</span></td>
                <td><button className="btn btn-outline btn-sm" onClick={()=>openEdit(u)}><i className="ti ti-edit"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {show&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'1rem'}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,width:'100%',maxWidth:440}}>
            <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{fontSize:15,fontWeight:600}}>{editing?t.editUser:t.addUser}</h3>
              <button onClick={()=>setShow(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20}}>×</button>
            </div>
            <form onSubmit={handleSave} style={{padding:'1.5rem'}}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">{t.fullName}</label><input className="form-control" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required /></div>
                <div className="form-group"><label className="form-label">{t.email}</label><input className="form-control" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">{t.password} {editing&&'(blank = keep)'}</label><input className="form-control" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} {...(!editing&&{required:true})} /></div>
                <div className="form-group"><label className="form-label">{t.role}</label>
                  <select className="form-control" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                    <option value="manager">Manager</option><option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {form.role==='manager'&&(
                <div className="form-group"><label className="form-label">{t.assignedShop}</label>
                  <select className="form-control" value={form.shop_id} onChange={e=>setForm(f=>({...f,shop_id:e.target.value}))}>
                    <option value="">— Select —</option>
                    {shops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-outline" onClick={()=>setShow(false)}>{t.cancel}</button>
                <button type="submit" className="btn btn-primary">{t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
