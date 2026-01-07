import React, { useEffect, useState } from 'react';
import { X, Send, Loader2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PostItem from './PostItem'; // Мы создадим его следующим
import { Database } from '../types/supabase';

// Типы
type PostWithData = Database['public']['Tables']['community_posts']['Row'] & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  post_likes: { user_id: string }[]; // Чтобы проверить лайкнул ли я
};

type CommentWithProfile = Database['public']['Tables']['post_comments']['Row'] & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

interface ThreadViewProps {
  post: PostWithData;
  onClose: () => void;
  onUpdatePost: () => void; // Чтобы обновить счетчик комментов в родительской ленте
}

const ThreadView: React.FC<ThreadViewProps> = ({ post, onClose, onUpdatePost }) => {
  const { user, openAuthModal } = useAuth();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        profiles:user_id (full_name, avatar_url)
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    if (data) setComments(data as any); // ts-ignore для простоты join типов
    setLoading(false);
  };

  const handleSendComment = async () => {
    if (!user) return openAuthModal();
    if (!newComment.trim()) return;
    
    setSending(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment
        });

      if (error) throw error;
      
      setNewComment('');
      await fetchComments(); // Обновляем список
      onUpdatePost(); // Обновляем счетчик в ленте
    } catch (err) {
      alert('Ошибка при отправке');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <X className="w-6 h-6 text-gray-900" />
        </button>
        <h2 className="font-bold text-lg">Обсуждение</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Сам Пост (Родитель) */}
        <div className="pt-2">
           <PostItem post={post} isDetailView={true} />
        </div>

        <div className="h-px bg-gray-100 w-full my-2"></div>

        {/* Список Комментариев */}
        <div className="px-4 pb-4 space-y-6">
          {loading ? (
             <div className="flex justify-center py-4"><Loader2 className="animate-spin text-purple-600"/></div>
          ) : comments.length === 0 ? (
             <p className="text-gray-400 text-center py-4 text-sm">Пока нет комментариев. Начните ветку!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 relative">
                 {/* Линия ветки (Threads style) */}
                 <div className="absolute top-10 left-4 bottom-[-24px] w-0.5 bg-gray-100 -z-10 last:hidden"></div>

                 <div className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                      {comment.profiles?.avatar_url ? (
                        <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50"><User className="w-4 h-4 text-gray-400"/></div>
                      )}
                    </div>
                 </div>
                 <div className="flex-1 pb-2 border-b border-gray-50 last:border-0">
                    <div className="flex justify-between items-start">
                       <span className="font-bold text-sm text-gray-900">{comment.profiles?.full_name || 'Аноним'}</span>
                       <span className="text-xs text-gray-400">{new Date(comment.created_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-sm text-gray-800 mt-0.5 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-100 bg-white absolute bottom-0 left-0 right-0">
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
           <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {/* Аватар текущего юзера (можно взять из контекста, но пока заглушка если нет) */}
               <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
           </div>
           <input 
             value={newComment}
             onChange={e => setNewComment(e.target.value)}
             placeholder={`Ответить ${post.profiles?.full_name || 'автору'}...`}
             className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400"
             onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
           />
           <button 
             onClick={handleSendComment}
             disabled={!newComment.trim() || sending}
             className="text-purple-600 disabled:text-gray-300 font-bold text-sm px-2"
           >
             {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Send'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ThreadView;