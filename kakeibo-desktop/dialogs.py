"""取引追加・編集ダイアログ"""
import customtkinter as ctk
from datetime import date
import storage


class TransactionDialog(ctk.CTkToplevel):
    """取引の追加・編集ダイアログ"""

    def __init__(self, master, categories: list, on_save,
                 default_date: str = '', editing: dict | None = None,
                 prefill: dict | None = None):
        super().__init__(master)
        self.title('取引を編集' if editing else '取引を追加')
        self.geometry('420x480')
        self.resizable(False, False)
        self.grab_set()
        self.lift()
        self.focus_force()

        self._categories = categories
        self._on_save    = on_save
        self._editing    = editing
        p = prefill or {}

        # --- 変数 ---
        init_type = editing['type'] if editing else p.get('type', 'expense')
        self._type_var     = ctk.StringVar(value=init_type)
        self._date_var     = ctk.StringVar(value=editing['date'] if editing else (default_date or storage.today_str()))
        self._amount_var   = ctk.StringVar(value=str(editing['amount']) if editing else str(p.get('amount', '')))
        self._category_var = ctk.StringVar()
        self._memo_var     = ctk.StringVar(value=editing.get('memo', '') if editing else p.get('memo', ''))

        self._build_ui()
        self._update_categories()

        # カテゴリを設定
        init_cat = editing['category'] if editing else p.get('category', '')
        if init_cat:
            try:
                self._category_var.set(init_cat)
            except Exception:
                pass

    def _build_ui(self):
        pad = {'padx': 16, 'pady': 6}

        # 収支切り替え
        type_frame = ctk.CTkFrame(self, fg_color='transparent')
        type_frame.pack(fill='x', **pad)
        ctk.CTkSegmentedButton(
            type_frame,
            values=['支出', '収入'],
            variable=self._type_var,
            command=self._on_type_change,
        ).pack(fill='x')

        # 日付
        ctk.CTkLabel(self, text='日付', anchor='w').pack(fill='x', padx=16, pady=(8, 0))
        ctk.CTkEntry(self, textvariable=self._date_var, placeholder_text='YYYY-MM-DD').pack(fill='x', **pad)

        # 金額
        ctk.CTkLabel(self, text='金額', anchor='w').pack(fill='x', padx=16, pady=(4, 0))
        ctk.CTkEntry(self, textvariable=self._amount_var, placeholder_text='例: 3000').pack(fill='x', **pad)

        # カテゴリ
        ctk.CTkLabel(self, text='カテゴリ', anchor='w').pack(fill='x', padx=16, pady=(4, 0))
        self._cat_menu = ctk.CTkOptionMenu(self, variable=self._category_var, values=[])
        self._cat_menu.pack(fill='x', **pad)

        # メモ
        ctk.CTkLabel(self, text='メモ（任意）', anchor='w').pack(fill='x', padx=16, pady=(4, 0))
        ctk.CTkEntry(self, textvariable=self._memo_var, placeholder_text='任意のメモ').pack(fill='x', **pad)

        # ボタン
        btn_frame = ctk.CTkFrame(self, fg_color='transparent')
        btn_frame.pack(fill='x', padx=16, pady=16)
        ctk.CTkButton(btn_frame, text='キャンセル', fg_color='gray', command=self.destroy).pack(side='left', expand=True, fill='x', padx=(0, 4))
        ctk.CTkButton(btn_frame, text='更新する' if self._editing else '追加する', command=self._submit).pack(side='left', expand=True, fill='x', padx=(4, 0))

        # 型名を表示用に変換
        self._type_var.set('支出' if self._type_var.get() == 'expense' else '収入')

    def _on_type_change(self, _=None):
        self._update_categories()

    def _get_type(self) -> str:
        return 'expense' if self._type_var.get() == '支出' else 'income'

    def _update_categories(self):
        tx_type = self._get_type()
        cats = [c for c in self._categories if c['type'] == tx_type]
        names = [c['name'] for c in cats]
        self._cat_menu.configure(values=names)
        if names:
            self._category_var.set(names[0])

    def _submit(self):
        try:
            amount = int(self._amount_var.get())
            assert amount > 0
        except Exception:
            self._show_error('金額を正しく入力してください')
            return
        date_val = self._date_var.get().strip()
        if len(date_val) != 10:
            self._show_error('日付を YYYY-MM-DD 形式で入力してください')
            return

        tx_type = self._get_type()
        cats = [c for c in self._categories if c['type'] == tx_type]
        cat_name = self._category_var.get()
        cat_obj  = next((c for c in cats if c['name'] == cat_name), None)
        if not cat_obj:
            self._show_error('カテゴリを選択してください')
            return

        tx = {
            'id':       self._editing['id'] if self._editing else storage.new_id(),
            'date':     date_val,
            'amount':   amount,
            'type':     tx_type,
            'category': cat_obj['id'],
            'memo':     self._memo_var.get().strip(),
        }
        self._on_save(tx)
        self.destroy()

    def _show_error(self, msg: str):
        ctk.CTkLabel(self, text=f'⚠ {msg}', text_color='red').pack()


class ConfirmDialog(ctk.CTkToplevel):
    """確認ダイアログ。on_ok は OK 時に呼ばれる。"""

    def __init__(self, master, message: str, on_ok):
        super().__init__(master)
        self.title('確認')
        self.geometry('320x160')
        self.resizable(False, False)
        self.grab_set()
        self.lift()

        ctk.CTkLabel(self, text=message, wraplength=280).pack(expand=True, padx=20, pady=20)
        btn = ctk.CTkFrame(self, fg_color='transparent')
        btn.pack(fill='x', padx=20, pady=(0, 16))
        ctk.CTkButton(btn, text='キャンセル', fg_color='gray', command=self.destroy).pack(side='left', expand=True, fill='x', padx=(0, 4))
        ctk.CTkButton(btn, text='OK', fg_color='#ef4444', command=lambda: [on_ok(), self.destroy()]).pack(side='left', expand=True, fill='x', padx=(4, 0))
