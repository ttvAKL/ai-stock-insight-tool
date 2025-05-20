import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createChart, CrosshairMode, CandlestickSeries, Time, CandlestickData, IChartApi } from 'lightweight-charts';
import { socket } from './socket';

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
  const seriesData = useRef<CandlestickData<Time>[]>([]);
  const chartRef = useRef<IChartApi | null>(null);

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
        const metaRes = await fetch(`/api/stock/${symbol}`);
        const meta = await metaRes.json();

        if (!meta.error) {
          setStock({
            symbol: meta.symbol,
            name: meta.name,
            sector: meta.sector,
            market_cap: meta.market_cap,
            pe_ratio: meta.pe_ratio,
            ai_summary: meta.ai_summary,
            news: meta.news || [],
            description: meta.description,
            revenue: meta.revenue,
            net_income: meta.net_income,
            eps: meta.eps,
          });
        }

        const historyRequests = granularities.map(async (g) => {
          const r = await fetch(`/api/stock/${symbol}/history?granularity=${g}&full=true`);
          const d = await r.json();
          return [g, d];
        });

        const historyResults = await Promise.all(historyRequests);
        const fetchedHistories: { [granularity: string]: HistoryPoint[] } = {};

        historyResults.forEach(([g, d]) => {
          fetchedHistories[g] = Array.isArray(d) ? d : [];
        });

        setHistoryCache(fetchedHistories);
      } catch {
        setError('Failed to fetch stock data.');
      } finally {
        setIsLoading(false);
      }
    };

    if (symbol) {
      fetchAllGranularities();
    }
  }, [symbol, selectedGranularity, marketStatus]);

  useEffect(() => {
    if (!chartContainerRef.current || !historyCache[selectedGranularity] || historyCache[selectedGranularity].length === 0) return;

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

    chartRef.current = chart;

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
      .filter(d => d.open !== undefined && d.close !== undefined)
      .sort((a, b) => (a.time as number) - (b.time as number));

    seriesData.current = transformed;
    candleSeries.setData(transformed);

    console.log("[Socket Setup] Listening for updates...");
    // Temporary wildcard debug
    socket.onAny((event, ...args) => {
      console.log(`[Socket DEBUG] Event: ${event}`, ...args);
    });
    socket.on("update", (data) => {
      console.log("[Socket Event] Update event received", data);
      if (
        data.symbol === symbol &&
        data.granularity === selectedGranularity &&
        data.time && data.open !== undefined && data.close !== undefined
      ) {
        const updatedBar = {
          time: Math.floor(Date.parse(data.time) / 1000) as Time,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        };

        console.log("[Socket Update] Received update:", updatedBar);

        // Prevent duplicate time values; update if exists, else push
        const existingIndex = seriesData.current.findIndex(bar => bar.time === updatedBar.time);
        if (existingIndex !== -1) {
          seriesData.current[existingIndex] = updatedBar;
        } else {
          seriesData.current.push(updatedBar);
        }

        // Sort and remove any accidental duplicates by time (should be unique)
        seriesData.current = Array.from(
          new Map(seriesData.current.map(bar => [bar.time, bar])).values()
        ).sort((a, b) => (a.time as number) - (b.time as number));

        // Only update chart if new update differs in time from last data point
        const lastData = seriesData.current[seriesData.current.length - 1];
        if (lastData && lastData.time === updatedBar.time) {
          candleSeries.setData([...seriesData.current]);
        }
        else {
          console.log("[Socket Event] Skipped update - mismatch in time or no new candle");
        }
      }
    });

    let isFetching = false;

    const timeRangeHandler = async () => {
      if (isFetching || !seriesData.current.length) return;
      if (!chartRef.current) return;

      const earliest = seriesData.current[0].time as number;
      const from = new Date((earliest - 86400 * 5) * 1000).toISOString(); // 5 days before
      const to = new Date((earliest - 1) * 1000).toISOString();

      isFetching = true;
      try {
        const res = await fetch(`/api/stock/${symbol}/history?granularity=${selectedGranularity}&from=${from}&to=${to}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const newPoints = data
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
            .filter((d) => d.open !== undefined && d.close !== undefined)
            .sort((a, b) => (a.time as number) - (b.time as number));

          const mergedMap = new Map<number, typeof newPoints[0]>();

          [...newPoints, ...seriesData.current].forEach((candle) => {
            mergedMap.set(candle.time as number, candle); // overwrite duplicates
          });

          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => (a.time as number) - (b.time as number)
          );

          seriesData.current = merged;
          candleSeries.setData(merged);
        }
      } catch (err) {
        console.error("Lazy load error:", err);
      } finally {
        isFetching = false;
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!chartRef.current) return;
      const chart = chartRef.current;
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    chart.timeScale().subscribeVisibleTimeRangeChange(timeRangeHandler);

    return () => {
      chartRef.current = null;
      resizeObserver.disconnect();
      chart.remove();
      socket.off("update");
      chart.timeScale().unsubscribeVisibleTimeRangeChange(timeRangeHandler);
    };
  }, [historyCache, selectedGranularity, symbol]);

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