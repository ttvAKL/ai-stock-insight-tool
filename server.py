from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv, find_dotenv
import threading
from redis import Redis
from rq import Queue
from jobs.tasks import fetch_and_cache_symbol
from routes.stock import stock_bp
import json
from flask_socketio import SocketIO
from services.auth_utils import verify_jwt_token
from services.polygon_proxy import run_polygon_proxy, subscribe_callback

load_dotenv(find_dotenv())
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

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
        print(f"🟢 Enqueuing: {ticker}")
        q.enqueue(fetch_and_cache_symbol, ticker)

client_subscriptions = {}  # sid -> set of symbols


# JWT authentication for Socket.IO connections
@socketio.on("connect")
def handle_connect(auth):
    token = auth.get("token") if auth else None
    if not token or not verify_jwt_token(token):
        print(f"❌ Unauthorized socket connection from {request.sid}")
        return False  # disconnect
    print(f"✅ Authorized socket connection: {request.sid}")

@socketio.on("subscribe")
def handle_subscribe(data):
    symbol = data.upper()
    sid = request.sid
    client_subscriptions.setdefault(sid, set()).add(symbol)
    print(f"[Socket.IO] {sid} subscribed to {symbol}")

@socketio.on("unsubscribe")
def handle_unsubscribe(data):
    symbol = data.upper()
    sid = request.sid
    if sid in client_subscriptions:
        client_subscriptions[sid].discard(symbol)
        print(f"[Socket.IO] {sid} unsubscribed from {symbol}")

@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    client_subscriptions.pop(sid, None)
    print(f"[Socket.IO] Client disconnected: {sid}")

def forward_polygon_update(msg):
    if not hasattr(msg, "sym"):
        return
    symbol = msg.sym
    for sid, symbols in client_subscriptions.items():
        if symbol in symbols:
            print(f"[Socket.IO] Forwarding update for {symbol} to {sid}")
            socketio.emit("update", msg.to_dict(), room=sid)

print("[Socket.IO] Subscribing to Polygon proxy update stream...")
subscribe_callback(forward_polygon_update)

if __name__ == '__main__':
    threading.Thread(target=delayed_prefetch).start()
    threading.Thread(target=run_polygon_proxy, daemon=True).start()
    print("[server.py] Started Polygon proxy thread")
    socketio.run(app, port=3000)