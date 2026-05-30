"""家計簿デスクトップアプリ エントリポイント"""
import sys


def check():
    missing = []
    for pkg in ('customtkinter', 'matplotlib'):
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"パッケージが不足しています: {', '.join(missing)}")
        print(f"インストール:  pip install {' '.join(missing)}")
        sys.exit(1)


check()

import customtkinter as ctk
from datetime import date
import storage
from tab_home     import HomeTab
from tab_calendar import CalendarTab
from tab_graphs   import GraphTab
from tab_settings import SettingsTab

ctk.set_appearance_mode('light')
ctk.set_default_color_theme('blue')


class KakeiboApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title('💰 家計簿')
        self.geometry('1020x720')
        self.minsize(800, 600)

        self._data  = storage.load_data()
        self._month = storage.current_month()

        # 固定費の自動適用
        if storage.apply_fixed_items(self._data):
            storage.save_data(self._data)

        self._build_ui()

    # ── UI構築 ───────────────────────────────────────────────────
    def _build_ui(self):
        # ヘッダー
        header = ctk.CTkFrame(self, height=52, corner_radius=0, fg_color=('white', 'gray15'))
        header.pack(fill='x')
        header.pack_propagate(False)

        ctk.CTkLabel(header, text='💰 家計簿', font=ctk.CTkFont(size=20, weight='bold')).pack(side='left', padx=16, pady=12)

        # 月ナビゲーション
        nav = ctk.CTkFrame(header, fg_color='transparent')
        nav.pack(side='right', padx=16, pady=10)
        ctk.CTkButton(nav, text='◀', width=32, height=30, command=self._prev_month).pack(side='left')
        self._month_lbl = ctk.CTkLabel(nav, text=self._fmt_month(), width=110, font=ctk.CTkFont(size=15, weight='bold'))
        self._month_lbl.pack(side='left', padx=6)
        ctk.CTkButton(nav, text='▶', width=32, height=30, command=self._next_month).pack(side='left')

        # タブ
        self._tabview = ctk.CTkTabview(self, anchor='nw')
        self._tabview.pack(fill='both', expand=True, padx=6, pady=4)
        for name in ['ホーム', 'カレンダー', 'グラフ', '設定']:
            self._tabview.add(name)

        self._home = HomeTab(self._tabview.tab('ホーム'), self._data, self._month, self._on_change)
        self._home.pack(fill='both', expand=True)

        self._cal = CalendarTab(self._tabview.tab('カレンダー'), self._data, self._month, self._on_change)
        self._cal.pack(fill='both', expand=True)

        self._graph = GraphTab(self._tabview.tab('グラフ'), self._data)
        self._graph.pack(fill='both', expand=True)

        self._settings = SettingsTab(self._tabview.tab('設定'), self._data, self._on_change)
        self._settings.pack(fill='both', expand=True)

    # ── 月ナビ ────────────────────────────────────────────────────
    def _fmt_month(self) -> str:
        y, m = self._month.split('-')
        return f"{y}年{int(m)}月"

    def _prev_month(self):
        y, m = map(int, self._month.split('-'))
        m -= 1
        if m == 0:
            m, y = 12, y - 1
        self._month = f"{y:04d}-{m:02d}"
        self._month_lbl.configure(text=self._fmt_month())
        self._home.refresh(self._data, self._month)
        self._cal.refresh(self._data, self._month)

    def _next_month(self):
        y, m = map(int, self._month.split('-'))
        m += 1
        if m == 13:
            m, y = 1, y + 1
        self._month = f"{y:04d}-{m:02d}"
        self._month_lbl.configure(text=self._fmt_month())
        self._home.refresh(self._data, self._month)
        self._cal.refresh(self._data, self._month)

    # ── データ変更 ────────────────────────────────────────────────
    def _on_change(self, data: dict):
        self._data = data
        storage.save_data(data)
        self._home.refresh(data, self._month)
        self._cal.refresh(data, self._month)
        self._graph.refresh(data)
        self._settings.refresh(data)


if __name__ == '__main__':
    app = KakeiboApp()
    app.mainloop()
