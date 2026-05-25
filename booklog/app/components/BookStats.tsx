import { Book } from '../types';

const MONTHS = 6;

export default function BookStats({ books }: { books: Book[] }) {
  const done = books.filter(b => b.status === 'done');

  // 月別読了数（過去6ヶ月）
  const now = new Date();
  const monthData = Array.from({ length: MONTHS }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
    const ym  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cnt = done.filter(b => b.endDate?.startsWith(ym)).length;
    return { label: `${d.getMonth() + 1}月`, cnt };
  });
  const maxMonth = Math.max(...monthData.map(m => m.cnt), 1);

  // ジャンル分布
  const genreMap = new Map<string, number>();
  for (const b of done) {
    const g = b.genre || 'その他';
    genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
  }
  const genreData = [...genreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxGenre  = Math.max(...genreData.map(g => g[1]), 1);

  // ステータス集計
  const wantCnt    = books.filter(b => b.status === 'want').length;
  const readingCnt = books.filter(b => b.status === 'reading').length;
  const doneCnt    = done.length;

  if (books.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-10">まだ本が登録されていません</p>;
  }

  return (
    <div className="space-y-6">
      {/* ステータス集計 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xl font-bold text-gray-700">{wantCnt}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">読みたい</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xl font-bold text-blue-600">{readingCnt}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">読んでいる</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-xl font-bold text-green-600">{doneCnt}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">読み終わった</p>
        </div>
      </div>

      {/* 月別読了数 */}
      {doneCnt > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-3">月別読了数（過去{MONTHS}ヶ月）</p>
          <div className="flex items-end gap-2 h-24">
            {monthData.map(({ label, cnt }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 font-medium">{cnt > 0 ? cnt : ''}</span>
                <div className="w-full bg-gray-100 rounded-t-sm overflow-hidden" style={{ height: '64px' }}>
                  <div className="w-full bg-blue-400 rounded-t-sm transition-all mt-auto"
                    style={{ height: `${(cnt / maxMonth) * 64}px` }} />
                </div>
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ジャンル分布 */}
      {genreData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-3">ジャンル分布（読み終わった本）</p>
          <div className="space-y-2">
            {genreData.map(([genre, cnt]) => (
              <div key={genre} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 shrink-0 w-20 truncate">{genre}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(cnt / maxGenre) * 100}%`, minWidth: '1.5rem' }}>
                    <span className="text-[10px] font-bold text-white">{cnt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
