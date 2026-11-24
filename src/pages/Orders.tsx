import { Badge, Empty, Icon, md, STATUS_TONE } from '../components/ui';
import { latest, versionTotals, won, type PayStatus } from '../lib/calc';
import { href, useRoute } from '../lib/router';
import { can, me, PAY_NAME, setPay, setStage, STAGE_NAME, STAGES, useApp } from '../store';

const NEXT_LABEL = ['', '출고 처리', '회수 처리', '완료 처리'];

export function Orders() {
  const s = useApp();
  const route = useRoute();
  const focus = route.query.get('focus');
  const role = me(s).role;
  const canPay = role !== 'logistics'; // 입금 상태는 영업·관리자만 바꾼다
  return (
    <>
      <div className="page-head"><h1>주문·입금</h1><p className="muted">견적이 확정되어 주문으로 전환되면 재고가 예약되고, 입금과 출고·회수 단계가 이어집니다.</p></div>
      {s.orders.length === 0 ? <section className="card"><Empty>주문이 없습니다. 견적 화면에서 "주문으로 전환"을 누르면 여기에 나타납니다.</Empty></section> : (
        <div className="order-list">
          {s.orders.map((o) => {
            const q = s.quotes.find((x) => x.id === o.quoteId);
            if (!q) return null;
            const ver = q.versions.find((v) => v.v === o.v) ?? latest(q);
            const t = versionTotals(q, ver);
            const c = s.customers.find((x) => x.id === q.customerId);
            const at = STAGES.indexOf(o.stage);
            return (
              <section key={o.id} className={`card order ${focus === o.id ? 'focus' : ''}`} data-order={o.id} data-stage={o.stage} data-pay={o.pay}>
                <div className="order-head">
                  <div>
                    <h2>{q.title}</h2>
                    <p className="muted small"><span className="mono">{o.no}</span> · {c?.name} · {md(q.start)}~{md(q.end)} ({t.days}일) · 견적 {can('quotes', s) ? <a className="link" href={href(`/q/${q.id}`)}>{q.no} v{o.v}</a> : `${q.no} v${o.v}`}</p>
                  </div>
                  <b className="num big">{won(t.total)}</b>
                </div>
                <div className="order-body">
                  <div>
                    <span className="lbl">입금 상태</span>
                    {canPay ? (
                      <div className="seg sm">
                        {(Object.keys(PAY_NAME) as PayStatus[]).map((p) => <button key={p} className={o.pay === p ? `on ${STATUS_TONE[p]}` : ''} onClick={() => setPay(o.id, p)} data-pay-btn={p}>{PAY_NAME[p]}</button>)}
                      </div>
                    ) : <Badge tone={STATUS_TONE[o.pay]}>{PAY_NAME[o.pay]}</Badge>}
                  </div>
                  <div className="grow">
                    <span className="lbl">진행 단계</span>
                    <ol className="stage">
                      {STAGES.map((st, i) => <li key={st} className={i < at ? 'done' : i === at ? 'now' : ''}><i>{i < at ? <Icon name="check" size={12} /> : i + 1}</i>{STAGE_NAME[st]}</li>)}
                    </ol>
                  </div>
                  <div className="order-act">
                    {at < STAGES.length - 1 && <button className="btn primary" onClick={() => setStage(o.id, STAGES[at + 1])} data-act="next-stage"><Icon name="truck" />{NEXT_LABEL[at + 1]}</button>}
                    {at > 0 && <button className="btn sm" onClick={() => setStage(o.id, STAGES[at - 1])}>이전 단계로</button>}
                  </div>
                </div>
                {o.stage === 'reserved' && o.pay === 'unpaid' && <p className="notice amber slim"><Icon name="warn" size={16} />입금 전입니다. 출고 전에 입금 여부를 확인해 주세요.</p>}
                <details>
                  <summary>출고 품목 {ver.lines.length}종</summary>
                  <ul className="pick">{ver.lines.map((l) => { const it = s.items.find((i) => i.id === l.itemId); return <li key={l.itemId}><span className="mono muted">{it?.code}</span><span className="grow">{it?.name}</span><b>{l.qty}{it?.unit}</b></li>; })}</ul>
                </details>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
