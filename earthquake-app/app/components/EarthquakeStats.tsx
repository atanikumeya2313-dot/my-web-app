import { Earthquake, scaleLabel, scaleColor } from '../lib/api';

const SCALES = [10, 20, 30, 40, 45, 50, 55, 60, 70] as const;
const MAG_BINS = [
  { label: 'M1〜2', min: 1, max: 2 },
  { label: 'M2〜3', min: 2, max: 3 },
  { label: 'M3〜4', min: 3, max: 4 },
  { label: 'M4〜5', min: 4, max: 5 },
  { label: 'M5〜6', min: 5, max: 6 },
  { label: 'M6以上', min: 6, max: 99 },
];

export default function EarthquakeStats({ quakes }: { quakes: Earthquake[] }) {
  // 震度分布
  const scaleCounts = SCALES.map(s => ({
    scale: s,
    label: scaleLabel(s),
    color: scaleColor(s),
    count: quakes.filter(q => q.maxScale === s).length,
  })).filter(s => s.count > 0);

  const maxScaleCount = Math.max(...scaleCounts.map(s => s.count), 1);

  // マグニチュード分布
  const magCounts = MAG_BINS.map(b => ({
    label: b.label,
    count: quakes.filter(q => {
      const m = q.hypocenter.magnitude;
      return m >= b.min && m < b.max;
    }).length,
  })).filter(b => b.count > 0);

  const maxMagCount = Math.max(...magCounts.map(b => b.count), 1);

  if (quakes.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-12">データがありません</p>;
  }

  return (
    <div className="space-y-6 py-2">
      {/* 震度分布 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3">最大震度の分布（{quakes.length}件）</p>
        <div className="space-y-2">
          {scaleCounts.map(({ scale, label, color, count }) => (
            <div key={scale} className="flex items-center gap-2">
              <span className={`${color} text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 w-10 text-center`}>
                {label}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className={`h-full rounded-full flex items-center justify-end pr-2 transition-all ${color}`}
                  style={{ width: `${(count / maxScaleCount) * 100}%`, minWidth: '2rem' }}
                >
                  <span className="text-[10px] font-bold">{count}</span>
                </div>
              </div>
              <span className="text-xs text-gray-400 shrink-0 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* マグニチュード分布 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3">マグニチュードの分布</p>
        <div className="space-y-2">
          {magCounts.map(({ label, count }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 shrink-0 w-14">{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full flex items-center justify-end pr-2 transition-all"
                  style={{ width: `${(count / maxMagCount) * 100}%`, minWidth: '2rem' }}
                >
                  <span className="text-[10px] font-bold text-white">{count}</span>
                </div>
              </div>
              <span className="text-xs text-gray-400 shrink-0 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
