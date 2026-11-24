import { useState } from 'react';
import { Badge, Empty, Field, Icon, md, Modal, STATUS_TONE } from '../components/ui';
import { addDays, latest, rentalDays, totals, won, type QuoteStatus } from '../lib/calc';
import { href, nav, useRoute } from '../lib/router';
import { createQuote, STATUS_NAME, today, useApp } from '../store';

const FILTERS: (QuoteStatus | '')[] = ['', 'draft', 'confirmed', 'sent', 'ordered', 'lost'];

export function Quotes() {
  const s = useApp();
  const route = useRoute();
  const status = (route.query.get('status') ?? '') as QuoteStatus | '';
  const [kw, setKw] = useState('');
  const [open, setOpen] = useState(false);
  const cust = (id: string) => s.customers.find((c) => c.id === id)?.name ?? '-';
  const words = kw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = s.quotes.filter((q) => (!status || q.status === status) && words.every((w) => `${q.no} ${q.title} ${cust(q.customerId)} ${q.owner}`.toLowerCase().includes(w)));

  return (
    <>
      <div className="page-head">
        <h1>견적</h1>
        <button className="btn primary" data-act="new-quote" onClick={() => setOpen(true)}><Icon name="plus" />새 견적</button>
      </div>
      <div className="toolbar">
        <div className="seg" role="tablist">
          {FILTERS.map((f) => (
            <a key={f || 'all'} className={status === f ? 'on' : ''} href={href('/quotes', { status: f || undefined })}>
              {f ? STATUS_NAME[f] : '전체'} <em>{f ? s.quotes.filter((q) => q.status === f).length : s.quotes.length}</em>
            </a>
          ))}
        </div>
        <input className="input search" placeholder="견적번호·건명·고객 검색" value={kw} onChange={(e) => setKw(e.target.value)} data-act="quote-search" />
      </div>
      <section className="card flush">
        {list.length === 0 ? <Empty>조건에 맞는 견적이 없습니다.</Empty> : (
          <div className="table-scroll">
            <table className="table hover">
              <thead><tr><th>견적번호</th><th>건명</th><th>고객</th><th>대여 기간</th><th className="r">합계(VAT 포함)</th><th>버전</th><th>상태</th><th>담당</th></tr></thead>
              <tbody>
                {list.map((q) => {
                  const ver = latest(q);
                  return (
                    <tr key={q.id} onClick={() => nav(`/q/${q.id}`)} data-quote={q.id}>
                      <td className="mono"><a href={href(`/q/${q.id}`)} onClick={(e) => e.stopPropagation()}>{q.no}</a></td>
                      <td><b>{q.title}</b></td>
                      <td>{cust(q.customerId)}</td>
                      <td>{md(q.start)}~{md(q.end)} <em>{rentalDays(q.start, q.end)}일</em></td>
                      <td className="r num">{won(totals(ver, q.start, q.end).total)}</td>
                      <td>v{ver.v}</td>
                      <td><Badge tone={STATUS_TONE[q.status]}>{STATUS_NAME[q.status]}</Badge></td>
                      <td>{q.owner}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {open && <NewQuote onClose={() => setOpen(false)} />}
    </>
  );
}

function NewQuote({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const t = today();
  const [customerId, setCustomerId] = useState(s.customers[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(addDays(t, 7));
  const [end, setEnd] = useState(addDays(t, 8));
  const days = rentalDays(start, end);
  const ok = customerId && title.trim() && days > 0;
  return (
    <Modal title="새 견적" onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); if (!ok) return; const id = createQuote(customerId, title.trim(), start, end); onClose(); nav(`/q/${id}`); }}>
        <Field label="고객">
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} name="customer">
            {s.customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.person})</option>)}
          </select>
        </Field>
        <Field label="건명"><input className="input" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 12월 송년 행사" autoFocus /></Field>
        <div className="form-2">
          <Field label="출고일"><input className="input" type="date" name="start" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="회수일"><input className="input" type="date" name="end" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <p className={days > 0 ? 'muted small' : 'error small'}>{days > 0 ? `대여 ${days}일 (출고일과 회수일 포함)` : '회수일이 출고일보다 빠릅니다.'}</p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button className="btn primary" disabled={!ok} data-act="create-quote">만들고 품목 입력</button>
        </div>
      </form>
    </Modal>
  );
}
