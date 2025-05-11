import os
from polygon import WebSocketClient
from polygon.websocket.models import WebSocketMessage, Feed, Market
from typing import List
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

ws_client = WebSocketClient(
    api_key=os.getenv("POLYGON_API_KEY"),
    feed=Feed.Delayed,
    market=Market.Stocks
)

# Message handler
def handle_msg(msgs: List[WebSocketMessage]):
    pass  # Disabled logging to avoid terminal flooding

# Subscribe to all 1-minute aggregate stock data
ws_client.subscribe("AM.*")

# Start listening
ws_client.run(handle_msg)
