import React, { useEffect, useState } from 'react';
import StockCard from './StockCard';
import SearchBar from './SearchBar';
import STARTER_PACKS from './StarterPacks';

const CATEGORIES = ['Recommended', 'Popular', 'Blue Chips', 'Growth Picks', 'Dividend Payers', 'Value Stocks'];

const getRecommendedTickers = (profile: string): string[] => {
  switch (profile) {
    case 'Growth Seeker':
      return ['TSLA', 'NVDA', 'AMZN'];
    case 'Cautious Planner':
      return ['JNJ', 'VZ', 'KO'];
    case 'Dividend Hunter':
      return ['T', 'PG', 'O'];
    default:
      return ['AAPL', 'MSFT', 'TSLA'];
  }
};

interface StockData {
  symbol: string;
  name?: string;
  date?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
  summary?: string[];
  source?: 'user' | 'recommended';
  categoryTags?: string[];
}

const Home: React.FC = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [categoryStocks, setCategoryStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchCategoryStocks = async () => {
      setLoading(true);
      let symbols: string[] = [];

      if (activeCategory === 'Recommended') {
        const profile = localStorage.getItem('investorProfile');
        symbols = profile ? getRecommendedTickers(profile) : ['AAPL', 'MSFT', 'TSLA'];
        console.log("Stored investor profile:", profile);
        console.log("Recommended tickers:", symbols);
      } else {
        symbols = STARTER_PACKS[activeCategory];
      }
      
      const results: StockData[] = [];

      for (const symbol of symbols) {
        try {
          const url = activeCategory === 'Recommended' ? `/api/stock/${symbol}?source=recommended` : `/api/stock/${symbol}`;
          const res = await fetch(url);
          const data = await res.json();
          if (!data.error) {
            if (activeCategory === 'Recommended') {
              data.source = 'recommended';
            }
            results.push(data);
          }
        } catch (err) {
          console.error(`Failed to fetch ${symbol}`, err);
        }
      }

      setCategoryStocks(results);
      setLoading(false);
    };

    fetchCategoryStocks();
  }, [activeCategory]);

  const handleSearch = async (symbol: string) => {
    try {
      const res = await fetch(`/api/stock/${symbol}`);
      const data = await res.json();
      if (!data.error && !categoryStocks.find((s) => s.symbol === symbol)) {
        setCategoryStocks((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error(`Failed to fetch ${symbol}`, err);
    }
  };

  const handleRemove = (symbol: string) => {
    setCategoryStocks((prev) => prev.filter((stock) => stock.symbol !== symbol));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-12 flex flex-col justify-start items-center">
      <div className="w-full max-w-7xl text-center">
        <h1 className="text-4xl font-bold mb-8">AI Stock Insight Tool</h1>
        <SearchBar onSearch={handleSearch} />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full border ${
              activeCategory === cat
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            } hover:shadow`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-12 w-full min-w-1000px max-w-8xl px-4 flex justify-center"
        style={{ minWidth: `${windowWidth - 95}px` }}>
        {loading ? (
          <div className="h-52 flex items-center justify-center text-gray-500 text-lg font-medium">
            Loading stock data...
          </div>
        ) : categoryStocks.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-500 text-lg font-medium">
            No stocks found in this category.
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {categoryStocks.map((stock) => (
              <StockCard key={stock.symbol} data={stock as Required<StockData>} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;