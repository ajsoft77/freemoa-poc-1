import { useState } from 'react';
import { Badge, dow, Icon, md, STATUS_TONE } from '../components/ui';
import { addDays, dateRange, latest, reservedOn } from '../lib/calc';
import { STAGE_NAME, today, useApp } from '../store';

const SPAN = 14;

export function Stock() {
  const s = useApp();
  const t = today();
  const [from, setFrom] = useState(addDays(t, -1));
  const [cat, setCat] = useState('');
  const days = dateRange(from, addDays(from, SPAN - 1));
  const cats = [...new Set(s.items.map((i) => i.cat))];
  const items = s.items.filter((i) => !cat || i.cat === cat);
  const active = s.orders.filter((o) => o.stage === 'reserved' || o.stage === 'out');

  return (
    <>
      <div className="page-head"><h1>재고·일정</h1><p className="muted">칸의 숫자는 그날 쓸 수 있는 수량입니다 (보유 − 예약·출고 중).</p></div>
      <div className="toolbar">
        <div className="seg">
          <button className={!cat ? 'on' : ''} onClick={() => setCat('')}>전체</button>
          {cats.map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <div className="pager">
          <button className="btn sm" onClick={() => setFrom(addDays(from, -7))} aria-label="이전 주">‹ 이전</button>
          <button className="btn sm" onClick={() => setFrom(addDays(t, -1))}>오늘</button>
          <button className="btn sm" onClick={() => setFrom(addDays(from, 7))} aria-label="다음 주" data-act="next-week">다음 ›</button>
        </div>
      </div>
      <section className="card flush">
        <div className="table-scroll">
          <table className="cal" data-cal>
            <thead>
              <tr><th className="sticky">품목</th><th className="r">보유</th>{days.map((d) => <th key={d} className={`${d === t ? 'today' : ''} ${dow(d) === '일' ? 'sun' : dow(d) === '토' ? 'sat' : ''}`}>{md(d)}<small>{dow(d)}</small></th>)}</tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} data-item={it.id}>
                  <th className="sticky"><b>{it.name}</b><small className="muted mono">{it.code}</small></th>
                  <td className="r muted">{it.stock}</td>
                  {days.map((d) => {
                    const used = reservedOn(it.id, d, s.orders, s.quotes);
                    const left = it.stock - used;
                    const tone = left < 0 ? 'over' : used === 0 ? '' : left <= it.stock * 0.2 ? 'low' : 'used';
                    return <td key={d} className={`${tone} ${d === t ? 'today' : ''}`} title={`${it.name} ${d}: 보유 ${it.stock}, 예약·출고 ${used}`} data-day={d}>{left}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="legend"><span><i className="used" />일부 예약</span><span><i className="low" />20% 이하 남음</span><span><i className="over" />초과 예약</span></div>
      </section>

      <section className="card">
        <div className="card-head"><h2>예약·출고 중인 주문</h2><span className="muted small">회수 처리하면 재고가 풀립니다</span></div>
        {active.length === 0 ? <p className="muted">예약·출고 중인 주문이 없습니다.</p> : (
          <ul className="sched">
            {active.map((o) => {
              const q = s.quotes.find((x) => x.id === o.quoteId)!;
              const ver = q.versions.find((v) => v.v === o.v) ?? latest(q);
              const c = s.customers.find((x) => x.id === q.customerId);
              return (
                <li key={o.id}>
                  <span className="day"><Icon name="truck" size={16} /></span>
                  <span className="grow"><b>{q.title}</b><small className="muted">{c?.name} · {o.no} · 출고 {md(q.start)} → 회수 {md(q.end)} · 품목 {ver.lines.length}종</small></span>
                  <Badge tone={STATUS_TONE[o.stage]}>{STAGE_NAME[o.stage]}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
