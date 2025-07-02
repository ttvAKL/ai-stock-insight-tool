import React from 'react';
import { Link } from 'react-router-dom';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

interface NavbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme }) => {
  return (
    <nav className={`p-4 w-full flex justify-between items-center 
      ${theme === 'dark'
        ? 'bg-[#1e1e1e] shadow-[0_1px_4px_rgba(0,0,0,0.6)] text-gray-200'
        : 'bg-gray-100 shadow-md text-gray-800'
      }`}>
      <div className="text-xl font-bold">MoneyMind</div>
      <div className="space-x-6 flex items-center">
        <button
          onClick={onToggleTheme}
          className="p-1 rounded-full text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-0"
          aria-label="Toggle dark mode"
          style={{
            background: 'transparent',
            outline: 'none',
            boxShadow: 'none',
            border: 'none'
          }}
        >
          {theme === 'light' ? (
            <SunIcon className="h-6 w-6" />
          ) : (
            <MoonIcon className="h-6 w-6" />
          )}
        </button>
        <Link
          to="/"
          className={`hover:underline transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:text-white'
              : 'text-gray-600 hover:text-black'
          }`}
        >
          Home
        </Link>
        <Link
          to="/profile"
          className={`hover:underline transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:text-white'
              : 'text-gray-600 hover:text-black'
          }`}
        >
          Profile
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
