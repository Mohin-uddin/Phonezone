import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Wholesale() {
  const { user } = useAuth();
  const [view, setView] = useState('list'); // list | new | detail
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', shop_id: '',
    discount: '0', paid_amount: '0', payment_method: 'cash', notes: ''
  });
  const [cartItems, setCartItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');

  // Return modal
  const [returnModal, setReturnModal] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    loadOrders();
    api.get('/shops').then(r => {
      setShops(r.data);
      if (r.data.length > 0) setForm(f => ({ ...f, shop_id: r.data[0].id }));
    });
  }, []);

  useEffect(() => {
    if (form.shop_id) {
      api.get('/products', { params: { shop_id: form.shop_id } })
        .then(r => setProducts(r.data));
    }
  }, [form.shop_id]);

  useEffect(() => {
    if (!productSearch) { setFilteredProducts([]); return; }
    setFilteredProducts(products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.stock > 0
    ));
  }, [productSearch, products]);

  async function loadOrders() {
    setLoading(true);
    const r = await api.get('/wholesale', { params: { status: statusFilter || undefined } });
    setOrders(r.data);
    setLoading(false);
  }

  useEffect(() => { loadOrders(); }, [statusFilter]);

  function addToCart(product) {
    const existing = cartItems.find(i => i.product_id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) { toast.error('Stock insufficient'); return; }
      setCartItems(c => c.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCartItems(c => [...c, {
        product_id: product.id, product_name: product.name,
        unit_price: Number(product.sell_price), qty: 1,
        stock: product.stock, cost_price: Number(product.cost_price)
      }]);
    }
    setProductSearch('');
    setFilteredProducts([]);
  }

  function removeFromCart(product_id) {
    setCartItems(c => c.filter(i => i.product_id !== product_id));
  }

  function updateCartQty(product_id, qty) {
    const item = cartItems.find(i => i.product_id === product_id);
    if (qty > item.stock) { toast.error('Stock insufficient'); return; }
    if (qty < 1) { removeFromCart(product_id); return; }
    setCartItems(c => c.map(i => i.product_id === product_id ? { ...i, qty } : i));
  }

  function updateCartPrice(product_id, price) {
    setCartItems(c => c.map(i => i.product_id === product_id ? { ...i, unit_price: Number(price) } : i));
  }

  const subtotal = cartItems.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const grandTotal = Math.max(0, subtotal - Number(form.discount || 0));
  const remaining = Math.max(0, grandTotal - Number(form.paid_amount || 0));
  const payStatus = Number(form.paid_amount) >= grandTotal ? 'full' : Number(form.paid_amount) > 0 ? 'half' : 'pending';

  async function handleSubmit(e) {
    e.preventDefault();
    if (cartItems.length === 0) { toast.error('Add at least one product'); return; }
    try {
      const r = await api.post('/wholesale', {
        ...form, items: cartItems, discount: Number(form.discount),
        paid_amount: Number(form.paid_amount)
      });
      toast.success(`Order ${r.data.order_no} created!`);
      setView('list');
      setCartItems([]);
      setForm(f => ({ ...f, customer_name: '', customer_phone: '', discount: '0', paid_amount: '0', notes: '' }));
      loadOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  }

  async function loadDetail(id) {
    const r = await api.get(`/wholesale/${id}`);
    setSelectedOrder(r.data);
    setView('detail');
  }

  async function handlePayment(e) {
    e.preventDefault();
    try {
      await api.post(`/wholesale/${selectedOrder.id}/payments`, {
        amount: Number(payAmount), payment_method: payMethod
      });
      toast.success('Payment recorded!');
      setPayModal(false);
      setPayAmount('');
      loadDetail(selectedOrder.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  }

  async function handleReturn(e) {
    e.preventDefault();
    try {
      const r = await api.post(`/wholesale/${selectedOrder.id}/returns`, {
        item_id: returnModal.id, returned_qty: Number(returnQty), reason: returnReason
      });
      toast.success(`Refund: € ${r.data.refund_amount}`);
      setReturnModal(null);
      setReturnQty(1);
      setReturnReason('');
      loadDetail(selectedOrder.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  }

  const statusColor = { full: 'badge-green', half: 'badge-yellow', pending: 'badge-red' };
  const statusLabel = { full: '✅ Full Paid', half: '⏳ Half Paid', pending: '❌ Pending' };
  const paymentMethods = [
    { v: 'cash', l: 'Cash' }, { v: 'card', l: 'Card' },
    { v: 'bkash', l: 'bKash' }, { v: 'nagad', l: 'Nagad' }
  ];

  // ── LIST VIEW ──
  if (view === 'list') return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>🏭 Wholesale Orders</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setView('new')}>
          <i className="ti ti-plus" /> New Wholesale Order
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        {['', 'pending', 'half', 'full'].map(s => (
          <button key={s} className={`filter-tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === '' ? 'All' : statusLabel[s]}
          </button>
        ))}
      </div>

      {loading ? <div className="empty-state">Loading...</div> :
       orders.length === 0 ? <div className="empty-state"><i className="ti ti-package-off" />No orders</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(o => (
            <div key={o.id} className="card" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => loadDetail(o.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{o.order_no}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    👤 {o.customer_name} · 📞 {o.customer_phone}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    🏪 {o.shop_name} · {new Date(o.created_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent2)', fontSize: 15 }}>€ {Number(o.grand_total).toLocaleString()}</div>
                  <span className={`badge ${statusColor[o.payment_status]}`} style={{ marginTop: 4, display: 'inline-block' }}>
                    {statusLabel[o.payment_status]}
                  </span>
                  {Number(o.remaining_amount) > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>
                      Remaining: € {Number(o.remaining_amount).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── NEW ORDER VIEW ──
  if (view === 'new') return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setView('list')}>← Back</button>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>New Wholesale Order</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Customer Info</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input className="form-control" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} required />
              </div>
            </div>
            {user?.role === 'admin' && (
              <div className="form-group">
                <label className="form-label">Shop</label>
                <select className="form-control" value={form.shop_id} onChange={e => setForm(f => ({ ...f, shop_id: e.target.value }))}>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Add Products</div>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                placeholder="🔍 Search product to add..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
              {filteredProducts.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => addToCart(p)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Stock: {p.stock}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>€ {Number(p.sell_price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <table className="table" style={{ marginTop: '1rem' }}>
                <thead>
                  <tr><th>Product</th><th>Unit Price €</th><th>Qty</th><th>Total</th><th></th></tr>
                </thead>
                <tbody>
                  {cartItems.map(item => (
                    <tr key={item.product_id}>
                      <td style={{ fontSize: 12 }}>{item.product_name}</td>
                      <td>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={e => updateCartPrice(item.product_id, e.target.value)}
                          style={{ width: 80, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)' }}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => updateCartQty(item.product_id, item.qty - 1)}>-</button>
                          <span style={{ minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => updateCartQty(item.product_id, item.qty + 1)}>+</button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent2)' }}>€ {(item.unit_price * item.qty).toLocaleString()}</td>
                      <td>
                        <button type="button" onClick={() => removeFromCart(item.product_id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Payment</div>
            <div className="form-row3">
              <div className="form-group">
                <label className="form-label">Discount €</label>
                <input className="form-control" type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Advance Paid €</label>
                <input className="form-control" type="number" value={form.paid_amount} onChange={e => setForm(f => ({ ...f, paid_amount: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                  {paymentMethods.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Create Wholesale Order
          </button>
        </form>
      </div>

      {/* Order Summary */}
      <div className="card" style={{ padding: '1.25rem', height: 'fit-content', position: 'sticky', top: 80 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>Order Summary</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Items</span>
            <span>{cartItems.reduce((s, i) => s + i.qty, 0)} pcs</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Subtotal</span>
            <span>€ {subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Discount</span>
            <span style={{ color: 'var(--danger)' }}>- € {Number(form.discount || 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent2)' }}>€ {grandTotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>Advance Paid</span>
            <span style={{ color: 'var(--accent2)' }}>€ {Number(form.paid_amount || 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Remaining</span>
            <span style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--accent2)' }}>€ {remaining.toLocaleString()}</span>
          </div>
          <div style={{ marginTop: 4 }}>
            <span className={`badge ${statusColor[payStatus]}`}>{statusLabel[payStatus]}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── DETAIL VIEW ──
  if (view === 'detail' && selectedOrder) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => { setView('list'); setSelectedOrder(null); }}>← Back</button>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>{selectedOrder.order_no}</h2>
        <span className={`badge ${statusColor[selectedOrder.payment_status]}`}>{statusLabel[selectedOrder.payment_status]}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Customer</div>
          <div style={{ fontWeight: 600 }}>{selectedOrder.customer_name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>📞 {selectedOrder.customer_phone}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>🏪 {selectedOrder.shop_name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(selectedOrder.created_at).toLocaleDateString('it-IT')}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Financials</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--muted)' }}>Total</span>
            <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>€ {Number(selectedOrder.grand_total).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--muted)' }}>Paid</span>
            <span style={{ color: 'var(--accent2)' }}>€ {Number(selectedOrder.paid_amount).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Remaining</span>
            <span style={{ fontWeight: 700, color: Number(selectedOrder.remaining_amount) > 0 ? 'var(--danger)' : 'var(--accent2)' }}>
              € {Number(selectedOrder.remaining_amount).toLocaleString()}
            </span>
          </div>
          {Number(selectedOrder.remaining_amount) > 0 && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={() => setPayModal(true)}>
              + Add Payment
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
          Products
        </div>
        <table className="table">
          <thead><tr><th>Product</th><th>Unit Price</th><th>Qty</th><th>Returned</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {selectedOrder.items?.map(item => (
              <tr key={item.id}>
                <td style={{ fontSize: 12 }}>{item.product_name}</td>
                <td style={{ fontFamily: 'monospace' }}>€ {Number(item.unit_price).toLocaleString()}</td>
                <td>{item.qty}</td>
                <td>
                  {item.returned_qty > 0 ? (
                    <span className="badge badge-red">{item.returned_qty} returned</span>
                  ) : '—'}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--accent2)' }}>€ {Number(item.total_price).toLocaleString()}</td>
                <td>
                  {item.qty > item.returned_qty && (
                    <button className="btn btn-outline btn-sm" onClick={() => { setReturnModal(item); setReturnQty(1); setReturnReason(''); }}>
                      Return
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment History */}
      {selectedOrder.payments?.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Payment History
          </div>
          <table className="table">
            <thead><tr><th>Amount</th><th>Method</th><th>Date</th><th>Note</th></tr></thead>
            <tbody>
              {selectedOrder.payments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent2)' }}>€ {Number(p.amount).toLocaleString()}</td>
                  <td>{p.payment_method}</td>
                  <td style={{ fontSize: 11 }}>{new Date(p.paid_at).toLocaleDateString('it-IT')}</td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{p.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Returns History */}
      {selectedOrder.returns?.length > 0 && (
        <div className="card">
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Return History
          </div>
          <table className="table">
            <thead><tr><th>Product</th><th>Qty</th><th>Refund</th><th>Reason</th><th>Date</th></tr></thead>
            <tbody>
              {selectedOrder.returns.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: 12 }}>{r.product_name}</td>
                  <td>{r.returned_qty}</td>
                  <td style={{ fontWeight: 600, color: 'var(--danger)' }}>€ {Number(r.refund_amount).toLocaleString()}</td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{r.reason || '—'}</td>
                  <td style={{ fontSize: 11 }}>{new Date(r.returned_at).toLocaleDateString('it-IT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 380, padding: '1.5rem' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem' }}>💰 Add Payment</h3>
            <div style={{ marginBottom: '1rem', fontSize: 13 }}>
              Remaining: <strong style={{ color: 'var(--danger)' }}>€ {Number(selectedOrder.remaining_amount).toLocaleString()}</strong>
            </div>
            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label className="form-label">Amount €</label>
                <input className="form-control" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} max={selectedOrder.remaining_amount} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="form-control" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  {paymentMethods.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 380, padding: '1.5rem' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem' }}>↩️ Return Product</h3>
            <div style={{ marginBottom: '1rem', fontSize: 13 }}>
              <strong>{returnModal.product_name}</strong><br />
              <span style={{ color: 'var(--muted)' }}>Max returnable: {returnModal.qty - returnModal.returned_qty}</span><br />
              <span style={{ color: 'var(--muted)' }}>Refund per unit: € {Number(returnModal.unit_price).toLocaleString()}</span>
            </div>
            <form onSubmit={handleReturn}>
              <div className="form-group">
                <label className="form-label">Return Qty</label>
                <input className="form-control" type="number" min={1} max={returnModal.qty - returnModal.returned_qty} value={returnQty} onChange={e => setReturnQty(e.target.value)} required autoFocus />
                {returnQty > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                    Refund: <strong style={{ color: 'var(--danger)' }}>€ {(Number(returnModal.unit_price) * returnQty).toLocaleString()}</strong>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Reason (optional)</label>
                <input className="form-control" value={returnReason} onChange={e => setReturnReason(e.target.value)} placeholder="e.g. Damaged, Wrong model..." />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setReturnModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Return</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}