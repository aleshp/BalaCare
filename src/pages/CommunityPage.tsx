import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Loader2, Send, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import AuthGate from '../components/AuthGate';
import { useAuth } from '../context/AuthContext';

type PostWithProfile = Database['public']['Tables']['community_posts']['Row'] & {
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

const CommunityPage: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const isLoggedIn = !!user;

  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        // @ts-ignore
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;
    setIsPosting(true);

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          content: newPostContent,
          is_visible: true,
          like_count: 0,
          comment_count: 0
        });

      if (error) throw error;
      
      setNewPostContent('');
      await fetchPosts(); // Обновляем список
    } catch (error) {
      console.error(error);
      alert('Ошибка при создании поста');
    } finally {
      setIsPosting(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60); // min

    if (diff < 60) return `${diff} мин назад`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`;
    return date.toLocaleDateString();
  };

  return (
    <div className="pt-6 pb-24 bg-gray-50 min-h-screen">
      <div className="px-6 mb-6">
        <h1 className="text-3xl font-black text-gray-900">Сообщество</h1>
        <p className="text-gray-500 font-medium">Делитесь опытом и находите друзей</p>
      </div>

      {/* Форма создания поста */}
      <div className="px-6 mb-8">
        {!isLoggedIn ? (
          <div 
            onClick={openAuthModal}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-3 items-center cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 text-gray-400 text-sm font-medium">
              Войдите, чтобы написать пост...
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex gap-3 mb-3">
               <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                 {/* Здесь можно использовать аватарку юзера из контекста */}
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
               </div>
               <textarea
                 value={newPostContent}
                 onChange={(e) => setNewPostContent(e.target.value)}
                 placeholder="О чем хотите рассказать?"
                 className="flex-1 bg-gray-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none h-24"
               />
             </div>
             <div className="flex justify-end">
               <button 
                 onClick={handleCreatePost}
                 disabled={isPosting || !newPostContent.trim()}
                 className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                 {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                 Опубликовать
               </button>
             </div>
          </div>
        )}
      </div>

      {/* Список постов */}
      <div className="px-6 space-y-6">
        {loading ? (
           <div className="flex justify-center py-10">
             <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
           </div>
        ) : posts.length === 0 ? (
           <div className="text-center py-10 text-gray-400">
             Пока нет публикаций. Будьте первыми!
           </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
               <div className="flex justify-between items-start mb-3">
                 <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                       {post.profiles?.avatar_url ? (
                         <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover"/>
                       ) : (
                         <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-300"></div>
                       )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">
                        {post.profiles?.full_name || 'Аноним'}
                      </h4>
                      <p className="text-xs text-gray-400">Родитель</p>
                    </div>
                 </div>
                 <span className="text-xs text-gray-300 font-medium">{formatTime(post.created_at)}</span>
               </div>
               
               <p className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                 {post.content}
               </p>
               
               <div className="flex gap-6 border-t border-gray-50 pt-3">
                 <button 
                   onClick={() => isLoggedIn ? {} : openAuthModal()}
                   className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors group"
                 >
                   <Heart className="w-5 h-5 group-active:scale-125 transition-transform" /> 
                   <span className="text-xs font-bold">{post.like_count || 0}</span>
                 </button>
                 <button 
                   onClick={() => isLoggedIn ? {} : openAuthModal()}
                   className="flex items-center gap-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                 >
                   <MessageCircle className="w-5 h-5" /> 
                   <span className="text-xs font-bold">{post.comment_count || 0}</span>
                 </button>
               </div>
            </div>
          ))
        )}
      </div>

      {!isLoggedIn && posts.length > 0 && (
         <div className="mt-8 px-4">
            <AuthGate />
         </div>
      )}
    </div>
  );
};

export default CommunityPage;