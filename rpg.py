"""
╔═══════════════════════════════════════════╗
║        ⚔  DRAGON QUEST · PY EDITION  ⚔        ║
║     VSCode / ターミナルで動くPython RPG       ║
╚═══════════════════════════════════════════╝

使い方:
  python rpg_game.py

Python 3.8 以上対応。外部ライブラリ不要。
"""

import random
import sys
import os
import time

# ─────────────── ANSI カラー ───────────────
class C:
    GOLD   = "\033[93m"
    RED    = "\033[91m"
    GREEN  = "\033[92m"
    BLUE   = "\033[94m"
    CYAN   = "\033[96m"
    PURPLE = "\033[95m"
    GRAY   = "\033[90m"
    WHITE  = "\033[97m"
    BOLD   = "\033[1m"
    RESET  = "\033[0m"

def col(text, *colors):
    return "".join(colors) + str(text) + C.RESET

def clear():
    os.system("cls" if os.name == "nt" else "clear")

def pause(sec=0.6):
    time.sleep(sec)

def hr(char="─", n=45):
    print(col(char * n, C.GRAY))

def bar(current, maximum, width=20, color=C.RED):
    filled = int(width * current / max(maximum, 1))
    return col("█" * filled, color) + col("░" * (width - filled), C.GRAY)

# ─────────────── データ定義 ───────────────
ENEMIES = [
    {
        "name": "スライム", "max_hp": 12, "atk": 4, "def": 1,
        "exp": 8, "gold": 5, "skills": [],
        "art": [
            "   ██████   ",
            "  ████████  ",
            " ██  ██  ██ ",
            "  ████████  ",
        ]
    },
    {
        "name": "ゴブリン", "max_hp": 20, "atk": 7, "def": 2,
        "exp": 15, "gold": 10, "skills": ["毒攻撃"],
        "art": [
            "   /\\  /\\   ",
            "  ( ^  ^ )  ",
            "   \\  ◡  /   ",
            "  __|____|__ ",
        ]
    },
    {
        "name": "オーク", "max_hp": 35, "atk": 12, "def": 5,
        "exp": 30, "gold": 20, "skills": ["強打"],
        "art": [
            "  ╔════╗  ",
            "  ║ ●● ║  ",
            "  ╠╦══╦╣  ",
            "  ╚╩══╩╝  ",
        ]
    },
    {
        "name": "ドラゴン", "max_hp": 60, "atk": 18, "def": 8,
        "exp": 60, "gold": 50, "skills": ["炎ブレス", "強打"],
        "art": [
            "   /\\___/\\   ",
            "  / ◉   ◉ \\  ",
            " |  ~~~~~  | ",
            "  \\ /|◆|\\ /  ",
            "   \\/   \\/   ",
        ]
    },
]

SPELLS = [
    {"name": "ファイア",     "mp": 4, "mult": 1.6, "lv": 2, "color": C.RED},
    {"name": "ブリザード",   "mp": 6, "mult": 2.0, "lv": 4, "color": C.CYAN},
    {"name": "ライトニング", "mp": 8, "mult": 2.5, "lv": 6, "color": C.GOLD},
]

SHOP_ITEMS = [
    {"id": "potion",   "name": "薬草",   "cost": 15, "desc": "HP+25"},
    {"id": "ether",    "name": "エーテル", "cost": 25, "desc": "MP+10"},
    {"id": "antidote", "name": "解毒剤", "cost": 10, "desc": "毒を治す"},
    {"id": "herb",     "name": "生命草", "cost": 40, "desc": "HP+50"},
]

