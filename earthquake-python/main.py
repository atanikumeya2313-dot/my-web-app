"""地震情報アプリ（Python / CustomTkinter）"""
import sys
import threading
from datetime import datetime


def check_deps():
    missing = [pkg for pkg in ('customtkinter', 'requests', 'matplotlib')
               if not __import__('importlib').util.find_spec(pkg)]
    if missing:
        print(f"不足パッケージ: {', '.join(missing)}")
        print(f"pip install {' '.join(missing)}")
        sys.exit(1)


check_deps()

import customtkinter as ctk
import matplotlib
matplotlib.rcParams['font.family'] = ['Yu Gothic', 'Meiryo', 'MS Gothic', 'DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import api

ctk.set_appearance_mode('light')
ctk.set_default_color_theme('blue')

INTERVAL = 30  # 自動更新間隔（秒）


# ── 詳細ダイアログ ────────────────────────────────────────────────
class EarthquakeDetail(ctk.CTkToplevel):
    def __init__(self, master, quake: dict):
        super().__init__(master)
        h    = quake.get('hypocenter', {})
        name = h.get('name', '不明')
        self.title(f'地震詳細 — {name}')
        self.geometry('400x540')
        self.resizable(False, False)
        self.grab_set()
        self.lift()
        self.focus_force()
        self._build(quake)

    def _build(self, quake: dict):
        h      = quake.get('hypocenter', {})
        scale  = quake.get('maxScale', -1)
        bg, fg = api.scale_colors(scale)
        label  = api.scale_label(scale)
        date_, time_ = api.fmt_time(quake.get('time', ''))
        tsunami = api.tsunami_label(quake.get('domesticTsunami', 'None'))
        mag   = h.get('magnitude', -1) or -1
        depth = h.get('depth', -1)

        # 震度バッジ
        badge = ctk.CTkFrame(self, fg_color=bg, corner_radius=12)
        badge.pack(padx=20, pady=(20, 8), fill='x')
        ctk.CTkLabel(badge, text='最大震度', text_color=fg, font=ctk.CTkFont(size=12)).pack(pady=(14, 0))
        ctk.CTkLabel(badge, text=label, text_color=fg, font=ctk.CTkFont(size=44, weight='bold')).pack()
        ctk.CTkLabel(badge, text=h.get('name', '震源地不明'), text_color=fg, font=ctk.CTkFont(size=13)).pack(pady=(0, 14))

        # 詳細テーブル
        info = ctk.CTkFrame(self, fg_color='transparent')
        info.pack(fill='x', padx=20, pady=4)

        rows = [('発生日時', f'{date_} {time_}')]
        if mag > 0:
            rows.append(('マグニチュード', f'M{mag:.1f}'))
        if depth == 0:
            rows.append(('深さ', 'ごく浅い'))
        elif depth > 0:
            rows.append(('深さ', f'{depth}km'))
        if tsunami:
            rows.append(('津波', tsunami))

        for k, v in rows:
            row = ctk.CTkFrame(info, fg_color='transparent')
            row.pack(fill='x', pady=2)
            ctk.CTkLabel(row, text=k, text_color='gray', width=110, anchor='w',
                         font=ctk.CTkFont(size=12)).pack(side='left')
            color = '#dc2626' if k == '津波' else ('black' if ctk.get_appearance_mode() == 'Light' else 'white')
            ctk.CTkLabel(row, text=v, anchor='w', text_color=color,
                         font=ctk.CTkFont(size=12, weight='bold')).pack(side='left')

        # 都道府県
        prefs = quake.get('prefectures', [])
        if prefs:
            ctk.CTkLabel(self, text='震度を観測した都道府県', text_color='gray',
                         font=ctk.CTkFont(size=11), anchor='w').pack(fill='x', padx=20, pady=(10, 2))
            pref_str = '　'.join(prefs[:15])
            if len(prefs) > 15:
                pref_str += f' 他{len(prefs)-15}県'
            ctk.CTkLabel(self, text=pref_str, wraplength=360, justify='left',
                         font=ctk.CTkFont(size=11)).pack(fill='x', padx=20)

        ctk.CTkButton(self, text='閉じる', command=self.destroy).pack(padx=20, pady=16, fill='x')


# ── メインウィンドウ ──────────────────────────────────────────────
class EarthquakeApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title('🗾 地震情報')
        self.geometry('540x780')
        self.minsize(460, 600)
        self._quakes: list[dict] = []
        self._countdown = INTERVAL
        self._stats_canvas = None
        self._stats_fig    = None
        self._build_ui()
        self._load_data()
        self._start_countdown()

    # ── UI構築 ───────────────────────────────────────────────────
    def _build_ui(self):
        # ヘッダー
        header = ctk.CTkFrame(self, corner_radius=0, fg_color=('white', 'gray15'))
        header.pack(fill='x')

        top = ctk.CTkFrame(header, fg_color='transparent')
        top.pack(fill='x', padx=16, pady=(12, 2))
        ctk.CTkLabel(top, text='🗾 地震情報', font=ctk.CTkFont(size=18, weight='bold')).pack(side='left')

        right = ctk.CTkFrame(top, fg_color='transparent')
        right.pack(side='right')
        self._updated_lbl = ctk.CTkLabel(right, text='取得中…', text_color='gray', font=ctk.CTkFont(size=10))
        self._updated_lbl.pack(anchor='e')
        ctrl = ctk.CTkFrame(right, fg_color='transparent')
        ctrl.pack()
        ctk.CTkLabel(ctrl, text='次回更新:', text_color='gray', font=ctk.CTkFont(size=10)).pack(side='left')
        self._countdown_lbl = ctk.CTkLabel(ctrl, text='30s', text_color='#3b82f6',
                                            font=ctk.CTkFont(size=12, weight='bold'), width=38)
        self._countdown_lbl.pack(side='left')
        ctk.CTkButton(ctrl, text='↻', width=30, height=28,
                      command=self._manual_refresh).pack(side='left', padx=(4, 0))

        # 震度凡例
        legend = ctk.CTkFrame(header, fg_color='transparent')
        legend.pack(fill='x', padx=12, pady=(2, 8))
        for lbl, bg, fg in [
            ('7',  '#6b21a8', 'white'), ('6強', '#991b1b', 'white'),
            ('6弱', '#dc2626', 'white'), ('5強', '#ef4444', 'white'),
            ('5弱', '#f97316', 'white'), ('4', '#facc15', '#111'),
            ('3',  '#fef08a', '#374151'),
        ]:
            f = ctk.CTkFrame(legend, fg_color=bg, corner_radius=4)
            f.pack(side='left', padx=1)
            ctk.CTkLabel(f, text=f'震度{lbl}', text_color=fg, font=ctk.CTkFont(size=9)).pack(padx=4, pady=2)

        # タブ
        self._tab = ctk.CTkTabview(self, anchor='nw')
        self._tab.pack(fill='both', expand=True, padx=6, pady=4)
        self._tab.add('一覧')
        self._tab.add('統計')

        # 一覧タブ
        self._status_lbl = ctk.CTkLabel(self._tab.tab('一覧'), text='読み込み中…', text_color='gray')
        self._status_lbl.pack(pady=20)
        self._list_frame = ctk.CTkScrollableFrame(self._tab.tab('一覧'), fg_color='transparent')
        self._list_frame.pack(fill='both', expand=True)

        # 統計タブ
        self._stats_frame = ctk.CTkFrame(self._tab.tab('統計'), fg_color='transparent')
        self._stats_frame.pack(fill='both', expand=True)

    # ── データ取得 ───────────────────────────────────────────────
    def _load_data(self):
        def fetch():
            try:
                quakes = api.fetch_earthquakes()
                self.after(0, lambda: self._on_data(quakes))
            except Exception as e:
                self.after(0, lambda: self._on_error(str(e)))
        threading.Thread(target=fetch, daemon=True).start()

    def _manual_refresh(self):
        self._countdown = INTERVAL
        self._status_lbl.configure(text='更新中…', text_color='gray')
        self._load_data()

    def _on_data(self, quakes: list[dict]):
        self._quakes = quakes
        now = datetime.now().strftime('%H:%M:%S')
        self._updated_lbl.configure(text=f'最終更新 {now}')
        self._status_lbl.configure(text='')
        self._render_list()
        self._render_stats()

    def _on_error(self, msg: str):
        self._status_lbl.configure(text=f'⚠ 取得失敗。再試行します…', text_color='#dc2626')

    def _start_countdown(self):
        def tick():
            if self._countdown <= 0:
                self._countdown = INTERVAL
                self._load_data()
            else:
                self._countdown -= 1
            self._countdown_lbl.configure(text=f'{self._countdown}s')
            self.after(1000, tick)
        self.after(1000, tick)

    # ── 一覧レンダリング ─────────────────────────────────────────
    def _render_list(self):
        for w in self._list_frame.winfo_children():
            w.destroy()

        if not self._quakes:
            ctk.CTkLabel(self._list_frame, text='データがありません', text_color='gray').pack(pady=20)
            return

        pinned = [q for q in self._quakes if api.is_pinned(q)]
        if pinned:
            pin_box = ctk.CTkFrame(self._list_frame, fg_color='#fff7ed', corner_radius=10)
            pin_box.pack(fill='x', padx=4, pady=(0, 6))
            ctk.CTkLabel(pin_box, text='📌 注目の地震（震度5弱以上 / M6.0以上）',
                         text_color='#c2410c', font=ctk.CTkFont(size=11, weight='bold')).pack(anchor='w', padx=12, pady=(8, 4))
            for q in pinned:
                self._add_card(pin_box, q, is_pinned=True)
            ctk.CTkLabel(pin_box, text='').pack(pady=2)

        for i, q in enumerate(self._quakes):
            self._add_card(self._list_frame, q, is_latest=(i == 0))

    def _add_card(self, parent, quake: dict, is_latest=False, is_pinned=False):
        scale        = quake.get('maxScale', -1)
        bg, text_col = api.scale_colors(scale)
        border_col   = api.scale_border(scale)
        h            = quake.get('hypocenter', {})
        name         = h.get('name', '震源地不明')
        date_, time_ = api.fmt_time(quake.get('time', ''))
        mag          = h.get('magnitude', -1) or -1
        depth        = h.get('depth', -1)
        pref         = api.extract_pref(name)
        tsunami      = api.tsunami_label(quake.get('domesticTsunami', 'None'))
        prefs        = quake.get('prefectures', [])

        outer = ctk.CTkFrame(parent, fg_color=('white', 'gray20'), corner_radius=8)
        outer.pack(fill='x', padx=8, pady=2)

        # 左ボーダー
        ctk.CTkFrame(outer, width=5, fg_color=border_col, corner_radius=0).pack(side='left', fill='y')

        # 震度バッジ
        badge = ctk.CTkFrame(outer, fg_color=bg, corner_radius=6, width=54, height=54)
        badge.pack(side='left', padx=8, pady=8)
        badge.pack_propagate(False)
        ctk.CTkLabel(badge, text='震度', text_color=text_col, font=ctk.CTkFont(size=9)).place(relx=0.5, rely=0.28, anchor='center')
        ctk.CTkLabel(badge, text=api.scale_label(scale), text_color=text_col,
                     font=ctk.CTkFont(size=20, weight='bold')).place(relx=0.5, rely=0.65, anchor='center')

        # 情報エリア
        info = ctk.CTkFrame(outer, fg_color='transparent')
        info.pack(side='left', fill='both', expand=True, pady=8, padx=(0, 8))

        # 1行目: 震源名 + バッジ類
        name_row = ctk.CTkFrame(info, fg_color='transparent')
        name_row.pack(anchor='w')
        ctk.CTkLabel(name_row, text=name, font=ctk.CTkFont(size=13, weight='bold')).pack(side='left')
        if is_latest:
            ctk.CTkLabel(name_row, text=' 最新 ', fg_color='#ef4444', text_color='white',
                         corner_radius=8, font=ctk.CTkFont(size=9)).pack(side='left', padx=3)
        if is_pinned:
            ctk.CTkLabel(name_row, text='📌', font=ctk.CTkFont(size=10)).pack(side='left')
        if pref:
            ctk.CTkLabel(name_row, text=f' {pref} ', fg_color='#dbeafe', text_color='#1d4ed8',
                         corner_radius=8, font=ctk.CTkFont(size=9)).pack(side='left', padx=3)

        # 2行目: 日時・M・深さ
        sub = [f'{date_} {time_}']
        if mag > 0:
            sub.append(f'M{mag:.1f}')
        if depth == 0:
            sub.append('深さ: ごく浅い')
        elif depth > 0:
            sub.append(f'深さ: {depth}km')
        ctk.CTkLabel(info, text='  '.join(sub), text_color='gray',
                     font=ctk.CTkFont(size=10), anchor='w').pack(anchor='w')

        # 3行目: 都道府県
        if prefs:
            pref_str = ' '.join(prefs[:7]) + (f' 他{len(prefs)-7}県' if len(prefs) > 7 else '')
            ctk.CTkLabel(info, text=pref_str, text_color='gray',
                         font=ctk.CTkFont(size=9), anchor='w').pack(anchor='w')

        # 津波
        if tsunami:
            ctk.CTkLabel(info, text=f'  {tsunami}  ', fg_color='#fef2f2', text_color='#dc2626',
                         corner_radius=4, font=ctk.CTkFont(size=10, weight='bold')).pack(anchor='w', pady=(2, 0))

        # クリックで詳細
        self._bind_click(outer, quake)

    def _bind_click(self, widget, quake: dict):
        widget.bind('<Button-1>', lambda e, q=quake: self._show_detail(q))
        for child in widget.winfo_children():
            self._bind_click(child, quake)

    def _show_detail(self, quake: dict):
        EarthquakeDetail(self, quake)

    # ── 統計レンダリング ─────────────────────────────────────────
    def _render_stats(self):
        if self._stats_canvas:
            self._stats_canvas.get_tk_widget().destroy()
            plt.close(self._stats_fig)
            self._stats_canvas = None

        for w in self._stats_frame.winfo_children():
            w.destroy()

        if not self._quakes:
            ctk.CTkLabel(self._stats_frame, text='データがありません', text_color='gray').pack(pady=20)
            return

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(5, 6), dpi=92)
        fig.patch.set_facecolor('#f9fafb')
        for ax in (ax1, ax2):
            ax.set_facecolor('#f9fafb')
            ax.tick_params(labelsize=9)
            ax.spines[['top', 'right']].set_visible(False)

        # ─ 震度分布 ─
        scale_defs = [
            (10,'1','#d1d5db'),(20,'2','#bfdbfe'),(30,'3','#fef08a'),
            (40,'4','#facc15'),(45,'5弱','#f97316'),(50,'5強','#ef4444'),
            (55,'6弱','#dc2626'),(60,'6強','#991b1b'),(70,'7','#6b21a8'),
        ]
        s_labels, s_counts, s_colors = [], [], []
        for s, lbl, col in scale_defs:
            count = sum(1 for q in self._quakes if q.get('maxScale') == s)
            if count > 0:
                s_labels.append(lbl)
                s_counts.append(count)
                s_colors.append(col)
        if s_counts:
            bars = ax1.barh(s_labels, s_counts, color=s_colors, edgecolor='none', height=0.6)
            ax1.set_title(f'最大震度の分布（{len(self._quakes)}件）', fontsize=10, pad=8)
            ax1.set_xlabel('件数', fontsize=9)
            for bar, count in zip(bars, s_counts):
                ax1.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height() / 2,
                         str(count), va='center', fontsize=9)

        # ─ マグニチュード分布 ─
        mag_bins = [('M1〜2',1,2),('M2〜3',2,3),('M3〜4',3,4),
                    ('M4〜5',4,5),('M5〜6',5,6),('M6以上',6,99)]
        m_labels, m_counts = [], []
        for lbl, mn, mx in mag_bins:
            count = sum(1 for q in self._quakes
                        if mn <= (q.get('hypocenter', {}).get('magnitude') or -1) < mx)
            if count > 0:
                m_labels.append(lbl)
                m_counts.append(count)
        if m_counts:
            bars2 = ax2.barh(m_labels, m_counts, color='#60a5fa', edgecolor='none', height=0.6)
            ax2.set_title('マグニチュードの分布', fontsize=10, pad=8)
            ax2.set_xlabel('件数', fontsize=9)
            for bar, count in zip(bars2, m_counts):
                ax2.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height() / 2,
                         str(count), va='center', fontsize=9)

        fig.tight_layout(pad=2.5)
        self._stats_fig    = fig
        self._stats_canvas = FigureCanvasTkAgg(fig, master=self._stats_frame)
        self._stats_canvas.draw()
        self._stats_canvas.get_tk_widget().pack(fill='both', expand=True)


if __name__ == '__main__':
    app = EarthquakeApp()
    app.mainloop()
