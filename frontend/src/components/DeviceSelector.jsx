import { useState, useEffect } from 'react';

const DEVICE_DATA = [
  {
    brand: "Apple",
    series: [
      {
        name: "iPhone 6 Series",
        models: ["iPhone 6", "iPhone 6 Plus"]
      },
      {
        name: "iPhone 6s Series",
        models: ["iPhone 6s", "iPhone 6s Plus"]
      },
      {
        name: "iPhone 7 Series",
        models: ["iPhone 7", "iPhone 7 Plus"]
      },
      {
        name: "iPhone 8 Series",
        models: ["iPhone 8", "iPhone 8 Plus"]
      },
      {
        name: "iPhone X Series",
        models: ["iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max"]
      },
      {
        name: "iPhone 11 Series",
        models: ["iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max"]
      },
      {
        name: "iPhone 12 Series",
        models: ["iPhone 12 Mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max"]
      },
      {
        name: "iPhone 13 Series",
        models: ["iPhone 13 Mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max"]
      },
      {
        name: "iPhone 14 Series",
        models: ["iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max"]
      },
      {
        name: "iPhone 15 Series",
        models: ["iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max"]
      },
      {
        name: "iPhone 16 Series",
        models: ["iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone 16e"]
      },
      {
        name: "iPhone 17 Series",
        models: ["iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max", "iPhone Air", "iPhone 17e"]
      },
      {
        name: "iPhone SE Series",
        models: ["iPhone SE (1st Gen, 2016)", "iPhone SE (2nd Gen, 2020)", "iPhone SE (3rd Gen, 2022)"]
      },
    ],
  },
  {
    brand: "Samsung",
    series: [
      {
        name: "Galaxy S Series (2019–2020)",
        models: ["Galaxy S10e", "Galaxy S10", "Galaxy S10+", "Galaxy S10 5G", "Galaxy S20", "Galaxy S20+", "Galaxy S20 Ultra", "Galaxy S20 FE"]
      },
      {
        name: "Galaxy S Series (2021–2022)",
        models: ["Galaxy S21", "Galaxy S21+", "Galaxy S21 Ultra", "Galaxy S21 FE", "Galaxy S22", "Galaxy S22+", "Galaxy S22 Ultra"]
      },
      {
        name: "Galaxy S Series (2023–2024)",
        models: ["Galaxy S23", "Galaxy S23+", "Galaxy S23 Ultra", "Galaxy S23 FE", "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy S24 FE"]
      },
      {
        name: "Galaxy S Series (2025–2026)",
        models: ["Galaxy S25", "Galaxy S25+", "Galaxy S25 Ultra", "Galaxy S25 Slim", "Galaxy S26", "Galaxy S26+", "Galaxy S26 Ultra"]
      },
      {
        name: "Galaxy A Series (2019)",
        models: ["Galaxy A10", "Galaxy A10e", "Galaxy A10s", "Galaxy A20", "Galaxy A20e", "Galaxy A20s", "Galaxy A30", "Galaxy A30s", "Galaxy A40", "Galaxy A50", "Galaxy A50s", "Galaxy A60", "Galaxy A70", "Galaxy A70s", "Galaxy A80", "Galaxy A90 5G"]
      },
      {
        name: "Galaxy A Series (2020)",
        models: ["Galaxy A01", "Galaxy A01 Core", "Galaxy A11", "Galaxy A21", "Galaxy A21s", "Galaxy A31", "Galaxy A41", "Galaxy A51", "Galaxy A51 5G", "Galaxy A71", "Galaxy A71 5G"]
      },
      {
        name: "Galaxy A Series (2021)",
        models: ["Galaxy A02", "Galaxy A02s", "Galaxy A03", "Galaxy A03s", "Galaxy A03 Core", "Galaxy A12", "Galaxy A22", "Galaxy A22 5G", "Galaxy A32", "Galaxy A32 5G", "Galaxy A42 5G", "Galaxy A52", "Galaxy A52 5G", "Galaxy A52s 5G", "Galaxy A72"]
      },
      {
        name: "Galaxy A Series (2022)",
        models: ["Galaxy A04", "Galaxy A04s", "Galaxy A04e", "Galaxy A13", "Galaxy A13 5G", "Galaxy A23", "Galaxy A23 5G", "Galaxy A33 5G", "Galaxy A53 5G", "Galaxy A73 5G"]
      },
      {
        name: "Galaxy A Series (2023)",
        models: ["Galaxy A05", "Galaxy A05s", "Galaxy A14", "Galaxy A14 5G", "Galaxy A24", "Galaxy A34 5G", "Galaxy A54 5G"]
      },
      {
        name: "Galaxy A Series (2024)",
        models: ["Galaxy A06", "Galaxy A15", "Galaxy A15 5G", "Galaxy A25 5G", "Galaxy A35 5G", "Galaxy A55 5G"]
      },
      {
        name: "Galaxy A Series (2025–2026)",
        models: ["Galaxy A16", "Galaxy A16 5G", "Galaxy A26 5G", "Galaxy A36 5G", "Galaxy A56 5G"]
      },
    ],
  },
];

export default function DeviceSelector({ value, onChange, t }) {
  const [brand,  setBrand]  = useState('');
  const [series, setSeries] = useState('');
  const [model,  setModel]  = useState(value || '');

  const brandData  = DEVICE_DATA.find(b => b.brand === brand);
  const seriesData = brandData?.series.find(s => s.name === series);

  useEffect(() => {
    if (value !== model) setModel(value || '');
  }, [value]);

  function handleModel(m) {
    setModel(m);
    onChange(m);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {/* Brand */}
        <div>
          <label className="form-label">{t.selectBrand}</label>
          <select className="form-control" value={brand} onChange={e => {
            setBrand(e.target.value); setSeries(''); setModel(''); onChange('');
          }}>
            <option value="">— {t.selectBrand} —</option>
            {DEVICE_DATA.map(b => <option key={b.brand} value={b.brand}>{b.brand}</option>)}
          </select>
        </div>
        {/* Series */}
        <div>
          <label className="form-label">{t.selectSeries}</label>
          <select className="form-control" value={series} onChange={e => {
            setSeries(e.target.value); setModel(''); onChange('');
          }} disabled={!brand}>
            <option value="">— {t.selectSeries} —</option>
            {brandData?.series.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        {/* Model */}
        <div>
          <label className="form-label">{t.selectModel}</label>
          <select className="form-control" value={model} onChange={e => handleModel(e.target.value)} disabled={!series}>
            <option value="">— {t.selectModel} —</option>
            {seriesData?.models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      {model && (
        <div style={{ fontSize: 12, color: 'var(--accent2)', padding: '4px 10px', background: 'rgba(0,184,148,.08)', borderRadius: 6 }}>
          ✓ {model}
        </div>
      )}
    </div>
  );
}