import asyncio
import os
import json
from polygon.websocket.models import Feed, Market
from polygon.websocket.models import WebSocketMessage
from polygon import WebSocketClient
from typing import List, Callable
from dotenv import load_dotenv

load_dotenv()

import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)

API_KEY = os.getenv("POLYGON_API_KEY")

ws_client = WebSocketClient(
    api_key=API_KEY,
    feed=Feed.Delayed,
    market=Market.Stocks
)

# List of subscriber callback functions (e.g., to broadcast via socket.io)
subscribers: List[Callable[[WebSocketMessage], None]] = []

subscribed_symbols: set[str] = set()

def subscribe_callback(cb: Callable[[WebSocketMessage], None]):
    subscribers.append(cb)

def handle_msg(messages: List[WebSocketMessage]):
    for m in messages:
        print(m)
        for cb in subscribers:
            cb(m)

def subscribe_symbol(symbol: str):
    channel = f"AM.{symbol}"
    if symbol not in subscribed_symbols:
        ws_client.subscribe(channel)
        subscribed_symbols.add(symbol)
        logger.info(f"[Proxy] Subscribed to Polygon channel: {channel}")

def unsubscribe_symbol(symbol: str):
    channel = f"AM.{symbol}"
    if symbol in subscribed_symbols:
        ws_client.unsubscribe(channel)
        subscribed_symbols.remove(symbol)
        logger.info(f"[Proxy] Unsubscribed from Polygon channel: {channel}")

def run_polygon_proxy():
    ws_client.run(handle_msg)