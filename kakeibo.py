import tkinter as tk
from tkinter import ttk, messagebox
import json
import os
from datetime import date
from collections import defaultdict

import matplotlib
matplotlib.use("TkAgg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.ticker as mticker
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

# 日本語フォント自動選択
import matplotlib.font_manager as fm
JP_FONTS = ["Hiragino Sans", "Yu Gothic", "MS Gothic", "IPAexGothic", "Noto Sans CJK JP"]
for _fn in JP_FONTS:
    if any(_fn in f.name for f in fm.fontManager.ttflist):
        plt.rcParams["font.family"] = _fn
        break

DATA_FILE = "kakeibo_data.json"

COLOR_PALETTE = [
    "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
    "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
    "#d37295", "#fabfd2", "#8cd17d", "#86bcb6", "#f1ce63",
    "#499894", "#e8e9eb", "#79706e", "#d4a6c8", "#a0cbe8",
]


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_data(records):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def get_months(records):
    return sorted({r["date"][:7] for r in records}, reverse=True)


class ColorMap:
    def __init__(self):
        self._map: dict = {}
        self._idx = 0

    def color_for(self, label: str) -> str:
        if label not in self._map:
            self._map[label] = COLOR_PALETTE[self._idx % len(COLOR_PALETTE)]
            self._idx += 1
        return self._map[label]

    def reset(self):
        self._map.clear()
        self._idx = 0


COLOR_MAP = ColorMap()


class KakeiboApp:
    def __init__(self, root):
        self.root = root
        self.root.title("家計簿アプリ")
        self.root.geometry("860x680")
        self.root.resizable(False, False)
        self.records = load_data()
        self._build_ui()
        self._refresh()

    # ────────────────── UI構築 ──────────────────────────

    def _build_ui(self):
        self.nb = ttk.Notebook(self.root)
        self.nb.pack(fill="both", expand=True, padx=8, pady=6)
        self.tab_list  = tk.Frame(self.nb)
        self.tab_graph = tk.Frame(self.nb)
        self.nb.add(self.tab_list,  text="  📋 一覧  ")
        self.nb.add(self.tab_graph, text="  📊 グラフ  ")
        self._build_list_tab()
        self._build_graph_tab()

    # ────────────────── 一覧タブ ────────────────────────

    def _build_list_tab(self):
        tab = self.tab_list

        inp = tk.LabelFrame(tab, text="新しい記録を追加", padx=10, pady=8)
        inp.pack(fill="x", padx=8, pady=6)

        r1 = tk.Frame(inp); r1.pack(fill="x", pady=2)
        tk.Label(r1, text="日付:").pack(side="left")
        self.date_var = tk.StringVar(value=str(date.today()))
        tk.Entry(r1, textvariable=self.date_var, width=12).pack(side="left", padx=(2, 16))
        tk.Label(r1, text="種別:").pack(side="left")
        self.type_var = tk.StringVar(value="支出")
        tk.Radiobutton(r1, text="支出", variable=self.type_var, value="支出").pack(side="left")
        tk.Radiobutton(r1, text="収入", variable=self.type_var, value="収入").pack(side="left", padx=(0, 16))

        r2 = tk.Frame(inp); r2.pack(fill="x", pady=2)
        tk.Label(r2, text="内容:").pack(side="left")
        self.desc_var = tk.StringVar()
        tk.Entry(r2, textvariable=self.desc_var, width=22).pack(side="left", padx=(2, 16))
        tk.Label(r2, text="金額(円):").pack(side="left")
        self.amount_var = tk.StringVar()
        tk.Entry(r2, textvariable=self.amount_var, width=10).pack(side="left", padx=(2, 16))
        tk.Button(r2, text="  追加  ", command=self._add_record,
                  bg="#4a90d9", fg="white", relief="flat", padx=4).pack(side="left")

        flt = tk.Frame(tab); flt.pack(fill="x", padx=8, pady=(0, 2))
        tk.Label(flt, text="表示月:").pack(side="left")
        self.month_var = tk.StringVar(value="すべて")
        self.month_cb = ttk.Combobox(flt, textvariable=self.month_var,
                                     state="readonly", width=12)
        self.month_cb.pack(side="left", padx=(4, 0))
        self.month_cb.bind("<<ComboboxSelected>>", lambda e: self._refresh_list())
        self.summary_var = tk.StringVar()
        tk.Label(flt, textvariable=self.summary_var,
                 font=("", 10, "bold")).pack(side="right", padx=8)

        lf = tk.LabelFrame(tab, text="記録一覧", padx=6, pady=6)
        lf.pack(fill="both", expand=True, padx=8, pady=4)
        cols = ("date", "type", "desc", "amount")
        self.tree = ttk.Treeview(lf, columns=cols, show="headings", height=13)
        for col, hd, w, anc in [
            ("date",   "日付",    100, "center"),
            ("type",   "種別",     60, "center"),
            ("desc",   "内容",    400, "w"),
            ("amount", "金額(円)", 130, "e"),
        ]:
            self.tree.heading(col, text=hd)
            self.tree.column(col, width=w, anchor=anc)
        self.tree.tag_configure("支出", foreground="#c0392b")
        self.tree.tag_configure("収入", foreground="#2471a3")
        sb = ttk.Scrollbar(lf, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=sb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        tk.Button(tab, text="選択した行を削除", command=self._delete_record,
                  bg="#e74c3c", fg="white", relief="flat", padx=6).pack(pady=4)

    # ────────────────── グラフタブ ──────────────────────

    def _build_graph_tab(self):
        tab = self.tab_graph

        ctrl = tk.Frame(tab); ctrl.pack(fill="x", padx=10, pady=6)
        tk.Label(ctrl, text="グラフ種別:").pack(side="left")
        self.graph_type_var = tk.StringVar(value="支出内訳（円グラフ）")
        ttk.Combobox(ctrl, textvariable=self.graph_type_var, state="readonly", width=22,
                     values=[
                         "支出内訳（円グラフ）",
                         "収入内訳（円グラフ）",
                         "月別収支（棒グラフ）",
                         "月別残高推移",
                     ]).pack(side="left", padx=(4, 8))

        tk.Label(ctrl, text="対象月:").pack(side="left")
        self.graph_month_var = tk.StringVar(value="今月")
        self.graph_month_cb = ttk.Combobox(ctrl, textvariable=self.graph_month_var,
                                           state="readonly", width=12)
        self.graph_month_cb.pack(side="left", padx=(4, 12))

        tk.Button(ctrl, text="グラフ更新", command=self._draw_graph,
                  bg="#4a90d9", fg="white", relief="flat", padx=6).pack(side="left")

        # figureはグラフ描画時に毎回作り直す
        self.fig = None
        self.canvas = None
        self.graph_frame = tk.Frame(tab)
        self.graph_frame.pack(fill="both", expand=True, padx=6, pady=4)

    # ────────────────── ロジック ────────────────────────

    def _add_record(self):
        d     = self.date_var.get().strip()
        t     = self.type_var.get()
        desc  = self.desc_var.get().strip()
        amt_s = self.amount_var.get().strip()
        if not d or not desc or not amt_s:
            messagebox.showwarning("入力エラー", "日付・内容・金額をすべて入力してください。")
            return
        try:
            amt = int(amt_s.replace(",", ""))
            if amt <= 0:
                raise ValueError
        except ValueError:
            messagebox.showwarning("入力エラー", "金額は正の整数で入力してください。")
            return
        self.records.append({"date": d, "type": t, "desc": desc, "amount": amt})
        save_data(self.records)
        self.desc_var.set("")
        self.amount_var.set("")
        self._refresh()

    def _delete_record(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showinfo("削除", "削除する行を選択してください。"); return
        if not messagebox.askyesno("確認", "選択した行を削除しますか？"): return
        for i in sorted([int(s) for s in sel], reverse=True):
            self.records.pop(i)
        save_data(self.records)
        self._refresh()

    def _refresh(self):
        COLOR_MAP.reset()
        for r in self.records:
            COLOR_MAP.color_for(r["desc"])
        self._update_month_lists()
        self._refresh_list()
        self._draw_graph()

    def _update_month_lists(self):
        months = get_months(self.records)
        vals = ["すべて"] + months
        self.month_cb["values"] = vals
        if self.month_var.get() not in vals:
            self.month_var.set("すべて")
        gvals = ["今月"] + months
        self.graph_month_cb["values"] = gvals
        if self.graph_month_var.get() not in gvals:
            self.graph_month_var.set("今月")

    def _filtered_records(self):
        m = self.month_var.get()
        if m == "すべて":
            return list(enumerate(self.records))
        return [(i, r) for i, r in enumerate(self.records) if r["date"].startswith(m)]

    def _refresh_list(self):
        for row in self.tree.get_children():
            self.tree.delete(row)
        income = expense = 0
        for i, r in self._filtered_records():
            amt  = r["amount"]
            sign = "+" if r["type"] == "収入" else "-"
            self.tree.insert("", "end", iid=str(i),
                             values=(r["date"], r["type"], r["desc"], f"{sign}{amt:,}"),
                             tags=(r["type"],))
            if r["type"] == "収入":
                income += amt
            else:
                expense += amt
        bal = income - expense
        self.summary_var.set(
            f"収入 {income:,}円  支出 {expense:,}円  残高 {'+' if bal >= 0 else ''}{bal:,}円"
        )

    # ────────────────── グラフ描画 ──────────────────────

    def _target_month(self) -> str:
        gm = self.graph_month_var.get()
        return str(date.today())[:7] if gm == "今月" else gm

    def _reset_figure(self):
        """既存のcanvasを破棄してfigureを新規作成する"""
        if self.canvas is not None:
            self.canvas.get_tk_widget().destroy()
            plt.close(self.fig)

        gtype = self.graph_type_var.get()
        is_pie = gtype in ("支出内訳（円グラフ）", "収入内訳（円グラフ）")

        self.fig = plt.figure(figsize=(8.4, 5.2))
        self.fig.patch.set_facecolor("#f8f8f8")

        if is_pie:
            # 円グラフ：左にグラフ、右に凡例
            self.ax     = self.fig.add_axes([0.04, 0.08, 0.54, 0.82])
            self.ax_leg = self.fig.add_axes([0.60, 0.05, 0.38, 0.90])
            self.ax_leg.axis("off")
        else:
            # 棒グラフ・折れ線：全幅で表示
            self.ax     = self.fig.add_axes([0.11, 0.18, 0.84, 0.72])
            self.ax_leg = None

        self.canvas = FigureCanvasTkAgg(self.fig, master=self.graph_frame)
        self.canvas.get_tk_widget().pack(fill="both", expand=True)

    def _draw_graph(self):
        self._reset_figure()

        gtype = self.graph_type_var.get()
        if gtype == "支出内訳（円グラフ）":
            self._pie_chart("支出")
        elif gtype == "収入内訳（円グラフ）":
            self._pie_chart("収入")
        elif gtype == "月別収支（棒グラフ）":
            self._bar_chart()
        elif gtype == "月別残高推移":
            self._line_chart()

        self.canvas.draw()

    # ── 円グラフ ──────────────────────────────────────

    def _pie_chart(self, kind: str):
        month = self._target_month()
        buckets: dict = defaultdict(int)
        for r in self.records:
            if r["date"].startswith(month) and r["type"] == kind:
                buckets[r["desc"]] += r["amount"]

        if not buckets:
            self.ax.text(0.5, 0.5, f"{month} の{kind}データがありません",
                         ha="center", va="center", transform=self.ax.transAxes, fontsize=12)
            self.ax.set_title(f"{month}　{kind}内訳", fontsize=13, pad=10)
            return

        labels = list(buckets.keys())
        values = list(buckets.values())
        colors = [COLOR_MAP.color_for(lb) for lb in labels]
        total  = sum(values)

        max_i   = values.index(max(values))
        explode = [0.04 if i == max_i else 0.0 for i in range(len(values))]

        _, _, autotexts = self.ax.pie(
            values,
            labels=None,
            colors=colors,
            explode=explode,
            autopct=lambda p: f"{p:.1f}%\n({int(round(p * total / 100)):,}円)" if p >= 3 else "",
            pctdistance=0.72,
            startangle=140,
            wedgeprops={"linewidth": 0.8, "edgecolor": "white"},
        )
        for at in autotexts:
            at.set_fontsize(8.5)
            at.set_color("white")
            at.set_fontweight("bold")

        self.ax.set_title(f"{month}　{kind}内訳\n合計 {total:,}円", fontsize=12, pad=10)

        legend_handles = [
            mpatches.Patch(
                color=COLOR_MAP.color_for(lb),
                label=f"{lb}  {val:,}円 ({val/total*100:.1f}%)"
            )
            for lb, val in zip(labels, values)
        ]
        self.ax_leg.legend(
            handles=legend_handles,
            loc="center left",
            fontsize=9,
            frameon=True,
            framealpha=0.6,
            edgecolor="#cccccc",
            title="内容",
            title_fontsize=9,
        )

    # ── 月別収支棒グラフ ──────────────────────────────

    def _bar_chart(self):
        summary: dict = defaultdict(lambda: {"収入": 0, "支出": 0})
        for r in self.records:
            summary[r["date"][:7]][r["type"]] += r["amount"]
        summary = dict(sorted(summary.items()))

        if not summary:
            self.ax.text(0.5, 0.5, "データがありません", ha="center", va="center",
                         transform=self.ax.transAxes, fontsize=12)
            self.ax.set_title("月別 収入・支出", fontsize=13)
            return

        months   = list(summary.keys())
        incomes  = [summary[m]["収入"] for m in months]
        expenses = [summary[m]["支出"] for m in months]
        x = list(range(len(months)))
        w = 0.35

        self.ax.bar([i - w/2 for i in x], incomes,  width=w, label="収入",
                    color="#2471a3", alpha=0.85, edgecolor="white")
        self.ax.bar([i + w/2 for i in x], expenses, width=w, label="支出",
                    color="#c0392b", alpha=0.85, edgecolor="white")
        self.ax.set_xticks(x)
        self.ax.set_xticklabels(months, rotation=30, ha="right", fontsize=9)
        self.ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{int(v):,}"))
        self.ax.set_title("月別 収入・支出", fontsize=13)
        self.ax.legend(fontsize=9)
        self.ax.set_facecolor("#fafafa")

    # ── 月別残高推移 ──────────────────────────────────

    def _line_chart(self):
        summary: dict = defaultdict(lambda: {"収入": 0, "支出": 0})
        for r in self.records:
            summary[r["date"][:7]][r["type"]] += r["amount"]
        summary = dict(sorted(summary.items()))

        if not summary:
            self.ax.text(0.5, 0.5, "データがありません", ha="center", va="center",
                         transform=self.ax.transAxes, fontsize=12)
            self.ax.set_title("月別 残高推移", fontsize=13)
            return

        months   = list(summary.keys())
        balances = [summary[m]["収入"] - summary[m]["支出"] for m in months]
        colors   = ["#2471a3" if b >= 0 else "#c0392b" for b in balances]
        x        = list(range(len(months)))

        self.ax.bar(x, balances, color=colors, alpha=0.55, edgecolor="white")
        self.ax.plot(x, balances, marker="o", color="#333", linewidth=1.8, zorder=3)
        for xi, my in zip(x, balances):
            self.ax.annotate(f"{my:,}", xy=(xi, my),
                             xytext=(0, 6 if my >= 0 else -14),
                             textcoords="offset points",
                             ha="center", fontsize=8)
        self.ax.axhline(0, color="#888", linewidth=0.8, linestyle="--")
        self.ax.set_xticks(x)
        self.ax.set_xticklabels(months, rotation=30, ha="right", fontsize=9)
        self.ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{int(v):,}"))
        self.ax.set_title("月別 残高推移", fontsize=13)
        self.ax.set_facecolor("#fafafa")


if __name__ == "__main__":
    root = tk.Tk()
    app = KakeiboApp(root)
    root.mainloop()
