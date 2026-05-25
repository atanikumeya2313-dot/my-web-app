import { Earthquake, scaleLabel, scaleColor, scaleBorder, tsunamiLabel, fmtTime, extractPrefecture } from '../lib/api';

interface Props {
  quake: Earthquake;
  onClose: () => void;
}

function ScaleBadge({ scale }: { scale: number }) {
  const s = scale as Parameters<typeof scaleLabel>[0];
  const label = scaleLabel(s);
  const color = scaleColor(s);
  return (
    <span className={`${color} text-[10px] font-bold px-1.5 py-0.5 rounded leading-none`}>
      {label}
    </span>
  );
}

export default function EarthquakeDetail({ quake, onClose }: Props) {
  const { date, time } = fmtTime(quake.time);
  const label   = scaleLabel(quake.maxScale);
  const color   = scaleColor(quake.maxScale);
  const border  = scaleBorder(quake.maxScale);
  const tsunami = tsunamiLabel(quake.domesticTsunami);
  const pref    = extractPrefecture(quake.hypocenter.name);
  const mag     = quake.hypocenter.magnitude;
  const depth   = quake.hypocenter.depth;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className={`border-l-4 ${border} p-4 flex gap-3 items-start`}>
          <div className={`${color} rounded-xl w-16 h-16 flex flex-col items-center justify-center shrink-0`}>
            <span className="text-[10px] font-medium leading-none mb-0.5">震度</span>
            <span className="text-2xl font-bold leading-none">{label}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-800">{quake.hypocenter.name || '震源地不明'}</p>
            {pref && (
              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">{pref}</span>
            )}
            <p className="text-xs text-gray-500 mt-1">{date} {time}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none shrink-0 px-1">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* 基本情報 */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-1">マグニチュード</p>
              <p className="text-lg font-bold text-gray-800">{mag > 0 ? `M${mag.toFixed(1)}` : '不明'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-1">震源の深さ</p>
              <p className="text-lg font-bold text-gray-800">
                {depth === 0 ? 'ごく浅い' : depth >= 0 ? `${depth}km` : '不明'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-1">最大震度</p>
              <p className="text-lg font-bold text-gray-800">震度{label}</p>
            </div>
          </div>

          {/* 津波情報 */}
          {tsunami && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-red-600">⚠ {tsunami}</p>
            </div>
          )}

          {/* 各地の震度 */}
          {quake.prefScales.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">各地の震度</p>
              <div className="space-y-1.5">
                {quake.prefScales.map(({ pref, scale }) => (
                  <div key={pref} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{pref}</span>
                    <ScaleBadge scale={scale} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
