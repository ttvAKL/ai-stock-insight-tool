import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css'; // or a global CSS file if using one
import StockCard from './StockCard';
import SearchBar from './SearchBar';
import STARTER_PACKS from './StarterPacks';

const CATEGORIES = ['Watchlist', 'Popular', 'Blue Chips', 'Growth Picks', 'Dividend Payers', 'Value Stocks'];

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

const Home: React.FC = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [categoryStocks, setCategoryStocks] = useState<StockData[]>([]);
  // Persistent watchlist symbols in localStorage, prefill with recommended stocks
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(() => {
    const saved = localStorage.getItem('watchlistSymbols');
    const stored = saved ? JSON.parse(saved) : [];
    const profile = localStorage.getItem('investorProfile');
    const recommended = profile ? getRecommendedTickers(profile) : ['AAPL', 'MSFT', 'TSLA'];
    const combined = Array.from(new Set([...stored, ...recommended]));
    localStorage.setItem('watchlistSymbols', JSON.stringify(combined));
    return combined;
  });
  const [loading, setLoading] = useState(false);
  const [showWatchlistNotice, setShowWatchlistNotice] = useState(false);
  const [showDuplicateNotice, setShowDuplicateNotice] = useState(false);
  const [removingSymbols, setRemovingSymbols] = useState<string[]>([]);
  const [justAddedSymbols, setJustAddedSymbols] = useState<string[]>([]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchCategoryStocks = async () => {
      setLoading(true);
      let symbols: string[] = [];

      if (activeCategory === 'Watchlist') {
        const profile = localStorage.getItem('investorProfile');
        const recommended = profile ? getRecommendedTickers(profile) : ['AAPL', 'MSFT', 'TSLA'];
        const combined = Array.from(new Set([...recommended, ...watchlistSymbols]));
        const results: StockData[] = [];

        for (const symbol of combined) {
          try {
            const url = `/api/stock/${symbol}`;
            const res = await fetch(url);
            const data = await res.json();
            if (!data.error) {
              data.source = recommended.includes(symbol) ? 'recommended' : 'user';
              results.push(data);
            }
          } catch (err) {
            console.error(`Failed to fetch ${symbol}`, err);
          }
        }

        setCategoryStocks(results);
        setLoading(false);
        return;
      }
      
      symbols = STARTER_PACKS[activeCategory];

      const results: StockData[] = [];
      for (const symbol of symbols) {
        try {
          const url = `/api/stock/${symbol}`;
          const res = await fetch(url);
          const data = await res.json();
          if (!data.error) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  // Toggle a stock in the persistent watchlist, remove from display if on Watchlist tab and unstarred
  const toggleWatchlist = (symbol: string) => {
    if (watchlistSymbols.includes(symbol)) {
      setRemovingSymbols((prev) => [...prev, symbol]);
      setTimeout(() => {
        setWatchlistSymbols((prev) => {
          const updated = prev.filter((s) => s !== symbol);
          localStorage.setItem('watchlistSymbols', JSON.stringify(updated));
          return updated;
        });
        setCategoryStocks((prev) => prev.filter((s) => s.symbol !== symbol));
        setRemovingSymbols((prev) => prev.filter((s) => s !== symbol));
      }, 300);
    } else {
      const updated = [...watchlistSymbols, symbol];
      setWatchlistSymbols(updated);
      localStorage.setItem('watchlistSymbols', JSON.stringify(updated));
      setJustAddedSymbols((prev) => [...prev, symbol]);
      setTimeout(() => {
        setJustAddedSymbols((prev) => prev.filter((s) => s !== symbol));
      }, 300);
      setShowWatchlistNotice(true);
      setTimeout(() => setShowWatchlistNotice(false), 3000);
    }
  };

  // Handle searching for a stock and update lists accordingly
  const handleSearch = async (symbol: string) => {
    if (watchlistSymbols.includes(symbol)) {
      setShowDuplicateNotice(true);
      setTimeout(() => setShowDuplicateNotice(false), 3000);
      return;
    }
    try {
      const res = await fetch(`/api/stock/${symbol}`);
      const data = await res.json();
      if (!data.error) {
        // Trigger AI summary generation
        const shouldAddToWatchlist = !watchlistSymbols.includes(symbol);
        if (shouldAddToWatchlist) {
          const newWatchlist = [...watchlistSymbols, symbol];
          setWatchlistSymbols(newWatchlist);
          localStorage.setItem('watchlistSymbols', JSON.stringify(newWatchlist));
          setJustAddedSymbols((prev) => [...prev, symbol]);
          setTimeout(() => {
            setJustAddedSymbols((prev) => prev.filter((s) => s !== symbol));
          }, 300);
          setShowWatchlistNotice(true);
          setTimeout(() => setShowWatchlistNotice(false), 3000);
        }

        try {
          await fetch(`/api/stock/${symbol}/generate-summary`, { method: 'POST' });
        } catch (summaryError) {
          console.error(`Failed to generate summary for ${symbol}`, summaryError);
        }

        if (activeCategory === 'Watchlist' && !categoryStocks.find((s) => s.symbol === symbol)) {
          const updated = [...categoryStocks, data];
          setCategoryStocks(updated);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${symbol}`, err);
    }
  };

  // Show only stocks in combined watchlist+recommended if on Watchlist tab, otherwise all
  const stocksToDisplay = activeCategory === 'Watchlist'
    ? categoryStocks
    : categoryStocks;

  return (
    <div className="min-h-screen bg-gray-100 p-12 flex flex-col justify-start items-center">
      <div className="w-full max-w-7xl text-center">
        <h1 className="text-4xl font-bold mb-8">AI Stock Insight Tool</h1>
        <SearchBar onSearch={handleSearch} />
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded shadow-md text-sm z-50 transition-opacity duration-500 ${
            showWatchlistNotice ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Stock added to your Watchlist
        </div>
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-800 px-4 py-2 rounded shadow-md text-sm z-50 transition-opacity duration-500 ${
            showDuplicateNotice ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Stock already added to your Watchlist
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full border ${
              activeCategory === cat
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-500 border-gray-300'
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
        ) : stocksToDisplay.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-500 text-lg font-medium">
            No stocks found in this category.
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            <AnimatePresence>
              {stocksToDisplay.map((stock) => (
                <motion.div
                  key={stock.symbol}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`transform ${
                    removingSymbols.includes(stock.symbol)
                      ? 'opacity-0 scale-95'
                      : justAddedSymbols.includes(stock.symbol)
                      ? 'opacity-0 scale-95'
                      : 'opacity-100 scale-100'
                  }`}
                >
                  <StockCard
                    data={stock as Required<StockData>}
                    isInWatchlist={watchlistSymbols.includes(stock.symbol)}
                    onToggleWatchlist={() => toggleWatchlist(stock.symbol)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;