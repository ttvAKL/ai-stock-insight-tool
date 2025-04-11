import React from 'react';

interface StockCardProps {
  data: {
    symbol: string;
    date: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  };
}

const StockCard: React.FC<StockCardProps> = ({ data }) => {
  return (
    <div className="mt-8 p-6 max-w-sm w-full bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">{data.symbol} - {data.date}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="font-semibold">Open:</span>
          <span>{data.open}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">High:</span>
          <span>{data.high}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">Low:</span>
          <span>{data.low}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">Close:</span>
          <span>{data.close}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">Volume:</span>
          <span>{data.volume}</span>
        </div>
      </div>
    </div>
  );
};

export default StockCard;
