'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Session, SessionDraft, Entry, Exercise, WeightLog, Template, Profile, Plan, MenuItem,
  Part, PARTS, PART_ICON, calcAge, calcBMI, bmiLabel,
} from './types';
import {
  loadSessions, saveSessions, loadExercises, saveExercises,
  loadWeights, saveWeights, loadTemplates, saveTemplates,
  loadProfile, saveProfile, loadPlan, savePlan, nextPlanDay,
  loadDraft, clearDraft, bestByExercise, findPRs, Best,
  todayYMD, calcStreak, monthCount, exportData, importData, hasData,
} from './lib/storage';
import { useAutoSync } from './lib/autoSync';
import CloudSync from './components/CloudSync';
import SessionForm from './components/SessionForm';
import MenuAI from './components/MenuAI';
import ProfileForm from './components/ProfileForm';
import ExerciseChart from './components/ExerciseChart';
import ExerciseHowto from './components/ExerciseHowto';

function ymOf(d: string) { return d.slice(0, 7); }
function mdLabel(d: string) {
  const [y, m, dd] = d.split('-').map(Number);
  const w = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, dd).getDay()];
  return `${m}/${dd}（${w}）`;
}
function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function sessionVolume(s: Session): number {
  return s.entries.reduce((sum, e) => sum + (e.sets ?? []).reduce((v, st) => v + st.weight * st.reps, 0), 0);
}

