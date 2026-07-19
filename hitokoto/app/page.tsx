'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Entry, loadEntries, saveEntries, todayYMD, fmtDate,
  exportEntries, importEntries,
} from './lib/storage';
import CloudSync from './components/CloudSync';
import { useAutoSync } from './lib/autoSync';
import CalendarView from './components/CalendarView';
import Reflection from './components/Reflection';
import VoiceInput from './components/VoiceInput';

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'calendar' | 'reflect'>('home');
  const [query, setQuery] = useState('');
  const [selDate, setSelDate] = useState(todayYMD()); // 記録・編集する対象日（既定は今日／過去も選べる）
  const [showCloud, setShowCloud] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // localStorage はマウント後にのみ読めるため、ここでの setState は意図的
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setEntries(loadEntries()); }, []);
  useAutoSync({ bucket: 'diary', serialize: exportEntries, apply: importEntries, hasData: () => { try { return loadEntries().length > 0; } catch { return false; } } });
  /* eslint-enable react-hooks/set-state-in-effect */

  const today = todayYMD();
  const selEntry = entries.find(e => e.date === selDate);
  const past = entries.filter(e => e.date !== selDate);
  const q = query.trim().toLowerCase();
  const pastFiltered = q
    ? past.filter(e => e.text.toLowerCase().includes(q) || (e.comment || '').toLowerCase().includes(q))
    : past;

  // 別の日付を編集対象にする（入力欄・エラーはリセット）
  function pickDate(date: string) {
    setSelDate(date); setInput(''); setErr(null); setView('home');
  }

  async function fetchComment(date: string, text: string) {
    setLoadingDate(date);
    setErr(null);
    try {
      // basePath は raw fetch に自動付与されないため明示（ハブ /diary 配下で動かすため）。
      // 通信断は最大3回まで再試行。混雑/一時エラーの再試行はサーバー側で行う。
      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 65000);
        try {
          res = await fetch('/diary/api/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: ctrl.signal,
          });
        } catch (e) {
          if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
          throw e;
        } finally {
          clearTimeout(timer);
        }
        break;
      }
      // 本文が非JSONでも安全に処理
      let data: { comment?: string; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (res.ok && data?.comment) {
        const comment = data.comment;
        setEntries(prev => {
          const next = prev.map(e => e.date === date ? { ...e, comment } : e);
          saveEntries(next);
          return next;
        });
      } else {
        setErr(data?.error || 'AIの返事を取得できませんでした');
      }
    } catch (e) {
      setErr((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからもう一度お試しください。'
        : '通信に失敗しました。電波の良い場所で、少し待ってから再試行してください。');
    } finally {
      setLoadingDate(null);
    }
  }

  function handleRecord() {
    const text = input.trim();
    if (!text) return;
    const entry: Entry = { date: selDate, text, comment: '' };
    const next = [entry, ...entries.filter(e => e.date !== selDate)]
      .sort((a, b) => b.date.localeCompare(a.date));
    setEntries(next); saveEntries(next); setInput('');
    fetchComment(selDate, text);
  }

  function rewriteEntry() {
    if (selEntry) setInput(selEntry.text);
    const next = entries.filter(e => e.date !== selDate);
    setEntries(next); saveEntries(next); setErr(null);
  }

  function handleExport() {
    const blob = new Blob([exportEntries()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ひとこと日記_${today}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (confirm('現在の日記をバックアップ内容で上書きします。よろしいですか？')) {
        if (importEntries(ev.target?.result as string)) setEntries(loadEntries());
        else alert('このファイルは取り込めませんでした。');
      }
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-16">
      <header className="pt-8 pb-4 text-center">
        <h1 className="text-xl font-bold text-amber-800">ひとこと日記</h1>
        <p className="text-xs text-amber-700/60 mt-1">今日のひとことに、そっと一言かえします</p>
      </header>

      {/* タブ */}
      <div className="flex rounded-xl overflow-hidden border border-amber-200 text-xs mb-4">
        {([['home', '日記'], ['calendar', 'カレンダー'], ['reflect', 'ふりかえり']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 font-medium transition-colors ${view === v ? 'bg-amber-600 text-white' : 'bg-white text-amber-700/70'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'home' && (<>
      {/* 日付えらび（既定は今日／過去に遡って記録も可） */}
      <div className="flex items-center justify-between mb-3 px-1">
        <label className="flex items-center gap-2 text-xs text-amber-700/70">
          <span>日付</span>
          <input
            type="date"
            value={selDate}
            max={today}
            onChange={e => { if (e.target.value) pickDate(e.target.value); }}
            className="border border-amber-200 rounded-lg px-2 py-1 text-xs bg-white text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </label>
        {selDate !== today && (
          <button onClick={() => pickDate(today)} className="text-[11px] text-amber-600/80 hover:text-amber-700">今日に戻る</button>
        )}
      </div>

      {/* 選択日の記録 */}
      {!selEntry ? (
        <section className="bg-white rounded-2xl shadow-sm border border-amber-100/70 p-5">
          <p className="text-xs text-amber-700/70 mb-2">
            {fmtDate(selDate)}{selDate !== today && <span className="ml-1 text-amber-500/70">（あとから記録）</span>}
          </p>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={selDate === today ? '今日のひとこと…' : 'この日のひとこと…'}
            rows={3}
            maxLength={300}
            className="w-full resize-none border border-amber-100 rounded-xl px-4 py-3 text-sm bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <div className="mt-2">
            <VoiceInput onText={t => setInput(prev => {
              const joined = prev ? `${prev}${/\s$/.test(prev) ? '' : ' '}${t}` : t;
              return joined.slice(0, 300);
            })} />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-gray-300">{input.length}/300</span>
            <button
              onClick={handleRecord}
              disabled={!input.trim()}
              className="px-5 py-2 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 disabled:opacity-40 transition-colors">
              記録する
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-2xl shadow-sm border border-amber-100/70 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-amber-700/70">{fmtDate(selDate)}</p>
            <button onClick={rewriteEntry} className="text-[11px] text-amber-600/70 hover:text-amber-700">書き直す</button>
          </div>
          <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">{selEntry.text}</p>

          <div className="mt-4 pt-4 border-t border-amber-100/70">
            {loadingDate === selDate ? (
              <p className="text-sm text-amber-600/70 flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                AIが考えています…
              </p>
            ) : selEntry.comment ? (
              <div className="flex gap-2.5 items-start">
                <span className="text-lg leading-none mt-0.5">🪄</span>
                <p className="text-sm text-amber-900/90 leading-relaxed whitespace-pre-wrap">{selEntry.comment}</p>
              </div>
            ) : (
              <button
                onClick={() => fetchComment(selDate, selEntry.text)}
                className="text-sm text-amber-700 underline-offset-2 hover:underline">
                AIに一言もらう
              </button>
            )}
          </div>
        </section>
      )}

      {err && (
        <p className="mt-3 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>
      )}

      {/* 過去の記録 */}
      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold text-amber-700/70 mb-2 px-1">これまでのひとこと</h2>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="キーワードで検索"
            className="w-full mb-3 border border-amber-100 rounded-xl px-3 py-2 text-sm bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-300" />
          {pastFiltered.length === 0 ? (
            <p className="text-center text-xs text-amber-700/50 py-6">「{query.trim()}」に一致する記録はありません</p>
          ) : (
            <div className="space-y-3">
              {pastFiltered.map(e => (
                <div key={e.date} className="bg-white/70 rounded-2xl border border-amber-100/60 p-4">
                  <p className="text-[11px] text-amber-700/60 mb-1.5">{fmtDate(e.date)}</p>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{e.text}</p>
                  {e.comment ? (
                    <div className="mt-2.5 pt-2.5 border-t border-amber-100/60 flex gap-2 items-start">
                      <span className="text-base leading-none mt-0.5">🪄</span>
                      <p className="text-xs text-amber-900/80 leading-relaxed whitespace-pre-wrap">{e.comment}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => fetchComment(e.date, e.text)}
                      disabled={loadingDate === e.date}
                      className="mt-2 text-xs text-amber-600/80 hover:text-amber-700 disabled:opacity-50">
                      {loadingDate === e.date ? 'AIが考えています…' : 'AIに一言もらう'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      </>)}

      {view === 'calendar' && <CalendarView entries={entries} onPick={pickDate} />}
      {view === 'reflect'  && <Reflection entries={entries} />}

      {/* バックアップ */}
      <section className="mt-10 text-center">
        <div className="inline-flex gap-4 text-[11px] text-amber-700/50">
          <button onClick={() => setShowCloud(true)} className="text-blue-500 hover:text-blue-600 font-medium">☁️ クラウド同期</button>
          <span className="text-amber-200">|</span>
          <button onClick={handleExport} className="hover:text-amber-700">エクスポート</button>
          <span className="text-amber-200">|</span>
          <button onClick={() => fileRef.current?.click()} className="hover:text-amber-700">インポート</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
      </section>

      {showCloud && <CloudSync bucket="diary" serialize={exportEntries} apply={importEntries} onClose={() => setShowCloud(false)} />}
    </div>
  );
}
