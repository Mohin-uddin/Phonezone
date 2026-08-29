// ─── AUTH ──────────────────────────────────────────────────────────────────
const authRouter = require('express').Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const pool       = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const [rows] = await pool.query(
      `SELECT u.*, s.name AS shop_name, s.location AS shop_location
       FROM users u LEFT JOIN shops s ON u.shop_id = s.id
       WHERE u.email = ? AND u.is_active = 1`, [email]
    );
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
    const user = rows[0];
    if (!await bcrypt.compare(password, user.password))
      return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, role: user.role, shop_id: user.shop_id },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, shop_id: user.shop_id, shop_name: user.shop_name, shop_location: user.shop_location } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

authRouter.get('/me', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.shop_id, s.name AS shop_name
     FROM users u LEFT JOIN shops s ON u.shop_id = s.id WHERE u.id = ?`, [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Not found' });
  res.json(rows[0]);
});

// ─── SHOPS ─────────────────────────────────────────────────────────────────
const shopsRouter = require('express').Router();

shopsRouter.get('/', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM shops WHERE is_active = 1 ORDER BY id');
  res.json(rows);
});

shopsRouter.post('/', auth, adminOnly, async (req, res) => {
  const { name, location, phone } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  const [r] = await pool.query('INSERT INTO shops (name, location, phone) VALUES (?,?,?)', [name, location||'', phone||'']);
  res.status(201).json({ id: r.insertId, name, location, phone });
});

shopsRouter.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, location, phone, is_active } = req.body;
  await pool.query('UPDATE shops SET name=?,location=?,phone=?,is_active=? WHERE id=?', [name, location, phone, is_active??1, req.params.id]);
  res.json({ message: 'Updated' });
});

// ─── USERS ─────────────────────────────────────────────────────────────────
const usersRouter = require('express').Router();

usersRouter.get('/', auth, adminOnly, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.shop_id, u.is_active, s.name AS shop_name
     FROM users u LEFT JOIN shops s ON u.shop_id = s.id ORDER BY u.id`
  );
  res.json(rows);
});

usersRouter.post('/', auth, adminOnly, async (req, res) => {
  const { name, email, password, role, shop_id } = req.body;
  if (!name||!email||!password) return res.status(400).json({ message: 'name, email, password required' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const [r] = await pool.query('INSERT INTO users (name,email,password,role,shop_id) VALUES (?,?,?,?,?)',
      [name, email, hash, role||'manager', shop_id||null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    if (err.code==='ER_DUP_ENTRY') return res.status(409).json({ message: 'Email exists' });
    throw err;
  }
});

usersRouter.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, email, role, shop_id, is_active, password } = req.body;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET name=?,email=?,role=?,shop_id=?,is_active=?,password=? WHERE id=?',
      [name, email, role, shop_id||null, is_active??1, hash, req.params.id]);
  } else {
    await pool.query('UPDATE users SET name=?,email=?,role=?,shop_id=?,is_active=? WHERE id=?',
      [name, email, role, shop_id||null, is_active??1, req.params.id]);
  }
  res.json({ message: 'Updated' });
});

// ─── PRODUCTS ──────────────────────────────────────────────────────────────
const productsRouter = require('express').Router();

function genBarcode(name, id) {
  const prefix = name.substring(0,3).toUpperCase().replace(/[^A-Z]/g,'X');
  return `PZ-${prefix}-${String(id).padStart(4,'0')}`;
}

productsRouter.get('/', auth, async (req, res) => {
  const { shop_id, category, barcode } = req.query;
  let q = `SELECT p.*, s.name AS shop_name FROM products p JOIN shops s ON p.shop_id=s.id WHERE p.is_active=1`;
  const params = [];
  if (req.user.role==='manager') { q+=' AND p.shop_id=?'; params.push(req.user.shop_id); }
  else if (shop_id)              { q+=' AND p.shop_id=?'; params.push(shop_id); }
  if (category) { q+=' AND p.category=?'; params.push(category); }
  if (barcode)  { q+=' AND p.barcode=?';  params.push(barcode); }
  if (req.query.search) { q += ' AND p.name LIKE ?'; params.push(`%${req.query.search}%`); }
  q+=' ORDER BY p.name';
  const [rows] = await pool.query(q, params);
  res.json(rows);
});