# ─────────────── クラス定義 ───────────────
class Hero:
    def __init__(self):
        self.name = "勇者"
        self.lv = 1
        self.hp = 20
        self.max_hp = 20
        self.mp = 10
        self.max_mp = 10
        self.atk = 8
        self.def_ = 4
        self.gold = 50
        self.exp = 0
        self.exp_next = 30
        self.status = []   # 状態異常
        self.inventory = {"potion": 0, "ether": 0, "antidote": 0, "herb": 0}

    def is_alive(self):
        return self.hp > 0

    def heal(self, amount):
        self.hp = min(self.max_hp, self.hp + amount)

    def restore_mp(self, amount):
        self.mp = min(self.max_mp, self.mp + amount)

    def level_up(self):
        self.lv += 1
        self.exp_next = int(self.exp_next * 1.5)
        self.max_hp += 8
        self.max_mp += 4
        self.atk += 2
        self.def_ += 1
        self.hp = self.max_hp
        self.mp = self.max_mp
        self.status = []

    def show_status(self):
        hr()
        print(col(f"  ⚔ {self.name}  Lv.{self.lv}", C.GOLD, C.BOLD))
        hr()
        print(f"  HP: {bar(self.hp, self.max_hp, color=C.RED)}  {col(f'{self.hp}/{self.max_hp}', C.RED)}")
        print(f"  MP: {bar(self.mp, self.max_mp, color=C.BLUE)}  {col(f'{self.mp}/{self.max_mp}', C.BLUE)}")
        print(f"  EXP: {bar(self.exp, self.exp_next, color=C.GREEN)}  {col(f'{self.exp}/{self.exp_next}', C.GREEN)}")
        hr()
        print(f"  ATK: {col(self.atk, C.WHITE)}  DEF: {col(self.def_, C.WHITE)}  Gold: {col(str(self.gold) + 'G', C.GOLD)}")
        if self.status:
            print(f"  状態: {col(', '.join(self.status), C.PURPLE)}")
        else:
            print(f"  状態: {col('正常', C.GREEN)}")
        inv = [f"{n}×{v}" for n, v in {
            "薬草": self.inventory['potion'],
            "エーテル": self.inventory['ether'],
            "解毒剤": self.inventory['antidote'],
            "生命草": self.inventory['herb'],
        }.items() if v > 0]
        print(f"  持ち物: {', '.join(inv) if inv else col('なし', C.GRAY)}")
        hr()


class Enemy:
    def __init__(self, data):
        self.name = data["name"]
        self.hp = data["max_hp"]
        self.max_hp = data["max_hp"]
        self.atk = data["atk"]
        self.def_ = data["def"]
        self.exp = data["exp"]
        self.gold = data["gold"]
        self.skills = data["skills"]
        self.art = data["art"]

    def is_alive(self):
        return self.hp > 0

    def show(self):
        print()
        for line in self.art:
            print(col(f"    {line}", C.PURPLE))
        print()
        hp_bar = bar(self.hp, self.max_hp, width=16, color=C.RED)
        print(f"  {col(self.name, C.PURPLE, C.BOLD)}  HP: {hp_bar} {col(f'{self.hp}/{self.max_hp}', C.RED)}")
        print()

# ─────────────── 入力ユーティリティ ───────────────
def choose(prompt, options):
    """番号で選択。options = [(key, label), ...]"""
    print()
    for i, (_, label) in enumerate(options, 1):
        print(f"  {col(str(i), C.GOLD)}) {label}")
    print()
    while True:
        raw = input(col(f"  {prompt} > ", C.CYAN)).strip()
        if raw.isdigit():
            idx = int(raw) - 1
            if 0 <= idx < len(options):
                return options[idx][0]
        print(col("  番号を入力してください", C.GRAY))

def input_str(prompt):
    return input(col(f"  {prompt} > ", C.CYAN)).strip()

