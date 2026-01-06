import React, { useState, useEffect } from 'react';
import { User, MapPin, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AuthGate from '../components/AuthGate';

const ProfilePage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const { user, profile, loading: authLoading } = useAuth();
  
  // Локальное состояние для формы редактирования
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState('parent');
  const [saving, setSaving] = useState(false);

  // При загрузке профиля заполняем форму
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCity(profile.city || '');
      setRole(profile.role || 'parent');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          city: city,
          role: role as 'parent' | 'specialist' // Приводим тип
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Профиль обновлен!');
      window.location.reload(); // Простой способ обновить данные в контексте
    } catch (error) {
      console.error(error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="p-10 text-center">Загрузка...</div>;
  if (!user) return <div className="pt-6"><AuthGate onLogin={onLogin} /></div>;

  return (
    <div className="pt-6 pb-24 bg-gray-50 min-h-screen">
      <div className="px-6 mb-6">
        <h1 className="text-3xl font-black text-gray-900">Мой профиль</h1>
      </div>

      <div className="px-6 space-y-6">
        {/* Карточка с аватаром */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full mb-4 overflow-hidden border-4 border-purple-50">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><User className="w-10 h-10 text-gray-400"/></div>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{profile?.full_name || user.email}</h2>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>

        {/* Форма редактирования */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 mb-2">Настройки аккаунта</h3>
          
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Имя</label>
            <input 
              type="text" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Город</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Алматы"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full pl-10 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Ваша роль</label>
            <select 
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="parent">Родитель</option>
              <option value="specialist">Специалист</option>
            </select>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 mt-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all flex justify-center items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5" /> Сохранить изменения</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;