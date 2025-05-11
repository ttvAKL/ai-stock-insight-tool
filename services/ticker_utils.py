import pandas as pd
import json
import requests
import time
import os
import random
from dotenv import load_dotenv, find_dotenv
import logging

# Configure logger
logging.basicConfig(
    filename="ticker_validation.log",
    filemode="w",
    format="%(asctime)s - %(levelname)s - %(message)s",
    level=logging.INFO
)

load_dotenv(find_dotenv())
POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")

def is_valid_symbol(symbol):
    """Check if symbol exists and has key financials using Polygon APIs."""
    try:
        # 1) Validate ticker existence
        ticker_url = f"https://api.polygon.io/v3/reference/tickers/{symbol.upper()}?apiKey={POLYGON_API_KEY}"
        ticker_res = requests.get(ticker_url)
        if ticker_res.status_code != 200 or not ticker_res.json().get("results"):
            return False

        # 2) Fetch previous day OHLC to ensure data exists
        ohlc_url = (
            f"https://api.polygon.io/v2/aggs/ticker/{symbol.upper()}/prev"
            f"?adjusted=true&apiKey={POLYGON_API_KEY}"
        )
        ohlc_res = requests.get(ohlc_url)
        if ohlc_res.status_code != 200:
            return False
        ohlc_json = ohlc_res.json()
        if ohlc_json.get("resultsCount", 0) == 0:
            return False

        # 3) Ensure financials data exists
        financials_url = (
            f"https://api.polygon.io/vX/reference/financials?ticker={symbol.upper()}&limit=1&apiKey={POLYGON_API_KEY}"
        )
        financials_res = requests.get(financials_url)
        if financials_res.status_code != 200:
            return False
        financials_data = financials_res.json().get("results", [])
        if not financials_data:
            return False

        return True

    except Exception as e:
        print(f"🔍 Polygon validation error for {symbol}: {e}")
        return False

def get_overview_if_valid(symbol):
    """Fetch overview if symbol is valid using Polygon."""
    if not is_valid_symbol(symbol):
        msg = f"⛔ Skipped {symbol} (not found on Polygon or missing financials)"
        logging.info(msg)
        return None

    try:
        url = f"https://api.polygon.io/v3/reference/tickers/{symbol.upper()}?apiKey={POLYGON_API_KEY}"
        res = requests.get(url)
        data = res.json()
        if res.status_code == 200:
            result = data.get("results", {})
            name = result.get("name", "")
            msg = f"✅ Validated: {symbol} ({name})"
            logging.info(msg)
            return {"symbol": symbol, "name": name}
        else:
            msg = f"❌ Polygon lookup failed for {symbol}"
            logging.warning(msg)
    except Exception as e:
        msg = f"❌ Overview error for {symbol}: {e}"
        logging.error(msg)
    return None

def get_ticker_suggestions(query, limit=10):
    """Return a list of U.S. stock ticker symbol suggestions using Polygon's search endpoint,
    filtered to only include tickers with available financials data."""
    try:
        search_url = (
            f"https://api.polygon.io/v3/reference/tickers"
            f"?search={query}&limit={limit * 2}&market=stocks&active=true&locale=us&apiKey={POLYGON_API_KEY}"
        )
        search_res = requests.get(search_url)
        if search_res.status_code != 200:
            print(f"🔍 Search error: {search_res.status_code} - {search_res.text}")
            return []

        raw_results = search_res.json().get("results", [])
        valid_suggestions = []

        for r in raw_results:
            symbol = r.get("ticker")
            name = r.get("name", "")
            if not symbol:
                continue

            # Reject preferred stock suffixes or unsupported formats
            if any(c in symbol for c in ['^', '.', '/']) or len(symbol) > 5:
                continue

            ohlc_url = f"https://api.polygon.io/v2/aggs/ticker/{symbol.upper()}/prev?adjusted=true&apiKey={POLYGON_API_KEY}"
            ohlc_res = requests.get(ohlc_url)
            if ohlc_res.status_code == 200:
                ohlc_json = ohlc_res.json()
                if ohlc_json.get("resultsCount", 0) == 0:
                    continue
                valid_suggestions.append({"symbol": symbol, "name": name})

            if len(valid_suggestions) >= limit:
                break

        return valid_suggestions
    except Exception as e:
        print(f"🧠 Autocomplete error for query '{query}': {e}")
    return []

def convert_csv_to_cached_tickers():
    input_csv = "listing_status.csv"
    output_json = "cached_tickers.json"

    df = pd.read_csv(input_csv)
    filtered = df[df['status'] == 'Active']

    results = []

    for _, row in filtered.iterrows():
        symbol = str(row["symbol"]).strip().upper()

        if symbol and symbol != "nan":
            result = get_overview_if_valid(symbol)
            if result:
                results.append(result)

            time.sleep(0.85)  # respect API rate limits

    with open(output_json, "w") as f:
        json.dump(results, f, indent=2)

    summary = f"✅ Exported {len(results)} supported symbols (validated via Polygon) to {output_json}"
    logging.info(summary)

if __name__ == '__main__':
    convert_csv_to_cached_tickers()