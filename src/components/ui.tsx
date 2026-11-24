import { useEffect, type ReactNode } from 'react';

const PATHS: Record<string, string> = {
  dash: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  quotes: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
  orders: 'M4 6h16v12H4zM4 10h16M8 15h3',
  stock: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  mails: 'M3 6h18v12H3zM3 7l9 7 9-7',
  customers: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.500 10a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.870M15 3.130a3.500 3.500 0 0 1 0 6.740',
  items: 'M4 5h16M4 12h16M4 19h16',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.200l2-1.500-2-3.400-2.300.900a7 7 0 0 0-2-1.200L14.200 3h-4.400l-.4 2.600a7 7 0 0 0-2 1.200l-2.300-.900-2 3.400 2 1.500a7 7 0 0 0 0 2.400l-2 1.500 2 3.400 2.300-.900a7 7 0 0 0 2 1.200l.4 2.600h4.400l.4-2.600a7 7 0 0 0 2-1.200l2.300.900 2-3.400-2-1.500c.1-.4.1-.8.1-1.200z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  warn: 'M12 3l10 18H2zM12 10v5M12 18v.500',
  print: 'M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  send: 'M21 3L3 10l7 3 3 7zM10 13l5-5',
  clip: 'M20 11l-8.500 8.500a5 5 0 0 1-7-7L13 4a3.500 3.500 0 0 1 5 5l-8.500 8.500a2 2 0 0 1-3-3L14 7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  right: 'M9 5l7 7-7 7',
  truck: 'M2 6h11v10H2zM13 9h5l3 3v4h-8M6.500 19a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3M17 19a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  down: 'M12 4v12M6 11l6 6 6-6M4 20h16',
  up: 'M12 20V8M6 13l6-6 6 6M4 4h16',
  redo: 'M20 11a8 8 0 1 0-2.300 5.700M20 4v7h-7',
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export const STATUS_TONE: Record<string, string> = {
  draft: 'gray', confirmed: 'blue', sent: 'teal', ordered: 'green', lost: 'red',
  unpaid: 'red', deposit: 'amber', paid: 'green',
  reserved: 'blue', out: 'amber', returned: 'teal', done: 'gray',
  failed: 'red',
};

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export const dow = (d: string) => DOW[new Date(`${d}T00:00:00Z`).getUTCDay()];
