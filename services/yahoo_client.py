import yfinance as yf

def fetch_yahoo_quote_json(symbol: str) -> dict:
    """
    Fetches key overview metrics for a symbol via yfinance.
    """
    try:
        tk = yf.Ticker(symbol)
        info = tk.info or {}
    except Exception as e:
        print(f"[YahooClient] yfinance fetch failed for {symbol}: {e}")
        return {}

    # Map the desired fields, defaulting to None
    return {
        "Previous Close": info.get("previousClose"),
        "Open": info.get("open"),
        "Bid": f"{info.get('bid')} x {info.get('bidSize')}" if info.get('bid') is not None and info.get('bidSize') is not None else None,
        "Ask": f"{info.get('ask')} x {info.get('askSize')}" if info.get('ask') is not None and info.get('askSize') is not None else None,
        "Day's Range": f"{info.get('dayLow')} - {info.get('dayHigh')}" if info.get('dayLow') is not None and info.get('dayHigh') is not None else None,
        "52 Week Range": f"{info.get('fiftyTwoWeekLow')} - {info.get('fiftyTwoWeekHigh')}" if info.get('fiftyTwoWeekLow') is not None and info.get('fiftyTwoWeekHigh') is not None else None,
        "Volume": info.get("volume"),
        "Avg. Volume": info.get("averageVolume"),
        "Net Assets": info.get("totalAssets"),
        "NAV": info.get("navPrice"),
        "PE Ratio (TTM)": info.get("trailingPE"),
        "Yield": info.get("dividendYield"),
        "YTD Daily Total Return": info.get("ytdReturn"),
        "Beta (5Y Monthly)": info.get("beta"),
        "Expense Ratio (net)": info.get("expenseRatio"),
    }