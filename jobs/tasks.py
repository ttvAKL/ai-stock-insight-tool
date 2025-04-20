import requests

def fetch_and_cache_symbol(symbol):
    try:
        print(f"Worker fetching {symbol}")
        requests.get(f"http://127.0.0.1:3000/api/stock/{symbol}")
    except Exception as e:
        print(f"Worker failed to fetch {symbol}: {e}")