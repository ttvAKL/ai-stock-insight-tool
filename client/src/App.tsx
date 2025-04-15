import React, { useState } from 'react';
import StockCard from './StockCard';

interface StockData {
  symbol: string;
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  summary?: string[];
}

const App: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [error, setError] = useState('');

  const fetchStockData = async () => {
    if (!symbol) {
      setError('Please enter a stock symbol.');
      return;
    }

    setError('');

    try {
      const response = await fetch(`/api/stock/${symbol}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error); // Set error if no data is returned
        setStockData(null); // Clear any previous stock data
      } else {
        setStockData(data); // Store the fetched stock data
      }
    } catch {
      setError('Failed to fetch stock data. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">AI Stock Insight Tool</h1>
      <div className="flex mb-4">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
          placeholder="Enter stock symbol (e.g., AAPL)"
        />
        <button
          onClick={fetchStockData}
          className="ml-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Fetch
        </button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {stockData && <StockCard data={stockData} />}
    </div>
  );
};

export default App;
