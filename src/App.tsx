import { useState } from 'react';
import { Icon } from './components/ui';
import { href, useRoute } from './lib/router';
import { Dashboard } from './pages/Dashboard';
import { Masters } from './pages/Masters';
import { Mails } from './pages/Mails';
import { Orders } from './pages/Orders';
import { QuoteDetail } from './pages/QuoteDetail';
import { Quotes } from './pages/Quotes';
import { Settings } from './pages/Settings';
import { Stock } from './pages/Stock';
import { can, me, resetAll, ROLE_NAME, switchUser, useApp } from './store';

const MENU: { id: string; path: string; label: string }[] = [
  { id: 'dash', path: '/', label: '대시보드' },
  { id: 'quotes', path: '/quotes', label: '견적' },
  { id: 'orders', path: '/orders', label: '주문·입금' },
  { id: 'stock', path: '/stock', label: '재고·일정' },
  { id: 'mails', path: '/mails', label: '메일 발송 이력' },
  { id: 'customers', path: '/customers', label: '고객' },
  { id: 'items', path: '/items', label: '품목·단가' },
  { id: 'settings', path: '/settings', label: '권한·백업' },
];

export function App() {
  const s = useApp();
  const route = useRoute();
  const user = me(s);
  const [confirmReset, setConfirmReset] = useState(false);
  const top = route.seg[0] ?? '';
  const active = top === '' ? 'dash' : top === 'q' ? 'quotes' : top;
  const allowed = can(active, s);

  let page;
  if (!allowed) page = <div className="card denied" data-denied><Icon name="warn" size={22} /><div><b>{ROLE_NAME[user.role]} 권한으로는 열 수 없는 화면입니다.</b><p className="muted">오른쪽 위에서 사용자를 바꾸면 권한별 화면을 확인할 수 있습니다.</p></div></div>;
  else if (top === '') page = <Dashboard />;
  else if (top === 'quotes') page = <Quotes />;
  else if (top === 'q' && route.seg[1]) page = <QuoteDetail id={route.seg[1]} tab={route.seg[2] ?? 'edit'} />;
  else if (top === 'orders') page = <Orders />;
  else if (top === 'stock') page = <Stock />;
  else if (top === 'mails') page = <Mails />;
  else if (top === 'customers') page = <Masters kind="customers" />;
  else if (top === 'items') page = <Masters kind="items" />;
  else if (top === 'settings') page = <Settings />;
  else page = <div className="card">없는 화면입니다. <a className="link" href={href('/')}>대시보드로</a></div>;

  return (
    <>
      <div className="demo-bar no-print">시연용 화면 · 고객·품목·금액은 모두 예시 데이터이며 메일은 실제로 발송되지 않습니다</div>
      <div className="shell">
        <aside className="side no-print">
          <a className="logo" href={href('/')}><span className="logo-mark">견</span><span><b>견적온</b><small>견적부터 회수까지</small></span></a>
          <nav>
            {MENU.filter((m) => can(m.id, s)).map((m) => (
              <a key={m.id} href={href(m.path)} className={active === m.id ? 'on' : ''} data-menu={m.id}>
                <Icon name={m.id} />{m.label}
              </a>
            ))}
          </nav>
        </aside>
        <div className="body">
          <header className="top no-print">
            <label className="who">
              <span className="avatar">{user.name.slice(0, 1)}</span>
              <select value={s.me} onChange={(e) => switchUser(e.target.value)} data-act="switch-user" aria-label="사용자 전환">
                {s.users.map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE_NAME[u.role]}</option>)}
              </select>
            </label>
            {confirmReset ? (
              <span className="reset-confirm">예시 데이터로 되돌릴까요?
                <button className="btn sm danger" data-act="reset-yes" onClick={() => { resetAll(); setConfirmReset(false); }}>되돌리기</button>
                <button className="btn sm" onClick={() => setConfirmReset(false)}>취소</button>
              </span>
            ) : (
              <button className="btn sm" data-act="reset" onClick={() => setConfirmReset(true)}><Icon name="redo" size={15} />처음 상태로</button>
            )}
          </header>
          <main className="main">{page}</main>
        </div>
      </div>
    </>
  );
}