productsRouter.post('/', auth, async (req, res) => {
  const { name, category, compatible, cost_price, sell_price, stock, shop_id } = req.body;
  const sid = req.user.role==='manager' ? req.user.shop_id : shop_id;
  if (!name||!category||!sid) return res.status(400).json({ message: 'name, category, shop_id required' });
  const [r] = await pool.query(
    `INSERT INTO products (name,category,compatible,cost_price,sell_price,stock,shop_id) VALUES (?,?,?,?,?,?,?)`,
    [name, category, compatible||'', cost_price||0, sell_price||0, stock||0, sid]
  );
  // Auto-generate barcode
  const barcode = genBarcode(name, r.insertId);
  await pool.query('UPDATE products SET barcode=? WHERE id=?', [barcode, r.insertId]);
  res.status(201).json({ id: r.insertId, barcode });
});

productsRouter.put('/:id', auth, async (req, res) => {
  const { name, category, compatible, cost_price, sell_price, stock, is_active } = req.body;
  await pool.query(
    `UPDATE products SET name=?,category=?,compatible=?,cost_price=?,sell_price=?,stock=?,is_active=? WHERE id=?`,
    [name, category, compatible, cost_price, sell_price, stock, is_active??1, req.params.id]
  );
  res.json({ message: 'Updated' });
});

