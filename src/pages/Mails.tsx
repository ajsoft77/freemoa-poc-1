import { Badge, Empty } from '../components/ui';
import { href } from '../lib/router';
import { useApp } from '../store';

export function Mails() {
  const s = useApp();
  const sent = s.mails.filter((m) => m.status === 'sent').length;
  return (
    <>
      <div className="page-head"><h1>메일 발송 이력</h1><p className="muted">성공 {sent}건 · 실패 {s.mails.length - sent}건</p></div>
      <section className="card flush">
        {s.mails.length === 0 ? <Empty>발송 이력이 없습니다.</Empty> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>일시</th><th>결과</th><th>받는 사람</th><th>제목</th><th>첨부</th><th>시도</th><th>발송자</th></tr></thead>
              <tbody>
                {s.mails.map((m) => (
                  <tr key={m.id} data-mail-row={m.status}>
                    <td className="nowrap">{m.at}</td>
                    <td><Badge tone={m.status === 'sent' ? 'green' : 'red'}>{m.status === 'sent' ? '성공' : '실패'}</Badge></td>
                    <td>{m.to}</td>
                    <td><a className="link" href={href(`/q/${m.quoteId}/mail`)}>{m.subject}</a>{m.error && <small className="error"> {m.error}</small>}</td>
                    <td className="mono small">{m.file}</td>
                    <td>{m.tries}회</td>
                    <td>{m.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
