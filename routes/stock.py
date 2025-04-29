import redis
from flask import Blueprint, jsonify, request
import requests, time, pickle, os
from dotenv import load_dotenv
from services.summary_generator import generate_ai_summary
from services.financials import interpret_financials

redis_conn = redis.Redis(host='localhost', port=6379, db=0)

load_dotenv()

stock_bp = Blueprint('stock', __name__, url_prefix='/api/stock')
ALPHAVANTAGE_API_KEY = os.getenv("ALPHAVANTAGE_API_KEY")

@stock_bp.route('/<symbol>', defaults={'range_param': '1mo'}, methods=['GET'])
@stock_bp.route('/<symbol>/<range_param>', methods=['GET'])
def get_stock_data(symbol, range_param):
    try:
        cache_key = f"{symbol}_{range_param}"
        if range_param == "1mo":
            cached = redis_conn.get(cache_key)
            if cached:
                print(f"✅ Redis cache hit for {symbol} [{range_param}]")
                return jsonify(pickle.loads(cached))

        print(f"📡 Fetching Alpha Vantage data for {symbol} [{range_param}]")

        overview_url = f"https://www.alphavantage.co/query?function=OVERVIEW&symbol={symbol}&apikey={ALPHAVANTAGE_API_KEY}"

        config = {
            '1d': {"function": "TIME_SERIES_INTRADAY", "interval": "5min", "outputsize": "compact"},
            '5d': {"function": "TIME_SERIES_INTRADAY", "interval": "15min", "outputsize": "compact"},
            '1mo': {"function": "TIME_SERIES_DAILY_ADJUSTED", "interval": None, "outputsize": "compact"},
            '6mo': {"function": "TIME_SERIES_DAILY_ADJUSTED", "interval": None, "outputsize": "full"},
            '1y': {"function": "TIME_SERIES_WEEKLY", "interval": None, "outputsize": "full"},
        }.get(range_param, {"function": "TIME_SERIES_DAILY_ADJUSTED", "interval": None, "outputsize": "compact"})

        function = config["function"]
        interval = config["interval"]
        outputsize = config["outputsize"]

        if function == "TIME_SERIES_INTRADAY":
            price_url = f"https://www.alphavantage.co/query?function={function}&symbol={symbol}&interval={interval}&outputsize={outputsize}&apikey={ALPHAVANTAGE_API_KEY}"
        else:
            price_url = f"https://www.alphavantage.co/query?function={function}&symbol={symbol}&outputsize={outputsize}&apikey={ALPHAVANTAGE_API_KEY}"

        overview_res = requests.get(overview_url)
        price_res = requests.get(price_url)
        overview = overview_res.json()
        prices = price_res.json()

        for data, label in [(overview, "Overview"), (prices, "Prices")]:
            if any(k in data for k in ["Note", "Error Message", "Information"]):
                print(f"🚫 Alpha Vantage error for {symbol} in {label}: {data}")
                return jsonify({'error': f'Alpha Vantage error for {symbol}: {data}'}), 502

        time_series_keys = {
            "TIME_SERIES_INTRADAY": f"Time Series ({interval})",
            "TIME_SERIES_DAILY_ADJUSTED": "Time Series (Daily)",
            "TIME_SERIES_WEEKLY": "Weekly Time Series",
        }
        time_series_key = time_series_keys.get(function, "Time Series (Daily)")

        time_series = prices.get(time_series_key)
        if not overview or not time_series or "Name" not in overview:
            return jsonify({'error': f'No data found for symbol: {symbol}'}), 404

        sorted_dates = sorted(time_series.keys())
        history = [{"date": d, "close": round(float(time_series[d]["4. close"]), 2)} for d in sorted_dates]
        latest_date = sorted_dates[0]
        latest_data = time_series[latest_date]

        summary = generate_ai_summary(overview)
        response_data = {'ai_summary': summary}
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

        response_data.update({
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
            'categoryTags': category_tags,
            'history': history
        })

        if range_param == "1mo":
            response_data["history"] = sorted(response_data["history"], key=lambda x: x["date"])
            if summary:  # Only cache if summary is non-empty
                redis_conn.set(cache_key, pickle.dumps(response_data))

        return jsonify(response_data)

    except Exception as e:
        print(f"Error in get_stock_data: {e}")
        return jsonify({'error': f'Error fetching data for {symbol}'}), 500