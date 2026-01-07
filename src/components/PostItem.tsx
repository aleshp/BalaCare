import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../types/supabase';

type PostWithData = Database['public']['Tables']['community_posts']['Row'] & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  post_likes: { user_id: string }[]; 
};

interface PostItemProps {
  post: PostWithData;
  isDetailView?: boolean;
  onCommentClick?: () => void;
  onPostUpdate?: (postId: string, newLikeCount: number, isLiked: boolean) => void;
}

const PostItem: React.FC<PostItemProps> = ({ post, isDetailView = false, onCommentClick, onPostUpdate }) => {
  const { user, openAuthModal } = useAuth();
  
  // Вычисляем состояние на основе пропсов (это гарантирует синхронизацию)
  const isLiked = user ? post.post_likes.some(like => like.user_id === user.id) : false;
  const likeCount = post.like_count || 0;

  // Локальное состояние только для анимации
  const [animating, setAnimating] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return openAuthModal();
    if (processing) return; // Защита от двойного клика

    setProcessing(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    // 1. Оптимистичные значения
    const newIsLiked = !isLiked;
    const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

    // 2. Сразу сообщаем родителю об изменении (UI обновится мгновенно везде)
    if (onPostUpdate) {
      onPostUpdate(post.id, newLikeCount, newIsLiked);
    }

    try {
      if (newIsLiked) {
        const { error } = await supabase.from('post_likes').insert({ user_id: user.id, post_id: post.id });
        if (error && error.code !== '23505') throw error; // Игнорируем ошибку дубликата
      } else {
        const { error } = await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Like error:", err);
      // Если ошибка - откатываем назад
      if (onPostUpdate) {
        onPostUpdate(post.id, likeCount, isLiked);
      }
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    if (diff < 60) return `${diff}м`;
    if (diff < 1440) return `${Math.floor(diff / 60)}ч`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className={`px-4 py-3 ${isDetailView ? '' : 'border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer'}`}
      onClick={onCommentClick}
    >
      <div className="flex gap-3 relative">
         <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
               {post.profiles?.avatar_url ? (
                 <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
               ) : (
                 <div className="w-full h-full bg-gradient-to-br from-indigo-300 to-purple-300"></div>
               )}
            </div>
         </div>

         <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-none">
                    {post.profiles?.full_name || 'Пользователь'}
                  </h3>
                  <span className="text-xs text-gray-400 mt-0.5 block">Родитель</span>
               </div>
               <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{formatTime(post.created_at)}</span>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
               </div>
            </div>

            <p className={`text-gray-900 text-sm mt-1 mb-2 whitespace-pre-wrap leading-relaxed ${isDetailView ? 'text-base' : ''}`}>
               {post.content}
            </p>

            <div className="flex items-center gap-5 mt-2">
               {/* Like Button */}
               <button 
                 onClick={handleLike}
                 className="flex items-center gap-1.5 group p-1 -ml-1 transition-transform active:scale-95"
               >
                 <Heart 
                   className={`w-5 h-5 transition-all duration-300 ${
                     isLiked 
                       ? 'fill-red-500 text-red-500' 
                       : 'text-gray-400 group-hover:text-red-500'
                   } ${animating ? 'scale-125' : 'scale-100'}`} 
                 />
                 {(likeCount > 0 || isDetailView) && (
                   <span className={`text-xs font-medium ${isLiked ? 'text-red-500' : 'text-gray-400'}`}>
                     {likeCount}
                   </span>
                 )}
               </button>

               {/* Comment Indicator */}
               <button className="flex items-center gap-1.5 group p-1">
                 <MessageCircle className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                 {(post.comment_count > 0 || isDetailView) && (
                    <span className="text-xs font-medium text-gray-400 group-hover:text-purple-600">
                      {post.comment_count}
                    </span>
                 )}
               </button>

               <button className="p-1">
                 <Share2 className="w-5 h-5 text-gray-400 hover:text-gray-900 transition-colors" />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default PostItem;