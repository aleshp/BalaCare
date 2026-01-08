import React, { useState, useEffect } from 'react';
import { Search, User, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserSearchProps {
  onUserSelect: (user: Profile) => void;
  onClose: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ onUserSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Авто-фокус на поле ввода при открытии
  useEffect(() => {
    const input = document.getElementById('user-search-input');
    if (input) input.focus();
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      // Если запрос пустой, очищаем результаты
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        // Поиск по имени (ilike = регистронезависимый)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .ilike('full_name', `%${query}%`)
          .limit(10);
        
        if (data) setResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    // Задержка поиска (debounce), чтобы не долбить базу каждой буквой
    const debounce = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    // z-[100] гарантирует, что окно будет поверх всего
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-fade-in">
      
      {/* Шапка поиска */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white pt-safe-top">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>
        
        <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2.5">
           <Search className="w-5 h-5 text-gray-400 mr-2" />
           <input 
             id="user-search-input"
             value={query} 
             onChange={e => setQuery(e.target.value)}
             placeholder="Поиск людей..." 
             className="bg-transparent w-full text-base outline-none text-gray-900 placeholder-gray-500"
             autoComplete="off"
           />
        </div>
      </div>

      {/* Результаты */}
      <div className="flex-1 overflow-y-auto p-2 bg-white">
         {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600"/>
            </div>
         ) : results.length === 0 ? (
            <div className="text-center mt-10">
               {query ? (
                 <p className="text-gray-400">Никого не найдено</p>
               ) : (
                 <div className="flex flex-col items-center opacity-50">
                    <Search className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-gray-400 text-sm">Введите имя для поиска</p>
                 </div>
               )}
            </div>
         ) : (
            <div className="space-y-1">
              {results.map(user => (
                 <div 
                   key={user.id} 
                   onClick={() => onUserSelect(user)}
                   className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl cursor-pointer active:bg-gray-100 transition-colors"
                 >
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-100 flex-shrink-0">
                       {user.avatar_url ? (
                          <img src={user.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                       ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500">
                            <User className="w-6 h-6"/>
                          </div>
                       )}
                    </div>
                    <div>
                       <h4 className="font-bold text-gray-900 text-base">{user.full_name || 'Без имени'}</h4>
                       <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                         {user.role === 'specialist' ? 'Специалист' : 'Родитель'}
                       </span>
                    </div>
                 </div>
              ))}
            </div>
         )}
      </div>
    </div>
  );
};

export default UserSearch;