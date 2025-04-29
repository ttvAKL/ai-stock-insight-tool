from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import threading
from redis import Redis
from rq import Queue
from jobs.tasks import fetch_and_cache_symbol
from routes.stock import stock_bp
import json

load_dotenv()
app = Flask(__name__)
CORS(app)

# Load routes
app.register_blueprint(stock_bp)

with open("client/src/StarterPacks.ts", "r") as f:
    content = f.read()
    # This assumes STARTER_TICKERS is exported as an array in TS file
    start = content.index('[')
    end = content.index(']') + 1
    tickers_list = json.loads(content[start:end])

prefetch_list = tickers_list

# Prefetch logic using RQ
try:
    redis_conn = Redis()
    q = Queue(connection=redis_conn)
except Exception as e:
    print(f"⚠️ Redis not available: {e}")
    q = None

def delayed_prefetch():
    import time
    time.sleep(1.5)
    if not q:
        print("⚠️ Prefetch skipped: Redis not available")
        return
    for ticker in prefetch_list:
        print(f"Enqueuing: {ticker}")
        q.enqueue(fetch_and_cache_symbol, ticker)

if __name__ == '__main__':
    threading.Thread(target=delayed_prefetch).start()
    app.run(port=3000)