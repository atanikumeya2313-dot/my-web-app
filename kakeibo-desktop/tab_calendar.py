"""カレンダータブ"""
import customtkinter as ctk
import calendar
import storage
from dialogs import TransactionDialog

_GREEN = '#10b981'
_RED   = '#ef4444'
_GRAY  = '#9ca3af'
_TODAY = storage.today_str()


class CalendarTab(ctk.CTkFrame):
    def __init__(self, master, data: dict, current_month: str, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change = on_change
        self._detail_tx: list = []
        self._build_ui()
        self.refresh(data, current_month)

    def _build_ui(self):
        # カレンダーグリッド
        self._grid_frame = ctk.CTkFrame(self)
        self._grid_frame.pack(fill='both', expand=True, padx=4, pady=4)

        # 詳細パネル（下部）
        self._detail_frame = ctk.CTkScrollableFrame(self, height=140, fg_color='transparent')
        self._detail_frame.pack(fill='x', padx=4, pady=(0, 4))

    def refresh(self, data: dict, current_month: str):
        self._data  = data
        self._month = current_month
        self._cats  = {c['id']: c['name'] for c in data['categories']}
        self._render_calendar()
        self._clear_detail()

    def _render_calendar(self):
        for w in self._grid_frame.winfo_children():
            w.destroy()

        y, m = map(int, self._month.split('-'))
        _, days_in_month = calendar.monthrange(y, m)
        first_weekday = calendar.monthrange(y, m)[0]  # 0=Mon

        # 曜日ヘッダー
        for col, day_name in enumerate(['月', '火', '水', '木', '金', '土', '日']):
            color = _RED if col == 6 else ('#3b82f6' if col == 5 else 'black')
            ctk.CTkLabel(self._grid_frame, text=day_name, text_color=color, width=68, anchor='center').grid(row=0, column=col, padx=1, pady=1)

        # 日ごとの集計
        month_txs = [t for t in self._data['transactions'] if t['date'].startswith(self._month)]
        daily: dict[int, dict] = {}
        for t in month_txs:
            d = int(t['date'].split('-')[2])
            daily.setdefault(d, {'income': 0, 'expense': 0})
            daily[d][t['type']] += t['amount']

        row, col = 1, first_weekday
        for day in range(1, days_in_month + 1):
            date_str = f"{self._month}-{day:02d}"
            info = daily.get(day, {})
            cell = ctk.CTkFrame(self._grid_frame, width=68, height=70, fg_color=('white', 'gray20'), corner_radius=4)
            cell.grid(row=row, column=col, padx=1, pady=1, sticky='nsew')
            cell.grid_propagate(False)

            # 今日ハイライト
            fg = '#dbeafe' if date_str == _TODAY else ('white' if ctk.get_appearance_mode() == 'Light' else 'gray20')
            cell.configure(fg_color=fg)

            ctk.CTkLabel(cell, text=str(day), font=ctk.CTkFont(size=11, weight='bold'), anchor='nw').place(x=4, y=2)
            if info.get('income'):
                ctk.CTkLabel(cell, text=f'+{storage.fmt_short(info["income"])}', text_color=_GREEN, font=ctk.CTkFont(size=10), anchor='w').place(x=4, y=24)
            if info.get('expense'):
                ctk.CTkLabel(cell, text=f'-{storage.fmt_short(info["expense"])}', text_color=_RED, font=ctk.CTkFont(size=10), anchor='w').place(x=4, y=44)

            cell.bind('<Button-1>', lambda e, d=day: self._show_detail(d))
            for child in cell.winfo_children():
                child.bind('<Button-1>', lambda e, d=day: self._show_detail(d))

            col += 1
            if col == 7:
                col = 0
                row += 1

        for c in range(7):
            self._grid_frame.grid_columnconfigure(c, weight=1)

    def _show_detail(self, day: int):
        date_str = f"{self._month}-{day:02d}"
        txs = [t for t in self._data['transactions'] if t['date'] == date_str]
        self._clear_detail()
        if not txs:
            ctk.CTkLabel(self._detail_frame, text=f'{day}日の取引はありません', text_color=_GRAY).pack()
            return
        ctk.CTkLabel(self._detail_frame, text=f'{day}日の取引', font=ctk.CTkFont(weight='bold')).pack(anchor='w', padx=8)
        for tx in txs:
            color = _RED if tx['type'] == 'expense' else _GREEN
            row = ctk.CTkFrame(self._detail_frame, fg_color='transparent')
            row.pack(fill='x', padx=8, pady=1)
            ctk.CTkLabel(row, text=self._cats.get(tx['category'], '?'), width=80, anchor='w').pack(side='left')
            ctk.CTkLabel(row, text=tx.get('memo', ''), anchor='w', text_color=_GRAY).pack(side='left', fill='x', expand=True)
            ctk.CTkLabel(row, text=storage.fmt_amount(tx['amount']), text_color=color, font=ctk.CTkFont(weight='bold')).pack(side='right')
            ctk.CTkButton(row, text='＋追加', width=60, height=24,
                          command=lambda d=date_str: self._open_add(d)).pack(side='right', padx=4)

    def _clear_detail(self):
        for w in self._detail_frame.winfo_children():
            w.destroy()

    def _open_add(self, date_str: str):
        def save(tx):
            self._data['transactions'].insert(0, tx)
            self._on_change(self._data)
        TransactionDialog(self, self._data['categories'], on_save=save, default_date=date_str)
