import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white shadow-md p-4 w-full flex justify-between items-center">
      <div className="text-xl font-bold text-blue-600">Stock Insight</div>
      <div className="space-x-6">
        <Link to="/" className="text-gray-700 hover:text-blue-600">Home</Link>
        <Link to="/profile" className="text-gray-700 hover:text-blue-600">Profile Setup</Link>
        {/* Future: <Link to="/watchlist" className="text-gray-700 hover:text-blue-600">Watchlist</Link> */}
      </div>
    </nav>
  );
};

export default Navbar;
