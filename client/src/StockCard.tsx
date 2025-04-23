import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSummaryText } from './utils/summaryText';

interface StockCardProps {
  data: {
    symbol: string;
    date: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    summary?: string[];
    source?: 'user' | 'recommended';
    categoryTags?: string[];
  };
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
}

const StockCard: React.FC<StockCardProps> = ({ data, isInWatchlist, onToggleWatchlist }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative mt-8 p-6 min-w-1000px max-w-md w-full min-h-[400px] bg-white rounded-lg shadow-lg group/card">
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
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <Link to={`/stock/${data.symbol}`} className="block h-full">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          {data.symbol} - {data.date}
          {data.source === 'recommended' && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
              Recommended
            </span>
          )}
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col"><span className="font-semibold">Open:</span><span>{data.open}</span></div>
          <div className="flex flex-col"><span className="font-semibold">High:</span><span>{data.high}</span></div>
          <div className="flex flex-col"><span className="font-semibold">Low:</span><span>{data.low}</span></div>
          <div className="flex flex-col"><span className="font-semibold">Close:</span><span>{data.close}</span></div>
          <div className="flex flex-col"><span className="font-semibold">Volume:</span><span>{data.volume}</span></div>
        </div>
        {data.summary && data.summary.length > 0 && (
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
              <ul className="list-disc pl-5 text-gray-700 space-y-2">
                {data.summary.map((key, index) => (
                  <li key={index} className="relative group/summary w-fit">
                    {getSummaryText(key)}
                  </li>
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