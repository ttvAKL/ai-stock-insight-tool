import re
import requests
from bs4 import BeautifulSoup

# Use a realistic desktop User-Agent
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0.0.0 Safari/537.36"
    )
}


def get_google_financials(symbol: str) -> dict:
    url = f"https://www.google.com/finance/quote/{symbol.upper()}:NASDAQ"
    data = {}
    try:
        resp = requests.get(url, headers=HEADERS, timeout=5)
        resp.raise_for_status()
    except Exception:
        return data

    soup = BeautifulSoup(resp.text, "lxml")

    # Map Google labels to our overview keys
    field_map = {
        r"Sector": "Sector",
        r"Market cap": "MarketCapitalization",
        r"P/E ratio": "PERatio",
        r"Dividend yield": "DividendYield",
        r"EPS \(TTM\)": "EPS",
    }

    # Parse each field by locating the label and grabbing its neighbor
    for pattern, key in field_map.items():
        label_elem = soup.find(text=re.compile(f"^{pattern}$"))
        if label_elem:
            parent = label_elem.find_parent()
            if parent:
                # The value is typically in the next sibling div
                sib = parent.find_next_sibling()
                if sib:
                    val = sib.text.strip()
                    data[key] = val

    return data