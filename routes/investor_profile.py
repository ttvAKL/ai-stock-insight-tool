from flask import Blueprint, request, jsonify
import requests
import os
from flask_cors import cross_origin

profile_bp = Blueprint("investor_profile", __name__)

INVESTOR_TYPES = [
    "Growth Seeker",
    "Cautious Planner",
    "Dividend Hunter",
    "Balanced Optimizer",
    "Speculative Adventurer"
]

@profile_bp.route("/api/investor-profile", methods=["POST", "OPTIONS"])
@cross_origin(origins="money-mind.org", supports_credentials=True)
def classify_investor():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json()
    answers = data.get("answers")

    if not answers or len(answers) != 5:
        return jsonify({"error": "Invalid quiz data"}), 400

    # Build AI prompt
    question_context = [
        "Q1: How comfortable are you with losing money in the short term for potential long-term gains?",
        "Q2: How important is a steady stream of income from your investments?",
        "Q3: How much do you care about investing in emerging technologies or startups?",
        "Q4: How would you rate your reaction to market volatility?",
        "Q5: How long do you typically plan to hold investments?"
    ]
    formatted = "\n".join([f"{question_context[i]} Answer: {answers[i]}" for i in range(5)])
    prompt = f"""
You are a financial AI assistant. Based on the user's quiz answers (rated 1 to 5), determine their investor profile and return a detailed JSON object.

Available profile types: {', '.join(INVESTOR_TYPES)}.

For the answers:
{formatted}

Respond ONLY with a JSON object formatted like this:

{{
  "type": "<Investor Type from list>",
  "type_description": "<Brief explanation of their type>",
  "recommended_stocks": ["<SYM1>", "<SYM2>", "<SYM3>"],  # must be popular ETFs with reliable market data from Polygon.io
  "stock_rationale": "<Why these ETFs are good for them>",
  "tips": "<Optional advice or portfolio guidance>"
}}

Important: The recommended_stocks list must include only ETFs that are supported by Polygon.io and have viable financials available from them. 
"""

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json"
            },
            json={
                "model": "anthropic/claude-3-sonnet",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 500
            }
        )

        if response.status_code != 200:
            print("[OpenRouter Error]", response.text)
            return jsonify({"error": "AI processing failed"}), 500

        content = response.json()["choices"][0]["message"]["content"].strip()
        parsed = eval(content) if content.startswith("{") else {}
        if not parsed.get("type") or parsed["type"] not in INVESTOR_TYPES:
            return jsonify({"error": "Invalid classification"}), 400

        return jsonify(parsed)
    except Exception as e:
        print("[OpenRouter Error]", e)
        return jsonify({"error": "AI processing failed"}), 500