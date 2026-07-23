'use client';
import { useState } from 'react';
import { Profile, calcAge, calcBMI, bmiLabel } from '../types';

interface Props {
  profile: Profile;
  currentWeight?: number;   // 体重は記録から自動で使う
  onSave: (p: Profile) => void;
  onClose: () => void;
}

const GOALS  = ['筋肉をつけたい', 'ダイエット・減量', '健康維持', '体力アップ'];
const FREQS  = ['週1回', '週2回', '週3回', '週4回', '週5回'];
const LEVELS = ['はじめて', '数ヶ月', '1年以上'];
const EQUIPS = ['ジムのマシン中心', 'フリーウェイトも使う', '自宅・自重のみ'];

function Chips({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)}
            className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${value === o ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProfileForm({ profile, currentWeight, onSave, onClose }: Props) {
  const [p, setP] = useState<Profile>(profile);
  const set = (patch: Partial<Profile>) => setP(v => ({ ...v, ...patch }));

  const age = calcAge(p.birthday);
  const bmi = calcBMI(p.height, currentWeight);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">👤 プロフィール</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            登録しておくと、AIメニューがあなたの体格・目的に合わせた内容になります。<br />
            体重は「⚖️体重」に記録した最新の値を使うので、ここでの入力は不要です。
          </p>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">身長（cm）</label>
              <input type="number" inputMode="decimal" step="0.1" value={p.height ?? ''}
                onChange={e => set({ height: Number(e.target.value) || undefined })} placeholder="170"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">目標体重（kg）</label>
              <input type="number" inputMode="decimal" step="0.1" value={p.targetWeight ?? ''}
                onChange={e => set({ targetWeight: Number(e.target.value) || undefined })} placeholder="65"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">生年月日{age !== undefined && <span className="text-gray-400 font-normal">（{age}歳）</span>}</label>
            <input type="date" value={p.birthday ?? ''} onChange={e => set({ birthday: e.target.value || undefined })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">性別</label>
            <div className="flex gap-1.5">
              {([['male', '男性'], ['female', '女性'], ['other', '回答しない']] as [NonNullable<Profile['gender']>, string][]).map(([v, l]) => (
                <button key={v} onClick={() => set({ gender: v })}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium ${p.gender === v ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{l}</button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">必要な負荷の目安づけに使います（未入力でもメニューは作れます）</p>
          </div>

          {bmi && (
            <div className="bg-rose-50/60 rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-600">BMI（体重 {currentWeight}kg で計算）</span>
              <span className="text-sm font-bold text-gray-700">{bmi} <span className="text-xs font-medium text-gray-500">{bmiLabel(bmi)}</span></span>
            </div>
          )}

          <div className="h-px bg-gray-100" />

          <Chips label="目的"           options={GOALS}  value={p.goal}  onChange={v => set({ goal: v })} />
          <Chips label="通う頻度（分割数になります）" options={FREQS}  value={p.freq}  onChange={v => set({ freq: v })} />
          <Chips label="トレーニング歴" options={LEVELS} value={p.level} onChange={v => set({ level: v })} />
          <Chips label="使える器具"     options={EQUIPS} value={p.equip} onChange={v => set({ equip: v })} />
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={() => onSave(p)}
            className="w-full py-3 rounded-xl bg-rose-500 text-white text-sm font-bold active:scale-[.98] transition-transform">
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
