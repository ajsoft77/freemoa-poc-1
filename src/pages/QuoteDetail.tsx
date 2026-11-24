import { useEffect, useMemo, useState } from 'react';
import { Badge, Empty, Field, Icon, STATUS_TONE } from '../components/ui';
import { addDays, alreadySent, availableIn, koreanAmount, latest, lineAmount, periodOf, shortages, totals, versionTotals, won, type Line, type Mail, type Quote, type Version } from '../lib/calc';
import { href, nav } from '../lib/router';
import { convertToOrder, mailDraft, saveQuote, sendMail, setQuoteStatus, STATUS_NAME, useApp, type AppState, type QuoteDraft } from '../store';

const TABS = [
  { id: 'edit', label: '견적 내용' },
  { id: 'doc', label: '견적서' },
  { id: 'mail', label: '메일 발송' },
  { id: 'history', label: '변경 이력' },
];

export function QuoteDetail({ id, tab }: { id: string; tab: string }) {
  const s = useApp();
  const q = s.quotes.find((x) => x.id === id);
  if (!q) return <div className="card">없는 견적입니다. <a className="link" href={href('/quotes')}>견적 목록으로</a></div>;
  const c = s.customers.find((x) => x.id === q.customerId);
  const ver = latest(q);
  const order = s.orders.find((o) => o.quoteId === q.id);
  return (
    <>
      <div className="crumb no-print"><a href={href('/quotes')}>견적</a><Icon name="right" size={14} /><span>{q.no}</span></div>
      <div className="page-head no-print">
        <div>
          <h1>{q.title}</h1>
          <p className="muted"><span className="mono">{q.no}</span> · {c?.name} · v{ver.v} · 담당 {q.owner}</p>
        </div>
        <span data-status={q.status}><Badge tone={STATUS_TONE[q.status]}>{STATUS_NAME[q.status]}</Badge></span>
      </div>
      <Steps q={q} hasOrder={!!order} />
      <div className="tabs no-print">
        {TABS.map((t) => <a key={t.id} className={tab === t.id ? 'on' : ''} href={href(t.id === 'edit' ? `/q/${q.id}` : `/q/${q.id}/${t.id}`)} data-tab={t.id}>{t.label}{t.id === 'history' && <em>{q.history.length}</em>}</a>)}
      </div>
      {tab === 'edit' && <EditTab key={`${q.id}-${ver.v}-${q.status}`} q={q} s={s} />}
      {tab === 'doc' && <DocTab q={q} s={s} />}
      {tab === 'mail' && <MailTab q={q} s={s} />}
      {tab === 'history' && <HistoryTab q={q} />}
    </>
  );
}

function Steps({ q, hasOrder }: { q: Quote; hasOrder: boolean }) {
  const order = ['draft', 'confirmed', 'sent', 'ordered'];
  const at = q.status === 'lost' ? -1 : order.indexOf(q.status);
  const labels = ['작성', '확정', '메일 발송', '주문 전환'];
  return (
    <ol className="steps no-print">
      {labels.map((l, i) => <li key={l} className={i < at || (i === at && (i === 3 ? hasOrder : false)) ? 'done' : i === at ? 'now' : ''}><i>{i < at || (i === 3 && i === at) ? <Icon name="check" size={13} /> : i + 1}</i>{l}</li>)}
      {q.status === 'lost' && <li className="lost"><i><Icon name="x" size={13} /></i>실주</li>}
    </ol>
  );
}

