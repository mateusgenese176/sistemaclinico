import React, { useState } from 'react';
import { api } from '../supabaseClient';
import { useAuth } from '../App';
import { User, Lock, Save, FileBadge } from 'lucide-react';

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    crm: user?.crm || '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    try {
      const updates: any = { name: formData.name, crm: formData.crm };
      if (formData.password) {
        updates.password = formData.password;
      }
      
      await api.updateUser(user.id, updates);
      setMessage('Perfil atualizado com sucesso! Por favor, faça login novamente.');
      setTimeout(() => logout(), 2000);
    } catch (e) {
      setMessage('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-slate-900">Meu Perfil</h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name.charAt(0)}
          </div>
          <div>
             <h3 className="font-bold text-slate-900">{user?.name}</h3>
             <p className="text-sm text-slate-500">@{user?.username} • {user?.role}</p>
          </div>
        </div>
        
        <form onSubmit={handleUpdate} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome de Exibição</label>
            <div className="relative">
               <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 required
                 value={formData.name}
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all"
               />
            </div>
          </div>

          {user?.role === 'doctor' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CRM (Registro Médico)</label>
              <div className="relative">
                 <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                   placeholder="Ex: 12345/SP"
                   value={formData.crm}
                   onChange={e => setFormData({...formData, crm: e.target.value})}
                   className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                 />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha (opcional)</label>
            <div className="relative">
               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="password"
                 placeholder="Deixe em branco para manter a atual"
                 value={formData.password}
                 onChange={e => setFormData({...formData, password: e.target.value})}
                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all"
               />
            </div>
          </div>

          {message && (
             <div className={`p-3 rounded-lg text-sm ${message.includes('sucesso') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
               {message}
             </div>
          )}

          <div className="pt-2">
            <button 
              disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              {loading ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}