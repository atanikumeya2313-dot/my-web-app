import sqlite3
import json
from datetime import datetime

DB = "restaurants.db"


def init_db():
    with sqlite3.connect(DB) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS favorites (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            saved_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            area TEXT, genre TEXT, meal TEXT,
            results_found INTEGER, searched_at TEXT
        )""")


def add_favorite(shop):
    with sqlite3.connect(DB) as conn:
        conn.execute("INSERT OR REPLACE INTO favorites VALUES (?,?,?)",
                     (shop["id"],
                      json.dumps(shop, ensure_ascii=False),
                      datetime.now().strftime("%Y-%m-%d %H:%M")))


def remove_favorite(shop_id):
    with sqlite3.connect(DB) as conn:
        conn.execute("DELETE FROM favorites WHERE id=?", (shop_id,))


def is_favorite(shop_id):
    with sqlite3.connect(DB) as conn:
        return conn.execute(
            "SELECT 1 FROM favorites WHERE id=?", (shop_id,)
        ).fetchone() is not None


def get_favorites():
    with sqlite3.connect(DB) as conn:
        rows = conn.execute(
            "SELECT data FROM favorites ORDER BY saved_at DESC"
        ).fetchall()
    return [json.loads(r[0]) for r in rows]


def add_history(area, genre, meal, count):
    with sqlite3.connect(DB) as conn:
        conn.execute(
            "INSERT INTO history (area,genre,meal,results_found,searched_at) VALUES (?,?,?,?,?)",
            (area, genre, meal, count, datetime.now().strftime("%Y-%m-%d %H:%M")))


def get_history(limit=50):
    with sqlite3.connect(DB) as conn:
        rows = conn.execute(
            "SELECT area,genre,meal,results_found,searched_at "
            "FROM history ORDER BY searched_at DESC LIMIT ?",
            (limit,)
        ).fetchall()
    return [
        {"area": r[0], "genre": r[1], "meal": r[2],
         "results_found": r[3], "searched_at": r[4]}
        for r in rows
    ]
