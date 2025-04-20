import pandas as pd
import json
import requests
import time
import os
import random
from dotenv import load_dotenv
import logging

# Configure logger
logging.basicConfig(
    filename="ticker_validation.log",
    filemode="w",
    format="%(asctime)s - %(levelname)s - %(message)s",
    level=logging.INFO
)

load_dotenv()
ALPHAVANTAGE_API_KEY = os.getenv("ALPHAVANTAGE_API_KEY")

def is_valid_symbol(symbol):
    """Check if symbol is recognized by Alpha Vantage using SYMBOL_SEARCH."""
    try:
        url = f"https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={symbol}&apikey={ALPHAVANTAGE_API_KEY}"
        res = requests.get(url)
        data = res.json()
        if res.status_code == 200 and data.get("bestMatches"):
            return True
    except Exception as e:
        print(f"🔍 SYMBOL_SEARCH error for {symbol}: {e}")
    return False

def get_overview_if_valid(symbol, name):
    """Fetch OVERVIEW if symbol passes SYMBOL_SEARCH."""
    if not is_valid_symbol(symbol):
        msg = f"⛔ Skipped {symbol} (not found in SYMBOL_SEARCH)"
        print(msg)
        logging.info(msg)
        return None

    try:
        url = f"https://www.alphavantage.co/query?function=OVERVIEW&symbol={symbol}&apikey={ALPHAVANTAGE_API_KEY}"
        res = requests.get(url)
        data = res.json()
        if res.status_code == 200 and "Name" in data:
            msg = f"✅ Validated: {symbol}"
            print(msg)
            logging.info(msg)
            return {"symbol": symbol, "name": name}
        else:
            msg = f"❌ OVERVIEW invalid for {symbol}"
            print(msg)
            logging.warning(msg)
    except Exception as e:
        msg = f"❌ OVERVIEW error for {symbol}: {e}"
        print(msg)
        logging.error(msg)
    return None

def convert_csv_to_cached_tickers():
    input_csv = "listing_status.csv"
    output_json = "cached_tickers.json"

    df = pd.read_csv(input_csv)
    filtered = df[df['status'] == 'Active']

    results = []

    for _, row in filtered.iterrows():
        symbol = str(row["symbol"]).strip().upper()
        name = str(row["name"]).strip()

        if symbol and symbol != "nan":
            result = get_overview_if_valid(symbol, name)
            if result:
                results.append(result)

            time.sleep(0.85)  # respect Alpha Vantage rate limits

    with open(output_json, "w") as f:
        json.dump(results, f, indent=2)

    summary = f"✅ Exported {len(results)} supported symbols (validated via OVERVIEW) to {output_json}"
    print(summary)
    logging.info(summary)

if __name__ == '__main__':
    convert_csv_to_cached_tickers()