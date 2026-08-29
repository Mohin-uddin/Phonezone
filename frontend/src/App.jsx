import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout         from './components/layout/Layout';
import LoginPage      from './pages/LoginPage';
import Dashboard      from './pages/Dashboard';
import Products       from './pages/Products';
import SellingInvoice from './pages/SellingInvoice';
import RepairInvoice  from './pages/RepairInvoice';
import { InvoiceHistory } from './pages/OtherPages';
import { Shops }          from './pages/OtherPages';
import { Users }          from './pages/OtherPages';
import Reports     from './pages/Reports';
import StockManager from './pages/StockManager';
import Customers   from './pages/Customers';

function Guard({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index                  element={<Dashboard />} />
        <Route path="products"        element={<Products />} />
        <Route path="selling-invoice" element={<SellingInvoice />} />
        <Route path="repair-invoice"  element={<RepairInvoice />} />
        <Route path="history"         element={<InvoiceHistory />} />
        <Route path="shops"           element={<Shops />} />
        <Route path="users"           element={<Users />} />
        <Route path="reports"   element={<Reports />} />
<Route path="stock"     element={<StockManager />} />
<Route path="customers" element={<Customers />} />
      </Route>
    </Routes>
  );
}
