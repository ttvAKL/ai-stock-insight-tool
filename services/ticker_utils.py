import os, requests
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())
POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")

def is_valid_symbol(symbol: str) -> bool:
    sym = symbol.upper()
    try:
        url = f"https://api.polygon.io/v2/aggs/ticker/{sym}/prev"
        resp = requests.get(url, params={"apiKey": POLYGON_API_KEY})
        resp.raise_for_status()
        if not resp.json().get("results"):
            return False
    except Exception:
        return False

def get_overview_if_valid(symbol: str):
    """Return {'symbol': sym, 'name': name} if valid, else None."""
    sym = symbol.upper()
    if not is_valid_symbol(sym):
        return None
    # Fetch name via REST API
    try:
        ref_url = f"https://api.polygon.io/v3/reference/tickers/{sym}"
        res = requests.get(ref_url, params={"apiKey": POLYGON_API_KEY})
        res.raise_for_status()
        ref = res.json().get("results", {}) or {}
        name = ref.get("name", "")
    except Exception:
        name = ""
    return {"symbol": sym, "name": name}

def get_ticker_suggestions(query: str, limit: int = 10):
    """
    Return ticker symbol suggestions by prefix-match against REST API results.
    """
    q = query.upper()
    suggestions = []
    try:
        resp = requests.get(
            "https://api.polygon.io/v3/reference/tickers",
            params={"search": q, "limit": limit, "apiKey": POLYGON_API_KEY}
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        for entry in results:
            sym = entry.get("ticker", "").upper()
            suggestions.append({"symbol": sym, "name": entry.get("name", "")})
    except Exception:
        pass
    return suggestions