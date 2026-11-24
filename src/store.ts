// 앱 상태 + localStorage. 서버가 없는 시안이라 모든 변경은 이 브라우저에만 저장된다.
import { useSyncExternalStore } from 'react';
import { addDays, alreadySent, latest, totals, type Hist, type Item, type Line, type Mail, type Order, type PayStatus, type Quote, type QuoteStatus, type Stage, type Version } from './lib/calc';

export type Role = 'admin' | 'sales' | 'logistics';
export type User = { id: string; name: string; role: Role; email: string };
export type Customer = { id: string; name: string; person: string; email: string; phone: string; memo: string };
export type Audit = { at: string; by: string; area: string; text: string };

export type AppState = {
  v: 1;
  me: string;
  users: User[];
  customers: Customer[];
  items: Item[];
  quotes: Quote[];
  orders: Order[];
  mails: Mail[];
  audit: Audit[];
  seq: number;
};

export const ROLE_NAME: Record<Role, string> = { admin: '관리자', sales: '영업 담당', logistics: '물류 담당' };
/** 역할별로 열 수 있는 메뉴. 관리자만 품목·단가, 사용자·백업을 다룬다. */
export const ROLE_MENUS: Record<Role, string[]> = {
  admin: ['dash', 'quotes', 'orders', 'stock', 'mails', 'customers', 'items', 'settings'],
  sales: ['dash', 'quotes', 'orders', 'stock', 'mails', 'customers'],
  logistics: ['dash', 'orders', 'stock'],
};
export const STATUS_NAME: Record<QuoteStatus, string> = { draft: '작성 중', confirmed: '확정', sent: '발송 완료', ordered: '주문 전환', lost: '실주' };
export const PAY_NAME: Record<PayStatus, string> = { unpaid: '미입금', deposit: '계약금 입금', paid: '완납' };
export const STAGE_NAME: Record<Stage, string> = { reserved: '예약', out: '출고', returned: '회수', done: '완료' };
export const STAGES: Stage[] = ['reserved', 'out', 'returned', 'done'];

