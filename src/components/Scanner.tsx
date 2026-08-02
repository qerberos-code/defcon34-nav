import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface Props { onScan: (value: string) => void; onClose: () => void }
type Detector = { detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

export function Scanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stream: MediaStream | undefined; let timer = 0; let stopped = false; let last = '';
    const scan = async () => {
      const video = videoRef.current; if (!video || stopped || video.readyState < 2) return;
      try {
        let value = '';
        const Barcode = (window as typeof window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (Barcode) value = (await new Barcode({ formats: ['qr_code'] }).detect(video))[0]?.rawValue ?? '';
        else {
          const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          const context = canvas.getContext('2d', { willReadFrequently: true }); context?.drawImage(video, 0, 0);
          if (context) value = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data ?? '';
        }
        if (value && value !== last) { last = value; onScan(value); }
      } catch { /* individual frames can fail */ }
    };
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } }).then((media) => { stream = media; if (videoRef.current) { videoRef.current.srcObject = media; void videoRef.current.play(); timer = window.setInterval(scan, 450); } }).catch(() => setError('Camera access is unavailable. Choose a checkpoint manually instead.'));
    return () => { stopped = true; window.clearInterval(timer); stream?.getTracks().forEach((track) => track.stop()); };
  }, [onScan]);
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Scan checkpoint QR code"><div className="scanner-card"><div className="section-heading"><div><p className="eyebrow">Checkpoint scanner</p><h2>Point at the QR sign</h2></div><button className="icon-button" onClick={onClose} aria-label="Close scanner">×</button></div>{error ? <div className="notice error">{error}</div> : <><video ref={videoRef} playsInline muted /><p className="muted">Hold the code inside the camera view. It will scan automatically.</p></>}</div></div>;
}
