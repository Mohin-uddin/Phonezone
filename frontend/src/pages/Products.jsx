import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import toast from 'react-hot-toast';

const EMOJI = { phone:'📱', display:'🖥', battery:'🔋', charging_port:'🔌', accessory:'🎧' };

function BarcodeCanvas({ value, width=240, height=55 }) {
  const ref = useRef();
  useEffect(() => {
    if (!value || !ref.current) return;
    const ctx = ref.current.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    const bars = [3,1,1];
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i);
      bars.push((c%4)+1, ((c>>2)%4)+1, ((c>>4)%4)+1, ((c>>6)%4)+1);
    }
    bars.push(3,1,1,2);
    const total = bars.reduce((s,b)=>s+b,0);
    const unit = width / total;
    let x = 0;
    bars.forEach((w,i) => {
      ctx.fillStyle = i%2===0 ? '#000':'#fff';
      ctx.fillRect(x, 0, w*unit, height-14);
      x += w*unit;
    });
    ctx.fillStyle='#000'; ctx.font='9px monospace'; ctx.textAlign='center';
    ctx.fillText(value, width/2, height-2);
  }, [value]);
  return <canvas ref={ref} width={width} height={height} style={{background:'#fff',borderRadius:4}} />;
}

function downloadBarcode(value) {
  const canvas = document.createElement('canvas');
  canvas.width = 280; canvas.height = 65;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,280,65);
  const bars = [3,1,1];
  for (let i=0;i<value.length;i++) { const c=value.charCodeAt(i); bars.push((c%4)+1,((c>>2)%4)+1,((c>>4)%4)+1,((c>>6)%4)+1); }
  bars.push(3,1,1,2);
  const total=bars.reduce((s,b)=>s+b,0); const unit=280/total; let x=0;
  bars.forEach((w,i)=>{ ctx.fillStyle=i%2===0?'#000':'#fff'; ctx.fillRect(x,0,w*unit,51); x+=w*unit; });
  ctx.fillStyle='#000'; ctx.font='11px monospace'; ctx.textAlign='center'; ctx.fillText(value,140,63);
  const link=document.createElement('a'); link.download=`barcode-${value}.png`; link.href=canvas.toDataURL(); link.click();
}

