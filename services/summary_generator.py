import requests, os

def generate_ai_summary(info: dict) -> list:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return ["Summary unavailable."]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt = f"""
You are a financial assistant with strong research abilities. Given this dictionary of stock data, generate a short, clean bullet point summary (3–5 items) for an investor. If key financials are missing, use any available company name, sector, or metadata to infer what the company does and what an investor might care about.

Be specific if data is available, and general but insightful if not. Always return 3–5 bullet points. Keep each bullet point short—just one sentence or phrase.

Respond with only a list of bullet points.

Here is the stock data:
{info}
"""

    data = {
        "model": "anthropic/claude-3-opus",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 300
    }

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        text = result["choices"][0]["message"]["content"]
        return [line.strip("-• ").strip() for line in text.strip().split("\n") if line.strip()]
    except requests.exceptions.HTTPError as err:
        print(f"HTTP Error: {err.response.status_code} - {err.response.text}")
    except Exception as e:
        print(f"Claude summary generation failed: {e}")
    return ["Summary unavailable."]