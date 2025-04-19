import React, { useEffect, useState } from 'react';
import StockCard from './StockCard';
import SearchBar from './SearchBar';



interface StockData {
  symbol: string;
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  summary?: string[];
  source?: 'user' | 'recommended';
}

const getRecommendedTickers = (profile: string): string[] => {
  switch (profile) {
    case 'Growth Seeker':
      return ['TSLA', 'NVDA', 'AMZN'];
    case 'Cautious Planner':
      return ['JNJ', 'BRK.B', 'KO'];
    case 'Dividend Hunter':
      return ['T', 'PG', 'O'];
    default:
      return ['AAPL', 'MSFT', 'TSLA'];
  }
};

const Home: React.FC = () => {
  
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

  useEffect(() => {
    const savedStocks = localStorage.getItem('savedStocks');
  
    if (savedStocks && !localStorage.getItem('investorProfileJustSet')) {
      setStocks(JSON.parse(savedStocks));
    } else {
      const storedProfile = localStorage.getItem('investorProfile');
      
      const recommendedTickers = storedProfile ? getRecommendedTickers(storedProfile) : ['AAPL', 'MSFT', 'TSLA'];
  
      const fetchInitialData = async () => {
        const allStocks: StockData[] = JSON.parse(savedStocks || '[]');

        const userStocks = allStocks.filter((s) => s.source !== 'recommended');
        const existingSymbols = new Set(userStocks.map((s) => s.symbol));

        const results: StockData[] = [...userStocks];

        for (const ticker of recommendedTickers) {
          if (!existingSymbols.has(ticker)) {
            try {
              const res = await fetch(`/api/stock/${ticker}`);
              const data = await res.json();
              if (!data.error) {
                data.source = 'recommended';
                results.push(data);
              }
            } catch (err) {
              console.error(`Failed to fetch ${ticker}`, err);
            }
          }
        }

        setStocks(results);
        localStorage.setItem('savedStocks', JSON.stringify(results));
        localStorage.removeItem('investorProfileJustSet');
      };
  
      fetchInitialData();
    }
  }, []);

  const handleSearch = async (symbol: string) => {
    try {
      const res = await fetch(`/api/stock/${symbol}`);
      const data = await res.json();
      if (!data.error && !stocks.find((s) => s.symbol === symbol)) {
        data.source = 'user';
        const updated = [data, ...stocks];
        setStocks(updated);
        localStorage.setItem('savedStocks', JSON.stringify(updated));
      }
    } catch (err) {
      console.error(`Failed to fetch ${symbol}`, err);
    }
  };

  const handleRemove = (symbol: string) => {
    const updated = stocks.filter((stock) => stock.symbol !== symbol);
    setStocks(updated);
    localStorage.setItem('savedStocks', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-12 flex flex-col justify-start items-center">
      {/* Header Section */}
      <div className="w-full max-w-7xl text-center">
        <h1 className="text-4xl font-bold mb-8">AI Stock Insight Tool</h1>
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Stock Card Section */}
      <div className="mt-12 w-full min-w-1000px max-w-8xl px-4 flex justify-center"
      style={{ minWidth: `${windowWidth-95}px` }}>
        {stocks.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-500 text-lg font-medium">
            Search to add Stock Cards
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {stocks.map((stock) => (
              <StockCard key={stock.symbol} data={stock} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;