export default function Products() {
  const { user } = useAuth();
  const { t } = useLang();
  const [search,   setSearch]   = useState('');
  const [products, setProducts] = useState([]);
  const [shops,    setShops]    = useState([]);
  const [shopId,   setShopId]   = useState('');
  const [cat,      setCat]      = useState('');
  const [showModal,setShowModal]= useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ name:'',category:'phone',compatible:'',cost_price:'',sell_price:'',stock:'',shop_id:'' });

  const CATS = [
    {v:'',             label:t.categories.all},
    {v:'phone',        label:t.categories.phone},
    {v:'display',      label:t.categories.display},
    {v:'battery',      label:t.categories.battery},
    {v:'charging_port',label:t.categories.charging_port},
    {v:'accessory',    label:t.categories.accessory},
  ];

  const load = () => api.get('/products', {
    params: {
      shop_id:  shopId  || undefined,
      category: cat     || undefined,
      search:   search  || undefined,
    }
  }).then(r => setProducts(r.data));

  useEffect(() => { load(); }, [shopId, cat, search]);
  useEffect(() => { api.get('/shops').then(r => setShops(r.data)); }, []);

  function openAdd()   { setEditing(null); setForm({name:'',category:'phone',compatible:'',cost_price:'',sell_price:'',stock:'',shop_id:shops[0]?.id||''}); setShowModal(true); }
  function openEdit(p) { setEditing(p);    setForm({name:p.name,category:p.category,compatible:p.compatible,cost_price:p.cost_price,sell_price:p.sell_price,stock:p.stock,shop_id:p.shop_id}); setShowModal(true); }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editing) await api.put(`/products/${editing.id}`, form);
      else         await api.post('/products', form);
      toast.success(editing ? t.editProduct : t.addProduct);
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete?')) return;
    await api.delete(`/products/${id}`); toast.success('Deleted'); load();
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap',alignItems:'center'}}>
        {user?.role==='admin' && (
          <>
            <button className={`filter-tab ${!shopId?'active':''}`} onClick={()=>setShopId('')}>{t.allShops}</button>
            {shops.map(s=>(
              <button key={s.id} className={`filter-tab ${shopId==s.id?'active':''}`} onClick={()=>setShopId(s.id)}>{s.name}</button>
            ))}
          </>
        )}
        {CATS.map(c=>(
          <button key={c.v} className={`filter-tab ${cat===c.v?'active':''}`} onClick={()=>setCat(c.v)}>{c.label}</button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          <input
            className="form-control"
            placeholder="🔍 Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{width:180}}
          />
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <i className="ti ti-plus"/>{t.addProduct}
          </button>
        </div>
      </div>

      {/* Product grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:12}}>
        {products.map(p=>(
          <div key={p.id} className="card" style={{padding:'1rem'}}>
            <div style={{textAlign:'center',fontSize:34,marginBottom:8,background:'var(--surface)',borderRadius:8,padding:'10px 0'}}>
              {EMOJI[p.category]||'📦'}
            </div>
            <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{p.name}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>{p.compatible}</div>
            <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
              <span className="badge badge-purple">{p.category}</span>
              <span className={`badge ${p.stock>0?'badge-green':'badge-red'}`}>
                {p.stock>0 ? `${t.inStock}: ${p.stock}` : t.outOfStock}
              </span>
            </div>
            {user?.role==='admin' && (
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:6}}>{p.shop_name}</div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontWeight:700,color:'var(--accent2)',fontSize:14}}>€ {Number(p.sell_price).toLocaleString()}</span>
              <span style={{fontSize:11,color:'var(--muted)'}}>Cost: € {Number(p.cost_price).toLocaleString()}</span>
            </div>
            {p.barcode && (
              <div style={{textAlign:'center',marginBottom:8,padding:'6px',background:'var(--surface)',borderRadius:8}}>
                <BarcodeCanvas value={p.barcode} width={180} height={44}/>
                <button className="btn btn-outline btn-sm" style={{marginTop:6,width:'100%'}} onClick={()=>downloadBarcode(p.barcode)}>
                  <i className="ti ti-download"/> {t.downloadBarcode}
                </button>
              </div>
            )}
            <div style={{display:'flex',gap:6}}>
              <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>openEdit(p)}>
                <i className="ti ti-edit"/>{t.editProduct}
              </button>
              {user?.role==='admin' && (
                <button className="btn btn-sm" style={{background:'rgba(231,76,60,.15)',color:'var(--danger)',border:'none'}} onClick={()=>handleDelete(p.id)}>
                  <i className="ti ti-trash"/>
                </button>
              )}
            </div>
          </div>
        ))}
        {!products.length && (
          <div className="empty-state" style={{gridColumn:'1/-1'}}>
            <i className="ti ti-package-off"/>No products
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'1rem'}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,width:'100%',maxWidth:500}}>
            <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{fontSize:15,fontWeight:600}}>{editing ? t.editProduct : t.addProduct}</h3>
              <button onClick={()=>setShowModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20}}>×</button>
            </div>
            <form onSubmit={handleSave} style={{padding:'1.5rem'}}>
              <div className="form-group">
                <label className="form-label">{t.productName}</label>
                <input className="form-control" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t.category}</label>
                  <select className="form-control" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    {CATS.filter(c=>c.v).map(c=><option key={c.v} value={c.v}>{c.label}</option>)}
                  </select>
                </div>
                {user?.role==='admin' && (
                  <div className="form-group">
                    <label className="form-label">{t.shop}</label>
                    <select className="form-control" value={form.shop_id} onChange={e=>setForm(f=>({...f,shop_id:e.target.value}))}>
                      {shops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{t.compatible}</label>
                <input className="form-control" value={form.compatible} onChange={e=>setForm(f=>({...f,compatible:e.target.value}))} />
              </div>
              <div className="form-row3">
                <div className="form-group">
                  <label className="form-label">{t.costPrice} €</label>
                  <input className="form-control" type="number" value={form.cost_price} onChange={e=>setForm(f=>({...f,cost_price:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.sellPrice} €</label>
                  <input className="form-control" type="number" value={form.sell_price} onChange={e=>setForm(f=>({...f,sell_price:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.stockQty}</label>
                  <input className="form-control" type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} required />
                </div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-outline" onClick={()=>setShowModal(false)}>{t.cancel}</button>
                <button type="submit" className="btn btn-primary">{t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}