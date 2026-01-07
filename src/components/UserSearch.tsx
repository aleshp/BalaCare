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

  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
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

    const debounce = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={onClose}><X className="w-6 h-6" /></button>
        <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-3 py-2">
           <Search className="w-4 h-4 text-gray-400 mr-2" />
           <input 
             value={query} 
             onChange={e => setQuery(e.target.value)}
             placeholder="Поиск людей..." 
             className="bg-transparent w-full text-sm outline-none"
             autoFocus
           />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-2">
         {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-purple-600"/></div>
         ) : results.length === 0 && query ? (
            <p className="text-center text-gray-400 mt-4 text-sm">Никого не найдено</p>
         ) : (
            results.map(user => (
               <div 
                 key={user.id} 
                 onClick={() => onUserSelect(user)}
                 className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer"
               >
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                     {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300"><User className="w-5 h-5 text-gray-500"/></div>
                     )}
                  </div>
                  <div>
                     <h4 className="font-bold text-gray-900 text-sm">{user.full_name || 'Без имени'}</h4>
                     <p className="text-xs text-gray-500">{user.role === 'specialist' ? 'Специалист' : 'Родитель'}</p>
                  </div>
               </div>
            ))
         )}
      </div>
    </div>
  );
};

export default UserSearch;