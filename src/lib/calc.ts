// 견적 금액, 대여 기간, 기간별 가용수량 계산. 화면과 분리한 순수 함수라 테스트 대상이다.

export type Line = { itemId: string; qty: number; price: number };
/** start·end 는 새 버전이 생길 때 이전 버전에 당시 대여 기간을 남겨 두는 용도다 (없으면 견적의 현재 기간). */
export type Version = { v: number; lines: Line[]; discount: number; note: string; at: string; by: string; start?: string; end?: string };
export type QuoteStatus = 'draft' | 'confirmed' | 'sent' | 'ordered' | 'lost';
export type Hist = { at: string; by: string; text: string };
export type Quote = {
  id: string;
  no: string;
  customerId: string;
  title: string;
  start: string; // 출고일 (YYYY-MM-DD)
  end: string; // 회수일 (YYYY-MM-DD)
  status: QuoteStatus;
  versions: Version[];
  owner: string;
  createdAt: string;
  history: Hist[];
};
export type PayStatus = 'unpaid' | 'deposit' | 'paid';
export type Stage = 'reserved' | 'out' | 'returned' | 'done';
export type Order = { id: string; no: string; quoteId: string; v: number; pay: PayStatus; stage: Stage; createdAt: string };
export type Item = { id: string; code: string; name: string; cat: string; unit: string; price: number; stock: number };
export type Mail = {
  id: string;
  quoteId: string;
  v: number;
  to: string;
  subject: string;
  body: string;
  file: string;
  status: 'sent' | 'failed';
  tries: number;
  at: string;
  by: string;
  error?: string;
};

export const VAT_RATE = 0.1;

const DAY = 86400000;
const toUTC = (d: string) => Date.parse(`${d}T00:00:00Z`);

export function addDays(d: string, n: number): string {
  return new Date(toUTC(d) + n * DAY).toISOString().slice(0, 10);
}

/** 대여 일수: 출고일과 회수일을 모두 포함한다 (당일 반납 = 1일). 날짜가 뒤집히면 0. */
export function rentalDays(start: string, end: string): number {
  const n = Math.round((toUTC(end) - toUTC(start)) / DAY) + 1;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

export function lineAmount(line: Line, days: number): number {
  return line.price * line.qty * days;
}

export type Totals = { days: number; subtotal: number; discount: number; supply: number; vat: number; total: number };

/** 공급가액 = 품목 합계 − 할인(합계를 넘지 않는다), 부가세는 원 단위 반올림. */
export function totals(ver: Pick<Version, 'lines' | 'discount'>, start: string, end: string): Totals {
  const days = rentalDays(start, end);
  const subtotal = ver.lines.reduce((s, l) => s + lineAmount(l, days), 0);
  const discount = Math.min(Math.max(ver.discount || 0, 0), subtotal);
  const supply = subtotal - discount;
  const vat = Math.round(supply * VAT_RATE);
  return { days, subtotal, discount, supply, vat, total: supply + vat };
}

export const latest = (q: Quote): Version => q.versions[q.versions.length - 1];

/** 그 버전이 작성될 당시의 대여 기간. */
export const periodOf = (q: Quote, ver: Version) => ({ start: ver.start ?? q.start, end: ver.end ?? q.end });
export const versionTotals = (q: Quote, ver: Version): Totals => totals(ver, periodOf(q, ver).start, periodOf(q, ver).end);

/** 재고를 잡고 있는 주문: 예약 또는 출고 상태. 회수가 끝나면 재고가 풀린다. */
const holdsStock = (o: Order) => o.stage === 'reserved' || o.stage === 'out';

/** 하루 동안 해당 품목이 나가 있는(또는 예약된) 수량. */
export function reservedOn(itemId: string, day: string, orders: Order[], quotes: Quote[], exceptQuoteId?: string): number {
  let sum = 0;
  for (const o of orders) {
    if (!holdsStock(o) || o.quoteId === exceptQuoteId) continue;
    const q = quotes.find((x) => x.id === o.quoteId);
    if (!q || day < q.start || day > q.end) continue;
    const ver = q.versions.find((x) => x.v === o.v) ?? latest(q);
    for (const l of ver.lines) if (l.itemId === itemId) sum += l.qty;
  }
  return sum;
}

/** 기간 전체에서 쓸 수 있는 수량 = 기간 중 가장 적게 남는 날의 수량. */
export function availableIn(item: Item, start: string, end: string, orders: Order[], quotes: Quote[], exceptQuoteId?: string): number {
  const days = dateRange(start, end);
  if (days.length === 0) return item.stock;
  return Math.min(...days.map((d) => item.stock - reservedOn(item.id, d, orders, quotes, exceptQuoteId)));
}

export type Shortage = { itemId: string; need: number; available: number };

/** 견적 품목 중 기간 내 가용수량이 모자란 것. 같은 품목이 여러 줄이면 합쳐서 본다. */
export function shortages(q: Quote, ver: Version, items: Item[], orders: Order[], quotes: Quote[]): Shortage[] {
  const need = new Map<string, number>();
  for (const l of ver.lines) need.set(l.itemId, (need.get(l.itemId) ?? 0) + l.qty);
  const out: Shortage[] = [];
  for (const [itemId, n] of need) {
    const item = items.find((i) => i.id === itemId);
    if (!item) continue;
    const available = availableIn(item, q.start, q.end, orders, quotes, q.id);
    if (n > available) out.push({ itemId, need: n, available });
  }
  return out;
}

/** 같은 견적·같은 버전·같은 수신자로 이미 발송에 성공한 메일이 있는지 (중복 발송 방지). */
export function alreadySent(mails: Mail[], quoteId: string, v: number, to: string): Mail | undefined {
  const key = to.trim().toLowerCase();
  return mails.find((m) => m.quoteId === quoteId && m.v === v && m.status === 'sent' && m.to.trim().toLowerCase() === key);
}

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 견적서에 적는 한글 금액: 6930000 → "육백구십삼만". */
export function koreanAmount(n: number): string {
  if (n <= 0) return '영';
  const D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const U = ['', '십', '백', '천'];
  const G = ['', '만', '억', '조'];
  let out = '';
  for (let g = 0, rest = Math.floor(n); rest > 0; g++, rest = Math.floor(rest / 10000)) {
    const part = rest % 10000;
    if (!part) continue;
    let s = '';
    for (let i = 0, p = part; p > 0; i++, p = Math.floor(p / 10)) {
      const d = p % 10;
      if (d) s = D[d] + U[i] + s;
    }
    out = s + G[g] + out;
  }
  return out;
}
