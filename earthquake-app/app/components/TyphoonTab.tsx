'use client';
import { TyphoonData, getCategoryInfo, parseTyphoonNumber, formatIssueTime } from '../lib/typhoonApi';

interface Props {
  typhoons:  TyphoonData[];
  loading:   boolean;
  error:     string | null;
  updatedAt: Date | null;
}

export default function TyphoonTab({ typhoons, loading, error, updatedAt }: Props) {
  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (typhoons.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-5xl">🌤</p>
        <p className="text-gray-700 font-semibold text-sm">現在発生中の台風はありません</p>
        {updatedAt && (
          <p className="text-xs text-gray-400">
            最終確認: {updatedAt.getHours().toString().padStart(2,'0')}:{updatedAt.getMinutes().toString().padStart(2,'0')}:{updatedAt.getSeconds().toString().padStart(2,'0')}
          </p>
        )}
        <p className="text-[10px] text-gray-300 pt-2">データ提供: 気象庁</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{typhoons.length}件の台風が発生中</p>

      {typhoons.map(t => {
        const { year, num } = parseTyphoonNumber(t);
        const cat           = getCategoryInfo(t.category);

        return (
          <div key={t.tropicalCyclone}
            className={`bg-white rounded-xl border-l-4 ${cat.border} shadow-sm p-4 flex gap-3 items-start`}>

            {/* 台風バッジ */}
            <div className={`${cat.badge} rounded-xl w-16 h-16 flex flex-col items-center justify-center shrink-0 border ${cat.border}`}>
              <span className="text-[9px] font-medium leading-none">{year}年</span>
              <span className="text-2xl font-black leading-tight">{num}</span>
              <span className="text-[9px] font-medium leading-none">号</span>
            </div>

            {/* 情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-bold text-gray-800">台風{num}号</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cat.badge}`}>
                  {cat.ja}
                </span>
              </div>
              <p className="text-xs text-gray-500">{formatIssueTime(t.issue)}</p>
              <p className="text-[10px] text-gray-300 mt-1">{t.tropicalCyclone}</p>
            </div>
          </div>
        );
      })}

      <div className="text-center pt-1 pb-2">
        <a href="https://www.jma.go.jp/bosai/typhoon/"
          target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline">
          🔗 気象庁 台風情報（進路・詳細）を見る
        </a>
      </div>

      <p className="text-center text-[10px] text-gray-300">データ提供: 気象庁</p>
    </div>
  );
}
