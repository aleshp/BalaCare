import React, { useEffect, useState } from 'react';
import { X, Loader2, User, CornerDownRight, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PostItem from './PostItem';
import { Database } from '../types/supabase';

type PostWithData = Database['public']['Tables']['community_posts']['Row'] & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  post_likes: { user_id: string }[];
  post_media?: { media_url: string; media_type: 'image' | 'video' }[]; 
};

type CommentWithProfile = Database['public']['Tables']['post_comments']['Row'] & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  children?: CommentWithProfile[];
};

interface ThreadViewProps {
  post: PostWithData;
  onClose: () => void;
  onPostUpdate: (postId: string, newLikeCount: number, isLiked: boolean) => void;
  onCommentAdded: () => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({ post, onClose, onPostUpdate, onCommentAdded }) => {
  const { user, openAuthModal } = useAuth();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`*, profiles:user_id (full_name, avatar_url)`)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    
    if (data) {
      const commentsByParent: Record<string, CommentWithProfile[]> = {};
      const rootComments: CommentWithProfile[] = [];

      data.forEach((c: any) => {
        c.children = [];
        if (c.parent_id) {
          if (!commentsByParent[c.parent_id]) commentsByParent[c.parent_id] = [];
          commentsByParent[c.parent_id].push(c);
        } else {
          rootComments.push(c);
        }
      });

      const buildTree = (nodes: CommentWithProfile[]) => {
        nodes.forEach(node => {
          if (commentsByParent[node.id]) {
            node.children = commentsByParent[node.id];
            buildTree(node.children);
          }
        });
      };

      buildTree(rootComments);
      setComments(rootComments);
    }
    setLoading(false);
  };

  const handleSendComment = async () => {
    if (!user) return openAuthModal();
    if (!newComment.trim()) return;
    
    setSending(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment,
          parent_id: replyTo?.id || null
        });

      if (error) throw error;
      
      setNewComment('');
      setReplyTo(null);
      await fetchComments(); 
      onCommentAdded();
    } catch (err) {
      alert('Ошибка при отправке');
    } finally {
      setSending(false);
    }
  };

  const CommentNode = ({ comment, depth = 0 }: { comment: CommentWithProfile, depth?: number }) => (
    <div className={`relative ${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
       {depth > 0 && <div className="absolute -left-5 top-[-10px] w-4 h-4 border-l-2 border-b-2 border-gray-200 rounded-bl-xl"></div>}
       
       <div className="flex gap-3">
          <div className="flex-shrink-0">
             <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
               {comment.profiles?.avatar_url ? (
                 <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt="User" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-gray-50"><User className="w-4 h-4 text-gray-400"/></div>
               )}
             </div>
          </div>
          <div className="flex-1">
             <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none inline-block min-w-[200px]">
                <div className="flex justify-between items-baseline gap-2">
                   <span className="font-bold text-sm text-gray-900">{comment.profiles?.full_name || 'Аноним'}</span>
                   <span className="text-[10px] text-gray-400">{new Date(comment.created_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
             </div>
             <button 
               onClick={() => setReplyTo({ id: comment.id, name: comment.profiles?.full_name || 'Аноним' })}
               className="text-xs font-semibold text-gray-500 mt-1 ml-2 hover:text-purple-600"
             >
               Ответить
             </button>
          </div>
       </div>
       
       {comment.children && comment.children.map(child => <CommentNode key={child.id} comment={child} depth={depth + 1} />)}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4 bg-white/90 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <X className="w-6 h-6 text-gray-900" />
        </button>
        <h2 className="font-bold text-lg">Обсуждение</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 bg-white">
        <div className="pt-2">
           <PostItem post={post} isDetailView={true} onPostUpdate={onPostUpdate} />
        </div>

        <div className="h-px bg-gray-100 w-full my-2"></div>

        <div className="px-4 pb-4">
          {loading ? (
             <div className="flex justify-center py-4"><Loader2 className="animate-spin text-purple-600"/></div>
          ) : comments.length === 0 ? (
             <div className="text-center py-8 text-gray-400 text-sm">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-gray-300" />
                </div>
                Комментариев пока нет. Будьте первым!
             </div>
          ) : (
            comments.map((comment) => (
              <CommentNode key={comment.id} comment={comment} />
            ))
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-3 fixed bottom-0 left-0 right-0 z-20 pb-safe">
        {replyTo && (
           <div className="flex justify-between items-center bg-gray-100 px-4 py-2 rounded-t-xl text-xs text-gray-600 mb-1 mx-1">
              <span className="flex items-center gap-1"><CornerDownRight className="w-3 h-3"/> Ответ для <b>{replyTo.name}</b></span>
              <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-3 h-3"/></button>
           </div>
        )}
        <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-3xl border border-gray-200 focus-within:border-purple-400 transition-all shadow-sm">
           <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mb-1 ml-1">
               {user?.user_metadata.avatar_url ? (
                   <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover"/>
               ) : (
                   <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
               )}
           </div>
           <textarea 
             value={newComment}
             onChange={e => setNewComment(e.target.value)}
             placeholder={replyTo ? "Ваш ответ..." : "Добавьте комментарий..."}
             className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400 px-2 py-2 max-h-24 resize-none"
             rows={1}
             onKeyDown={(e) => {
                 if(e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSendComment();
                 }
             }}
           />
           <button 
             onClick={handleSendComment}
             disabled={!newComment.trim() || sending}
             className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
           >
             {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5 ml-0.5" />}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ThreadView;