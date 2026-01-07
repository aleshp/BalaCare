import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../types/supabase';

// Тот же тип, что и в ThreadView
type PostWithData = Database['public']['Tables']['community_posts']['Row'] & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  post_likes: { user_id: string }[]; 
};

interface PostItemProps {
  post: PostWithData;
  isDetailView?: boolean;
  onCommentClick?: () => void;
}

const PostItem: React.FC<PostItemProps> = ({ post, isDetailView = false, onCommentClick }) => {
  const { user, openAuthModal } = useAuth();
  
  // Определяем, лайкнул ли я (есть ли мой ID в массиве лайков этого поста)
  const isLikedInitially = user ? post.post_likes.some(like => like.user_id === user.id) : false;
  
  const [liked, setLiked] = useState(isLikedInitially);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [animating, setAnimating] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Чтобы не открывался детальный просмотр при лайке
    if (!user) return openAuthModal();

    // Оптимистичное обновление UI
    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300); // Сброс анимации

    try {
      if (newLikedState) {
        // Ставим лайк
        await supabase.from('post_likes').insert({ user_id: user.id, post_id: post.id });
      } else {
        // Убираем лайк
        await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      }
    } catch (err) {
      console.error(err);
      // Если ошибка - откатываем
      setLiked(!newLikedState);
      setLikeCount(prev => newLikedState ? prev - 1 : prev + 1);
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
         {/* Threads Connector Line (если не детальный вид, можно добавить логику ветки) */}
         {/* <div className="absolute top-12 left-[18px] bottom-0 w-0.5 bg-gray-100"></div> */}

         <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
               {post.profiles?.avatar_url ? (
                 <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-gradient-to-br from-indigo-300 to-purple-300"></div>
               )}
            </div>
         </div>

         <div className="flex-1 min-w-0">
            {/* Header */}
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

            {/* Content */}
            <p className={`text-gray-900 text-sm mt-1 mb-2 whitespace-pre-wrap leading-relaxed ${isDetailView ? 'text-base' : ''}`}>
               {post.content}
            </p>

            {/* Actions Bar */}
            <div className="flex items-center gap-5 mt-2">
               {/* Like */}
               <button 
                 onClick={handleLike}
                 className="flex items-center gap-1.5 group p-1 -ml-1"
               >
                 <Heart 
                   className={`w-5 h-5 transition-all duration-300 ${
                     liked 
                       ? 'fill-red-500 text-red-500' 
                       : 'text-gray-400 group-hover:text-red-500'
                   } ${animating ? 'scale-125' : 'scale-100'}`} 
                 />
                 {(likeCount > 0 || isDetailView) && (
                   <span className={`text-xs font-medium ${liked ? 'text-red-500' : 'text-gray-400'}`}>
                     {likeCount}
                   </span>
                 )}
               </button>

               {/* Comment */}
               <button className="flex items-center gap-1.5 group p-1">
                 <MessageCircle className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                 {(post.comment_count > 0 || isDetailView) && (
                    <span className="text-xs font-medium text-gray-400 group-hover:text-purple-600">
                      {post.comment_count}
                    </span>
                 )}
               </button>

               {/* Share (Fake) */}
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