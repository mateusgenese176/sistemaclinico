import React, { useState } from 'react';
import { api } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, AlertCircle } from 'lucide-react';

export default function PatientCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newP, setNewP] = useState({ 
    name: '', cpf: '', contact: '', dob: '', social_info: '', photo_url: '' 
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sanitize payload to avoid DB errors
      const payload = {
        name: newP.name,
        cpf: newP.cpf,
        contact: newP.contact,
        // Send null if empty string for Date type
        dob: newP.dob ? newP.dob : null,
        social_info: newP.social_info,
        photo_url: newP.photo_url || null,
        tags: [],
        anthropometrics: {}
      };

      const { error: apiError } = await api.createPatient(payload);
      
      if (apiError) throw apiError;
      
      navigate('/patients');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao criar paciente. Verifique se o banco de dados foi atualizado.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewP({ ...newP, photo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <button onClick={() => navigate('/patients')} className="text-slate-500 hover:text-blue-900 flex items-center gap-2 transition-colors">
        <ArrowLeft size={20} /> Voltar para lista
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Novo Paciente</h2>
          <p className="text-slate-500 text-sm">Preencha os dados abaixo para cadastrar um novo paciente.</p>
        </div>
        
        <form onSubmit={handleCreate} className="p-8 space-y-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Photo Section */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden group">
              {newP.photo_url ? (
                <img src={newP.photo_url} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-slate-300">
                  <Camera size={40} />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all cursor-pointer">
                <label className="cursor-pointer text-white flex flex-col items-center text-xs font-medium">
                  <Upload size={24} className="mb-1"/>
                  Alterar Foto
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
            
            <label className="text-blue-600 text-sm font-medium cursor-pointer hover:underline">
              {newP.photo_url ? 'Alterar foto de perfil' : 'Adicionar foto de perfil'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
              <input required 
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all" 
                value={newP.name} onChange={e => setNewP({...newP, name: e.target.value})} placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
              <input 
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all" 
                value={newP.cpf} onChange={e => setNewP({...newP, cpf: e.target.value})} placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento *</label>
              <input type="date" required 
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all" 
                value={newP.dob} onChange={e => setNewP({...newP, dob: e.target.value})} 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Contato</label>
              <input 
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all" 
                value={newP.contact} onChange={e => setNewP({...newP, contact: e.target.value})} placeholder="(00) 00000-0000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Informações Sociais</label>
              <textarea rows={4} 
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all resize-none" 
                value={newP.social_info} onChange={e => setNewP({...newP, social_info: e.target.value})} 
                placeholder="Descreva o contexto social, familiar e profissional..." 
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4 border-t border-slate-100">
            <button type="button" onClick={() => navigate('/patients')} className="flex-1 py-3 bg-slate-100 rounded-lg text-slate-700 font-medium hover:bg-slate-200 transition-colors">Cancelar</button>
            <button disabled={loading} type="submit" className="flex-1 py-3 bg-blue-900 rounded-lg text-white font-medium hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/20">
              {loading ? 'Cadastrando...' : 'Cadastrar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}