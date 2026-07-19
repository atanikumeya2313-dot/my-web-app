'use client';
import { useEffect, useState } from 'react';
import { cloudPush, cloudPull, CODE_KEY } from '../lib/cloud';

interface Props {
  serialize: () => string;            // 現在のデータをJSON文字列に
  apply: (json: string) => boolean;   // 取得したJSONを適用（成功でtrue）
  onClose: () => void;
}

export default function CloudSync({ serialize, apply, onClose }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'' | 'push' | 'pull'>('');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { try { setCode(localStorage.getItem(CODE_KEY) ?? ''); } catch {} }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveCode = (v: string) => { setCode(v); try { localStorage.setItem(CODE_KEY, v.trim()); } catch {} };

  async function doPush() {
    const c = code.trim();
    if (c.length < 4) { setMsg({ t: '同期コードは4文字以上にしてください', ok: false }); return; }
    setBusy('push'); setMsg(null);
    try {
      await cloudPush(c, serialize());
      setMsg({ t: 'クラウドに保存しました。他の端末・アイコンで同じコードで「復元」できます。', ok: true });
    } catch (e) {
      setMsg({ t: (e as Error).message, ok: false });
    } finally { setBusy(''); }
  }

  async function doPull() {
    const c = code.trim();
    if (c.length < 4) { setMsg({ t: '同期コードは4文字以上にしてください', ok: false }); return; }
    if (!confirm('クラウドの内容で、この端末の現在のデータを上書きします。よろしいですか？')) return;
    setBusy('pull'); setMsg(null);
    try {
      const { json, at } = await cloudPull(c);
      if (!json) { setMsg({ t: 'このコードのデータはまだクラウドにありません。先に「保存」してください。', ok: false }); return; }
      if (!apply(json)) { setMsg({ t: '取り込みに失敗しました（データ形式が不正）。', ok: false }); return; }
      setMsg({ t: `復元しました${at ? `（保存: ${new Date(at).toLocaleString('ja-JP')}）` : ''}。画面を更新します…`, ok: true });
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      const m = (e as Error).message || '';
      setMsg({ t: /decrypt|復号|operation-specific|OperationError/i.test(m) ? '同期コードが違うため復号できませんでした。' : m, ok: false });
    } finally { setBusy(''); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800 flex items-center gap-1.5">☁️ クラウド同期</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          <p className="text-xs text-gray-500 leading-relaxed">
            同じ<b>同期コード（合言葉）</b>を使えば、他の端末やホーム画面アイコンでも同じデータを共有できます。
            データは<b>この端末で暗号化</b>してから送るので、クラウドには暗号文しか残りません。
          </p>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">同期コード（合言葉・4文字以上）</label>
            <input value={code} onChange={e => saveCode(e.target.value)}
              placeholder="例: my-home-2026"
              autoCapitalize="off" autoCorrect="off" spellCheck={false}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <p className="text-[11px] text-gray-400 mt-1">忘れると復元できません。推測されにくい語にしてください。</p>
          </div>

          <div className="flex gap-2">
            <button onClick={doPush} disabled={busy !== ''}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy === 'push' && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              ⬆️ クラウドに保存
            </button>
            <button onClick={doPull} disabled={busy !== ''}
              className="flex-1 py-2.5 rounded-xl border border-blue-300 text-blue-600 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy === 'pull' && <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />}
              ⬇️ クラウドから復元
            </button>
          </div>

          {msg && (
            <p className={`text-xs rounded-lg px-3 py-2 ${msg.ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {msg.t}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
