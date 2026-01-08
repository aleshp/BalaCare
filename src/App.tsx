import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Компоненты
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import OnboardingScreen from './components/OnboardingScreen';
import AuthModal from './components/AuthModal';

// Страницы
import HomePage from './pages/HomePage';
import LearningPage from './pages/LearningPage';
import SupportPage from './pages/SupportPage';
import CommunityPage from './pages/CommunityPage';
import MarketPage from './pages/MarketPage';
import ProfilePage from './pages/ProfilePage';

const ONBOARDING_KEY = 'balaCareOnboardingSeen';

const AppContent = () => {
  // Теперь берем состояние окна и функции из контекста
  const { isAuthModalOpen, closeAuthModal } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY) === 'true';
    setOnboardingSeen(seen);
  }, []);

  const handleOnboardingClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingSeen(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-purple-200">
      
      {!onboardingSeen && <OnboardingScreen onClose={handleOnboardingClose} />}
      
      {/* Модальное окно теперь управляется через Context */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />

      <div className="max-w-xl mx-auto min-h-screen bg-white shadow-2xl relative">
        <Header />

        <main className="animate-fade-in">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/learn" element={<LearningPage />} />
            {/* Убрали проп onLogin, страницы сами разберутся */}
            <Route path="/support" element={<SupportPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        
        <BottomNav /> 
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;