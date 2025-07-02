/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';
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

const getRecommendedTickers = (): string[] => {
  try {
    const full = localStorage.getItem('investorProfileFull');
    if (!full) return ['AAPL', 'MSFT', 'TSLA'];
    const parsed = JSON.parse(full);
    return Array.isArray(parsed.recommended_stocks) ? parsed.recommended_stocks : ['AAPL', 'MSFT', 'TSLA'];
  } catch (e) {
    console.error("Failed to parse investorProfileFull:", e);
    return ['AAPL', 'MSFT', 'TSLA'];
  }
};

const Home: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [categoryStocks, setCategoryStocks] = useState<StockData[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(() => {
    const saved = localStorage.getItem('watchlistSymbols');
    const stored = saved ? JSON.parse(saved) : [];
    const recommended = getRecommendedTickers();
    const combined = Array.from(new Set([...stored, ...recommended]));
    localStorage.setItem('watchlistSymbols', JSON.stringify(combined));
    return combined;
  });
  const [loading, setLoading] = useState(false);
  const [showWatchlistNotice, setShowWatchlistNotice] = useState(false);
  const [showDuplicateNotice, setShowDuplicateNotice] = useState(false);
  const [removingSymbols, setRemovingSymbols] = useState<string[]>([]);
  const [justAddedSymbols, setJustAddedSymbols] = useState<string[]>([]);

  const token = localStorage.getItem("jwtToken");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/user-data", { 
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Failed to fetch user data");
        const data = await res.json();
        if (data.profile) {
          localStorage.setItem("investorProfileFull", JSON.stringify(data.profile));
        }
        if (Array.isArray(data.watchlist)) {
          localStorage.setItem("watchlistSymbols", JSON.stringify(data.watchlist));
          setWatchlistSymbols(data.watchlist);
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const fetchCategoryStocks = async () => {
      setLoading(true);
      let symbols: string[] = [];

      if (activeCategory === 'Watchlist') {
        const recommended = getRecommendedTickers();
        const combined = Array.from(new Set([...recommended, ...watchlistSymbols]));
        const results: StockData[] = [];

        for (const symbol of combined) {
          try {
            const url = `http://localhost:3000/api/stock/${symbol}`;
            const res = await fetch(url, { signal });
            const data = await res.json();
            if (!data.error) {
              data.source = recommended.includes(symbol) ? 'recommended' : 'user';
              results.push(data);
            }
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              return;
            }
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
          const url = `http://localhost:3000/api/stock/${symbol}`;
          const res = await fetch(url, { signal });
          const data = await res.json();
          if (!data.error) {
            results.push(data);
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
          console.error(`Failed to fetch ${symbol}`, err);
        }
      }

      setCategoryStocks(results);
      setLoading(false);
    };

    fetchCategoryStocks();
    return () => controller.abort();
  }, [activeCategory]); // watchlistSymbols updates are handled manually via toggleWatchlist/handleSearch

  // Toggle a stock in the persistent watchlist, remove from display if on Watchlist tab and unstarred
  const toggleWatchlist = async (symbol: string) => {
    if (watchlistSymbols.includes(symbol)) {
      setRemovingSymbols((prev) => [...prev, symbol]);
      setTimeout(async () => {
        setWatchlistSymbols((prev) => {
          const updated = prev.filter((s) => s !== symbol);
          localStorage.setItem('watchlistSymbols', JSON.stringify(updated));
          // Backend sync
          (async () => {
            await fetch("http://localhost:3000/api/user-data", {
              method: "POST",
              credentials: 'include',
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify({
                watchlist: updated,
                profile: JSON.parse(localStorage.getItem("investorProfileFull") || "null"),
              }),
            });
          })();
          return updated;
        });
        setCategoryStocks((prev) => prev.filter((s) => s.symbol !== symbol));
        setRemovingSymbols((prev) => prev.filter((s) => s !== symbol));
      }, 300);
    } else {
      const updated = [...watchlistSymbols, symbol];
      setWatchlistSymbols(updated);
      localStorage.setItem('watchlistSymbols', JSON.stringify(updated));
      // Backend sync
      await fetch("http://localhost:3000/api/user-data", {
        method: "POST",
        credentials: 'include',
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          watchlist: updated,
          profile: JSON.parse(localStorage.getItem("investorProfileFull") || "null"),
        }),
      });
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
      const res = await fetch(`http://localhost:3000/api/stock/${symbol}`);
      const data = await res.json();
      if (!data.error) {
        // Trigger AI summary generation
        const shouldAddToWatchlist = !watchlistSymbols.includes(symbol);
        if (shouldAddToWatchlist) {
          const newWatchlist = [...watchlistSymbols, symbol];
          setWatchlistSymbols(newWatchlist);
          localStorage.setItem('watchlistSymbols', JSON.stringify(newWatchlist));
          // Backend sync
          await fetch("http://localhost:3000/api/user-data", {
            method: "POST",
            credentials: 'include',
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              watchlist: newWatchlist,
              profile: JSON.parse(localStorage.getItem("investorProfileFull") || "null"),
            }),
          });
          setJustAddedSymbols((prev) => [...prev, symbol]);
          setTimeout(() => {
            setJustAddedSymbols((prev) => prev.filter((s) => s !== symbol));
          }, 300);
          setShowWatchlistNotice(true);
          setTimeout(() => setShowWatchlistNotice(false), 3000);
        }

        try {
          await fetch(`http://localhost:3000/api/stock/${symbol}/generate-summary`, { method: 'POST' });
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
    <div className={`min-h-screen p-12 flex flex-col justify-start items-center ${
      theme === 'dark'
        ? 'bg-[#262626] text-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.6)]'
        : 'bg-white text-black shadow-lg'
    }`}>
      <div className="w-full max-w-7xl text-center">
        <h1 className="text-4xl font-bold mb-8">MoneyMind Stock Insight Tool</h1>
        <SearchBar theme={theme} onSearch={handleSearch} />
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
                ? theme === 'dark'
                  ? 'bg-black text-white border-gray-600'
                  : 'bg-black text-white border-blue-600'
                : theme === 'dark'
                  ? 'bg-gray-950 text-gray-400 border-[#3a3a3a]'
                  : 'bg-gray-950 text-gray-500 border-gray-300'
            } hover:shadow`}
            style={{
                outline: 'none',
                boxShadow: 'none',
                border: 'none',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-12 w-full min-w-1000px max-w-8xl px-4 flex justify-center"
        style={{ minWidth: `${windowWidth - 95}px` }}>
        {loading ? (
          <div className={`h-52 flex items-center justify-center text-lg font-medium ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Loading stock data...
          </div>
        ) : stocksToDisplay.length === 0 ? (
          <div className={`h-52 flex items-center justify-center text-lg font-medium ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
          }`}>
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
                    theme={theme}
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