# ─────────────── 戦闘 ───────────────
def battle(hero: Hero):
    pool = [e for e in ENEMIES if e["exp"] <= hero.lv * 20 + 40]
    enemy = Enemy(random.choice(pool))

    print()
    print(col(f"  ⚠  {enemy.name} が現れた！", C.RED, C.BOLD))
    pause()

    while True:
        clear()
        hr("═")
        print(col(f"  ⚔ BATTLE  —  {hero.name} vs {enemy.name}", C.GOLD, C.BOLD))
        hr("═")
        enemy.show()

        # ヒーローHPバー
        print(f"  HP: {bar(hero.hp, hero.max_hp)}  {col(f'{hero.hp}/{hero.max_hp}', C.RED)}  "
              f"MP: {bar(hero.mp, hero.max_mp, color=C.BLUE)}  {col(f'{hero.mp}/{hero.max_mp}', C.BLUE)}")
        if hero.status:
            print(f"  状態: {col(', '.join(hero.status), C.PURPLE)}")
        hr()

        action = choose("行動を選択", [
            ("attack", "⚔  攻撃"),
            ("magic",  "✨  魔法"),
            ("item",   "🎒  アイテム"),
            ("flee",   "💨  逃げる"),
        ])

        print()

        # ── 攻撃 ──
        if action == "attack":
            dmg = max(1, hero.atk - enemy.def_ + random.randint(-2, 3))
            enemy.hp = max(0, enemy.hp - dmg)
            print(col(f"  あなたの攻撃！  {enemy.name}に {dmg} ダメージ！", C.RED))
            pause()

        # ── 魔法 ──
        elif action == "magic":
            available = [s for s in SPELLS if s["lv"] <= hero.lv]
            if not available:
                print(col("  魔法はLv.2以上で覚えます！", C.GRAY))
                pause()
                continue
            opts = [(str(i), f"{s['name']}  (MP:{s['mp']})") for i, s in enumerate(available)]
            opts.append(("back", "← 戻る"))
            sel = choose("魔法を選択", opts)
            if sel == "back":
                continue
            spell = available[int(sel)]
            if hero.mp < spell["mp"]:
                print(col("  MPが足りない！", C.RED))
                pause()
                continue
            hero.mp -= spell["mp"]
            dmg = int(hero.atk * spell["mult"]) + random.randint(0, 5)
            enemy.hp = max(0, enemy.hp - dmg)
            print(col(f"  {spell['name']}！  {enemy.name}に {dmg} の魔法ダメージ！", spell["color"]))
            pause()

        # ── アイテム ──
        elif action == "item":
            usable = [(k, v) for k, v in hero.inventory.items() if v > 0]
            if not usable:
                print(col("  アイテムを持っていない！", C.GRAY))
                pause()
                continue
            item_names = {"potion": "薬草(HP+25)", "ether": "エーテル(MP+10)",
                          "antidote": "解毒剤(毒を治す)", "herb": "生命草(HP+50)"}
            opts = [(k, f"{item_names[k]}  ×{v}") for k, v in usable]
            opts.append(("back", "← 戻る"))
            sel = choose("アイテムを選択", opts)
            if sel == "back":
                continue
            hero.inventory[sel] -= 1
            if sel == "potion":
                hero.heal(25)
                print(col("  薬草を使った！ HP+25", C.GREEN))
            elif sel == "ether":
                hero.restore_mp(10)
                print(col("  エーテルを使った！ MP+10", C.BLUE))
            elif sel == "antidote":
                if "毒" in hero.status:
                    hero.status.remove("毒")
                    print(col("  毒が消えた！", C.GREEN))
                else:
                    print(col("  毒ではなかった。", C.GRAY))
            elif sel == "herb":
                hero.heal(50)
                print(col("  生命草を使った！ HP+50", C.GREEN))
            pause()

        # ── 逃げる ──
        elif action == "flee":
            if random.random() < 0.5:
                print(col("  逃げ出した！", C.CYAN))
                pause()
                return False
            else:
                print(col("  逃げられなかった！", C.RED))
                pause()

        # ── 勝利判定 ──
        if not enemy.is_alive():
            print()
            print(col(f"  ★  {enemy.name} を倒した！", C.GOLD, C.BOLD))
            print(col(f"     {enemy.exp} EXP  と  {enemy.gold} G  を獲得！", C.GOLD))
            hero.exp += enemy.exp
            hero.gold += enemy.gold
            # レベルアップ
            while hero.exp >= hero.exp_next:
                hero.exp -= hero.exp_next
                hero.level_up()
                print()
                print(col(f"  ✦ レベルアップ！  Lv.{hero.lv} になった！", C.GOLD, C.BOLD))
                print(col(f"    HP/MPが全回復！ ATK+2  DEF+1  MaxHP+8  MaxMP+4", C.GREEN))
            pause(1.2)
            return True

        # ── 敵の行動 ──
        if not enemy.is_alive():
            continue

        skill = None
        if enemy.skills and random.random() < 0.35:
            skill = random.choice(enemy.skills)

        dmg = max(1, enemy.atk - hero.def_ + random.randint(-2, 3))

        if skill == "強打":
            dmg = int(dmg * 1.8)
            print(col(f"  {enemy.name} の強打！  {dmg} ダメージ！", C.RED))
        elif skill == "炎ブレス":
            dmg = int(dmg * 2)
            print(col(f"  {enemy.name} の炎ブレス！🔥  {dmg} ダメージ！", C.RED))
        elif skill == "毒攻撃":
            if "毒" not in hero.status:
                hero.status.append("毒")
                print(col(f"  {enemy.name} の毒攻撃！  毒を受けた！  {dmg} ダメージ！", C.PURPLE))
            else:
                print(col(f"  {enemy.name} の攻撃！  {dmg} ダメージ！", C.RED))
        else:
            print(col(f"  {enemy.name} の攻撃！  {dmg} ダメージ！", C.RED))

        hero.hp = max(0, hero.hp - dmg)

        # 毒ダメージ
        if "毒" in hero.status:
            pdmg = max(1, int(hero.max_hp * 0.08))
            hero.hp = max(0, hero.hp - pdmg)
            print(col(f"  毒のダメージ！  {pdmg}！", C.PURPLE))

        pause(0.5)

        if not hero.is_alive():
            clear()
            print()
            print(col("  ＊ GAME OVER ＊", C.RED, C.BOLD))
            print(col("  あなたは倒れた……", C.GRAY))
            print()
            return None   # 死亡


