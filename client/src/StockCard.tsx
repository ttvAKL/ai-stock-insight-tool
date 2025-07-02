import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface StockCardProps {
  data: {
    symbol: string;
    date: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    source?: 'user' | 'recommended';
    categoryTags?: string[];
    ai_summary?: string[];
    name?: string;
  };
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  theme?: 'light' | 'dark';
}

type OhlcMessage = {
  symbol: string;
  granularity: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

const AnimatedValue: React.FC<{ value: number; prevValue: number }> = ({ value, prevValue }) => {
  const colorClass =
    value > prevValue ? 'text-green-600' :
    value < prevValue ? 'text-red-600' :
    'text-gray-500';
  const ref = useRef<HTMLSpanElement>(null);


  useEffect(() => {
    if (ref.current) {
      ref.current.classList.remove('fade-in-up');
      void ref.current.offsetWidth; // trigger reflow
      ref.current.classList.add('fade-in-up');
    }
  }, [value]);

  return (
    <span
      ref={ref}
      className={`transition-all duration-300 ease-in-out font-semibold ${colorClass}`}
    >
      {value}
    </span>
  );
};

const StockCard: React.FC<StockCardProps> = ({ data, isInWatchlist, onToggleWatchlist, theme }) => {
  const [expanded, setExpanded] = useState(false);

  const [ohlc, setOhlc] = useState({
    open: parseFloat(data.open),
    high: parseFloat(data.high),
    low: parseFloat(data.low),
    close: parseFloat(data.close)
  });
  const [prevOhlc, setPrevOhlc] = useState(ohlc);
  const [, setSocketReceived] = useState(false);
  const fallbackTriggered = useRef(false);

  const isMarketClosed = () => {
    const now = new Date();
    const day = now.getUTCDay();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();

    // Market is closed on weekends
    if (day === 6 || day === 0) return true;

    // Market open from 13:30 to 20:00 UTC (9:30 AM to 4:00 PM ET)
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes < 13 * 60 + 30 || totalMinutes >= 20 * 60;
  };

  // Fallback fetch for two most recent 1min OHLCs
  const fetchRecentOhlc = async () => {
    try {
      console.log("[Fallback] Fetching recent OHLC for", data.symbol);
      const now = new Date();
      const day = now.getUTCDay();
      const hours = now.getUTCHours();

      const lastMarketClose = new Date();

      if (day === 6) {
        // Saturday
        lastMarketClose.setUTCDate(now.getUTCDate() - 1);
        lastMarketClose.setUTCHours(20, 0, 0, 0);
      } else if (day === 0) {
        // Sunday
        lastMarketClose.setUTCDate(now.getUTCDate() - 2);
        lastMarketClose.setUTCHours(20, 0, 0, 0);
      } else if (day === 1 && hours < 13) {
        // Monday before market opens
        lastMarketClose.setUTCDate(now.getUTCDate() - 3);
        lastMarketClose.setUTCHours(20, 0, 0, 0);
      } else if (hours < 13) {
        // Weekday before market opens
        lastMarketClose.setUTCDate(now.getUTCDate() - 1);
        lastMarketClose.setUTCHours(20, 0, 0, 0);
      } else {
        // Market is open today — fallback shouldn't run
        return;
      }

      const end = lastMarketClose.toISOString();
      const start = new Date(lastMarketClose.getTime() - 2 * 60000).toISOString(); // 2 minutes before

      const res = await axios.get(`/api/stock/${data.symbol}/history`, {
        params: { granularity: '1min', from: start, to: end, full: true }
      });

      console.log("[Fallback] Response:", res.data);

      const candles = res.data || [];

      if (candles.length >= 2) {
        const latest = candles[candles.length - 1];
        const previous = candles[candles.length - 2];

        console.log("[Fallback] Updating with recent candles", { latest, previous });

        setPrevOhlc({
          open: previous.open,
          high: previous.high,
          low: previous.low,
          close: previous.close
        });
        setOhlc({
          open: latest.open,
          high: latest.high,
          low: latest.low,
          close: latest.close
        });
      } else {
        console.log("[Fallback] Not enough candles received", candles);
      }
    } catch (error) {
      console.error("Failed to fetch fallback OHLC:", error);
    }
  };

  useEffect(() => {
    const handleUpdate = (msg: OhlcMessage) => {
      console.log("[Socket Update]", msg);
      if (msg.symbol !== data.symbol || msg.granularity !== '1min') {
        console.log("[Skip] Symbol mismatch or incorrect granularity", msg.symbol, msg.granularity);
        return;
      }
      if (!msg.open || !msg.high || !msg.low || !msg.close) {
        console.log("[Skip] Incomplete OHLC data", msg);
        return;
      }

      console.log("[Accepted] Updating OHLC with", msg);
      setSocketReceived(true);
      const newOhlc = {
        open: msg.open,
        high: msg.high,
        low: msg.low,
        close: msg.close
      };
      setPrevOhlc({ ...ohlc });
      setOhlc(newOhlc);
    };

    socket.on('update', handleUpdate);

    if (isMarketClosed() && !fallbackTriggered.current) {
      console.log("[Fallback] Market is closed, triggering fallback OHLC fetch");
      fallbackTriggered.current = true;
      fetchRecentOhlc();
    }

    return () => {
      socket.off('update', handleUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.symbol, ohlc]);

  return (
    <div className={`relative mt-8 p-6 min-w-1000px max-w-md w-full min-h-[330px] rounded-lg shadow-lg group/card ${
      theme === 'dark' ? 'bg-[#1e1e1e] text-gray-200' : 'bg-white text-black'
    }`}>
      {onToggleWatchlist && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist();
          }}
          className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200"
          style={{
            background: 'transparent',
            outline: 'none',
            boxShadow: 'none',
            border: 'none'
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill={isInWatchlist ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-5 h-5 text-yellow-500 hover:text-yellow-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            />
          </svg>
        </button>
      )}
      {(data.categoryTags && data.categoryTags.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {data.categoryTags?.map((tag, index) => (
            <span
              key={index}
              className={`px-2 py-1 text-xs rounded-full font-medium ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] text-sky-200'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <Link to={`/stock/${data.symbol}`} className={`block h-full ${theme === 'dark' ? 'text-gray-200' : 'text-black'}`}>
        <h2 className={`text-2xl font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-100' : 'text-black'}`}>
          {data.symbol}
          {data.source === 'recommended' && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
            }`}>
              Recommended
            </span>
          )}
        </h2>
        <div className={`grid grid-cols-2 gap-4 mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
          <div className="flex flex-col">
            <span className="font-semibold">Open:</span>
            <AnimatedValue value={ohlc.open} prevValue={prevOhlc.open} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">High:</span>
            <AnimatedValue value={ohlc.high} prevValue={prevOhlc.high} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Low:</span>
            <AnimatedValue value={ohlc.low} prevValue={prevOhlc.low} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Close:</span>
            <AnimatedValue value={ohlc.close} prevValue={prevOhlc.close} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Volume:</span>
            <span>{data.volume}</span>
          </div>
        </div>
        {data.ai_summary && (
          <div className="mt-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                setExpanded(!expanded);
              }}
              className="text-lg font-semibold mb-2 flex items-center gap-2"
              style={{
                background: 'transparent',
                outline: 'none',
                boxShadow: 'none',
                border: 'none',
                paddingLeft: 0
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              Stock Summary
              <span className={`transform transition-transform duration-200 ${expanded ? 'rotate-90' : 'rotate-0'}`}>
                ▶
              </span>
            </button>
            {expanded && (
              <ul className={`list-disc pl-5 space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {data.ai_summary.map((point, idx) => (
                  <li key={idx} className="text-sm leading-snug">{point}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Link>
    </div>
  );
};

export default StockCard;