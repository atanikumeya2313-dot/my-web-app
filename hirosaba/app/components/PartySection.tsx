'use client';
import { useEffect, useState } from 'react';
import { Party, Character, Collection, PARTY_MAX_CHARS, PARTY_MAX_COLLECTIONS } from '../types';
import { loadParties, saveParties, loadChars, loadCollections } from '../lib/storage';

let seq = 0;
const newId = () => `${Date.now()}_${seq++}`;
const fmtPower = (n: number) => n.toLocaleString();

export default function PartySection() {
  const [parties, setParties] = useState<Party[]>([]);
  const [chars, setChars]     = useState<Character[]>([]);
  const [colls, setColls]     = useState<Collection[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Party | undefined>();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setParties(loadParties());
    setChars(loadChars());
    setColls(loadCollections());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const charMap = new Map(chars.map(c => [c.id, c]));
  const collMap = new Map(colls.map(c => [c.id, c]));

  function persist(next: Party[]) { setParties(next); saveParties(next); }
  // 合計戦闘力＝編成キャラ＋編成コレクションの戦闘力
  const totalPower = (p: Party) =>
    p.charIds.reduce((s, id) => s + (charMap.get(id)?.power ?? 0), 0)
    + p.collectionIds.reduce((s, id) => s + (collMap.get(id)?.power ?? 0), 0);

  return (
    <div>
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {chars.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">先に「キャラ」タブでキャラを登録すると、パーティを編成できます</p>
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">右下の＋から、キャラ3人＋コレクション4つでパーティを組みましょう</p>
          </div>
        ) : (
          <div className="space-y-3">
            {parties.map(p => {
              const members = p.charIds.map(id => charMap.get(id)).filter(Boolean) as Character[];
              const cols    = p.collectionIds.map(id => collMap.get(id)).filter(Boolean) as Collection[];
              return (
                <div key={p.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-left min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 truncate">{p.name || '無名パーティ'}</p>
                    </button>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[10px] text-gray-400">合計戦闘力</p>
                      <p className="text-xl font-bold text-slate-600">{fmtPower(totalPower(p))}</p>
                    </div>
                  </div>

                  {/* キャラ3枠 */}
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: PARTY_MAX_CHARS }).map((_, i) => {
                      const c = members[i];
                      return (
                        <div key={i} className={`rounded-lg p-2 text-center ${c ? 'bg-slate-50' : 'bg-gray-50 border border-dashed border-gray-200'}`}>
                          {c ? (
                            <>
                              <p className="text-[11px] font-medium text-gray-700 truncate mt-1">{c.name}</p>
                              <p className="text-[10px] text-gray-400">{fmtPower(c.power)}</p>
                            </>
                          ) : <p className="text-gray-300 text-lg py-2">＋</p>}
                        </div>
                      );
                    })}
                  </div>

                  {/* コレクション4枠 */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {Array.from({ length: PARTY_MAX_COLLECTIONS }).map((_, i) => {
                      const c = cols[i];
                      return (
                        <div key={i} className={`rounded-lg py-1.5 text-center ${c ? 'bg-slate-50' : 'bg-gray-50 border border-dashed border-gray-200'}`}>
                          {c ? (
                            <>
                              <p className="text-[9px] text-gray-500 truncate px-1 mt-0.5">{c.name}</p>
                            </>
                          ) : <p className="text-gray-300 text-sm">＋</p>}
                        </div>
                      );
                    })}
                  </div>

                  {p.memo && <p className="text-[11px] text-gray-400 mt-2">{p.memo}</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {chars.length > 0 && (
        <button onClick={() => { setEditing(undefined); setShowForm(true); }} aria-label="パーティを追加"
          style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
          className="fixed right-4 w-14 h-14 bg-slate-600 text-white rounded-full text-2xl shadow-lg active:scale-90 transition-transform flex items-center justify-center z-40">
          ＋
        </button>
      )}

      {showForm && (
        <PartyForm editing={editing} chars={chars} colls={colls}
          onSave={p => {
            const exists = parties.some(x => x.id === p.id);
            persist(exists ? parties.map(x => x.id === p.id ? p : x) : [p, ...parties]);
            setShowForm(false); setEditing(undefined);
          }}
          onDelete={editing ? () => { persist(parties.filter(x => x.id !== editing.id)); setShowForm(false); setEditing(undefined); } : undefined}
          onClose={() => { setShowForm(false); setEditing(undefined); }} />
      )}
    </div>
  );
}

// ── 編成フォーム ──
function PartyForm({ editing, chars, colls, onSave, onDelete, onClose }: {
  editing?: Party;
  chars: Character[];
  colls: Collection[];
  onSave: (p: Party) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [charIds, setCharIds] = useState<string[]>(editing?.charIds.filter(id => chars.some(c => c.id === id)) ?? []);
  const [collIds, setCollIds] = useState<string[]>(editing?.collectionIds.filter(id => colls.some(c => c.id === id)) ?? []);
  const [memo, setMemo] = useState(editing?.memo ?? '');

  function toggleChar(id: string) {
    setCharIds(prev => prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length < PARTY_MAX_CHARS ? [...prev, id] : prev);
  }
  function toggleColl(id: string) {
    setCollIds(prev => prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length < PARTY_MAX_COLLECTIONS ? [...prev, id] : prev);
  }

  const total = charIds.reduce((s, id) => s + (chars.find(c => c.id === id)?.power ?? 0), 0)
    + collIds.reduce((s, id) => s + (colls.find(c => c.id === id)?.power ?? 0), 0);

  function submit() {
    onSave({
      id: editing?.id ?? newId(),
      name: name.trim(),
      charIds, collectionIds: collIds, memo: memo.trim(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{editing ? 'パーティを編集' : 'パーティを編成'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        {/* 合計戦闘力（固定表示） */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">選択中の合計戦闘力</span>
          <span className="text-lg font-bold text-slate-600">{fmtPower(total)}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">パーティ名</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例：攻略メイン"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>

          {/* キャラ選択 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">キャラ（{charIds.length}/{PARTY_MAX_CHARS}）</label>
              {charIds.length >= PARTY_MAX_CHARS && <span className="text-[10px] text-gray-400">上限に達しました</span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {chars.map(c => {
                const on = charIds.includes(c.id);
                const order = charIds.indexOf(c.id) + 1;
                return (
                  <button key={c.id} onClick={() => toggleChar(c.id)}
                    className={`relative rounded-lg p-2 text-center border ${on ? 'border-slate-500 bg-slate-50' : 'border-gray-200'}`}>
                    {on && <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-500 text-white text-[10px] flex items-center justify-center">{order}</span>}
                    <p className="text-[11px] font-medium text-gray-700 truncate mt-1">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{fmtPower(c.power)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* コレクション選択 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">コレクション（{collIds.length}/{PARTY_MAX_COLLECTIONS}）</label>
              {collIds.length >= PARTY_MAX_COLLECTIONS && <span className="text-[10px] text-gray-400">上限に達しました</span>}
            </div>
            {colls.length === 0 ? (
              <p className="text-[11px] text-gray-400">「コレクション」タブで登録すると選べます</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {colls.map(c => {
                  const on = collIds.includes(c.id);
                  const order = collIds.indexOf(c.id) + 1;
                  return (
                    <button key={c.id} onClick={() => toggleColl(c.id)}
                      className={`relative rounded-lg py-1.5 text-center border ${on ? 'border-slate-500 bg-slate-50' : 'border-gray-200'}`}>
                      {on && <span className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-slate-500 text-white text-[9px] flex items-center justify-center">{order}</span>}
                      <p className="text-[9px] text-gray-500 truncate px-1 mt-0.5">{c.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
              placeholder="編成の狙い・相性など"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
          </div>
        </div>

        <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-gray-100 flex gap-2">
          {onDelete && (
            <button onClick={() => { if (confirm('このパーティを削除しますか？')) onDelete(); }}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium">削除</button>
          )}
          <button onClick={submit} disabled={charIds.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-slate-600 text-white text-sm font-bold disabled:opacity-40">
            {editing ? '更新' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
