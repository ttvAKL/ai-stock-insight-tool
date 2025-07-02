import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './Home';
import Profile from './Profile';
import OnboardingWelcome from './OnboardingWelcome';
import StockDetail from './StockDetail';

interface AppRoutesProps {
  theme: 'light' | 'dark';
}

const AppRoutes: React.FC<AppRoutesProps> = ({ theme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("jwtToken", token);
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');

    const checkUserData = async () => {
      try {
        const res = await fetch("${import.meta.env.VITE_API_URL}/api/user-data", {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();

        if (res.status === 401 && data.error === "token_expired") {
          window.location.href = "${import.meta.env.VITE_API_URL}/api/login/google";
          return;
        }

        if (data.profile) {
          localStorage.setItem("investorProfile", data.profile.type);
          localStorage.setItem("investorProfileFull", JSON.stringify(data.profile));
        } else if (location.pathname !== "/profile") {
          navigate("/profile");
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      } finally {
        setLoading(false);
      }
    };

    const publicPaths = ["/onboarding", "/auth/google", "/auth/google/callback"];
    if (!token) {
      if (!publicPaths.includes(location.pathname)) {
        navigate("/onboarding");
      }
      setLoading(false);
    } else {
      checkUserData();
    }
  }, [location, navigate]);

  if (loading) return null;

  return (
    <Routes>
      <Route path='/' element={<Home theme={theme} />} />
      <Route path='/profile' element={<Profile theme={theme} />} />
      <Route path='/onboarding' element={<OnboardingWelcome theme={theme}/>} />
      <Route path='/stock/:symbol' element={<StockDetail />} />
    </Routes>
  );
};

export default AppRoutes;