const KEY = 'quote-desk-demo';
export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const stamp = () => {
  const d = new Date();
  return `${today()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function seed(): AppState {
  const t = today();
  const users: User[] = [
    { id: 'u1', name: '김대표', role: 'admin', email: 'ceo@example.com' },
    { id: 'u2', name: '박영업', role: 'sales', email: 'sales@example.com' },
    { id: 'u3', name: '이물류', role: 'logistics', email: 'logi@example.com' },
  ];
  const customers: Customer[] = [
    { id: 'c1', name: '한빛기획', person: '정수민 과장', email: 'sumin.jung@hanbit.example', phone: '032-000-0101', memo: '분기마다 기업 행사' },
    { id: 'c2', name: '한마음 청소년센터', person: '오지훈 주무관', email: 'jihoon.oh@center.example', phone: '032-000-0102', memo: '세금계산서 선발행' },
    { id: 'c3', name: '모아웨딩홀', person: '최은지 실장', email: 'eunji.choi@moa.example', phone: '032-000-0103', memo: '주말 야외 예식' },
    { id: 'c4', name: '푸른마을 입주자회', person: '강민호 총무', email: 'minho.kang@village.example', phone: '032-000-0104', memo: '' },
    { id: 'c5', name: '새봄어린이집', person: '윤서연 원장', email: 'seoyeon.yoon@saebom.example', phone: '032-000-0105', memo: '운동회 연 2회' },
  ];
  const items: Item[] = [
    { id: 'i1', code: 'TB-180', name: '접이식 테이블 1800', cat: '가구', unit: '개', price: 8000, stock: 60 },
    { id: 'i2', code: 'CH-PL', name: '플라스틱 의자', cat: '가구', unit: '개', price: 1500, stock: 400 },
    { id: 'i3', code: 'TN-3X6', name: '캐노피 천막 3×6m', cat: '천막', unit: '동', price: 45000, stock: 12 },
    { id: 'i4', code: 'TN-5X5', name: '몽골 텐트 5×5m', cat: '천막', unit: '동', price: 90000, stock: 6 },
    { id: 'i5', code: 'SP-SET', name: '음향 세트 (스피커 2 + 믹서)', cat: '음향·영상', unit: '세트', price: 120000, stock: 4 },
    { id: 'i6', code: 'MC-WL', name: '무선 마이크', cat: '음향·영상', unit: '개', price: 15000, stock: 10 },
    { id: 'i7', code: 'PJ-5K', name: '빔프로젝터 5000안시 + 스크린', cat: '음향·영상', unit: '세트', price: 80000, stock: 3 },
    { id: 'i8', code: 'HT-GS', name: '야외 난로', cat: '냉난방', unit: '대', price: 25000, stock: 15 },
    { id: 'i9', code: 'ST-3X4', name: '이동식 무대 3×4m', cat: '무대', unit: '식', price: 250000, stock: 2 },
    { id: 'i10', code: 'LT-LED', name: 'LED 조명 스탠드', cat: '무대', unit: '대', price: 20000, stock: 16 },
  ];
  const price = (id: string) => items.find((i) => i.id === id)!.price;
  const L = (id: string, qty: number, p = price(id)): Line => ({ itemId: id, qty, price: p });
  const ver = (v: number, lines: Line[], at: string, by: string, discount = 0, note = ''): Version => ({ v, lines, discount, note, at, by });
  const h = (at: string, by: string, text: string): Hist => ({ at, by, text });
  const no = (n: number) => `Q-${t.slice(2, 4)}${t.slice(5, 7)}-${String(n).padStart(3, '0')}`;

  const quotes: Quote[] = [
    {
      id: 'q1', no: no(1), customerId: 'c1', title: '한빛기획 송년 행사', start: addDays(t, -1), end: addDays(t, 1), status: 'ordered', owner: '박영업', createdAt: addDays(t, -9),
      versions: [ver(1, [L('i1', 20), L('i2', 150), L('i5', 1), L('i6', 4), L('i9', 1)], `${addDays(t, -9)} 10:20`, '박영업')],
      history: [h(`${addDays(t, -9)} 10:20`, '박영업', '견적 작성 (v1)'), h(`${addDays(t, -8)} 09:05`, '박영업', '견적 확정 (v1)'), h(`${addDays(t, -8)} 09:12`, '박영업', '견적서 메일 발송 (v1)'), h(`${addDays(t, -6)} 14:30`, '박영업', '주문 전환')],
    },
    {
      id: 'q2', no: no(2), customerId: 'c3', title: '모아웨딩홀 야외 예식', start: addDays(t, 3), end: addDays(t, 4), status: 'ordered', owner: '박영업', createdAt: addDays(t, -6),
      versions: [
        ver(1, [L('i4', 4), L('i1', 30), L('i2', 200), L('i8', 8)], `${addDays(t, -6)} 11:00`, '박영업'),
        ver(2, [L('i4', 4), L('i1', 30), L('i2', 240), L('i8', 10), L('i10', 8)], `${addDays(t, -5)} 16:40`, '박영업', 50000, '의자·난로 추가, 조명 포함. 단골 할인 5만원.'),
      ],
      history: [h(`${addDays(t, -6)} 11:00`, '박영업', '견적 작성 (v1)'), h(`${addDays(t, -5)} 16:40`, '박영업', '견적 수정 → v2 (의자 200→240, 난로 8→10, 조명 추가)'), h(`${addDays(t, -5)} 17:02`, '박영업', '견적 확정 (v2)'), h(`${addDays(t, -5)} 17:10`, '박영업', '견적서 메일 발송 (v2)'), h(`${addDays(t, -3)} 10:15`, '김대표', '주문 전환')],
    },
    {
      id: 'q3', no: no(3), customerId: 'c2', title: '청소년센터 겨울 축제', start: addDays(t, 6), end: addDays(t, 8), status: 'sent', owner: '박영업', createdAt: addDays(t, -2),
      versions: [ver(1, [L('i3', 6), L('i1', 24), L('i2', 120), L('i5', 2), L('i8', 6)], `${addDays(t, -2)} 13:30`, '박영업', 0, '설치·철거 포함')],
      history: [h(`${addDays(t, -2)} 13:30`, '박영업', '견적 작성 (v1)'), h(`${addDays(t, -1)} 09:40`, '박영업', '견적 확정 (v1)'), h(`${addDays(t, -1)} 09:48`, '박영업', '견적서 메일 발송 (v1)')],
    },
    {
      id: 'q4', no: no(4), customerId: 'c5', title: '새봄어린이집 발표회', start: addDays(t, 4), end: addDays(t, 4), status: 'confirmed', owner: '박영업', createdAt: addDays(t, -1),
      versions: [ver(1, [L('i9', 1), L('i5', 1), L('i6', 2), L('i7', 1), L('i2', 80)], `${addDays(t, -1)} 15:10`, '박영업')],
      history: [h(`${addDays(t, -1)} 15:10`, '박영업', '견적 작성 (v1)'), h(`${t} 09:10`, '박영업', '견적 확정 (v1)')],
    },
    {
      id: 'q5', no: no(5), customerId: 'c4', title: '푸른마을 주민 총회', start: addDays(t, 3), end: addDays(t, 3), status: 'draft', owner: '박영업', createdAt: t,
      versions: [ver(1, [L('i1', 40), L('i2', 180), L('i5', 1), L('i7', 1)], `${t} 10:05`, '박영업')],
      history: [h(`${t} 10:05`, '박영업', '견적 작성 (v1)')],
    },
    {
      id: 'q6', no: no(6), customerId: 'c1', title: '한빛기획 신년 워크숍', start: addDays(t, 20), end: addDays(t, 21), status: 'lost', owner: '박영업', createdAt: addDays(t, -12),
      versions: [ver(1, [L('i7', 2), L('i5', 1), L('i1', 15)], `${addDays(t, -12)} 11:30`, '박영업')],
      history: [h(`${addDays(t, -12)} 11:30`, '박영업', '견적 작성 (v1)'), h(`${addDays(t, -11)} 10:00`, '박영업', '견적서 메일 발송 (v1)'), h(`${addDays(t, -7)} 09:30`, '박영업', '실주 처리 (고객 일정 취소)')],
    },
  ];
  const orders: Order[] = [
    { id: 'o1', no: `S-${no(1).slice(2)}`, quoteId: 'q1', v: 1, pay: 'paid', stage: 'out', createdAt: addDays(t, -6) },
    { id: 'o2', no: `S-${no(2).slice(2)}`, quoteId: 'q2', v: 2, pay: 'deposit', stage: 'reserved', createdAt: addDays(t, -3) },
  ];
  const mail = (id: string, q: Quote, v: number, at: string, status: Mail['status'] = 'sent', tries = 1, error?: string): Mail => {
    const c = customers.find((x) => x.id === q.customerId)!;
    return { id, quoteId: q.id, v, to: c.email, subject: `[견적서] ${q.title} (${q.no} v${v})`, body: '', file: `${q.no}_v${v}_견적서.pdf`, status, tries, at, by: '박영업', error };
  };
  const mails: Mail[] = [
    mail('m1', quotes[0], 1, `${addDays(t, -8)} 09:12`),
    mail('m2', quotes[1], 2, `${addDays(t, -5)} 17:10`),
    mail('m3', quotes[2], 1, `${addDays(t, -1)} 09:48`, 'sent', 2),
    mail('m4', quotes[5], 1, `${addDays(t, -11)} 10:00`),
  ];
  // 처음에는 모든 메뉴가 보이도록 관리자로 시작한다
  return { v: 1, me: 'u1', users, customers, items, quotes, orders, mails, audit: [], seq: 7 };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s && s.v === 1 && Array.isArray(s.quotes)) return s;
    }
  } catch {
    // 저장소를 못 읽으면 예시 데이터로 시작한다
  }
  return seed();
}

let state = load();
const listeners = new Set<() => void>();
function set(next: AppState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장 공간이 없어도 화면은 계속 동작한다
  }
  listeners.forEach((l) => l());
}
export function useApp(): AppState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
export const getState = () => state;
export const me = (s: AppState = state): User => s.users.find((u) => u.id === s.me) ?? s.users[0];
export const can = (menu: string, s: AppState = state) => ROLE_MENUS[me(s).role].includes(menu);

const audit = (s: AppState, area: string, text: string): Audit[] => [{ at: stamp(), by: me(s).name, area, text }, ...s.audit].slice(0, 200);
const patchQuote = (s: AppState, id: string, fn: (q: Quote) => Quote): Quote[] => s.quotes.map((q) => (q.id === id ? fn(q) : q));
const withHist = (q: Quote, text: string): Quote => ({ ...q, history: [...q.history, { at: stamp(), by: me().name, text }] });

export function switchUser(id: string) { set({ ...state, me: id }); }
/** 예시 데이터로 되돌린다. 지금 보고 있는 사용자는 그대로 둔다. */
export function resetAll() { set({ ...seed(), me: state.me }); }

// ── 견적 ──────────────────────────────────────────────
export function createQuote(customerId: string, title: string, start: string, end: string): string {
  const t = today();
  const id = `q${state.seq}`;
  const no = `Q-${t.slice(2, 4)}${t.slice(5, 7)}-${String(state.seq).padStart(3, '0')}`;
  const q: Quote = {
    id, no, customerId, title, start, end, status: 'draft', owner: me().name, createdAt: t,
    versions: [{ v: 1, lines: [], discount: 0, note: '', at: stamp(), by: me().name }],
    history: [{ at: stamp(), by: me().name, text: '견적 작성 (v1)' }],
  };
  set({ ...state, quotes: [q, ...state.quotes], seq: state.seq + 1, audit: audit(state, '견적', `${no} 작성`) });
  return id;
}

export type QuoteDraft = { title: string; customerId: string; start: string; end: string; lines: Line[]; discount: number; note: string };

/** 작성 중인 견적은 같은 버전을 고치고, 확정·발송된 견적은 새 버전을 만든다 (이전 버전은 그대로 남는다). */
export function saveQuote(id: string, d: QuoteDraft, items: Item[] = state.items): { newVersion: boolean } {
  const q = state.quotes.find((x) => x.id === id);
  if (!q) return { newVersion: false };
  const cur = latest(q);
  const newVersion = q.status !== 'draft';
  const name = (itemId: string) => items.find((i) => i.id === itemId)?.name ?? itemId;
  const changes: string[] = [];
  if (d.title !== q.title) changes.push(`건명 "${q.title}"→"${d.title}"`);
  if (d.start !== q.start || d.end !== q.end) changes.push(`기간 ${q.start}~${q.end}→${d.start}~${d.end}`);
  const before = new Map(cur.lines.map((l) => [l.itemId, l]));
  for (const l of d.lines) {
    const b = before.get(l.itemId);
    if (!b) changes.push(`${name(l.itemId)} 추가(${l.qty})`);
    else {
      if (b.qty !== l.qty) changes.push(`${name(l.itemId)} 수량 ${b.qty}→${l.qty}`);
      if (b.price !== l.price) changes.push(`${name(l.itemId)} 단가 ${b.price.toLocaleString()}→${l.price.toLocaleString()}`);
    }
    before.delete(l.itemId);
  }
  for (const b of before.values()) changes.push(`${name(b.itemId)} 삭제`);
  if ((d.discount || 0) !== cur.discount) changes.push(`할인 ${cur.discount.toLocaleString()}→${(d.discount || 0).toLocaleString()}`);
  if (d.note !== cur.note) changes.push('비고 수정');
  if (changes.length === 0 && d.customerId === q.customerId) return { newVersion: false };

  const v: Version = { v: newVersion ? cur.v + 1 : cur.v, lines: d.lines, discount: d.discount || 0, note: d.note, at: stamp(), by: me().name };
  const text = `${newVersion ? `견적 수정 → v${v.v}` : `견적 수정 (v${v.v})`}${changes.length ? ` · ${changes.join(', ')}` : ''}`;
  const quotes = patchQuote(state, id, (x) => withHist({
    ...x, title: d.title, customerId: d.customerId, start: d.start, end: d.end,
    // 새 버전이 생기면 다시 확정·발송해야 하므로 작성 중으로 되돌린다
    status: newVersion ? 'draft' : x.status,
    // 이전 버전에는 당시 대여 기간을 남겨, 기간을 바꿔도 예전 견적서 금액이 변하지 않게 한다
    versions: newVersion ? [...x.versions.slice(0, -1), { ...cur, start: q.start, end: q.end }, v] : [...x.versions.slice(0, -1), v],
  }, text));
  set({ ...state, quotes, audit: audit(state, '견적', `${q.no} ${newVersion ? `v${v.v} 생성` : '수정'}`) });
  return { newVersion };
}

export function setQuoteStatus(id: string, status: QuoteStatus, reason = '') {
  const q = state.quotes.find((x) => x.id === id);
  if (!q) return;
  const v = latest(q).v;
  const text = status === 'confirmed' ? `견적 확정 (v${v})` : status === 'lost' ? `실주 처리${reason ? ` (${reason})` : ''}` : status === 'draft' ? '확정 취소 → 작성 중' : STATUS_NAME[status];
  set({ ...state, quotes: patchQuote(state, id, (x) => withHist({ ...x, status }, text)), audit: audit(state, '견적', `${q.no} ${text}`) });
}

// ── 메일 ──────────────────────────────────────────────
export function mailDraft(q: Quote, s: AppState = state): { to: string; subject: string; body: string; file: string } {
  const c = s.customers.find((x) => x.id === q.customerId);
  const ver = latest(q);
  const t = totals(ver, q.start, q.end);
  const u = me(s);
  return {
    to: c?.email ?? '',
    subject: `[견적서] ${q.title} (${q.no} v${ver.v})`,
    file: `${q.no}_v${ver.v}_견적서.pdf`,
    body: [
      `${c?.person ?? '담당자'}님, 안녕하세요. 예시렌탈 ${u.name}입니다.`,
      '',
      `요청하신 "${q.title}" 건의 견적서를 첨부해 보내 드립니다.`,
      '',
      `- 대여 기간: ${q.start} ~ ${q.end} (${t.days}일)`,
      `- 품목: ${ver.lines.length}종`,
      `- 합계: ${t.total.toLocaleString('ko-KR')}원 (부가세 포함)`,
      '',
      '견적은 발행일로부터 14일간 유효합니다. 수량이나 일정 변경이 있으면 편하게 말씀해 주세요.',
      '',
      `${u.name} 드림`,
    ].join('\n'),
  };
}

export type SendInput = { to: string; subject: string; body: string; file: string; simulateFail: boolean; force: boolean; retryOf?: string };
export type SendResult = { ok: boolean; reason?: 'duplicate' | 'failed' | 'not-confirmed' | 'bad-address'; mail?: Mail };

/** 발송 흉내: 실제 Gmail 로 보내지 않는다. 0.9초 뒤 성공/실패를 기록한다. */
export function sendMail(quoteId: string, input: SendInput): Promise<SendResult> {
  const q = state.quotes.find((x) => x.id === quoteId);
  if (!q) return Promise.resolve({ ok: false, reason: 'failed' });
  const v = latest(q).v;
  if (q.status === 'draft') return Promise.resolve({ ok: false, reason: 'not-confirmed' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to.trim())) return Promise.resolve({ ok: false, reason: 'bad-address' });
  if (!input.force && alreadySent(state.mails, quoteId, v, input.to)) return Promise.resolve({ ok: false, reason: 'duplicate' });
  return new Promise((resolve) => {
    setTimeout(() => {
      const prev = input.retryOf ? state.mails.find((m) => m.id === input.retryOf) : undefined;
      const ok = !input.simulateFail;
      const m: Mail = {
        id: prev?.id ?? `m${Date.now()}`, quoteId, v, to: input.to.trim(), subject: input.subject, body: input.body, file: input.file,
        status: ok ? 'sent' : 'failed', tries: (prev?.tries ?? 0) + 1, at: stamp(), by: me().name,
        error: ok ? undefined : '메일 서버 응답 없음 (시연용 실패)',
      };
      const mails = prev ? state.mails.map((x) => (x.id === prev.id ? m : x)) : [m, ...state.mails];
      const text = ok ? `견적서 메일 발송 (v${v}) → ${m.to}${m.tries > 1 ? ` · ${m.tries}번째 시도` : ''}` : `견적서 메일 발송 실패 (v${v}) → ${m.to}`;
      const quotes = patchQuote(state, quoteId, (x) => withHist({ ...x, status: ok && x.status === 'confirmed' ? 'sent' : x.status }, text));
      set({ ...state, mails, quotes, audit: audit(state, '메일', `${q.no} ${ok ? '발송' : '발송 실패'}`) });
      resolve({ ok, reason: ok ? undefined : 'failed', mail: m });
    }, 900);
  });
}

// ── 주문 ──────────────────────────────────────────────
export function convertToOrder(quoteId: string): string | null {
  const q = state.quotes.find((x) => x.id === quoteId);
  if (!q || q.status === 'draft' || q.status === 'lost') return null;
  const exists = state.orders.find((o) => o.quoteId === quoteId);
  if (exists) return exists.id;
  const o: Order = { id: `o${Date.now()}`, no: `S-${q.no.slice(2)}`, quoteId, v: latest(q).v, pay: 'unpaid', stage: 'reserved', createdAt: today() };
  set({
    ...state, orders: [o, ...state.orders],
    quotes: patchQuote(state, quoteId, (x) => withHist({ ...x, status: 'ordered' }, `주문 전환 (${o.no}) · 재고 예약`)),
    audit: audit(state, '주문', `${o.no} 생성`),
  });
  return o.id;
}
export function setPay(orderId: string, pay: PayStatus) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.pay === pay) return;
  set({
    ...state, orders: state.orders.map((x) => (x.id === orderId ? { ...x, pay } : x)),
    quotes: patchQuote(state, o.quoteId, (q) => withHist(q, `입금 상태: ${PAY_NAME[pay]}`)),
    audit: audit(state, '주문', `${o.no} ${PAY_NAME[pay]}`),
  });
}
export function setStage(orderId: string, stage: Stage) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.stage === stage) return;
  set({
    ...state, orders: state.orders.map((x) => (x.id === orderId ? { ...x, stage } : x)),
    quotes: patchQuote(state, o.quoteId, (q) => withHist(q, `진행 상태: ${STAGE_NAME[stage]}`)),
    audit: audit(state, '물류', `${o.no} ${STAGE_NAME[stage]}`),
  });
}

// ── 기준 정보 ──────────────────────────────────────────
export function saveCustomer(c: Customer) {
  const exists = state.customers.some((x) => x.id === c.id);
  set({ ...state, customers: exists ? state.customers.map((x) => (x.id === c.id ? c : x)) : [...state.customers, c], audit: audit(state, '고객', `${c.name} ${exists ? '수정' : '등록'}`) });
}
export function saveItem(i: Item) {
  const prev = state.items.find((x) => x.id === i.id);
  const diff = prev ? [prev.price !== i.price && `단가 ${prev.price.toLocaleString()}→${i.price.toLocaleString()}`, prev.stock !== i.stock && `보유 ${prev.stock}→${i.stock}`].filter(Boolean).join(', ') : '';
  set({ ...state, items: prev ? state.items.map((x) => (x.id === i.id ? i : x)) : [...state.items, i], audit: audit(state, '품목', `${i.name} ${prev ? `수정${diff ? ` (${diff})` : ''}` : '등록'}`) });
}
export function setRole(userId: string, role: Role) {
  const u = state.users.find((x) => x.id === userId);
  if (!u) return;
  set({ ...state, users: state.users.map((x) => (x.id === userId ? { ...x, role } : x)), audit: audit(state, '권한', `${u.name} → ${ROLE_NAME[role]}`) });
}
export const newId = (p: string) => `${p}${Date.now().toString(36)}`;

// ── 백업·복구 ──────────────────────────────────────────
export function exportBackup(): string { return JSON.stringify(state, null, 2); }
export function importBackup(text: string): { ok: boolean; error?: string } {
  try {
    const s = JSON.parse(text) as AppState;
    if (!s || s.v !== 1 || !Array.isArray(s.quotes) || !Array.isArray(s.items) || !Array.isArray(s.customers) || !Array.isArray(s.users)) return { ok: false, error: '견적온 백업 파일 형식이 아닙니다.' };
    const restored: AppState = { ...s, me: s.users.some((u) => u.id === state.me) ? state.me : s.users[0].id };
    set({ ...restored, audit: audit(restored, '백업', `백업 파일로 복구 (견적 ${s.quotes.length}건)`) });
    return { ok: true };
  } catch {
    return { ok: false, error: '파일을 읽을 수 없습니다. JSON 형식인지 확인해 주세요.' };
  }
}
