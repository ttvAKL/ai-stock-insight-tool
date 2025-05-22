import requests
from flask import Blueprint, jsonify, request
import os

from redis.exceptions import ConnectionError as RedisConnectionError

from dotenv import load_dotenv, find_dotenv
from services.summary_generator import generate_ai_summary
from services.financials import interpret_financials
from services.ticker_utils import get_ticker_suggestions
from services.yahoo_client import fetch_yahoo_quote_json
import yfinance as yf
from datetime import datetime
from functools import lru_cache

load_dotenv(find_dotenv())


stock_bp = Blueprint('stock', __name__, url_prefix='/api/stock')

@lru_cache(maxsize=128)
def fetch_yf_info(symbol: str) -> dict:
    """
    Cached lookup of ticker.info via yfinance for faster repeated calls.
    """
    return {}

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
            return "-"

    try:
        POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")

        ohlc_url = f"https://api.polygon.io/v2/aggs/ticker/{symbol.upper()}/prev?adjusted=true&apiKey={POLYGON_API_KEY}"
        ohlc_res = requests.get(ohlc_url)
        ohlc_data = ohlc_res.json().get("results", [{}])[0]

        open_price = ohlc_data.get("o", "-")
        high_price = ohlc_data.get("h", "-")
        low_price = ohlc_data.get("l", "-")
        close_price = ohlc_data.get("c", "-")
        volume = ohlc_data.get("v", "-")

        # Fetch Yahoo Finance overview metrics
        try:
            yahoo_overview = fetch_yahoo_quote_json(symbol.upper())
        except Exception as e:
            print(f"[stock] Yahoo overview fetch failed for {symbol}: {e}")
            yahoo_overview = {}
        
        try:
            tk_info = yf.Ticker(symbol.upper()).info or {}
        except Exception as e:
            print(f"[stock] yfinance info fetch failed for {symbol}: {e}")
            tk_info = {}

        # Determine if ETF and set sector accordingly
        is_etf = tk_info.get('quoteType') == 'ETF'
        sector_value = 'ETF' if is_etf else tk_info.get('sector', '-')

        # Generate AI summary, but handle Redis connection issues gracefully
        try:
            summary = generate_ai_summary(yahoo_overview, symbol)
        except RedisConnectionError as e:
            print(f"[stock] Redis connection unavailable for summary: {e}")
            summary = ""
        except Exception as e:
            print(f"[stock] summary generation error: {e}")
            summary = ""

        # Interpret financials, handle Redis issues
        try:
            fin_summary = interpret_financials(yahoo_overview)
        except RedisConnectionError as e:
            print(f"[stock] Redis connection unavailable for financial interpretation: {e}")
            fin_summary = []
        except Exception as e:
            print(f"[stock] financial interpretation error: {e}")
            fin_summary = []

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
            "name": tk_info.get("longName", symbol.upper()),
            "sector": sector_value,
            "market_cap": tk_info.get("marketCap", "-"),
            "pe_ratio": tk_info.get("trailingPE", "-"),
            "ai_summary": summary,
            "categoryTags": category_tags,
            "news": news,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": format_large_number(volume),
            "change": (
                round(close_price - open_price, 2)
                if isinstance(open_price, (int, float)) and isinstance(close_price, (int, float))
                else "-"
            ),
            "percent_change": (
                f"{round(((close_price - open_price) / open_price) * 100, 2)}%"
                if isinstance(open_price, (int, float)) and open_price != 0 and isinstance(close_price, (int, float))
                else "-"
            ),
            # Merge Yahoo overview fields into the response
            **yahoo_overview,
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
