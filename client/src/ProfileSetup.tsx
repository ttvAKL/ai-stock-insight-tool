import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Question {
  question: string;
  options: string[];
}

const questions: Question[] = [
  {
    question: "What's your risk tolerance?",
    options: ['Low', 'Medium', 'High'],
  },
  {
    question: "What's your investment goal?",
    options: ['Long-term growth', 'Quick profits', 'Steady income'],
  },
  {
    question: "What sector interests you the most?",
    options: ['Tech', 'Energy', 'Healthcare', 'Finance'],
  },
  {
    question: "How do you feel about market volatility?",
    options: ["Hate it", "It's fine", "Love the thrill"],
  },
  {
    question: "What kind of companies do you prefer?",
    options: ['Giants (e.g., Apple)', 'Underdogs (Startups)', 'Cash cows (Dividend payers)'],
  },
];

const ProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const [result, setResult] = useState<string | null>(localStorage.getItem('investorProfile'));

  const handleChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    const scores = {
      'Growth Seeker': 0,
      'Cautious Planner': 0,
      'Dividend Hunter': 0,
    };

    answers.forEach((answer) => {
      if (['High', 'Quick profits', 'Tech', 'Love the thrill', 'Underdogs (Startups)'].includes(answer)) {
        scores['Growth Seeker']++;
      } else if (['Low', 'Steady income', 'Finance', 'Hate it', 'Cash cows (Dividend payers)'].includes(answer)) {
        scores['Cautious Planner']++;
      } else {
        scores['Dividend Hunter']++;
      }
    });

    const topPersona = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    setResult(topPersona);
    localStorage.setItem('investorProfile', topPersona);
    localStorage.setItem('investorProfileJustSet', 'true');
    navigate('/onboarding/complete');
  };

  const handleRetake = () => {
    localStorage.removeItem('investorProfile');
    setResult(null);
    setAnswers(Array(questions.length).fill(''));
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-100 p-6" style={{ width: `${document.documentElement.clientWidth}px` }}>
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Investor Profile Quiz</h1>
        {result ? (
          <div className="bg-white p-6 rounded shadow-md text-center">
            <h2 className="text-xl font-semibold mb-4">You're a {result}!</h2>
            <p className="text-gray-700">
              {result === 'Growth Seeker' && 'You love taking risks for high rewards and gravitate toward fast-moving sectors.'}
              {result === 'Cautious Planner' && 'You value stability and prefer steady, long-term investments.'}
              {result === 'Dividend Hunter' && 'You seek consistent income and reliable companies with strong fundamentals.'}
            </p>
            <button
              onClick={handleRetake}
              className="mt-6 px-4 py-2 bg-gray-200 text-white rounded hover:bg-gray-300"
            >
              Retake Quiz
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="w-full max-w-xl bg-white p-6 rounded shadow-md">
            {questions.map((q, index) => (
              <div key={index} className="mb-6">
                <p className="font-medium mb-2">{q.question}</p>
                <div className="flex flex-col gap-2">
                  {q.options.map((option) => (
                    <label key={option} className="inline-flex items-center">
                      <input
                        type="radio"
                        name={`q-${index}`}
                        value={option}
                        checked={answers[index] === option}
                        onChange={() => handleChange(index, option)}
                        className="mr-2"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="submit"
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={answers.includes('')}
            >
              See My Investor Type
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;
