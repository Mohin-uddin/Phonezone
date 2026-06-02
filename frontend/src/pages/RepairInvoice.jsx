import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import DeviceSelector from '../components/DeviceSelector';
import toast from 'react-hot-toast';

let idCnt = 0;
const newPart = () => ({ _id:++idCnt, product_id:'', part_name:'', unit_price:0, qty:1 });

export default function RepairInvoice() {
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [shops,    setShops]    = useState([]);
  const [products, setProducts] = useState([]);
  const [parts,    setParts]    = useState([newPart()]);
  const [invoice,  setInvoice]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [deviceBrand,  setDeviceBrand]  = useState('');
  const [deviceSeries, setDeviceSeries] = useState('');
  const [form, setForm] = useState({
    customer_name:'', customer_phone:'', shop_id:'',
    device_model:'', imei:'', problem:'',
    labor_fee:0, discount:0,
    delivery_date: new Date(Date.now()+3*86400000).toISOString().split('T')[0],
  });

  useEffect(()=>{ api.get('/shops').then(r=>{ setShops(r.data); if(r.data.length) setForm(f=>({...f,shop_id:r.data[0].id})); }); },[]);
  useEffect(()=>{ if(!form.shop_id) return; api.get('/products',{params:{shop_id:form.shop_id}}).then(r=>setProducts(r.data)); },[form.shop_id]);

  const partsSubtotal = parts.reduce((s,p)=>s+p.unit_price*p.qty,0);
  const grandTotal    = partsSubtotal + Number(form.labor_fee) - Number(form.discount);

  function selectProduct(idx, pid) {
    const p = products.find(x=>x.id==pid);
    setParts(prev=>prev.map((pt,i)=>i===idx?{...pt,product_id:pid,part_name:p?.name||'',unit_price:p?Number(p.sell_price):0}:pt));
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!form.device_model) return toast.error('Select device model');
    setSaving(true);
    try {
      const validParts = parts.filter(p=>p.part_name);
      const { data } = await api.post('/repair-invoices', {
        ...form,
        device_brand:  deviceBrand,
        device_series: deviceSeries,
        parts: validParts.map(p=>({product_id:p.product_id||null,part_name:p.part_name,unit_price:p.unit_price,qty:p.qty})),
      });
      const full = await api.get(`/repair-invoices/${data.id}`);
      setInvoice(full.data); toast.success('Repair invoice generated!');
    } catch(err){ toast.error(err.response?.data?.message||'Error'); }
    finally { setSaving(false); }
  }

  function printInvoice() {
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>Repair ${invoice.invoice_no}</title>
    <style>body{font-family:'Courier New',monospace;font-size:12px;padding:20px;max-width:320px;margin:0 auto;color:#000}
    hr{border:none;border-top:1px dashed #ccc;margin:7px 0}.center{text-align:center}
    table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}td:last-child{text-align:right}
    .total td{font-weight:700;border-top:1px solid #000;padding-top:5px}</style></head><body>
    <div class="center"><div style="font-size:18px;font-weight:700">📱 Phonezone</div>
    <div>${t.phonezoneBranch}</div><div>${invoice.shop_name}</div><div>${invoice.shop_phone||''}</div></div>
    <hr><div style="display:flex;justify-content:space-between;font-size:10.5px">
    <span><b>N°:</b> #${invoice.invoice_no}</span><span><b>Data:</b> ${new Date(invoice.created_at).toLocaleDateString('it-IT')}</span></div>
    <hr><div style="font-size:10px;color:#888">${t.customer.toUpperCase()}</div>
    <table><tr><td>${invoice.customer_name}</td></tr><tr><td>${invoice.customer_phone}</td></tr></table>
    <hr><div style="font-size:10px;color:#888">${t.device.toUpperCase()}</div>
    <table>
      ${invoice.device_brand?`<tr><td>Brand</td><td>${invoice.device_brand}</td></tr>`:''}
      <tr><td>${t.deviceModel}</td><td>${invoice.device_model}</td></tr>
      <tr><td>IMEI</td><td>${invoice.imei||'—'}</td></tr>
      <tr><td>${t.issue}</td><td>${invoice.problem||'—'}</td></tr>
      <tr><td>${t.pickup}</td><td>${invoice.delivery_date?new Date(invoice.delivery_date).toLocaleDateString('it-IT'):'—'}</td></tr>
    </table>
    <hr><div style="font-size:10px;color:#888;margin-bottom:4px">${t.repairBreakdown.toUpperCase()}</div>
    <table>${invoice.parts.map((p,i)=>`<tr><td>${i+1}. ${p.part_name} ×${p.qty}</td><td>€ ${Number(p.total_price).toLocaleString()}</td></tr>`).join('')}
    <tr><td>${t.laborFee}</td><td>€ ${Number(invoice.labor_fee).toLocaleString()}</td></tr>
    <tr><td colspan="2"><hr></td></tr>
    <tr><td>${t.subtotal}</td><td>€ ${(Number(invoice.parts_subtotal)+Number(invoice.labor_fee)).toLocaleString()}</td></tr>
    <tr><td>${t.discount}</td><td>- € ${Number(invoice.discount).toLocaleString()}</td></tr>
    <tr class="total"><td>${t.grandTotal}</td><td>€ ${Number(invoice.grand_total).toLocaleString()}</td></tr></table>
    <hr><div class="center" style="font-size:10px;color:#777">${t.trackRepair}<br><b>#${invoice.invoice_no}</b></div>
    </body></html>`);
    w.document.close(); w.print();
  }

  function handleClear() {
    setForm(f=>({...f,customer_name:'',customer_phone:'',device_model:'',imei:'',problem:'',labor_fee:0,discount:0,
      delivery_date:new Date(Date.now()+3*86400000).toISOString().split('T')[0]}));
    setDeviceBrand(''); setDeviceSeries(''); setParts([newPart()]); setInvoice(null);
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:'1.25rem'}}>
      <form onSubmit={handleGenerate}>
        <div className="section-header"><i className="ti ti-user"/>{t.customer}</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t.customerName}</label><input className="form-control" placeholder="Mario Rossi" value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))} required /></div>
          <div className="form-group"><label className="form-label">{t.mobileNumber}</label><input className="form-control" placeholder="+39 333 0000000" value={form.customer_phone} onChange={e=>setForm(f=>({...f,customer_phone:e.target.value}))} required /></div>
        </div>

        {user?.role==='admin' && (
          <div className="form-group"><label className="form-label">{t.shop}</label>
            <select className="form-control" value={form.shop_id} onChange={e=>setForm(f=>({...f,shop_id:e.target.value}))}>
              {shops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="section-header"><i className="ti ti-device-mobile"/>{t.device}</div>

        {/* 3-step device selector */}
        <div className="form-group">
          <DeviceSelector
            t={t}
            value={form.device_model}
            onChange={model => setForm(f=>({...f,device_model:model}))}
          />
        </div>

        <div className="form-row">
          <div className="form-group"><label className="form-label">{t.imei}</label><input className="form-control" placeholder="15-digit IMEI" value={form.imei} maxLength={15} onChange={e=>setForm(f=>({...f,imei:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">{t.deliveryDate}</label><input className="form-control" type="date" value={form.delivery_date} onChange={e=>setForm(f=>({...f,delivery_date:e.target.value}))}/></div>
        </div>
        <div className="form-group"><label className="form-label">{t.problem}</label><textarea className="form-control" placeholder="Display rotto, danno acqua..." value={form.problem} onChange={e=>setForm(f=>({...f,problem:e.target.value}))}/></div>

        <div className="section-header"><i className="ti ti-tool"/>{t.repairBreakdown}</div>
        {parts.map((part,idx)=>(
          <div key={part._id} className="parts-row">
            <div style={{flex:1}}>
              <select className="form-control" style={{marginBottom:4}} value={part.product_id} onChange={e=>selectProduct(idx,e.target.value)}>
                <option value="">— {t.selectPart} —</option>
                {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input className="form-control" placeholder={t.typePartManually} value={part.part_name}
                onChange={e=>setParts(prev=>prev.map((p,i)=>i===idx?{...p,part_name:e.target.value}:p))}/>
            </div>
            <input className="form-control" type="number" placeholder="€" value={part.unit_price||''} style={{width:90}}
              onChange={e=>setParts(prev=>prev.map((p,i)=>i===idx?{...p,unit_price:+e.target.value}:p))}/>
            <div className="qty-ctrl">
              <button type="button" className="qty-btn" onClick={()=>setParts(prev=>prev.map((p,i)=>i===idx?{...p,qty:Math.max(1,p.qty-1)}:p))}>−</button>
              <span style={{minWidth:22,textAlign:'center'}}>{part.qty}</span>
              <button type="button" className="qty-btn" onClick={()=>setParts(prev=>prev.map((p,i)=>i===idx?{...p,qty:p.qty+1}:p))}>+</button>
            </div>
            <span style={{minWidth:80,textAlign:'right',fontWeight:600,color:'var(--accent2)'}}>€ {(part.unit_price*part.qty).toLocaleString()}</span>
            <button type="button" className="qty-btn" onClick={()=>{ if(parts.length>1) setParts(prev=>prev.filter((_,i)=>i!==idx)); }} style={{borderColor:'var(--danger)',color:'var(--danger)'}}>
              <i className="ti ti-x" style={{fontSize:12}}/>
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={()=>setParts(p=>[...p,newPart()])} style={{marginBottom:'1rem'}}>
          <i className="ti ti-plus"/>{t.addPart}
        </button>

        <div className="form-row">
          <div className="form-group"><label className="form-label">{t.laborFee} (€)</label><input className="form-control" type="number" value={form.labor_fee} min="0" onChange={e=>setForm(f=>({...f,labor_fee:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">{t.discount} (€)</label><input className="form-control" type="number" value={form.discount} min="0" onChange={e=>setForm(f=>({...f,discount:e.target.value}))}/></div>
        </div>

        <div className="summary-box">
          <div className="summary-row"><span>{t.partsSubtotal}</span><span>€ {partsSubtotal.toLocaleString()}</span></div>
          <div className="summary-row"><span>{t.laborFee}</span><span>€ {Number(form.labor_fee).toLocaleString()}</span></div>
          <div className="summary-row"><span>{t.discount}</span><span>- € {Number(form.discount).toLocaleString()}</span></div>
          <div className="summary-row total"><span>{t.grandTotal}</span><span className="amt">€ {grandTotal.toLocaleString()}</span></div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:'1rem',flexWrap:'wrap'}}>
          <button type="submit" className="btn btn-primary" disabled={saving}><i className="ti ti-receipt"/>{saving?t.generatingInvoice:t.generateInvoice}</button>
          {invoice && <button type="button" className="btn btn-success" onClick={printInvoice}><i className="ti ti-printer"/>{t.printInvoice}</button>}
          <button type="button" className="btn btn-outline" onClick={handleClear}><i className="ti ti-trash"/>{t.clear}</button>
        </div>
      </form>

      {/* Preview */}
      <div>
        <div className="section-header"><i className="ti ti-eye"/>{t.invoicePreview}</div>
        {!invoice ? (
          <div className="empty-state"><i className="ti ti-tool"/>{t.fillFormPreview}</div>
        ) : (
          <div style={{background:'#fff',color:'#1a1a2e',borderRadius:10,padding:'1.5rem',fontFamily:"'Courier New',monospace",fontSize:11.5,lineHeight:1.9}}>
            <div style={{textAlign:'center',marginBottom:10}}>
              <div style={{fontSize:16,fontWeight:700}}>📱 Phonezone</div>
              <div style={{fontSize:11}}>{t.phonezoneBranch}</div>
              <div style={{fontSize:11}}>{invoice.shop_name}</div>
              <div style={{fontSize:10,color:'#777'}}>{invoice.shop_phone}</div>
            </div>
            <hr style={{border:'none',borderTop:'1px dashed #ccc',margin:'7px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10.5}}>
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
            <div style={{fontSize:10,color:'#888'}}>{t.device.toUpperCase()}</div>
            <table style={{width:'100%',fontSize:11}}><tbody>
              {invoice.device_brand&&<tr><td style={{color:'#666'}}>Brand</td><td style={{textAlign:'right'}}>{invoice.device_brand}</td></tr>}
              <tr><td style={{color:'#666'}}>{t.deviceModel}</td><td style={{textAlign:'right'}}>{invoice.device_model}</td></tr>
              <tr><td style={{color:'#666'}}>IMEI</td><td style={{textAlign:'right'}}>{invoice.imei||'—'}</td></tr>
              <tr><td style={{color:'#666'}}>{t.issue}</td><td style={{textAlign:'right'}}>{invoice.problem||'—'}</td></tr>
              <tr><td style={{color:'#666'}}>{t.pickup}</td><td style={{textAlign:'right'}}>{invoice.delivery_date?new Date(invoice.delivery_date).toLocaleDateString('it-IT'):'—'}</td></tr>
            </tbody></table>
            <hr style={{border:'none',borderTop:'1px dashed #ccc',margin:'7px 0'}}/>
            <div style={{fontSize:10,color:'#888',marginBottom:4}}>{t.repairBreakdown.toUpperCase()}</div>
            <table style={{width:'100%',fontSize:11}}><tbody>
              {invoice.parts.map((p,i)=><tr key={i}><td>{i+1}. {p.part_name} ×{p.qty}</td><td style={{textAlign:'right'}}>€ {Number(p.total_price).toLocaleString()}</td></tr>)}
              <tr><td>{t.laborFee}</td><td style={{textAlign:'right'}}>€ {Number(invoice.labor_fee).toLocaleString()}</td></tr>
              <tr><td colSpan={2}><hr style={{border:'none',borderTop:'1px dashed #ccc',margin:'4px 0'}}/></td></tr>
              <tr><td>{t.subtotal}</td><td style={{textAlign:'right'}}>€ {(Number(invoice.parts_subtotal)+Number(invoice.labor_fee)).toLocaleString()}</td></tr>
              <tr><td>{t.discount}</td><td style={{textAlign:'right'}}>- € {Number(invoice.discount).toLocaleString()}</td></tr>
              <tr style={{fontWeight:700}}><td>{t.grandTotal}</td><td style={{textAlign:'right'}}>€ {Number(invoice.grand_total).toLocaleString()}</td></tr>
            </tbody></table>
            <hr style={{border:'none',borderTop:'1px dashed #ccc',margin:'7px 0'}}/>
            <div style={{textAlign:'center',fontSize:10,color:'#777'}}>{t.trackRepair}<br/><b>#{invoice.invoice_no}</b></div>
          </div>
        )}
      </div>
    </div>
  );
}
