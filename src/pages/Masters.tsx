import { useState } from 'react';
import { Field, Icon, Modal } from '../components/ui';
import { won, type Item } from '../lib/calc';
import { newId, saveCustomer, saveItem, useApp, type Customer } from '../store';

export function Masters({ kind }: { kind: 'customers' | 'items' }) {
  return kind === 'customers' ? <Customers /> : <Items />;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Customers() {
  const s = useApp();
  const [edit, setEdit] = useState<Customer | null>(null);
  const [err, setErr] = useState('');
  const count = (id: string) => s.quotes.filter((q) => q.customerId === id).length;
  const submit = () => {
    if (!edit) return;
    if (!edit.name.trim()) return setErr('상호를 입력해 주세요.');
    if (!EMAIL.test(edit.email.trim())) return setErr('메일 주소 형식을 확인해 주세요. 견적서 발송에 쓰입니다.');
    saveCustomer({ ...edit, name: edit.name.trim(), email: edit.email.trim() });
    setEdit(null);
  };
  return (
    <>
      <div className="page-head"><h1>고객</h1><button className="btn primary" data-act="new-customer" onClick={() => { setErr(''); setEdit({ id: newId('c'), name: '', person: '', email: '', phone: '', memo: '' }); }}><Icon name="plus" />고객 등록</button></div>
      <section className="card flush">
        <div className="table-scroll">
          <table className="table hover">
            <thead><tr><th>상호</th><th>담당자</th><th>메일</th><th>전화</th><th>메모</th><th className="r">견적</th></tr></thead>
            <tbody>
              {s.customers.map((c) => (
                <tr key={c.id} onClick={() => { setErr(''); setEdit(c); }} data-customer={c.id}>
                  <td><b>{c.name}</b></td><td>{c.person}</td><td>{c.email}</td><td className="nowrap">{c.phone}</td><td className="muted">{c.memo}</td><td className="r">{count(c.id)}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {edit && (
        <Modal title={s.customers.some((c) => c.id === edit.id) ? '고객 수정' : '고객 등록'} onClose={() => setEdit(null)}>
          <form className="form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <Field label="상호"><input className="input" name="name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
            <div className="form-2">
              <Field label="담당자"><input className="input" name="person" value={edit.person} onChange={(e) => setEdit({ ...edit, person: e.target.value })} /></Field>
              <Field label="전화"><input className="input" name="phone" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            </div>
            <Field label="메일" hint="견적서 메일의 받는 사람으로 자동 입력됩니다"><input className="input" name="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            <Field label="메모"><input className="input" name="memo" value={edit.memo} onChange={(e) => setEdit({ ...edit, memo: e.target.value })} /></Field>
            {err && <p className="error" data-form-error>{err}</p>}
            <div className="form-actions"><button type="button" className="btn" onClick={() => setEdit(null)}>취소</button><button className="btn primary" data-act="save-customer">저장</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Items() {
  const s = useApp();
  const [edit, setEdit] = useState<Item | null>(null);
  const [err, setErr] = useState('');
  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
  const submit = () => {
    if (!edit) return;
    if (!edit.name.trim() || !edit.code.trim()) return setErr('품목 코드와 이름을 입력해 주세요.');
    if (s.items.some((i) => i.id !== edit.id && i.code.trim().toLowerCase() === edit.code.trim().toLowerCase())) return setErr('이미 쓰고 있는 품목 코드입니다.');
    if (edit.price <= 0) return setErr('1일 단가는 0보다 커야 합니다.');
    saveItem({ ...edit, name: edit.name.trim(), code: edit.code.trim(), cat: edit.cat.trim() || '기타', unit: edit.unit.trim() || '개' });
    setEdit(null);
  };
  return (
    <>
      <div className="page-head"><h1>품목·단가</h1><button className="btn primary" data-act="new-item" onClick={() => { setErr(''); setEdit({ id: newId('i'), code: '', name: '', cat: '', unit: '개', price: 0, stock: 0 }); }}><Icon name="plus" />품목 등록</button></div>
      <p className="muted lead">여기서 바꾼 단가는 새로 추가하는 견적 품목부터 적용됩니다. 이미 작성된 견적의 단가는 바뀌지 않습니다.</p>
      <section className="card flush">
        <div className="table-scroll">
          <table className="table hover">
            <thead><tr><th>코드</th><th>품목</th><th>분류</th><th className="r">1일 단가</th><th className="r">보유 수량</th></tr></thead>
            <tbody>
              {s.items.map((i) => (
                <tr key={i.id} onClick={() => { setErr(''); setEdit(i); }} data-item-row={i.id}>
                  <td className="mono">{i.code}</td><td><b>{i.name}</b></td><td>{i.cat}</td><td className="r num">{won(i.price)}</td><td className="r">{i.stock}{i.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {edit && (
        <Modal title={s.items.some((i) => i.id === edit.id) ? '품목 수정' : '품목 등록'} onClose={() => setEdit(null)}>
          <form className="form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="form-2">
              <Field label="품목 코드"><input className="input" name="code" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} autoFocus /></Field>
              <Field label="분류"><input className="input" name="cat" value={edit.cat} onChange={(e) => setEdit({ ...edit, cat: e.target.value })} list="cats" /><datalist id="cats">{[...new Set(s.items.map((i) => i.cat))].map((c) => <option key={c} value={c} />)}</datalist></Field>
            </div>
            <Field label="품목 이름"><input className="input" name="name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="form-3">
              <Field label="1일 단가(원)"><input className="input" name="price" inputMode="numeric" value={edit.price} onChange={(e) => setEdit({ ...edit, price: num(e.target.value) })} /></Field>
              <Field label="보유 수량"><input className="input" name="stock" inputMode="numeric" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: num(e.target.value) })} /></Field>
              <Field label="단위"><input className="input" name="unit" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></Field>
            </div>
            {err && <p className="error" data-form-error>{err}</p>}
            <div className="form-actions"><button type="button" className="btn" onClick={() => setEdit(null)}>취소</button><button className="btn primary" data-act="save-item">저장</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
