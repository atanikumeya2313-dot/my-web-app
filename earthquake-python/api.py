"""P2PQuake API からの地震データ取得・変換ユーティリティ"""
import requests
from datetime import datetime

API_URL = 'https://api.p2pquake.net/v2/history?codes=551&limit=30'

SCALE_LABELS = {
    -1: '不明', 10: '1', 20: '2', 30: '3', 40: '4',
    45: '5弱', 50: '5強', 55: '6弱', 60: '6強', 70: '7',
}

# (背景色, 文字色)
SCALE_COLORS = {
    70: ('#6b21a8', 'white'),
    60: ('#991b1b', 'white'),
    55: ('#dc2626', 'white'),
    50: ('#ef4444', 'white'),
    45: ('#f97316', 'white'),
    40: ('#facc15', '#111827'),
    30: ('#fef08a', '#374151'),
    20: ('#dbeafe', '#374151'),
    10: ('#f3f4f6', '#6b7280'),
    -1: ('#f3f4f6', '#9ca3af'),
}

SCALE_BORDER_COLORS = {
    70: '#6b21a8', 60: '#991b1b', 55: '#dc2626', 50: '#ef4444',
    45: '#f97316', 40: '#facc15', 30: '#fef08a', 20: '#bfdbfe', 10: '#e5e7eb',
}

TSUNAMI_LABELS = {
    'Watch':    '津波注意報',
    'Warning':  '津波警報',
    'Checking': '調査中',
}

PREFS = [
    '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
    '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
    '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
    '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
    '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
    '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
    '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
]


def fetch_earthquakes() -> list[dict]:
    res = requests.get(API_URL, timeout=10)
    res.raise_for_status()
    result = []
    for q in res.json():
        eq     = q.get('earthquake', {})
        points = q.get('points', [])
        pref_max: dict[str, int] = {}
        for p in points:
            if p.get('scale', -1) <= 0:
                continue
            pref = p.get('pref', '')
            if pref not in pref_max or pref_max[pref] < p['scale']:
                pref_max[pref] = p['scale']
        sorted_prefs = sorted(pref_max.items(), key=lambda x: -x[1])
        result.append({
            'id':               q.get('id', ''),
            'time':             eq.get('time', ''),
            'hypocenter':       eq.get('hypocenter', {}),
            'maxScale':         eq.get('maxScale', -1),
            'domesticTsunami':  eq.get('domesticTsunami', 'None'),
            'prefectures':      [p for p, _ in sorted_prefs],
            'prefScales':       [{'pref': p, 'scale': s} for p, s in sorted_prefs],
        })
    return result


def fmt_time(time_str: str) -> tuple[str, str]:
    for fmt in ('%Y/%m/%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S'):
        try:
            d = datetime.strptime(time_str[:19], fmt)
            return d.strftime('%Y/%m/%d'), d.strftime('%H:%M')
        except ValueError:
            continue
    return time_str[:10], time_str[11:16]


def scale_label(scale: int) -> str:
    return SCALE_LABELS.get(scale, '不明')


def scale_colors(scale: int) -> tuple[str, str]:
    for key in sorted(SCALE_COLORS.keys(), reverse=True):
        if scale >= key:
            return SCALE_COLORS[key]
    return SCALE_COLORS[-1]


def scale_border(scale: int) -> str:
    for key in sorted(SCALE_BORDER_COLORS.keys(), reverse=True):
        if scale >= key:
            return SCALE_BORDER_COLORS[key]
    return '#e5e7eb'


def tsunami_label(code: str) -> str | None:
    return TSUNAMI_LABELS.get(code)


def is_pinned(quake: dict) -> bool:
    mag = quake.get('hypocenter', {}).get('magnitude', 0) or 0
    return quake.get('maxScale', -1) >= 45 or mag >= 6.0


def extract_pref(name: str) -> str | None:
    return next((p for p in PREFS if name.startswith(p)), None)
