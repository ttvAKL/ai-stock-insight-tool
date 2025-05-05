const POLYGON_WS_URL = 'wss://delayed.polygon.io/stocks';
const API_KEY = import.meta.env.VITE_POLYGON_API_KEY;

interface AggregateMessage {
  ev: string;    // "AM"
  sym: string;
  o: number;     // open
  h: number;     // high
  l: number;     // low
  c: number;     // close
  v: number;     // volume
  s: number;     // start timestamp
  e: number;     // end timestamp
}

let socket: WebSocket | null = null;
let reconnecting = false;
const listeners: { [ticker: string]: ((data: AggregateMessage) => void)[] } = {};
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function connectSocket(symbol?: string, marketStatus?: 'open' | 'closed'): WebSocket | null {
    if (marketStatus === 'closed') {
      console.warn("[WebSocket] Skipping connection: market is closed.");
      return null;
    }
    console.log("[WebSocket] Connecting to Polygon WS");
    if (socket && socket.readyState === WebSocket.OPEN) return socket;
  
    socket = new WebSocket(`${POLYGON_WS_URL}?apiKey=${API_KEY}`);
  
    socket.onopen = () => {
      console.log("[WebSocket] ✅ Connection opened");
      console.log('[📡 Polygon Socket] Connected');

      // Authenticate immediately
      socket?.send(JSON.stringify({
        action: 'auth',
        params: API_KEY,
      }));

      // Then subscribe
      if (symbol) {
        console.log(`[WebSocket] Subscribing to AM.${symbol}`);
        socket?.send(JSON.stringify({
          action: 'subscribe',
          params: `AM.${symbol}`,
        }));
      }

      heartbeatInterval = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'ping' }));
        }
      }, 30000);
    };
  
    socket.onmessage = (event) => {
      console.log("[WebSocket] 📩 Raw message:", event.data);
      const raw = JSON.parse(event.data);
      const messages = Array.isArray(raw) ? raw : [raw];
      messages.forEach((msg: AggregateMessage) => {
        if (msg.ev === 'AM') {
          console.log("[WebSocket] 📊 AM update received:", msg);
          const ticker = msg.sym;
          const handlers = listeners[ticker] || [];
          handlers.forEach(cb => cb(msg));
        }
      });
    };
  
    socket.onerror = (err) => {
      console.error('[❌ Polygon Socket] Error:', err);
    };
  
    socket.onclose = () => {
      if (!reconnecting) {
        reconnecting = true;
        console.warn('[⚠️ Polygon Socket] Disconnected. Reconnecting in 3s...');
        socket = null;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        setTimeout(() => {
          reconnecting = false;
          connectSocket(symbol, marketStatus);
        }, 3000);
      }
    };
  
    return socket;
  }

export function subscribeToTicker(ticker: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  console.log(`[WebSocket] Subscribing to AM.${ticker}`);
  socket.send(JSON.stringify({ action: 'subscribe', params: `AM.${ticker}` }));
}

export function unsubscribeFromTicker(ticker: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ action: 'unsubscribe', params: `AM.${ticker}` }));
}
export function addTickerListener(ticker: string, callback: (data: AggregateMessage) => void) {
  if (!listeners[ticker]) listeners[ticker] = [];
  listeners[ticker].push(callback);
}

export function removeTickerListener(ticker: string, callback: (data: AggregateMessage) => void) {
  if (!listeners[ticker]) return;
  listeners[ticker] = listeners[ticker].filter(cb => cb !== callback);
}