import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const { t, lang, toggleLang } = useLang();
  const [form, setForm] = useState({ email:'', password:'' });

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await login(form.email, form.password);
    if (!res.ok) toast.error(res.message);
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'2.5rem', width:400 }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontSize:48, marginBottom:8 }}>📱</div>
          <h2 style={{ fontSize:24, fontWeight:700, color:'var(--accent)' }}>Phonezone</h2>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>{t.phonezoneBranch}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t.email}</label>
            <input className="form-control" type="email" placeholder="admin@phonezone.com"
              value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t.password}</label>
            <input className="form-control" type="password" placeholder="••••••••"
              value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center', marginTop:8 }}>
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:'1.5rem' }}>
          <button className="lang-btn" onClick={toggleLang} style={{ margin:'0 auto' }}>
            {lang==='en' ? '🇮🇹 Italiano' : '🇬🇧 English'}
          </button>
        </div>
        <p style={{ fontSize:11, color:'var(--muted)', textAlign:'center', marginTop:'1rem' }}>
          admin@phonezone.com / admin123
        </p>
      </div>
    </div>
  );
}
