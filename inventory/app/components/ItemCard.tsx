'use client';
import { StockItem, CATEGORY_ICONS } from '../types';

interface Props {
  item: StockItem;
  onEdit: () => void;
  onQuantityChange: (delta: number) => void;
}

function expiryStatus(expiryDate?: string): { label: string; color: string } | null {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp   = new Date(expiryDate);
  const days  = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0)  return { label: `期限切れ(${Math.abs(days)}日前)`, color: 'bg-red-100 text-red-600' };
  if (days <= 7)  return { label: `期限まで${days}日`,               color: 'bg-red-100 text-red-600' };
  if (days <= 30) return { label: `期限まで${days}日`,               color: 'bg-orange-100 text-orange-600' };
  return { label: `${exp.getMonth()+1}/${exp.getDate()}まで`,        color: 'bg-gray-100 text-gray-500' };
}

export default function ItemCard({ item, onEdit, onQuantityChange }: Props) {
  const isOut = item.quantity === 0;
  const isLow = !isOut && item.minQuantity > 0 && item.quantity <= item.minQuantity;
  const barPct = item.minQuantity > 0
    ? Math.min(100, Math.round((item.quantity / (item.minQuantity * 2)) * 100))
    : 100;
  const expiry = expiryStatus(item.expiryDate);

  return (
    <div className={`bg-white rounded-xl p-3 shadow-sm border ${isOut ? 'border-red-200' : isLow ? 'border-orange-200' : 'border-transparent'}`}>
      <div className="flex items-center gap-3">
        <button onClick={onEdit} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{CATEGORY_ICONS[item.category]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-gray-400">{item.category}</p>
            </div>
            {isOut && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full shrink-0">在庫切れ</span>
            )}
            {isLow && (
              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full shrink-0">残りわずか</span>
            )}
          </div>
          <div className="pl-8 mt-0.5 flex flex-wrap gap-1">
            {item.memo && (
              <p className="text-xs text-gray-400 truncate">{item.memo}</p>
            )}
            {expiry && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${expiry.color}`}>{expiry.label}</span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onQuantityChange(-1)} disabled={item.quantity === 0}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold disabled:opacity-30 flex items-center justify-center text-base leading-none">
            −
          </button>
          <span className={`text-sm font-bold text-center ${isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-gray-800'}`}
            style={{ minWidth: '2.5rem' }}>
            {item.quantity}
            <span className="text-[10px] font-normal text-gray-400 ml-0.5">{item.unit}</span>
          </span>
          <button onClick={() => onQuantityChange(1)}
            className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-base leading-none">
            ＋
          </button>
        </div>
      </div>

      {item.minQuantity > 0 && (
        <div className="mt-2 flex items-center gap-2 pl-8">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOut ? 'bg-red-400' : isLow ? 'bg-orange-400' : 'bg-green-400'}`}
              style={{ width: `${barPct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-300 shrink-0">最低{item.minQuantity}{item.unit}</span>
        </div>
      )}
    </div>
  );
}
