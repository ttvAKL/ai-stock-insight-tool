import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './Home';
import ProfileSetup from './ProfileSetup';
import OnboardingWelcome from './OnboardingWelcome';
import OnboardingComplete from './OnboardingComplete';

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const profile = localStorage.getItem('investorProfile');
    if (
        !profile &&
        !['/onboarding', '/profile', '/onboarding/complete'].includes(location.pathname)
      ) {
      navigate('/onboarding');
    }
  }, [location, navigate]);

  return (
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/profile' element={<ProfileSetup />} />
      <Route path='/onboarding' element={<OnboardingWelcome />} />
      <Route path='/onboarding/complete' element={<OnboardingComplete />} />
    </Routes>
  );
};

export default AppRoutes;