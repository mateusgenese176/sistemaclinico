import React, { useEffect, useState, useRef } from 'react';
import { MessageCircle, X, Send, User as UserIcon, ArrowLeft, Circle } from 'lucide-react';
import { supabase, api } from '../supabaseClient';
import { useAuth } from '../App';
import { Message, User } from '../types';

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'users' | 'chat'>('users');
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Users and Track Presence
  useEffect(() => {
    if (isOpen && user) {
      // Get all potential contacts
      api.getUsers().then(({ data }) => {
        if (data) setUsers(data.filter((u: any) => u.id !== user.id) as User[]);
      });

      // Presence Channel to see who is online
      const presenceChannel = supabase.channel('online_users')
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const online = new Set<string>();
          for (const id in state) {
            // Supabase presence state keys usually map to tracking IDs, we look at payload
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

  // 2. Chat Logic (When entering a chat room)
  useEffect(() => {
    if (isOpen && view === 'chat' && activeChatUser && user) {
      const fetchMsgs = async () => {
        const { data } = await api.getMessages(user.id, activeChatUser.id);
        if (data) setMessages(data as any);
      };
      
      fetchMsgs();

      // Subscribe only to messages involving these two users
      const channel = supabase
        .channel(`chat:${user.id}:${activeChatUser.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const msg = payload.new as Message;
            // Only add if it belongs to this conversation
            if (
              (msg.sender_id === activeChatUser.id && msg.receiver_id === user.id) ||
              (msg.sender_id === user.id && msg.receiver_id === activeChatUser.id)
            ) {
               fetchMsgs(); 
            }
          }
        )
        .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    }
  }, [isOpen, view, activeChatUser, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeChatUser) return;

    await api.sendMessage({
      sender_id: user.id,
      receiver_id: activeChatUser.id,
      content: newMessage,
    });
    setNewMessage('');
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
      </button>
    );
  }

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
            {users.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">Nenhum outro usuário encontrado.</p>}
            {users.map(u => {
              const isOnline = onlineUserIds.has(u.id);
              return (
                <button 
                  key={u.id}
                  onClick={() => handleUserSelect(u)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-left group border border-transparent hover:border-slate-100"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                      {u.name.charAt(0)}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{u.role === 'receptionist' ? 'Atendente' : 'Médico'}</p>
                  </div>
                  <MessageCircle size={16} className="text-slate-300 group-hover:text-blue-500" />
                </button>
              )
            })}
          </div>
        )}

        {/* VIEW: CHAT ROOM */}
        {view === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-xs mt-4">
                  Inicie a conversa com {activeChatUser?.name}
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`
                      max-w-[85%] rounded-2xl p-3 text-sm shadow-sm
                      ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}
                    `}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite..."
                className="flex-1 text-sm bg-slate-50 border-slate-200 border rounded-full px-4 focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                autoFocus
              />
              <button type="submit" className="text-blue-900 hover:bg-blue-50 p-2 rounded-full transition-colors">
                <Send size={20} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}