import redis
from flask import Blueprint, jsonify, request
import requests, os
from dotenv import load_dotenv; load_dotenv()
from services.summary_generator import generate_ai_summary
from services.financials import interpret_financials
from datetime import datetime, timedelta

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

@stock_bp.route('/<symbol>', defaults={'range_param': '1mo'}, methods=['GET'])
@stock_bp.route('/<symbol>/<range_param>', methods=['GET'])
def get_stock_data(symbol, range_param):
    try:
        print(f"🪪 Requested symbol: {symbol}")
        POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")
        base_url = "https://api.polygon.io"
        
        now = datetime.utcnow()

        granularity_map = {
            "1d": (5, "minute", 1),
            "5d": (15, "minute", 5),
            "1mo": (30, "minute", 30),
            "6mo": (1, "day", 180),
            "1y": (1, "day", 365),
            "5y": (1, "week", 1825)
        }
        multiplier, timespan, days = granularity_map.get(range_param, (1, "day", 30))

        from_date = (now - timedelta(days=days)).strftime("%Y-%m-%d")
        to_date = now.strftime("%Y-%m-%d")
        
        price_url = f"{base_url}/v2/aggs/ticker/{symbol.upper()}/range/{multiplier}/{timespan}/{from_date}/{to_date}?adjusted=true&sort=asc&limit=50000&apiKey={POLYGON_API_KEY}"
        price_res = requests.get(price_url)
        price_data = price_res.json()

        if "results" not in price_data:
            return jsonify({"error": f"No price data found for {symbol}"}), 404

        results = price_data["results"]
        history = [
            {
                "time": int(entry["t"] / 1000),
                "open": round(entry["o"], 2),
                "high": round(entry["h"], 2),
                "low": round(entry["l"], 2),
                "close": round(entry["c"], 2)
            }
            for entry in results
        ]

        latest_entry = results[-1]
        latest_date = datetime.utcfromtimestamp(latest_entry["t"] / 1000).strftime("%Y-%m-%d")
        
        fundamentals_url = f"https://api.polygon.io/v3/reference/tickers/{symbol.upper()}?apiKey={POLYGON_API_KEY}"
        fund_res = requests.get(fundamentals_url)
        fund_data = fund_res.json().get("results", {})
        metrics = fund_data.get("metrics", {})

        overview = {
            "Name": fund_data.get("name", symbol.upper()),
            "Symbol": symbol.upper(),
            "Sector": fund_data.get("sic_description", "N/A"),
            "MarketCapitalization": fund_data.get("market_cap", 0),
            "PERatio": metrics.get("pe_ratio", "N/A"),
            "Beta": metrics.get("beta", "N/A"),
            "DividendYield": metrics.get("dividend_yield", "N/A"),
            "ProfitMargin": metrics.get("profit_margin", "N/A")
        }

        # Fetch additional financial metrics
        financials_url = f"https://api.polygon.io/vX/reference/financials?ticker={symbol.upper()}&limit=1&apiKey={POLYGON_API_KEY}"
        financials_res = requests.get(financials_url)
        financials_data = financials_res.json().get("results", [])

        description = fund_data.get("description", "N/A")
        revenue = None
        net_income = None
        eps = None

        if financials_data:
            financials = financials_data[0].get("financials", {})
            income = financials.get("income_statement", {})

            try:
                eps = income.get("diluted_earnings_per_share", {}).get("value") or income.get("basic_earnings_per_share", {}).get("value")
                dividend = income.get("common_stock_dividends", {}).get("value")

                latest_price = latest_entry["c"]
                overview["PERatio"] = round(latest_price / eps, 2) if eps else "N/A"
                overview["DividendYield"] = round(dividend / latest_price, 4) if dividend else "N/A"

                revenue = income.get("revenues", {}).get("value")
                net_income = income.get("net_income_loss", {}).get("value")
            except Exception as e:
                print(f"⚠️ Failed to calculate PE ratio or dividend yield: {e}")
        
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
            "date": latest_date,
            "open": round(latest_entry["o"], 2),
            "high": round(latest_entry["h"], 2),
            "low": round(latest_entry["l"], 2),
            "close": round(latest_entry["c"], 2),
            "volume": latest_entry["v"],
            "name": overview["Name"],
            "sector": overview["Sector"],
            "market_cap": overview["MarketCapitalization"],
            "pe_ratio": overview["PERatio"],
            "beta": overview["Beta"],
            "dividend_yield": overview["DividendYield"],
            "profit_margin": overview["ProfitMargin"],
            "ai_summary": summary,
            "categoryTags": category_tags,
            "history": history,
            "description": description,
            "revenue": revenue,
            "net_income": net_income,
            "eps": eps,
            "news": news
        }

        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error in get_stock_data: {e}")
        return jsonify({"error": f"Error fetching data for {symbol}"}), 500