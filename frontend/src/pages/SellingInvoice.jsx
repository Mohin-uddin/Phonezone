import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import toast from 'react-hot-toast';

let idCnt = 0;
const newItem = () => ({ _id: ++idCnt, product_id:'', product_name:'', unit_price:0, qty:1 });

export default function SellingInvoice() {
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [shops,    setShops]    = useState([]);
  const [products, setProducts] = useState([]);
  const [items,    setItems]    = useState([newItem()]);
  const [invoice,  setInvoice]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [form, setForm] = useState({
    customer_name:'', customer_phone:'',
    shop_id:'', payment_method:'cash', discount:0,
  });

  useEffect(() => {
    api.get('/shops').then(r => {
      setShops(r.data);
      if (r.data.length) setForm(f => ({ ...f, shop_id: r.data[0].id }));
    });
  }, []);

  // Load products — admin gets all shops, manager gets own shop
  useEffect(() => {
    if (user?.role === 'admin') {
      // fetch all products (no shop filter) or per selected shop
      api.get('/products', { params: form.shop_id ? { shop_id: form.shop_id } : {} })
        .then(r => setProducts(r.data));
    } else {
      api.get('/products').then(r => setProducts(r.data));
    }
  }, [form.shop_id, user]);

  const subtotal   = items.reduce((s,i) => s + i.unit_price * i.qty, 0);
  const grandTotal = subtotal - Number(form.discount);

  function selectProduct(idx, pid) {
    const p = products.find(x => x.id == pid);
    setItems(prev => prev.map((it,i) => i===idx
      ? { ...it, product_id: pid, product_name: p?.name||'', unit_price: p ? Number(p.sell_price) : 0 }
      : it
    ));
  }

  // Barcode scan
  async function handleBarcodeScan(e) {
    if (e.key !== 'Enter' || !barcodeInput.trim()) return;
    try {
      const params = { barcode: barcodeInput.trim() };
      if (form.shop_id) params.shop_id = form.shop_id;
      const res = await api.get('/products', { params });
      const p = res.data[0];
      if (!p) { toast.error('Product not found'); setBarcodeInput(''); return; }
      setItems(prev => {
        const exists = prev.find(it => it.product_id == p.id);
        if (exists) return prev.map(it => it.product_id==p.id ? {...it, qty:it.qty+1} : it);
        const blank = prev.find(it => !it.product_id);
        if (blank) return prev.map(it => it._id===blank._id ? {...it, product_id:p.id, product_name:p.name, unit_price:Number(p.sell_price)} : it);
        return [...prev, {...newItem(), product_id:p.id, product_name:p.name, unit_price:Number(p.sell_price)}];
      });
      toast.success(`✓ ${p.name}`);
      setBarcodeInput('');
    } catch { toast.error('Scan error'); setBarcodeInput(''); }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    const validItems = items.filter(i => i.product_id);
    if (!validItems.length) return toast.error('Add at least one product');
    setSaving(true);
    try {
      const { data } = await api.post('/selling-invoices', {
        ...form,
        items: validItems.map(i => ({
          product_id:   i.product_id,
          product_name: i.product_name,
          unit_price:   i.unit_price,
          qty:          i.qty,
        })),
      });
      const full = await api.get(`/selling-invoices/${data.id}`);
      setInvoice(full.data);
      toast.success('Invoice generated!');
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  }

  function printInvoice() {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${invoice.invoice_no}</title>
    <style>body{font-family:'Courier New',monospace;font-size:12px;padding:20px;max-width:320px;margin:0 auto;color:#000}
    hr{border:none;border-top:1px dashed #ccc;margin:7px 0}.center{text-align:center}
    table{width:100%}td{padding:2px 0;vertical-align:top}td:last-child{text-align:right}
    .total td{font-weight:700;border-top:1px solid #000;padding-top:5px}</style></head><body>
    <div class="center"><div style="font-size:18px;font-weight:700">📱 Phonezone</div>
    <div>${invoice.shop_name}</div><div>${invoice.shop_location||''}</div><div>${invoice.shop_phone||''}</div></div>
    <hr><div style="display:flex;justify-content:space-between;font-size:11px">
    <span><b>N°:</b> #${invoice.invoice_no}</span>
    <span><b>Data:</b> ${new Date(invoice.created_at).toLocaleDateString('it-IT')}</span></div>
    <hr><div style="font-size:10px;color:#888">${t.customer.toUpperCase()}</div>
    <table>
      <tr><td>${invoice.customer_name}</td></tr>
      <tr><td>${invoice.customer_phone}</td></tr>
      <tr><td style="text-transform:capitalize">${invoice.payment_method}</td></tr>
    </table>
    <hr><div style="font-size:10px;color:#888;margin-bottom:4px">${t.itemsSold.toUpperCase()}</div>
    <table>
      ${invoice.items.map((it,i) => `<tr><td>${i+1}. ${it.product_name} ×${it.qty}</td><td>€ ${Number(it.total_price).toLocaleString()}</td></tr>`).join('')}
      <tr><td colspan="2"><hr></td></tr>
      <tr><td>${t.subtotal}</td><td>€ ${Number(invoice.subtotal).toLocaleString()}</td></tr>
      <tr><td>${t.discount}</td><td>- € ${Number(invoice.discount).toLocaleString()}</td></tr>
      <tr class="total"><td>${t.grandTotal}</td><td>€ ${Number(invoice.grand_total).toLocaleString()}</td></tr>
    </table>
    <hr><div class="center" style="font-size:10px;color:#777">${t.thankYou}<br>${t.exchangePolicy}</div>
    </body></html>`);
    w.document.close(); w.print();
  }

  function handleClear() {
    setForm(f => ({ ...f, customer_name:'', customer_phone:'', discount:0, payment_method:'cash' }));
    setItems([newItem()]);
    setInvoice(null);
    setBarcodeInput('');
  }

  const paymentOpts = lang === 'it'
    ? [{v:'contanti',l:'Contanti'},{v:'carta',l:'Carta'},{v:'bkash',l:'bKash'},{v:'nagad',l:'Nagad'}]
    : [{v:'cash',l:'Cash'},{v:'card',l:'Card'},{v:'bkash',l:'bKash'},{v:'nagad',l:'Nagad'}];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:'1.25rem' }}>
      <form onSubmit={handleGenerate}>

        {/* Customer */}
        <div className="section-header"><i className="ti ti-user"/>{t.customerName}</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.customerName}</label>
            <input className="form-control" placeholder="Mario Rossi" value={form.customer_name}
              onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t.mobileNumber}</label>
            <input className="form-control" placeholder="+39 333 0000000" value={form.customer_phone}
              onChange={e=>setForm(f=>({...f,customer_phone:e.target.value}))} required />
          </div>
        </div>

        {/* Shop selector — admin only */}
        {user?.role === 'admin' && (
          <div className="form-group">
            <label className="form-label">{t.shop}</label>
            <select className="form-control" value={form.shop_id}
              onChange={e => setForm(f => ({ ...f, shop_id: e.target.value }))}>
              <option value="">— All Shops —</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* Barcode scanner */}
        <div className="section-header" style={{marginTop:'0.25rem'}}>
          <i className="ti ti-barcode"/>Barcode Scanner
        </div>
        <div className="form-group">
          <label className="form-label">Scan barcode (press Enter after scan)</label>
          <input className="form-control" placeholder="Scan or type barcode..."
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeScan} />
        </div>

        {/* Products */}
        <div className="section-header"><i className="ti ti-package"/>{t.products}</div>
        {items.map((item, idx) => (
          <div key={item._id} className="parts-row">
            <div style={{flex:1}}>
              <select className="form-control" value={item.product_id}
                onChange={e => selectProduct(idx, e.target.value)}>
                <option value="">— {t.selectProduct} —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.shop_name} (€{Number(p.sell_price).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <input className="form-control" type="number" placeholder="€"
              value={item.unit_price||''} style={{width:90}}
              onChange={e => setItems(prev => prev.map((it,i) => i===idx ? {...it,unit_price:+e.target.value} : it))} />
            <div className="qty-ctrl">
              <button type="button" className="qty-btn"
                onClick={() => setItems(prev => prev.map((it,i) => i===idx ? {...it,qty:Math.max(1,it.qty-1)} : it))}>−</button>
              <span style={{minWidth:22,textAlign:'center'}}>{item.qty}</span>
              <button type="button" className="qty-btn"
                onClick={() => setItems(prev => prev.map((it,i) => i===idx ? {...it,qty:it.qty+1} : it))}>+</button>
            </div>
            <span style={{minWidth:80,textAlign:'right',fontWeight:600,color:'var(--accent2)'}}>
              € {(item.unit_price*item.qty).toLocaleString()}
            </span>
            <button type="button" className="qty-btn"
              onClick={() => { if(items.length>1) setItems(prev=>prev.filter((_,i)=>i!==idx)); }}
              style={{borderColor:'var(--danger)',color:'var(--danger)'}}>
              <i className="ti ti-x" style={{fontSize:12}}/>
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm"
          onClick={() => setItems(p => [...p, newItem()])} style={{marginBottom:'1rem'}}>
          <i className="ti ti-plus"/>{t.addItem}
        </button>

        {/* Discount + Payment */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.discount} (€)</label>
            <input className="form-control" type="number" value={form.discount} min="0"
              onChange={e => setForm(f => ({...f,discount:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.paymentMethod}</label>
            <select className="form-control" value={form.payment_method}
              onChange={e => setForm(f => ({...f,payment_method:e.target.value}))}>
              {paymentOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="summary-box">
          <div className="summary-row"><span>{t.subtotal}</span><span>€ {subtotal.toLocaleString()}</span></div>
          <div className="summary-row"><span>{t.discount}</span><span>- € {Number(form.discount).toLocaleString()}</span></div>
          <div className="summary-row total"><span>{t.grandTotal}</span><span className="amt">€ {grandTotal.toLocaleString()}</span></div>
        </div>

        <div style={{display:'flex',gap:8,marginTop:'1rem'}}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <i className="ti ti-receipt"/>{saving ? t.generatingInvoice : t.generateInvoice}
          </button>
          <button type="button" className="btn btn-outline" onClick={handleClear}>
            <i className="ti ti-trash"/>{t.clear}
          </button>
        </div>
      </form>

      {/* Preview */}
      <div>
        <div className="section-header"><i className="ti ti-eye"/>{t.invoicePreview}</div>
        {!invoice ? (
          <div className="empty-state"><i className="ti ti-file-invoice"/>{t.fillFormPreview}</div>
        ) : (
          <>
            <div style={{background:'#fff',color:'#1a1a2e',borderRadius:10,padding:'1.5rem',fontFamily:"'Courier New',monospace",fontSize:12,lineHeight:1.9}}>
              <div style={{textAlign:'center',marginBottom:10}}>
                <div style={{fontSize:17,fontWeight:700}}>📱 Phonezone</div>
                <div style={{fontSize:11}}>{invoice.shop_name}</div>
                <div style={{fontSize:10,color:'#777'}}>{invoice.shop_location} | {invoice.shop_phone}</div>
              </div>
              <hr style={{border:'none',borderTop:'1px dashed #ccc',margin:'7px 0'}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                <span><b>N°:</b> #{invoice.invoice_no}</span>
                <span><b>Data:</b> {new Date(invoice.created_at).toLocaleDateString('it-IT')}</span>
              </div>
              <hr style={{border:'none',borderTop:'1px dashed #ccc',margin:'7px 0'}}/>
              <div style={{fontSize:10,color:'#888'}}>{t.customer.toUpperCase()}</div>
              <table style={{width:'100%',fontSize:11}}><tbody>
                <tr><td style={{color:'#666'}}>Nome</td><td style={{textAlign:'right'}}>{invoice.customer_name}</td></tr>
                <tr><td style={{color:'#666'}}>Tel</td><td style={{textAlign:'right'}}>{invoice.customer_phone}</td></tr>
              </tbody></table>
              <hr style={{border:'none',borderTop:'1px dashed #ccc',margin:'7px 0'}}/>
              <div style={{fontSize:10,color:'#888',marginBottom:4}}>{t.itemsSold.toUpperCase()}</div>
              <table style={{width:'100%',fontSize:11}}><tbody>
                {invoice.items.map((it,i) => (
                  <tr key={i}><td>{i+1}. {it.product_name} ×{it.qty}</td><td style={{textAlign:'right'}}>€ {Number(it.total_price).toLocaleString()}</td></tr>
                ))}
                <tr><td colSpan={2}><hr style={{border:'none',borderTop:'1px dashed #ccc',margin:'4px 0'}}/></td></tr>
                <tr><td>{t.subtotal}</td><td style={{textAlign:'right'}}>€ {Number(invoice.subtotal).toLocaleString()}</td></tr>
                <tr><td>{t.discount}</td><td style={{textAlign:'right'}}>- € {Number(invoice.discount).toLocaleString()}</td></tr>
                <tr style={{fontWeight:700}}><td>{t.grandTotal}</td><td style={{textAlign:'right'}}>€ {Number(invoice.grand_total).toLocaleString()}</td></tr>
              </tbody></table>
              <hr style={{border:'none',borderTop:'1px dashed #ccc',margin:'7px 0'}}/>
              <div style={{textAlign:'center',fontSize:10,color:'#777'}}>{t.thankYou}<br/>{t.exchangePolicy}</div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'center'}}>
              <button className="btn btn-success btn-sm" onClick={printInvoice}>
                <i className="ti ti-printer"/>{t.printInvoice}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}