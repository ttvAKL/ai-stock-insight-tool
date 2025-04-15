import React from 'react';

const getDisplayText = (key: string): string => {
  switch (key) {
    case 'pays_dividends':
      return 'This stock pays dividends, sharing profits with shareholders.';
    case 'high_pe':
      return 'High P/E ratio suggests strong growth expectations or overvaluation.';
    case 'low_pe':
      return 'Low P/E ratio may mean the stock is undervalued or facing difficulties.';
    case 'high_beta':
      return 'This is a high-volatility stock prone to larger price swings.';
    case 'low_beta':
      return 'This is a lower-volatility stock, potentially more stable.';
    case 'high_margin':
      return 'Strong profit margins — the company keeps a good portion of revenue as earnings.';
    case 'low_margin':
      return 'Thin profit margins — the company may face higher costs or pricing pressure.';
    default:
      return 'Financial insight based on market metrics.';
  }
};

const getExplanation = (key: string): string => {
  switch (key) {
    case 'pays_dividends':
      return 'Determined by analyzing the dividendYield value.';
    case 'high_pe':
    case 'low_pe':
      return 'Determined by analyzing the trailingPE value.';
    case 'high_beta':
    case 'low_beta':
      return 'Determined by analyzing the beta value.';
    case 'high_margin':
    case 'low_margin':
      return 'Determined by analyzing the profitMargins value.';
    default:
      return 'Based on available financial indicators.';
  }
};

interface StockCardProps {
  data: {
    symbol: string;
    date: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    summary?: string[]; // Now these are backend keys like 'high_pe', 'low_margin'
  };
}

const StockCard: React.FC<StockCardProps> = ({ data }) => {
  return (
    <div className="mt-8 p-6 max-w-md w-full bg-white rounded-lg shadow-lg">
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
              <li key={index} className="relative group">
                {getDisplayText(key)}
                <div className="absolute left-0 w-64 bg-gray-800 text-white text-sm p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  {getExplanation(key)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StockCard;