import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../supabaseClient';
import { Patient, Anamnesis, UserRole } from '../types';
import { useAuth } from '../App';
import { Printer, Activity, Tag, Camera, ArrowLeft, FileText, PlusCircle, Pencil, Trash2, Loader } from 'lucide-react';

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Anamnesis[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'anamnesis'>('details');
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  
  // Print State
  const [printAnamnesisData, setPrintAnamnesisData] = useState<Anamnesis | null>(null);

  const [newTags, setNewTags] = useState('');
  const [anthropo, setAnthropo] = useState({ weight: '', height: '', bp_s: '', bp_d: '' });

  const fetchHistory = async () => {
    if (id && user?.role === UserRole.DOCTOR) {
      const { data } = await api.getAnamneses(id);
      setHistory(data as any);
    }
  };

  useEffect(() => {
    if (id) {
      api.getPatient(id).then(({ data }) => setPatient(data as any));
      fetchHistory();
    }
  }, [id, user]);

  const handleUpdateBio = async () => {
    if (!id || !patient) return;
    
    const currentTags = patient.tags || [];
    const addedTags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    const updatedTags = [...new Set([...currentTags, ...addedTags])];

    const updatedAnthropo = {
      ...patient.anthropometrics,
      weight: Number(anthropo.weight) || patient.anthropometrics?.weight,
      height: Number(anthropo.height) || patient.anthropometrics?.height,
      bp_systolic: Number(anthropo.bp_s) || patient.anthropometrics?.bp_systolic,
      bp_diastolic: Number(anthropo.bp_d) || patient.anthropometrics?.bp_diastolic,
      bmi: (Number(anthropo.weight) && Number(anthropo.height)) 
        ? Number((Number(anthropo.weight) / ((Number(anthropo.height)/100) ** 2)).toFixed(2))
        : patient.anthropometrics?.bmi
    };

    await api.updatePatient(id, {
      tags: updatedTags,
      anthropometrics: updatedAnthropo
    });
    
    // Refresh
    const { data } = await api.getPatient(id);
    if(data) setPatient(data as any);
    setNewTags('');
    setAnthropo({ weight: '', height: '', bp_s: '', bp_d: '' });
    alert("Dados atualizados!");
  };

  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && id) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await api.updatePatient(id, { photo_url: base64 });
        setPatient(prev => prev ? ({ ...prev, photo_url: base64 }) : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAnamnesis = async (anamnesisId: string) => {
    if (!window.confirm("Excluir este rascunho permanentemente?")) return;
    setLoadingDelete(anamnesisId);
    try {
      await api.deleteAnamnesis(anamnesisId);
      setHistory(prev => prev.filter(h => h.id !== anamnesisId));
    } catch (e) {
      alert("Erro ao excluir.");
    } finally {
      setLoadingDelete(null);
    }
  };

  const handleEditAnamnesis = (anamnesisId: string) => {
    navigate(`/anamnesis/session/${id}?editId=${anamnesisId}`);
  };

  const handlePrint = (anamnesis: Anamnesis) => {
    setPrintAnamnesisData(anamnesis);
    // Allow state to update and render the print view before triggering print
    setTimeout(() => {
      window.print();
      // Optional: Clear print data after printing if you want to return to normal state immediately, 
      // but keeping it allows re-printing without re-selecting.
    }, 100);
  };

  if (!patient) return <div>Carregando...</div>;

  return (
    <>
      {/* --- PRINT LAYOUT (Hidden on screen, Visible on Print) --- */}
      {printAnamnesisData && (
        <div className="hidden print:block font-serif text-black bg-white p-8">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
             <h1 className="text-2xl font-bold uppercase tracking-widest">Genesis Medical</h1>
             <p className="text-sm">Relatório de Atendimento Médico</p>
          </div>

          {/* Patient Info Bar */}
          <div className="border border-black p-3 mb-6 flex justify-between items-center text-sm">
             <div>
               <span className="font-bold uppercase mr-2">Paciente:</span> {patient.name}
             </div>
             <div>
               <span className="font-bold uppercase mr-2">CPF:</span> {patient.cpf || 'N/A'}
             </div>
             <div>
               <span className="font-bold uppercase mr-2">DN:</span> {patient.dob ? new Date(patient.dob).toLocaleDateString() : 'N/A'}
             </div>
          </div>

          {/* Consultation Metadata */}
          <div className="mb-6 text-sm">
            <p><span className="font-bold">Data do Atendimento:</span> {new Date(printAnamnesisData.created_at).toLocaleDateString()} às {new Date(printAnamnesisData.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          </div>

          {/* SOAP Grid */}
          <div className="space-y-6 mb-12">
             <div className="border-l-4 border-black pl-4">
               <h3 className="font-bold uppercase text-sm mb-1">Subjetivo</h3>
               <p className="text-justify whitespace-pre-wrap text-sm leading-relaxed">{printAnamnesisData.soap.s}</p>
             </div>
             <div className="border-l-4 border-black pl-4">
               <h3 className="font-bold uppercase text-sm mb-1">Objetivo</h3>
               <p className="text-justify whitespace-pre-wrap text-sm leading-relaxed">{printAnamnesisData.soap.o}</p>
             </div>
             <div className="border-l-4 border-black pl-4">
               <h3 className="font-bold uppercase text-sm mb-1">Avaliação</h3>
               <p className="text-justify whitespace-pre-wrap text-sm leading-relaxed">{printAnamnesisData.soap.a}</p>
             </div>
             <div className="border-l-4 border-black pl-4">
               <h3 className="font-bold uppercase text-sm mb-1">Plano</h3>
               <p className="text-justify whitespace-pre-wrap text-sm leading-relaxed">{printAnamnesisData.soap.p}</p>
             </div>
          </div>

          {/* Footer / Signature */}
          <div className="mt-20 flex flex-col items-center justify-center page-break-inside-avoid">
             <div className="w-64 border-t border-black mb-2"></div>
             <p className="font-bold text-sm uppercase">Dr. {printAnamnesisData.doctor?.name}</p>
             <p className="text-xs">CRM: {printAnamnesisData.doctor?.crm || '___________'}</p>
          </div>
        </div>
      )}

      {/* --- SCREEN LAYOUT (Visible on Screen, Hidden on Print) --- */}
      <div className="space-y-6 animate-fade-in-up print:hidden">
        <div className="flex justify-between items-center no-print">
          <button onClick={() => navigate('/patients')} className="text-slate-500 hover:text-blue-900 flex items-center gap-2 transition-colors">
              <ArrowLeft size={20} /> Voltar
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Profile Card */}
          <div className="w-full md:w-1/3 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center relative group">
                  <div className="w-32 h-32 mx-auto rounded-full bg-slate-100 border-4 border-slate-50 shadow-md overflow-hidden mb-4 relative">
                    {patient.photo_url ? (
                      <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-slate-300 text-4xl font-bold">{patient.name.charAt(0)}</div>
                    )}
                    
                    {/* Hover Upload */}
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium flex-col">
                      <Camera size={24} className="mb-1" />
                      Alterar Foto
                      <input type="file" accept="image/*" onChange={handlePhotoUpdate} className="hidden" />
                    </label>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-slate-900">{patient.name}</h2>
                  <p className="text-slate-500 text-sm">ID: {patient.id.slice(0, 8)}</p>
                  <p className="text-slate-500 text-sm mb-4">CPF: {patient.cpf || 'N/A'}</p>
                  
                  <div className="flex justify-center flex-wrap gap-2">
                    {patient.tags?.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-medium uppercase tracking-wider">{tag}</span>
                    ))}
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Activity size={18} className="text-blue-900"/> Dados Clínicos
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">IMC</span>
                      <span className="text-xl font-bold text-slate-800">{patient.anthropometrics?.bmi || '--'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Peso</span>
                      <span className="text-lg font-semibold text-slate-700">{patient.anthropometrics?.weight || '--'} kg</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Altura</span>
                      <span className="text-lg font-semibold text-slate-700">{patient.anthropometrics?.height || '--'} cm</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">PA</span>
                      <span className="text-lg font-semibold text-slate-700">
                        {patient.anthropometrics?.bp_systolic}/{patient.anthropometrics?.bp_diastolic}
                      </span>
                    </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-2">Informações Sociais</h3>
                <p className="text-sm text-slate-600 leading-relaxed italic">{patient.social_info || 'Não informado.'}</p>
              </div>
          </div>

          {/* Right Column */}
          <div className="w-full md:w-2/3">
              {user?.role === UserRole.DOCTOR ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
                  <div className="flex border-b border-slate-200 no-print bg-slate-50">
                    <button 
                      onClick={() => setActiveTab('details')}
                      className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'details' ? 'bg-white text-blue-900 border-t-2 border-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Gerenciar
                    </button>
                    <button 
                      onClick={() => setActiveTab('anamnesis')}
                      className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'anamnesis' ? 'bg-white text-blue-900 border-t-2 border-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Histórico ({history.length})
                    </button>
                  </div>
    
                  <div className="p-6 flex-1">
                    {activeTab === 'details' && (
                      <div className="space-y-6">
                        {/* Start Session Button */}
                        <div className="bg-blue-900 rounded-xl p-6 text-white text-center shadow-lg shadow-blue-900/30">
                            <h3 className="text-xl font-bold mb-2">Iniciar Atendimento</h3>
                            <p className="text-blue-200 mb-6 text-sm">Abra uma nova sessão de anamnese para registrar a evolução do paciente.</p>
                            <button 
                              onClick={() => navigate(`/anamnesis/session/${patient.id}`)}
                              className="bg-white text-blue-900 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                              <PlusCircle size={20} /> Nova Anamnese SOAP
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                          <h4 className="md:col-span-2 text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Activity size={12}/> Atualizar Biometria e Tags</h4>
                          <input 
                            placeholder="Peso (kg)" className="bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={anthropo.weight} onChange={e => setAnthropo({...anthropo, weight: e.target.value})}
                          />
                          <input 
                            placeholder="Altura (cm)" className="bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={anthropo.height} onChange={e => setAnthropo({...anthropo, height: e.target.value})}
                          />
                          <input 
                            placeholder="PA Sistólica" className="bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={anthropo.bp_s} onChange={e => setAnthropo({...anthropo, bp_s: e.target.value})}
                          />
                          <input 
                            placeholder="PA Diastólica" className="bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={anthropo.bp_d} onChange={e => setAnthropo({...anthropo, bp_d: e.target.value})}
                          />
                          <input 
                            placeholder="Adicionar tags (separadas por vírgula)" className="md:col-span-2 bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={newTags} onChange={e => setNewTags(e.target.value)}
                          />
                          <button onClick={handleUpdateBio} className="md:col-span-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded transition-colors text-sm">
                              Atualizar Dados
                          </button>
                        </div>
                      </div>
                    )}
    
                    {activeTab === 'anamnesis' && (
                      <div className="space-y-6">
                        {history.map(item => (
                          <div key={item.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all bg-white group relative">
                            {/* Status Badge */}
                            {item.status === 'draft' ? (
                                <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wide">Rascunho</div>
                            ) : (
                                <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wide">Finalizado</div>
                            )}

                            {/* Header */}
                            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                              <div>
                                <p className="font-bold text-blue-900 text-lg">{new Date(item.created_at).toLocaleDateString()}</p>
                                <p className="text-xs text-slate-400 font-medium">Médico Responsável: Dr. {item.doctor?.name}</p>
                              </div>
                              
                              <div className="flex gap-2 no-print">
                                {item.status === 'draft' && (
                                  <>
                                    <button 
                                        onClick={() => handleEditAnamnesis(item.id)}
                                        className="text-blue-500 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                                        title="Editar Rascunho"
                                      >
                                        <Pencil size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteAnamnesis(item.id)}
                                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                        title="Excluir"
                                    >
                                        {loadingDelete === item.id ? <Loader size={18} className="animate-spin"/> : <Trash2 size={18} />}
                                    </button>
                                  </>
                                )}
                                {item.status === 'final' && (
                                  <button onClick={() => handlePrint(item)} className="text-slate-300 hover:text-blue-900 transition-colors" title="Imprimir Relatório">
                                    <Printer size={20} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Content Preview */}
                            <div className="grid grid-cols-2 gap-6 text-sm">
                              <div><strong className="text-blue-700 block text-xs uppercase mb-1">Subjetivo</strong> <span className="text-slate-600 line-clamp-3">{item.soap.s}</span></div>
                              <div><strong className="text-blue-700 block text-xs uppercase mb-1">Objetivo</strong> <span className="text-slate-600 line-clamp-3">{item.soap.o}</span></div>
                              <div><strong className="text-blue-700 block text-xs uppercase mb-1">Avaliação</strong> <span className="text-slate-600 line-clamp-3">{item.soap.a}</span></div>
                              <div><strong className="text-blue-700 block text-xs uppercase mb-1">Plano</strong> <span className="text-slate-600 line-clamp-3">{item.soap.p}</span></div>
                            </div>
                          </div>
                        ))}
                        {history.length === 0 && <p className="text-center text-slate-400 py-10">Nenhum histórico encontrado.</p>}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center text-slate-400">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText size={32} className="text-slate-300"/>
                  </div>
                  <h3 className="text-lg font-medium text-slate-600">Acesso Restrito</h3>
                  <p>Apenas médicos podem visualizar e criar anamneses.</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
}