import { useRef, useState } from 'react';
import { Icon } from '../components/ui';
import { exportBackup, importBackup, ROLE_MENUS, ROLE_NAME, setRole, today, useApp, type Role } from '../store';

const MENU_NAME: Record<string, string> = { dash: '대시보드', quotes: '견적', orders: '주문·입금', stock: '재고·일정', mails: '메일 이력', customers: '고객', items: '품목·단가', settings: '권한·백업' };
const ROLES: Role[] = ['admin', 'sales', 'logistics'];

export function Settings() {
  const s = useApp();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const admins = s.users.filter((u) => u.role === 'admin').length;

  const download = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `견적온_백업_${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg({ ok: true, text: `백업 파일을 내려받았습니다 (견적 ${s.quotes.length}건, 주문 ${s.orders.length}건, 메일 이력 ${s.mails.length}건).` });
  };
  const restore = async (f: File | undefined) => {
    if (!f) return;
    const r = importBackup(await f.text());
    setMsg(r.ok ? { ok: true, text: '백업 파일로 복구했습니다.' } : { ok: false, text: r.error ?? '복구하지 못했습니다.' });
    if (file.current) file.current.value = '';
  };

  return (
    <>
      <div className="page-head"><h1>권한·백업</h1></div>
      <div className="cols-2">
        <section className="card">
          <h2>사용자 권한</h2>
          <ul className="users">
            {s.users.map((u) => (
              <li key={u.id} data-user={u.id}>
                <span className="avatar">{u.name.slice(0, 1)}</span>
                <span className="grow"><b>{u.name}</b><small className="muted">{u.email}</small></span>
                <select value={u.role} onChange={(e) => setRole(u.id, e.target.value as Role)} disabled={u.role === 'admin' && admins === 1} aria-label={`${u.name} 권한`}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_NAME[r]}</option>)}
                </select>
              </li>
            ))}
          </ul>
          <p className="muted small">관리자가 한 명뿐이면 그 권한은 내릴 수 없습니다.</p>
        </section>
        <section className="card">
          <h2>권한별 화면</h2>
          <div className="table-scroll">
            <table className="table matrix">
              <thead><tr><th>화면</th>{ROLES.map((r) => <th key={r}>{ROLE_NAME[r]}</th>)}</tr></thead>
              <tbody>
                {Object.keys(MENU_NAME).map((m) => <tr key={m}><td>{MENU_NAME[m]}</td>{ROLES.map((r) => <td key={r}>{ROLE_MENUS[r].includes(m) ? <span className="ok"><Icon name="check" size={16} /></span> : <span className="muted">–</span>}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card">
        <h2>백업·복구</h2>
        <p className="muted">전체 데이터(고객, 품목, 견적과 버전, 주문, 메일 이력)를 파일 하나로 내려받고, 그 파일로 되돌릴 수 있습니다.</p>
        <div className="row gap">
          <button className="btn primary" onClick={download} data-act="backup"><Icon name="down" />백업 파일 내려받기</button>
          <button className="btn" onClick={() => file.current?.click()} data-act="restore"><Icon name="up" />백업 파일로 복구</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} data-f="restore-file" />
        </div>
        {msg && <p className={`toast ${msg.ok ? 'ok' : 'bad'}`} data-backup-msg={msg.ok ? 'ok' : 'bad'}>{msg.text}</p>}
      </section>

      <section className="card">
        <div className="card-head"><h2>작업 기록</h2><span className="muted small">누가 언제 무엇을 바꿨는지 남습니다 (최근 200건)</span></div>
        {s.audit.length === 0 ? <p className="muted">아직 기록이 없습니다. 견적을 수정하거나 메일을 보내면 여기에 쌓입니다.</p> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>일시</th><th>사용자</th><th>구분</th><th>내용</th></tr></thead>
              <tbody>{s.audit.slice(0, 30).map((a, i) => <tr key={i}><td className="nowrap">{a.at}</td><td>{a.by}</td><td>{a.area}</td><td>{a.text}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
