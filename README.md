# 📱 Phonezone — Shop Management System

React (Vite) + Node.js + MySQL | JWT Auth | Italian/English | Barcode | Multi-Shop

---

## ⚡ Quick Start

### Step 1 — Database
```bash
mysql -u root -p < backend/config/schema.sql
```

### Step 2 — Backend
```bash
cd backend
cp .env.example .env     # password already set to MobileHub@123
npm install
node scripts/seedAdmin.js
npm run dev              # http://localhost:5000
```

### Step 3 — Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

---

## 🔐 Login
- Email: `admin@phonezone.com`
- Password: `admin123`

---

## ✨ Features

| Feature | Details |
|---|---|
| 🌐 Language | Italian / English toggle (sidebar + login) |
| 📱 Device Selector | Brand → Series → Model 3-step dropdown |
| 🔲 Barcode | Auto-generated on product add, downloadable PNG |
| 📷 Barcode Scan | Scan barcode in Selling Invoice → auto-add product |
| 🧾 Selling Invoice | Separate invoice for product sales |
| 🔧 Repair Invoice | Separate invoice for mobile repairs |
| 🏪 Multi-Shop | Admin sees all, Manager sees own shop only |
| 👥 Auth | JWT — Admin + Manager roles |
| 📦 Stock | Auto-reduces on invoice creation |

---

## 🏪 Default Shops
- Phonezone — Main (Milano)
- Phonezone — Nord (Torino)  
- Phonezone — Sud (Napoli)

---

## 🚀 Deploy Note
For production, update `frontend/src/lib/api.js`:
```js
const api = axios.create({ baseURL: 'https://your-backend.com/api' });
```
