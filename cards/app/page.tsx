'use client';
import { useEffect, useRef, useState } from 'react';
import { Deck, Card, Grade, DraftCard } from './types';
import {
  loadDecks, saveDecks, loadCards, saveCards, newCard,
  dueCards, deckStats, schedule, toYMD, exportData, importData,
} from './lib/storage';
import GenerateModal from './components/GenerateModal';
import CloudSync from './components/CloudSync';
import StudyView from './components/StudyView';

export default function Home() {
  const [decks,      setDecks]      = useState<Deck[]>([]);
  const [cards,      setCards]      = useState<Card[]>([]);
  const [view,       setView]       = useState<'home' | 'deck'>('home');
  const [deckId,     setDeckId]     = useState<string | null>(null);
  const [showGen,    setShowGen]    = useState(false);
  const [studying,   setStudying]   = useState(false);
  const [editing,    setEditing]    = useState<Card | null>(null);
  const [showCloud, setShowCloud] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const today = toYMD(new Date());

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDecks(loadDecks());
    setCards(loadCards());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const deck = decks.find(d => d.id === deckId) ?? null;
  const deckCards = cards.filter(c => c.deckId === deckId);

  // ── デッキ操作 ──────────────────────────────────
  function createDeck() {
    const name = window.prompt('デッキ名（科目・テーマ）')?.trim();
    if (!name) return;
    const d: Deck = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
    const next = [...decks, d];
    setDecks(next); saveDecks(next);
    setDeckId(d.id); setView('deck');
  }
  function renameDeck() {
    if (!deck) return;
    const name = window.prompt('デッキ名を変更', deck.name)?.trim();
    if (!name) return;
    const next = decks.map(d => d.id === deck.id ? { ...d, name } : d);
    setDecks(next); saveDecks(next);
  }
  function deleteDeck() {
    if (!deck) return;
    if (!window.confirm(`「${deck.name}」とカード${deckCards.length}枚を削除しますか？`)) return;
    const nextDecks = decks.filter(d => d.id !== deck.id);
    const nextCards = cards.filter(c => c.deckId !== deck.id);
    setDecks(nextDecks); saveDecks(nextDecks);
    setCards(nextCards); saveCards(nextCards);
    setView('home'); setDeckId(null);
  }

  // ── カード操作 ──────────────────────────────────
  function addDrafts(drafts: DraftCard[]) {
    if (!deckId) return;
    const created = drafts.map(d => newCard(deckId, d.front, d.back, d.explanation || undefined));
    const next = [...cards, ...created];
    setCards(next); saveCards(next);
    setShowGen(false);
  }
  function addManual() {
    if (!deckId) return;
    const c = newCard(deckId, '', '');
    setEditing(c);
  }
  function saveCard(card: Card) {
    if (!card.front.trim() || !card.back.trim()) { setEditing(null); return; }
    const exists = cards.some(c => c.id === card.id);
    const next = exists ? cards.map(c => c.id === card.id ? card : c) : [...cards, card];
    setCards(next); saveCards(next);
    setEditing(null);
  }
  function deleteCard(id: string) {
    const next = cards.filter(c => c.id !== id);
    setCards(next); saveCards(next);
    setEditing(null);
  }
  function handleGrade(card: Card, grade: Grade) {
    const { level, due } = schedule(card.level, grade, today);
    setCards(prev => {
      const next = prev.map(c => c.id === card.id ? { ...c, level, due } : c);
      saveCards(next);
      return next;
    });
  }

  // ── バックアップ ────────────────────────────────
  function handleExport() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `暗記カード_backup_${today}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!window.confirm('現在のデータを上書きします。よろしいですか？')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        if (importData(JSON.parse(ev.target?.result as string))) {
          setDecks(loadDecks()); setCards(loadCards());
          alert('取り込みました');
        } else alert('取り込みに失敗しました');
      } catch { alert('JSONの読み込みに失敗しました'); }
    };
    reader.readAsText(file);
  }

  const due = deck ? dueCards(cards, deck.id, today) : [];

  // ── 学習画面 ────────────────────────────────────
  if (studying && deck) {
    return (
      <StudyView
        initial={dueCards(cards, deck.id, today)}
        onGrade={handleGrade}
        onClose={() => setStudying(false)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* ── ホーム（デッキ一覧） ── */}
      {view === 'home' && (
        <>
          <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
              <h1 className="text-base font-bold text-gray-800">📇 暗記カード</h1>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowCloud(true)} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">☁️同期</button>
                <button onClick={handleExport} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">書き出し</button>
                <button onClick={() => importRef.current?.click()} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">読み込み</button>
                <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                {showCloud && <CloudSync bucket="cards" serialize={() => JSON.stringify(exportData())} apply={(j) => { try { return importData(JSON.parse(j)); } catch { return false; } }} onClose={() => setShowCloud(false)} />}
              </div>
            </div>
          </header>

          <main className="max-w-lg mx-auto px-4 py-4 space-y-2">
            {decks.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-5xl mb-3">📇</p>
                <p className="text-gray-400 text-sm">デッキを作って、AIでカードを追加しましょう</p>
              </div>
            ) : (
              decks.map(d => {
                const { total, due } = deckStats(cards, d.id, today);
                return (
                  <button key={d.id} onClick={() => { setDeckId(d.id); setView('deck'); }}
                    className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left active:scale-[.99] transition-transform">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{d.name}</p>
                      <p className="text-xs text-gray-400">{total}枚</p>
                    </div>
                    {due > 0 ? (
                      <span className="shrink-0 text-xs font-bold bg-indigo-100 text-indigo-600 rounded-full px-3 py-1">復習 {due}</span>
                    ) : (
                      <span className="shrink-0 text-xs text-gray-300">完了</span>
                    )}
                  </button>
                );
              })
            )}
          </main>

          <button onClick={createDeck}
            className="fixed bottom-6 right-4 h-12 pl-4 pr-5 bg-indigo-500 text-white rounded-full text-sm font-semibold shadow-lg active:scale-95 transition flex items-center gap-1.5 z-40">
            ＋ デッキ作成
          </button>
        </>
      )}

      {/* ── デッキ詳細 ── */}
      {view === 'deck' && deck && (
        <>
          <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
              <button onClick={() => { setView('home'); setDeckId(null); }} className="text-gray-400 text-sm shrink-0">‹ 一覧</button>
              <h1 className="text-sm font-bold text-gray-800 truncate flex-1 text-center">{deck.name}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={renameDeck} className="text-xs text-gray-400">名前</button>
                <button onClick={deleteDeck} className="text-xs text-red-400">削除</button>
              </div>
            </div>
          </header>

          <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
            {/* 復習ボタン */}
            <button onClick={() => due.length > 0 && setStudying(true)} disabled={due.length === 0}
              className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${due.length > 0 ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {due.length > 0 ? `今日の復習を始める（${due.length}枚）` : '今日の復習は完了 🎉'}
            </button>

            {/* 追加ボタン */}
            <div className="flex gap-2">
              <button onClick={() => setShowGen(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center gap-1.5">
                ✨ AIで作成
              </button>
              <button onClick={addManual}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600">＋手動</button>
            </div>

            {/* カード一覧 */}
            {deckCards.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-12">まだカードがありません</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">{deckCards.length}枚</p>
                {deckCards.map(c => (
                  <button key={c.id} onClick={() => setEditing(c)}
                    className="w-full bg-white rounded-xl shadow-sm p-3 text-left active:scale-[.99] transition-transform">
                    <p className="text-sm font-semibold text-gray-800 truncate">{c.front}</p>
                    <p className="text-xs text-indigo-500 truncate mt-0.5">{c.back}</p>
                  </button>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* ── AI生成モーダル ── */}
      {showGen && deck && (
        <GenerateModal deckName={deck.name} onAdd={addDrafts} onClose={() => setShowGen(false)} />
      )}

      {/* ── カード編集モーダル ── */}
      {editing && (
        <CardEditor card={editing} onSave={saveCard} onDelete={deleteCard} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

// ── カード編集（手動追加・編集） ──────────────────────
function CardEditor({ card, onSave, onDelete, onClose }: {
  card: Card; onSave: (c: Card) => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  const [front, setFront] = useState(card.front);
  const [back,  setBack]  = useState(card.back);
  const [exp,   setExp]   = useState(card.explanation ?? '');
  const isNew = card.front === '' && card.back === '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <h2 className="text-sm font-bold text-gray-700">{isNew ? 'カードを追加' : 'カードを編集'}</h2>
        <div>
          <p className="text-xs text-gray-400 mb-1">問題</p>
          <textarea value={front} onChange={e => setFront(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">答え</p>
          <textarea value={back} onChange={e => setBack(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">解説（任意）</p>
          <textarea value={exp} onChange={e => setExp(e.target.value)} rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">キャンセル</button>
          <button onClick={() => onSave({ ...card, front: front.trim(), back: back.trim(), explanation: exp.trim() || undefined })}
            disabled={!front.trim() || !back.trim()}
            className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-bold disabled:opacity-40">保存</button>
        </div>
        {!isNew && (
          <button onClick={() => { if (window.confirm('このカードを削除しますか？')) onDelete(card.id); }}
            className="w-full py-2 text-sm font-medium text-red-500">このカードを削除</button>
        )}
      </div>
    </div>
  );
}
