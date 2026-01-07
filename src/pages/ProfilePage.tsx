import React, { useState, useEffect } from 'react';
import { User, MapPin, Save, Loader2, LogOut, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AuthGate from '../components/AuthGate';

// Импортируем библиотеку для стран и городов
import { Country, City }  from 'country-state-city';

const ProfilePage: React.FC = () => {
  const { user, profile, loading: authLoading, signOut, openAuthModal } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('parent');
  
  // Состояния для локации
  const [selectedCountryCode, setSelectedCountryCode] = useState('KZ'); // По умолчанию Казахстан
  const [selectedCity, setSelectedCity] = useState('');
  
  const [saving, setSaving] = useState(false);

  // Получаем списки
  const countries = Country.getAllCountries();
  const cities = City.getCitiesOfCountry(selectedCountryCode) || [];

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRole(profile.role || 'parent');
      
      // Попытка восстановить город из базы
      // В базе city хранится как строка. Если там есть что-то, ставим его.
      // Страну не храним отдельно в этом простом примере, оставляем KZ или сбрасываем если нужно.
      if (profile.city) {
          setSelectedCity(profile.city);
      }
    }
  }, [profile]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCountryCode(e.target.value);
      setSelectedCity(''); // Сбрасываем город при смене страны
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          city: selectedCity, // Сохраняем просто название города
          role: role as 'parent' | 'specialist'
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Профиль обновлен!');
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return (
      <div className="flex h-screen items-center justify-center">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
  );
  
  if (!user) return (
      <div className="pt-20 px-6">
          <AuthGate />
      </div>
  );

  return (
    <div className="pt-6 pb-24 bg-gray-50 min-h-screen">
      <div className="px-6 mb-6">
        <h1 className="text-3xl font-black text-gray-900">Мой профиль</h1>
      </div>

      <div className="px-6 space-y-6">
        {/* Карточка с аватаром */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-purple-400 to-pink-400 opacity-20"></div>
          
          <div className="w-24 h-24 bg-white rounded-full mb-4 overflow-hidden border-4 border-white shadow-lg relative z-10">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <User className="w-10 h-10 text-gray-400"/>
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-gray-900">{profile?.full_name || user.email}</h2>
          <p className="text-gray-400 text-sm mb-4">{user.email}</p>
          
          <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {profile?.role === 'specialist' ? 'Специалист' : 'Родитель'}
          </div>
        </div>

        {/* Форма редактирования */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5">
          <h3 className="font-bold text-gray-800 text-lg">Настройки аккаунта</h3>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ваше Имя</label>
            <input 
              type="text" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-gray-800 transition-all"
            />
          </div>

          {/* Выбор Страны */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Страна</label>
            <div className="relative">
              <Globe className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <select 
                value={selectedCountryCode}
                onChange={handleCountryChange}
                className="w-full pl-10 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-gray-800 appearance-none"
              >
                  {countries.map((country) => (
                      <option key={country.isoCode} value={country.isoCode}>
                          {country.name}
                      </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Выбор Города */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Город</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              {cities.length > 0 ? (
                  <select 
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="w-full pl-10 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-gray-800 appearance-none"
                  >
                    <option value="" disabled>Выберите город</option>
                    {cities.map((city) => (
                        <option key={city.name} value={city.name}>
                            {city.name}
                        </option>
                    ))}
                  </select>
              ) : (
                  <input 
                    type="text"
                    placeholder="Введите название города"
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="w-full pl-10 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-gray-800"
                  />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Роль на сайте</label>
            <div className="relative">
                <select 
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-gray-800 appearance-none transition-all"
                >
                <option value="parent">Родитель</option>
                <option value="specialist">Специалист</option>
                </select>
                <div className="absolute right-4 top-4 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 mt-2 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all flex justify-center items-center gap-2 text-sm"
          >
            {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4" /> Сохранить изменения</>}
          </button>
        </div>

        <button 
            onClick={signOut}
            className="w-full py-3.5 text-red-500 font-bold bg-red-50 rounded-xl hover:bg-red-100 active:scale-95 transition-all flex justify-center items-center gap-2"
        >
            <LogOut className="w-5 h-5" /> Выйти из аккаунта
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;