import json
import threading
import webbrowser
import customtkinter as ctk

import api
import db

with open("config.json") as f:
    API_KEY = json.load(f)["api_key"]

ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")

COUNT = 20


class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("全国レストラン検索")
        self.geometry("980x700")

        db.init_db()

        self._large_areas = []
        self._middle_areas = []
        self._genres = []
        self._start = 1
        self._total = 0

        self._build()
        self._load_masters()

    # ── UI構築 ──────────────────────────────────────────────

    def _build(self):
        tabs = ctk.CTkTabview(self)
        tabs.pack(fill="both", expand=True, padx=10, pady=10)

        self._tab_s = tabs.add("検索")
        self._tab_f = tabs.add("お気に入り")
        self._tab_h = tabs.add("履歴")

        self._build_search()
        self._build_fav()
        self._build_hist()

    def _build_search(self):
        # フィルター行
        ff = ctk.CTkFrame(self._tab_s)
        ff.pack(fill="x", padx=5, pady=5)

        # --- 1行目: 大エリア → 中エリア ---
        ctk.CTkLabel(ff, text="大エリア").grid(row=0, column=0, padx=(10, 2), pady=(8, 2))
        self._area_menu = ctk.CTkComboBox(ff, width=220, values=["読み込み中..."],
                                          command=self._on_area_change)
        self._area_menu.grid(row=0, column=1, padx=(2, 10), pady=(8, 2))

        ctk.CTkLabel(ff, text="中エリア").grid(row=0, column=2, padx=(10, 2), pady=(8, 2))
        self._middle_menu = ctk.CTkComboBox(ff, width=220, values=["大エリアを先に選択"],
                                            state="disabled")
        self._middle_menu.grid(row=0, column=3, padx=(2, 10), pady=(8, 2))

        # --- 2行目: ジャンル・時間帯・検索 ---
        ctk.CTkLabel(ff, text="ジャンル").grid(row=1, column=0, padx=(10, 2), pady=(2, 4))
        self._genre_menu = ctk.CTkComboBox(ff, width=220, values=["読み込み中..."])
        self._genre_menu.grid(row=1, column=1, padx=(2, 10), pady=(2, 4))

        ctk.CTkLabel(ff, text="時間帯").grid(row=1, column=2, padx=(10, 2), pady=(2, 4))
        self._meal_var = ctk.StringVar(value="両方")
        mf = ctk.CTkFrame(ff, fg_color="transparent")
        mf.grid(row=1, column=3, padx=(2, 10), pady=(2, 4), sticky="w")
        for v in ["両方", "ランチ", "ディナー"]:
            ctk.CTkRadioButton(mf, text=v, variable=self._meal_var, value=v).pack(side="left", padx=4)

        self._search_btn = ctk.CTkButton(ff, text="検索", width=80, command=self._search)
        self._search_btn.grid(row=1, column=4, padx=10, pady=(2, 4))

        # --- 3行目: 店名キーワード ---
        ctk.CTkLabel(ff, text="店名・キーワード").grid(row=2, column=0, padx=(10, 2), pady=(4, 8))
        self._keyword_entry = ctk.CTkEntry(ff, width=500, placeholder_text="例: ラーメン　焼肉　カフェ")
        self._keyword_entry.grid(row=2, column=1, columnspan=3, padx=(2, 10), pady=(4, 8), sticky="w")
        self._keyword_entry.bind("<Return>", lambda e: self._search())

        # ステータス
        self._status = ctk.CTkLabel(self._tab_s, text="")
        self._status.pack()

        # 結果一覧
        self._results_frame = ctk.CTkScrollableFrame(self._tab_s)
        self._results_frame.pack(fill="both", expand=True, padx=5, pady=(0, 3))

        # ページネーション
        pf = ctk.CTkFrame(self._tab_s)
        pf.pack(fill="x", padx=5, pady=(0, 5))
        self._prev_btn = ctk.CTkButton(pf, text="← 前へ", width=80, state="disabled", command=self._prev)
        self._prev_btn.pack(side="left", padx=5, pady=3)
        self._page_lbl = ctk.CTkLabel(pf, text="")
        self._page_lbl.pack(side="left", padx=5)
        self._next_btn = ctk.CTkButton(pf, text="次へ →", width=80, state="disabled", command=self._next)
        self._next_btn.pack(side="left", padx=5, pady=3)

    def _build_fav(self):
        ctk.CTkButton(self._tab_f, text="一覧を更新", command=self._refresh_fav).pack(pady=5)
        self._fav_frame = ctk.CTkScrollableFrame(self._tab_f)
        self._fav_frame.pack(fill="both", expand=True, padx=5, pady=(0, 5))

    def _build_hist(self):
        ctk.CTkButton(self._tab_h, text="履歴を更新", command=self._refresh_hist).pack(pady=5)
        self._hist_frame = ctk.CTkScrollableFrame(self._tab_h)
        self._hist_frame.pack(fill="both", expand=True, padx=5, pady=(0, 5))

    # ── 大エリア変更時：中エリアを動的読み込み ──────────────────

    def _on_area_change(self, area_name):
        area_code = next((a["code"] for a in self._large_areas if a["name"] == area_name), None)
        if not area_code:
            return
        self._middle_menu.configure(state="disabled", values=["読み込み中..."])
        self._middle_menu.set("読み込み中...")

        def load():
            try:
                middles = api.fetch_middle_areas(API_KEY, area_code)
                self._middle_areas = middles
                names = ["すべて"] + [m["name"] for m in middles]
                self._middle_menu.configure(state="normal", values=names)
                self._middle_menu.set("すべて")
            except Exception as e:
                self._middle_menu.configure(state="normal", values=["すべて"])
                self._middle_menu.set("すべて")

        threading.Thread(target=load, daemon=True).start()

    # ── マスターデータ読み込み ───────────────────────────────

    def _load_masters(self):
        def load():
            try:
                areas = api.fetch_large_areas(API_KEY)
                areas.sort(key=lambda a: a["code"])
                genres = api.fetch_genres(API_KEY)
                self._large_areas = areas
                self._genres = genres
                area_names = [a["name"] for a in areas]
                genre_names = ["すべて"] + [g["name"] for g in genres]
                self._area_menu.configure(values=area_names)
                default_area = next(
                    (a["name"] for a in areas if "愛媛" in a["name"]),
                    area_names[0] if area_names else ""
                )
                self._area_menu.set(default_area)
                self._genre_menu.configure(values=genre_names)
                self._genre_menu.set("すべて")
                self._status.configure(text="エリアとジャンルを選択して検索してください")
                self.after(0, lambda: self._on_area_change(default_area))
            except Exception as e:
                self._status.configure(text=f"読み込みエラー: {e}")

        threading.Thread(target=load, daemon=True).start()

    # ── 検索 ────────────────────────────────────────────────

    def _search(self, reset=True):
        if not self._large_areas:
            self._status.configure(text="エリアデータを読み込み中です。しばらくお待ちください。")
            return

        if reset:
            self._start = 1

        area_name = self._area_menu.get()
        middle_name = self._middle_menu.get()
        genre_name = self._genre_menu.get()
        meal = self._meal_var.get()
        keyword = self._keyword_entry.get().strip()

        area_code = next((a["code"] for a in self._large_areas if a["name"] == area_name), None)
        middle_code = next((m["code"] for m in self._middle_areas if m["name"] == middle_name), None)
        genre_code = next((g["code"] for g in self._genres if g["name"] == genre_name), None)
        lunch = (meal == "ランチ")

        self._search_btn.configure(state="disabled", text="検索中...")
        self._status.configure(text="検索中...")

        def run():
            try:
                shops, total = api.search(
                    API_KEY, large_area=area_code, middle_area=middle_code,
                    genre=genre_code, keyword=keyword,
                    lunch=lunch, start=self._start, count=COUNT
                )
                db.add_history(area_name, genre_name, meal, total)
                self.after(0, lambda: self._show(shops, total))
            except Exception as e:
                self.after(0, lambda: self._status.configure(text=f"エラー: {e}"))
                self.after(0, lambda: self._search_btn.configure(state="normal", text="検索"))

        threading.Thread(target=run, daemon=True).start()

    def _show(self, shops, total):
        self._search_btn.configure(state="normal", text="検索")
        self._total = total

        for w in self._results_frame.winfo_children():
            w.destroy()

        if not shops:
            self._status.configure(text="結果が見つかりませんでした")
            self._prev_btn.configure(state="disabled")
            self._next_btn.configure(state="disabled")
            return

        self._status.configure(text=f"{total:,}件見つかりました")
        for shop in shops:
            self._shop_card(self._results_frame, shop)

        page = (self._start - 1) // COUNT + 1
        max_start = min(total, 1000)  # Hot Pepper API の上限
        total_pages = (max_start + COUNT - 1) // COUNT
        self._page_lbl.configure(text=f"{page} / {total_pages} ページ")
        self._prev_btn.configure(state="normal" if self._start > 1 else "disabled")
        self._next_btn.configure(state="normal" if self._start + COUNT <= max_start else "disabled")

    # ── 店舗カード ───────────────────────────────────────────

    def _shop_card(self, parent, shop, removable=False):
        card = ctk.CTkFrame(parent, corner_radius=8)
        card.pack(fill="x", padx=5, pady=3)

        left = ctk.CTkFrame(card, fg_color="transparent")
        left.pack(side="left", fill="both", expand=True, padx=8, pady=6)

        name = shop.get("name", "")
        genre = shop.get("genre", {}).get("name", "")
        address = shop.get("address", "")
        access = shop.get("mobile_access", "") or shop.get("access", "")
        url = shop.get("urls", {}).get("pc", "")
        has_lunch = shop.get("lunch") == "あり"

        ctk.CTkLabel(left, text=name,
                     font=ctk.CTkFont(size=13, weight="bold"),
                     anchor="w").pack(fill="x")
        ctk.CTkLabel(left, text=f"{genre}  |  {address}",
                     text_color="gray", anchor="w",
                     wraplength=600).pack(fill="x")
        if access:
            ctk.CTkLabel(left, text=f"最寄: {access}",
                         text_color="gray",
                         font=ctk.CTkFont(size=11),
                         anchor="w").pack(fill="x")
        if has_lunch:
            ctk.CTkLabel(left, text="ランチあり",
                         text_color="#FF8C00",
                         font=ctk.CTkFont(size=11),
                         anchor="w").pack(fill="x")

        right = ctk.CTkFrame(card, fg_color="transparent")
        right.pack(side="right", padx=8, pady=6)

        if url:
            ctk.CTkButton(right, text="HP", width=50,
                          command=lambda u=url: webbrowser.open(u)).pack(pady=2)

        if removable:
            ctk.CTkButton(right, text="削除", width=60,
                          fg_color="#CC3333", hover_color="#AA2222",
                          command=lambda s=shop: (
                              db.remove_favorite(s["id"]), self._refresh_fav()
                          )).pack(pady=2)
        else:
            fav_btn = ctk.CTkButton(right, text="", width=70)
            fav_btn.pack(pady=2)

            def refresh_star(btn=fav_btn, s=shop):
                btn.configure(text="★ 解除" if db.is_favorite(s["id"]) else "☆ 保存")

            def toggle(btn=fav_btn, s=shop):
                if db.is_favorite(s["id"]):
                    db.remove_favorite(s["id"])
                else:
                    db.add_favorite(s)
                refresh_star(btn, s)

            fav_btn.configure(command=toggle)
            refresh_star()

    # ── お気に入り ───────────────────────────────────────────

    def _refresh_fav(self):
        for w in self._fav_frame.winfo_children():
            w.destroy()
        favs = db.get_favorites()
        if not favs:
            ctk.CTkLabel(self._fav_frame, text="お気に入りはまだありません").pack(pady=20)
        else:
            for shop in favs:
                self._shop_card(self._fav_frame, shop, removable=True)

    # ── 履歴 ────────────────────────────────────────────────

    def _refresh_hist(self):
        for w in self._hist_frame.winfo_children():
            w.destroy()
        history = db.get_history()
        if not history:
            ctk.CTkLabel(self._hist_frame, text="検索履歴はありません").pack(pady=20)
        else:
            for h in history:
                row = ctk.CTkFrame(self._hist_frame)
                row.pack(fill="x", padx=5, pady=2)
                text = (f"[{h['searched_at']}]  "
                        f"{h['area']} / {h['genre']} / {h['meal']}  "
                        f"→ {h['results_found']:,}件")
                ctk.CTkLabel(row, text=text, anchor="w").pack(fill="x", padx=8, pady=4)

    # ── ページネーション ─────────────────────────────────────

    def _prev(self):
        self._start = max(1, self._start - COUNT)
        self._search(reset=False)

    def _next(self):
        self._start += COUNT
        self._search(reset=False)


if __name__ == "__main__":
    app = App()
    app.mainloop()
