import redis
from flask import Blueprint, jsonify, request
import requests, os
from dotenv import load_dotenv, find_dotenv
from services.summary_generator import generate_ai_summary
from services.financials import interpret_financials
from services.ticker_utils import get_ticker_suggestions
from datetime import datetime, timedelta

load_dotenv(find_dotenv())

redis_conn = redis.Redis(host='localhost', port=6379, db=0)

stock_bp = Blueprint('stock', __name__, url_prefix='/api/stock')


def fetch_polygon_news(ticker):
    api_key = os.getenv("POLYGON_API_KEY")
    url = f"https://api.polygon.io/v2/reference/news?ticker={ticker}&limit=5&order=desc&apiKey={api_key}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        news_data = response.json().get("results", [])
        cleaned_news = []
        for item in news_data:
            cleaned_news.append({
                "title": item.get("title", "Untitled"),
                "summary": item.get("description", "No summary available."),
                "url": item.get("article_url", "#"),
                "sentiment": "Neutral"
            })
        return cleaned_news
    except Exception as e:
        print(f"❌ Failed to fetch news: {e}")
        return []

@stock_bp.route('/<symbol>', methods=['GET'])
def get_stock_data(symbol):
    def format_large_number(num):
        try:
            num = float(num)
            for unit in ['', 'K', 'M', 'B', 'T']:
                if abs(num) < 1000.0:
                    return f"{num:.1f} {unit}".strip()
                num /= 1000.0
            return f"{num:.1f} P"
        except:
            return num

    try:
        print(f"🪪 Requested symbol: {symbol}")
        POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")

        ohlc_url = f"https://api.polygon.io/v2/aggs/ticker/{symbol.upper()}/prev?adjusted=true&apiKey={POLYGON_API_KEY}"
        ohlc_res = requests.get(ohlc_url)
        ohlc_data = ohlc_res.json().get("results", [{}])[0]

        open_price = ohlc_data.get("o", "N/A")
        high_price = ohlc_data.get("h", "N/A")
        low_price = ohlc_data.get("l", "N/A")
        close_price = ohlc_data.get("c", "N/A")
        volume = ohlc_data.get("v", "N/A")

        financials_url = f"https://api.polygon.io/vX/reference/financials?ticker={symbol.upper()}&limit=1&apiKey={POLYGON_API_KEY}"
        financials_res = requests.get(financials_url)
        financials_data = financials_res.json().get("results", [])

        eps = None

        ref_url = f"https://api.polygon.io/v3/reference/tickers/{symbol.upper()}?apiKey={POLYGON_API_KEY}"
        ref_res = requests.get(ref_url)
        ref_data = ref_res.json().get("results", {})

        overview = {
            "Name": ref_data.get("name", symbol.upper()),
            "Symbol": symbol.upper(),
            "Sector": ref_data.get("sic_description", "N/A"),
            "MarketCapitalization": "N/A",
            "PERatio": "N/A",
            "EPS": eps or "N/A",
            "ProfitMargin": "N/A"
        }

        revenue = None
        net_income = None

        if financials_data:
            report = financials_data[0]
            fundamentals = report.get("financials", {})
            income = fundamentals.get("income_statement", {})
            balance = fundamentals.get("balance_sheet", {})
            metrics = report.get("market_data", {})

            revenue = income.get("revenues", {}).get("value")
            net_income = income.get("net_income_loss", {}).get("value")
            eps = income.get("diluted_earnings_per_share", {}).get("value") or income.get("basic_earnings_per_share", {}).get("value")
            market_cap = ref_data.get("market_cap")

            if not market_cap and close_price and income.get("diluted_average_shares", {}).get("value"):
                shares = income.get("diluted_average_shares", {}).get("value")
                market_cap = close_price * shares

            pe_ratio = round(market_cap / net_income, 1) if market_cap and net_income else "N/A"

            overview.update({
                "MarketCapitalization": format_large_number(market_cap),
                "PERatio": pe_ratio,
                "ProfitMargin": f"{round(net_income / revenue * 100, 1)}%" if revenue and net_income else "N/A",
                "EPS": eps or "N/A"
            })
        else:
            print(f"[DEBUG] No financials data found for {symbol}")

        overview["PERatio"] = overview["PERatio"] if isinstance(overview["PERatio"], str) else round(overview["PERatio"], 1)

        summary = generate_ai_summary(overview)
        fin_summary = interpret_financials(overview)

        category_tags = []
        if 'pays_dividends' in fin_summary:
            category_tags.append("Dividend Lovers")
        if 'high_pe' in fin_summary or 'high_beta' in fin_summary:
            category_tags.append("High Growth")
        if 'low_beta' in fin_summary or 'low_pe' in fin_summary:
            category_tags.append("Safe Picks")

        news = fetch_polygon_news(symbol)

        response_data = {
            "symbol": symbol.upper(),
            "name": overview["Name"],
            "sector": overview["Sector"],
            "market_cap": overview["MarketCapitalization"],
            "pe_ratio": overview["PERatio"],
            "eps": overview["EPS"],
            "profit_margin": overview["ProfitMargin"],
            "ai_summary": summary,
            "categoryTags": category_tags,
            "description": ref_data.get("description", "N/A"),
            "revenue": format_large_number(revenue),
            "net_income": format_large_number(net_income),
            "news": news,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": format_large_number(volume),
            "change": round(close_price - open_price, 2) if isinstance(open_price, (int, float)) and isinstance(close_price, (int, float)) else "N/A",
            "percent_change": f"{round(((close_price - open_price) / open_price) * 100, 2)}%" if isinstance(open_price, (int, float)) and open_price != 0 else "N/A",
        }

        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error in get_stock_data: {e}")
        return jsonify({"error": f"Error fetching data for {symbol}"}), 500

@stock_bp.route('/suggest')
def suggest_tickers():
    query = request.args.get("q", "")
    if not query:
        return jsonify([])

    try:
        results = get_ticker_suggestions(query)
        return jsonify(results)
    except Exception as e:
        print(f"[ERROR] Suggestion error: {e}")
        return jsonify([]), 500

@stock_bp.route('/<symbol>/history')
def get_historical_data(symbol):
    try:
        POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")
        granularity = request.args.get("granularity", "1min")

        from services.historical import fetch_polygon_history

        from_time = request.args.get("from")
        to_time = request.args.get("to")

        from_dt = datetime.fromisoformat(from_time) if from_time else None
        to_dt = datetime.fromisoformat(to_time) if to_time else None

        results = fetch_polygon_history(symbol, granularity, from_dt, to_dt)

        return jsonify(results)
    except Exception as e:
        print(f"Error in get_historical_data: {e}")
        return jsonify({"error": f"Error fetching historical data for {symbol}"}), 500
