import { Session, Exercise, WeightLog, Template, Profile, Plan, SessionDraft, Howto, DEFAULT_EXERCISES, estimate1RM } from '../types';

const K = {
  sessions:  'gym_sessions',
  exercises: 'gym_exercises',
  weights:   'gym_weights',
  templates: 'gym_templates',
  profile:   'gym_profile',
  plan:      'gym_plan',
  draft:     'gym_draft',
  rest:      'gym_rest_sec',
  howto:     'gym_howto',
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

// ── Profile ──
export function loadProfile(): Profile { return load<Profile>(K.profile, {}); }
export function saveProfile(p: Profile) { localStorage.setItem(K.profile, JSON.stringify(p)); }

// ── Plan（分割メニュー） ──
export function loadPlan(): Plan | null { return load<Plan | null>(K.plan, null); }
export function savePlan(p: Plan | null) {
  if (p) localStorage.setItem(K.plan, JSON.stringify(p));
  else localStorage.removeItem(K.plan);
}

// ── 入力途中の下書き（同期・バックアップの対象外＝この端末だけの一時データ） ──
export function loadDraft(): SessionDraft | null {
  const d = load<SessionDraft | null>(K.draft, null);
  return d && Array.isArray(d.entries) ? d : null;
}
export function saveDraft(d: SessionDraft) { localStorage.setItem(K.draft, JSON.stringify(d)); }
export function clearDraft() { localStorage.removeItem(K.draft); }

// ── 種目の説明キャッシュ（種目名がキー。一度作れば以降はAIを呼ばない） ──
export function loadHowto(name: string): Howto | null {
  const all = load<Record<string, Howto>>(K.howto, {});
  const h = all?.[name];
  return h && (h.summary || h.steps?.length) ? h : null;
}
export function saveHowto(name: string, h: Howto) {
  const all = load<Record<string, Howto>>(K.howto, {});
  all[name] = h;
  try { localStorage.setItem(K.howto, JSON.stringify(all)); } catch { /* 容量超過時は諦める */ }
}

// ── 休憩タイマーの既定秒数 ──
export function loadRestSec(): number {
  const n = Number(load<string | number>(K.rest, 90));
  return n > 0 ? n : 90;
}
export function saveRestSec(sec: number) { localStorage.setItem(K.rest, JSON.stringify(sec)); }

// 次にやる日（直近でやったDayの次へローテーション）
export function nextPlanDay(sessions: Session[], dayCount: number): number {
  if (dayCount <= 0) return 0;
  const last = sessions.find(s => typeof s.planDay === 'number');
  if (!last || typeof last.planDay !== 'number') return 0;
  return (last.planDay + 1) % dayCount;
}

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

// ── 自己ベスト（推定1RM） ──
export interface Best { exerciseId: string; name: string; rm: number; weight: number; reps: number }

export function bestByExercise(sessions: Session[], excludeSessionId?: string): Map<string, Best> {
  const map = new Map<string, Best>();
  sessions.forEach(s => {
    if (s.id === excludeSessionId) return;
    s.entries.forEach(e => (e.sets ?? []).forEach(st => {
      const rm = estimate1RM(st.weight, st.reps);
      if (rm <= 0) return;
      const cur = map.get(e.exerciseId);
      if (!cur || rm > cur.rm) map.set(e.exerciseId, { exerciseId: e.exerciseId, name: e.name, rm, weight: st.weight, reps: st.reps });
    }));
  });
  return map;
}

// 保存した記録が自己ベストを更新したか（更新した種目だけ返す）
export function findPRs(session: Session, allSessions: Session[]): Best[] {
  const prev = bestByExercise(allSessions, session.id);
  const now  = bestByExercise([session]);
  const prs: Best[] = [];
  now.forEach((b, id) => {
    const before = prev.get(id);
    if (!before || b.rm > before.rm) prs.push(b);
  });
  return prs.sort((a, b) => b.rm - a.rm);
}

// ── バックアップ / クラウド同期 ──
export function exportData(): string {
  return JSON.stringify({
    app: 'gym', version: 2,
    sessions: loadSessions(), exercises: loadExercises(), weights: loadWeights(), templates: loadTemplates(),
    profile: loadProfile(), plan: loadPlan(),
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
    if (d.profile && typeof d.profile === 'object') saveProfile(d.profile);
    if (d.plan && Array.isArray(d.plan.days)) savePlan(d.plan);
    return true;
  } catch { return false; }
}

export function hasData(): boolean {
  try { return loadSessions().length > 0 || loadWeights().length > 0; } catch { return false; }
}
