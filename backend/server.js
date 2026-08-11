require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { authRouter, shopsRouter, usersRouter, productsRouter, sellingRouter, repairRouter, dashRouter } = require('./routes/index');

const app = express();
app.use(cors({ 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api/auth',             authRouter);
app.use('/api/shops',            shopsRouter);
app.use('/api/users',            usersRouter);
app.use('/api/products',         productsRouter);
app.use('/api/selling-invoices', sellingRouter);
app.use('/api/repair-invoices',  repairRouter);
app.use('/api/dashboard',        dashRouter);
app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Phonezone' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Phonezone backend running on http://localhost:${PORT}`));
