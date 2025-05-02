import os
import json
import time
import pickle
import requests
from dotenv import load_dotenv
from apscheduler.schedulers.blocking import BlockingScheduler
from services.summary_generator import generate_ai_summary
from services.financials import interpret_financials
from cache.redis_client import redis_conn

load_dotenv()

POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")

TICKER_FILE = "cached_tickers.json"
UPDATE_LOG = "last_update.log"

def fetch_stock_data(symbol):
    try:
        print(f"\n📈 Updating {symbol}...")

        polygon_key = os.getenv("POLYGON_API_KEY")
        headers = {"Authorization": f"Bearer {polygon_key}"}

        # Company info
        overview_url = f"https://api.polygon.io/v3/reference/tickers/{symbol}?apiKey={polygon_key}"
        overview_res = requests.get(overview_url, headers=headers)
        overview = overview_res.json().get("results", {})

        # Price history
        now = int(time.time())
        thirty_days_ago = now - 60 * 60 * 24 * 30
        price_url = f"https://api.polygon.io/v2/aggs/ticker/{symbol}/range/1/day/{thirty_days_ago * 1000}/{now * 1000}?adjusted=true&sort=asc&apiKey={polygon_key}"
        price_res = requests.get(price_url, headers=headers)
        price_json = price_res.json()

        if "results" not in price_json or not overview:
            print(f"❌ Incomplete data for {symbol}. Skipping.")
            return None

        prices = price_json["results"]
        if not prices:
            print(f"❌ No price data for {symbol}. Skipping.")
            return None

        latest_data = prices[-1]
        latest_date = time.strftime('%Y-%m-%d', time.gmtime(latest_data["t"] / 1000))

        summary = generate_ai_summary(overview)
        fin_summary = interpret_financials(overview)

        category_tags = []
        if 'pays_dividends' in fin_summary:
            category_tags.append("Dividend Payers")
        if 'high_pe' in fin_summary or 'high_beta' in fin_summary:
            category_tags.append("Growth Picks")
        if 'low_beta' in fin_summary or 'low_pe' in fin_summary:
            category_tags.append("Blue Chips")

        history = [
            {
                "date": time.strftime('%Y-%m-%d', time.gmtime(item["t"] / 1000)),
                "close": round(item["c"], 2)
            }
            for item in prices
        ]

        response_data = {
            'symbol': symbol.upper(),
            'date': latest_date,
            'open': round(latest_data["o"], 2),
            'high': round(latest_data["h"], 2),
            'low': round(latest_data["l"], 2),
            'close': round(latest_data["c"], 2),
            'volume': int(latest_data["v"]),
            'name': overview.get("name", "N/A"),
            'sector': overview.get("sic_description", "N/A"),
            'market_cap': int(overview.get("market_cap", 0)),
            'pe_ratio': overview.get("pe_ratio", None),
            'beta': overview.get("beta", None),
            'dividend_yield': overview.get("dividend_yield", None),
            'profit_margin': overview.get("profit_margin", None),
            'summary': summary,
            'categoryTags': category_tags,
            'history': history,
            'source': 'recommended'
        }

        redis_conn.set(symbol, pickle.dumps(response_data))
        return True

    except Exception as e:
        print(f"Error updating {symbol}: {e}")
        return False

def update_all_tickers():
    print("\n Starting daily update job...")

    if not os.path.exists(TICKER_FILE):
        print(f"❌ Ticker file not found: {TICKER_FILE}")
        return

    with open(TICKER_FILE, "r") as f:
        tickers = json.load(f)

    count = 0
    for entry in tickers:
        symbol = entry["symbol"].upper()
        if fetch_stock_data(symbol):
            count += 1
            time.sleep(0.75)  # ~80 requests/min safety buffer

    with open(UPDATE_LOG, "w") as f:
        f.write(f"Last update: {time.ctime()}\nUpdated {count} tickers.")

    print(f"\n✅ Daily update complete. Updated {count} tickers.")

# Schedule job to run daily at 00:00
scheduler = BlockingScheduler()
scheduler.add_job(update_all_tickers, 'cron', hour=0, minute=0)

if __name__ == "__main__":
    print("🕓 Scheduler started. Daily job scheduled for 00:00.")
    scheduler.start()