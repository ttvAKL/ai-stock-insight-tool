import requests, os
import redis
import pickle
from cache.redis_client import redis_conn
from dotenv import load_dotenv, find_dotenv
from redis.exceptions import ConnectionError as RedisConnectionError

try:
    redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)
    redis_client.ping()
except Exception as e:
    print(f"[summary_generator] Redis unavailable during init: {e}")
    redis_client = None

load_dotenv(find_dotenv())

def generate_ai_summary(info: dict, symbol) -> list:
    api_key = os.getenv("OPENROUTER_API_KEY")
    cache_key = f"summary_{symbol}"
    try:
        cached_summary = redis_client.get(cache_key)
    except RedisConnectionError as e:
        print(f"[summary_generator] Redis connection unavailable for get: {e}")
        cached_summary = None
    if cached_summary:
        print(f"[summary_generator] Loaded cached summary for {symbol}")
        try:
            summary = pickle.loads(cached_summary)
            if summary and isinstance(summary, list):
                return summary
        except Exception:
            print(f"⚠️ Failed to load cached summary for {symbol}, regenerating...")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Referer": "http://localhost",
        "HTTP-Referer": "http://localhost"
    }

    prompt = f"""
You are a professional stock market analyst. Given the detailed stock information below, produce a short, clean bullet point summary (4–5 points) for an investor.

Follow this structure:
- 1–2 financial strengths or risks (based on available metrics).
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

        try:
            print(f"[summary_generator] Caching summary for {symbol}")
            redis_client.set(cache_key, pickle.dumps(summary_list))
        except RedisConnectionError as e:
            print(f"[summary_generator] Redis connection unavailable for set: {e}")
        print(f"[summary_generator] Returning new summary for {symbol}")
        return summary_list
    except requests.exceptions.HTTPError as err:
        print(f"HTTP Error: {err.response.status_code} - {err.response.text}")
    except Exception as e:
        print(f"Claude summary generation failed for {symbol}: {e}")

    return ["Summary unavailable."]