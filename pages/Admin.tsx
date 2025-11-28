import React, { useState, useEffect } from 'react';
import { api } from '../supabaseClient';
import { User, UserRole } from '../types';
import { Trash2, Plus, AlertCircle, Loader } from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: UserRole.DOCTOR });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    const { data } = await api.getUsers();
    if (data) setUsers(data as User[]);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { error: apiError } = await api.createUser(newUser);
      if (apiError) throw apiError;
      
      setNewUser({ username: '', password: '', name: '', role: UserRole.DOCTOR });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ATENÇÃO: Tem certeza que deseja excluir este usuário?")) return;

    setDeletingId(id);
    const originalUsers = [...users];
    
    // 1. Otimismo: Remove da tela imediatamente
    setUsers(prev => prev.filter(u => u.id !== id));

    try {
      // 2. Chama a API (que agora usa RPC no banco para limpar tudo)
      const { error } = await api.deleteUser(id);
      if (error) throw error;
      
      // Sucesso total
    } catch (err: any) {
      console.error(err);
      // 3. Rollback se der erro grave
      setUsers(originalUsers);
      alert(`Falha ao excluir. \n\nErro Técnico: ${err.message}\n\nDICA: Vá na tela de Login -> 'Configurar Banco' e atualize o SQL no Supabase.`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Gerenciamento de Usuários</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-800">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-900"><Plus size={20} /></div>
            Novo Usuário
          </h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} /> <span className="flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Nome Completo</label>
              <input 
                required
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Username</label>
              <input 
                required
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <input 
                required
                type="password"
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Função</label>
              <select 
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none"
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
              >
                <option value="doctor">Médico</option>
                <option value="receptionist">Atendente</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button 
              disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Adicionar Usuário'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Nome</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Username</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Função</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-sm"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{u.name}</td>
                  <td className="px-6 py-4 text-slate-500">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={`
                      px-2.5 py-1 rounded-full text-xs font-semibold
                      ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                        u.role === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                    `}>
                      {u.role === 'doctor' ? 'Médico' : u.role === 'receptionist' ? 'Atendente' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.username !== 'admin' && (
                      <button 
                        onClick={() => handleDelete(u.id)}
                        disabled={deletingId === u.id}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50 disabled:opacity-50"
                        title="Excluir Usuário"
                      >
                        {deletingId === u.id ? <Loader size={18} className="animate-spin text-red-600"/> : <Trash2 size={18} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}