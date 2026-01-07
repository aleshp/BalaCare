import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, BookOpen, Heart, Users, ShoppingBag, Star } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { 
      title: "Обучение", 
      sub: "Видео и статьи", 
      icon: BookOpen, 
      color: "bg-blue-50 text-blue-600", 
      path: "/learn" 
    },
    { 
      title: "Специалисты", 
      sub: "Онлайн запись", 
      icon: Heart, 
      color: "bg-pink-50 text-pink-600", 
      path: "/support" 
    },
    { 
      title: "Сообщество", 
      sub: "Общение мам", 
      icon: Users, 
      color: "bg-purple-50 text-purple-600", 
      path: "/community" 
    },
    { 
      title: "Магазин", 
      sub: "Товары детям", 
      icon: ShoppingBag, 
      color: "bg-orange-50 text-orange-600", 
      path: "/market" 
    },
  ];

  return (
    // ИЗМЕНЕНИЕ ЗДЕСЬ: pb-32 (было pb-8) - большой отступ снизу
    <div className="pb-32 space-y-6">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-b-[40px] shadow-2xl pb-10 pt-4 px-6 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-8">
          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white border border-white/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> BalaCare v1.0
          </div>
        </div>

        <h2 className="text-3xl font-black text-white leading-tight mb-3">
          С BalaCare вы <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
            никогда не останетесь одни
          </span>
        </h2>
        <p className="text-indigo-100 text-sm font-medium mb-6 max-w-[80%]">
          Мы создали пространство заботы и поддержки для вас и вашего ребенка.
        </p>

        {/* Поиск */}
        <div className="bg-white p-2 rounded-2xl flex items-center shadow-lg transform translate-y-6">
          <Search className="w-5 h-5 text-gray-400 ml-2" />
          <input 
            type="text" 
            placeholder="Найти совет, врача или игрушку..." 
            className="w-full p-2 outline-none text-gray-700 placeholder-gray-400 text-sm font-medium"
          />
        </div>
      </div>

      {/* Grid Menu */}
      <div className="px-6 grid grid-cols-2 gap-4 mt-8">
        {menuItems.map((item, i) => {
          const IconComponent = item.icon;
          return (
            <button 
              key={i} 
              onClick={() => navigate(item.path)}
              className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-start hover:shadow-md transition-all active:scale-95 text-left"
            >
              <div className={`${item.color} p-3 rounded-2xl mb-3`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-800 text-base">{item.title}</h3>
              <p className="text-xs text-gray-400 font-medium">{item.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Quote Block */}
      <div className="mx-6 p-6 rounded-3xl bg-gradient-to-r from-green-400 to-emerald-600 text-white shadow-lg relative overflow-hidden">
        <Star className="absolute -top-2 -right-2 w-20 h-20 text-white/20 rotate-12" />
        <h3 className="font-bold text-lg mb-1 relative z-10">Совет дня</h3>
        <p className="text-sm opacity-90 relative z-10">
          «Маленькие победы каждый день ведут к большим результатам. Верьте в себя!»
        </p>
      </div>
    </div>
  );
};

export default HomePage;