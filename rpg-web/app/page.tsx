'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// ── Types ────────────────────────────────────────────────────────
type Screen = 'title' | 'village' | 'battle' | 'shop' | 'tavern' | 'gameover' | 'clear';
type CompanionSpecial = 'warrior' | 'mage' | 'healer';

interface Player {
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  level: number;
  exp: number;
  gold: number;
  potions: number;
  bossDefeated: boolean;
}

interface EnemyData {
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  def: number;
  exp: number;
  gold: number;
  isBoss?: boolean;
}

interface Enemy extends EnemyData {
  currentHp: number;
}

interface CompanionTemplate {
  id: string;
  name: string;
  emoji: string;
  maxHp: number;
  atk: number;
  def: number;
  description: string;
  cost: number;
  minLevel: number;
  special: CompanionSpecial;
}

interface ActiveCompanion extends CompanionTemplate {
  hp: number;
}

// ── Game Data ────────────────────────────────────────────────────
const EXP_TABLE = [0, 0, 20, 50, 90, 140, 200, 270, 350, 440, 540];

const INIT_PLAYER: Player = {
  name: 'まっちゃ', hp: 30, maxHp: 30, atk: 10, def: 3,
  level: 1, exp: 0, gold: 50, potions: 2, bossDefeated: false,
};

const FOREST_ENEMIES: EnemyData[] = [
  { name: 'スライム',     emoji: '🟢', hp: 12, atk: 5,  def: 0, exp: 8,  gold: 6  },
  { name: 'プチスライム', emoji: '🟢', hp: 22, atk: 8,  def: 1, exp: 14, gold: 12 },
  { name: 'ぶよスライム', emoji: '🟢', hp: 32, atk: 11, def: 2, exp: 22, gold: 18 },
];

const CAVE_ENEMIES: EnemyData[] = [
  { name: 'どろスライム',   emoji: '🟤', hp: 38, atk: 14, def: 3, exp: 30, gold: 20 },
  { name: 'どくスライム',   emoji: '🟣', hp: 52, atk: 17, def: 5, exp: 42, gold: 28 },
  { name: 'メタルスライム', emoji: '⚪', hp: 65, atk: 20, def: 7, exp: 60, gold: 40 },
];

const BOSS: EnemyData = {
  name: 'キングスライム', emoji: '👑',
  hp: 120, atk: 26, def: 8, exp: 300, gold: 200, isBoss: true,
};

const COMPANION_TEMPLATES: CompanionTemplate[] = [
  {
    id: 'gaston',
    name: 'ガストン',
    emoji: '🛡️',
    maxHp: 45,
    atk: 12,
    def: 7,
    description: '頑丈な戦士。敵の攻撃を引き付ける。',
    cost: 80,
    minLevel: 2,
    special: 'warrior',
  },
  {
    id: 'mira',
    name: 'ミラ',
    emoji: '🔮',
    maxHp: 22,
    atk: 20,
    def: 1,
    description: '魔法使い。敵の守備を無視して攻撃する。',
    cost: 140,
    minLevel: 4,
    special: 'mage',
  },
  {
    id: 'eln',
    name: 'エルン',
    emoji: '💚',
    maxHp: 30,
    atk: 7,
    def: 4,
    description: '僧侶。主人公のHPが低いと回復してくれる。',
    cost: 180,
    minLevel: 6,
    special: 'healer',
  },
];

const SAVE_KEY = 'rpg_save_v2';

// ── Slime burst effect ───────────────────────────────────────────
// 全画面に飛び散るパーティクル（vw/vh単位）
const SLIME_PARTICLES = Array.from({ length: 32 }, (_, i) => {
  const angle = (i / 32) * 2 * Math.PI + 0.1;
  const dx = 32 + (i % 6) * 8;   // 32〜72vw
  const dy = 28 + (i % 6) * 7;   // 28〜63vh
  return {
    tx:    `${Math.round(Math.cos(angle) * dx)}vw`,
    ty:    `${Math.round(Math.sin(angle) * dy)}vh`,
    size:  14 + (i % 7) * 7,      // 14〜56px
    delay: (i % 6) * 20,
    color: ['#4ade80','#22d3ee','#86efac','#67e8f9','#a3e635','#34d399'][i % 6],
  };
});

