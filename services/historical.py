import os
import requests
from datetime import datetime, timedelta

def fetch_polygon_history(symbol, granularity, from_time=None, to_time=None):
    if to_time is None:
        to_time = datetime.utcnow()
    if from_time is None:
        range_map = {
            "1min": 4,
            "5min": 10,
            "30min": 30,
            "1h": 180,
            "1d": 730
        }
        days = range_map.get(granularity, 2)
        from_time = to_time - timedelta(days=days)
    POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")
    multiplier_map = {
        "1min": (1, "minute"),
        "5min": (5, "minute"),
        "30min": (30, "minute"),
        "1h": (1, "hour"),
        "1d": (1, "day")
    }

    if granularity not in multiplier_map: 
        return []

    multiplier, timespan = multiplier_map[granularity]

    url = (
        f"https://api.polygon.io/v2/aggs/ticker/{symbol.upper()}/range/"
        f"{multiplier}/{timespan}/{from_time.date()}/{to_time.date()}"
        f"?adjusted=true&sort=asc&limit=5000&apiKey={POLYGON_API_KEY}"
    )

    res = requests.get(url)
    if res.status_code != 200:
        print(f"[ERROR] Polygon history failed: {res.json()}")
        return []

    data = res.json().get("results", [])
    return [
        {
            "time": datetime.utcfromtimestamp(item["t"] / 1000).isoformat(),
            "open": item["o"],
            "high": item["h"],
            "low": item["l"],
            "close": item["c"],
        }
        for item in data
    ]