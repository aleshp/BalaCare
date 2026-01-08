import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Send, User, Plus } from 'lucide-react';
import { Database } from '../types/supabase';
import UserSearch from '../components/UserSearch'; // Убедитесь, что этот компонент создан

// --- ТИПЫ ---
type Message = Database['public']['Tables']['messages']['Row'];

type Conversation = {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

// --- КОМПОНЕНТ КОМНАТЫ ЧАТА (Внутренний) ---
const ChatRoom = ({ 
  conversationId, 
  otherUser, 
  onClose 
}: { 
  conversationId: string, 
  otherUser: any, 
  onClose: () => void 
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Подписка на новые сообщения в ЭТОМ чате
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { 
         event: 'INSERT', 
         schema: 'public', 
         table: 'messages', 
         filter: `conversation_id=eq.${conversationId}` 
      }, (payload) => {
         const newMsg = payload.new as Message;
         // Добавляем сообщение, если его еще нет (защита от дублей)
         setMessages(prev => {
             if (prev.some(m => m.id === newMsg.id)) return prev;
             return [...prev, newMsg];
         });
         scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (data) {
        setMessages(data);
        scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const content = newMessage.trim();
    setNewMessage(''); // Очищаем сразу для UX

    try {
        const { error } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: user.id,
            content: content
        });

        if (error) throw error;

        // Обновляем время последнего сообщения в чате (чтобы поднять его в списке)
        await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);
            
    } catch (e) {
        console.error("Ошибка отправки:", e);
        alert("Не удалось отправить сообщение");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-slide-in-right">
       {/* Шапка чата */}
       <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white/90 backdrop-blur shadow-sm pt-safe-top">
          <button onClick={onClose} className="p-1 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6 text-gray-700"/>
          </button>
          
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
             {otherUser?.avatar_url ? (
                 <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
             ) : (
                 <div className="w-full h-full bg-gradient-to-tr from-blue-400 to-green-400"></div>
             )}
          </div>
          
          <div className="flex-1 min-w-0">
              <span className="font-bold text-gray-900 block truncate leading-tight">
                  {otherUser?.full_name || 'Собеседник'}
              </span>
              <span className="text-xs text-green-500 font-medium">Онлайн</span>
          </div>
       </div>

       {/* Список сообщений */}
       <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]">
          {messages.map((msg) => {
             const isMe = msg.user_id === user?.id;
             return (
               <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                     isMe 
                       ? 'bg-purple-600 text-white rounded-tr-none' 
                       : 'bg-white text-gray-900 rounded-tl-none border border-gray-200'
                  }`}>
                     <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                     <div className={`text-[10px] mt-1 text-right opacity-70`}>
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </div>
                  </div>
               </div>
             );
          })}
          <div ref={messagesEndRef} />
       </div>

       {/* Поле ввода */}
       <div className="p-3 bg-white border-t border-gray-100 pb-safe">
          <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-3xl border border-gray-200 focus-within:border-purple-300 transition-all">
             <textarea 
               value={newMessage}
               onChange={e => setNewMessage(e.target.value)}
               onKeyDown={e => {
                   if(e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       sendMessage();
                   }
               }}
               placeholder="Напишите сообщение..."
               className="flex-1 bg-transparent px-3 py-2 outline-none text-sm resize-none max-h-32"
               rows={1}
             />
             <button 
               onClick={sendMessage} 
               disabled={!newMessage.trim()}
               className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md mb-0.5"
             >
                <Send className="w-5 h-5 ml-0.5" />
             </button>
          </div>
       </div>
    </div>
  );
};

// --- ОСНОВНОЙ КОМПОНЕНТ (СПИСОК) ---
export const ChatList = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  
  // Состояние для модалки поиска
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    
    try {
        // 1. Находим ID чатов, где есть текущий юзер
        const { data: myChats } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (!myChats || myChats.length === 0) {
            setLoading(false);
            return;
        }

        const chatIds = myChats.map(c => c.conversation_id);

        // 2. Загружаем данные чатов и участников
        const { data: chats } = await supabase
          .from('conversations')
          .select(`
            id, updated_at,
            conversation_participants (
               user_id,
               profiles (id, full_name, avatar_url)
            )
          `)
          .in('id', chatIds)
          .order('updated_at', { ascending: false });

        if (chats) {
            // Преобразуем данные: находим "собеседника" для каждого чата
            const formatted = chats.map((chat: any) => {
               // Ищем участника, который НЕ я
               const other = chat.conversation_participants.find((p: any) => p.user_id !== user.id)?.profiles;
               
               // Если собеседник удалился или баг, ставим заглушку
               return {
                 id: chat.id,
                 updated_at: chat.updated_at,
                 other_user: other || { id: 'deleted', full_name: 'Удаленный аккаунт', avatar_url: null }
               };
            });
            setConversations(formatted);
        }
    } catch (e) {
        console.error("Ошибка загрузки чатов", e);
    } finally {
        setLoading(false);
    }
  };

  const handleStartNewChat = async (targetUser: any) => {
      setShowSearch(false); // Закрываем поиск
      if (!user) return;

      try {
          // В реальном приложении здесь нужен RPC вызов "find_or_create_conversation"
          // Сейчас упрощенно: создаем новый.
          const { data: conv, error } = await supabase.from('conversations').insert({}).select().single();
          if (error) throw error;
          
          // Добавляем участников
          await supabase.from('conversation_participants').insert([
              { conversation_id: conv.id, user_id: user.id },
              { conversation_id: conv.id, user_id: targetUser.id }
          ]);
          
          // Сразу открываем этот чат
          const newChatObj: Conversation = {
              id: conv.id,
              updated_at: new Date().toISOString(),
              other_user: targetUser
          };
          
          // Добавляем в список и открываем
          setConversations(prev => [newChatObj, ...prev]);
          setActiveChat(newChatObj);
          
      } catch (e) {
          console.error(e);
          alert("Ошибка при создании чата");
      }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-8 h-8"/></div>;

  return (
    <div className="pb-20 relative min-h-[60vh]">
       {/* Кнопка создания нового чата (FAB) */}
       <button 
         onClick={() => setShowSearch(true)}
         className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform z-40 hover:bg-gray-900"
       >
          <Plus className="w-7 h-7" />
       </button>

       {conversations.length === 0 ? (
          <div className="text-center py-20 text-gray-400 px-6">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <User className="w-8 h-8 text-gray-300"/>
             </div>
             <p className="font-medium text-gray-600">У вас пока нет сообщений</p>
             <p className="text-sm mt-2">Нажмите кнопку +, чтобы найти друзей или специалистов.</p>
          </div>
       ) : (
          <div className="divide-y divide-gray-50">
             {conversations.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => setActiveChat(chat)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
                >
                   {/* Аватар */}
                   <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden border border-gray-100 flex-shrink-0">
                      {chat.other_user?.avatar_url ? (
                        <img src={chat.other_user.avatar_url} className="w-full h-full object-cover" alt="User"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100"><User className="w-6 h-6 text-gray-400"/></div>
                      )}
                   </div>
                   
                   {/* Текст */}
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-gray-900 truncate text-base">
                              {chat.other_user?.full_name || 'Пользователь'}
                          </h4>
                          <span className="text-[10px] text-gray-400">
                              {new Date(chat.updated_at).toLocaleDateString()}
                          </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                          Нажмите, чтобы открыть переписку
                      </p>
                   </div>
                </div>
             ))}
          </div>
       )}

       {/* Модальное окно чата */}
       {activeChat && (
          <ChatRoom 
            conversationId={activeChat.id} 
            otherUser={activeChat.other_user} 
            onClose={() => { 
                setActiveChat(null); 
                fetchConversations(); // Обновляем список при выходе, чтобы подтянуть время
            }} 
          />
       )}
       
       {/* Модальное окно поиска */}
       {showSearch && (
           <UserSearch 
               onClose={() => setShowSearch(false)} 
               onUserSelect={handleStartNewChat} 
           />
       )}
    </div>
  );
};