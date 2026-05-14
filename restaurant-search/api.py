import requests

BASE = "https://webservice.recruit.co.jp/hotpepper"


def fetch_large_areas(api_key):
    r = requests.get(f"{BASE}/large_area/v1/",
                     params={"key": api_key, "format": "json"}, timeout=10)
    r.raise_for_status()
    return r.json()["results"]["large_area"]


def fetch_middle_areas(api_key, large_area_code):
    r = requests.get(f"{BASE}/middle_area/v1/",
                     params={"key": api_key, "large_area": large_area_code, "format": "json"}, timeout=10)
    r.raise_for_status()
    return r.json()["results"]["middle_area"]


def fetch_genres(api_key):
    r = requests.get(f"{BASE}/genre/v1/",
                     params={"key": api_key, "format": "json"}, timeout=10)
    r.raise_for_status()
    return r.json()["results"]["genre"]


def search(api_key, large_area=None, middle_area=None, genre=None,
           keyword=None, lunch=False, start=1, count=20):
    params = {"key": api_key, "format": "json", "count": count, "start": start}
    if middle_area:
        params["middle_area"] = middle_area
    elif large_area:
        params["large_area"] = large_area
    if genre:
        params["genre"] = genre
    if keyword:
        params["keyword"] = keyword
    if lunch:
        params["lunch"] = 1
    r = requests.get(f"{BASE}/gourmet/v1/", params=params, timeout=15)
    r.raise_for_status()
    res = r.json()["results"]
    return res.get("shop", []), int(res.get("results_available", 0))
