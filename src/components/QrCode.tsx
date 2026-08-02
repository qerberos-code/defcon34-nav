import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrCode({ value, size = 280 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => { let active = true; QRCode.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).then((url) => { if (active) setSrc(url); }); return () => { active = false; }; }, [value, size]);
  return src ? <img className="qr-code" src={src} width={size} height={size} alt="Checkpoint QR code" /> : <div className="qr-placeholder">Generating QR…</div>;
}
