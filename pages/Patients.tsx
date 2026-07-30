import React, { useState, useEffect } from 'react';
import { api } from '../supabaseClient';
import { Patient } from '../types';
import { Search, Plus, User, FileText, Calendar, Trash2, Loader, LayoutGrid, List, ScrollText, Clock, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../components/Dialog';
import PatientEditModal from '../components/PatientEditModal';

interface PatientMeta {
  hasHistory: boolean;
  hasDocs: boolean;
  hasFutureApt: boolean;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [meta, setMeta] = useState<Record<string, PatientMeta>>({});
  const [loadingData, setLoadingData] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const navigate = useNavigate();
  const dialog = useDialog();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const { data: patientsData } = await api.getPatients();
      const pList = (patientsData as Patient[]) || [];
      setPatients(pList);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Reset page to 1 when user searches
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const safePatients = patients || [];

  const filtered = safePatients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.cpf && p.cpf.includes(searchTerm))
  );

  const totalPatients = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalPatients / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalPatients);
  const paginatedPatients = filtered.slice(startIndex, endIndex);

  // Fetch indicators specifically for the patients on current page
  useEffect(() => {
    if (paginatedPatients.length > 0) {
      fetchIndicatorsForPatients(paginatedPatients);
    }
  }, [paginatedPatients.map(p => p.id).join(',')]);

  const fetchIndicatorsForPatients = async (currentPatients: Patient[]) => {
    const patientIds = currentPatients.map(p => p.id);
    if (patientIds.length === 0) return;

    try {
      const { supabase } = await import('../supabaseClient');
      const today = new Date().toISOString().split('T')[0];

      const [aptsRes, anaRes, docsRes] = await Promise.all([
        supabase.from('appointments').select('patient_id, date, status').in('patient_id', patientIds),
        supabase.from('anamneses').select('patient_id').in('patient_id', patientIds),
        supabase.from('documents').select('patient_id').in('patient_id', patientIds)
      ]);

      const allApts = aptsRes.data || [];
      const allAna = anaRes.data || [];
      const allDocs = docsRes.data || [];

      setMeta(prev => {
        const newMeta = { ...prev };
        currentPatients.forEach(p => {
          const pApts = allApts.filter((x: any) => x.patient_id === p.id);
          const hasHistory = allAna.some((x: any) => x.patient_id === p.id);
          const hasDocs = allDocs.some((x: any) => x.patient_id === p.id);
          const hasFuture = pApts.some((a: any) => a.status === 'scheduled' && a.date >= today);

          newMeta[p.id] = {
            hasHistory,
            hasDocs,
            hasFutureApt: hasFuture
          };
        });
        return newMeta;
      });
    } catch (e) {
      console.error('Erro ao carregar indicadores de pacientes:', e);
    }
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

  const handleSaveEditedPatient = (updated: Patient) => {
    setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const renderIndicators = (patientId: string) => {
    const data = meta[patientId];
    if (!data) return <div className="h-5" />;

    return (
      <div className="flex gap-1.5 mt-1">
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

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pacientes</h2>
          {!loadingData && (
            <p className="text-xs text-slate-500 mt-0.5">
              Total de <span className="font-semibold text-slate-700">{totalPatients}</span> pacientes cadastrados
            </p>
          )}
        </div>
        
        <div className="flex w-full md:w-auto gap-2 items-center">
          <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center mr-2 shadow-xs">
             <button 
               onClick={() => setViewMode('grid')}
               className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
               title="Visualização em Grade"
             >
               <LayoutGrid size={18} />
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
               title="Visualização em Lista"
             >
               <List size={18} />
             </button>
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 outline-none transition-all shadow-xs text-sm"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          <button 
            onClick={() => navigate('/patients/new')}
            className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20 font-medium whitespace-nowrap text-sm"
          >
            <Plus size={18} /> <span className="hidden md:inline">Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loadingData ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-center gap-3 text-blue-900 font-medium text-sm">
            <Loader size={20} className="animate-spin text-blue-800" />
            Carregando lista de pacientes...
          </div>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="bg-white p-5 rounded-xl border border-slate-200 animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-6 space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="h-10 bg-slate-100 rounded w-full" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Main Grid or List View */}
          {paginatedPatients.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedPatients.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 hover:shadow-md transition-all cursor-pointer group hover:border-blue-200 relative"
                >
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPatient(p);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-colors"
                      title="Editar Paciente"
                    >
                      <Pencil size={18} />
                    </button>
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
                  
                  {renderIndicators(p.id)}

                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3 mt-3">
                    <span className="flex items-center gap-1.5"><Calendar size={14}/> {p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() + ' anos' : 'N/A'}</span>
                    <span className="flex items-center gap-1.5 text-blue-600 font-medium group-hover:underline">Ver Prontuário <FileText size={14}/></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {paginatedPatients.length > 0 && viewMode === 'list' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                     <tr>
                        <th className="px-6 py-4">Paciente</th>
                        <th className="px-6 py-4">Status / Registros</th>
                        <th className="px-6 py-4">CPF</th>
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                     {paginatedPatients.map(p => (
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
                           <td className="px-6 py-4 text-right flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                               <button 
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     setEditingPatient(p);
                                  }}
                                  className="text-slate-400 hover:text-blue-900 p-2 hover:bg-blue-50 rounded transition-colors mr-1.5"
                                  title="Editar Paciente"
                               >
                                  <Pencil size={16} />
                               </button>
                              <button 
                                 onClick={(e) => handleDelete(p.id, e)}
                                 disabled={deletingId === p.id}
                                 className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"
                                 title="Excluir Paciente"
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

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <User size={48} className="mx-auto opacity-20" />
              <p className="font-medium text-slate-600">Nenhum paciente encontrado.</p>
              {searchTerm && (
                <button 
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="text-xs text-blue-900 underline font-semibold hover:text-blue-800"
                >
                  Limpar busca
                </button>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPatients > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <span>
                  Exibindo <strong>{totalPatients === 0 ? 0 : startIndex + 1}</strong> a <strong>{endIndex}</strong> de <strong>{totalPatients}</strong> paciente(s)
                </span>
                
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-slate-500">Exibir:</span>
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-300 rounded px-2 py-1 bg-white font-medium outline-none focus:border-blue-900"
                  >
                    <option value={10}>10 por pág.</option>
                    <option value={20}>20 por pág.</option>
                    <option value={50}>50 por pág.</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="mr-2 font-medium">
                  Página <strong>{validCurrentPage}</strong> de <strong>{totalPages}</strong>
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={validCurrentPage === 1}
                  className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Página Anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page Number Buttons */}
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - validCurrentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="px-1 text-slate-400 self-center">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-2.5 py-1 rounded font-bold transition-all ${
                              validCurrentPage === page
                                ? 'bg-blue-900 text-white shadow-xs'
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={validCurrentPage === totalPages}
                  className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Próxima Página"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {editingPatient && (
        <PatientEditModal 
          patient={editingPatient} 
          isOpen={!!editingPatient} 
          onClose={() => setEditingPatient(null)} 
          onSave={handleSaveEditedPatient} 
        />
      )}
    </div>
  );
}