productsRouter.delete('/:id', auth, adminOnly, async (req, res) => {
  await pool.query('UPDATE products SET is_active=0 WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ─── SELLING INVOICES ──────────────────────────────────────────────────────
const sellingRouter = require('express').Router();

function genSellNo() {
  const d = new Date();
  return `SEL-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(1000+Math.random()*9000)}`;
}

sellingRouter.get('/', auth, async (req, res) => {
  const page=parseInt(req.query.page)||1, limit=parseInt(req.query.limit)||20, offset=(page-1)*limit;
  let where='1=1'; const params=[];
  if (req.user.role==='manager') { where+=' AND si.shop_id=?'; params.push(req.user.shop_id); }
  else if (req.query.shop_id)   { where+=' AND si.shop_id=?'; params.push(req.query.shop_id); }
  const [[{total}]] = await pool.query(`SELECT COUNT(*) AS total FROM selling_invoices si WHERE ${where}`, params);
  const [rows] = await pool.query(
    `SELECT si.*, c.name AS customer_name, c.phone AS customer_phone, s.name AS shop_name
     FROM selling_invoices si JOIN customers c ON si.customer_id=c.id JOIN shops s ON si.shop_id=s.id
     WHERE ${where} ORDER BY si.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]
  );
  res.json({ data: rows, total, page, limit });
});

sellingRouter.get('/:id', auth, async (req, res) => {
  const [[inv]] = await pool.query(
    `SELECT si.*, c.name AS customer_name, c.phone AS customer_phone,
            s.name AS shop_name, s.location AS shop_location, s.phone AS shop_phone
     FROM selling_invoices si JOIN customers c ON si.customer_id=c.id JOIN shops s ON si.shop_id=s.id
     WHERE si.id=?`, [req.params.id]
  );
  if (!inv) return res.status(404).json({ message: 'Not found' });
  const [items] = await pool.query('SELECT * FROM selling_invoice_items WHERE invoice_id=?', [req.params.id]);
  res.json({ ...inv, items });
});

sellingRouter.post('/', auth, async (req, res) => {
  const { customer_name, customer_phone, shop_id, items, discount=0, payment_method='cash' } = req.body;
  if (!customer_name||!customer_phone||!items?.length)
    return res.status(400).json({ message: 'customer_name, customer_phone, items required' });
  const sid = req.user.role==='manager' ? req.user.shop_id : shop_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let [cRows] = await conn.query('SELECT id FROM customers WHERE phone=?', [customer_phone]);
    const customerId = cRows.length ? cRows[0].id :
      (await conn.query('INSERT INTO customers (name,phone) VALUES (?,?)', [customer_name, customer_phone]))[0].insertId;
    const subtotal = items.reduce((s,i)=>s+i.unit_price*i.qty, 0);
    const grandTotal = subtotal - discount;
    const invoiceNo = genSellNo();
    const [ir] = await conn.query(
      `INSERT INTO selling_invoices (invoice_no,customer_id,shop_id,subtotal,discount,grand_total,payment_method,created_by) VALUES (?,?,?,?,?,?,?,?)`,
      [invoiceNo, customerId, sid, subtotal, discount, grandTotal, payment_method, req.user.id]
    );
    for (const item of items) {
      await conn.query(
        `INSERT INTO selling_invoice_items (invoice_id,product_id,product_name,qty,unit_price,total_price) VALUES (?,?,?,?,?,?)`,
        [ir.insertId, item.product_id, item.product_name, item.qty, item.unit_price, item.unit_price*item.qty]
      );
      await conn.query('UPDATE products SET stock=GREATEST(stock-?,0) WHERE id=?', [item.qty, item.product_id]);
    }
    await conn.commit();
    res.status(201).json({ id: ir.insertId, invoice_no: invoiceNo });
  } catch (err) { await conn.rollback(); console.error(err); res.status(500).json({ message: 'Failed' }); }
  finally { conn.release(); }
});

// ─── REPAIR INVOICES ───────────────────────────────────────────────────────
const repairRouter = require('express').Router();

function genRepairNo() {
  const d = new Date();
  return `REP-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(1000+Math.random()*9000)}`;
}

repairRouter.get('/', auth, async (req, res) => {
  const page=parseInt(req.query.page)||1, limit=parseInt(req.query.limit)||20, offset=(page-1)*limit;
  let where='1=1'; const params=[];
  if (req.user.role==='manager') { where+=' AND ri.shop_id=?'; params.push(req.user.shop_id); }
  else if (req.query.shop_id)   { where+=' AND ri.shop_id=?'; params.push(req.query.shop_id); }
  if (req.query.status)         { where+=' AND ri.status=?';  params.push(req.query.status); }
  const [[{total}]] = await pool.query(`SELECT COUNT(*) AS total FROM repair_invoices ri WHERE ${where}`, params);
  const [rows] = await pool.query(
    `SELECT ri.*, c.name AS customer_name, c.phone AS customer_phone, s.name AS shop_name
     FROM repair_invoices ri JOIN customers c ON ri.customer_id=c.id JOIN shops s ON ri.shop_id=s.id
     WHERE ${where} ORDER BY ri.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]
  );
  res.json({ data: rows, total, page, limit });
});

repairRouter.get('/:id', auth, async (req, res) => {
  const [[inv]] = await pool.query(
    `SELECT ri.*, c.name AS customer_name, c.phone AS customer_phone,
            s.name AS shop_name, s.location AS shop_location, s.phone AS shop_phone
     FROM repair_invoices ri JOIN customers c ON ri.customer_id=c.id JOIN shops s ON ri.shop_id=s.id
     WHERE ri.id=?`, [req.params.id]
  );
  if (!inv) return res.status(404).json({ message: 'Not found' });
  const [parts] = await pool.query('SELECT * FROM repair_invoice_parts WHERE invoice_id=?', [req.params.id]);
  res.json({ ...inv, parts });
});

repairRouter.post('/', auth, async (req, res) => {
  const { customer_name, customer_phone, shop_id, device_brand, device_series, device_model, imei, problem, parts=[], labor_fee=0, discount=0, delivery_date } = req.body;
  if (!customer_name||!customer_phone||!device_model) return res.status(400).json({ message: 'customer_name, customer_phone, device_model required' });
  const sid = req.user.role==='manager' ? req.user.shop_id : shop_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let [cRows] = await conn.query('SELECT id FROM customers WHERE phone=?', [customer_phone]);
    const customerId = cRows.length ? cRows[0].id :
      (await conn.query('INSERT INTO customers (name,phone) VALUES (?,?)', [customer_name, customer_phone]))[0].insertId;
    const partsSubtotal = parts.reduce((s,p)=>s+p.unit_price*p.qty, 0);
    const grandTotal = partsSubtotal + Number(labor_fee) - Number(discount);
    const invoiceNo = genRepairNo();
    const [ir] = await conn.query(
      `INSERT INTO repair_invoices (invoice_no,customer_id,shop_id,device_brand,device_series,device_model,imei,problem,parts_subtotal,labor_fee,discount,grand_total,delivery_date,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invoiceNo, customerId, sid, device_brand||null, device_series||null, device_model, imei||null, problem||null, partsSubtotal, labor_fee, discount, grandTotal, delivery_date||null, req.user.id]
    );
    for (const part of parts) {
      await conn.query(
        `INSERT INTO repair_invoice_parts (invoice_id,product_id,part_name,qty,unit_price,total_price) VALUES (?,?,?,?,?,?)`,
        [ir.insertId, part.product_id||null, part.part_name, part.qty, part.unit_price, part.unit_price*part.qty]
      );
      if (part.product_id) await conn.query('UPDATE products SET stock=GREATEST(stock-?,0) WHERE id=?', [part.qty, part.product_id]);
    }
    await conn.commit();
    res.status(201).json({ id: ir.insertId, invoice_no: invoiceNo });
  } catch (err) { await conn.rollback(); console.error(err); res.status(500).json({ message: 'Failed' }); }
  finally { conn.release(); }
});

repairRouter.patch('/:id/status', auth, async (req, res) => {
  const valid = ['pending','in_progress','done','delivered'];
  if (!valid.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
  await pool.query('UPDATE repair_invoices SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ message: 'Updated' });
});

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
const dashRouter = require('express').Router();

dashRouter.get('/', auth, async (req, res) => {
  const isAdmin = req.user.role==='admin';
  const shopId  = req.user.shop_id;
  const sc = isAdmin ? '' : `AND shop_id=${pool.escape(shopId)}`;
  const today = new Date().toISOString().split('T')[0];
  const [[{sr}]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) AS sr FROM selling_invoices WHERE DATE(created_at)=? ${sc}`, [today]);
  const [[{rr}]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) AS rr FROM repair_invoices  WHERE DATE(created_at)=? ${sc}`, [today]);
  const [[{ti}]] = await pool.query(`SELECT (SELECT COUNT(*) FROM selling_invoices WHERE 1=1 ${sc})+(SELECT COUNT(*) FROM repair_invoices WHERE 1=1 ${sc}) AS ti`);
  const [[{pr}]] = await pool.query(`SELECT COUNT(*) AS pr FROM repair_invoices WHERE status IN ('pending','in_progress') ${sc}`);
  const [[{ls}]] = await pool.query(`SELECT COUNT(*) AS ls FROM products WHERE stock<=5 AND is_active=1 ${isAdmin?'':`AND shop_id=${pool.escape(shopId)}`}`);
  let shopStats = [];
  if (isAdmin) {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.location,
              COALESCE(SUM(si.grand_total),0) AS sell_revenue,
              COALESCE(SUM(ri.grand_total),0) AS repair_revenue,
              COUNT(DISTINCT si.id)+COUNT(DISTINCT ri.id) AS invoice_count
       FROM shops s
       LEFT JOIN selling_invoices si ON si.shop_id=s.id AND DATE(si.created_at)=?
       LEFT JOIN repair_invoices  ri ON ri.shop_id=s.id AND DATE(ri.created_at)=?
       GROUP BY s.id`, [today, today]
    );
    shopStats = rows;
  }
  res.json({ today_revenue: Number(sr)+Number(rr), total_invoices: ti, pending_repairs: pr, low_stock: ls, shop_stats: shopStats });
});