// ── 견적 내용 ─────────────────────────────────────────
function EditTab({ q, s }: { q: Quote; s: AppState }) {
  const ver = latest(q);
  const [d, setD] = useState<QuoteDraft>({ title: q.title, customerId: q.customerId, start: q.start, end: q.end, lines: ver.lines, discount: ver.discount, note: ver.note });
  const [add, setAdd] = useState('');
  const [msg, setMsg] = useState('');
  const [lostOpen, setLostOpen] = useState(false);
  const [reason, setReason] = useState('');
  const locked = q.status === 'ordered' || q.status === 'lost';
  const dirty = JSON.stringify(d) !== JSON.stringify({ title: q.title, customerId: q.customerId, start: q.start, end: q.end, lines: ver.lines, discount: ver.discount, note: ver.note });
  const t = totals(d, d.start, d.end);
  const draftQuote: Quote = { ...q, start: d.start, end: d.end };
  const draftVer: Version = { ...ver, lines: d.lines };
  const short = t.days > 0 ? shortages(draftQuote, draftVer, s.items, s.orders, s.quotes) : [];
  const shortOf = (itemId: string) => short.find((x) => x.itemId === itemId);
  const item = (id: string) => s.items.find((i) => i.id === id);
  const setLine = (i: number, p: Partial<Line>) => setD({ ...d, lines: d.lines.map((l, k) => (k === i ? { ...l, ...p } : l)) });
  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
  const valid = d.title.trim() !== '' && t.days > 0 && d.lines.length > 0 && d.lines.every((l) => l.qty > 0);
  const order = s.orders.find((o) => o.quoteId === q.id);
  useEffect(() => { if (msg) { const h = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(h); } }, [msg]);

  const save = () => {
    const r = saveQuote(q.id, { ...d, title: d.title.trim() });
    setMsg(r.newVersion ? `새 버전(v${ver.v + 1})으로 저장했습니다. 이전 버전은 그대로 남습니다.` : '저장했습니다.');
  };

  return (
    <div className="detail">
      <div className="detail-main">
        {locked && <div className="notice"><Icon name="warn" />{q.status === 'ordered' ? '주문으로 전환된 견적은 수정할 수 없습니다.' : '실주 처리된 견적입니다.'}</div>}
        {!locked && q.status !== 'draft' && <div className="notice blue"><Icon name="clock" />확정·발송된 견적입니다. 수정해 저장하면 <b>새 버전(v{ver.v + 1})</b>이 만들어지고, 다시 확정해야 발송할 수 있습니다.</div>}
        <section className="card">
          <h2>기본 정보</h2>
          <div className="form-grid">
            <Field label="건명"><input className="input" value={d.title} disabled={locked} onChange={(e) => setD({ ...d, title: e.target.value })} data-f="title" /></Field>
            <Field label="고객">
              <select value={d.customerId} disabled={locked} onChange={(e) => setD({ ...d, customerId: e.target.value })}>
                {s.customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.person})</option>)}
              </select>
            </Field>
            <Field label="출고일"><input className="input" type="date" value={d.start} disabled={locked} onChange={(e) => setD({ ...d, start: e.target.value })} data-f="start" /></Field>
            <Field label="회수일" hint={t.days > 0 ? `대여 ${t.days}일` : '회수일이 출고일보다 빠릅니다'}><input className="input" type="date" value={d.end} disabled={locked} onChange={(e) => setD({ ...d, end: e.target.value })} data-f="end" /></Field>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>품목</h2><span className="muted small">금액 = 단가 × 수량 × {t.days}일</span></div>
          {d.lines.length === 0 ? <Empty>아래에서 품목을 추가해 주세요.</Empty> : (
            <div className="table-scroll">
              <table className="table lines">
                <thead><tr><th>품목</th><th className="r">1일 단가</th><th className="r">수량</th><th className="r">가용</th><th className="r">금액</th><th /></tr></thead>
                <tbody>
                  {d.lines.map((l, i) => {
                    const it = item(l.itemId);
                    const sh = shortOf(l.itemId);
                    const avail = it && t.days > 0 ? availableIn(it, d.start, d.end, s.orders, s.quotes, q.id) : null;
                    return (
                      <tr key={l.itemId} className={sh ? 'short' : ''} data-line={l.itemId}>
                        <td><b>{it?.name ?? l.itemId}</b><small className="muted mono">{it?.code}{it && it.price !== l.price ? ` · 기준 단가 ${it.price.toLocaleString()}원` : ''}</small></td>
                        <td className="r"><input className="input num-in" inputMode="numeric" value={l.price} disabled={locked} onChange={(e) => setLine(i, { price: num(e.target.value) })} aria-label="단가" /></td>
                        <td className="r"><input className="input num-in sm" inputMode="numeric" value={l.qty} disabled={locked} onChange={(e) => setLine(i, { qty: num(e.target.value) })} aria-label="수량" data-f="qty" /></td>
                        <td className="r">{avail === null ? '-' : <span className={sh ? 'bad' : 'ok'} data-avail>{avail}{it?.unit}</span>}</td>
                        <td className="r num">{won(lineAmount(l, t.days))}</td>
                        <td>{!locked && <button className="icon-btn" aria-label="품목 삭제" onClick={() => setD({ ...d, lines: d.lines.filter((_, k) => k !== i) })}><Icon name="trash" size={16} /></button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {short.length > 0 && (
            <div className="notice red" data-short>
              <Icon name="warn" />
              <div><b>대여 기간에 수량이 부족합니다.</b>{short.map((x) => <p key={x.itemId}>{item(x.itemId)?.name}: 필요 {x.need} / 가용 {x.available} (다른 주문이 같은 기간에 예약 중)</p>)}</div>
            </div>
          )}
          {!locked && (
            <div className="add-line">
              <select value={add} onChange={(e) => setAdd(e.target.value)} data-f="add-item">
                <option value="">품목 선택…</option>
                {s.items.filter((i) => !d.lines.some((l) => l.itemId === i.id)).map((i) => <option key={i.id} value={i.id}>[{i.cat}] {i.name} · {i.price.toLocaleString()}원/일</option>)}
              </select>
              <button className="btn" disabled={!add} data-act="add-line" onClick={() => { const it = item(add); if (it) setD({ ...d, lines: [...d.lines, { itemId: it.id, qty: 1, price: it.price }] }); setAdd(''); }}><Icon name="plus" />추가</button>
            </div>
          )}
        </section>

        <section className="card">
          <h2>비고</h2>
          <textarea className="input area" rows={3} value={d.note} disabled={locked} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="견적서 하단에 표시됩니다 (설치·철거, 결제 조건 등)" />
        </section>
      </div>

      <aside className="detail-side">
        <section className="card sum">
          <h2>금액</h2>
          <dl>
            <div><dt>품목 합계</dt><dd>{won(t.subtotal)}</dd></div>
            <div><dt>할인</dt><dd><input className="input num-in" inputMode="numeric" value={d.discount} disabled={locked} onChange={(e) => setD({ ...d, discount: num(e.target.value) })} aria-label="할인" data-f="discount" /></dd></div>
            <div><dt>공급가액</dt><dd>{won(t.supply)}</dd></div>
            <div><dt>부가세 (10%)</dt><dd>{won(t.vat)}</dd></div>
            <div className="total"><dt>합계</dt><dd data-total>{won(t.total)}</dd></div>
          </dl>
        </section>
        <section className="card actions">
          {msg && <p className="toast" data-msg>{msg}</p>}
          {!locked && <button className="btn primary block" disabled={!dirty || !valid} onClick={save} data-act="save">{q.status === 'draft' ? '저장' : `새 버전(v${ver.v + 1})으로 저장`}</button>}
          {q.status === 'draft' && <button className="btn dark block" disabled={dirty || !valid} onClick={() => setQuoteStatus(q.id, 'confirmed')} data-act="confirm"><Icon name="check" />견적 확정</button>}
          {q.status === 'draft' && dirty && valid && <p className="muted small">저장한 뒤 확정할 수 있습니다.</p>}
          {q.status === 'draft' && !valid && <p className="muted small">건명, 기간, 품목(수량 1 이상)을 입력해야 합니다.</p>}
          {(q.status === 'confirmed' || q.status === 'sent') && !dirty && (
            <>
              <a className="btn dark block" href={href(`/q/${q.id}/mail`)} data-act="go-mail"><Icon name="send" />{q.status === 'sent' ? '메일 다시 보기' : '견적서 메일 보내기'}</a>
              <button className="btn primary block" onClick={() => { const oid = convertToOrder(q.id); if (oid) nav('/orders', { focus: oid }); }} data-act="to-order"><Icon name="truck" />주문으로 전환</button>
              {q.status === 'confirmed' && <button className="btn block" onClick={() => setQuoteStatus(q.id, 'draft')} data-act="unconfirm">확정 취소</button>}
              {!lostOpen ? <button className="btn block ghost-red" onClick={() => setLostOpen(true)}>실주 처리</button> : (
                <div className="lost-box">
                  <input className="input" placeholder="사유 (예: 일정 취소)" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="row"><button className="btn sm danger" onClick={() => setQuoteStatus(q.id, 'lost', reason.trim())}>실주 확정</button><button className="btn sm" onClick={() => setLostOpen(false)}>취소</button></div>
                </div>
              )}
            </>
          )}
          {order && <a className="btn block" href={href('/orders', { focus: order.id })}><Icon name="orders" />주문 {order.no} 보기</a>}
          <a className="btn block" href={href(`/q/${q.id}/doc`)}><Icon name="quotes" />견적서 미리보기</a>
        </section>
      </aside>
    </div>
  );
}

// ── 견적서 문서 ────────────────────────────────────────
function DocTab({ q, s }: { q: Quote; s: AppState }) {
  const [v, setV] = useState(latest(q).v);
  const ver = q.versions.find((x) => x.v === v) ?? latest(q);
  const isLatest = ver.v === latest(q).v;
  return (
    <>
      <div className="doc-bar no-print">
        <label className="inline">버전
          <select value={ver.v} onChange={(e) => setV(Number(e.target.value))} data-f="doc-version">
            {q.versions.map((x) => <option key={x.v} value={x.v}>v{x.v} · {x.at.slice(0, 10)} {x.by}</option>)}
          </select>
        </label>
        <span className="muted small grow">지정 양식에 견적 데이터가 자동으로 채워집니다. 인쇄 창에서 "PDF로 저장"을 고르면 PDF 파일이 됩니다.</span>
        <button className="btn primary" onClick={() => window.print()} data-act="print"><Icon name="print" />인쇄 · PDF 저장</button>
      </div>
      <div className="sheet-wrap"><Sheet q={q} ver={ver} s={s} draft={isLatest && q.status === 'draft'} old={!isLatest} /></div>
    </>
  );
}

export function Sheet({ q, ver, s, draft, old }: { q: Quote; ver: Version; s: AppState; draft?: boolean; old?: boolean }) {
  const c = s.customers.find((x) => x.id === q.customerId);
  const t = versionTotals(q, ver);
  const period = periodOf(q, ver);
  const issued = ver.at.slice(0, 10);
  return (
    <article className="sheet" data-sheet>
      {(draft || old) && <div className="watermark">{draft ? '미확정' : '이전 버전'}</div>}
      <header className="sheet-head">
        <h1>견 적 서</h1>
        <dl><div><dt>견적번호</dt><dd className="mono">{q.no} (v{ver.v})</dd></div><div><dt>발행일</dt><dd>{issued}</dd></div><div><dt>유효기간</dt><dd>{addDays(issued, 14)} 까지</dd></div></dl>
      </header>
      <div className="sheet-parties">
        <div className="to">
          <p className="big"><b>{c?.name}</b> 귀중</p>
          <p>{c?.person}</p>
          <p className="muted">아래와 같이 견적합니다.</p>
          <table className="kv"><tbody>
            <tr><th>건명</th><td>{q.title}</td></tr>
            <tr><th>대여 기간</th><td>{period.start} ~ {period.end} ({t.days}일)</td></tr>
            <tr><th>합계 금액</th><td><b>일금 {koreanAmount(t.total)}원정</b> (₩{t.total.toLocaleString('ko-KR')}, 부가세 포함)</td></tr>
          </tbody></table>
        </div>
        <div className="from">
          <table className="kv"><tbody>
            <tr><th>상호</th><td>(주)예시렌탈 <span className="seal" aria-label="직인">예시<br />렌탈</span></td></tr>
            <tr><th>등록번호</th><td>000-00-00000</td></tr>
            <tr><th>대표</th><td>김대표</td></tr>
            <tr><th>주소</th><td>○○시 ○○구 예시로 1</td></tr>
            <tr><th>담당</th><td>{ver.by}</td></tr>
          </tbody></table>
        </div>
      </div>
      <table className="sheet-table">
        <thead><tr><th>No</th><th>품목</th><th>단위</th><th>수량</th><th>일수</th><th>1일 단가</th><th>금액</th></tr></thead>
        <tbody>
          {ver.lines.map((l, i) => { const it = s.items.find((x) => x.id === l.itemId); return (
            <tr key={l.itemId}><td>{i + 1}</td><td className="l">{it?.name ?? l.itemId}</td><td>{it?.unit}</td><td>{l.qty}</td><td>{t.days}</td><td className="r">{l.price.toLocaleString('ko-KR')}</td><td className="r">{lineAmount(l, t.days).toLocaleString('ko-KR')}</td></tr>
          ); })}
          {ver.lines.length === 0 && <tr><td colSpan={7}>품목이 없습니다.</td></tr>}
        </tbody>
        <tfoot>
          {t.discount > 0 && <tr><th colSpan={6}>할인</th><td className="r">−{t.discount.toLocaleString('ko-KR')}</td></tr>}
          <tr><th colSpan={6}>공급가액</th><td className="r">{t.supply.toLocaleString('ko-KR')}</td></tr>
          <tr><th colSpan={6}>부가세</th><td className="r">{t.vat.toLocaleString('ko-KR')}</td></tr>
          <tr className="grand"><th colSpan={6}>합계</th><td className="r" data-sheet-total>{t.total.toLocaleString('ko-KR')}</td></tr>
        </tfoot>
      </table>
      <div className="sheet-note"><b>비고</b><p>{ver.note || '없음'}</p><p className="muted">· 본 견적은 발행일로부터 14일간 유효합니다. · 대여 일수는 출고일과 회수일을 포함합니다.</p></div>
    </article>
  );
}

// ── 메일 발송 ─────────────────────────────────────────
function MailTab({ q, s }: { q: Quote; s: AppState }) {
  const ver = latest(q);
  const base = useMemo(() => mailDraft(q, s), [q.id, ver.v, q.customerId, s.me]); // eslint-disable-line react-hooks/exhaustive-deps
  const [to, setTo] = useState(base.to);
  const [subject, setSubject] = useState(base.subject);
  const [body, setBody] = useState(base.body);
  const [checked, setChecked] = useState(false);
  const [fail, setFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: string; text: string } | null>(null);
  useEffect(() => { setTo(base.to); setSubject(base.subject); setBody(base.body); setChecked(false); }, [base]);
  const dup = alreadySent(s.mails, q.id, ver.v, to);
  const mails = s.mails.filter((m) => m.quoteId === q.id);
  const blocked = q.status === 'draft';

  const send = async (force: boolean, retry?: Mail) => {
    setBusy(true); setResult(null);
    const r = await sendMail(q.id, retry ? { to: retry.to, subject: retry.subject, body: retry.body || body, file: retry.file, simulateFail: false, force: true, retryOf: retry.id } : { to, subject, body, file: base.file, simulateFail: fail, force });
    setBusy(false); setChecked(false);
    if (r.ok) setResult({ tone: 'ok', text: `${r.mail?.to} 로 발송했습니다. 발송 이력에 기록되었습니다.` });
    else if (r.reason === 'duplicate') setResult({ tone: 'warn', text: '같은 버전을 같은 수신자에게 이미 보냈습니다.' });
    else if (r.reason === 'bad-address') setResult({ tone: 'bad', text: '수신자 메일 주소 형식을 확인해 주세요.' });
    else if (r.reason === 'not-confirmed') setResult({ tone: 'bad', text: '확정된 견적만 발송할 수 있습니다.' });
    else setResult({ tone: 'bad', text: '발송에 실패했습니다. 아래 이력에서 다시 시도할 수 있습니다.' });
  };

  return (
    <div className="detail">
      <div className="detail-main">
        {blocked && <div className="notice" data-mail-blocked><Icon name="warn" />작성 중인 견적은 발송할 수 없습니다. 견적 내용 탭에서 먼저 확정해 주세요.</div>}
        <section className="card">
          <div className="card-head"><h2>메일 작성</h2><span className="muted small">수신자·제목·본문·첨부가 견적 데이터로 자동 구성됩니다</span></div>
          <div className="form">
            <Field label="받는 사람"><input className="input" value={to} onChange={(e) => setTo(e.target.value)} data-f="mail-to" /></Field>
            <Field label="제목"><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
            <Field label="본문"><textarea className="input area" rows={11} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
            <div className="attach"><Icon name="clip" /><span className="grow"><b>{base.file}</b><small className="muted">견적서 v{ver.v} · 발송 시점의 내용으로 생성</small></span><a className="link" href={href(`/q/${q.id}/doc`)}>미리보기</a></div>
          </div>
        </section>
      </div>
      <aside className="detail-side">
        <section className="card actions">
          <h2>담당자 확인 후 발송</h2>
          {dup && <div className="notice amber" data-dup><Icon name="warn" /><div><b>이미 발송한 메일입니다.</b><p>{dup.at} · {dup.by} · v{dup.v}</p><p>중복 발송을 막기 위해 기본 발송 버튼을 잠갔습니다.</p></div></div>}
          <label className="check"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} data-f="mail-check" /><span>받는 사람과 첨부 견적서를 확인했습니다</span></label>
          <label className="check demo"><input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} data-f="mail-fail" /><span>발송 실패 상황 재현 <em>(시연용)</em></span></label>
          {!dup ? (
            <button className="btn primary block" disabled={blocked || !checked || busy} onClick={() => send(false)} data-act="send"><Icon name="send" />{busy ? '발송 중…' : '발송'}</button>
          ) : (
            <button className="btn block" disabled={blocked || !checked || busy} onClick={() => send(true)} data-act="resend"><Icon name="send" />{busy ? '발송 중…' : '그래도 다시 보내기'}</button>
          )}
          {result && <p className={`toast ${result.tone}`} data-mail-result={result.tone}>{result.text}</p>}
          <p className="muted small">실제 구축 시에는 Gmail 계정 인증 후 발송하며, 여기서는 발송 과정만 흉내 냅니다.</p>
        </section>
        <section className="card">
          <h2>이 견적의 발송 이력</h2>
          {mails.length === 0 ? <p className="muted">발송 이력이 없습니다.</p> : (
            <ul className="mail-log">
              {mails.map((m) => (
                <li key={m.id} data-mail={m.status}>
                  <div className="row"><Badge tone={m.status === 'sent' ? 'green' : 'red'}>{m.status === 'sent' ? '발송 성공' : '발송 실패'}</Badge><span className="muted small">v{m.v} · 시도 {m.tries}회</span></div>
                  <p>{m.to}</p>
                  <p className="muted small">{m.at} · {m.by}{m.error ? ` · ${m.error}` : ''}</p>
                  {m.status === 'failed' && <button className="btn sm" disabled={busy} onClick={() => send(true, m)} data-act="retry"><Icon name="redo" size={14} />재시도</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

// ── 변경 이력 ─────────────────────────────────────────
function HistoryTab({ q }: { q: Quote }) {
  return (
    <div className="detail">
      <div className="detail-main">
        <section className="card">
          <h2>변경 이력</h2>
          <ol className="timeline">
            {[...q.history].reverse().map((h, i) => <li key={i}><span className="dot" /><div><p>{h.text}</p><small className="muted">{h.at} · {h.by}</small></div></li>)}
          </ol>
        </section>
      </div>
      <aside className="detail-side">
        <section className="card">
          <h2>버전</h2>
          <ul className="versions">
            {[...q.versions].reverse().map((v) => (
              <li key={v.v} data-version={v.v}>
                <div className="row"><b>v{v.v}</b>{v.v === latest(q).v && <Badge tone="blue">현재</Badge>}<span className="grow" /><span className="num">{won(versionTotals(q, v).total)}</span></div>
                <small className="muted">{v.at} · {v.by} · 품목 {v.lines.length}종</small>
                {v.note && <small className="muted">{v.note}</small>}
              </li>
            ))}
          </ul>
          <p className="muted small">버전마다 당시의 품목·단가·기간이 그대로 남습니다. 이전 버전의 견적서는 견적서 탭에서 다시 볼 수 있습니다.</p>
        </section>
      </aside>
    </div>
  );
}
