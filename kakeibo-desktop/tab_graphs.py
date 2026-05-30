"""グラフタブ（matplotlib）"""
import customtkinter as ctk
from datetime import date
import matplotlib
matplotlib.rcParams['font.family'] = ['Yu Gothic', 'Meiryo', 'MS Gothic', 'DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import storage

_MONTHS = 12


def _last_12_months() -> list[str]:
    today = date.today()
    result = []
    for i in range(_MONTHS - 1, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        result.append(f"{y:04d}-{m:02d}")
    return result


class GraphTab(ctk.CTkFrame):
    def __init__(self, master, data: dict):
        super().__init__(master, fg_color='transparent')
        self._data = data
        self._chart_var = ctk.StringVar(value='年間収支')
        self._build_ui()
        self.refresh(data)

    def _build_ui(self):
        ctrl = ctk.CTkFrame(self, fg_color='transparent')
        ctrl.pack(fill='x', padx=8, pady=(8, 4))
        ctk.CTkSegmentedButton(
            ctrl,
            values=['年間収支', '支出内訳', '月次推移', 'カテゴリ推移'],
            variable=self._chart_var,
            command=lambda _: self._render_chart(),
        ).pack(fill='x')

        self._canvas_frame = ctk.CTkFrame(self, fg_color='transparent')
        self._canvas_frame.pack(fill='both', expand=True, padx=8, pady=4)
        self._canvas_widget = None
        self._fig = None

    def refresh(self, data: dict):
        self._data = data
        self._render_chart()

    def _render_chart(self):
        # 既存キャンバスを削除
        if self._canvas_widget:
            self._canvas_widget.get_tk_widget().destroy()
            plt.close(self._fig)

        chart = self._chart_var.get()
        self._fig, ax = plt.subplots(figsize=(8, 4.5), dpi=96)
        self._fig.patch.set_facecolor('#f9fafb')
        ax.set_facecolor('#f9fafb')
        ax.tick_params(labelsize=9)
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: storage.fmt_short(int(x))))

        if chart == '年間収支':
            self._render_chart_annual(ax)
        elif chart == '支出内訳':
            self._render_chart_pie(ax)
        elif chart == '月次推移':
            self._render_chart_balance_trend(ax)
        elif chart == 'カテゴリ推移':
            self._render_chart_category_trend(ax)

        self._fig.tight_layout()
        self._canvas_widget = FigureCanvasTkAgg(self._fig, master=self._canvas_frame)
        self._canvas_widget.draw()
        self._canvas_widget.get_tk_widget().pack(fill='both', expand=True)

    def _monthly_data(self) -> list[dict]:
        months = _last_12_months()
        txs = self._data['transactions']
        result = []
        for ym in months:
            month_txs = [t for t in txs if t['date'].startswith(ym)]
            income  = sum(t['amount'] for t in month_txs if t['type'] == 'income')
            expense = sum(t['amount'] for t in month_txs if t['type'] == 'expense')
            m = int(ym.split('-')[1])
            result.append({'label': f"{m}月", 'income': income, 'expense': expense, 'net': income - expense})
        return result

    def _render_chart_annual(self, ax):
        data = self._monthly_data()
        labels  = [d['label'] for d in data]
        incomes = [d['income'] for d in data]
        exps    = [d['expense'] for d in data]
        x = range(len(labels))
        w = 0.35
        ax.bar([i - w/2 for i in x], incomes, w, label='収入', color='#10b981', alpha=0.85)
        ax.bar([i + w/2 for i in x], exps,    w, label='支出', color='#ef4444', alpha=0.85)
        ax.set_xticks(list(x))
        ax.set_xticklabels(labels)
        ax.legend(fontsize=9)
        ax.set_title('年間収支（過去12ヶ月）', fontsize=11)
        ax.set_ylim(bottom=max(0, min(incomes + exps) * 0.85) if any(incomes + exps) else 0)

    def _render_chart_pie(self, ax):
        today = date.today()
        ym = f"{today.year:04d}-{today.month:02d}"
        month_txs = [t for t in self._data['transactions'] if t['date'].startswith(ym) and t['type'] == 'expense']
        cats = {c['id']: c['name'] for c in self._data['categories']}
        by_cat: dict[str, int] = {}
        for t in month_txs:
            by_cat[t['category']] = by_cat.get(t['category'], 0) + t['amount']
        if not by_cat:
            ax.text(0.5, 0.5, '支出データなし', ha='center', va='center', transform=ax.transAxes)
            return
        labels = [cats.get(k, k) for k in by_cat]
        sizes  = list(by_cat.values())
        colors = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316']
        ax.pie(sizes, labels=labels, colors=colors[:len(sizes)], autopct='%1.1f%%', startangle=90, textprops={'fontsize': 9})
        ax.set_title(f'支出内訳（{today.month}月）', fontsize=11)

    def _render_chart_balance_trend(self, ax):
        data = self._monthly_data()
        labels = [d['label'] for d in data]
        nets   = [d['net'] for d in data]
        x = range(len(labels))
        pos = [max(0, n) for n in nets]
        neg = [min(0, n) for n in nets]
        ax.bar(list(x), pos, color='#3b82f6', alpha=0.8, label='黒字')
        ax.bar(list(x), neg, color='#ef4444', alpha=0.8, label='赤字')
        ax.axhline(0, color='#e5e7eb', linewidth=1)
        ax.plot(list(x), nets, 'o-', color='#1d4ed8', linewidth=1.5, markersize=4)
        ax.set_xticks(list(x))
        ax.set_xticklabels(labels)
        ax.legend(fontsize=9)
        ax.set_title('月次収支推移', fontsize=11)

    def _render_chart_category_trend(self, ax):
        months = _last_12_months()
        txs = self._data['transactions']
        cats = [c for c in self._data['categories'] if c['type'] == 'expense']
        cats_with_data = []
        for cat in cats:
            vals = []
            for ym in months:
                v = sum(t['amount'] for t in txs if t['date'].startswith(ym) and t['type'] == 'expense' and t['category'] == cat['id'])
                vals.append(v)
            if any(v > 0 for v in vals):
                cats_with_data.append((cat, vals))

        if not cats_with_data:
            ax.text(0.5, 0.5, 'データなし', ha='center', va='center', transform=ax.transAxes)
            return

        colors = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316']
        labels = [int(m.split('-')[1]) for m in months]
        x = range(len(months))
        for i, (cat, vals) in enumerate(cats_with_data[:8]):
            ax.plot(list(x), vals, 'o-', label=cat['name'], color=colors[i % len(colors)], linewidth=1.5, markersize=4)
        ax.set_xticks(list(x))
        ax.set_xticklabels([f"{l}月" for l in labels])
        ax.legend(fontsize=8, loc='upper left')
        ax.set_title('カテゴリ別推移（過去12ヶ月）', fontsize=11)
