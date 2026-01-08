import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Send, User, Plus, Smile, Check, CheckCheck, X, MoreVertical, ExternalLink } from 'lucide-react';
import { Database } from '../types/supabase';
import UserSearch from '../components/UserSearch';

// --- ТИПЫ ---
type Message = Database['public']['Tables']['messages']['Row'] & {
  reactions?: { emoji: string; user_id: string }[];
  community_posts?: {
      id: string;
      content: string;
      user_id: string;
      profiles: { full_name: string | null } | null;
      post_media: { media_url: string }[];
  } | null;
};

type Conversation = {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

// Набор эмодзи
const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "🤔"];

// --- КОМПОНЕНТ: РЕАКЦИИ (Всплывашка над сообщением) ---
const ReactionBubblePicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void, onClose: () => void }) => {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        // @ts-ignore
        if (!e.target.closest('.reaction-picker-bubble')) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="reaction-picker-bubble absolute -top-10 left-0 bg-white/90 backdrop-blur-md shadow-xl rounded-full px-3 py-1.5 flex gap-2 animate-scale-in z-20 border border-gray-100/50">
      {COMMON_EMOJIS.slice(0, 5).map(emoji => (
        <button 
          key={emoji} 
          onClick={(e) => { e.stopPropagation(); onSelect(emoji); }}
          className="hover:scale-125 transition-transform text-lg leading-none active:scale-95"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

// --- КОМПОНЕНТ: ЭМОДЗИ КЛАВИАТУРА (Снизу) ---
const InputEmojiPicker = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
    return (
      <div className="bg-gray-100 border-t border-gray-200 p-2 grid grid-cols-8 gap-2 animate-slide-up h-48 overflow-y-auto">
          {COMMON_EMOJIS.map(emoji => (
              <button 
                key={emoji}
                onClick={() => onSelect(emoji)}
                className="text-2xl hover:bg-white rounded-lg p-2 transition-all active:scale-90"
              >
                  {emoji}
              </button>
          ))}
          {/* Дополнительные эмодзи */}
          {["👋", "🙏", "🤝", "💪", "👀", "✨", "💩", "👻", "💀", "🤡", "🎃", "🤖", "👾"].map(emoji => (
               <button key={emoji} onClick={() => onSelect(emoji)} className="text-2xl hover:bg-white rounded-lg p-2 transition-all active:scale-90">{emoji}</button>
          ))}
      </div>
    );
};

// --- КОМПОНЕНТ: КАРТОЧКА ПОСТА ВНУТРИ ЧАТА ---
const PostPreviewCard = ({ post }: { post: NonNullable<Message['community_posts']> }) => {
    const navigate = useNavigate();
    const image = post.post_media && post.post_media.length > 0 ? post.post_media[0].media_url : null;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/community?postId=${post.id}`);
    };

    return (
        <div 
            onClick={handleClick}
            className="mt-1 mb-2 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors w-full min-w-[200px]"
        >
            <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-100/50">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center border border-purple-200">
                    <User className="w-3 h-3 text-purple-600" />
                </div>
                <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">
                    {post.profiles?.full_name || 'Автор'}
                </span>
            </div>

            {image && (
                <div className="h-28 w-full bg-gray-200 relative">
                    <img src={image} className="w-full h-full object-cover" alt="Post" />
                </div>
            )}

            <div className="px-3 py-2">
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-medium">
                    {post.content || (image ? 'Фотография' : 'Без текста')}
                </p>
                <div className="mt-2 text-[10px] text-purple-600 font-bold flex items-center gap-1 uppercase tracking-wide">
                    Открыть пост <ExternalLink className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
};

// --- КОМПОНЕНТ: СООБЩЕНИЕ ---
const MessageBubble = ({ msg, isMe, onReact }: { msg: Message, isMe: boolean, onReact: (id: string, emoji: string) => void }) => {
  const [showReactions, setShowReactions] = useState(false);

  const reactionCounts = (msg.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 relative group px-2`}>
      <div className={`max-w-[85%] relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        
        <div 
          onDoubleClick={() => !isMe && onReact(msg.id, '❤️')} 
          onClick={() => !isMe && setShowReactions(!showReactions)}
          className={`px-3 py-2 text-[15px] shadow-sm relative transition-all ${
            isMe 
              ? 'bg-purple-600 text-white rounded-2xl rounded-tr-sm' 
              : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-100 cursor-pointer'
          }`}
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          {showReactions && !isMe && (
             <ReactionBubblePicker 
               onClose={() => setShowReactions(false)} 
               onSelect={(emoji) => { onReact(msg.id, emoji); setShowReactions(false); }} 
             />
          )}

          {msg.community_posts && (
              <PostPreviewCard post={msg.community_posts} />
          )}

          {(msg.content && (msg.content !== 'Поделился постом' || !msg.community_posts)) && (
              <p className="whitespace-pre-wrap leading-relaxed px-1">{msg.content}</p>
          )}
          
          <div className={`text-[10px] flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
             <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
             {isMe && (msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
          </div>
        </div>

        {Object.keys(reactionCounts).length > 0 && (
          <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'} absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'}`}>
             {Object.entries(reactionCounts).map(([emoji, count]) => (
                <div key={emoji} className="bg-white border border-gray-100 shadow-md rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-1 z-10">
                   <span>{emoji}</span>
                   {count > 1 && <span className="font-bold text-gray-600">{count}</span>}
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- КОМПОНЕНТ: КОМНАТА ЧАТА (ГЛАВНЫЙ ЭКРАН) ---
const ChatRoom = ({ conversationId, otherUser, onClose }: { conversationId: string, otherUser: any, onClose: () => void }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`room:${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, 
        () => {
           // При любом изменении (новое сообщение) - перезагружаем всё
           fetchMessages(); 
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, 
        () => { fetchMessages(); })
      .subscribe();

    const presenceChannel = supabase.channel('online-users');
    presenceChannel.on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setIsOnline(Object.keys(state).includes(otherUser?.id));
    }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
            await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
    });

    return () => { 
        supabase.removeChannel(channel);
        supabase.removeChannel(presenceChannel);
    };
  }, [conversationId]);

  const fetchMessages = async () => {
    // 1. Грузим сырые сообщения
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
        console.error("Chat Error:", error);
        return;
    }

    if (msgs) {
        // 2. Ищем ID постов и сообщений
        // @ts-ignore
        const postIds = msgs.filter(m => m.post_id).map(m => m.post_id);
        const msgIds = msgs.map(m => m.id);

        // 3. Грузим доп. данные
        const [postsResponse, reactionsResponse] = await Promise.all([
            postIds.length > 0 
                ? supabase
                    .from('community_posts')
                    .select(`
                        id, content, user_id,
                        profiles(full_name),
                        post_media(media_url)
                    `)
                    .in('id', postIds)
                : Promise.resolve({ data: [] }),
            
            supabase
                .from('message_reactions')
                .select('message_id, emoji, user_id')
                .in('message_id', msgIds)
        ]);

        const postsMap = new Map(postsResponse.data?.map((p: any) => [p.id, p]));
        const reactionsData = reactionsResponse.data || [];

        // 4. Собираем всё вместе
        const combined = msgs.map(m => {
            // @ts-ignore
            const postId = m.post_id;
            return {
                ...m,
                reactions: reactionsData.filter((r: any) => r.message_id === m.id) || [],
                community_posts: postId ? postsMap.get(postId) : null
            };
        });

        // @ts-ignore
        setMessages(combined);
        scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const content = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);

    try {
        await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: user.id,
            content: content
        });
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    } catch (e) {
        alert("Ошибка отправки");
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
      if (!user) return;
      try {
          const { error } = await supabase.from('message_reactions').insert({
              message_id: messageId,
              user_id: user.id,
              emoji: emoji
          });
          
          if (error?.code === '23505') {
              await supabase.from('message_reactions').delete()
                .eq('message_id', messageId)
                .eq('user_id', user.id)
                .eq('emoji', emoji);
          }
      } catch (e) { console.error(e); }
  };

  const addEmoji = (emoji: string) => {
      setNewMessage(prev => prev + emoji);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-[#F0F2F5] flex flex-col h-[100dvh]">
       
       {/* HEADER */}
       <div className="flex-none px-4 py-3 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center gap-3 pt-safe-top shadow-sm z-20">
          <button onClick={onClose} className="p-1.5 -ml-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
              <ArrowLeft className="w-6 h-6 text-gray-800"/>
          </button>
          
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shadow-sm relative">
             {otherUser?.avatar_url ? (
                 <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="User"/>
             ) : (
                 <div className="w-full h-full bg-gradient-to-tr from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold">
                    {otherUser?.full_name?.[0] || 'U'}
                 </div>
             )}
             {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
          </div>
          
          <div className="flex-1 min-w-0 cursor-pointer">
              <span className="font-bold text-gray-900 block truncate text-[15px]">{otherUser?.full_name || 'Собеседник'}</span>
              <span className={`text-xs ${isOnline ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {isOnline ? 'В сети' : 'был(а) недавно'}
              </span>
          </div>
          <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><MoreVertical className="w-5 h-5"/></button>
       </div>

       {/* MESSAGES LIST */}
       <div className="flex-1 overflow-y-auto min-h-0 relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ 
                   backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")` 
               }} 
          />
          
          <div className="relative p-4 pb-2">
            {messages.map((msg, idx) => (
                <MessageBubble 
                    key={msg.id || idx} 
                    msg={msg} 
                    isMe={msg.user_id === user?.id} 
                    onReact={handleReaction} 
                />
            ))}
            <div ref={messagesEndRef} className="h-1" />
          </div>
       </div>

       {/* INPUT AREA */}
       <div className="flex-none bg-white border-t border-gray-200 p-3 z-30 w-full relative" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
          
          {showEmojiPicker && (
              <InputEmojiPicker 
                  onSelect={addEmoji} 
                  // @ts-ignore
                  onClose={() => setShowEmojiPicker(false)} 
              />
          )}

          <div className="flex items-end gap-2 bg-gray-100 p-1.5 rounded-[24px] focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500/50 border border-transparent transition-all">
             <button 
               onClick={() => setShowEmojiPicker(!showEmojiPicker)}
               className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${showEmojiPicker ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
             >
                 <Smile className="w-6 h-6" />
             </button>
             
             <textarea 
               value={newMessage}
               onChange={e => setNewMessage(e.target.value)}
               onKeyDown={e => {
                   if(e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       sendMessage();
                   }
               }}
               placeholder="Сообщение..."
               className="flex-1 bg-transparent py-2.5 px-3 outline-none text-[15px] resize-none max-h-32 text-gray-900 placeholder-gray-500 leading-relaxed"
               rows={1}
               style={{ minHeight: '44px' }}
             />
             
             <button 
                onClick={sendMessage} 
                disabled={!newMessage.trim()}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md flex-shrink-0 mb-[1px] ${
                  newMessage.trim() 
                    ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95' 
                    : 'bg-gray-200 text-gray-400'
                }`}
             >
                <Send className="w-5 h-5 ml-0.5" />
             </button>
          </div>
       </div>
    </div>,
    document.body
  );
};

// --- СПИСОК ЧАТОВ ---
export const ChatList = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (user) {
        const channel = supabase.channel('online-users');
        channel.on('presence', { event: 'sync' }, () => {}).subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        });
        return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
        const { data: myChats } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id);
        if (!myChats || myChats.length === 0) { setLoading(false); return; }

        const chatIds = myChats.map(c => c.conversation_id);
        const { data: chats } = await supabase
          .from('conversations')
          .select(`id, updated_at, conversation_participants(user_id, profiles(id, full_name, avatar_url))`)
          .in('id', chatIds)
          .order('updated_at', { ascending: false });

        if (chats) {
            const formatted = chats.map((chat: any) => {
               const other = chat.conversation_participants.find((p: any) => p.user_id !== user.id)?.profiles;
               return { id: chat.id, updated_at: chat.updated_at, other_user: other || { id: 'del', full_name: 'Удаленный', avatar_url: null } };
            });
            setConversations(formatted);
        }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleStartNewChat = async (targetUser: any) => {
      setShowSearch(false);
      if (!user) return;
      if (targetUser.id === user.id) { alert("Вы не можете создать чат с самим собой."); return; }

      try {
          const { data: chatId, error } = await supabase.rpc('create_conversation', { other_user_id: targetUser.id });
          if (error) throw error;
          const newChat = { id: chatId, updated_at: new Date().toISOString(), other_user: targetUser };
          setConversations(prev => {
              if (prev.some(c => c.id === chatId)) return prev;
              return [newChat, ...prev];
          });
          setActiveChat(newChat);
      } catch (e) { console.error(e); alert("Ошибка при создании чата"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-8 h-8"/></div>;

  return (
    <div className="pb-24 relative min-h-[60vh]">
       <button 
         onClick={() => setShowSearch(true)}
         className="fixed bottom-32 right-6 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform z-40 hover:bg-gray-800"
       >
          <Plus className="w-7 h-7" />
       </button>

       {conversations.length === 0 ? (
          <div className="text-center py-20 text-gray-400 px-6">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><User className="w-8 h-8 text-gray-300"/></div>
             <p>Сообщений пока нет</p>
          </div>
       ) : (
          <div className="divide-y divide-gray-50">
             {conversations.map(chat => (
                <div key={chat.id} onClick={() => setActiveChat(chat)} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors">
                   <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden border border-gray-100 flex-shrink-0">
                      {chat.other_user?.avatar_url ? <img src={chat.other_user.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-gray-100"><User className="w-6 h-6 text-gray-400"/></div>}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-gray-900 truncate text-base">{chat.other_user?.full_name || 'Пользователь'}</h4>
                          <span className="text-[10px] text-gray-400">{new Date(chat.updated_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">Нажмите для просмотра</p>
                   </div>
                </div>
             ))}
          </div>
       )}

       {activeChat && <ChatRoom conversationId={activeChat.id} otherUser={activeChat.other_user} onClose={() => { setActiveChat(null); fetchConversations(); }} />}
       {showSearch && <UserSearch onClose={() => setShowSearch(false)} onUserSelect={handleStartNewChat} />}
    </div>
  );
};