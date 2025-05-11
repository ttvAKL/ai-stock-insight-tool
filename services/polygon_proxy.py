import asyncio
import os
import json
from polygon.websocket.models import Feed, Market
from polygon.websocket.models import WebSocketMessage
from polygon import WebSocketClient
from typing import List, Callable
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("POLYGON_API_KEY")

print(API_KEY)

ws_client = WebSocketClient(
    api_key=API_KEY,
    feed=Feed.Delayed,
    market=Market.Stocks
)

# List of subscriber callback functions (e.g., to broadcast via socket.io)
subscribers: List[Callable[[WebSocketMessage], None]] = []

def subscribe_callback(cb: Callable[[WebSocketMessage], None]):
    """Register a callback to handle incoming Polygon messages."""
    print("New subscriber registered to Polygon proxy.")
    subscribers.append(cb)

def handle_msg(messages: List[WebSocketMessage]):
    for m in messages:
        for cb in subscribers:
            cb(m)

def run_polygon_proxy():
    print("Starting Polygon WebSocket proxy...")
    ws_client.subscribe("AM.*")
    print("Subscribed to Polygon aggregate feed: AM.*")
    ws_client.run(handle_msg)