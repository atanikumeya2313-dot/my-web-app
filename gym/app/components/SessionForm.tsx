'use client';
import { useEffect, useState } from 'react';
import { Session, SessionDraft, Entry, Exercise, Template, PART_ICON, StrengthSet } from '../types';
import { todayYMD, saveDraft, clearDraft, loadRestSec, saveRestSec } from '../lib/storage';
import ExercisePicker from './ExercisePicker';
import ExerciseHowto from './ExerciseHowto';
import RestTimer, { primeAudio } from './RestTimer';

interface Props {
  editing?: Session;
  initial?: SessionDraft;          // AIメニューから始めるとき／下書きの再開
  exercises: Exercise[];
  sessions: Session[];             // 前回の記録を出すため
  templates: Template[];
  onSave: (s: Session) => void;
  onDelete?: () => void;
  onAddExercise: (ex: Exercise) => void;
  onSaveTemplate: (t: Template) => void;
  onClose: () => void;
}

const REST_PRESETS = [60, 90, 120, 180];

// その種目の直近の記録（今編集中のセッションは除く）
function lastRecord(sessions: Session[], exerciseId: string, excludeId?: string): Entry | undefined {
  for (const s of sessions) {
    if (s.id === excludeId) continue;
    const e = s.entries.find(x => x.exerciseId === exerciseId);
    if (e) return e;
  }
  return undefined;
}

