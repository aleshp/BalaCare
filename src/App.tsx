import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

// Компоненты
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import OnboardingScreen from './components/OnboardingScreen';
import AuthModal from './components/AuthModal'; // Новый импорт

// Страницы
import HomePage from './pages/HomePage';
import LearningPage from './pages/LearningPage';
import SupportPage from './pages/SupportPage';
import CommunityPage from './pages/CommunityPage';
import MarketPage from './pages/MarketPage';
import ProfilePage from './pages/ProfilePage';

const ONBOARDING_KEY = 'balaCareOnboardingSeen';

const AppContent = () => {
  const { session, profile, signOut } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  
  // Состояние для модального окна авторизации
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY) === 'true';
    setOnboardingSeen(seen);
  }, []);

  const handleOnboardingClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingSeen(true);
  };

  const isLoggedIn = !!session;

  // Функция для открытия модалки (передаем в хедер и на страницы)
  const openAuth = () => setAuthModalOpen(true);

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'learn': return <LearningPage />;
      case 'support': return <SupportPage isLoggedIn={isLoggedIn} onLogin={openAuth} />;
      case 'community': return <CommunityPage isLoggedIn={isLoggedIn} onLogin={openAuth} />;
      case 'market': return <MarketPage isLoggedIn={isLoggedIn} onLogin={openAuth} />;
      case 'profile': return <ProfilePage onLogin={openAuth} />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-purple-200">
      
      {!onboardingSeen && <OnboardingScreen onClose={handleOnboardingClose} />}
      
      {/* Модальное окно авторизации */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />

      <div className="max-w-xl mx-auto min-h-screen bg-white shadow-2xl relative">
        <Header 
          isLoggedIn={isLoggedIn} 
          onLogin={openAuth} 
          onLogout={signOut} 
          userProfile={profile}
        />

        <main className="animate-fade-in">
          {renderPage()}
        </main>
        
        <BottomNav 
          currentPath={currentPage} 
          onNavigate={(path) => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setCurrentPage(path);
          }} 
        />
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;