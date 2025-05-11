// Suppress Lightweight Charts "Object is disposed" error in production
window.addEventListener("error", (e) => {
  if (e.message && e.message.includes("Object is disposed")) {
    e.preventDefault();
  }
});
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
