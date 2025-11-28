import React, { useState } from 'react';
import { SCHEMA_SQL } from '../supabaseClient';
import { useAuth } from '../App';
import { AlertCircle, Terminal } from 'lucide-react';
import { useDialog } from '../components/Dialog';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const { login } = useAuth();
  const dialog = useDialog();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (err: any) {
      setError('Credenciais inválidas ou erro de conexão.');
    }
  };

  const copySql = async () => {
    navigator.clipboard.writeText(SCHEMA_SQL);
    await dialog.alert("SQL Copiado!", "O código foi copiado para sua área de transferência. Cole-o no SQL Editor do Supabase.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 pb-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚕</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Genesis</h1>
            <p className="text-slate-500">Sistema de Gestão Médica</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all placeholder-slate-400"
                placeholder="••••••"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-blue-900/20"
            >
              Entrar
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <button 
            onClick={() => setShowSetup(!showSetup)}
            className="text-xs text-slate-500 hover:text-blue-900 underline flex items-center justify-center gap-1 w-full transition-colors"
          >
            <Terminal size={12} /> Primeiro Acesso ou Problemas? Configurar Banco
          </button>
        </div>

        {showSetup && (
          <div className="p-4 bg-slate-800 text-slate-300 text-xs font-mono border-t border-slate-700">
            <p className="mb-2 text-slate-400">
              Para corrigir erros de exclusão ou inicializar o sistema, copie o código abaixo e execute no SQL Editor do Supabase.
            </p>
            <button 
              onClick={copySql}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded mb-2 border border-slate-600 transition-colors"
            >
              Copiar SQL de Atualização/Correção
            </button>
            <div className="bg-black p-2 rounded overflow-x-auto max-h-32 opacity-50">
              <pre>{SCHEMA_SQL}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}