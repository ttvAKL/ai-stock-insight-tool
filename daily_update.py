import os
import json
import time
import pickle
from dotenv import load_dotenv, find_dotenv
from apscheduler.schedulers.blocking import BlockingScheduler
from services.summary_generator import generate_ai_summary
from services.financials import interpret_financials
from cache.redis_client import redis_conn
from services.websocket_listener import websocket_fetch_company_overview

load_dotenv(find_dotenv())

POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")

TICKER_FILE = "cached_tickers.json"
UPDATE_LOG = "last_update.log"

def fetch_stock_data(symbol):
    try:
        print(f"\n📈 Updating {symbol}...")

        overview = websocket_fetch_company_overview(symbol)

        if not overview:
            print(f"❌ Incomplete data for {symbol}. Skipping.")
            return None

        summary = generate_ai_summary(overview)
        fin_summary = interpret_financials(overview)

        category_tags = []
        if 'pays_dividends' in fin_summary:
            category_tags.append("Dividend Payers")
        if 'high_pe' in fin_summary or 'high_beta' in fin_summary:
            category_tags.append("Growth Picks")
        if 'low_beta' in fin_summary or 'low_pe' in fin_summary:
            category_tags.append("Blue Chips")

        response_data = {
            'symbol': symbol.upper(),
            'name': overview.get("name", "N/A"),
            'sector': overview.get("sic_description", "N/A"),
            'market_cap': int(overview.get("market_cap", 0)),
            'pe_ratio': overview.get("pe_ratio", None),
            'beta': overview.get("beta", None),
            'dividend_yield': overview.get("dividend_yield", None),
            'profit_margin': overview.get("profit_margin", None),
            'summary': summary,
            'categoryTags': category_tags,
            'source': 'recommended'
        }

        redis_conn.set(symbol, pickle.dumps(response_data))
        return True

    except Exception as e:
        print(f"Error updating {symbol}: {e}")
        return False

def update_all_tickers():
    print("\n📅 Starting monthly update job (AI summaries and metadata)...")

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
        f.write(f"Last monthly update: {time.ctime()}\nUpdated {count} tickers.")

    print(f"\n✅ Monthly update complete. Updated {count} tickers.")

# Schedule job to run monthly on the 1st at 00:00
scheduler = BlockingScheduler()
scheduler.add_job(update_all_tickers, 'cron', day=1, hour=0, minute=0)

if __name__ == "__main__":
    print("🕓 Scheduler started. Monthly job scheduled for 00:00 on day 1.")
    scheduler.start()