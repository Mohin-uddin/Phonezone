import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeGenerator({ value, width = 280, height = 60, showText = true }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    try {
      JsBarcode(canvasRef.current, value, {
        format: 'CODE128',
        width: 2,
        height: height - (showText ? 20 : 0),
        displayValue: showText,
        fontSize: 12,
        margin: 8,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch (e) {
      console.error('Barcode error:', e);
    }
  }, [value, width, height, showText]);

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
      <canvas ref={canvasRef} width={width} height={height} style={{ borderRadius: 6, background: '#fff' }} />
      <button type="button" className="btn btn-outline btn-sm" onClick={handleDownload}>
        <i className="ti ti-download" /> Download Barcode
      </button>
    </div>
  );
}