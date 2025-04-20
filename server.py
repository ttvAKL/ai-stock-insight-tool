from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import threading
from redis import Redis
from rq import Queue
from jobs.tasks import fetch_and_cache_symbol
from routes.stock import stock_bp

load_dotenv()
app = Flask(__name__)
CORS(app)

# Load routes
app.register_blueprint(stock_bp)

# Prefetch logic using RQ
q = Queue(connection=Redis())
prefetch_list = ["AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "GOOGL", "META", "JPM", "UNH", "V"]

def delayed_prefetch():
    import time
    time.sleep(1.5)
    for ticker in prefetch_list:
        print(f"Enqueuing: {ticker}")
        q.enqueue(fetch_and_cache_symbol, ticker)

if __name__ == '__main__':
    threading.Thread(target=delayed_prefetch).start()
    app.run(port=3000)