from flask import Blueprint, jsonify, request
from services.summary_generator import generate_ai_summary
from services.financials import interpret_financials
from cache.redis_client import redis_conn
import requests, time, pickle
import os
import json

from dotenv import load_dotenv
load_dotenv()

stock_bp = Blueprint('stock', __name__, url_prefix='/api/stock')
ALPHAVANTAGE_API_KEY = os.getenv("ALPHAVANTAGE_API_KEY")

@stock_bp.route('/<symbol>', methods=['GET'])
def get_stock_data(symbol):
    try:
        cached = redis_conn.get(symbol)
        if cached:
            print(f"✅ Redis cache hit for {symbol}")
            return jsonify(pickle.loads(cached))

        print(f"📡 Fetching from Alpha Vantage: {symbol}")
        overview_url = f"https://www.alphavantage.co/query?function=OVERVIEW&symbol={symbol}&apikey={ALPHAVANTAGE_API_KEY}"
        price_url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol={symbol}&outputsize=compact&apikey={ALPHAVANTAGE_API_KEY}"

        overview_res = requests.get(overview_url)
        price_res = requests.get(price_url)
        overview = overview_res.json()
        prices = price_res.json()

        # Alpha Vantage error messages
        for data, label in [(overview, "Overview"), (prices, "Prices")]:
            if any(key in data for key in ["Note", "Error Message", "Information"]):
                print(f"🚫 Alpha Vantage returned an error for {symbol} in {label}: {data}")
                return jsonify({'error': f'Alpha Vantage error for {symbol}: {data}'}), 502

        time_series = prices.get("Time Series (Daily)")
        if not overview or not time_series or "Name" not in overview:
            return jsonify({'error': f'No data found for symbol: {symbol}'}), 404

        sorted_dates = sorted(time_series.keys(), reverse=True)
        latest_date = sorted_dates[0]
        latest_data = time_series[latest_date]

        summary = generate_ai_summary(overview)
        fin_summary = interpret_financials(overview)

        category_tags = []
        if 'pays_dividends' in fin_summary:
            category_tags.append("Dividend Lovers")
        if 'high_pe' in fin_summary or 'high_beta' in fin_summary:
            category_tags.append("High Growth")
        if 'low_beta' in fin_summary or 'low_pe' in fin_summary:
            category_tags.append("Safe Picks")

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
        }

        redis_conn.set(symbol, pickle.dumps(response_data))
        time.sleep(0.4)
        return jsonify(response_data)

    except Exception as e:
        print(f"Error in get_stock_data: {e}")
        return jsonify({'error': f'Error fetching data for {symbol}'}), 500