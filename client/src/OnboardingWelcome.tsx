import React from 'react';


const OnboardingWelcome: React.FC = () => {


  const handleStart = () => {
    window.location.href = 'http://localhost:3000/auth/google';
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-white p-8 text-center">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-4">Welcome to AI Stock Insight</h1>
      <p className="text-xl text-gray-700 mb-8 max-w-2xl">
        Your personalized stock advisor, powered by AI. Our platform combines smart algorithms with your investor profile to deliver actionable insights, intelligent recommendations, and beautifully visualized data — all in one place.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mb-12">
        <div className="bg-gray-50 rounded-lg p-6 shadow hover:shadow-md transition">
          <h3 className="text-lg font-semibold text-blue-600 mb-2">Smart Recommendations</h3>
          <p className="text-gray-600">
            Receive stock picks tailored to your goals, risk tolerance, and market trends — powered by machine learning.
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-6 shadow hover:shadow-md transition">
          <h3 className="text-lg font-semibold text-blue-600 mb-2">Real-Time Visuals</h3>
          <p className="text-gray-600">
            Interactive charts and clear breakdowns help you understand market movements at a glance.
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-6 shadow hover:shadow-md transition">
          <h3 className="text-lg font-semibold text-blue-600 mb-2">AI-Powered Insights</h3>
          <p className="text-gray-600">
            Let our GPT-powered summaries and alerts keep you ahead of market changes — so you never miss a beat.
          </p>
        </div>
      </div>

      <button
        onClick={handleStart}
        className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition"
      >
        Get Started
      </button>
    </div>
  );
};

export default OnboardingWelcome;
