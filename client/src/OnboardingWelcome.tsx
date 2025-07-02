import React from 'react';


const OnboardingWelcome: React.FC<{ theme: "light" | "dark" }> = ({ theme }) => {


  const handleStart = () => {
    window.location.href = '${import.meta.env.VITE_API_URL}/auth/google';
  };

  return (
    <div className={`min-h-screen w-screen flex flex-col items-center justify-center p-8 text-center ${
      theme === "dark" ? "bg-[#1e1e1e] text-white" : "bg-white text-black"
    }`}>
      <h1 className={`text-5xl font-extrabold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Welcome to MoneyMind Stock Insight</h1>
      <p className={`text-xl mb-8 max-w-2xl ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
        Your personalized stock advisor, powered by AI. Our platform combines smart algorithms with your investor profile to deliver actionable insights, intelligent recommendations, and beautifully visualized data — all in one place.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mb-12">
        <div className={`${theme === "dark" ? "bg-[#2b2b2b] text-white" : "bg-gray-50 text-black"} rounded-lg p-6 shadow hover:shadow-md transition`}>
          <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>Smart Recommendations</h3>
          <p className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
            Receive stock picks tailored to your goals, risk tolerance, and market trends — powered by machine learning.
          </p>
        </div>
        <div className={`${theme === "dark" ? "bg-[#2b2b2b] text-white" : "bg-gray-50 text-black"} rounded-lg p-6 shadow hover:shadow-md transition`}>
          <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>Real-Time Visuals</h3>
          <p className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
            Interactive charts and clear breakdowns help you understand market movements at a glance.
          </p>
        </div>
        <div className={`${theme === "dark" ? "bg-[#2b2b2b] text-white" : "bg-gray-50 text-black"} rounded-lg p-6 shadow hover:shadow-md transition`}>
          <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>AI-Powered Insights</h3>
          <p className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
            Let our GPT-powered summaries and alerts keep you ahead of market changes — so you never miss a beat.
          </p>
        </div>
      </div>

      <button
        onClick={handleStart}
        className={`px-6 py-2 text-lg font-semibold rounded transition duration-300 flex items-center gap-2 ${
          theme === "dark"
            ? "bg-[#2a2a2a] border border-gray-600 text-white hover:bg-[#3a3a3a]"
            : "bg-[#f7f7f7] border border-gray-300 text-black hover:bg-gray-200"
        }`}
        style={{
                outline: 'none',
                boxShadow: 'none',
                border: 'none',
        }}
      >
        Get Started <span className="text-xl">→</span>
      </button>
    </div>
  );
};

export default OnboardingWelcome;
