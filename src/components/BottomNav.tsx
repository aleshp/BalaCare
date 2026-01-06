import React from 'react';
import { Home, BookOpen, Heart, Users, ShoppingBag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom'; // Импортируем хуки

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Определяем текущий активный путь
  const currentPath = location.pathname;

  const navItems = [
    { path: '/', label: 'Главная', Icon: Home },
    { path: '/learn', label: 'Учёба', Icon: BookOpen },
    { path: '/support', label: 'Помощь', Icon: Heart },
    { path: '/community', label: 'Чат', Icon: Users },
    { path: '/market', label: 'Маркет', Icon: ShoppingBag },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-40 pb-safe pt-2 px-2 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center max-w-2xl mx-auto h-[60px] pb-2">
        {navItems.map((item) => {
          // Проверка активности (сравнение путей)
          const isActive = currentPath === item.path;
          const isCenter = item.path === '/support';
          
          if (isCenter) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative -top-6 flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  isActive 
                    ? 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white ring-4 ring-white' 
                    : 'bg-white text-pink-500 ring-4 ring-gray-50'
                }`}
              >
                <item.Icon className="w-7 h-7" strokeWidth={2.5} />
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 w-16 py-1 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'text-purple-600' 
                  : 'text-gray-400 hover:text-purple-400'
              }`}
            >
              <div className={`relative transition-transform duration-300 ${isActive ? '-translate-y-1' : ''}`}>
                <item.Icon className={`w-6 h-6 ${isActive ? 'fill-current opacity-20' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && <item.Icon className="w-6 h-6 absolute top-0 left-0" strokeWidth={2.5} />}
              </div>
              <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'opacity-100' : 'opacity-0 scale-0'} transition-all duration-300 absolute -bottom-1`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;