// ─── REPORTS / ANALYTICS ───────────────────────────────────────────────────
const reportsRouter = require('express').Router();

reportsRouter.get('/sales', auth, async (req, res) => {
  const { period = 'daily', shop_id } = req.query;
  const isAdmin = req.user.role === 'admin';
  const sid = isAdmin ? (shop_id || null) : req.user.shop_id;
  const sc = sid ? `AND shop_id=${pool.escape(sid)}` : '';

  let groupBy, dateFormat, days;
  if (period === 'daily')   { groupBy = 'DATE(created_at)'; dateFormat = '%Y-%m-%d'; days = 30; }
  if (period === 'weekly')  { groupBy = 'YEARWEEK(created_at,1)'; dateFormat = '%Y-%u'; days = 84; }
  if (period === 'monthly') { groupBy = 'DATE_FORMAT(created_at,"%Y-%m")'; dateFormat = '%Y-%m'; days = 365; }

  const dateFilter = `AND created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;

  const [sellRows] = await pool.query(
    `SELECT ${groupBy} AS period,
            COALESCE(SUM(grand_total),0) AS revenue,
            COALESCE(SUM(grand_total - discount),0) AS net,
            COUNT(*) AS count
     FROM selling_invoices WHERE 1=1 ${sc} ${dateFilter}
     GROUP BY ${groupBy} ORDER BY period DESC`, []
  );

  const [repairRows] = await pool.query(
    `SELECT ${groupBy} AS period,
            COALESCE(SUM(grand_total),0) AS revenue,
            COUNT(*) AS count
     FROM repair_invoices WHERE 1=1 ${sc} ${dateFilter}
     GROUP BY ${groupBy} ORDER BY period DESC`, []
  );

  // Profit calculation (sell revenue - cost)
  const [profitRows] = await pool.query(
    `SELECT ${groupBy} AS period,
            COALESCE(SUM((sii.unit_price - p.cost_price) * sii.qty),0) AS profit
     FROM selling_invoice_items sii
     JOIN selling_invoices si ON sii.invoice_id = si.id
     JOIN products p ON sii.product_id = p.id
     WHERE 1=1 ${sc.replace(/shop_id/g,'si.shop_id')} ${dateFilter.replace(/created_at/g,'si.created_at')}
     GROUP BY ${groupBy.replace(/created_at/g,'si.created_at')} ORDER BY period DESC`, []
  );

  res.json({ selling: sellRows, repair: repairRows, profit: profitRows });
});

reportsRouter.get('/summary', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const sid = isAdmin ? (req.query.shop_id || null) : req.user.shop_id;
  const sc = sid ? `AND shop_id=${pool.escape(sid)}` : '';

  const [[{ total_sell }]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) AS total_sell FROM selling_invoices WHERE 1=1 ${sc}`);
  const [[{ total_repair }]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) AS total_repair FROM repair_invoices WHERE 1=1 ${sc}`);
  const [[{ total_cost }]] = await pool.query(
    `SELECT COALESCE(SUM(sii.unit_price * sii.qty - (p.cost_price * sii.qty)),0) AS total_cost
     FROM selling_invoice_items sii
     JOIN selling_invoices si ON sii.invoice_id=si.id
     JOIN products p ON sii.product_id=p.id
     WHERE 1=1 ${sc.replace(/shop_id/g,'si.shop_id')}`
  );

  const today = new Date().toISOString().split('T')[0];
  const [[{ today_sell }]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) AS today_sell FROM selling_invoices WHERE DATE(created_at)=? ${sc}`, [today]);
  const [[{ today_repair }]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) AS today_repair FROM repair_invoices WHERE DATE(created_at)=? ${sc}`, [today]);

  const thisMonth = today.slice(0, 7);
  const [[{ month_sell }]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) AS month_sell FROM selling_invoices WHERE DATE_FORMAT(created_at,'%Y-%m')=? ${sc}`, [thisMonth]);
  const [[{ month_repair }]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) AS month_repair FROM repair_invoices WHERE DATE_FORMAT(created_at,'%Y-%m')=? ${sc}`, [thisMonth]);

  res.json({
    total_revenue: Number(total_sell) + Number(total_repair),
    total_profit: Number(total_cost),
    today_revenue: Number(today_sell) + Number(today_repair),
    month_revenue: Number(month_sell) + Number(month_repair),
    selling_revenue: Number(total_sell),
    repair_revenue: Number(total_repair),
  });
});

// ─── STOCK ─────────────────────────────────────────────────────────────────
const stockRouter = require('express').Router();

stockRouter.get('/alerts', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const sid = isAdmin ? (req.query.shop_id || null) : req.user.shop_id;
  const sc = sid ? `AND p.shop_id=${pool.escape(sid)}` : '';
  const [rows] = await pool.query(
    `SELECT p.*, s.name AS shop_name FROM products p
     JOIN shops s ON p.shop_id=s.id
     WHERE p.stock<=5 AND p.is_active=1 ${sc}
     ORDER BY p.stock ASC`
  );
  res.json(rows);
});

stockRouter.get('/history/:productId', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT 'sell' AS type, si.created_at, sii.qty, c.name AS customer_name,
            si.invoice_no
     FROM selling_invoice_items sii
     JOIN selling_invoices si ON sii.invoice_id=si.id
     JOIN customers c ON si.customer_id=c.id
     WHERE sii.product_id=?
     UNION ALL
     SELECT 'repair' AS type, ri.created_at, rip.qty, c.name AS customer_name,
            ri.invoice_no
     FROM repair_invoice_parts rip
     JOIN repair_invoices ri ON rip.invoice_id=ri.id
     JOIN customers c ON ri.customer_id=c.id
     WHERE rip.product_id=?
     ORDER BY created_at DESC LIMIT 50`,
    [req.params.productId, req.params.productId]
  );
  res.json(rows);
});