export default function Home() {
  const [sessions,  setSessions]  = useState<Session[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [weights,   setWeights]   = useState<WeightLog[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [profile,   setProfile]   = useState<Profile>({});
  const [plan,      setPlan]      = useState<Plan | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Session | undefined>();
  const [formInit, setFormInit] = useState<SessionDraft | undefined>();
  const [savedDraft, setSavedDraft] = useState<SessionDraft | null>(null);
  const [prs, setPrs] = useState<Best[]>([]);
  const [chartEx, setChartEx] = useState<{ id: string; name: string } | null>(null);
  const [howtoFor, setHowtoFor] = useState<{ name: string; part?: string } | null>(null);
  const [showAI,      setShowAI]      = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCloud,   setShowCloud]   = useState(false);
  const [showBest,    setShowBest]    = useState(false);
  const [dayTab, setDayTab] = useState<number | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSessions(loadSessions());
    setExercises(loadExercises());
    setWeights(loadWeights());
    setTemplates(loadTemplates());
    setProfile(loadProfile());
    setPlan(loadPlan());
    setSavedDraft(loadDraft());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useAutoSync({
    bucket: 'gym',
    serialize: exportData,
    apply: (j) => importData(j),
    hasData,
  });

  function persistSessions(next: Session[]) {
    const sorted = [...next].sort((a, b) => b.date.localeCompare(a.date));
    setSessions(sorted); saveSessions(sorted);
  }
  function addExercise(ex: Exercise) {
    const next = [...exercises, ex];
    setExercises(next); saveExercises(next);
  }
  function addTemplate(t: Template) {
    const next = [...templates, t];
    setTemplates(next); saveTemplates(next);
  }

  function closeForm() {
    setShowForm(false); setEditing(undefined); setFormInit(undefined);
    setSavedDraft(loadDraft());
  }

  function handleSave(s: Session) {
    const exists = sessions.some(x => x.id === s.id);
    setPrs(findPRs(s, sessions));   // 保存前の記録と比べて自己ベスト更新を判定
    persistSessions(exists ? sessions.map(x => x.id === s.id ? s : x) : [s, ...sessions]);
    clearDraft(); setSavedDraft(null);
    setShowForm(false); setEditing(undefined); setFormInit(undefined);
    setDayTab(null);   // 次に開いたとき、次のDayが選ばれるように
  }
  function handleDelete(id: string) {
    persistSessions(sessions.filter(s => s.id !== id));
    setShowForm(false); setEditing(undefined); setFormInit(undefined);
  }
  function discardDraft() {
    if (!confirm('作りかけの記録を破棄しますか？')) return;
    clearDraft(); setSavedDraft(null);
  }

  // AIメニューの種目 → 記録フォームの下書き（種目マスターに無ければ追加）
  function entriesFromItems(items: MenuItem[]): Entry[] {
    const master = [...exercises];
    const entries: Entry[] = items.map(it => {
      const name = it.name.trim();
      let ex = master.find(x => x.name === name) ?? master.find(x => x.name.includes(name) || name.includes(x.name));
      if (!ex) {
        const part = (PARTS as string[]).includes(it.part) ? it.part as Part : 'その他';
        ex = { id: `ex_${Date.now()}_${master.length}`, name, part, kind: part === '有酸素' ? 'cardio' : 'strength' };
        master.push(ex);
      }
      const reps = Number((it.reps.match(/\d+/) ?? ['10'])[0]) || 10;
      const setCount = Math.min(Math.max(it.sets ?? 3, 1), 8);
      // その種目の前回の重量を引き継ぐ（AIは重量までは決められないため）
      const prev = sessions.flatMap(s => s.entries).find(e => e.exerciseId === ex!.id);
      return {
        exerciseId: ex.id, name: ex.name, part: ex.part, kind: ex.kind,
        ...(ex.kind === 'strength'
          ? { sets: Array.from({ length: setCount }, (_, i) => ({ weight: prev?.sets?.[i]?.weight ?? prev?.sets?.[0]?.weight ?? 0, reps })) }
          : { durationMin: /分/.test(it.reps) ? reps : 20 }),
      };
    });
    if (master.length !== exercises.length) { setExercises(master); saveExercises(master); }
    return entries;
  }

  function startFromPlanDay(dayIndex: number) {
    if (!plan?.days[dayIndex]) return;
    if (savedDraft && !confirm('作りかけの記録があります。破棄してこのメニューで始めますか？')) return;
    setEditing(undefined);
    setFormInit({ date: todayYMD(), entries: entriesFromItems(plan.days[dayIndex].items), planDay: dayIndex });
    setShowForm(true);
  }

  function handleSavePlan(p: Plan) {
    setPlan(p); savePlan(p);
    setShowAI(false); setDayTab(null);
  }
  function handleSaveProfile(p: Profile) {
    setProfile(p); saveProfile(p);
    setShowProfile(false);
  }

  function saveWeight() {
    const v = Number(weightInput);
    if (!v || v <= 0) return;
    const today = todayYMD();
    const next = [...weights.filter(w => w.date !== today), { date: today, weight: v }]
      .sort((a, b) => a.date.localeCompare(b.date));
    setWeights(next); saveWeights(next);
    setWeightInput('');
  }

  function handleExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ジム記録_backup_${todayYMD()}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    if (!confirm('現在のデータを上書きします。よろしいですか？')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (importData(ev.target?.result as string)) {
        setSessions(loadSessions()); setExercises(loadExercises());
        setWeights(loadWeights()); setTemplates(loadTemplates());
      } else alert('取り込みに失敗しました');
    };
    reader.readAsText(file);
  }

  // ── 集計 ──
  const streak = calcStreak(sessions);
  const thisMonth = monthCount(sessions, ymOf(todayYMD()));
  const wentToday = sessions.some(s => s.date === todayYMD());

  const currentWeight = weights[weights.length - 1]?.weight;
  const age = calcAge(profile.birthday);
  const bmi = calcBMI(profile.height, currentWeight);
  const hasProfile = !!(profile.height || profile.goal || profile.freq);
  const suggestedDay = plan ? nextPlanDay(sessions, plan.days.length) : 0;
  const activeDay = plan ? Math.min(dayTab ?? suggestedDay, plan.days.length - 1) : 0;

  const recent = sessions.filter(s => s.date >= daysAgo(29));
  const partCount: Record<string, number> = {};
  recent.forEach(s => s.entries.forEach(e => { partCount[e.part] = (partCount[e.part] ?? 0) + 1; }));
  const partRows = Object.entries(partCount).sort((a, b) => b[1] - a[1]);
  const partMax = Math.max(...partRows.map(r => r[1]), 1);

  // 自己ベスト（推定1RM）
  const bests = [...bestByExercise(sessions).values()].sort((a, b) => b.rm - a.rm);

  const latestW = weights[weights.length - 1];
  const prevW   = weights[weights.length - 2];
  const diffW   = latestW && prevW ? latestW.weight - prevW.weight : 0;
  const chart   = weights.slice(-14);
  const wMin = Math.min(...chart.map(w => w.weight), Infinity);
  const wMax = Math.max(...chart.map(w => w.weight), -Infinity);

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <a href="/" aria-label="入口（ハブ）に戻る" className="text-gray-300 hover:text-gray-600 text-lg leading-none shrink-0">🏠</a>
            <h1 className="text-base font-bold text-gray-800">🏋️ ジム記録</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowCloud(true)} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">☁️同期</button>
            <button onClick={handleExport} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">書出</button>
            <button onClick={() => importRef.current?.click()} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">読込</button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 自己ベスト更新 */}
        {prs.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <span className="text-lg shrink-0">🏅</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-700">自己ベスト更新！</p>
                <div className="mt-1 space-y-0.5">
                  {prs.map(p => (
                    <p key={p.exerciseId} className="text-xs text-amber-700/80">
                      {p.name}　{p.weight}kg×{p.reps} → 推定1RM <b>{p.rm}kg</b>
                    </p>
                  ))}
                </div>
              </div>
              <button onClick={() => setPrs([])} className="text-amber-400 text-sm w-6 h-6 flex items-center justify-center shrink-0">✕</button>
            </div>
          </section>
        )}

        {/* 作りかけの記録 */}
        {savedDraft && !showForm && (
          <section className="bg-white border border-rose-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg shrink-0">📝</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-700">作りかけの記録があります</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {savedDraft.date.slice(5).replace('-', '/')}　{savedDraft.entries.length}種目
                  {savedDraft.entries.length > 0 && `（${savedDraft.entries.map(e => e.name).join('・')}）`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setEditing(undefined); setFormInit(savedDraft); setShowForm(true); }}
                className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold">続きから記録する</button>
              <button onClick={discardDraft} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-bold">破棄</button>
            </div>
          </section>
        )}

        {/* サマリー */}
        <section className="bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl shadow-sm p-4 text-white">
          <div className="flex items-end justify-around text-center">
            <div>
              <p className="text-[11px] text-white/70">連続</p>
              <p className="text-2xl font-bold">🔥{streak}<span className="text-sm font-medium">日</span></p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-[11px] text-white/70">今月</p>
              <p className="text-2xl font-bold">{thisMonth}<span className="text-sm font-medium">回</span></p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-[11px] text-white/70">通算</p>
              <p className="text-2xl font-bold">{sessions.length}<span className="text-sm font-medium">回</span></p>
            </div>
          </div>
          <p className="text-center text-[11px] text-white/70 mt-2">
            {wentToday ? '今日はもう行きましたね。おつかれさま！' : streak > 0 ? '連続記録を伸ばしましょう💪' : '記録をつけると習慣になります💪'}
          </p>
        </section>

        {/* プロフィール */}
        {hasProfile ? (
          <button onClick={() => setShowProfile(true)} className="w-full bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 text-left">
            <span className="text-lg shrink-0">👤</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-700 truncate">
                {[
                  profile.height ? `${profile.height}cm` : '',
                  currentWeight ? `${currentWeight}kg` : '',
                  bmi ? `BMI ${bmi}（${bmiLabel(bmi)}）` : '',
                  age !== undefined ? `${age}歳` : '',
                ].filter(Boolean).join('　')}
              </p>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {[profile.goal, profile.freq, profile.level].filter(Boolean).join('・') || '目的・頻度が未設定'}
                {profile.targetWeight && currentWeight && (
                  <span className="text-rose-400">　目標まで {(currentWeight - profile.targetWeight).toFixed(1)}kg</span>
                )}
              </p>
            </div>
            <span className="text-xs text-gray-300 shrink-0">編集</span>
          </button>
        ) : (
          <button onClick={() => setShowProfile(true)}
            className="w-full bg-white rounded-xl shadow-sm px-4 py-3 text-left">
            <p className="text-sm font-semibold text-gray-700">👤 プロフィールを登録する</p>
            <p className="text-[11px] text-gray-400 mt-0.5">身長・目的・頻度を入れると、AIが体格に合わせたメニューを作れます</p>
          </button>
        )}

        {/* メニュー（分割プラン） */}
        {plan ? (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">📋 メニュー（{plan.days.length}分割）</h2>
              <button onClick={() => setShowAI(true)} className="text-[11px] text-purple-600 font-medium">✨ 作り直す</button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1.5">
              {plan.days.map((d, i) => (
                <button key={i} onClick={() => setDayTab(i)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${activeDay === i ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  Day{i + 1}{i === suggestedDay && <span className={activeDay === i ? 'text-white/70' : 'text-rose-400'}> ●</span>}
                </button>
              ))}
            </div>

            <p className="text-sm font-bold text-gray-800 mt-1 mb-1.5">
              Day{activeDay + 1}　{plan.days[activeDay].title}
              {activeDay === suggestedDay && <span className="text-[10px] font-medium text-rose-500 ml-1.5">次はこれ</span>}
            </p>
            <div className="space-y-1">
              {plan.days[activeDay].items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="shrink-0">{PART_ICON[it.part as Part] ?? '🏋️'}</span>
                  <span className="text-gray-700 truncate flex-1">{it.name}</span>
                  <span className="text-gray-400 shrink-0">{it.sets ? `${it.sets}×` : ''}{it.reps}</span>
                  <button onClick={() => setHowtoFor({ name: it.name, part: it.part })} title="やり方を見る"
                    className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-[11px] flex items-center justify-center">ⓘ</button>
                </div>
              ))}
            </div>

            <button onClick={() => startFromPlanDay(activeDay)}
              className="w-full mt-3 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold active:scale-[.98] transition-transform">
              このメニューで記録する
            </button>
          </section>
        ) : (
          <button onClick={() => setShowAI(true)}
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold shadow-sm active:scale-[.98] transition-transform">
            ✨ AIに分割メニューを作ってもらう
          </button>
        )}

        {/* 体重 */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">⚖️ 体重</h2>
            {latestW && (
              <p className="text-xs text-gray-400">
                最新 <b className="text-gray-700 text-sm">{latestW.weight}kg</b>
                {prevW && (
                  <span className={diffW === 0 ? 'text-gray-400' : diffW < 0 ? 'text-green-500' : 'text-orange-500'}>
                    　{diffW > 0 ? '+' : ''}{diffW.toFixed(1)}kg
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="number" inputMode="decimal" step="0.1" value={weightInput}
              onChange={e => setWeightInput(e.target.value)} placeholder="今日の体重"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <span className="text-xs text-gray-400">kg</span>
            <button onClick={saveWeight} disabled={!weightInput}
              className="px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-bold disabled:opacity-40">記録</button>
          </div>
          {chart.length >= 2 && (
            <div className="mt-3">
              <div className="flex items-end gap-1 h-16">
                {chart.map(w => {
                  const range = Math.max(wMax - wMin, 0.5);
                  const h = 25 + ((w.weight - wMin) / range) * 75;
                  return <div key={w.date} className="flex-1 bg-rose-200 rounded-t" style={{ height: `${h}%` }} title={`${w.date} ${w.weight}kg`} />;
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>{chart[0].date.slice(5).replace('-', '/')}</span>
                <span>直近{chart.length}件</span>
                <span>{chart[chart.length - 1].date.slice(5).replace('-', '/')}</span>
              </div>
            </div>
          )}
        </section>

        {/* 部位バランス */}
        {partRows.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2.5">部位バランス（直近30日）</h2>
            <div className="space-y-2">
              {partRows.map(([p, n]) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-20 shrink-0">{PART_ICON[p as Part] ?? '🏋️'} {p}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(n / partMax) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right shrink-0">{n}回</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 自己ベスト */}
        {bests.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <button onClick={() => setShowBest(v => !v)} className="w-full flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">🏅 自己ベスト（推定1RM）</h2>
              <span className="text-xs text-gray-400">{showBest ? '閉じる' : `${bests.length}種目`}</span>
            </button>
            <div className="mt-2.5 space-y-1.5">
              {(showBest ? bests : bests.slice(0, 3)).map(b => (
                <button key={b.exerciseId} onClick={() => setChartEx({ id: b.exerciseId, name: b.name })}
                  className="w-full flex items-center justify-between text-xs active:opacity-60">
                  <span className="text-gray-600 truncate">📈 {b.name}</span>
                  <span className="text-gray-400 shrink-0 ml-2">
                    {b.weight}kg×{b.reps} → <b className="text-gray-700">{b.rm}kg</b>
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">種目をタップすると、重量の推移が見られます</p>
          </section>
        )}

        {/* 履歴 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">履歴</h2>
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-5xl mb-3">🏋️</p>
              <p className="text-gray-400 text-sm">右下の＋から、今日のトレーニングを記録しましょう</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => {
                const parts = [...new Set(s.entries.map(e => e.part))];
                const vol = sessionVolume(s);
                const cardio = s.entries.filter(e => e.kind === 'cardio');
                return (
                  <button key={s.id} onClick={() => { setEditing(s); setFormInit(undefined); setShowForm(true); }}
                    className="w-full text-left bg-white rounded-xl shadow-sm p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 shrink-0">{mdLabel(s.date)}</p>
                      {typeof s.planDay === 'number' && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">Day{s.planDay + 1}</span>
                      )}
                      <div className="flex gap-1 flex-wrap min-w-0">
                        {parts.map(p => (
                          <span key={p} className="text-[10px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-full">{PART_ICON[p]} {p}</span>
                        ))}
                      </div>
                      <span className="ml-auto text-[11px] text-gray-400 shrink-0">{s.entries.length}種目</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {s.entries.map(e => e.name).join('・')}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {vol > 0 && <>総ボリューム {Math.round(vol).toLocaleString()}kg</>}
                      {cardio.length > 0 && <>{vol > 0 ? '　' : ''}有酸素 {cardio.reduce((n, e) => n + (e.durationMin ?? 0), 0)}分</>}
                      {s.memo && <span className="text-gray-300">　📝{s.memo}</span>}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <button onClick={() => { setEditing(undefined); setFormInit(savedDraft ?? undefined); setShowForm(true); }} aria-label="トレーニングを記録"
        className="fixed bottom-6 right-4 w-14 h-14 bg-rose-500 text-white rounded-full text-2xl shadow-lg active:scale-90 transition-transform flex items-center justify-center z-40">
        ＋
      </button>

      {showCloud && <CloudSync bucket="gym" serialize={exportData} apply={importData} onClose={() => setShowCloud(false)} />}
      {showAI && (
        <MenuAI profile={profile} currentWeight={currentWeight}
          onSavePlan={handleSavePlan}
          onEditProfile={() => { setShowAI(false); setShowProfile(true); }}
          onClose={() => setShowAI(false)} />
      )}
      {showProfile && (
        <ProfileForm profile={profile} currentWeight={currentWeight}
          onSave={handleSaveProfile} onClose={() => setShowProfile(false)} />
      )}
      {chartEx && (
        <ExerciseChart exerciseId={chartEx.id} name={chartEx.name} sessions={sessions} onClose={() => setChartEx(null)} />
      )}
      {howtoFor && (
        <ExerciseHowto name={howtoFor.name} part={howtoFor.part} onClose={() => setHowtoFor(null)} />
      )}
      {showForm && (
        <SessionForm
          editing={editing} initial={formInit}
          exercises={exercises} sessions={sessions} templates={templates}
          onSave={handleSave}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
          onAddExercise={addExercise}
          onSaveTemplate={addTemplate}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
