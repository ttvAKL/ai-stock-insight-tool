import React, { useState, useEffect } from 'react';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';
import AppRoutes from './AppRoutes';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) return savedTheme;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultTheme = prefersDark ? 'dark' : 'light';
      fetch('${import.meta.env.VITE_API_URL}/api/user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ theme: defaultTheme }),
      }).catch((err) => console.error('[Initial Theme Save Error]', err));
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    fetch('${import.meta.env.VITE_API_URL}/api/user-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ theme: newTheme }),
    }).catch((err) => console.error('[Theme Toggle Save Error]', err));
  };

  return (
    <BrowserRouter>
      <Navbar theme={theme} onToggleTheme={handleThemeToggle} />
      <AppRoutes theme={theme} />
    </BrowserRouter>
  );
};

export default App;