stockRouter.patch('/adjust/:productId', auth, async (req, res) => {
  const { quantity, reason } = req.body;
  if (quantity === undefined) return res.status(400).json({ message: 'quantity required' });
  await pool.query(
    'UPDATE products SET stock=GREATEST(0, stock+?) WHERE id=?',
    [parseInt(quantity), req.params.productId]
  );
  const [[product]] = await pool.query('SELECT stock FROM products WHERE id=?', [req.params.productId]);
  res.json({ message: 'Stock updated', new_stock: product.stock });
});

// ─── CUSTOMERS ─────────────────────────────────────────────────────────────
const customersRouter = require('express').Router();

customersRouter.get('/', auth, async (req, res) => {
  const { search } = req.query;
  let q = `SELECT c.*,
    COUNT(DISTINCT si.id) AS sell_count,
    COUNT(DISTINCT ri.id) AS repair_count,
    COALESCE(SUM(si.grand_total),0) + COALESCE(SUM(ri.grand_total),0) AS total_spent
    FROM customers c
    LEFT JOIN selling_invoices si ON si.customer_id=c.id
    LEFT JOIN repair_invoices ri ON ri.customer_id=c.id
    WHERE 1=1`;
  const params = [];
  if (search) { q += ' AND (c.name LIKE ? OR c.phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  q += ' GROUP BY c.id ORDER BY total_spent DESC';
  const [rows] = await pool.query(q, params);
  res.json(rows);
});

customersRouter.get('/:id/history', auth, async (req, res) => {
  const [sells] = await pool.query(
    `SELECT si.id, si.invoice_no, si.grand_total, si.created_at, 'sell' AS type, s.name AS shop_name
     FROM selling_invoices si JOIN shops s ON si.shop_id=s.id
     WHERE si.customer_id=? ORDER BY si.created_at DESC`, [req.params.id]
  );
  const [repairs] = await pool.query(
    `SELECT ri.id, ri.invoice_no, ri.grand_total, ri.created_at, 'repair' AS type,
            ri.device_model, ri.status, s.name AS shop_name
     FROM repair_invoices ri JOIN shops s ON ri.shop_id=s.id
     WHERE ri.customer_id=? ORDER BY ri.created_at DESC`, [req.params.id]
  );
  const [[customer]] = await pool.query('SELECT * FROM customers WHERE id=?', [req.params.id]);
  res.json({ customer, sells, repairs });
});

module.exports = { authRouter, shopsRouter, usersRouter, productsRouter, sellingRouter, repairRouter, dashRouter, reportsRouter, stockRouter, customersRouter };