# ─────────────── ショップ ───────────────
def shop(hero: Hero):
    while True:
        clear()
        hr("═")
        print(col("  🏪  SHOP", C.GOLD, C.BOLD))
        hr("═")
        print(f"  所持金: {col(str(hero.gold) + 'G', C.GOLD)}")
        print()
        opts = [(str(i), f"{item['name']}  {item['cost']}G  ─  {item['desc']}")
                for i, item in enumerate(SHOP_ITEMS)]
        opts.append(("back", "← 町に戻る"))
        sel = choose("購入するアイテム", opts)
        if sel == "back":
            break
        item = SHOP_ITEMS[int(sel)]
        if hero.gold < item["cost"]:
            print(col("  お金が足りない！", C.RED))
            pause()
        else:
            hero.gold -= item["cost"]
            hero.inventory[item["id"]] += 1
            print(col(f"  {item['name']}を購入した！", C.GREEN))
            pause()


# ─────────────── 宿屋 ───────────────
def inn(hero: Hero):
    if hero.gold < 10:
        print(col("  宿屋に泊まるには10G必要です。", C.RED))
        pause()
        return
    hero.gold -= 10
    hero.hp = hero.max_hp
    hero.mp = hero.max_mp
    hero.status = []
    print(col("  💤 ぐっすり眠った… HP/MPが全回復した！", C.GREEN))
    pause(1.0)


# ─────────────── タイトル ───────────────
def title_screen():
    clear()
    print()
    print(col("  ╔══════════════════════════════════════════╗", C.GOLD))
    print(col("  ║    ⚔  DRAGON QUEST · PY EDITION  ⚔    ║", C.GOLD, C.BOLD))
    print(col("  ╚══════════════════════════════════════════╝", C.GOLD))
    print()
    print(col("  Python 製テキスト RPG", C.GRAY))
    print(col("  モンスターを倒して勇者を育てよう！", C.WHITE))
    print()


# ─────────────── メインループ ───────────────
def main():
    title_screen()
    name = input_str("勇者の名前を入力してください（Enterでスキップ）")
    hero = Hero()
    if name:
        hero.name = name

    print()
    print(col(f"  ようこそ、{hero.name}！冒険を始めよう。", C.GOLD))
    pause(0.8)

    while True:
        clear()
        hr("═")
        print(col(f"  🏰  {hero.name} の町", C.GOLD, C.BOLD))
        hr("═")
        hero.show_status()

        action = choose("何をしますか？", [
            ("battle", "⚔  冒険に出る（戦闘）"),
            ("shop",   "🏪  ショップ"),
            ("inn",    "💤  宿屋（10G）"),
            ("status", "📊  ステータス確認"),
            ("quit",   "🚪  ゲームを終了"),
        ])

        if action == "battle":
            result = battle(hero)
            if result is None:
                # 死亡
                yn = input_str("やり直しますか？ (y/n)").lower()
                if yn == "y":
                    hero = Hero()
                    if name:
                        hero.name = name
                    print(col("  新しい冒険が始まった！", C.GOLD))
                    pause()
                else:
                    break

        elif action == "shop":
            shop(hero)

        elif action == "inn":
            inn(hero)

        elif action == "status":
            clear()
            hero.show_status()
            input(col("  Enterキーで戻る...", C.GRAY))

        elif action == "quit":
            print()
            print(col("  またいつか冒険しよう！", C.GOLD))
            print()
            sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print(col("  ゲームを終了しました。", C.GRAY))
        print()