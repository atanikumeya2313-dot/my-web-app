"""データ管理・JSONストレージ"""
import json
import uuid
from pathlib import Path
from datetime import date

DATA_DIR  = Path(__file__).parent / 'data'
DATA_FILE = DATA_DIR / 'kakeibo.json'

DEFAULT_CATEGORIES = [
    {'id': 'food',          'name': '食費',       'type': 'expense', 'is_default': True},
    {'id': 'dining',        'name': '外食',       'type': 'expense', 'is_default': True},
    {'id': 'transport',     'name': '交通費',     'type': 'expense', 'is_default': True},
    {'id': 'utilities',     'name': '光熱費',     'type': 'expense', 'is_default': True},
    {'id': 'rent',          'name': '住居費',     'type': 'expense', 'is_default': True},
    {'id': 'medical',       'name': '医療費',     'type': 'expense', 'is_default': True},
    {'id': 'entertainment', 'name': '娯楽',       'type': 'expense', 'is_default': True},
    {'id': 'clothing',      'name': '衣類',       'type': 'expense', 'is_default': True},
    {'id': 'education',     'name': '教育',       'type': 'expense', 'is_default': True},
    {'id': 'insurance',     'name': '保険',       'type': 'expense', 'is_default': True},
    {'id': 'communication', 'name': '通信費',     'type': 'expense', 'is_default': True},
    {'id': 'other_expense', 'name': 'その他支出', 'type': 'expense', 'is_default': True},
    {'id': 'salary',        'name': '給与',       'type': 'income',  'is_default': True},
    {'id': 'bonus',         'name': 'ボーナス',   'type': 'income',  'is_default': True},
    {'id': 'invest_income', 'name': '投資収入',   'type': 'income',  'is_default': True},
    {'id': 'other_income',  'name': 'その他収入', 'type': 'income',  'is_default': True},
]

def _default_data() -> dict:
    return {
        'transactions':    [],
        'categories':      [c.copy() for c in DEFAULT_CATEGORIES],
        'budgets':         [],
        'fixed_items':     [],
        'assets':          [],
        'templates':       [],
        'applied_months':  [],
    }

def load_data() -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        return _default_data()
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for key, val in _default_data().items():
            data.setdefault(key, val)
        return data
    except Exception:
        return _default_data()

def save_data(data: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def new_id() -> str:
    return str(uuid.uuid4())

def today_str() -> str:
    return date.today().isoformat()

def current_month() -> str:
    return date.today().strftime('%Y-%m')

def apply_fixed_items(data: dict) -> bool:
    """今月の固定費を未適用なら適用。適用した場合 True。"""
    ym  = current_month()
    if ym in data.get('applied_months', []):
        return False
    today_day = date.today().day
    for item in data.get('fixed_items', []):
        if item.get('day', 1) <= today_day:
            tx_date = f"{ym}-{item['day']:02d}"
            data['transactions'].insert(0, {
                'id':       new_id(),
                'date':     tx_date,
                'amount':   item['amount'],
                'type':     item['type'],
                'category': item['category'],
                'memo':     f"[固定] {item['name']}",
            })
    data.setdefault('applied_months', []).append(ym)
    return True

def calc_asset_balance(asset: dict, transactions: list) -> int:
    if asset['type'] == 'investment':
        return asset['initial_balance']
    today = today_str()
    since = asset['initial_date'] if asset['initial_date'] <= today else today
    filtered = [t for t in transactions if since <= t['date'] <= today]
    income  = sum(t['amount'] for t in filtered if t['type'] == 'income')
    expense = sum(t['amount'] for t in filtered if t['type'] == 'expense')
    return asset['initial_balance'] + income - expense

def fmt_amount(n: int) -> str:
    return f"¥{n:,}"

def fmt_short(n: int) -> str:
    if abs(n) >= 10000:
        return f"{n // 10000}万"
    return f"{n:,}"

# ── CSV インポート ────────────────────────────────────────────────
import csv, io, chardet

BANK_PATTERNS = {
    'moneyforward': {'date': '日付', 'amount': '金額（円）', 'memo': '内容'},
    'rakuten':      {'date': '利用日', 'amount': '利用金額', 'memo': '利用店名・商品名'},
    'sbi':          {'date': '取引日', 'amount': '取引金額', 'memo': '摘要'},
    'mufg':         {'date': '年月日', 'amount': 'お取引金額', 'memo': '摘要内容'},
    'yucho':        {'date': '年月日', 'amount': '出入金額（円）', 'memo': '摘要'},
}

def detect_encoding(raw: bytes) -> str:
    result = chardet.detect(raw)
    enc = result.get('encoding', 'utf-8') or 'utf-8'
    return enc if enc.lower() != 'ascii' else 'utf-8'

def parse_csv(raw: bytes, bank: str, tx_type: str, category_id: str) -> list:
    """CSVバイト列を解析してトランザクションリストを返す"""
    enc  = detect_encoding(raw)
    text = raw.decode(enc, errors='replace')
    pat  = BANK_PATTERNS.get(bank, {'date': '日付', 'amount': '金額', 'memo': '摘要'})
    rows = []
    try:
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            date_val   = row.get(pat['date'], '').strip()
            amount_val = row.get(pat['amount'], '').strip().replace(',', '').replace('￥', '').replace('¥', '')
            memo_val   = row.get(pat['memo'], '').strip()
            if not date_val or not amount_val:
                continue
            try:
                amount = abs(int(float(amount_val)))
            except ValueError:
                continue
            # 日付正規化
            date_norm = date_val.replace('/', '-').replace('.', '-')
            if len(date_norm) == 8 and date_norm.isdigit():
                date_norm = f"{date_norm[:4]}-{date_norm[4:6]}-{date_norm[6:]}"
            rows.append({
                'id':       new_id(),
                'date':     date_norm,
                'amount':   amount,
                'type':     tx_type,
                'category': category_id,
                'memo':     memo_val,
            })
    except Exception:
        pass
    return rows

# ── JSON バックアップ ─────────────────────────────────────────────
def export_json(data: dict) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)

def import_json(text: str) -> dict | None:
    try:
        data = json.loads(text)
        if 'transactions' not in data:
            return None
        for key, val in _default_data().items():
            data.setdefault(key, val)
        return data
    except Exception:
        return None
