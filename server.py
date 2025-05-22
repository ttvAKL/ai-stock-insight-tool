import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv, find_dotenv
import threading
from redis import Redis
from rq import Queue
from jobs.tasks import fetch_and_cache_symbol
from routes.stock import stock_bp
from routes.user_data import user_data_bp
import json
from flask_socketio import SocketIO
from services.polygon_proxy import (
    run_polygon_proxy,
    subscribe_callback,
    subscribe_symbol,
    unsubscribe_symbol,
)
from routes.auth_google import auth_bp, register_oauth
from db import db

load_dotenv(find_dotenv())
app = Flask(__name__)
# Load secret key for session signing
app.secret_key = os.getenv('FLASK_SECRET_KEY')
# Configure the database
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')  # or your specific env var
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Bind SQLAlchemy to this app
db.init_app(app)
# Enable CORS for React dev server with credentials support
CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:5173"],
    methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
socketio = SocketIO(
    app,
    cors_allowed_origins=["http://localhost:5173"],
    async_mode="eventlet"
)

# Load routes

# Configure Google OAuth routes
register_oauth(app)
app.register_blueprint(auth_bp)
app.register_blueprint(stock_bp)
app.register_blueprint(user_data_bp)


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
    if not token:
        print(f"❌ Unauthorized socket connection from {request.sid}")
        return False  # disconnect
    print(f"✅ Authorized socket connection: {request.sid}")

@socketio.on("subscribe")
def handle_subscribe(data):
    symbol = data.upper()
    sid = request.sid
    client_subscriptions.setdefault(sid, set()).add(symbol)
    print(f"[Socket.IO] {sid} subscribed to {symbol}")
    # Ensure the proxy streams this symbol
    subscribe_symbol(symbol)

@socketio.on("unsubscribe")
def handle_unsubscribe(data):
    symbol = data.upper()
    sid = request.sid
    if sid in client_subscriptions:
        client_subscriptions[sid].discard(symbol)
        print(f"[Socket.IO] {sid} unsubscribed from {symbol}")
    # Stop proxy stream if nobody else is subscribed
    unsubscribe_symbol(symbol)

@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    client_subscriptions.pop(sid, None)
    print(f"[Socket.IO] Client disconnected: {sid}")

def forward_polygon_update(msg):
    if not hasattr(msg, "symbol"):
        return
    symbol = msg.symbol
    for sid, symbols in client_subscriptions.items():
        if symbol in symbols:
            socketio.emit("update", msg.__dict__, room=sid)
            print(f"[Forward] Emitted update for {symbol} to {sid}")

subscribe_callback(forward_polygon_update)

if __name__ == '__main__':
    threading.Thread(target=delayed_prefetch).start()
    threading.Thread(target=run_polygon_proxy, daemon=True).start()
    print("server.py started at localhost:3000")
    socketio.run(app, host='localhost', port=3000)