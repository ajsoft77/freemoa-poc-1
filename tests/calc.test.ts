import { describe, expect, it } from 'vitest';
import {
  addDays, alreadySent, availableIn, koreanAmount, rentalDays, reservedOn, shortages, totals,
  type Item, type Mail, type Order, type Quote,
} from '../src/lib/calc';

const item: Item = { id: 'i1', code: 'T-01', name: '테이블', cat: '가구', unit: '개', price: 10000, stock: 10 };
const quote = (id: string, start: string, end: string, qty: number): Quote => ({
  id, no: id, customerId: 'c1', title: id, start, end, status: 'ordered', owner: 'u', createdAt: start, history: [],
  versions: [{ v: 1, lines: [{ itemId: 'i1', qty, price: 10000 }], discount: 0, note: '', at: start, by: 'u' }],
});
const order = (quoteId: string, stage: Order['stage']): Order => ({ id: `o-${quoteId}`, no: quoteId, quoteId, v: 1, pay: 'unpaid', stage, createdAt: '2026-12-01' });

describe('대여 기간', () => {
  it('출고일과 회수일을 모두 센다', () => {
    expect(rentalDays('2026-12-01', '2026-12-01')).toBe(1);
    expect(rentalDays('2026-12-01', '2026-12-03')).toBe(3);
  });
  it('달과 해가 바뀌어도 맞다', () => {
    expect(rentalDays('2026-12-30', '2027-01-02')).toBe(4);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('회수일이 출고일보다 빠르면 0일', () => {
    expect(rentalDays('2026-12-05', '2026-12-01')).toBe(0);
  });
});

describe('견적 금액', () => {
  it('단가 × 수량 × 일수, 부가세 10%', () => {
    const t = totals({ lines: [{ itemId: 'i1', qty: 3, price: 10000 }, { itemId: 'i2', qty: 1, price: 5500 }], discount: 0 }, '2026-12-01', '2026-12-02');
    expect(t.days).toBe(2);
    expect(t.subtotal).toBe(71000);
    expect(t.vat).toBe(7100);
    expect(t.total).toBe(78100);
  });
  it('할인은 공급가액에서 빼고 부가세를 다시 계산한다', () => {
    const t = totals({ lines: [{ itemId: 'i1', qty: 1, price: 10000 }], discount: 1005 }, '2026-12-01', '2026-12-01');
    expect(t.supply).toBe(8995);
    expect(t.vat).toBe(900); // 899.5 반올림
    expect(t.total).toBe(9895);
  });
  it('할인이 합계보다 커도 음수가 되지 않는다', () => {
    const t = totals({ lines: [{ itemId: 'i1', qty: 1, price: 10000 }], discount: 99999 }, '2026-12-01', '2026-12-01');
    expect(t.supply).toBe(0);
    expect(t.total).toBe(0);
  });
});

describe('기간별 가용수량', () => {
  const quotes = [quote('a', '2026-12-01', '2026-12-03', 4), quote('b', '2026-12-03', '2026-12-05', 5), quote('c', '2026-12-01', '2026-12-05', 3)];
  const orders = [order('a', 'reserved'), order('b', 'out'), order('c', 'returned')];

  it('예약·출고 주문만 재고를 잡는다 (회수된 주문은 제외)', () => {
    expect(reservedOn('i1', '2026-12-02', orders, quotes)).toBe(4);
    expect(reservedOn('i1', '2026-12-03', orders, quotes)).toBe(9);
    expect(reservedOn('i1', '2026-12-06', orders, quotes)).toBe(0);
  });
  it('기간 중 가장 적게 남는 날이 가용수량이다', () => {
    expect(availableIn(item, '2026-12-01', '2026-12-02', orders, quotes)).toBe(6);
    expect(availableIn(item, '2026-12-02', '2026-12-04', orders, quotes)).toBe(1);
  });
  it('자기 주문은 빼고 계산한다', () => {
    expect(availableIn(item, '2026-12-03', '2026-12-03', orders, quotes, 'a')).toBe(5);
  });
  it('부족한 품목을 찾고, 같은 품목 여러 줄은 합친다', () => {
    const q = quote('n', '2026-12-03', '2026-12-03', 1);
    q.versions[0].lines = [{ itemId: 'i1', qty: 1, price: 1 }, { itemId: 'i1', qty: 1, price: 1 }];
    expect(shortages(q, q.versions[0], [item], orders, quotes)).toEqual([{ itemId: 'i1', need: 2, available: 1 }]);
    q.versions[0].lines = [{ itemId: 'i1', qty: 1, price: 1 }];
    expect(shortages(q, q.versions[0], [item], orders, quotes)).toEqual([]);
  });
});

describe('중복 발송 방지', () => {
  const mail = (v: number, to: string, status: Mail['status']): Mail => ({ id: `${v}${to}${status}`, quoteId: 'q1', v, to, subject: '', body: '', file: '', status, tries: 1, at: '', by: '' });
  const mails = [mail(1, 'kim@example.com', 'sent'), mail(2, 'lee@example.com', 'failed')];

  it('같은 견적·버전·수신자로 성공한 발송이 있으면 중복', () => {
    expect(alreadySent(mails, 'q1', 1, ' KIM@example.com ')).toBeTruthy();
  });
  it('버전이나 수신자가 다르면 중복이 아니다', () => {
    expect(alreadySent(mails, 'q1', 2, 'kim@example.com')).toBeUndefined();
    expect(alreadySent(mails, 'q1', 1, 'park@example.com')).toBeUndefined();
  });
  it('실패한 발송은 중복으로 보지 않는다 (재시도 가능)', () => {
    expect(alreadySent(mails, 'q1', 2, 'lee@example.com')).toBeUndefined();
  });
});

describe('한글 금액', () => {
  it('만·억 단위로 읽는다', () => {
    expect(koreanAmount(6930000)).toBe('육백구십삼만');
    expect(koreanAmount(100000000)).toBe('일억');
    expect(koreanAmount(120340056)).toBe('일억이천삼십사만오십육');
    expect(koreanAmount(0)).toBe('영');
  });
});

describe('버전별 금액 보존', () => {
  it('이전 버전은 당시 대여 기간으로 계산한다', async () => {
    const { versionTotals } = await import('../src/lib/calc');
    const q = quote('p', '2026-12-01', '2026-12-04', 1); // 현재 기간 4일
    const old = { ...q.versions[0], start: '2026-12-01', end: '2026-12-02' }; // 당시 2일
    expect(versionTotals(q, old).supply).toBe(20000);
    expect(versionTotals(q, q.versions[0]).supply).toBe(40000);
  });
});
