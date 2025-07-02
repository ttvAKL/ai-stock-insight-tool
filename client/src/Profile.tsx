import React, { useEffect, useState } from 'react';
import { FiLogOut } from 'react-icons/fi';


interface Question {
  question: string;
  options: string[];
}

const questions: Question[] = [
  {
    question: "How comfortable are you with losing money in the short term for potential long-term gains?",
    options: ['1 (Not at all)', '2', '3', '4', '5 (Very comfortable)'],
  },
  {
    question: "How important is a steady stream of income from your investments?",
    options: ['1 (Not important)', '2', '3', '4', '5 (Very important)'],
  },
  {
    question: "How much do you care about investing in emerging technologies or startups?",
    options: ['1 (Not interested)', '2', '3', '4', '5 (Very interested)'],
  },
  {
    question: "How would you rate your reaction to market volatility?",
    options: ['1 (Very anxious)', '2', '3', '4', '5 (Excited)'],
  },
  {
    question: "How long do you typically plan to hold investments?",
    options: ['1 (A few weeks)', '2', '3', '4', '5 (5+ years)'],
  },
];

interface InvestorProfile {
  type: string;
  type_description: string;
  recommended_stocks: string[];
  stock_rationale: string;
  tips?: string;
}

const Profile: React.FC<{ theme: "light" | "dark" }> = ({ theme }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(0));
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

  // Capture JWT token from URL and store in localStorage
  useEffect(() => {
    const match = window.location.href.match(/token=([^&]+)/);
    const token = match ? match[1] : null;
    console.log("Token from URL:", token);

    if (token) {
      localStorage.setItem("jwtToken", token);
    }
  }, []);

  // Prefill profile from localStorage (or backend if needed)
  useEffect(() => {
    const saved = localStorage.getItem("investorProfileFull");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
      } catch (err) {
        console.error("Failed to parse investorProfileFull:", err);
      }
    }
  }, []);

  const handleChange = (index: number, value: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("${import.meta.env.VITE_API_URL}/api/investor-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) throw new Error("Failed to fetch investor profile");

      const data = await response.json();

      setProfile(data);
      localStorage.setItem("investorProfile", data.type);
      localStorage.setItem("investorProfileFull", JSON.stringify(data));
      await fetch("${import.meta.env.VITE_API_URL}/api/user-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwtToken") || ""}`,
        },
        body: JSON.stringify({
          profile: data,
          watchlist: data.recommended_stocks || []
        })
      });
      localStorage.setItem("investorProfileJustSet", "true");
      setLoading(false);
    } catch (err) {
      console.error("Error determining profile:", err);
      setLoading(false);
    }
  };

  const handleRetake = () => {
    localStorage.removeItem('investorProfile');
    setProfile(null);
    setAnswers(Array(questions.length).fill(0));
    setCurrentIndex(0);
  };

  return (
    <div>
      <div
        className={`${
          theme === "dark"
            ? "bg-[#1e1e1e] text-gray-100"
            : "bg-gray-100 text-black"
        } min-h-screen w-full max-w-7xl mx-auto flex flex-col items-center justify-center py-4 px-6`}
        style={{ minWidth: `${Math.min(windowWidth, 1536)}px` }}
      >
        <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Investor Profile Quiz</h1>
        {profile ? (
          <>
          <div
            className={`${
              theme === "dark"
                ? "bg-[#2a2a2a] text-gray-100"
                : "bg-white text-black"
            } p-6 rounded shadow-md text-center space-y-4`}
          >
            <h2 className="text-2xl font-bold mb-2">You're a {profile.type}</h2>
            <p className={theme === "dark" ? "text-gray-200" : "text-gray-700"}>
              {profile.type_description}
            </p>
            <div>
              <h3 className="font-semibold">Recommended Stocks:</h3>
              <p>{profile.recommended_stocks.join(", ")}</p>
            </div>
            <div>
              <h3 className="font-semibold">Why These Stocks:</h3>
              <p>{profile.stock_rationale}</p>
            </div>
            {profile.tips && (
              <div>
                <h3 className="font-semibold">Tips:</h3>
                <p>{profile.tips}</p>
              </div>
            )}
            <button
              onClick={handleRetake}
              className={`mt-6 px-4 py-2 rounded ${
                theme === "dark"
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-gray-200 text-black hover:bg-gray-300"
              }`}
              style={{
                outline: 'none',
                boxShadow: 'none',
                border: 'none'
              }}
            >
              Retake Quiz
            </button>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/onboarding";
              }}
              className="group relative flex items-center justify-center"
              style={{ outline: "none", border: "none" }}
            >
              <FiLogOut
                className={`transform transition-transform duration-300 ${
                  theme === "dark" ? "text-white" : "text-black"
                } group-hover:-translate-x-3 group-hover:text-red-600`}
                size={24}
              />
              <span
                className="absolute left-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-red-600 text-sm font-medium"
              >
                Log Out
              </span>
            </button>
          </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="w-full max-w-xl mx-auto"
          >
            <div
              className={`${
                theme === "dark" ? "bg-gray-700" : "bg-gray-200"
              } w-full rounded-full h-2 mb-6`}
            >
              <div
                className="bg-blue-600 h-2 rounded-full transition-width duration-300"
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>

            <div
              className={`${
                theme === "dark"
                  ? "bg-[#2a2a2a] text-gray-100"
                  : "bg-white text-black"
              } p-6 rounded-lg shadow-md`}
            >
              <p className="font-medium mb-4 text-lg">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <p className="font-semibold mb-4">
                {questions[currentIndex].question}
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                {questions[currentIndex].options.map((option, i) => (
                  <label
                    key={i}
                    className={`cursor-pointer px-4 py-2 border rounded-full transition ${
                      answers[currentIndex] === i + 1
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : `${
                            theme === "dark"
                              ? "bg-[#1e1e1e] text-gray-300 border-gray-600 hover:bg-[#2a2a2a]"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                          }`
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentIndex}`}
                      value={i + 1}
                      checked={answers[currentIndex] === i + 1}
                      onChange={() => handleChange(currentIndex, i + 1)}
                      className="hidden"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              {currentIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className={`px-6 py-2 rounded ${
                    theme === "dark"
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-300 text-black hover:bg-gray-400"
                  }`}
                >
                  Previous
                </button>
              ) : (
                <div />
              )}

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  disabled={answers[currentIndex] === 0}
                  className={`px-6 py-2 rounded ${
                    theme === "dark"
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } disabled:opacity-50`}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={answers.includes(0) || loading}
                  className={`px-6 py-2 rounded flex items-center gap-2 ${
                    loading
                      ? theme === "dark"
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-gray-400 cursor-not-allowed"
                      : theme === "dark"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                  ) : (
                    "Submit Quiz"
                  )}
                </button>
              )}
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
