import { useEffect, useRef } from 'react';

// Simple Code128-like visual barcode generator (pure JS, no library needed)
function generateBarcodePattern(text) {
  // Create a simple deterministic bar pattern from text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  const bars = [];
  // Start bar
  bars.push(3, 1, 1, 1);
  // Encode each char
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) % 128;
    const w1 = (c % 4) + 1;
    const w2 = ((c >> 2) % 4) + 1;
    const w3 = ((c >> 4) % 4) + 1;
    const w4 = ((c >> 6) % 4) + 1;
    bars.push(w1, w2, w3, w4);
  }
  // Stop bar
  bars.push(3, 1, 1, 1, 2);
  return bars;
}

export default function BarcodeGenerator({ value, width = 280, height = 60, showText = true }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bars = generateBarcodePattern(value);
    const totalUnits = bars.reduce((s, b) => s + b, 0);
    const unitW = width / totalUnits;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    let x = 0;
    bars.forEach((w, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
      ctx.fillRect(x, 0, w * unitW, height - (showText ? 14 : 0));
      x += w * unitW;
    });

    if (showText) {
      ctx.fillStyle = '#000';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(value, width / 2, height - 2);
    }
  }, [value, width, height]);

  function handleDownload() {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `barcode-${value}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  if (!value) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ border: '1px solid var(--border)', borderRadius: 6, background: '#fff' }} />
      <button type="button" className="btn btn-outline btn-sm" onClick={handleDownload}>
        <i className="ti ti-download" /> Download Barcode
      </button>
    </div>
  );
}