function entryVolume(e: Entry): number {
  return (e.sets ?? []).reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export default function SessionForm({
  editing, initial, exercises, sessions, templates,
  onSave, onDelete, onAddExercise, onSaveTemplate, onClose,
}: Props) {
  const [date, setDate] = useState(editing?.date ?? initial?.date ?? todayYMD());
  const [entries, setEntries] = useState<Entry[]>(editing?.entries ?? initial?.entries ?? []);
  const [memo, setMemo] = useState(editing?.memo ?? initial?.memo ?? '');
  const [planDay] = useState<number | undefined>(editing?.planDay ?? initial?.planDay);
  const [picking, setPicking] = useState(false);
  const [howtoFor, setHowtoFor] = useState<Entry | null>(null);

  // 休憩タイマー
  const [restSec, setRestSec] = useState(90);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(90);
  const [showRestSetting, setShowRestSetting] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setRestSec(loadRestSec()); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 入力途中で閉じても消えないよう、変更のたびに下書きを保存する（新規記録のときだけ）
  useEffect(() => {
    if (editing) return;
    if (entries.length === 0 && !memo.trim()) { clearDraft(); return; }
    saveDraft({ date, entries, memo: memo.trim() || undefined, planDay });
  }, [editing, date, entries, memo, planDay]);

  function startRest(sec: number) {
    primeAudio();                       // タップの瞬間に音を出せる状態にしておく
    setRestTotal(sec);
    // eslint-disable-next-line react-hooks/purity -- タップ時のみ呼ばれるハンドラ（レンダー中ではない）
    setRestEndAt(Date.now() + sec * 1000);
  }

  function addExerciseToSession(ex: Exercise) {
    const prev = lastRecord(sessions, ex.id, editing?.id);
    const entry: Entry = {
      exerciseId: ex.id, name: ex.name, part: ex.part, kind: ex.kind,
      ...(ex.kind === 'strength'
        // 前回と同じ重量・回数を初期値に（毎回入れ直さなくていいように）
        ? { sets: prev?.sets?.length ? prev.sets.map(s => ({ ...s })) : [{ weight: 0, reps: 10 }] }
        : { durationMin: prev?.durationMin ?? 20, distanceKm: prev?.distanceKm }),
    };
    setEntries(list => [...list, entry]);
    setPicking(false);
  }

  function updateEntry(i: number, patch: Partial<Entry>) {
    setEntries(list => list.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  }
  function removeEntry(i: number) {
    setEntries(list => list.filter((_, idx) => idx !== i));
  }
  function updateSet(i: number, si: number, patch: Partial<StrengthSet>) {
    setEntries(list => list.map((e, idx) => idx === i
      ? { ...e, sets: (e.sets ?? []).map((s, j) => j === si ? { ...s, ...patch } : s) }
      : e));
  }
  function addSet(i: number) {
    setEntries(list => list.map((e, idx) => {
      if (idx !== i) return e;
      const sets = e.sets ?? [];
      const last = sets[sets.length - 1] ?? { weight: 0, reps: 10 };
      return { ...e, sets: [...sets, { ...last }] };
    }));
  }
  function removeSet(i: number, si: number) {
    setEntries(list => list.map((e, idx) => idx === i
      ? { ...e, sets: (e.sets ?? []).filter((_, j) => j !== si) }
      : e));
  }

  function applyTemplate(id: string) {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    const added: Entry[] = [];
    t.exerciseIds.forEach(exId => {
      if (entries.some(e => e.exerciseId === exId)) return;
      const ex = exercises.find(x => x.id === exId);
      if (!ex) return;
      const prev = lastRecord(sessions, ex.id, editing?.id);
      added.push({
        exerciseId: ex.id, name: ex.name, part: ex.part, kind: ex.kind,
        ...(ex.kind === 'strength'
          ? { sets: prev?.sets?.length ? prev.sets.map(s => ({ ...s })) : [{ weight: 0, reps: 10 }] }
          : { durationMin: prev?.durationMin ?? 20, distanceKm: prev?.distanceKm }),
      });
    });
    if (added.length) setEntries(list => [...list, ...added]);
  }

  function saveAsTemplate() {
    if (entries.length === 0) return;
    const name = prompt('テンプレートの名前（例: 胸の日）');
    if (!name?.trim()) return;
    onSaveTemplate({ id: `tpl_${Date.now()}`, name: name.trim(), exerciseIds: entries.map(e => e.exerciseId) });
    alert('テンプレートに保存しました');
  }

  function save() {
    if (entries.length === 0) { alert('種目を1つ以上追加してください'); return; }
    onSave({
      id: editing?.id ?? `s_${Date.now()}`,
      date,
      entries,
      memo: memo.trim() || undefined,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      planDay,
    });
  }

  const totalVolume = entries.reduce((sum, e) => sum + entryVolume(e), 0);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">
            {editing ? '記録を編集' : '今日のトレーニング'}
            {planDay !== undefined && <span className="text-xs font-medium text-gray-400 ml-1.5">Day{planDay + 1}</span>}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowRestSetting(v => !v)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-rose-50 text-rose-500 font-medium">⏱{restSec}秒</button>
            <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
          </div>
        </div>

        {showRestSetting && (
          <div className="px-4 py-2.5 bg-rose-50/60 border-b border-rose-100">
            <p className="text-[11px] text-gray-500 mb-1.5">休憩の長さ（セット横の⏱で開始）</p>
            <div className="flex gap-1.5">
              {REST_PRESETS.map(s => (
                <button key={s} onClick={() => { setRestSec(s); saveRestSec(s); setShowRestSetting(false); }}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium ${restSec === s ? 'bg-rose-500 text-white' : 'bg-white text-gray-500'}`}>
                  {s < 60 ? `${s}秒` : `${s / 60}分`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300" />
            {templates.length > 0 && (
              <select defaultValue="" onChange={e => { applyTemplate(e.target.value); e.target.value = ''; }}
                className="ml-auto border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white text-gray-600">
                <option value="">テンプレから追加</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          {entries.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">下の「種目を追加」から、やった種目を足していきましょう</p>
          )}

          {entries.map((e, i) => {
            const prev = lastRecord(sessions, e.exerciseId, editing?.id);
            return (
              <div key={`${e.exerciseId}_${i}`} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-800 flex-1 min-w-0 truncate">
                    {PART_ICON[e.part]} {e.name}
                  </p>
                  <button onClick={() => setHowtoFor(e)} title="やり方を見る"
                    className="shrink-0 w-7 h-7 rounded-full bg-white text-gray-400 text-xs flex items-center justify-center">ⓘ</button>
                  <button onClick={() => removeEntry(i)} className="text-gray-300 text-sm w-7 h-7 flex items-center justify-center">✕</button>
                </div>

                {e.kind === 'strength' ? (
                  <>
                    {prev?.sets?.length ? (
                      <p className="text-[11px] text-gray-400 mb-1.5">
                        前回: {prev.sets.map(s => `${s.weight}kg×${s.reps}`).join(' / ')}
                      </p>
                    ) : null}
                    <div className="space-y-1.5">
                      {(e.sets ?? []).map((s, si) => (
                        <div key={si} className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-400 w-8 shrink-0">{si + 1}set</span>
                          <input type="number" inputMode="decimal" step="2.5" value={s.weight || ''}
                            onChange={ev => updateSet(i, si, { weight: Number(ev.target.value) || 0 })}
                            className="w-16 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300" />
                          <span className="text-xs text-gray-400">kg ×</span>
                          <input type="number" inputMode="numeric" value={s.reps || ''}
                            onChange={ev => updateSet(i, si, { reps: Number(ev.target.value) || 0 })}
                            className="w-14 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300" />
                          <span className="text-xs text-gray-400">回</span>
                          <button onClick={() => startRest(restSec)} title="休憩タイマーを開始"
                            className="ml-auto shrink-0 w-8 h-8 rounded-full bg-white text-rose-500 text-sm flex items-center justify-center active:scale-90 transition-transform">
                            ⏱
                          </button>
                          {(e.sets ?? []).length > 1 && (
                            <button onClick={() => removeSet(i, si)} className="shrink-0 text-gray-300 text-xs w-5 h-5 flex items-center justify-center">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => addSet(i)} className="text-xs px-3 py-1.5 rounded-full bg-rose-50 text-rose-500 font-medium">＋ セット</button>
                      <span className="text-[11px] text-gray-400 ml-auto">
                        ボリューム {Math.round(entryVolume(e)).toLocaleString()}kg
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {prev && (prev.durationMin || prev.distanceKm) ? (
                      <p className="text-[11px] text-gray-400 mb-1.5">
                        前回: {prev.durationMin ? `${prev.durationMin}分` : ''}{prev.distanceKm ? ` / ${prev.distanceKm}km` : ''}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-1.5">
                      <input type="number" inputMode="numeric" value={e.durationMin ?? ''}
                        onChange={ev => updateEntry(i, { durationMin: Number(ev.target.value) || undefined })}
                        className="w-20 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300" />
                      <span className="text-xs text-gray-400">分</span>
                      <input type="number" inputMode="decimal" step="0.1" value={e.distanceKm ?? ''}
                        onChange={ev => updateEntry(i, { distanceKm: Number(ev.target.value) || undefined })}
                        className="w-20 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300" />
                      <span className="text-xs text-gray-400">km</span>
                    </div>
                  </>
                )}

                <input value={e.memo ?? ''} onChange={ev => updateEntry(i, { memo: ev.target.value || undefined })}
                  placeholder="メモ（フォーム・きつさなど）"
                  className="w-full mt-2 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
            );
          })}

          <button onClick={() => setPicking(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-rose-300 text-rose-500 text-sm font-bold">
            ＋ 種目を追加
          </button>

          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
            placeholder="今日のメモ（体調・混み具合など）"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300" />

          {entries.length > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{entries.length}種目 / 総ボリューム <b className="text-gray-700">{Math.round(totalVolume).toLocaleString()}kg</b></span>
              <button onClick={saveAsTemplate} className="text-rose-500 font-medium">この構成をテンプレに保存</button>
            </div>
          )}

          {!editing && entries.length > 0 && (
            <p className="text-[11px] text-gray-400 text-center">入力は自動で保存されます。閉じても続きから再開できます。</p>
          )}
        </div>

        {restEndAt !== null && (
          <RestTimer endAt={restEndAt} total={restTotal}
            onExtend={sec => setRestEndAt(at => (at ?? Date.now()) + sec * 1000)}
            onStop={() => setRestEndAt(null)} />
        )}

        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          {onDelete && (
            <button onClick={() => { if (confirm('この記録を削除しますか？')) onDelete(); }}
              className="px-4 py-3 rounded-xl border border-red-200 text-red-500 text-sm font-bold">削除</button>
          )}
          <button onClick={save} className="flex-1 py-3 rounded-xl bg-rose-500 text-white text-sm font-bold active:scale-[.98] transition-transform">
            保存する
          </button>
        </div>
      </div>

      {picking && (
        <ExercisePicker exercises={exercises} onPick={addExerciseToSession}
          onCreate={onAddExercise} onClose={() => setPicking(false)} />
      )}
      {howtoFor && (
        <ExerciseHowto name={howtoFor.name} part={howtoFor.part} onClose={() => setHowtoFor(null)} />
      )}
    </div>
  );
}
