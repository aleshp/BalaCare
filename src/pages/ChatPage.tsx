import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Send, User, Plus, Smile, Check, CheckCheck } from 'lucide-react';
import { Database } from '../types/supabase';
import UserSearch from '../components/UserSearch';

// --- ТИПЫ ---
type Message = Database['public']['Tables']['messages']['Row'] & {
  reactions?: { emoji: string; user_id: string }[];
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

// --- КОМПОНЕНТ: ВЫБОР РЕАКЦИИ ---
const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void, onClose: () => void }) => {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        // @ts-ignore
        if (!e.target.closest('.reaction-picker')) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="reaction-picker absolute -top-12 left-0 bg-white shadow-xl rounded-full px-3 py-2 flex gap-2 animate-scale-in z-50 border border-gray-100">
      {emojis.map(emoji => (
        <button 
          key={emoji} 
          onClick={(e) => { e.stopPropagation(); onSelect(emoji); }}
          className="hover:scale-125 transition-transform text-lg leading-none"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

// --- КОМПОНЕНТ: ПУЗЫРЬ СООБЩЕНИЯ ---
const MessageBubble = ({ msg, isMe, onReact }: { msg: Message, isMe: boolean, onReact: (id: string, emoji: string) => void }) => {
  const [showReactions, setShowReactions] = useState(false);

  const reactionCounts = (msg.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3 relative group`}>
      <div className={`max-w-[75%] relative ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        
        <div 
          onClick={() => setShowReactions(!showReactions)}
          className={`px-4 py-2 text-sm shadow-sm relative cursor-pointer select-none transition-all ${
            isMe 
              ? 'bg-purple-600 text-white rounded-2xl rounded-tr-sm' 
              : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-100'
          }`}
        >
          {showReactions && (
             <ReactionPicker 
               onClose={() => setShowReactions(false)} 
               onSelect={(emoji) => { onReact(msg.id, emoji); setShowReactions(false); }} 
             />
          )}

          <p className="whitespace-pre-wrap leading-relaxed pb-1">{msg.content}</p>
          
          <div className={`text-[10px] flex items-center justify-end gap-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
             <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
             {isMe && (msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
          </div>
        </div>

        {Object.keys(reactionCounts).length > 0 && (
          <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
             {Object.entries(reactionCounts).map(([emoji, count]) => (
                <div key={emoji} className="bg-white/80 border border-gray-100 shadow-sm rounded-full px-1.5 py-0.5 text-xs flex items-center gap-1">
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

// --- КОМПОНЕНТ: КОМНАТА ЧАТА ---
const ChatRoom = ({ conversationId, otherUser, onClose }: { conversationId: string, otherUser: any, onClose: () => void }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`room:${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, 
        (payload) => {
           if (payload.eventType === 'INSERT') {
               setMessages(prev => [...prev, { ...payload.new as Message, reactions: [] }]);
               scrollToBottom();
           }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, 
        () => {
           fetchMessages(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const fetchMessages = async () => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgs) {
        const msgIds = msgs.map(m => m.id);
        const { data: reactions } = await supabase
            .from('message_reactions')
            .select('message_id, emoji, user_id')
            .in('message_id', msgIds);

        const combined = msgs.map(m => ({
            ...m,
            reactions: reactions?.filter(r => r.message_id === m.id) || []
        }));

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

  return (
    // ФИКС 1: z-[99999] (максимальный), чтобы перекрыть любой BottomNav
    <div className="fixed inset-0 z-[99999] bg-[#F2F2F7] flex flex-col h-[100dvh]">
       
       {/* HEADER */}
       <div className="flex-none px-4 py-3 bg-white/90 backdrop-blur border-b border-gray-200 flex items-center gap-3 pt-safe-top shadow-sm z-20">
          <button onClick={onClose} className="p-1 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-900"/>
          </button>
          
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
             {otherUser?.avatar_url ? (
                 <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="User"/>
             ) : (
                 <div className="w-full h-full bg-gradient-to-tr from-blue-400 to-green-400"></div>
             )}
          </div>
          
          <div className="flex-1 min-w-0">
              <span className="font-bold text-gray-900 block truncate">{otherUser?.full_name || 'Собеседник'}</span>
              <span className="text-xs text-gray-500">в сети</span>
          </div>
       </div>

       {/* MESSAGES LIST: flex-1 + min-h-0 */}
       <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-[#e5e5e5]">
          <div className="space-y-1">
            {messages.map((msg) => (
                <MessageBubble 
                    key={msg.id} 
                    msg={msg} 
                    isMe={msg.user_id === user?.id} 
                    onReact={handleReaction} 
                />
            ))}
          </div>
          <div ref={messagesEndRef} className="h-2" />
       </div>

       {/* INPUT AREA: ФИКС 2: pb-10 поднимает инпут выше навбара */}
       <div className="flex-none bg-white border-t border-gray-200 p-3 pb-10 z-30 w-full">
          <div className="flex items-end gap-2 bg-gray-100 p-1.5 rounded-[24px] focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500/50 border border-transparent transition-all">
             <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0">
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
               className="flex-1 bg-transparent py-2 px-2 outline-none text-base resize-none max-h-32 text-gray-900 placeholder-gray-500 min-h-[40px]"
               rows={1}
             />
             
             <button 
                onClick={sendMessage} 
                disabled={!newMessage.trim()}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md flex-shrink-0 ${newMessage.trim() ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-400'}`}
             >
                <Send className="w-5 h-5 ml-0.5" />
             </button>
          </div>
       </div>
    </div>
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
      try {
          const { data: chatId, error } = await supabase.rpc('create_conversation', { other_user_id: targetUser.id });
          if (error) throw error;
          const newChat = { id: chatId, updated_at: new Date().toISOString(), other_user: targetUser };
          setConversations(prev => {
              if (prev.some(c => c.id === chatId)) return prev;
              return [newChat, ...prev];
          });
          setActiveChat(newChat);
      } catch (e) { alert("Ошибка чата"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-8 h-8"/></div>;

  return (
    <div className="pb-20 relative min-h-[60vh]">
       <button 
         onClick={() => setShowSearch(true)}
         className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform z-40"
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
                <div key={chat.id} onClick={() => setActiveChat(chat)} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer active:bg-gray-100">
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