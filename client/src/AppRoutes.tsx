import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './Home';
import ProfileSetup from './ProfileSetup';
import OnboardingWelcome from './OnboardingWelcome';
import OnboardingComplete from './OnboardingComplete';
import StockDetail from './StockDetail';

const AppRoutes: React.FC = () => {
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
    console.log(token)

    const checkUserData = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/user-data", {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`   // ← this is what was missing
          }
        });
        const data = await res.json();

        if (data.profile) {
          localStorage.setItem("investorProfile", data.profile.type);
          localStorage.setItem("investorProfileFull", JSON.stringify(data.profile));
          // No redirect needed; user can access app normally
        } else if (location.pathname !== "/profile") {
          navigate("/profile");
          console.log(data.profile);
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
      <Route path='/' element={<Home />} />
      <Route path='/profile' element={<ProfileSetup />} />
      <Route path='/onboarding' element={<OnboardingWelcome />} />
      <Route path='/onboarding/complete' element={<OnboardingComplete />} />
      <Route path='/stock/:symbol' element={<StockDetail />} />
    </Routes>
  );
};

export default AppRoutes;