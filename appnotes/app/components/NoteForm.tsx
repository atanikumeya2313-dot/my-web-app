'use client';
import { useState } from 'react';
import { Note, Kind, Priority, APPS, KIND_LABEL, PRIORITY_LABEL } from '../types';

interface Props {
  editing: Note;
  onSave: (n: Note) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const KINDS: Kind[] = ['bug', 'improve', 'idea'];
const PRIORITIES: Priority[] = ['high', 'mid', 'low'];

export default function NoteForm({ editing, onSave, onDelete, onClose }: Props) {
  const [app,      setApp]      = useState(editing.app);
  const [text,     setText]     = useState(editing.text);
  const [kind,     setKind]     = useState<Kind>(editing.kind);
  const [priority, setPriority] = useState<Priority>(editing.priority);
  const [weekend,  setWeekend]  = useState(editing.weekend);
  const [status,   setStatus]   = useState(editing.status);

  function submit() {
    if (!text.trim()) return;
    onSave({
      ...editing,
      app, text: text.trim(), kind, priority, weekend, status,
      doneAt: status === 'done' ? (editing.doneAt ?? new Date().toISOString()) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-800">メモを編集</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">対象アプリ</label>
            <select value={app} onChange={e => setApp(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
              {APPS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">内容</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">種類</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                {KINDS.map(k => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className={`flex-1 py-1.5 font-medium ${kind === k ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}>{KIND_LABEL[k]}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">優先度</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                {PRIORITIES.map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 font-medium ${priority === p ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}>{PRIORITY_LABEL[p]}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setWeekend(v => !v)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${weekend ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-white text-gray-500 border-gray-200'}`}>
              ★ 今週末やる{weekend ? '：ON' : ''}
            </button>
            <button type="button" onClick={() => setStatus(s => s === 'done' ? 'open' : 'done')}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${status === 'done' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-white text-gray-500 border-gray-200'}`}>
              {status === 'done' ? '✓ 完了' : '未対応'}
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">キャンセル</button>
            <button onClick={submit} disabled={!text.trim()}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-40">保存</button>
          </div>
          <button onClick={() => { if (confirm('このメモを削除しますか？')) onDelete(editing.id); }}
            className="w-full py-2 text-sm font-medium text-red-500">削除</button>
        </div>
      </div>
    </div>
  );
}
