import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Plus, MessageSquare, LayoutList, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import AuthGate from '../components/AuthGate';
import { useAuth } from '../context/AuthContext';
import PostItem from '../components/PostItem';
import ThreadView from '../components/ThreadView';
import { ChatList } from './ChatPage';

// Обновленный тип с post_media
type PostWithData = Database['public']['Tables']['community_posts']['Row'] & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  post_likes: { user_id: string }[]; 
  post_media: { media_url: string; media_type: 'image' | 'video' }[]; 
};

const CommunityPage: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const isLoggedIn = !!user;

  const [activeTab, setActiveTab] = useState<'feed' | 'chats'>('feed');
  const [posts, setPosts] = useState<PostWithData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Создание поста
  const [isCreating, setIsCreating] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [user]); 

  const fetchPosts = async () => {
    try {
      // ОБЯЗАТЕЛЬНО добавляем post_media в запрос
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
      if (data) {
        const formattedData = data.map((post: any) => ({
          ...post,
          post_likes: post.post_likes.filter((like: any) => like.user_id === user?.id)
        }));
        setPosts(formattedData);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
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

  // --- ОБРАБОТКА ВЫБОРА ФОТО ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      // Создаем URL для превью
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
      // 1. Создаем пост
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

      // 2. Если есть картинка, загружаем её
      if (selectedImage && postData) {
         const fileExt = selectedImage.name.split('.').pop();
         const fileName = `${postData.id}/${Math.random()}.${fileExt}`;
         
         const { error: uploadError } = await supabase.storage
            .from('post_images') // Бакет, который мы создали
            .upload(fileName, selectedImage);

         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage
            .from('post_images')
            .getPublicUrl(fileName);

         // 3. Создаем запись в post_media
         await supabase.from('post_media').insert({
             post_id: postData.id,
             media_url: publicUrl,
             media_type: 'image'
         });
      }

      setNewPostContent('');
      clearImage();
      setIsCreating(false);
      await fetchPosts();

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
            {isCreating && (
                <div className="px-6 mb-6 animate-fade-in">
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden mb-2">
                                <div className="w-full h-full bg-gradient-to-tr from-purple-400 to-pink-400"></div>
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

                            {/* Preview Image */}
                            {imagePreview && (
                                <div className="relative w-full h-40 bg-gray-100 rounded-xl mb-3 overflow-hidden group">
                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                    <button 
                                        onClick={clearImage}
                                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-2">
                                {/* Image Upload Button */}
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-gray-400 hover:text-purple-600 p-2 rounded-full hover:bg-gray-100"
                                >
                                    <ImageIcon className="w-5 h-5" />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" // ТОЛЬКО ФОТО
                                    onChange={handleImageSelect}
                                />

                                <div className="flex gap-3">
                                    <button onClick={() => { setIsCreating(false); clearImage(); }} className="text-gray-400 font-bold text-sm">Отмена</button>
                                    <button 
                                        onClick={handleCreatePost}
                                        disabled={(!newPostContent.trim() && !selectedImage) || posting}
                                        className="bg-purple-600 text-white px-4 py-1.5 rounded-full font-bold text-sm disabled:opacity-50"
                                    >
                                        {posting ? '...' : 'Опубликовать'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-8 h-8"/></div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 px-6 text-gray-400">
                        Пока тихо...
                        {!isLoggedIn && <div className="mt-2 text-purple-600 cursor-pointer" onClick={openAuthModal}>Войдите, чтобы написать первым</div>}
                    </div>
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
            
            {!isLoggedIn && posts.length > 0 && <div className="mt-10 px-4"><AuthGate /></div>}
        </>
      )}

      {/* CHATS TAB */}
      {activeTab === 'chats' && (
          isLoggedIn ? <ChatList /> : <div className="mt-10 px-4"><AuthGate /></div>
      )}

      {/* Thread View Modal */}
      {selectedPost && (
         <ThreadView 
           post={selectedPost} 
           onClose={() => setSelectedPostId(null)}
           onPostUpdate={handlePostUpdate}
           onCommentAdded={() => handleCommentUpdate(selectedPost.id)}
           onStartChat={handleStartChat}
         />
      )}
    </div>
  );
};

export default CommunityPage;