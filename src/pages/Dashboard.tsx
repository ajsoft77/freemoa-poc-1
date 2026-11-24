import { Badge, Icon, md, STATUS_TONE } from '../components/ui';
import { latest, shortages, totals, won } from '../lib/calc';
import { href } from '../lib/router';
import { can, PAY_NAME, STAGE_NAME, STATUS_NAME, today, useApp } from '../store';

export function Dashboard() {
  const s = useApp();
  const t = today();
  const count = (st: string) => s.quotes.filter((q) => q.status === st).length;
  const quoteOf = (id: string) => s.quotes.find((q) => q.id === id)!;
  const cust = (id: string) => s.customers.find((c) => c.id === id)?.name ?? '-';
  const open = s.orders.filter((o) => o.stage !== 'done');
  const unpaid = open.filter((o) => o.pay !== 'paid');
  const unpaidSum = unpaid.reduce((sum, o) => { const q = quoteOf(o.quoteId); return sum + totals(q.versions.find((v) => v.v === o.v) ?? latest(q), q.start, q.end).total; }, 0);
  const failed = s.mails.filter((m) => m.status === 'failed');
  const todo = s.quotes.filter((q) => q.status === 'draft' || q.status === 'confirmed' || q.status === 'sent');
  const short = todo.filter((q) => shortages(q, latest(q), s.items, s.orders, s.quotes).length > 0);

  const outs = s.orders.filter((o) => o.stage === 'reserved').map((o) => ({ o, q: quoteOf(o.quoteId), kind: '출고', day: quoteOf(o.quoteId).start }));
  const ins = s.orders.filter((o) => o.stage === 'out').map((o) => ({ o, q: quoteOf(o.quoteId), kind: '회수', day: quoteOf(o.quoteId).end }));
  const schedule = [...outs, ...ins].sort((a, b) => a.day.localeCompare(b.day)).slice(0, 6);

  return (
    <>
      <div className="page-head"><h1>대시보드</h1><p className="muted">오늘 {t} 기준</p></div>
      <div className="stats">
        <a className="stat" href={href('/quotes', { status: 'draft' })}><span>작성 중 견적</span><b>{count('draft')}</b></a>
        <a className="stat" href={href('/quotes', { status: 'confirmed' })}><span>확정 · 발송 대기</span><b>{count('confirmed')}</b></a>
        <a className="stat" href={href('/quotes', { status: 'sent' })}><span>발송 완료 · 회신 대기</span><b>{count('sent')}</b></a>
        <a className="stat" href={href('/orders')}><span>진행 중 주문</span><b>{open.length}</b></a>
        <a className="stat warn" href={href('/orders')}><span>미수금 ({unpaid.length}건)</span><b>{won(unpaidSum)}</b></a>
      </div>

      {(short.length > 0 || failed.length > 0) && (
        <div className="alerts">
          {short.map((q) => (
            <a key={q.id} className="alert" href={href(`/q/${q.id}`)} data-alert="short"><Icon name="warn" /><span><b>{q.no} {q.title}</b> · 대여 기간에 수량이 부족한 품목이 있습니다</span><Icon name="right" size={16} /></a>
          ))}
          {can('mails', s) && failed.map((m) => (
            <a key={m.id} className="alert red" href={href(`/q/${m.quoteId}/mail`)}><Icon name="mails" /><span><b>메일 발송 실패</b> · {m.subject}</span><Icon name="right" size={16} /></a>
          ))}
        </div>
      )}

      <div className="cols-2">
        <section className="card">
          <div className="card-head"><h2>출고·회수 일정</h2><a className="link" href={href('/stock')}>재고·일정 보기</a></div>
          {schedule.length === 0 ? <p className="muted">예정된 일정이 없습니다.</p> : (
            <ul className="sched">
              {schedule.map(({ o, q, kind, day }) => (
                <li key={o.id + kind}>
                  <span className={`day ${day < t ? 'late' : day === t ? 'today' : ''}`}>{md(day)}<small>{day < t ? '지남' : day === t ? '오늘' : ''}</small></span>
                  <span className="grow"><b>{kind}</b> · {q.title}<small className="muted">{cust(q.customerId)} · {o.no}</small></span>
                  <Badge tone={STATUS_TONE[o.stage]}>{STAGE_NAME[o.stage]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <div className="card-head"><h2>처리할 견적</h2>{can('quotes', s) && <a className="link" href={href('/quotes')}>전체 견적</a>}</div>
          {todo.length === 0 ? <p className="muted">처리할 견적이 없습니다.</p> : (
            <ul className="sched">
              {todo.map((q) => {
                const tt = totals(latest(q), q.start, q.end);
                const row = <><span className="grow"><b>{q.title}</b><small className="muted">{q.no} · {cust(q.customerId)} · {md(q.start)}~{md(q.end)}</small></span><span className="num">{won(tt.total)}</span><Badge tone={STATUS_TONE[q.status]}>{STATUS_NAME[q.status]}</Badge></>;
                return can('quotes', s) ? <li key={q.id}><a className="row-link" href={href(`/q/${q.id}`)}>{row}</a></li> : <li key={q.id}>{row}</li>;
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>진행 중 주문</h2></div>
        <div className="table-scroll">
          <table className="table">
            <thead><tr><th>주문번호</th><th>건명</th><th>고객</th><th>기간</th><th className="r">금액</th><th>입금</th><th>진행</th></tr></thead>
            <tbody>
              {open.map((o) => { const q = quoteOf(o.quoteId); const tt = totals(q.versions.find((v) => v.v === o.v) ?? latest(q), q.start, q.end); return (
                <tr key={o.id}><td className="mono">{o.no}</td><td>{q.title}</td><td>{cust(q.customerId)}</td><td>{md(q.start)}~{md(q.end)}</td><td className="r num">{won(tt.total)}</td><td><Badge tone={STATUS_TONE[o.pay]}>{PAY_NAME[o.pay]}</Badge></td><td><Badge tone={STATUS_TONE[o.stage]}>{STAGE_NAME[o.stage]}</Badge></td></tr>
              ); })}
              {open.length === 0 && <tr><td colSpan={7} className="muted">진행 중인 주문이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
