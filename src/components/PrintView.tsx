import { useEffect, useState } from 'react';
import { loadOrganizer, loadVisitor } from '../lib/storage';
import { makeQrPayload } from '../lib/qr';
import type { NavPack } from '../types';
import { QrCode } from './QrCode';

export function PrintView() {
  const [pack, setPack] = useState<NavPack | null | undefined>(undefined);
  useEffect(() => { void Promise.all([loadOrganizer(), loadVisitor()]).then(([organizer, visitor]) => setPack(organizer ?? visitor?.pack ?? null)).catch(() => setPack(null)); }, []);
  if (pack === undefined) return <main className="print-empty"><p>Loading checkpoint signs…</p></main>;
  if (!pack?.checkpoints.length) return <main className="print-empty"><h1>No checkpoint signs available</h1><a className="button" href="#/organizer">Return to Organizer</a></main>;
  return <main className="print-view"><div className="print-toolbar"><a className="button" href="#/organizer">← Back</a><div><strong>{pack.event.name}</strong><span>{pack.checkpoints.length} checkpoint signs</span></div><button className="button primary" onClick={() => print()}>Print signs</button></div><div className="sign-list">{pack.checkpoints.map((checkpoint) => <article className="checkpoint-sign" key={checkpoint.id}><p className="sign-event">{pack.event.name}</p><h1>{checkpoint.label}</h1><QrCode value={makeQrPayload(pack.event.id, checkpoint.shortCode)} /><div className="human-code"><span>CHECKPOINT</span><strong>{checkpoint.shortCode}</strong></div><p className="scan-instruction">Scan to set your current location</p>{checkpoint.installationNote ? <p className="installation-note">Installation: {checkpoint.installationNote}</p> : null}</article>)}</div></main>;
}
