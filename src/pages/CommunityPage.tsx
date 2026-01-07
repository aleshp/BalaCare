import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, MessageSquare, LayoutList, Image as ImageIcon, X, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import AuthGate from '../components/AuthGate';
import { useAuth } from '../context/AuthContext';
import PostItem from '../components/PostItem';
import ThreadView from '../components/ThreadView';
import { ChatList } from './ChatPage';

type PostWithData = Database['public']['Tables']['community_posts']['Row'] & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  post_likes: { user_id: string }[]; 
  post_media: { media_url: string; media_type: 'image' | 'video' }[]; 
};

const CommunityPage: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const isLoggedIn = !!user;
  
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'feed' | 'chats'>('feed');
  const [posts, setPosts] = useState<PostWithData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Загружаем посты при старте (не зависим от user, чтобы грузить для гостей)
  useEffect(() => {
    fetchPostsAndHandleDeepLink();
  }, [user]); // user в зависимости нужен, чтобы перекрасить лайки при входе

  const fetchPostsAndHandleDeepLink = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('community_posts')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url),
          post_likes:post_likes(user_id),
          post_media(media_url, media_type)
        `)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      let formattedPosts: PostWithData[] = [];

      if (data) {
        formattedPosts = data.map((post: any) => ({
          ...post,
          // Если юзер есть - фильтруем лайки по нему. Если нет - массив лайков будет пуст для проверки isLiked
          post_likes: user ? post.post_likes.filter((like: any) => like.user_id === user.id) : []
        }));
      }

      // Deep Linking (проверка ссылки)
      const deepLinkPostId = searchParams.get('postId');
      if (deepLinkPostId) {
        const existingPost = formattedPosts.find(p => p.id === deepLinkPostId);
        if (existingPost) {
           setSelectedPostId(deepLinkPostId);
        } else {
           // Подгружаем пост, если его нет в ленте
           const { data: singlePost, error: singleError } = await supabase
             .from('community_posts')
             .select(`
                *,
                profiles:user_id (full_name, avatar_url),
                post_likes:post_likes(user_id),
                post_media(media_url, media_type)
              `)
             .eq('id', deepLinkPostId)
             .single();
            
            if (singlePost && !singleError) {
                const formattedSingle = {
                    ...singlePost,
                    post_likes: user ? singlePost.post_likes.filter((like: any) => like.user_id === user.id) : []
                };
                // @ts-ignore
                formattedPosts = [formattedSingle, ...formattedPosts];
                setSelectedPostId(deepLinkPostId);
            }
        }
      }

      setPosts(formattedPosts);

    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseThread = () => {
      setSelectedPostId(null);
      setSearchParams({});
  };

  const handlePostUpdate = (postId: string, newLikeCount: number, isLiked: boolean) => {
    setPosts(currentPosts => currentPosts.map(post => {
      if (post.id === postId) {
        const updatedLikes = isLiked ? [{ user_id: user?.id || '' }] : [];
        return { ...post, like_count: newLikeCount, post_likes: updatedLikes };
      }
      return post;
    }));
  };
  
  const handleCommentUpdate = (postId: string) => {
      setPosts(currentPosts => currentPosts.map(post => {
          if (post.id === postId) return { ...post, comment_count: (post.comment_count || 0) + 1 };
          return post;
      }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !selectedImage) || !user) return;
    setPosting(true);

    try {
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          content: newPostContent,
          is_visible: true,
          like_count: 0,
          comment_count: 0
        })
        .select()
        .single();

      if (postError) throw postError;

      if (selectedImage && postData) {
         const fileExt = selectedImage.name.split('.').pop();
         const fileName = `${postData.id}/${Math.random()}.${fileExt}`;
         
         const { error: uploadError } = await supabase.storage
            .from('post_images')
            .upload(fileName, selectedImage);

         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage
            .from('post_images')
            .getPublicUrl(fileName);

         await supabase.from('post_media').insert({
             post_id: postData.id,
             media_url: publicUrl,
             media_type: 'image'
         });
      }

      setNewPostContent('');
      clearImage();
      setIsCreating(false);
      fetchPostsAndHandleDeepLink();

    } catch (error: any) {
      console.error(error);
      alert('Ошибка при публикации: ' + error.message);
    } finally {
      setPosting(false);
    }
  };

  const handleStartChat = async (targetUserId: string) => {
    if (!user) return openAuthModal();
    if (targetUserId === user.id) return alert("Нельзя писать самому себе");
    
    try {
       const { data: conv, error: convError } = await supabase.from('conversations').insert({}).select().single();
       if (convError) throw convError;

       await supabase.from('conversation_participants').insert([
         { conversation_id: conv.id, user_id: user.id },
         { conversation_id: conv.id, user_id: targetUserId }
       ]);
       setActiveTab('chats');
    } catch (e) {
       setActiveTab('chats');
    }
  };

  const selectedPost = posts.find(p => p.id === selectedPostId);

  return (
    <div className="pt-6 pb-24 bg-white min-h-screen relative">
      {/* Header */}
      <div className="px-6 mb-4 sticky top-[60px] bg-white/95 backdrop-blur z-20 pt-2 border-b border-gray-100">
        <div className="flex justify-between items-center mb-3">
             <h1 className="text-3xl font-black text-gray-900">Сообщество</h1>
             {isLoggedIn && !isCreating && activeTab === 'feed' && (
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                    <Plus className="w-5 h-5" />
                </button>
            )}
        </div>
        
        <div className="flex gap-6 pb-2">
            <button 
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'feed' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                <LayoutList className="w-4 h-4" /> Лента
            </button>
            <button 
              onClick={() => setActiveTab('chats')}
              className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chats' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                <MessageSquare className="w-4 h-4" /> Сообщения
            </button>
        </div>
      </div>

      {/* FEED TAB */}
      {activeTab === 'feed' && (
        <>
            {/* Блок создания поста ИЛИ призыв войти */}
            <div className="px-6 mb-6 animate-fade-in">
                {isLoggedIn ? (
                    isCreating ? (
                        // ФОРМА СОЗДАНИЯ
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden mb-2">
                                    {user.user_metadata.avatar_url ? (
                                        <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-tr from-purple-400 to-pink-400"></div>
                                    )}
                                </div>
                                <div className="w-0.5 flex-1 bg-gray-200 rounded-full"></div>
                            </div>
                            
                            <div className="flex-1 pb-4">
                                <p className="font-bold text-sm text-gray-900 mb-1">Вы</p>
                                <textarea 
                                    value={newPostContent}
                                    onChange={e => setNewPostContent(e.target.value)}
                                    placeholder="Начните ветку..."
                                    className="w-full text-sm outline-none placeholder-gray-400 resize-none h-20"
                                    autoFocus
                                />

                                {imagePreview && (
                                    <div className="relative w-full h-40 bg-gray-100 rounded-xl mb-3 overflow-hidden group">
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                        <button onClick={clearImage} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><X className="w-4 h-4" /></button>
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-2">
                                    <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-purple-600 p-2 rounded-full hover:bg-gray-100"><ImageIcon className="w-5 h-5" /></button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                                    <div className="flex gap-3">
                                        <button onClick={() => { setIsCreating(false); clearImage(); }} className="text-gray-400 font-bold text-sm">Отмена</button>
                                        <button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !selectedImage) || posting} className="bg-purple-600 text-white px-4 py-1.5 rounded-full font-bold text-sm disabled:opacity-50">{posting ? '...' : 'Опубликовать'}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null // Если не создаем пост и залогинены - ничего (кнопка + в шапке)
                ) : (
                    // БАННЕР ДЛЯ ГОСТЕЙ
                    <div 
                        onClick={openAuthModal}
                        className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-purple-100 transition-colors"
                    >
                        <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center text-purple-600">
                            <LogIn className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-purple-900 text-sm">Присоединяйтесь к обсуждению</h4>
                            <p className="text-purple-700 text-xs">Войдите, чтобы создавать посты, лайкать и комментировать.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ЛЕНТА */}
            <div className="w-full">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-8 h-8"/></div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 px-6 text-gray-400">Пока тихо...</div>
                ) : (
                    posts.map(post => (
                    <PostItem 
                        key={post.id} 
                        post={post} 
                        onCommentClick={() => setSelectedPostId(post.id)}
                        onPostUpdate={handlePostUpdate} 
                    />
                    ))
                )}
            </div>
        </>
      )}

      {/* CHATS TAB (Только для авторизованных) */}
      {activeTab === 'chats' && (
          isLoggedIn ? <ChatList /> : (
            <div className="mt-10 px-4">
                <AuthGate />
                <p className="text-center text-gray-400 text-sm mt-4">Личные сообщения доступны только зарегистрированным пользователям.</p>
            </div>
          )
      )}

      {/* Thread View Modal */}
      {selectedPost && (
         <ThreadView 
           post={selectedPost} 
           onClose={handleCloseThread} 
           onPostUpdate={handlePostUpdate}
           onCommentAdded={() => handleCommentUpdate(selectedPost.id)}
           onStartChat={handleStartChat}
         />
      )}
    </div>
  );
};

export default CommunityPage;