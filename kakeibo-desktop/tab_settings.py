"""設定タブ（カテゴリ・予算・固定費・テンプレート・資産・CSV・JSON）"""
import customtkinter as ctk
from tkinter import filedialog, messagebox
import storage
from dialogs import ConfirmDialog

_GRAY  = '#6b7280'
_RED   = '#ef4444'
_BLUE  = '#3b82f6'
_GREEN = '#10b981'


class SettingsTab(ctk.CTkScrollableFrame):
    def __init__(self, master, data: dict, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change = on_change
        self._build_ui()
        self.refresh(data)

    def _build_ui(self):
        self._tabs = ctk.CTkTabview(self)
        self._tabs.pack(fill='both', expand=True, padx=4, pady=4)
        for name in ['カテゴリ', '予算', '固定費', 'テンプレート', '資産', 'CSV', 'バックアップ']:
            self._tabs.add(name)

        self._cat_frame      = CategoryManager(self._tabs.tab('カテゴリ'),    on_change=self._relay)
        self._budget_frame   = BudgetManager(self._tabs.tab('予算'),          on_change=self._relay)
        self._fixed_frame    = FixedManager(self._tabs.tab('固定費'),         on_change=self._relay)
        self._tpl_frame      = TemplateManager(self._tabs.tab('テンプレート'), on_change=self._relay)
        self._asset_frame    = AssetManager(self._tabs.tab('資産'),           on_change=self._relay)
        self._csv_frame      = CsvManager(self._tabs.tab('CSV'),             on_change=self._relay)
        self._backup_frame   = BackupManager(self._tabs.tab('バックアップ'),  on_change=self._relay)

        for frame in [self._cat_frame, self._budget_frame, self._fixed_frame,
                      self._tpl_frame, self._asset_frame, self._csv_frame, self._backup_frame]:
            frame.pack(fill='both', expand=True)

    def _relay(self, data):
        self._on_change(data)

    def refresh(self, data: dict):
        self._data = data
        self._cat_frame.refresh(data)
        self._budget_frame.refresh(data)
        self._fixed_frame.refresh(data)
        self._tpl_frame.refresh(data)
        self._asset_frame.refresh(data)
        self._csv_frame.refresh(data)
        self._backup_frame.refresh(data)


# ── カテゴリ管理 ─────────────────────────────────────────────────
class CategoryManager(ctk.CTkFrame):
    def __init__(self, master, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change = on_change
        self._type_var = ctk.StringVar(value='expense')
        self._name_var = ctk.StringVar()
        self._build_ui()

    def _build_ui(self):
        ctrl = ctk.CTkFrame(self, fg_color='transparent')
        ctrl.pack(fill='x', pady=8)
        ctk.CTkSegmentedButton(ctrl, values=['支出', '収入'], command=lambda v: [self._type_var.set('expense' if v=='支出' else 'income'), self._refresh_list()]).pack(fill='x')

        self._list_frame = ctk.CTkScrollableFrame(self, height=200)
        self._list_frame.pack(fill='x', pady=4)

        add_row = ctk.CTkFrame(self, fg_color='transparent')
        add_row.pack(fill='x', pady=4)
        ctk.CTkEntry(add_row, textvariable=self._name_var, placeholder_text='新しいカテゴリ名').pack(side='left', fill='x', expand=True, padx=(0, 4))
        ctk.CTkButton(add_row, text='追加', width=60, command=self._add).pack(side='right')

    def _refresh_list(self):
        for w in self._list_frame.winfo_children():
            w.destroy()
        tx_type = self._type_var.get()
        for cat in self._data['categories']:
            if cat['type'] != tx_type:
                continue
            row = ctk.CTkFrame(self._list_frame, fg_color='transparent')
            row.pack(fill='x', pady=1)
            ctk.CTkLabel(row, text=cat['name'], anchor='w').pack(side='left', fill='x', expand=True)
            if not cat.get('is_default'):
                ctk.CTkButton(row, text='削除', width=50, fg_color=_RED, command=lambda c=cat: self._delete(c)).pack(side='right')

    def _add(self):
        name = self._name_var.get().strip()
        if not name:
            return
        if any(c['name'] == name for c in self._data['categories']):
            messagebox.showwarning('重複', '同名のカテゴリが存在します')
            return
        self._data['categories'].append({'id': storage.new_id(), 'name': name, 'type': self._type_var.get(), 'is_default': False})
        self._name_var.set('')
        self._on_change(self._data)

    def _delete(self, cat: dict):
        def do_delete():
            self._data['categories'] = [c for c in self._data['categories'] if c['id'] != cat['id']]
            self._on_change(self._data)
        ConfirmDialog(self, f"カテゴリ「{cat['name']}」を削除しますか？", on_ok=do_delete)

    def refresh(self, data: dict):
        self._data = data
        self._refresh_list()


# ── 予算管理 ─────────────────────────────────────────────────────
class BudgetManager(ctk.CTkFrame):
    def __init__(self, master, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change = on_change
        self._entries: dict[str, ctk.StringVar] = {}

    def _build_ui(self):
        for w in self.winfo_children():
            w.destroy()
        self._entries.clear()
        ctk.CTkLabel(self, text='カテゴリ別の月次予算（0で無効）', text_color=_GRAY, font=ctk.CTkFont(size=11)).pack(anchor='w', pady=(8, 4))
        expense_cats = [c for c in self._data['categories'] if c['type'] == 'expense']
        budgets = {b['category_id']: b['amount'] for b in self._data.get('budgets', [])}
        frame = ctk.CTkScrollableFrame(self, height=280)
        frame.pack(fill='x')
        for cat in expense_cats:
            row = ctk.CTkFrame(frame, fg_color='transparent')
            row.pack(fill='x', pady=2)
            ctk.CTkLabel(row, text=cat['name'], width=100, anchor='w').pack(side='left')
            var = ctk.StringVar(value=str(budgets.get(cat['id'], 0)))
            self._entries[cat['id']] = var
            ctk.CTkEntry(row, textvariable=var, width=120).pack(side='left', padx=4)
            ctk.CTkLabel(row, text='円').pack(side='left')
        ctk.CTkButton(self, text='保存', command=self._save).pack(pady=8)

    def _save(self):
        budgets = []
        for cat_id, var in self._entries.items():
            try:
                amount = int(var.get())
                if amount > 0:
                    budgets.append({'category_id': cat_id, 'amount': amount})
            except ValueError:
                pass
        self._data['budgets'] = budgets
        self._on_change(self._data)

    def refresh(self, data: dict):
        self._data = data
        self._build_ui()


# ── 固定費管理 ───────────────────────────────────────────────────
class FixedManager(ctk.CTkFrame):
    def __init__(self, master, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change  = on_change
        self._editing_id = None
        self._type_var   = ctk.StringVar(value='支出')
        self._name_var   = ctk.StringVar()
        self._amount_var = ctk.StringVar()
        self._cat_var    = ctk.StringVar()
        self._day_var    = ctk.StringVar(value='1')
        self._build_ui()

    def _build_ui(self):
        ctk.CTkLabel(self, text='毎月アプリ起動時に自動で追加されます', text_color=_GRAY, font=ctk.CTkFont(size=11)).pack(anchor='w', pady=(8, 0))
        self._list_frame = ctk.CTkScrollableFrame(self, height=180)
        self._list_frame.pack(fill='x', pady=4)

        form = ctk.CTkFrame(self, fg_color='transparent')
        form.pack(fill='x', pady=4)
        self._status_label = ctk.CTkLabel(form, text='新規追加', text_color=_GRAY, font=ctk.CTkFont(size=11))
        self._status_label.pack(anchor='w')
        ctk.CTkSegmentedButton(form, values=['支出', '収入'], variable=self._type_var, command=lambda _: self._update_cats()).pack(fill='x', pady=2)
        ctk.CTkEntry(form, textvariable=self._name_var, placeholder_text='名前（例：家賃）').pack(fill='x', pady=2)
        row = ctk.CTkFrame(form, fg_color='transparent')
        row.pack(fill='x', pady=2)
        ctk.CTkEntry(row, textvariable=self._amount_var, placeholder_text='金額').pack(side='left', fill='x', expand=True, padx=(0, 4))
        ctk.CTkLabel(row, text='毎月').pack(side='left')
        ctk.CTkEntry(row, textvariable=self._day_var, width=50).pack(side='left', padx=2)
        ctk.CTkLabel(row, text='日').pack(side='left')
        self._cat_menu = ctk.CTkOptionMenu(form, variable=self._cat_var, values=[])
        self._cat_menu.pack(fill='x', pady=2)
        btn_row = ctk.CTkFrame(form, fg_color='transparent')
        btn_row.pack(fill='x', pady=2)
        self._save_btn = ctk.CTkButton(btn_row, text='追加', command=self._save)
        self._save_btn.pack(side='left', fill='x', expand=True, padx=(0, 4))
        self._cancel_btn = ctk.CTkButton(btn_row, text='キャンセル', fg_color='gray', command=self._cancel_edit)
        self._cancel_btn.pack(side='left', fill='x', expand=True, padx=(4, 0))
        self._cancel_btn.pack_forget()

    def _update_cats(self):
        tx_type = 'expense' if self._type_var.get() == '支出' else 'income'
        cats = [c['name'] for c in self._data['categories'] if c['type'] == tx_type]
        self._cat_menu.configure(values=cats)
        if cats:
            self._cat_var.set(cats[0])

    def _refresh_list(self):
        for w in self._list_frame.winfo_children():
            w.destroy()
        cats = {c['id']: c['name'] for c in self._data['categories']}
        for item in self._data.get('fixed_items', []):
            row = ctk.CTkFrame(self._list_frame, fg_color='transparent')
            row.pack(fill='x', pady=1)
            is_editing = self._editing_id == item['id']
            fg = '#dbeafe' if is_editing else 'transparent'
            row.configure(fg_color=fg)
            ctk.CTkLabel(row, text=item['name'], anchor='w').pack(side='left', fill='x', expand=True)
            ctk.CTkLabel(row, text=f"{cats.get(item['category'],'?')} / {item['day']}日 / ¥{item['amount']:,}", text_color=_GRAY, font=ctk.CTkFont(size=11)).pack(side='left', padx=4)
            ctk.CTkButton(row, text='編集', width=40, command=lambda i=item: self._start_edit(i)).pack(side='right', padx=2)
            ctk.CTkButton(row, text='削除', width=40, fg_color=_RED, command=lambda i=item: self._delete(i)).pack(side='right', padx=2)

    def _start_edit(self, item: dict):
        self._editing_id = item['id']
        self._type_var.set('支出' if item['type'] == 'expense' else '収入')
        self._name_var.set(item['name'])
        self._amount_var.set(str(item['amount']))
        self._day_var.set(str(item['day']))
        self._update_cats()
        cats = {c['id']: c['name'] for c in self._data['categories']}
        self._cat_var.set(cats.get(item['category'], ''))
        self._status_label.configure(text='✏️ 編集中')
        self._save_btn.configure(text='更新')
        self._cancel_btn.pack(side='left', fill='x', expand=True, padx=(4, 0))
        self._refresh_list()

    def _cancel_edit(self):
        self._editing_id = None
        self._name_var.set('')
        self._amount_var.set('')
        self._day_var.set('1')
        self._status_label.configure(text='新規追加')
        self._save_btn.configure(text='追加')
        self._cancel_btn.pack_forget()
        self._refresh_list()

    def _save(self):
        name = self._name_var.get().strip()
        if not name or not self._amount_var.get():
            return
        try:
            amount = int(self._amount_var.get())
            day = min(max(int(self._day_var.get()), 1), 31)
        except ValueError:
            return
        tx_type = 'expense' if self._type_var.get() == '支出' else 'income'
        cats = [c for c in self._data['categories'] if c['type'] == tx_type]
        cat = next((c for c in cats if c['name'] == self._cat_var.get()), None)
        if not cat:
            return
        if self._editing_id:
            self._data['fixed_items'] = [
                {**i, 'name': name, 'amount': amount, 'type': tx_type, 'category': cat['id'], 'day': day}
                if i['id'] == self._editing_id else i
                for i in self._data['fixed_items']
            ]
        else:
            self._data.setdefault('fixed_items', []).append({
                'id': storage.new_id(), 'name': name, 'amount': amount, 'type': tx_type, 'category': cat['id'], 'day': day,
            })
        self._cancel_edit()
        self._on_change(self._data)

    def _delete(self, item: dict):
        def do_delete():
            self._data['fixed_items'] = [i for i in self._data['fixed_items'] if i['id'] != item['id']]
            self._on_change(self._data)
        ConfirmDialog(self, f"固定費「{item['name']}」を削除しますか？", on_ok=do_delete)

    def refresh(self, data: dict):
        self._data = data
        self._update_cats()
        self._refresh_list()


# ── テンプレート管理 ─────────────────────────────────────────────
class TemplateManager(ctk.CTkFrame):
    def __init__(self, master, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change = on_change

    def _build_ui(self):
        for w in self.winfo_children():
            w.destroy()
        cats = {c['id']: c['name'] for c in self._data['categories']}
        ctk.CTkLabel(self, text='登録済みテンプレート', font=ctk.CTkFont(weight='bold')).pack(anchor='w', pady=(8, 4))
        frame = ctk.CTkScrollableFrame(self, height=300)
        frame.pack(fill='x')
        for tpl in self._data.get('templates', []):
            row = ctk.CTkFrame(frame, fg_color='transparent')
            row.pack(fill='x', pady=2)
            color = _RED if tpl['type'] == 'expense' else _GREEN
            ctk.CTkLabel(row, text=tpl['name'], anchor='w').pack(side='left', fill='x', expand=True)
            ctk.CTkLabel(row, text=f"{cats.get(tpl['category'],'?')} / ¥{tpl['amount']:,}", text_color=_GRAY, font=ctk.CTkFont(size=11)).pack(side='left', padx=4)
            ctk.CTkLabel(row, text='支出' if tpl['type'] == 'expense' else '収入', text_color=color, font=ctk.CTkFont(size=11), width=28).pack(side='left')
            ctk.CTkButton(row, text='削除', width=40, fg_color=_RED, command=lambda t=tpl: self._delete(t)).pack(side='right')

        if not self._data.get('templates'):
            ctk.CTkLabel(frame, text='テンプレートがありません', text_color=_GRAY).pack(pady=20)

    def _delete(self, tpl: dict):
        def do_delete():
            self._data['templates'] = [t for t in self._data['templates'] if t['id'] != tpl['id']]
            self._on_change(self._data)
        ConfirmDialog(self, f"テンプレート「{tpl['name']}」を削除しますか？", on_ok=do_delete)

    def refresh(self, data: dict):
        self._data = data
        self._build_ui()


# ── 資産管理 ─────────────────────────────────────────────────────
class AssetManager(ctk.CTkFrame):
    def __init__(self, master, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change  = on_change
        self._type_var   = ctk.StringVar(value='bank')
        self._name_var   = ctk.StringVar()
        self._balance_var= ctk.StringVar()
        self._date_var   = ctk.StringVar(value=storage.today_str())
        self._build_ui()

    def _build_ui(self):
        self._list_frame = ctk.CTkScrollableFrame(self, height=160)
        self._list_frame.pack(fill='x', pady=(8, 4))

        form = ctk.CTkFrame(self, fg_color='transparent')
        form.pack(fill='x')
        ctk.CTkLabel(form, text='新規資産を追加', font=ctk.CTkFont(weight='bold')).pack(anchor='w', pady=(8, 4))
        ctk.CTkSegmentedButton(form, values=['銀行口座', '投資'], command=lambda v: self._type_var.set('bank' if v == '銀行口座' else 'investment')).pack(fill='x', pady=2)
        ctk.CTkEntry(form, textvariable=self._name_var, placeholder_text='口座名').pack(fill='x', pady=2)
        row = ctk.CTkFrame(form, fg_color='transparent')
        row.pack(fill='x', pady=2)
        ctk.CTkEntry(row, textvariable=self._balance_var, placeholder_text='初期残高').pack(side='left', fill='x', expand=True, padx=(0, 4))
        ctk.CTkEntry(row, textvariable=self._date_var, placeholder_text='基準日 YYYY-MM-DD', width=140).pack(side='left')
        ctk.CTkButton(form, text='追加', command=self._add).pack(fill='x', pady=4)

    def _refresh_list(self):
        for w in self._list_frame.winfo_children():
            w.destroy()
        for asset in self._data.get('assets', []):
            balance = storage.calc_asset_balance(asset, self._data['transactions'])
            row = ctk.CTkFrame(self._list_frame, fg_color='transparent')
            row.pack(fill='x', pady=2)
            badge = '銀行' if asset['type'] == 'bank' else '投資'
            ctk.CTkLabel(row, text=badge, fg_color=_BLUE if asset['type']=='bank' else _GREEN, text_color='white', corner_radius=4, width=32, font=ctk.CTkFont(size=10)).pack(side='left', padx=(0, 4))
            ctk.CTkLabel(row, text=asset['name'], anchor='w').pack(side='left', fill='x', expand=True)
            ctk.CTkLabel(row, text=storage.fmt_amount(balance), font=ctk.CTkFont(weight='bold')).pack(side='right', padx=4)
            ctk.CTkButton(row, text='削除', width=40, fg_color=_RED, command=lambda a=asset: self._delete(a)).pack(side='right')

    def _add(self):
        name = self._name_var.get().strip()
        if not name or not self._balance_var.get():
            return
        try:
            balance = int(self._balance_var.get())
        except ValueError:
            return
        self._data.setdefault('assets', []).append({
            'id': storage.new_id(),
            'name': name,
            'type': self._type_var.get(),
            'initial_balance': balance,
            'initial_date': self._date_var.get(),
        })
        self._name_var.set('')
        self._balance_var.set('')
        self._on_change(self._data)

    def _delete(self, asset: dict):
        def do_delete():
            self._data['assets'] = [a for a in self._data['assets'] if a['id'] != asset['id']]
            self._on_change(self._data)
        ConfirmDialog(self, f"資産「{asset['name']}」を削除しますか？", on_ok=do_delete)

    def refresh(self, data: dict):
        self._data = data
        self._refresh_list()


# ── CSV インポート・エクスポート ──────────────────────────────────
class CsvManager(ctk.CTkFrame):
    def __init__(self, master, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change = on_change
        self._bank_var  = ctk.StringVar(value='moneyforward')
        self._type_var  = ctk.StringVar(value='expense')
        self._cat_var   = ctk.StringVar()
        self._msg_var   = ctk.StringVar()
        self._build_ui()

    def _build_ui(self):
        # インポート
        ctk.CTkLabel(self, text='CSVインポート', font=ctk.CTkFont(weight='bold')).pack(anchor='w', pady=(8, 4))
        ctk.CTkLabel(self, text='銀行フォーマット', text_color=_GRAY, font=ctk.CTkFont(size=11)).pack(anchor='w')
        ctk.CTkOptionMenu(self, variable=self._bank_var, values=['moneyforward', 'rakuten', 'sbi', 'mufg', 'yucho']).pack(fill='x', pady=2)
        ctk.CTkLabel(self, text='取引種別', text_color=_GRAY, font=ctk.CTkFont(size=11)).pack(anchor='w')
        ctk.CTkSegmentedButton(self, values=['支出', '収入'], command=lambda v: [self._type_var.set('expense' if v=='支出' else 'income'), self._update_cats()]).pack(fill='x', pady=2)
        ctk.CTkLabel(self, text='カテゴリ', text_color=_GRAY, font=ctk.CTkFont(size=11)).pack(anchor='w')
        self._cat_menu = ctk.CTkOptionMenu(self, variable=self._cat_var, values=[])
        self._cat_menu.pack(fill='x', pady=2)
        ctk.CTkButton(self, text='CSVファイルを選択してインポート', command=self._import).pack(fill='x', pady=4)

        # エクスポート
        ctk.CTkLabel(self, text='CSVエクスポート', font=ctk.CTkFont(weight='bold')).pack(anchor='w', pady=(12, 4))
        row = ctk.CTkFrame(self, fg_color='transparent')
        row.pack(fill='x')
        ctk.CTkButton(row, text='今月をエクスポート', command=lambda: self._export(current_only=True)).pack(side='left', expand=True, fill='x', padx=(0, 4))
        ctk.CTkButton(row, text='全期間をエクスポート', command=lambda: self._export(current_only=False)).pack(side='left', expand=True, fill='x', padx=(4, 0))

        ctk.CTkLabel(self, textvariable=self._msg_var, text_color=_GREEN).pack(pady=4)

    def _update_cats(self):
        tx_type = self._type_var.get()
        cats = [c['name'] for c in self._data['categories'] if c['type'] == tx_type]
        self._cat_menu.configure(values=cats)
        if cats:
            self._cat_var.set(cats[0])

    def _import(self):
        path = filedialog.askopenfilename(filetypes=[('CSV', '*.csv'), ('All', '*.*')])
        if not path:
            return
        cats = [c for c in self._data['categories'] if c['type'] == self._type_var.get()]
        cat = next((c for c in cats if c['name'] == self._cat_var.get()), None)
        if not cat:
            self._msg_var.set('⚠ カテゴリを選択してください')
            return
        with open(path, 'rb') as f:
            raw = f.read()
        rows = storage.parse_csv(raw, self._bank_var.get(), self._type_var.get(), cat['id'])
        # 重複チェック
        existing_keys = {(t['date'], t['amount'], t['type']) for t in self._data['transactions']}
        new_rows = [r for r in rows if (r['date'], r['amount'], r['type']) not in existing_keys]
        self._data['transactions'] = new_rows + self._data['transactions']
        self._msg_var.set(f'✓ {len(new_rows)}件インポート（重複{len(rows)-len(new_rows)}件スキップ）')
        self._on_change(self._data)

    def _export(self, current_only: bool):
        import csv as csv_mod, io
        txs = self._data['transactions']
        if current_only:
            ym = storage.current_month()
            txs = [t for t in txs if t['date'].startswith(ym)]
        cats = {c['id']: c['name'] for c in self._data['categories']}
        buf = io.StringIO()
        writer = csv_mod.writer(buf)
        writer.writerow(['日付', '種別', 'カテゴリ', '金額', 'メモ'])
        for t in sorted(txs, key=lambda x: x['date']):
            writer.writerow([t['date'], '支出' if t['type']=='expense' else '収入', cats.get(t['category'],''), t['amount'], t.get('memo','')])
        path = filedialog.asksaveasfilename(defaultextension='.csv', filetypes=[('CSV', '*.csv')])
        if path:
            with open(path, 'w', encoding='utf-8-sig', newline='') as f:
                f.write(buf.getvalue())
            self._msg_var.set(f'✓ {len(txs)}件をエクスポートしました')

    def refresh(self, data: dict):
        self._data = data
        self._update_cats()


# ── JSONバックアップ ──────────────────────────────────────────────
class BackupManager(ctk.CTkFrame):
    def __init__(self, master, on_change):
        super().__init__(master, fg_color='transparent')
        self._on_change = on_change
        self._msg_var   = ctk.StringVar()
        self._build_ui()

    def _build_ui(self):
        ctk.CTkLabel(self, text='JSONバックアップ', font=ctk.CTkFont(weight='bold')).pack(anchor='w', pady=(8, 4))
        ctk.CTkLabel(self, text='すべてのデータをJSONファイルでバックアップ・復元できます', text_color=_GRAY, font=ctk.CTkFont(size=11), wraplength=350).pack(anchor='w', pady=(0, 8))
        ctk.CTkButton(self, text='バックアップを書き出す', command=self._export).pack(fill='x', pady=4)
        ctk.CTkButton(self, text='バックアップから復元', fg_color='gray', command=self._import).pack(fill='x', pady=4)
        ctk.CTkLabel(self, textvariable=self._msg_var, text_color=_GREEN).pack(pady=4)

    def _export(self):
        path = filedialog.asksaveasfilename(
            defaultextension='.json',
            initialfile=f'kakeibo_{storage.today_str()}.json',
            filetypes=[('JSON', '*.json')],
        )
        if path:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(storage.export_json(self._data))
            self._msg_var.set('✓ バックアップを書き出しました')

    def _import(self):
        path = filedialog.askopenfilename(filetypes=[('JSON', '*.json')])
        if not path:
            return
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()
        data = storage.import_json(text)
        if data is None:
            self._msg_var.set('⚠ ファイルの形式が正しくありません')
            return
        if messagebox.askyesno('確認', '現在のデータをすべて上書きします。よろしいですか？'):
            self._msg_var.set('✓ 復元しました')
            self._on_change(data)

    def refresh(self, data: dict):
        self._data = data
