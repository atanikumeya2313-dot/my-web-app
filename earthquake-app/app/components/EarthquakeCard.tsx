import { Earthquake, scaleLabel, scaleColor, scaleBorder, tsunamiLabel, fmtTime } from '../lib/api';

interface Props {
  quake: Earthquake;
  isLatest: boolean;
}

export default function EarthquakeCard({ quake, isLatest }: Props) {
  const { date, time } = fmtTime(quake.time);
  const label   = scaleLabel(quake.maxScale);
  const color   = scaleColor(quake.maxScale);
  const border  = scaleBorder(quake.maxScale);
  const tsunami = tsunamiLabel(quake.domesticTsunami);
  const mag     = quake.hypocenter.magnitude;
  const depth   = quake.hypocenter.depth;

  return (
    <div className={`bg-white rounded-xl border-l-4 ${border} shadow-sm p-4 flex gap-3 items-start`}>
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
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
          <span>{date} {time}</span>
          {mag > 0   && <span>M{mag.toFixed(1)}</span>}
          {depth >= 0 && <span>深さ {depth === 0 ? 'ごく浅い' : `${depth}km`}</span>}
        </div>

        {tsunami && (
          <div className="mt-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded px-2 py-0.5 inline-block">
            {tsunami}
          </div>
        )}
      </div>
    </div>
  );
}
