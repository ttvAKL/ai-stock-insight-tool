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
  sector?: string;
  market_cap?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  ai_summary?: string[];
}

interface HistoryPoint {
  date: string;
  close: number;
}

const ranges = ['1d', '5d', '1mo', '6mo', '1y'];

const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<StockData | null>(null);
  const [error, setError] = useState('');
  const [selectedRange, setSelectedRange] = useState('1mo');
  const [historyCache, setHistoryCache] = useState<{ [range: string]: HistoryPoint[] }>({});
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchAllRanges = async () => {
      try {
        const baseUrl = `/api/stock/${symbol}`;
        const fetchedHistories: { [range: string]: HistoryPoint[] } = {};
        let stockSet = false;

        for (const range of ranges) {
          const res = await fetch(`${baseUrl}/${range}`);
          const data = await res.json();
          if (!data.error) {
            if (!stockSet) {
              console.log("🧠 AI Summary Received:", data.ai_summary);
              setStock({
                symbol: data.symbol,
                name: data.name,
                sector: data.sector,
                market_cap: data.market_cap,
                pe_ratio: data.pe_ratio,
                dividend_yield: data.dividend_yield,
                ai_summary: data.ai_summary
              });
              stockSet = true;
            }
            fetchedHistories[range] = data.history || [];
          }
        }

        setHistoryCache(fetchedHistories);
      } catch {
        setError('Failed to fetch stock data.');
      } finally {
        setIsLoading(false);
      }
    };

    if (symbol) {
      fetchAllRanges();
    }
  }, [symbol]);

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
  };

  const formatXAxis = (tick: string) => {
    const date = new Date(Date.parse(tick));
    switch (selectedRange) {
      case '1d': return tick.slice(11, 16);
      case '5d':
      case '1mo': return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
      case '6mo':
      case '1y': return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
      default: return tick;
    }
  };

  const filterXAxisTicks = (history: HistoryPoint[]) => {
    const seenDays = new Set<string>();
    return history
      .filter(({ date }) => {
        const day = date.slice(0, 10); // YYYY-MM-DD
        if (!seenDays.has(day)) {
          seenDays.add(day);
          return true;
        }
        return false;
      })
      .map(({ date }) => date);
  };

  const filterHistoryByRange = (history: HistoryPoint[], range: string) => {
    const now = new Date();
    const cutoff = new Date();

    if (range === '6mo') {
      cutoff.setMonth(now.getMonth() - 6);
    } else if (range === '1y') {
      cutoff.setFullYear(now.getFullYear() - 1);
    } else {
      return history; // no filtering for 1d, 5d, 1mo
    }

    return history.filter((point) => {
      const pointDate = new Date(point.date);
      return pointDate >= cutoff;
    });
  };

  if (error) return <p className="text-red-500 p-4">{error}</p>;
  if (isLoading || !stock) return <p className="p-4">Loading...</p>;

  const rawHistory = historyCache[selectedRange] || [];
  const history = filterHistoryByRange(rawHistory, selectedRange);

  return (
    <div
      className="w-full max-w-8xl mx-auto p-6 bg-white shadow-md rounded-lg mt-6"
      style={{ minWidth: `${Math.min(windowWidth, 1536)}px` }}
    >
      <h1 className="text-3xl font-bold mb-2">{stock.name || stock.symbol}</h1>
      <p className="text-sm text-gray-500 mb-4">Sector: {stock.sector || 'N/A'}</p>

      {/* Range Buttons */}
      <div className="flex space-x-2 mb-4">
        {ranges.map((range) => (
          <button
            key={range}
            onClick={() => handleRangeChange(range)}
            className={`px-3 py-1 rounded ${selectedRange === range ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            {range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Stock Chart */}
      <div className="h-64 bg-white mb-6">
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                ticks={selectedRange === '1d' ? undefined : filterXAxisTicks(history)}
              />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                }}
              />
              <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No chart data available
          </div>
        )}
      </div>

      {/* Stock Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div><strong>Market Cap:</strong> {stock.market_cap?.toLocaleString() || 'N/A'}</div>
        <div><strong>P/E Ratio:</strong> {stock.pe_ratio ?? 'N/A'}</div>
        <div><strong>Dividend Yield:</strong> {stock.dividend_yield ?? 'N/A'}</div>
      </div>

      {/* Key Insights */}
      {stock.ai_summary && stock.ai_summary.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Key Insights</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1 pl-4">
            {stock.ai_summary.map((point, idx) => (
              <li key={idx} className="text-sm leading-snug">{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StockDetail;