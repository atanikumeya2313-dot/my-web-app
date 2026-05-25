import { Earthquake, scaleLabel, scaleColor, scaleBorder, tsunamiLabel, fmtTime, extractPrefecture } from '../lib/api';

interface Props {
  quake: Earthquake;
  isLatest: boolean;
  isPinned?: boolean;
  onClick?: () => void;
}

export default function EarthquakeCard({ quake, isLatest, isPinned, onClick }: Props) {
  const { date, time } = fmtTime(quake.time);
  const label   = scaleLabel(quake.maxScale);
  const color   = scaleColor(quake.maxScale);
  const border  = scaleBorder(quake.maxScale);
  const tsunami = tsunamiLabel(quake.domesticTsunami);
  const mag     = quake.hypocenter.magnitude;
  const depth   = quake.hypocenter.depth;
  const pref    = extractPrefecture(quake.hypocenter.name);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border-l-4 ${border} shadow-sm p-4 flex gap-3 items-start ${onClick ? 'cursor-pointer active:opacity-80' : ''}`}
    >
      {/* 震度バッジ */}
      <div className={`${color} rounded-lg w-14 h-14 flex flex-col items-center justify-center shrink-0`}>
        <span className="text-[10px] font-medium leading-none mb-0.5">震度</span>
        <span className="text-xl font-bold leading-none">{label}</span>
      </div>

      {/* 情報 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-gray-800 truncate">{quake.hypocenter.name || '震源地不明'}</span>
          {isLatest && (
            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">最新</span>
          )}
          {isPinned && (
            <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">📌</span>
          )}
          {pref && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">{pref}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
          <span>{date} {time}</span>
          {mag > 0   && <span>M{mag.toFixed(1)}</span>}
          {depth >= 0 && <span>深さ {depth === 0 ? 'ごく浅い' : `${depth}km`}</span>}
        </div>

        {quake.prefectures.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {quake.prefectures.slice(0, 6).map(pref => (
              <span key={pref} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {pref}
              </span>
            ))}
            {quake.prefectures.length > 6 && (
              <span className="text-[10px] text-gray-400 self-center">他{quake.prefectures.length - 6}県</span>
            )}
          </div>
        )}

        {tsunami && (
          <div className="mt-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded px-2 py-0.5 inline-block">
            {tsunami}
          </div>
        )}
      </div>
    </div>
  );
}
