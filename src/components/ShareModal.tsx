import React, { useEffect, useState } from 'react';
import { X, Copy, Share2, MessageCircle, Send, User, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postUrl: string;
  postText: string;
  postId: string; // <--- НОВЫЙ ПРОП
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, postUrl, postText, postId }) => {
  const { user } = useAuth();
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
        fetchRecentChats();
    }
  }, [isOpen, user]);

  const fetchRecentChats = async () => {
    setLoading(true);
    const { data: myChats } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user!.id);

    if (myChats && myChats.length > 0) {
        const chatIds = myChats.map(c => c.conversation_id);
        const { data: chats } = await supabase
            .from('conversations')
            .select(`id, updated_at, conversation_participants(user_id, profiles(full_name, avatar_url))`)
            .in('id', chatIds)
            .order('updated_at', { ascending: false })
            .limit(5);

        if (chats) {
            const formatted = chats.map((chat: any) => {
                const other = chat.conversation_participants.find((p: any) => p.user_id !== user!.id)?.profiles;
                return { id: chat.id, name: other?.full_name || 'Пользователь', avatar: other?.avatar_url };
            });
            setRecentChats(formatted);
        }
    }
    setLoading(false);
  };

  const sendToChat = async (chatId: string) => {
      setSentTo(prev => [...prev, chatId]);
      
      // ТЕПЕРЬ МЫ ОТПРАВЛЯЕМ post_id, А НЕ ПРОСТО ТЕКСТ
      await supabase.from('messages').insert({
          conversation_id: chatId,
          user_id: user!.id,
          content: 'Поделился постом', // Текст-заглушка (отобразится в списке чатов)
          post_id: postId // <--- САМОЕ ВАЖНОЕ
      });
      
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
  };

  if (!isOpen) return null;

  const handleCopy = async () => { await navigator.clipboard.writeText(`${postUrl}`); alert('Ссылка скопирована'); onClose(); };
  const handleWhatsApp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(postText + '\n' + postUrl)}`, '_blank'); onClose(); };
  const handleTelegram = () => { window.open(`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postText)}`, '_blank'); onClose(); };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900">Поделиться</h3>
          <button onClick={onClose} className="bg-gray-100 p-1 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
        </div>

        {user && (
            <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Отправить в BalaCare</p>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400"/> : 
                     recentChats.length === 0 ? <p className="text-xs text-gray-400">Нет недавних чатов</p> :
                     recentChats.map(chat => {
                         const isSent = sentTo.includes(chat.id);
                         return (
                            <button key={chat.id} onClick={() => !isSent && sendToChat(chat.id)} className="flex flex-col items-center gap-1 min-w-[60px]">
                                <div className="relative">
                                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isSent ? 'border-green-500' : 'border-gray-100'}`}>
                                        {chat.avatar ? <img src={chat.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gray-200 flex items-center justify-center"><User className="w-5 h-5 text-gray-400"/></div>}
                                    </div>
                                    {isSent && <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center"><Check className="w-6 h-6 text-white"/></div>}
                                </div>
                                <span className="text-[10px] text-gray-600 truncate w-full text-center">{chat.name.split(' ')[0]}</span>
                            </button>
                         );
                     })
                    }
                </div>
            </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-4">
          <button onClick={handleWhatsApp} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"><MessageCircle className="w-7 h-7" /></div>
            <span className="text-xs font-medium text-gray-600">WhatsApp</span>
          </button>
          <button onClick={handleTelegram} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-[#0088cc] rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"><Send className="w-6 h-6 ml-0.5" /></div>
            <span className="text-xs font-medium text-gray-600">Telegram</span>
          </button>
          <button onClick={handleCopy} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 shadow-sm active:scale-95 transition-transform"><Copy className="w-6 h-6" /></div>
            <span className="text-xs font-medium text-gray-600">Copy</span>
          </button>
           <button onClick={() => { if(navigator.share) navigator.share({title:'Post', url: postUrl}) }} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 shadow-sm active:scale-95 transition-transform"><Share2 className="w-6 h-6" /></div>
            <span className="text-xs font-medium text-gray-600">System</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;