function playSlimeBurst() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t = ctx.currentTime;

    // コンプレッサーで迫力UP
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -4;
    comp.knee.value = 0;
    comp.ratio.value = 20;
    comp.attack.value = 0.001;
    comp.release.value = 0.15;
    comp.connect(ctx.destination);

    // 1. 超低音ドーン（2波）
    [0, 0.07].forEach((offset, wi) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(60 - wi * 12, t + offset);
      o.frequency.exponentialRampToValueAtTime(22, t + offset + 0.55);
      g.gain.setValueAtTime(0, t + offset);
      g.gain.linearRampToValueAtTime(2.5, t + offset + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.6);
      o.connect(g); g.connect(comp);
      o.start(t + offset); o.stop(t + offset + 0.65);
    });

    // 2. 中域インパクト
    const mid = ctx.createOscillator();
    const midG = ctx.createGain();
    mid.type = 'triangle';
    mid.frequency.setValueAtTime(500, t);
    mid.frequency.exponentialRampToValueAtTime(40, t + 0.28);
    midG.gain.setValueAtTime(1.4, t);
    midG.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    mid.connect(midG); midG.connect(comp);
    mid.start(t); mid.stop(t + 0.35);

    // 3. 高音クラック
    const hi = ctx.createOscillator();
    const hiG = ctx.createGain();
    hi.type = 'sawtooth';
    hi.frequency.setValueAtTime(2200, t);
    hi.frequency.exponentialRampToValueAtTime(80, t + 0.09);
    hiG.gain.setValueAtTime(0.7, t);
    hiG.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    hi.connect(hiG); hiG.connect(comp);
    hi.start(t); hi.stop(t + 0.12);

    // 4. ノイズ爆発
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * 0.65, sr);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 0.9);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(4000, t);
    lpf.frequency.exponentialRampToValueAtTime(120, t + 0.45);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(1.8, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    src.connect(lpf); lpf.connect(ng); ng.connect(comp);
    src.start(t);

    // 5. 残響（遅延エコー）
    const echo = ctx.createOscillator();
    const echoG = ctx.createGain();
    echo.type = 'sine';
    echo.frequency.setValueAtTime(45, t + 0.1);
    echo.frequency.exponentialRampToValueAtTime(18, t + 0.5);
    echoG.gain.setValueAtTime(0, t + 0.1);
    echoG.gain.linearRampToValueAtTime(1.0, t + 0.11);
    echoG.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    echo.connect(echoG); echoG.connect(comp);
    echo.start(t + 0.1); echo.stop(t + 0.6);

    setTimeout(() => ctx.close(), 1800);
  } catch { /* Web Audio 未対応環境 */ }
}

// ── Helpers ──────────────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calcDamage(atk: number, def: number) {
  return Math.max(1, atk - def + rand(-2, 3));
}

function spawnEnemy(data: EnemyData): Enemy {
  return { ...data, currentHp: data.hp };
}

function saveGame(p: Player, comps: ActiveCompanion[]) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ player: p, companions: comps })); } catch { /* noop */ }
}

function loadGame(): { player: Player; companions: ActiveCompanion[] } | null {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (!s) return null;
    const data = JSON.parse(s);
    if (!data.companions) return { player: data as Player, companions: [] };
    return data as { player: Player; companions: ActiveCompanion[] };
  } catch { return null; }
}

function hpBarColor(hp: number, max: number) {
  const r = hp / max;
  if (r > 0.5) return 'bg-green-500';
  if (r > 0.25) return 'bg-yellow-400';
  return 'bg-red-500';
}

function calcExpPct(player: Player) {
  if (player.level >= 10) return 100;
  const base = EXP_TABLE[player.level] ?? 0;
  const goal = EXP_TABLE[player.level + 1] ?? base + 1;
  return Math.min(100, ((player.exp - base) / (goal - base)) * 100);
}

function calcExpToNext(player: Player) {
  if (player.level >= 10) return 0;
  return (EXP_TABLE[player.level + 1] ?? 0) - player.exp;
}

function applyLevelUps(p: Player): { player: Player; msgs: string[] } {
  const msgs: string[] = [];
  let np = { ...p };
  while (np.level < 10 && np.exp >= (EXP_TABLE[np.level + 1] ?? Infinity)) {
    np = { ...np, level: np.level + 1, maxHp: np.maxHp + 8, hp: np.maxHp + 8, atk: np.atk + 3, def: np.def + 1 };
    msgs.push(`🎉 レベルアップ！ Lv.${np.level}（HP・ATK・DEF UP！）`);
  }
  return { player: np, msgs };
}

