import React from 'react';
import { LogOut, User } from 'lucide-react';
import { Database } from '../types/supabase';
import { useNavigate } from 'react-router-dom'; // Добавляем хук навигации

type Profile = Database['public']['Tables']['profiles']['Row'];

interface HeaderProps {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  userProfile: Profile | null;
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, onLogin, onLogout, userProfile }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl px-6 py-3 flex justify-between items-center border-b border-gray-100">
      {/* Логотип: клик возвращает на главную */}
      <button onClick={() => navigate('/')} className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md">
          B
        </div>
        <span className="text-xl font-extrabold tracking-tight text-gray-900">
          Bala<span className="text-purple-600">Care</span>
        </span>
      </button>
      
      {isLoggedIn ? (
        <div className="flex items-center gap-3 animate-fade-in">
          {/* Кнопка Профиля (Имя + Аватар) */}
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 hover:bg-gray-100 p-1 pr-3 rounded-full transition-colors"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
               {userProfile?.avatar_url ? (
                 <img src={userProfile.avatar_url} alt="Ava" className="w-full h-full object-cover" />
               ) : (
                 <User className="w-5 h-5 text-gray-400" />
               )}
            </div>
            {/* Берем реальное имя или email, если имени нет */}
            <span className="text-sm font-bold text-gray-700 hidden sm:block max-w-[100px] truncate">
              {userProfile?.full_name || 'Пользователь'}
            </span>
          </button>

          {/* Отдельная кнопка Выхода */}
          <button 
            onClick={onLogout}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Выйти"
          >
             <LogOut className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button 
          onClick={onLogin}
          className="px-5 py-2 bg-gray-900 text-white rounded-full text-sm font-bold hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
        >
          Войти
        </button>
      )}
    </header>
  );
};

export default Header;