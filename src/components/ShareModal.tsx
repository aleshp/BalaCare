import React from 'react';
import { X, Copy, Share2, MessageCircle, Send } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postUrl: string;
  postText: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, postUrl, postText }) => {
  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${postText}\n\n${postUrl}`);
      alert('Ссылка скопирована!');
      onClose();
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${postText}\n${postUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    onClose();
  };

  const handleTelegram = () => {
    const url = encodeURIComponent(postUrl);
    const text = encodeURIComponent(postText);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    onClose();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BalaCare Post',
          text: postText,
          url: postUrl,
        });
        onClose();
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      alert('Ваш браузер не поддерживает системный шеринг, используйте кнопки выше.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl relative animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-900">Поделиться</h3>
          <button onClick={onClose} className="bg-gray-100 p-1 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* WhatsApp */}
          <button onClick={handleWhatsApp} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
              <MessageCircle className="w-7 h-7" />
            </div>
            <span className="text-xs font-medium text-gray-600">WhatsApp</span>
          </button>

          {/* Telegram */}
          <button onClick={handleTelegram} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-[#0088cc] rounded-full flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
              <Send className="w-6 h-6 ml-0.5" />
            </div>
            <span className="text-xs font-medium text-gray-600">Telegram</span>
          </button>

          {/* Copy Link */}
          <button onClick={handleCopy} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 shadow-sm border border-gray-200 group-active:scale-95 transition-transform">
              <Copy className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-gray-600">Копировать</span>
          </button>

           {/* System Share */}
           <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 shadow-sm border border-gray-200 group-active:scale-95 transition-transform">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-gray-600">Ещё...</span>
          </button>
        </div>

        <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-3 border border-gray-100">
           <div className="flex-1 text-xs text-gray-500 truncate">{postUrl}</div>
           <button onClick={handleCopy} className="text-purple-600 font-bold text-xs">Копировать</button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;