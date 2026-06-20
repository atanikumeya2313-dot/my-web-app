'use client';
import { useState } from 'react';
import { Template, Category } from '../types';

interface Props {
  templates: Template[];
  categories: Category[];
  onChange: (ts: Template[]) => void;
}

export default function TemplateManager({ templates, categories, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        <h2 className="text-sm font-semibold text-gray-600">クイックテンプレート</h2>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3">
          {templates.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 leading-relaxed">
              テンプレートがありません。<br />
              取引フォームで入力後「テンプレートに保存」で追加できます。
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-2 border-b border-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {catName(t.category)}　¥{t.amount.toLocaleString()}
                      <span className={t.type === 'expense' ? 'text-red-400' : 'text-green-500'}>
                        {t.type === 'expense' ? '支出' : '収入'}
                      </span>
                    </p>
                  </div>
                  <button onClick={() => onChange(templates.filter(x => x.id !== t.id))}
                    className="text-gray-300 hover:text-red-400 transition-colors px-2 py-1 text-sm">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
