'use client';
import { Template, Category } from '../types';

interface Props {
  templates: Template[];
  categories: Category[];
  onSelect: (t: Template) => void;
}

export default function QuickTemplates({ templates, categories, onSelect }: Props) {
  if (templates.length === 0) return null;

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? '';

  return (
    <div className="px-4 pb-2">
      <p className="text-[10px] text-gray-400 mb-1.5">クイック追加</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {templates.map(t => (
          <button key={t.id} onClick={() => onSelect(t)}
            className={`shrink-0 flex flex-col items-start px-3 py-2 rounded-xl text-xs shadow-sm border transition-colors active:opacity-70
              ${t.type === 'expense'
                ? 'bg-red-50 border-red-100 text-red-700'
                : 'bg-green-50 border-green-100 text-green-700'}`}>
            <span className="font-semibold">{t.name}</span>
            <span className="text-[10px] opacity-60 mt-0.5">
              {catName(t.category)}　¥{t.amount.toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
