import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';
import AppRoutes from './AppRoutes';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;