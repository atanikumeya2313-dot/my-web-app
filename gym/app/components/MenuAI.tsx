'use client';
import { useState } from 'react';
import { Profile, Plan, PlanDay, MenuItem, PART_ICON, Part, calcAge, calcBMI } from '../types';
import ExerciseHowto from './ExerciseHowto';

interface Props {
  profile: Profile;
  currentWeight?: number;
  onSavePlan: (plan: Plan) => void;
  onEditProfile: () => void;
  onClose: () => void;
}

const PARTS_OPT = ['おまかせ', '胸', '背中', '脚', '肩', '腕', '腹', '有酸素'];

export default function MenuAI({ profile, currentWeight, onSavePlan, onEditProfile, onClose }: Props) {
  const [part, setPart] = useState(PARTS_OPT[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [advice, setAdvice] = useState('');
  const [days, setDays] = useState<PlanDay[]>([]);
  const [openDay, setOpenDay] = useState(0);
  const [howtoFor, setHowtoFor] = useState<MenuItem | null>(null);

  const age = calcAge(profile.birthday);
  const bmi = calcBMI(profile.height, currentWeight);
  const hasProfile = !!(profile.height || profile.goal || profile.freq);

  async function suggest() {
    setLoading(true); setError(''); setAdvice(''); setDays([]);
    try {
      let res!: Response;
      for (let attempt = 0; attempt < 3; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 70000);
        try {
          res = await fetch('/gym/api/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goal: profile.goal, freq: profile.freq, level: profile.level, equip: profile.equip,
              part: part === 'おまかせ' ? '' : part,
              age, gender: profile.gender, height: profile.height,
              weight: currentWeight, targetWeight: profile.targetWeight, bmi,
            }),
            signal: ctrl.signal,
          });
        } catch (e) {
          if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
          throw e;
        } finally { clearTimeout(timer); }
        break;
      }
      let data: { advice?: string; days?: PlanDay[]; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.days)) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? 'メニューの提案に失敗しました'));
        return;
      }
      setAdvice(data.advice ?? '');
      setDays(data.days);
      setOpenDay(0);
      if (data.days.length === 0) setError('提案を作れませんでした。条件を変えてお試しください。');
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  function save() {
    onSavePlan({ id: `plan_${Date.now()}`, createdAt: new Date().toISOString(), advice, days });
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">✨ AIメニュー作成</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* いまの前提（プロフィール） */}
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-700">この内容で作ります</p>
              <button onClick={onEditProfile} className="text-[11px] text-rose-500 font-medium">プロフィールを編集</button>
            </div>
            {hasProfile ? (
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {[
                  profile.goal, profile.freq, profile.level, profile.equip,
                  profile.height ? `${profile.height}cm` : '',
                  currentWeight ? `${currentWeight}kg` : '',
                  bmi ? `BMI${bmi}` : '',
                  age !== undefined ? `${age}歳` : '',
                  profile.targetWeight ? `目標${profile.targetWeight}kg` : '',
                ].filter(Boolean).join('・')}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">未登録です。プロフィールを登録すると、体格や目的に合わせた内容になります。</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">特に鍛えたい部位</label>
            <div className="flex flex-wrap gap-1.5">
              {PARTS_OPT.map(o => (
                <button key={o} onClick={() => setPart(o)}
                  className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${part === o ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{o}</button>
              ))}
            </div>
          </div>

          <button onClick={suggest} disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? '考えています…' : days.length ? 'もう一度作り直す' : `${profile.freq ?? '週3回'}の分割メニューを作る`}
          </button>

          {error && <p className="text-xs bg-red-50 text-red-500 rounded-lg px-3 py-2">{error}</p>}

          {advice && (
            <div className="bg-purple-50/70 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-600 leading-relaxed">{advice}</p>
            </div>
          )}

          {days.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {days.map((d, i) => (
                  <button key={i} onClick={() => setOpenDay(i)}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${openDay === i ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    Day{i + 1}
                  </button>
                ))}
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <p className="text-sm font-bold text-gray-800 mb-2">Day{openDay + 1}　{days[openDay].title}</p>
                <div className="space-y-2">
                  {days[openDay].items.map((it, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs shrink-0 mt-0.5">{PART_ICON[it.part as Part] ?? '🏋️'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 leading-tight">
                          {it.name}
                          <span className="text-[11px] text-gray-400 ml-1.5">{it.sets ? `${it.sets}set × ` : ''}{it.reps}</span>
                        </p>
                        {it.tip && <p className="text-[11px] text-gray-400 mt-0.5">{it.tip}</p>}
                      </div>
                      <button onClick={() => setHowtoFor(it)} title="やり方を見る"
                        className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-[11px] flex items-center justify-center">ⓘ</button>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ※ 提案は一般的な目安です。痛みがあるときは無理をせず、必要ならジムのスタッフに相談してください。
              </p>
            </div>
          )}
        </div>

        {days.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <button onClick={save}
              className="w-full py-3 rounded-xl bg-rose-500 text-white text-sm font-bold">
              この{days.length}分割メニューを保存する
            </button>
          </div>
        )}
      </div>

      {howtoFor && (
        <ExerciseHowto name={howtoFor.name} part={howtoFor.part} onClose={() => setHowtoFor(null)} />
      )}
    </div>
  );
}
