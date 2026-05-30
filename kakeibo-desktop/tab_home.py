"""ホームタブ：サマリー・予算進捗・週次・取引一覧"""
import customtkinter as ctk
from datetime import date, timedelta
import calendar
import storage
from dialogs import TransactionDialog, ConfirmDialog

_GREEN = '#10b981'
_RED   = '#ef4444'
_BLUE  = '#3b82f6'
_GRAY  = '#6b7280'


class HomeTab(ctk.CTkFrame):
    def __init__(self, master, data: dict, current_month: str, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change     = on_change
        self._search_var    = ctk.StringVar()
        self._filter_var    = ctk.StringVar(value='すべて')
        self._search_var.trace_add('write', lambda *_: self._refresh_list())
        self._filter_var.trace_add('write', lambda *_: self._refresh_list())
        self._build_ui()
        self.refresh(data, current_month)

    # ── UI構築 ───────────────────────────────────────────────────
    def _build_ui(self):
        # 左ペイン（サマリー・予算・週次）
        left = ctk.CTkScrollableFrame(self, width=280, fg_color='transparent')
        left.pack(side='left', fill='y', padx=(4, 2), pady=4)

        self._summary_frame = ctk.CTkFrame(left)
        self._summary_frame.pack(fill='x', pady=(0, 6))

        self._budget_frame = ctk.CTkFrame(left)
        self._budget_frame.pack(fill='x', pady=(0, 6))

        self._weekly_frame = ctk.CTkFrame(left)
        self._weekly_frame.pack(fill='x', pady=(0, 6))

        # 右ペイン（取引一覧）
        right = ctk.CTkFrame(self, fg_color='transparent')
        right.pack(side='left', fill='both', expand=True, padx=(2, 4), pady=4)

        # 検索・フィルター
        ctrl = ctk.CTkFrame(right, fg_color='transparent')
        ctrl.pack(fill='x', pady=(0, 4))
        ctk.CTkEntry(ctrl, textvariable=self._search_var, placeholder_text='🔍 メモ・カテゴリ検索', width=200).pack(side='left', padx=(0, 4))
        ctk.CTkSegmentedButton(ctrl, values=['すべて', '支出', '収入'], variable=self._filter_var).pack(side='left')
        ctk.CTkButton(ctrl, text='＋ 追加', width=70, command=self._open_add).pack(side='right')

        # 取引リスト
        self._list_frame = ctk.CTkScrollableFrame(right, fg_color='transparent')
        self._list_frame.pack(fill='both', expand=True)

    # ── データ更新 ────────────────────────────────────────────────
    def refresh(self, data: dict, current_month: str):
        self._data  = data
        self._month = current_month
        self._month_txs = [t for t in data['transactions'] if t['date'].startswith(current_month)]
        self._render_summary()
        self._render_budget()
        self._render_weekly()
        self._refresh_list()

    # ── サマリー ──────────────────────────────────────────────────
    def _render_summary(self):
        for w in self._summary_frame.winfo_children():
            w.destroy()
        txs = self._month_txs
        income  = sum(t['amount'] for t in txs if t['type'] == 'income')
        expense = sum(t['amount'] for t in txs if t['type'] == 'expense')
        balance = income - expense

        # 前月比
        y, m = map(int, self._month.split('-'))
        pm = f"{y - 1 if m == 1 else y:04d}-{12 if m == 1 else m - 1:02d}"
        prev_txs = [t for t in self._data['transactions'] if t['date'].startswith(pm)]
        prev_expense = sum(t['amount'] for t in prev_txs if t['type'] == 'expense')

        ctk.CTkLabel(self._summary_frame, text='月次サマリー', font=ctk.CTkFont(weight='bold')).pack(anchor='w', padx=12, pady=(8, 4))
        for label, val, color in [('収入', income, _GREEN), ('支出', expense, _RED), ('収支', balance, _BLUE)]:
            row = ctk.CTkFrame(self._summary_frame, fg_color='transparent')
            row.pack(fill='x', padx=12, pady=2)
            ctk.CTkLabel(row, text=label, text_color=_GRAY, width=40).pack(side='left')
            ctk.CTkLabel(row, text=storage.fmt_amount(val), text_color=color, font=ctk.CTkFont(weight='bold')).pack(side='right')

        if prev_expense > 0:
            diff = expense - prev_expense
            sign = '+' if diff >= 0 else ''
            color = _RED if diff > 0 else _GREEN
            ctk.CTkLabel(self._summary_frame, text=f'前月比支出: {sign}{storage.fmt_amount(diff)}', text_color=color, font=ctk.CTkFont(size=11)).pack(anchor='e', padx=12, pady=(0, 8))
        else:
            ctk.CTkLabel(self._summary_frame, text='').pack(pady=4)

    # ── 予算進捗 ──────────────────────────────────────────────────
    def _render_budget(self):
        for w in self._budget_frame.winfo_children():
            w.destroy()
        budgets = {b['category_id']: b['amount'] for b in self._data.get('budgets', []) if b['amount'] > 0}
        if not budgets:
            return
        ctk.CTkLabel(self._budget_frame, text='予算進捗', font=ctk.CTkFont(weight='bold')).pack(anchor='w', padx=12, pady=(8, 4))
        cats = {c['id']: c['name'] for c in self._data['categories']}
        for cat_id, budget in budgets.items():
            spent = sum(t['amount'] for t in self._month_txs if t['type'] == 'expense' and t['category'] == cat_id)
            ratio = min(spent / budget, 1.0)
            color = _RED if ratio >= 1 else ('#f59e0b' if ratio >= 0.8 else _GREEN)
            row = ctk.CTkFrame(self._budget_frame, fg_color='transparent')
            row.pack(fill='x', padx=12, pady=2)
            ctk.CTkLabel(row, text=cats.get(cat_id, cat_id), width=80, anchor='w').pack(side='left')
            ctk.CTkProgressBar(row, progress_color=color).pack(side='left', fill='x', expand=True, padx=4)
            ctk.CTkLabel(row, text=f"{int(ratio * 100)}%", width=36, anchor='e').pack(side='right')
            # progress値設定
            for w in row.winfo_children():
                if isinstance(w, ctk.CTkProgressBar):
                    w.set(ratio)
        ctk.CTkLabel(self._budget_frame, text='').pack(pady=4)

    # ── 週次サマリー ──────────────────────────────────────────────
    def _render_weekly(self):
        for w in self._weekly_frame.winfo_children():
            w.destroy()
        y, m = map(int, self._month.split('-'))
        _, days_in_month = calendar.monthrange(y, m)
        weeks = []
        d = 1
        while d <= days_in_month:
            end = min(d + 6, days_in_month)
            weeks.append((d, end))
            d = end + 1

        ctk.CTkLabel(self._weekly_frame, text='週次サマリー', font=ctk.CTkFont(weight='bold')).pack(anchor='w', padx=12, pady=(8, 4))
        for start, end in weeks:
            ds = f"{self._month}-{start:02d}"
            de = f"{self._month}-{end:02d}"
            week_txs = [t for t in self._month_txs if ds <= t['date'] <= de]
            inc = sum(t['amount'] for t in week_txs if t['type'] == 'income')
            exp = sum(t['amount'] for t in week_txs if t['type'] == 'expense')
            row = ctk.CTkFrame(self._weekly_frame, fg_color='transparent')
            row.pack(fill='x', padx=12, pady=1)
            ctk.CTkLabel(row, text=f"{start}〜{end}日", width=70, anchor='w', font=ctk.CTkFont(size=11)).pack(side='left')
            ctk.CTkLabel(row, text=f'−{storage.fmt_short(exp)}', text_color=_RED, font=ctk.CTkFont(size=11)).pack(side='right')
            ctk.CTkLabel(row, text=f'+{storage.fmt_short(inc)}', text_color=_GREEN, font=ctk.CTkFont(size=11)).pack(side='right', padx=4)
        ctk.CTkLabel(self._weekly_frame, text='').pack(pady=4)

    # ── 取引リスト ────────────────────────────────────────────────
    def _refresh_list(self):
        for w in self._list_frame.winfo_children():
            w.destroy()
        query   = self._search_var.get().lower()
        filt    = self._filter_var.get()
        cats    = {c['id']: c['name'] for c in self._data['categories']}
        txs     = sorted(self._month_txs, key=lambda t: t['date'], reverse=True)

        if filt == '支出':
            txs = [t for t in txs if t['type'] == 'expense']
        elif filt == '収入':
            txs = [t for t in txs if t['type'] == 'income']
        if query:
            txs = [t for t in txs if query in t.get('memo', '').lower() or query in cats.get(t['category'], '').lower()]

        if not txs:
            ctk.CTkLabel(self._list_frame, text='取引がありません', text_color=_GRAY).pack(pady=20)
            return

        for tx in txs:
            self._render_tx_row(tx, cats)

    def _render_tx_row(self, tx: dict, cats: dict):
        color = _RED if tx['type'] == 'expense' else _GREEN
        row = ctk.CTkFrame(self._list_frame, fg_color=('white', 'gray20'))
        row.pack(fill='x', pady=1)

        ctk.CTkLabel(row, text=tx['date'][5:], width=36, text_color=_GRAY, font=ctk.CTkFont(size=11)).pack(side='left', padx=(8, 2))
        ctk.CTkLabel(row, text=cats.get(tx['category'], '?'), width=70, anchor='w', font=ctk.CTkFont(size=11)).pack(side='left', padx=2)
        ctk.CTkLabel(row, text=tx.get('memo', ''), anchor='w', text_color=_GRAY, font=ctk.CTkFont(size=11)).pack(side='left', fill='x', expand=True, padx=2)
        ctk.CTkLabel(row, text=storage.fmt_amount(tx['amount']), text_color=color, font=ctk.CTkFont(size=12, weight='bold'), width=90, anchor='e').pack(side='right', padx=4)
        ctk.CTkButton(row, text='🗑', width=28, height=24, fg_color='transparent', text_color=_RED, command=lambda t=tx: self._delete(t)).pack(side='right', padx=2)
        ctk.CTkButton(row, text='✏', width=28, height=24, fg_color='transparent', text_color=_BLUE, command=lambda t=tx: self._open_edit(t)).pack(side='right', padx=2)

    # ── 操作 ──────────────────────────────────────────────────────
    def _open_add(self):
        TransactionDialog(
            self, self._data['categories'],
            on_save=self._save_tx,
            default_date=f"{self._month}-01",
        )

    def _open_edit(self, tx: dict):
        TransactionDialog(
            self, self._data['categories'],
            on_save=self._save_tx,
            editing=tx,
        )

    def _save_tx(self, tx: dict):
        txs = self._data['transactions']
        existing = next((i for i, t in enumerate(txs) if t['id'] == tx['id']), None)
        if existing is not None:
            txs[existing] = tx
        else:
            txs.insert(0, tx)
        self._on_change(self._data)

    def _delete(self, tx: dict):
        def do_delete():
            self._data['transactions'] = [t for t in self._data['transactions'] if t['id'] != tx['id']]
            self._on_change(self._data)
        ConfirmDialog(self, f"「{tx.get('memo') or storage.fmt_amount(tx['amount'])}」を削除しますか？", on_ok=do_delete)
