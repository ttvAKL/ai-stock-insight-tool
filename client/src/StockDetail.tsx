import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createChart, CrosshairMode, CandlestickSeries, Time } from 'lightweight-charts';
import { connectSocket, subscribeToTicker, addTickerListener } from './utils//stockSocket';

interface StockData {
  symbol: string;
  name?: string;
  sector?: string;
  market_cap?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  ai_summary?: string[];
  news?: {
    title: string;
    summary: string;
    url: string;
    sentiment: string;
  }[];
  description?: string;
  revenue?: number;
  net_income?: number;
  eps?: number;
}

interface HistoryPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}


const granularities = ['1min', '5min', '30min', '1h', '1d'];

// Utility to align a date to the correct bucket for aggregation
const getBucketTime = (date: Date, granularity: string): string => {
  const d = new Date(date);
  const time = d.getTime();

  const intervals: { [key: string]: number } = {
    '5min': 5 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };

  if (granularity === '1min') return d.toISOString();

  const bucket = Math.floor(time / intervals[granularity]) * intervals[granularity];
  return new Date(bucket).toISOString();
};

const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<StockData | null>(null);
  const [error, setError] = useState('');
  const [selectedGranularity, setSelectedGranularity] = useState('1min');
  const [historyCache, setHistoryCache] = useState<{ [granularity: string]: HistoryPoint[] }>({});
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isLoading, setIsLoading] = useState(true);
  const [marketStatus, setMarketStatus] = useState<'open' | 'closed' | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const fetchMarketStatus = async () => {
    try {
      const res = await fetch(`https://api.polygon.io/v1/marketstatus/now?apiKey=${import.meta.env.VITE_POLYGON_API_KEY}`);
      const data = await res.json();
      setMarketStatus(data.market === 'open' ? 'open' : 'closed');
    } catch {
      setMarketStatus(null);
    }
  };

  useEffect(() => {
    fetchMarketStatus();
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchAllGranularities = async () => {
      try {
        const baseUrl = `/api/stock/${symbol}`;
        const fetchedHistories: { [granularity: string]: HistoryPoint[] } = {};
        let stockSet = false;

        for (const granularity of granularities) {
          const res = await fetch(`${baseUrl}?granularity=${granularity}`);
          const data = await res.json();
          if (!data.error) {
            if (!stockSet) {
              setStock({
                symbol: data.symbol,
                name: data.name,
                sector: data.sector,
                market_cap: data.market_cap,
                pe_ratio: data.pe_ratio,
                ai_summary: data.ai_summary,
                news: data.news || [],
                description: data.description,
                revenue: data.revenue,
                net_income: data.net_income,
                eps: data.eps,
              });
              stockSet = true;
            }
            fetchedHistories[granularity] = data.history || [];
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
      fetchAllGranularities();

      if (marketStatus === 'open') {
        connectSocket(symbol);
        if (['1min', '5min', '30min', '1h', '1d'].includes(selectedGranularity)) {
          subscribeToTicker(symbol!);
          addTickerListener(symbol!, (update) => {
            // update is expected to be an AM. message with o/h/l/c/s
            const candleTime = new Date(update.s);
            const bucketTime = getBucketTime(candleTime, selectedGranularity);

            const newPoint: HistoryPoint = {
              time: bucketTime,
              open: update.o,
              high: update.h,
              low: update.l,
              close: update.c,
            };

            setHistoryCache(prev => {
              const current = [...(prev[selectedGranularity] || [])];
              const last = current[current.length - 1];

              if (last && last.time === bucketTime) {
                // Update existing aggregated candle
                last.high = Math.max(last.high, update.h);
                last.low = Math.min(last.low, update.l);
                last.close = update.c;
                return { ...prev, [selectedGranularity]: [...current.slice(0, -1), last] };
              } else {
                // Start a new candle
                return { ...prev, [selectedGranularity]: [...current.slice(-99), newPoint] };
              }
            });
          });
        }
      }
    }
  }, [symbol, selectedGranularity, marketStatus]);

  useEffect(() => {
    if (!chartContainerRef.current || !historyCache[selectedGranularity]) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 384,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#000',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#eee' },
        horzLines: { color: '#eee' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const transformed = historyCache[selectedGranularity]
      .map((point) => {
        const timestamp = Date.parse(point.time);
        return {
          time: Math.floor(timestamp / 1000) as Time,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
        };
      })
      .filter(d => d.open !== undefined && d.close !== undefined);

    candleSeries.setData(transformed);

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [historyCache, selectedGranularity]);

  if (error) return <p className="text-red-500 p-4">{error}</p>;
  if (isLoading || !stock) return <p className="p-4">Loading...</p>;

  return (
    <div
      className="w-full max-w-8xl mx-auto p-6 bg-white shadow-md rounded-lg mt-6"
      style={{ minWidth: `${Math.min(windowWidth, 1536)}px` }}
    >
      <h1 className="text-3xl font-bold mb-2">{stock.name || stock.symbol}</h1>
      <p className="text-sm text-gray-500 mb-4">Sector: {stock.sector || 'N/A'}</p>

      {marketStatus === 'closed' && (
        <div className="bg-yellow-100 text-yellow-800 p-2 rounded mb-4 text-sm">
          ⚠️ The stock market is currently closed. Showing latest available data.
        </div>
      )}

      {/* Granularity Buttons */}
      <div className="flex space-x-2 mb-4">
        {granularities.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGranularity(g)}
            className={`px-3 py-1 rounded ${selectedGranularity === g ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Stock Chart */}
      <div ref={chartContainerRef} className="h-96 bg-white mb-6" />

      {/* Stock Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div><strong>Market Cap:</strong> {stock.market_cap?.toLocaleString() || 'N/A'}</div>
        <div><strong>P/E Ratio:</strong> {stock.pe_ratio ?? 'N/A'}</div>
        <div><strong>Revenue (TTM):</strong> {stock.revenue?.toLocaleString() || 'N/A'}</div>
        <div><strong>Net Income (TTM):</strong> {stock.net_income?.toLocaleString() || 'N/A'}</div>
        <div><strong>Earnings Per Share (TTM):</strong> {stock.eps ?? 'N/A'}</div>
      </div>

      {stock.description && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Company Overview</h2>
          <p className="text-sm text-gray-700">{stock.description}</p>
        </div>
      )}

      {/* Key Insights */}
      {stock.ai_summary && stock.ai_summary.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Key Insights</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1 pl-4">
            {stock.ai_summary.map((point, idx) => (
              <li key={idx} className="text-sm leading-snug">{point}</li>
            ))}
          </ul>
        </div>
      )}

      {stock.news && stock.news.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent News</h2>
          <ul className="space-y-3">
            {stock.news.map((item, idx) => (
              <li key={idx} className="text-sm">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline">
                  {item.title}
                </a>
                <p className="text-gray-600">{item.summary}</p>
                <span className={`text-xs rounded-full px-2 py-0.5 inline-block mt-1 ${
                  item.sentiment === 'Positive' ? 'bg-green-100 text-green-700' :
                  item.sentiment === 'Negative' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {item.sentiment}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StockDetail;