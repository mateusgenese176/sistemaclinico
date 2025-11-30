
import React, { useEffect, useState, useRef } from 'react';
import { MessageCircle, X, Send, User as UserIcon, ArrowLeft, Trash2, AlertTriangle, Bell } from 'lucide-react';
import { supabase, api } from '../supabaseClient';
import { useAuth } from '../App';
import { Message, User } from '../types';
import { useDialog } from './Dialog';

// Sound effect for new messages
const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function ChatWidget() {
  const { user } = useAuth();
  const dialog = useDialog();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'users' | 'chat'>('users');
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // Unread Messages Tracking
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Explicit casting to number[] to avoid TypeScript inference issues
  const hasUnread = (Object.values(unreadCounts) as number[]).some(c => c > 0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(new Audio(NOTIFICATION_SOUND));

  // 1. Fetch Users and Track Presence
  useEffect(() => {
    if (isOpen && user) {
      api.getUsers().then(({ data }) => {
        const allUsers = (data as User[]) || [];
        if (allUsers) setUsers(allUsers.filter((u: any) => u.id !== user.id));
      });

      const presenceChannel = supabase.channel('online_users')
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const online = new Set<string>();
          for (const id in state) {
             state[id].forEach((p: any) => {
               if(p.user_id) online.add(p.user_id);
             });
          }
          setOnlineUserIds(online);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        });

      return () => { supabase.removeChannel(presenceChannel); };
    }
  }, [isOpen, user]);

  // 2. Global Listener (Notifications & Unread Counts)
  useEffect(() => {
    if (user) {
      const globalChannel = supabase
        .channel(`global_chat:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          (payload) => {
            const msg = payload.new as Message;
            
            // Check if we need to notify (if chat is closed OR talking to someone else)
            const isChattingWithSender = isOpen && activeChatUser?.id === msg.sender_id;
            
            if (!isChattingWithSender) {
               setUnreadCounts(prev => ({
                 ...prev,
                 [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
               }));
               
               // Play Sound
               audioRef.current.play().catch(e => console.log("Audio interaction needed"));
            }

            // Handle Urgent Popup
            if (msg.is_urgent) {
              const senderName = users.find(u => u.id === msg.sender_id)?.name || 'Usuário';
              dialog.alert(
                "⚠️ AVISO IMPORTANTE", 
                `Mensagem urgente de ${senderName}: "${msg.content}"`
              );
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(globalChannel); };
    }
  }, [user, isOpen, activeChatUser, users, dialog]);

  // 3. Active Chat Logic
  useEffect(() => {
    if (isOpen && view === 'chat' && activeChatUser && user) {
      // Reset unread count for this user
      setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[activeChatUser.id];
        return next;
      });

      const fetchMsgs = async () => {
        const { data } = await api.getMessages(user.id, activeChatUser.id);
        setMessages((data as any) || []);
      };
      
      fetchMsgs();

      const channel = supabase
        .channel(`chat_room:${user.id}:${activeChatUser.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' }, 
          (payload) => {
            const newMsg = payload.new as Message;
            const oldMsg = payload.old as Partial<Message>;

            // Refresh if message belongs to this conversation
            const relevant = 
              (newMsg && newMsg.sender_id === activeChatUser.id && newMsg.receiver_id === user.id) ||
              (newMsg && newMsg.sender_id === user.id && newMsg.receiver_id === activeChatUser.id) ||
              (oldMsg && oldMsg.id && messages.some(m => m.id === oldMsg.id)); // Deletion check

            if (relevant || payload.eventType === 'DELETE') {
               fetchMsgs(); 
            }
          }
        )
        .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    }
  }, [isOpen, view, activeChatUser, user]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeChatUser) return;

    const tempId = Math.random().toString();
    const optimisticMsg: Message = {
        id: tempId,
        sender_id: user.id,
        receiver_id: activeChatUser.id,
        content: newMessage,
        is_urgent: isUrgent,
        created_at: new Date().toISOString()
    };
    
    // Optimistic UI update
    setMessages(prev => [...prev, optimisticMsg]);
    const contentToSend = newMessage;
    const urgentToSend = isUrgent;
    
    setNewMessage('');
    setIsUrgent(false);

    await api.sendMessage({
      sender_id: user.id,
      receiver_id: activeChatUser.id,
      content: contentToSend,
      is_urgent: urgentToSend
    });
  };

  const handleDeleteMessage = async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await api.deleteMessage(msgId);
  };

  const handleUserSelect = (targetUser: User) => {
    setActiveChatUser(targetUser);
    setView('chat');
  };

  const goBack = () => {
    setView('users');
    setActiveChatUser(null);
    setMessages([]);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-900 hover:bg-blue-800 text-white p-4 rounded-full shadow-xl shadow-blue-900/30 transition-all transform hover:scale-105 relative"
      >
        <MessageCircle size={24} />
        {hasUnread && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>
    );
  }
  
  const safeUsers = users || [];
  const safeMessages = messages || [];

  return (
    <div className="bg-white w-80 h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="bg-blue-900 p-4 text-white flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-2">
           {view === 'chat' && (
             <button onClick={goBack} className="hover:bg-blue-800 p-1 rounded-full mr-1">
               <ArrowLeft size={16} />
             </button>
           )}
           <h3 className="font-semibold flex items-center gap-2 text-sm">
             {view === 'users' ? 'Contatos' : activeChatUser?.name}
           </h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-blue-800 p-1 rounded">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
        
        {/* VIEW: USER LIST */}
        {view === 'users' && (
          <div className="overflow-y-auto p-2 space-y-1 h-full">
            {safeUsers.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">Nenhum outro usuário encontrado.</p>}
            {safeUsers.map(u => {
              const isOnline = onlineUserIds.has(u.id);
              const unreadCount = unreadCounts[u.id] || 0;

              return (
                <button 
                  key={u.id}
                  onClick={() => handleUserSelect(u)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-left group border border-transparent hover:border-slate-100 relative"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                      {u.name.charAt(0)}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{u.role === 'receptionist' ? 'Atendente' : 'Médico'}</p>
                  </div>
                  
                  {unreadCount > 0 ? (
                    <div className="bg-red-50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {unreadCount}
                    </div>
                  ) : (
                    <MessageCircle size={16} className="text-slate-300 group-hover:text-blue-500" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* VIEW: CHAT ROOM */}
        {view === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100">
              {safeMessages.length === 0 && (
                <div className="text-center text-slate-400 text-xs mt-4">
                  Inicie a conversa com {activeChatUser?.name}
                </div>
              )}
              {safeMessages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                    <div className={`
                      max-w-[85%] rounded-2xl p-3 text-sm shadow-sm relative
                      ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}
                      ${msg.is_urgent ? 'border-2 border-red-500 bg-red-50 text-red-900' : ''}
                    `}>
                      {msg.is_urgent && (
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase mb-1 text-red-600">
                          <AlertTriangle size={10} /> Urgente
                        </div>
                      )}
                      {msg.content}
                      
                      {isMe && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute -left-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Apagar mensagem para todos"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t border-slate-200 bg-white">
               {isUrgent && (
                 <div className="bg-red-50 text-red-600 text-xs px-3 py-1 rounded-t-lg flex justify-between items-center">
                   <span className="font-bold flex items-center gap-1"><AlertTriangle size={12}/> Enviando como Aviso Importante</span>
                   <button onClick={() => setIsUrgent(false)}><X size={12}/></button>
                 </div>
               )}
               <form onSubmit={handleSend} className="flex gap-2 items-center">
                <button 
                  type="button" 
                  onClick={() => setIsUrgent(!isUrgent)}
                  className={`p-2 rounded-full transition-colors ${isUrgent ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100'}`}
                  title="Marcar como Aviso Importante (Abre janela no destinatário)"
                >
                  <Bell size={20} className={isUrgent ? "fill-current" : ""} />
                </button>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite..."
                  className={`flex-1 text-sm bg-slate-50 border border-slate-200 rounded-full px-4 py-2 focus:ring-2 outline-none transition-all ${isUrgent ? 'focus:ring-red-500 border-red-200 bg-red-50' : 'focus:ring-blue-900'}`}
                  autoFocus
                />
                <button type="submit" className={`p-2 rounded-full transition-colors text-white ${isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-900 hover:bg-blue-800'}`}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
