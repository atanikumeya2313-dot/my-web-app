import { Deck, Card, Grade } from '../types';

const DECKS_KEY = 'cards_decks';
const CARDS_KEY = 'cards_cards';

// ── 日付ユーティリティ ──────────────────────────────
export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

// ── 間隔反復（Leitner方式） ─────────────────────────
// レベルごとの復習間隔（日）。正解で間隔が伸びる。
const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
const MAX_LEVEL = INTERVALS.length - 1;

// 採点に応じて次のレベルと復習日を返す
export function schedule(level: number, grade: Grade, today: string): { level: number; due: string } {
  if (grade === 'again') {
    // できない → 最初に戻して当日中に再出題
    return { level: 0, due: today };
  }
  if (grade === 'hard') {
    // あいまい → レベル据え置き、翌日に再出題
    return { level, due: addDays(today, 1) };
  }
  // できた → レベルアップ、間隔を伸ばす
  const next = Math.min(level + 1, MAX_LEVEL);
  return { level: next, due: addDays(today, INTERVALS[next]) };
}

// ── Decks ───────────────────────────────────────────
export function loadDecks(): Deck[] {
  try { return JSON.parse(localStorage.getItem(DECKS_KEY) ?? '[]'); }
  catch { return []; }
}
export function saveDecks(decks: Deck[]) {
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

// ── Cards ───────────────────────────────────────────
export function loadCards(): Card[] {
  try { return JSON.parse(localStorage.getItem(CARDS_KEY) ?? '[]'); }
  catch { return []; }
}
export function saveCards(cards: Card[]) {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

export function newCard(deckId: string, front: string, back: string, explanation?: string): Card {
  return {
    id: crypto.randomUUID(),
    deckId,
    front,
    back,
    ...(explanation ? { explanation } : {}),
    level: 0,
    due: toYMD(new Date()),   // 追加直後から復習対象
    createdAt: new Date().toISOString(),
  };
}

// 今日復習すべきカード（due <= 今日）
export function dueCards(cards: Card[], deckId: string, today: string): Card[] {
  return cards.filter(c => c.deckId === deckId && c.due <= today);
}

export function deckStats(cards: Card[], deckId: string, today: string) {
  const inDeck = cards.filter(c => c.deckId === deckId);
  const due = inDeck.filter(c => c.due <= today).length;
  return { total: inDeck.length, due };
}

// ── バックアップ（JSONエクスポート/インポート） ──────
export interface BackupData {
  version: number;
  exportedAt: string;
  decks: Deck[];
  cards: Card[];
}
export function exportData(): BackupData {
  return { version: 1, exportedAt: new Date().toISOString(), decks: loadDecks(), cards: loadCards() };
}
export function importData(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const d = raw as Partial<BackupData>;
  if (!Array.isArray(d.decks) || !Array.isArray(d.cards)) return false;
  saveDecks(d.decks);
  saveCards(d.cards);
  return true;
}
