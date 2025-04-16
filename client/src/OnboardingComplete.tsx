import React from 'react';
import { useNavigate } from 'react-router-dom';

const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();

  const handleFinish = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-white p-8">
      <h1 className="text-4xl font-bold mb-4 text-gray-900">🎉 You're All Set!</h1>
      <p className="text-lg text-gray-700 mb-6 text-center max-w-md">
        Your investor profile has been saved. You'll now see stock recommendations tailored just for you.
      </p>
      <button
        onClick={handleFinish}
        className="px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg shadow hover:bg-blue-700 transition"
      >
        Go to Dashboard
      </button>
    </div>
  );
};

export default OnboardingComplete;
