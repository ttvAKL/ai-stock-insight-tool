import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createChart, CrosshairMode, CandlestickSeries, Time } from 'lightweight-charts';

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

const ranges = ['1d', '5d', '1mo', '6mo', '1y'];

const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<StockData | null>(null);
  const [error, setError] = useState('');
  const [selectedRange, setSelectedRange] = useState('1mo');
  const [historyCache, setHistoryCache] = useState<{ [range: string]: HistoryPoint[] }>({});
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isLoading, setIsLoading] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);

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
              setStock({
                symbol: data.symbol,
                name: data.name,
                sector: data.sector,
                market_cap: data.market_cap,
                pe_ratio: data.pe_ratio,
                dividend_yield: data.dividend_yield,
                ai_summary: data.ai_summary,
                news: data.news || [],
                description: data.description,
                revenue: data.revenue,
                net_income: data.net_income,
                eps: data.eps,
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

  useEffect(() => {
    if (!chartContainerRef.current || !historyCache[selectedRange]) return;

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

    const transformed = historyCache[selectedRange]
      .map((point) => ({
        time: point.time as Time,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      }))
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
  }, [historyCache, selectedRange]);

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
  };

  if (error) return <p className="text-red-500 p-4">{error}</p>;
  if (isLoading || !stock) return <p className="p-4">Loading...</p>;

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
      <div ref={chartContainerRef} className="h-96 bg-white mb-6" />

      {/* Stock Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div><strong>Market Cap:</strong> {stock.market_cap?.toLocaleString() || 'N/A'}</div>
        <div><strong>P/E Ratio:</strong> {stock.pe_ratio ?? 'N/A'}</div>
        <div><strong>Dividend Yield:</strong> {stock.dividend_yield ?? 'N/A'}</div>
        <div><strong>Revenue (TTM):</strong> {stock.revenue?.toLocaleString() || 'N/A'}</div>
        <div><strong>Net Income (TTM):</strong> {stock.net_income?.toLocaleString() || 'N/A'}</div>
        <div><strong>EPS (TTM):</strong> {stock.eps ?? 'N/A'}</div>
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