// ── Component ────────────────────────────────────────────────────
export default function Home() {
  const [screen, setScreen]         = useState<Screen>('title');
  const [player, setPlayer]         = useState<Player>({ ...INIT_PLAYER });
  const [companions, setCompanions] = useState<ActiveCompanion[]>([]);
  const [enemy, setEnemy]           = useState<Enemy | null>(null);
  const [log, setLog]               = useState<string[]>([]);

  const [hasSave, setHasSave]       = useState(false);
  const [shopMsg, setShopMsg]           = useState('');
  const [busy, setBusy]                 = useState(false);
  const [showSlimeExplosion, setShowSlimeExplosion] = useState(false);
  const [shakeEnemy, setShakeEnemy]     = useState(false);

  useEffect(() => { setHasSave(!!loadGame()); }, []);

  // ── Shared ───────────────────────────────────────────────────
  const startVillage = useCallback((p: Player, comps: ActiveCompanion[], msgs: string[] = []) => {
    setPlayer(p);
    setCompanions(comps);
    setEnemy(null);
    setLog(msgs);
    setBusy(false);
    setScreen('village');
  }, []);

  const handleNewGame = () => {
    startVillage({ ...INIT_PLAYER }, []);
  };

  const handleContinue = () => {
    const saved = loadGame();
    if (saved) startVillage(saved.player, saved.companions);
  };

  // ── Village ──────────────────────────────────────────────────
  const handleSave = () => {
    saveGame(player, companions);
    setLog(['💾 セーブしました。']);
  };

  const handleRest = () => {
    if (player.gold < 30) { setLog(['お金が足りない！（宿代30G）']); return; }
    const playerFull = player.hp === player.maxHp;
    const compsFull = companions.every(c => c.hp === c.maxHp);
    if (playerFull && compsFull) { setLog(['全員HPは満タンです。']); return; }
    const healed = player.maxHp - player.hp;
    const koRevived = companions.filter(c => c.hp <= 0).length;
    setPlayer(p => ({ ...p, hp: p.maxHp, gold: p.gold - 30 }));
    setCompanions(prev => prev.map(c => ({ ...c, hp: c.maxHp })));
    const msg = `🏨 宿屋で休んだ。HP+${healed}（-30G）` + (koRevived > 0 ? `　仲間${koRevived}人が復活！` : '');
    setLog([msg]);
  };

  const goExplore = (pool: EnemyData[]) => {
    const pick = pool[rand(0, pool.length - 1)];
    setEnemy(spawnEnemy(pick));
    setLog([`${pick.emoji} ${pick.name}が現れた！`]);
    setBusy(false);
    setScreen('battle');
  };

  const goBoss = () => {
    setEnemy(spawnEnemy(BOSS));
    setLog(['🐲 魔王ドラゴンが現れた！']);
    setBusy(false);
    setScreen('battle');
  };

  const buyPotion = () => {
    if (player.gold < 40) { setShopMsg('お金が足りない！'); return; }
    setPlayer(p => ({ ...p, gold: p.gold - 40, potions: p.potions + 1 }));
    setShopMsg('ポーションを購入した！');
  };

  const handleRecruit = (template: CompanionTemplate) => {
    if (player.gold < template.cost) { setShopMsg('お金が足りない！'); return; }
    if (companions.some(c => c.id === template.id)) { setShopMsg('すでに仲間にいます。'); return; }
    setPlayer(p => ({ ...p, gold: p.gold - template.cost }));
    setCompanions(prev => [...prev, { ...template, hp: template.maxHp }]);
    setShopMsg(`${template.name} が仲間になった！`);
  };

  // ── Battle core ──────────────────────────────────────────────
  const resolveVictory = useCallback((
    messages: string[],
    finalEnemyData: Enemy,
    finalPlayerHp: number,
    finalCompanions: ActiveCompanion[],
    currentPlayer: Player,
  ) => {
    messages.unshift(`✨ ${finalEnemyData.name}を倒した！`);
    messages.push(`EXP+${finalEnemyData.exp}  G+${finalEnemyData.gold}`);
    let np = { ...currentPlayer, hp: finalPlayerHp, exp: currentPlayer.exp + finalEnemyData.exp, gold: currentPlayer.gold + finalEnemyData.gold };
    const { player: leveled, msgs: lvMsgs } = applyLevelUps(np);
    np = leveled;
    messages.push(...lvMsgs);
    setEnemy({ ...finalEnemyData, currentHp: 0 });
    setBusy(true);

    if (finalEnemyData.name.includes('スライム')) {
      playSlimeBurst();
      setShakeEnemy(true);
      setShowSlimeExplosion(true);
      setTimeout(() => { setShakeEnemy(false); setShowSlimeExplosion(false); }, 700);
    }

    if (finalEnemyData.isBoss) {
      np = { ...np, bossDefeated: true };
      saveGame(np, finalCompanions);
      setPlayer(np);
      setCompanions(finalCompanions);
      setLog(messages);
      setTimeout(() => setScreen('clear'), 2200);
    } else {
      setLog(messages);
      setTimeout(() => startVillage(np, finalCompanions, messages), 2000);
    }
  }, [startVillage]);

  const runCompanionActions = (
    comps: ActiveCompanion[],
    enemyHp: number,
    playerHp: number,
    playerMaxHp: number,
    enemyData: Enemy,
    messages: string[],
  ): { comps: ActiveCompanion[]; enemyHp: number; playerHp: number } => {
    let curEnemyHp = enemyHp;
    let curPlayerHp = playerHp;
    const newComps = comps.map(c => ({ ...c }));

    for (let i = 0; i < newComps.length; i++) {
      const comp = newComps[i];
      if (comp.hp <= 0 || curEnemyHp <= 0) continue;

      if (comp.special === 'healer' && curPlayerHp < playerMaxHp * 0.5) {
        const heal = Math.min(rand(12, 18), playerMaxHp - curPlayerHp);
        curPlayerHp = Math.min(playerMaxHp, curPlayerHp + heal);
        messages.push(`💚 ${comp.name}の回復魔法！ HPが ${heal} 回復した！`);
      } else if (comp.special === 'mage') {
        const magicDmg = Math.max(1, comp.atk + rand(-2, 4));
        curEnemyHp = Math.max(0, curEnemyHp - magicDmg);
        messages.push(`🔮 ${comp.name}の魔法！ ${enemyData.name}に ${magicDmg} ダメージ！`);
      } else {
        const compDmg = calcDamage(comp.atk, enemyData.def);
        curEnemyHp = Math.max(0, curEnemyHp - compDmg);
        messages.push(`${comp.emoji} ${comp.name}の攻撃！ ${enemyData.name}に ${compDmg} ダメージ！`);
      }
    }
    return { comps: newComps, enemyHp: curEnemyHp, playerHp: curPlayerHp };
  };

  const runEnemyAttack = (
    comps: ActiveCompanion[],
    playerHp: number,
    enemyData: Enemy,
    playerDef: number,
    messages: string[],
    playerName: string,
  ): { comps: ActiveCompanion[]; playerHp: number } => {
    const newComps = comps.map(c => ({ ...c }));
    const aliveCompIdxs = newComps.map((_, i) => i).filter(i => newComps[i].hp > 0);
    // Build target pool: player gets 2 slots, each alive companion gets 1
    const pool: Array<'player' | number> = ['player', 'player', ...aliveCompIdxs];
    const pick = pool[rand(0, pool.length - 1)];

    if (pick === 'player') {
      const dmg = calcDamage(enemyData.atk, playerDef);
      messages.push(`💢 ${enemyData.name}の攻撃！ ${playerName}に ${dmg} ダメージ！`);
      return { comps: newComps, playerHp: Math.max(0, playerHp - dmg) };
    } else {
      const idx = pick as number;
      const comp = newComps[idx];
      const dmg = calcDamage(enemyData.atk, comp.def);
      newComps[idx] = { ...comp, hp: Math.max(0, comp.hp - dmg) };
      messages.push(`💢 ${enemyData.name}の攻撃！ ${comp.name}に ${dmg} ダメージ！`);
      if (newComps[idx].hp <= 0) messages.push(`${comp.emoji} ${comp.name} は倒れた…`);
      return { comps: newComps, playerHp };
    }
  };

  const handleAttack = () => {
    if (!enemy || busy) return;
    const messages: string[] = [];
    let curEnemyHp = enemy.currentHp;
    let curPlayerHp = player.hp;

    // 1. Player attacks
    const playerDmg = calcDamage(player.atk, enemy.def);
    curEnemyHp = Math.max(0, curEnemyHp - playerDmg);
    messages.push(`⚔️ ${player.name}の攻撃！ ${enemy.name}に ${playerDmg} ダメージ！`);

    if (curEnemyHp <= 0) {
      resolveVictory(messages, enemy, curPlayerHp, companions, player);
      return;
    }

    // 2. Companions act
    const afterComps = runCompanionActions(companions, curEnemyHp, curPlayerHp, player.maxHp, enemy, messages);
    curEnemyHp = afterComps.enemyHp;
    curPlayerHp = afterComps.playerHp;

    if (curEnemyHp <= 0) {
      resolveVictory(messages, enemy, curPlayerHp, afterComps.comps, player);
      return;
    }

    // 3. Enemy attacks
    const afterEnemy = runEnemyAttack(afterComps.comps, curPlayerHp, enemy, player.def, messages, player.name);
    curPlayerHp = afterEnemy.playerHp;

    setEnemy({ ...enemy, currentHp: curEnemyHp });
    setPlayer(p => ({ ...p, hp: curPlayerHp }));
    setCompanions(afterEnemy.comps);
    setLog(messages);

    if (curPlayerHp <= 0) { setBusy(true); setTimeout(() => setScreen('gameover'), 1600); }
  };

  const handlePotion = () => {
    if (!enemy || busy || player.potions <= 0) return;
    const messages: string[] = [];
    const heal = Math.min(35, player.maxHp - player.hp);
    let curPlayerHp = player.hp + heal;
    const curPotions = player.potions - 1;
    messages.push(`🧪 ポーションを使った！ HP+${heal}`);

    // Companions act
    const afterComps = runCompanionActions(companions, enemy.currentHp, curPlayerHp, player.maxHp, enemy, messages);
    let curEnemyHp = afterComps.enemyHp;
    curPlayerHp = afterComps.playerHp;

    if (curEnemyHp <= 0) {
      setPlayer(p => ({ ...p, hp: curPlayerHp, potions: curPotions }));
      resolveVictory(messages, enemy, curPlayerHp, afterComps.comps, { ...player, hp: curPlayerHp, potions: curPotions });
      return;
    }

    // Enemy attacks
    const afterEnemy = runEnemyAttack(afterComps.comps, curPlayerHp, enemy, player.def, messages, player.name);
    curPlayerHp = afterEnemy.playerHp;

    setEnemy({ ...enemy, currentHp: curEnemyHp });
    setPlayer(p => ({ ...p, hp: curPlayerHp, potions: curPotions }));
    setCompanions(afterEnemy.comps);
    setLog(messages);

    if (curPlayerHp <= 0) { setBusy(true); setTimeout(() => setScreen('gameover'), 1600); }
  };

  const handleFlee = () => {
    if (!enemy || busy) return;
    if (enemy.isBoss) { setLog(['魔王からは逃げられない！']); return; }
    if (Math.random() < 0.5) {
      setLog(['💨 うまく逃げ出した！']);
      setBusy(true);
      setTimeout(() => startVillage(player, companions, ['逃げ帰ってきた…']), 900);
    } else {
      const afterEnemy = runEnemyAttack(companions, player.hp, enemy, player.def, [], player.name);
      const newHp = afterEnemy.playerHp;
      setPlayer(p => ({ ...p, hp: newHp }));
      setCompanions(afterEnemy.comps);
      setLog([`逃げられなかった！`, `💢 ${enemy.name}の攻撃！`]);
      if (newHp <= 0) { setBusy(true); setTimeout(() => setScreen('gameover'), 1600); }
    }
  };

  // ── Sub-components ───────────────────────────────────────────
  const HpBar = ({ hp, max, thin }: { hp: number; max: number; thin?: boolean }) => (
    <div className={`w-full bg-gray-700 rounded-full ${thin ? 'h-2' : 'h-3'}`}>
      <div className={`${hpBarColor(hp, max)} rounded-full transition-all duration-300 ${thin ? 'h-2' : 'h-3'}`}
        style={{ width: `${Math.max(0, (hp / max) * 100)}%` }} />
    </div>
  );

  const CompanionAvatar = ({ size }: { size: number }) => (
    <div className={`relative rounded-full overflow-hidden border-2 border-pink-400 shrink-0`}
      style={{ width: size, height: size }}>
      <Image src="/companion.jpg" alt="仲間" fill className="object-cover object-top" />
    </div>
  );

  const PartyStatus = ({ small }: { small?: boolean }) =>
    companions.length === 0 ? null : (
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
        {!small && <p className="text-xs text-gray-500 mb-2">仲間</p>}
        {companions.map(comp => (
          <div key={comp.id} className={`flex items-center gap-2 mb-1.5 last:mb-0 ${comp.hp <= 0 ? 'opacity-40' : ''}`}>
            <CompanionAvatar size={small ? 22 : 28} />
            <span className="text-xs text-gray-300 w-14 shrink-0">{comp.name}{comp.hp <= 0 ? ' KO' : ''}</span>
            <HpBar hp={comp.hp} max={comp.maxHp} thin />
            <span className="text-xs text-white w-14 text-right shrink-0">{comp.hp}/{comp.maxHp}</span>
          </div>
        ))}
      </div>
    );

  // ── Render ───────────────────────────────────────────────────

  if (screen === 'title') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl space-y-6 text-center">
        <div>
          <p className="text-5xl mb-2">⚔️</p>
          <h1 className="text-2xl font-bold text-yellow-400">ブラウザ RPG</h1>
          <p className="text-gray-400 text-sm mt-1">魔王ドラゴンを倒せ！</p>
        </div>
        <div className="space-y-3">
          <p className="text-yellow-300 font-bold text-lg">まっちゃ</p>
          <button onClick={handleNewGame}
            className="w-full py-2.5 rounded-xl bg-yellow-500 text-gray-900 font-bold text-sm hover:bg-yellow-400 transition-colors">
            はじめから
          </button>
          {hasSave && (
            <button onClick={handleContinue}
              className="w-full py-2.5 rounded-xl bg-gray-600 text-white font-bold text-sm hover:bg-gray-500 transition-colors">
              つづきから
            </button>
          )}
        </div>
        <p className="text-gray-600 text-xs">森 → 洞窟 → 魔王の順に挑もう</p>
      </div>
    </div>
  );

  if (screen === 'village') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xs space-y-3">
        {/* Player status */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-yellow-400 shrink-0">
              <Image src="/player.jpg" alt={player.name} fill className="object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-yellow-400 font-bold">{player.name}</p>
              <p className="text-gray-400 text-xs">Lv.{player.level}　⚔{player.atk}　🛡{player.def}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-yellow-300 text-sm font-bold">💰 {player.gold}G</p>
              <p className="text-blue-300 text-xs">🧪 ×{player.potions}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-8 shrink-0">HP</span>
              <HpBar hp={player.hp} max={player.maxHp} />
              <span className="text-xs text-white w-16 text-right shrink-0">{player.hp}/{player.maxHp}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-8 shrink-0">EXP</span>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${calcExpPct(player)}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-16 text-right shrink-0">
                {player.level < 10 ? `次まで${calcExpToNext(player)}` : 'MAX'}
              </span>
            </div>
          </div>
        </div>

        {/* Party */}
        <PartyStatus />

        {/* Log */}
        {log.length > 0 && (
          <div className="bg-gray-800 rounded-xl px-4 py-3 border border-gray-700 space-y-0.5">
            {log.slice(0, 3).map((l, i) => (
              <p key={i} className={`text-sm ${i === 0 ? 'text-white' : 'text-gray-500'}`}>{l}</p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 space-y-2">
          <p className="text-gray-500 text-xs font-semibold mb-1">🏘️ 村</p>
          <button onClick={() => goExplore(FOREST_ENEMIES)}
            className="w-full py-3 rounded-xl bg-green-800 hover:bg-green-700 text-white font-bold text-sm transition-colors">
            🌲 森へ探索
          </button>
          <button onClick={() => goExplore(CAVE_ENEMIES)} disabled={player.level < 4}
            className="w-full py-3 rounded-xl bg-orange-900 hover:bg-orange-800 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            🗻 洞窟へ探索{player.level < 4 ? '　（Lv.4以上）' : ''}
          </button>
          <button onClick={goBoss} disabled={player.level < 7 || player.bossDefeated}
            className="w-full py-3 rounded-xl bg-red-900 hover:bg-red-800 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-red-700">
            🐲 魔王に挑む{player.bossDefeated ? '　（撃破済）' : player.level < 7 ? '　（Lv.7以上）' : ''}
          </button>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button onClick={handleRest}
              className="py-2.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              🏨 宿屋<br /><span className="text-xs">30G</span>
            </button>
            <button onClick={() => { setScreen('shop'); setShopMsg(''); }}
              className="py-2.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
              🏪 道具屋
            </button>
            <button onClick={() => { setScreen('tavern'); setShopMsg(''); }}
              className="py-2.5 rounded-xl bg-amber-800 hover:bg-amber-700 text-white text-sm font-medium transition-colors">
              🍺 酒場
            </button>
          </div>
          <button onClick={handleSave}
            className="w-full py-2 rounded-xl bg-gray-600 hover:bg-gray-500 text-white text-sm transition-colors">
            💾 セーブ
          </button>
        </div>
      </div>
    </div>
  );

  if (screen === 'shop') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-gray-800 rounded-2xl p-5 border border-gray-700 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold">🏪 道具屋</h2>
          <p className="text-yellow-300 text-sm font-bold">💰 {player.gold}G</p>
        </div>
        {shopMsg && <p className="text-green-400 text-sm">{shopMsg}</p>}
        <div className="border border-gray-700 rounded-xl p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-white font-medium text-sm">🧪 ポーション</p>
            <p className="text-gray-400 text-xs">HP を 35 回復する</p>
          </div>
          <button onClick={buyPotion}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors shrink-0">
            40G
          </button>
        </div>
        <button onClick={() => setScreen('village')}
          className="w-full py-2.5 rounded-xl bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium transition-colors">
          ← 村に戻る
        </button>
      </div>
    </div>
  );

  if (screen === 'tavern') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-gray-800 rounded-2xl p-5 border border-gray-700 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold">🍺 酒場　仲間を雇う</h2>
          <p className="text-yellow-300 text-sm font-bold">💰 {player.gold}G</p>
        </div>
        {shopMsg && <p className="text-green-400 text-sm mb-1">{shopMsg}</p>}
        <div className="space-y-3">
          {COMPANION_TEMPLATES.map(tmpl => {
            const recruited = companions.some(c => c.id === tmpl.id);
            const active    = companions.find(c => c.id === tmpl.id);
            const unlocked  = player.level >= tmpl.minLevel;
            return (
              <div key={tmpl.id} className={`border rounded-xl p-3 ${recruited ? 'border-green-700 bg-green-900/20' : unlocked ? 'border-gray-600' : 'border-gray-700 opacity-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-pink-400 shrink-0">
                    <Image src="/companion.jpg" alt={tmpl.name} fill className="object-cover object-top" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{tmpl.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{tmpl.description}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      HP:{tmpl.maxHp}　ATK:{tmpl.atk}　DEF:{tmpl.def}
                    </p>
                    {recruited && active && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400 shrink-0">HP</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                          <div className={`${hpBarColor(active.hp, active.maxHp)} h-1.5 rounded-full`}
                            style={{ width: `${(active.hp / active.maxHp) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-300 shrink-0">{active.hp}/{active.maxHp}</span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {recruited ? (
                      <span className="text-green-400 text-xs font-bold">仲間中</span>
                    ) : !unlocked ? (
                      <span className="text-gray-500 text-xs">Lv.{tmpl.minLevel}〜</span>
                    ) : (
                      <button onClick={() => handleRecruit(tmpl)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors">
                        {tmpl.cost}G
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setScreen('village')}
          className="w-full py-2.5 rounded-xl bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium transition-colors">
          ← 村に戻る
        </button>
      </div>
    </div>
  );

  if (screen === 'battle' && enemy) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xs space-y-3">
        {/* Enemy */}
        <div
          className={`relative bg-gray-800 rounded-2xl p-5 border ${enemy.isBoss ? 'border-red-600' : 'border-gray-700'} text-center`}
          style={shakeEnemy ? { animation: 'screen-shake 0.45s ease' } : undefined}
        >
          {enemy.isBoss && <p className="text-red-400 text-xs font-bold tracking-widest mb-1">⚠️ BOSS BATTLE</p>}
          {enemy.name.includes('スライム') ? (
            <div className="relative w-28 h-28 mx-auto mb-1">
              <Image src="/slime.svg" alt={enemy.name} fill />
            </div>
          ) : (
            <p className="text-6xl mb-2">{enemy.emoji}</p>
          )}
          <p className={`font-bold text-lg ${enemy.isBoss ? 'text-red-400' : 'text-white'}`}>{enemy.name}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400 w-8 shrink-0">HP</span>
            <HpBar hp={enemy.currentHp} max={enemy.hp} />
            <span className="text-xs text-white w-20 text-right shrink-0">{enemy.currentHp}/{enemy.hp}</span>
          </div>
        </div>

        {/* 全画面スライム破裂エフェクト */}
        {showSlimeExplosion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
            {/* 画面フラッシュ */}
            <div className="absolute inset-0" style={{ animation: 'slime-flash 0.75s ease' }} />
            {/* 衝撃波リング × 3 */}
            {[0, 100, 200].map(delay => (
              <div key={delay} className="absolute rounded-full border-4 border-cyan-300"
                style={{ width: 60, height: 60, animation: `shockwave 0.9s ease-out ${delay}ms forwards` }} />
            ))}
            {/* パーティクル */}
            {SLIME_PARTICLES.map((p, i) => (
              <div key={i} className="absolute rounded-full"
                style={{
                  width: p.size, height: p.size,
                  backgroundColor: p.color,
                  '--tx': p.tx, '--ty': p.ty,
                  animation: `slime-particle 0.9s ease-out ${p.delay}ms forwards`,
                } as React.CSSProperties}
              />
            ))}
            {/* SPLAT テキスト */}
            <span className="relative z-10 font-black select-none"
              style={{
                fontSize: '4rem',
                color: '#ecfdf5',
                textShadow: '0 0 20px #4ade80, 0 0 50px #22c55e, 0 0 80px #16a34a',
                animation: 'slime-splat 0.85s ease forwards',
              }}>
              💥 SPLAT!!!
            </span>
          </div>
        )}

        {/* Battle log */}
        <div className="bg-gray-800 rounded-xl px-4 py-3 border border-gray-700 min-h-[72px]">
          {log.map((l, i) => (
            <p key={i} className={`text-sm ${i === 0 ? 'text-white' : 'text-gray-500'}`}>{l}</p>
          ))}
        </div>

        {/* Player status */}
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-yellow-400 shrink-0">
              <Image src="/player.jpg" alt={player.name} fill className="object-cover object-top" />
            </div>
            <span className="text-xs text-gray-300 flex-1">{player.name}　Lv.{player.level}　⚔{player.atk}　🛡{player.def}</span>
            <span className="text-xs text-gray-400 shrink-0">🧪 ×{player.potions}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-8 shrink-0">HP</span>
            <HpBar hp={player.hp} max={player.maxHp} />
            <span className="text-xs text-white w-16 text-right shrink-0">{player.hp}/{player.maxHp}</span>
          </div>
        </div>

        {/* Companions in battle */}
        <PartyStatus small />

        {/* Battle buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={handleAttack} disabled={busy}
            className="py-4 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-40">
            ⚔️<br />攻撃
          </button>
          <button onClick={handlePotion} disabled={busy || player.potions === 0}
            className="py-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm transition-colors disabled:opacity-40">
            🧪<br />ポーション
          </button>
          <button onClick={handleFlee} disabled={busy || !!enemy.isBoss}
            className="py-4 rounded-xl bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm transition-colors disabled:opacity-40">
            💨<br />逃げる
          </button>
        </div>
      </div>
    </div>
  );

  if (screen === 'gameover') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-gray-800 rounded-2xl p-8 border border-red-900 text-center space-y-4">
        <p className="text-5xl">💀</p>
        <h2 className="text-2xl font-bold text-red-400">ゲームオーバー</h2>
        <p className="text-gray-300">{player.name} は倒れてしまった…</p>
        <p className="text-gray-500 text-sm">Lv.{player.level} | EXP {player.exp} | 💰 {player.gold}G</p>
        <button onClick={() => { setScreen('title'); }}
          className="w-full py-2.5 rounded-xl bg-gray-600 hover:bg-gray-500 text-white font-bold transition-colors">
          タイトルへ
        </button>
      </div>
    </div>
  );

  if (screen === 'clear') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-gray-800 rounded-2xl p-8 border border-yellow-500 text-center space-y-4">
        <p className="text-5xl">🏆</p>
        <h2 className="text-2xl font-bold text-yellow-400">ゲームクリア！</h2>
        <p className="text-white font-bold">{player.name} は魔王を倒した！</p>
        {companions.length > 0 && (
          <p className="text-gray-300 text-sm">仲間：{companions.map(c => c.name).join('・')}</p>
        )}
        <div className="text-gray-300 text-sm space-y-1">
          <p>最終 Lv.{player.level}</p>
          <p>💰 {player.gold}G 所持</p>
        </div>
        <button onClick={() => { setScreen('title'); }}
          className="w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold transition-colors">
          タイトルへ
        </button>
      </div>
    </div>
  );

  return null;
}
