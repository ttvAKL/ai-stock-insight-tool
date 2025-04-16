// src/components/SearchBar.tsx
import React, { useState } from 'react';

interface SearchBarProps {
  onSearch?: (symbol: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [input, setInput] = useState('');

  const handleSearch = () => {
    if (input.trim() && onSearch) {
      onSearch(input.trim().toUpperCase());
      setInput('');
    }
  };

  return (
    <div className="flex justify-center">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter stock symbol (e.g. AAPL)"
        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none"
      />
      <button
        onClick={handleSearch}
        className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
      >
        Add
      </button>
    </div>
  );
};

export default SearchBar;