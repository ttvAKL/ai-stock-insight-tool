import React from 'react';
import { useNavigate } from 'react-router-dom';

const OnboardingWelcome: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/profile');
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-white p-8">
      <h1 className="text-4xl font-bold mb-4 text-gray-900">Welcome to AI Stock Insight</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-md">
        We'll help you build smarter investments with personalized insights. Let's start by understanding your investor personality.
      </p>
      <button
        onClick={handleStart}
        className="px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg shadow hover:bg-blue-700 transition"
      >
        Start
      </button>
    </div>
  );
};

export default OnboardingWelcome;
