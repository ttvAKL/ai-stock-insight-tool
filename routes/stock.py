import requests
from flask import Blueprint, jsonify, request
import os

from dotenv import load_dotenv, find_dotenv
from services.summary_generator import generate_ai_summary
from services.financials import interpret_financials
from services.ticker_utils import get_ticker_suggestions
from datetime import datetime
import yfinance as yf
from functools import lru_cache

load_dotenv(find_dotenv())


stock_bp = Blueprint('stock', __name__, url_prefix='/api/stock')

@lru_cache(maxsize=128)
def fetch_yf_info(symbol: str) -> dict:
    """
    Cached lookup of ticker.info via yfinance for faster repeated calls.
    """
    return yf.Ticker(symbol).info or {}

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
        POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")

        ohlc_url = f"https://api.polygon.io/v2/aggs/ticker/{symbol.upper()}/prev?adjusted=true&apiKey={POLYGON_API_KEY}"
        ohlc_res = requests.get(ohlc_url)
        ohlc_data = ohlc_res.json().get("results", [{}])[0]

        open_price = ohlc_data.get("o", "N/A")
        high_price = ohlc_data.get("h", "N/A")
        low_price = ohlc_data.get("l", "N/A")
        close_price = ohlc_data.get("c", "N/A")
        volume = ohlc_data.get("v", "N/A")

        # Fetch fundamentals via yfinance
        try:
            info = fetch_yf_info(symbol.upper())
            # Determine sector: ETF or company sector
            quote_type = info.get("quoteType", "").upper()
            sector = "ETF" if quote_type == "ETF" else info.get("sector", "N/A")
            # Base overview
            overview = {
                "Name": info.get("longName", symbol.upper()),
                "Symbol": symbol.upper(),
                "Sector": sector,
                "MarketCapitalization": info.get("marketCap", "N/A"),
                "PERatio": info.get("trailingPE", "N/A"),
                "EPS": info.get("trailingEps", "N/A"),
                "DividendYield": info.get("dividendYield", "N/A"),
            }
            # Add revenue and net income for companies
            if quote_type != "ETF":
                try:
                    fin_df = yf.Ticker(symbol.upper()).financials
                    overview["revenue"] = (
                        fin_df.loc["Total Revenue"].iloc[0]
                        if "Total Revenue" in fin_df.index else "N/A"
                    )
                    overview["net_income"] = (
                        fin_df.loc["Net Income"].iloc[0]
                        if "Net Income" in fin_df.index else "N/A"
                    )
                except Exception:
                    overview["revenue"] = "N/A"
                    overview["net_income"] = "N/A"
            else:
                overview["revenue"] = "N/A"
                overview["net_income"] = "N/A"
        except Exception as e:
            print(f"[stock] yfinance lookup failed for {symbol}: {e}")
            overview = {
                "Name": symbol.upper(),
                "Symbol": symbol.upper(),
                "Sector": "ETF" if symbol.upper().endswith("X") else "N/A",
                "MarketCapitalization": "N/A",
                "PERatio": "N/A",
                "EPS": "N/A",
                "DividendYield": "N/A",
                "revenue": "N/A",
                "net_income": "N/A",
            }

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
            "ai_summary": summary,
            "categoryTags": category_tags,
            "news": news,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": format_large_number(volume),
            "change": round(close_price - open_price, 2) if isinstance(open_price, (int, float)) and isinstance(close_price, (int, float)) else "N/A",
            "percent_change": f"{round(((close_price - open_price) / open_price) * 100, 2)}%" if isinstance(open_price, (int, float)) and open_price != 0 else "N/A",
            "revenue": overview.get("revenue"),
            "net_income": overview.get("net_income"),
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
