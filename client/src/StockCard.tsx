import React from 'react';
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
  };
  onRemove?: (symbol: string) => void;
}

const StockCard: React.FC<StockCardProps> = ({ data, onRemove }) => {
  return (
    <div className="relative mt-8 p-6 min-w-1000px max-w-md w-full h-[500px] bg-white rounded-lg shadow-lg group/card">
      {data.source === 'recommended' && (
        <span className="absolute top-0 left-0 bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">
          Recommended
        </span>
      )}
      {onRemove && (
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 font-bold text-sm opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(data.symbol);
          }}
          style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none' }}
        >
          ✕
        </button>
      )}
      <Link to={`/stock/${data.symbol}`} className="block h-full">
        <h2 className="text-2xl font-semibold mb-4">{data.symbol} - {data.date}</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col"><span className="font-semibold">Open:</span><span>{data.open}</span></div>
          <div className="flex flex-col"><span className="font-semibold">High:</span><span>{data.high}</span></div>
          <div className="flex flex-col"><span className="font-semibold">Low:</span><span>{data.low}</span></div>
          <div className="flex flex-col"><span className="font-semibold">Close:</span><span>{data.close}</span></div>
          <div className="flex flex-col"><span className="font-semibold">Volume:</span><span>{data.volume}</span></div>
        </div>

        {data.summary && data.summary.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Stock Summary</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              {data.summary.map((key, index) => (
                <li key={index} className="relative group/summary w-fit">
                  {getSummaryText(key)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Link>

    </div>
  );
};

export default StockCard;