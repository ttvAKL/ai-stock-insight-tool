// src/components/SearchBar.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SearchBarProps {
  onSearch?: (symbol: string) => void;
  theme?: 'light' | 'dark';
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, theme }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
  const [showList, setShowList] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (input.length < 1) return setSuggestions([]);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/stock/suggest?q=${input}`);
        setSuggestions(res.data || []);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [input]);

  useEffect(() => {
    setShowList(isFocused && suggestions.length > 0);
  }, [suggestions, isFocused]);

  const handleSearch = (symbol?: string) => {
    const finalSymbol = symbol || input.trim().toUpperCase();
    if (finalSymbol && onSearch) {
      onSearch(finalSymbol);
      setInput('');
      setSuggestions([]);
    }
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto peer">
      <div className="relative w-full">
        <input
          key={theme}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder=" "
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className={`peer w-full bg-transparent border-b-2 px-2 pt-6 pb-2 text-lg placeholder-transparent focus:outline-none transition-colors ${
            theme === 'dark'
              ? 'border-gray-600 text-white focus:border-white'
              : 'border-gray-400 text-gray-800 focus:border-gray-800'
          }`}
        />
        <label
          className={`pointer-events-none absolute left-2 top-2 text-xs transition-all duration-200 transform scale-90 origin-left peer-placeholder-shown:top-7 peer-placeholder-shown:text-sm peer-placeholder-shown:scale-100 ${
            theme === 'dark'
              ? 'text-gray-400 peer-focus:text-white'
              : 'text-gray-500 peer-focus:text-gray-800'
          }`}
        >
          Search stock symbol (e.g. AAPL)
        </label>
      </div>
      <ul
        className={`absolute z-10 left-0 right-0 top-full translate-y-[-2px] border rounded-b-md max-h-60 overflow-y-auto origin-top transform transition-transform duration-300 bg-white backdrop-blur-md border-gray-200 text-black ${
          showList ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
        }`}
      >
        {suggestions.map((s, idx) => (
          <li
            key={idx}
            onClick={() => handleSearch(s.symbol)}
            className="px-4 py-3 cursor-pointer text-left text-sm transition-colors hover:bg-gray-100"
          >
            <span className="font-medium">{s.symbol}</span> —{' '}
            <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
              {s.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchBar;