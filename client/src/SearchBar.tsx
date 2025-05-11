// src/components/SearchBar.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SearchBarProps {
  onSearch?: (symbol: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (input.length < 1) return setSuggestions([]);
      try {
        const res = await axios.get(`/api/stock/suggest?q=${input}`);
        setSuggestions(res.data || []);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [input]);

  const handleSearch = (symbol?: string) => {
    const finalSymbol = symbol || input.trim().toUpperCase();
    if (finalSymbol && onSearch) {
      onSearch(finalSymbol);
      setInput('');
      setSuggestions([]);
    }
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto">
      <div className="flex w-full">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter stock symbol (e.g. AAPL)"
          className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none"
        />
        <button
          onClick={() => handleSearch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
        >
          Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-md max-h-60 overflow-y-auto mt-11">
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              onClick={() => handleSearch(s.symbol)}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-left text-sm"
            >
              <span className="font-medium">{s.symbol}</span> — <span className="text-gray-600">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;