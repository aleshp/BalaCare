import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Send, User, Plus, Smile, Check, CheckCheck, Paperclip, X, Mic } from 'lucide-react';
import { Database } from '../types/supabase';
import UserSearch from '../components/UserSearch';
import ReactTextareaAutosize from 'react-textarea-autosize';

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
const ReactionPicker = ({ onSelect, onClose, position }: { onSelect: (emoji: string) => void, onClose: () => void, position: 'left' | 'right' }) => {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '😡'];
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.reaction-picker')) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className={`reaction-picker absolute -top-12 ${position === 'right' ? 'right-0' : 'left-0'} bg-white dark:bg-gray-800 shadow-xl rounded-full px-3 py-2 flex gap-2 animate-scale-in z-50 border border-gray-100 dark:border-gray-700`}>
      {emojis.map(emoji => (
        <button 
          key={emoji} 
          onClick={(e) => { e.stopPropagation(); onSelect(emoji); }}
          className="hover:scale-125 active:scale-110 transition-transform text-lg leading-none"
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
  const [isPressed, setIsPressed] = useState(false);

  const reactionCounts = (msg.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleLongPress = useCallback(() => {
    setShowReactions(true);
  }, []);

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3 relative group`}>
      <div className={`max-w-[85%] relative ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        <div 
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onClick={() => setShowReactions(!showReactions)}
          className={`px-4 py-2.5 text-sm shadow-sm relative cursor-pointer select-none transition-all duration-150 ${
            isPressed ? 'scale-[0.98]' : ''
          } ${
            isMe 
              ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl rounded-tr-sm' 
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700'
          }`}
        >
          {showReactions && (
            <ReactionPicker 
              onClose={() => setShowReactions(false)} 
              onSelect={(emoji) => { onReact(msg.id, emoji); setShowReactions(false); }}
              position={isMe ? 'right' : 'left'}
            />
          )}

          <p className="whitespace-pre-wrap leading-relaxed pb-1 break-words">{msg.content}</p>
          
          <div className={`text-[11px] flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400 dark:text-gray-500'}`}>
            <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            {isMe && (msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
          </div>
        </div>

        {Object.keys(reactionCounts).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <div 
                key={emoji} 
                className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm rounded-full px-2 py-0.5 text-xs flex items-center gap-1 hover:scale-105 transition-transform"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="font-bold text-gray-600 dark:text-gray-300">{count}</span>}
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
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Автоскролл к последнему сообщению
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 100);
  }, []);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`room:${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${conversationId}` 
      }, (payload) => {
        setMessages(prev => [...prev, { ...payload.new as Message, reactions: [] }]);
        scrollToBottom();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'message_reactions' 
      }, () => {
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
      scrollToBottom('auto');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || isSending) return;
    
    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        content: content
      });
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    } catch (e) {
      console.error("Ошибка отправки:", e);
      alert("Ошибка отправки сообщения");
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Обработчик скролла для скрытия клавиатуры при прокрутке
  useEffect(() => {
    const handleScroll = () => {
      if (document.activeElement?.tagName === 'TEXTAREA') {
        (document.activeElement as HTMLElement).blur();
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] bg-[#F2F2F7] dark:bg-gray-900 flex flex-col h-[100dvh]">
      {/* HEADER */}
      <div className="flex-none px-4 py-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 pt-safe-top shadow-sm z-20">
        <button 
          onClick={onClose} 
          className="p-1.5 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white"/>
        </button>
        
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt={otherUser.full_name || 'User'}/>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-400 to-green-400">
              <User className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <span className="font-bold text-gray-900 dark:text-white block truncate text-lg">
            {otherUser?.full_name || 'Собеседник'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isTyping ? 'печатает...' : 'в сети'}
          </span>
        </div>
        
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* MESSAGES LIST */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="space-y-1 max-w-4xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isMe={msg.user_id === user?.id} 
              onReact={handleReaction} 
            />
          ))}
        </div>
        <div ref={messagesEndRef} className="h-6" />
      </div>

      {/* FIXED INPUT AREA */}
      <div className="flex-none bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-30 w-full sticky bottom-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            {/* Кнопки дополнительных действий */}
            <div className="flex items-center gap-1">
              <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Mic className="w-5 h-5" />
              </button>
            </div>
            
            {/* Текстовое поле */}
            <div className="flex-1 min-w-0 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2.5 focus-within:bg-white dark:focus-within:bg-gray-600 focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500/50 border border-transparent transition-all">
              <ReactTextareaAutosize
                ref={textareaRef}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Сообщение..."
                className="w-full bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none max-h-32 text-base leading-relaxed"
                minRows={1}
                maxRows={5}
                autoFocus
              />
            </div>
            
            {/* Кнопка отправки */}
            <button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                newMessage.trim() 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600 active:scale-95' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>
          
          {/* Подсказка под инпутом */}
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
            Нажмите Enter для отправки, Shift + Enter для новой строки
          </div>
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
      const { data: myChats } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!myChats || myChats.length === 0) { 
        setLoading(false); 
        return; 
      }

      const chatIds = myChats.map(c => c.conversation_id);
      const { data: chats } = await supabase
        .from('conversations')
        .select(`
          id, 
          updated_at, 
          conversation_participants (
            user_id, 
            profiles (
              id, 
              full_name, 
              avatar_url
            )
          )
        `)
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (chats) {
        const formatted = chats.map((chat: any) => {
          const other = chat.conversation_participants
            .find((p: any) => p.user_id !== user.id)?.profiles;
          return { 
            id: chat.id, 
            updated_at: chat.updated_at, 
            other_user: other || { 
              id: 'del', 
              full_name: 'Удаленный пользователь', 
              avatar_url: null 
            } 
          };
        });
        setConversations(formatted);
      }
    } catch (e) { 
      console.error("Ошибка загрузки чатов:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleStartNewChat = async (targetUser: any) => {
    setShowSearch(false);
    if (!user) return;
    
    // Проверяем, есть ли уже существующий чат
    const existingChat = conversations.find(chat => 
      chat.other_user?.id === targetUser.id
    );
    
    if (existingChat) {
      setActiveChat(existingChat);
      return;
    }

    try {
      const { data: chatId, error } = await supabase
        .rpc('create_conversation', { other_user_id: targetUser.id });
      
      if (error) throw error;
      
      const newChat = { 
        id: chatId, 
        updated_at: new Date().toISOString(), 
        other_user: targetUser 
      };
      
      setConversations(prev => {
        if (prev.some(c => c.id === chatId)) return prev;
        return [newChat, ...prev];
      });
      
      setActiveChat(newChat);
    } catch (e) { 
      console.error("Ошибка создания чата:", e);
      alert("Не удалось создать чат. Пожалуйста, попробуйте снова."); 
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-600 dark:text-purple-400 w-8 h-8 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Загрузка чатов...</p>
      </div>
    );
  }

  return (
    <div className="pb-32 relative min-h-[70vh]">
      {/* Заголовок */}
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Сообщения</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {conversations.length === 0 
            ? 'Начните новый диалог' 
            : `У вас ${conversations.length} диалог${conversations.length % 10 === 1 ? '' : 'ов'}`}
        </p>
      </div>

      {/* Список чатов */}
      {conversations.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Сообщений пока нет
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
            Начните новый диалог, чтобы общаться с другими пользователями
          </p>
          <button 
            onClick={() => setShowSearch(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-3 rounded-full font-medium hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Начать новый чат
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {conversations.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChat(chat)}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
            >
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
                  {chat.other_user?.avatar_url ? (
                    <img 
                      src={chat.other_user.avatar_url} 
                      className="w-full h-full object-cover"
                      alt={chat.other_user.full_name || 'User'}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-400 to-green-400">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-gray-900 dark:text-white truncate text-base">
                    {chat.other_user?.full_name || 'Пользователь'}
                  </h4>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(chat.updated_at).toLocaleDateString('ru-RU', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  Нажмите для просмотра сообщений
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Кнопка нового чата */}
      <button 
        onClick={() => setShowSearch(true)}
        className="fixed bottom-32 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-3xl active:scale-95 transition-all z-40"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Компоненты */}
      {activeChat && (
        <ChatRoom 
          conversationId={activeChat.id} 
          otherUser={activeChat.other_user} 
          onClose={() => { 
            setActiveChat(null); 
            fetchConversations(); 
          }} 
        />
      )}
      
      {showSearch && (
        <UserSearch 
          onClose={() => setShowSearch(false)} 
          onUserSelect={handleStartNewChat} 
        />
      )}
    </div>
  );
};

// BottomNav остается без изменений