import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface StockData {
  symbol: string;
  name?: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  market_cap?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  sector?: string;
  summary?: string[];
  history?: { date: string; close: number }[];
}

const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<StockData | null>(null);
  const [error, setError] = useState('');
  const [selectedRange, setSelectedRange] = useState('1mo');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchStock = async () => {
      const url = `http://127.0.0.1:3000/api/stock/${symbol}?range=${selectedRange}&t=${Date.now()}`;

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        const data = await res.json();

        if (data.error) {
          setError(data.error);
        } else {
          setStock(data);
        }
      } catch {
        setError('Failed to fetch stock data.');
      }
    };

    fetchStock();
  }, [symbol, selectedRange]);

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
  };

  const formatXAxis = (tick: string) => {
  const date = new Date(Date.parse(tick));
  switch (selectedRange) {
    case '1d': {
      const time = tick.slice(11, 16); // Extract HH:mm from ISO string
      return time;
    }
    case '5d':
    case '1mo': {
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const mo = monthNames[date.getUTCMonth()];
      const d = date.getUTCDate();
      return `${mo} ${d}`;
    }
    case '6mo':
    case '1y': {
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return monthNames[date.getUTCMonth()];
    }
    default:
      return tick;
  }
};

const getHourlyTicks = (history: { date: string }[]) => {
  const seen = new Set<string>();
  const ticks: string[] = [];
  history.forEach(({ date }) => {
    const key = date.slice(0, 13); // Keep as-is to preserve UTC time
    if (!seen.has(key)) {
      seen.add(key);
      ticks.push(date);
    }
  });
  return ticks;
};

const getDailyTicks = (history: { date: string }[]) => {
  const seen = new Set<string>();
  const ticks: string[] = [];
  history.forEach(({ date }) => {
    // Use the first 10 characters of the ISO string (YYYY-MM-DD)
    const key = date.slice(0, 10);
    if (!seen.has(key)) {
      seen.add(key);
      ticks.push(date);
    }
  });
  return ticks;
};

const getMonthlyTicks = (history: { date: string }[]) => {
  const seen = new Set<string>();
  const ticks: string[] = [];
  history.forEach(({ date }) => {
    // Use the first 7 characters of the ISO string (YYYY-MM)
    const key = date.slice(0, 7);
    if (!seen.has(key)) {
      seen.add(key);
      ticks.push(date);
    }
  });
  return ticks;
};

  if (error) return <p className="text-red-500 p-4">{error}</p>;
  if (!stock) return <p className="p-4">Loading...</p>;

  return (
    <div
      className="w-full max-w-8xl mx-auto p-6 bg-white shadow-md rounded-lg mt-6"
      style={{ minWidth: `${Math.min(windowWidth, 1536)}px` }}
    >
      <h1 className="text-3xl font-bold mb-2">{stock.name || stock.symbol}</h1>
      <p className="text-sm text-gray-500 mb-4">Sector: {stock.sector || 'N/A'}</p>
      
      <div className="flex space-x-2 mb-4">
        {['1d', '5d', '1mo', '6mo', '1y'].map((range) => (
          <button
            key={range}
            onClick={() => handleRangeChange(range)}
            className={`px-3 py-1 rounded ${selectedRange === range ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            {range.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="h-64 bg-white mb-6">
        {stock.history && stock.history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stock.history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                ticks={
                  selectedRange === '1d'
                    ? getHourlyTicks(stock.history || [])
                    : selectedRange === '5d'
                    ? getDailyTicks(stock.history || [])
                    : getMonthlyTicks(stock.history || [])
                }
              />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip labelFormatter={(label) => {
                const date = new Date(label);
                const isShortRange = ['1d', '5d'].includes(selectedRange);
                const options: Intl.DateTimeFormatOptions = isShortRange
                  ? {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }
                  : {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    };
                return date.toLocaleString(undefined, options);
              }} />
              <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No chart data available
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div><strong>Date:</strong> {stock.date}</div>
        <div><strong>Open:</strong> {stock.open}</div>
        <div><strong>High:</strong> {stock.high}</div>
        <div><strong>Low:</strong> {stock.low}</div>
        <div><strong>Close:</strong> {stock.close}</div>
        <div><strong>Volume:</strong> {stock.volume.toLocaleString()}</div>
        <div><strong>Market Cap:</strong> {stock.market_cap?.toLocaleString() || 'N/A'}</div>
        <div><strong>P/E Ratio:</strong> {stock.pe_ratio ?? 'N/A'}</div>
        <div><strong>Dividend Yield:</strong> {stock.dividend_yield ?? 'N/A'}</div>
      </div>

      {stock.summary && stock.summary.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Key Insights</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {stock.summary.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StockDetail;