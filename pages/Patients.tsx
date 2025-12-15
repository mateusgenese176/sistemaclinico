
import React, { useState, useEffect } from 'react';
import { api } from '../supabaseClient';
import { Patient } from '../types';
import { Search, Plus, User, FileText, Calendar, Trash2, Loader, LayoutGrid, List, ScrollText, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../components/Dialog';

interface PatientMeta {
  hasHistory: boolean;
  hasDocs: boolean;
  hasFutureApt: boolean;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [meta, setMeta] = useState<Record<string, PatientMeta>>({});
  const [loadingData, setLoadingData] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const navigate = useNavigate();
  const dialog = useDialog();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    // Fetch patients
    const { data: patientsData } = await api.getPatients();
    const pList = (patientsData as Patient[]) || [];
    setPatients(pList);

    // Initialize indicators fetch
    await fetchIndicators(pList);
  };
  
  // Need to add supabase to imports
  const fetchIndicators = async (currentPatients: Patient[]) => {
     // Lazy load supabase client to avoid circular dep issues if any, or just import at top.
     const { supabase } = await import('../supabaseClient');

     const metaMap: Record<string, PatientMeta> = {};
     const today = new Date().toISOString().split('T')[0];

     // Bulk fetch using supabase direct query for performance
     const { data: allApts } = await supabase.from('appointments').select('patient_id, date, status');
     const { data: allAna } = await supabase.from('anamneses').select('patient_id');
     const { data: allDocs } = await supabase.from('documents').select('patient_id');

     currentPatients.forEach(p => {
        const pApts = allApts?.filter((x: any) => x.patient_id === p.id) || [];
        const hasHistory = (allAna?.filter((x: any) => x.patient_id === p.id).length || 0) > 0;
        const hasDocs = (allDocs?.filter((x: any) => x.patient_id === p.id).length || 0) > 0;
        
        // Future Apt: scheduled and date >= today
        const hasFuture = pApts.some((a: any) => a.status === 'scheduled' && a.date >= today);

        metaMap[p.id] = {
           hasHistory,
           hasDocs,
           hasFutureApt: hasFuture
        };
     });

     setMeta(metaMap);
     setLoadingData(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm(
      "Excluir Paciente", 
      "ATENÇÃO! Isso excluirá o paciente e TODO o seu histórico (Consultas e Anamneses). Deseja continuar?",
      "danger"
    );

    if (!confirmed) return;

    setDeletingId(id);
    const original = [...patients];
    setPatients(prev => prev.filter(p => p.id !== id));

    try {
      const { error } = await api.deletePatient(id);
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setPatients(original);
      dialog.alert("Erro", `Erro ao excluir: ${err.message}.`);
    } finally {
      setDeletingId(null);
    }
  };

  const renderIndicators = (patientId: string) => {
     const data = meta[patientId];
     if (!data) return null;

     return (
        <div className="flex gap-1.5 mt-2">
           {data.hasFutureApt && (
              <div className="bg-amber-100 text-amber-700 p-1 rounded-md" title="Consulta Agendada">
                 <Clock size={14} />
              </div>
           )}
           {data.hasHistory && (
              <div className="bg-blue-100 text-blue-700 p-1 rounded-md" title="Possui Histórico/Prontuário">
                 <FileText size={14} />
              </div>
           )}
           {data.hasDocs && (
              <div className="bg-emerald-100 text-emerald-700 p-1 rounded-md" title="Possui Documentos (Receitas/Atestados)">
                 <ScrollText size={14} />
              </div>
           )}
        </div>
     );
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
        
        <div className="flex w-full md:w-auto gap-2 items-center">
          <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center mr-2">
             <button 
               onClick={() => setViewMode('grid')}
               className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-50 text-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <LayoutGrid size={18} />
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-50 text-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <List size={18} />
             </button>
          </div>

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
            className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20 font-medium whitespace-nowrap"
          >
            <Plus size={18} /> <span className="hidden md:inline">Novo</span>
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
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

              <div className="flex items-start justify-between mb-2">
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
              <p className="text-sm text-slate-500 font-mono mb-2">{p.cpf || 'CPF não informado'}</p>
              
              {/* Indicators Grid Mode */}
              {renderIndicators(p.id)}

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3 mt-3">
                <span className="flex items-center gap-1.5"><Calendar size={14}/> {p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() + ' anos' : 'N/A'}</span>
                <span className="flex items-center gap-1.5 text-blue-600 font-medium group-hover:underline">Ver Prontuário <FileText size={14}/></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                 <tr>
                    <th className="px-6 py-4">Paciente</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">CPF</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                 {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => navigate(`/patients/${p.id}`)}>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {p.photo_url ? (
                              <img src={p.photo_url} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">{p.name.charAt(0)}</div>
                            )}
                            <div>
                               <span className="font-bold text-slate-800 group-hover:text-blue-900 block">{p.name}</span>
                               <span className="text-xs text-slate-400">{p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() + ' anos' : '-'}</span>
                            </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                           {renderIndicators(p.id)}
                       </td>
                       <td className="px-6 py-4 font-mono text-slate-600">{p.cpf || '-'}</td>
                       <td className="px-6 py-4 text-slate-600">{p.contact || '-'}</td>
                       <td className="px-6 py-4 text-right">
                          <button 
                             onClick={(e) => handleDelete(p.id, e)}
                             disabled={deletingId === p.id}
                             className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"
                          >
                             {deletingId === p.id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <User size={48} className="mx-auto mb-3 opacity-20" />
          <p>Nenhum paciente encontrado.</p>
        </div>
      )}
    </div>
  );
}
