import React, { useState, useEffect } from 'react';
import { api } from '../supabaseClient';
import { Patient } from '../types';
import { Search, Plus, User, FileText, Calendar, Trash2, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data } = await api.getPatients();
    // Blindagem
    setPatients((data as Patient[]) || []);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("ATENÇÃO! \n\nIsso excluirá o paciente e TODO o seu histórico (Consultas e Anamneses). \n\nDeseja continuar?")) {
      return;
    }

    setDeletingId(id);
    const original = [...patients];

    // Otimismo: remove da interface
    setPatients(prev => prev.filter(p => p.id !== id));

    try {
      const { error } = await api.deletePatient(id);
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setPatients(original);
      alert(`Erro ao excluir: ${err.message}. \n\nIMPORTANTE: Copie o SQL na tela de Login e rode no Supabase.`);
    } finally {
      setDeletingId(null);
    }
  };

  const safePatients = patients || [];

  const filtered = safePatients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.cpf?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Pacientes</h2>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 outline-none transition-all shadow-sm"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => navigate('/patients/new')}
            className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20 font-medium"
          >
            <Plus size={18} /> <span className="hidden md:inline">Novo Paciente</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(p => (
          <div 
            key={p.id} 
            onClick={() => navigate(`/patients/${p.id}`)}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group hover:border-blue-200 relative"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button 
                onClick={(e) => handleDelete(p.id, e)} 
                disabled={deletingId === p.id}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50" 
                title="Excluir Paciente"
              >
                {deletingId === p.id ? <Loader size={18} className="animate-spin text-red-600"/> : <Trash2 size={18} />}
              </button>
            </div>

            <div className="flex items-start justify-between mb-4">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 group-hover:border-blue-500 transition-colors" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xl group-hover:bg-blue-900 group-hover:text-white transition-colors">
                  {p.name.charAt(0)}
                </div>
              )}
              
              <div className="flex gap-1 pr-8">
                {p.tags?.slice(0, 2).map(tag => (
                   <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded text-[10px] uppercase font-bold tracking-wider">{tag}</span>
                ))}
              </div>
            </div>
            
            <h3 className="font-bold text-slate-800 text-lg mb-1 truncate group-hover:text-blue-900 transition-colors pr-6">{p.name}</h3>
            <p className="text-sm text-slate-500 mb-4 font-mono">{p.cpf || 'CPF não informado'}</p>
            
            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
              <span className="flex items-center gap-1.5"><Calendar size={14}/> {p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() + ' anos' : 'N/A'}</span>
              <span className="flex items-center gap-1.5 text-blue-600 font-medium group-hover:underline">Ver Prontuário <FileText size={14}/></span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <User size={48} className="mx-auto mb-3 opacity-20" />
            <p>Nenhum paciente encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}