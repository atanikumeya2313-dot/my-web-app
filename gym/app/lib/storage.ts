import { Session, Exercise, WeightLog, Template, DEFAULT_EXERCISES } from '../types';

const K = {
  sessions:  'gym_sessions',
  exercises: 'gym_exercises',
  weights:   'gym_weights',
  templates: 'gym_templates',
};

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}

// ── Sessions ──
export function loadSessions(): Session[] {
  const a = load<Session[]>(K.sessions, []);
  return Array.isArray(a) ? a.sort((x, y) => y.date.localeCompare(x.date)) : [];
}
export function saveSessions(list: Session[]) { localStorage.setItem(K.sessions, JSON.stringify(list)); }

// ── Exercises（未登録なら既定を入れる） ──
export function loadExercises(): Exercise[] {
  const a = load<Exercise[] | null>(K.exercises, null);
  if (!Array.isArray(a)) { localStorage.setItem(K.exercises, JSON.stringify(DEFAULT_EXERCISES)); return [...DEFAULT_EXERCISES]; }
  return a;
}
export function saveExercises(list: Exercise[]) { localStorage.setItem(K.exercises, JSON.stringify(list)); }

// ── Weights ──
export function loadWeights(): WeightLog[] {
  const a = load<WeightLog[]>(K.weights, []);
  return Array.isArray(a) ? a.sort((x, y) => x.date.localeCompare(y.date)) : [];
}
export function saveWeights(list: WeightLog[]) { localStorage.setItem(K.weights, JSON.stringify(list)); }

// ── Templates ──
export function loadTemplates(): Template[] { return load<Template[]>(K.templates, []); }
export function saveTemplates(list: Template[]) { localStorage.setItem(K.templates, JSON.stringify(list)); }

// ── 連続記録・回数 ──
// 直近の「連続して通っている週数」ではなく、日ベースのストリーク（今日/昨日から遡って連続した“通った日”）
export function calcStreak(sessions: Session[]): number {
  const days = new Set(sessions.map(s => s.date));
  if (days.size === 0) return 0;
  const d = new Date();
  const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  // 今日通っていなくても、昨日までの連続はカウントしたいので、起点を今日か昨日にする
  if (!days.has(ymd(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(ymd(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function monthCount(sessions: Session[], ym: string): number {
  return sessions.filter(s => s.date.startsWith(ym)).length;
}

// ── バックアップ / クラウド同期 ──
export function exportData(): string {
  return JSON.stringify({
    app: 'gym', version: 1,
    sessions: loadSessions(), exercises: loadExercises(), weights: loadWeights(), templates: loadTemplates(),
  });
}
export function importData(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d?.sessions) && !Array.isArray(d?.exercises)) return false;
    if (Array.isArray(d.sessions))  saveSessions(d.sessions);
    if (Array.isArray(d.exercises)) saveExercises(d.exercises);
    if (Array.isArray(d.weights))   saveWeights(d.weights);
    if (Array.isArray(d.templates)) saveTemplates(d.templates);
    return true;
  } catch { return false; }
}

export function hasData(): boolean {
  try { return loadSessions().length > 0 || loadWeights().length > 0; } catch { return false; }
}
