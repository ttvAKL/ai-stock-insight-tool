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

ALPHAVANTAGE_API_KEY = os.getenv("ALPHAVANTAGE_API_KEY")

TICKER_FILE = "cached_tickers.json"
UPDATE_LOG = "last_update.log"

def fetch_stock_data(symbol):
    try:
        print(f"\n📈 Updating {symbol}...")

        overview_url = f"https://www.alphavantage.co/query?function=OVERVIEW&symbol={symbol}&apikey={ALPHAVANTAGE_API_KEY}"
        price_url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol={symbol}&outputsize=compact&apikey={ALPHAVANTAGE_API_KEY}"

        overview_res = requests.get(overview_url)
        price_res = requests.get(price_url)
        overview = overview_res.json()
        prices = price_res.json()

        # Check for API errors
        for data, label in [(overview, "Overview"), (prices, "Prices")]:
            if any(key in data for key in ["Note", "Error Message", "Information"]):
                print(f"⚠️ Skipping {symbol} due to API error in {label}: {data}")
                return None

        time_series = prices.get("Time Series (Daily)")
        if not overview or not time_series or "Name" not in overview:
            print(f"❌ Incomplete data for {symbol}. Skipping.")
            return None

        sorted_dates = sorted(time_series.keys(), reverse=True)
        latest_date = sorted_dates[0]
        latest_data = time_series[latest_date]

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
            {"date": d, "close": round(float(time_series[d]["4. close"]), 2)}
            for d in sorted_dates
        ]

        response_data = {
            'symbol': symbol.upper(),
            'date': latest_date,
            'open': round(float(latest_data.get("1. open", 0)), 2),
            'high': round(float(latest_data.get("2. high", 0)), 2),
            'low': round(float(latest_data.get("3. low", 0)), 2),
            'close': round(float(latest_data.get("4. close", 0)), 2),
            'volume': int(float(latest_data.get("6. volume", 0))),
            'name': overview.get('Name', 'N/A'),
            'sector': overview.get('Sector', 'N/A'),
            'market_cap': int(overview.get('MarketCapitalization', 0)),
            'pe_ratio': overview.get('PERatio', None),
            'beta': overview.get('Beta', None),
            'dividend_yield': overview.get('DividendYield', None),
            'profit_margin': overview.get('ProfitMargin', None),
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