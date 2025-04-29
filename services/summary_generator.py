import requests, os
import pickle
from cache.redis_client import redis_conn

def generate_ai_summary(info: dict) -> list:
    api_key = os.getenv("OPENROUTER_API_KEY")
    symbol = info.get("Symbol")
    cache_key = f"summary_{symbol}"
    cached_summary = redis_conn.get(cache_key)
    if cached_summary:
        try:
            summary = pickle.loads(cached_summary)
            if summary and isinstance(summary, list):
                print(f"✅ Loaded cached AI summary for {symbol}")
                return summary
        except Exception:
            print(f"⚠️ Failed to load cached summary for {symbol}, regenerating...")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    important_keys = ['MarketCapitalization', 'PERatio', 'ProfitMargin', 'Beta', 'Sector', 'Name']
    filled_keys = [k for k in important_keys if k in info and info[k]]
    is_thin_info = len(filled_keys) <= 2

    if is_thin_info:
        prompt = f"""
You are a financial assistant. Based on limited metadata about this company, provide a basic short stock summary (3-4 bullet points) about what the company likely does, its sector, and one simple investing consideration. Keep it simple and general.

Here is the partial stock info:
{info}
"""
    else:
        prompt = f"""
You are a professional stock market analyst. Given the detailed stock information below, produce a short, clean bullet point summary (4–5 points) for an investor.

Follow this structure:
- One line overview of the company's business.
- 1–2 financial strengths or risks (based on PE Ratio, Beta, Profit Margin, etc).
- Valuation or sentiment hint if any (based on data).
- 1–2 short investment considerations.

Always use bullet points, keep each under 2 lines. Do NOT add any other text.

Here is the stock data:
{info}
"""

    data = {
        "model": "anthropic/claude-3-opus",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5,
        "max_tokens": 400
    }

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        text = result["choices"][0]["message"]["content"]

        lines = [line.strip("-• ").strip() for line in text.strip().split("\n")]
        summary_list = [line for line in lines if line and len(line) < 250]
        if not summary_list:
            print(f"⚠️ AI returned empty or malformed summary list for {symbol}")
            return ["Summary unavailable."]

        redis_conn.set(cache_key, pickle.dumps(summary_list))
        return summary_list
    except requests.exceptions.HTTPError as err:
        print(f"HTTP Error: {err.response.status_code} - {err.response.text}")
    except Exception as e:
        print(f"Claude summary generation failed for {symbol}: {e}")

    return ["Summary unavailable."]