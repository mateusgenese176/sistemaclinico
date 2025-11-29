import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../supabaseClient';
import { Patient, Anamnesis, UserRole } from '../types';
import { useAuth } from '../App';
import { Printer, Activity, Tag, Camera, ArrowLeft, FileText, PlusCircle, Pencil, Trash2, Loader, Eye, X } from 'lucide-react';
import { useDialog } from '../components/Dialog';

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const dialog = useDialog();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Anamnesis[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'anamnesis'>('details');
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  
  // States for viewing and printing
  const [viewAnamnesis, setViewAnamnesis] = useState<Anamnesis | null>(null);
  const [printAnamnesisData, setPrintAnamnesisData] = useState<Anamnesis | null>(null);

  const [newTags, setNewTags] = useState('');
  const [anthropo, setAnthropo] = useState({ weight: '', height: '', bp_s: '', bp_d: '' });

  const fetchHistory = async () => {
    if (id && user?.role === UserRole.DOCTOR) {
      const { data } = await api.getAnamneses(id);
      // Blindagem: Se data for null, usa array vazio []
      setHistory((data as any) || []);
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
    await dialog.alert("Sucesso", "Os dados antropométricos e tags foram atualizados com sucesso!");
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
    const confirmed = await dialog.confirm("Excluir Rascunho", "Deseja excluir este rascunho permanentemente?", "danger");
    if (!confirmed) return;
    
    setLoadingDelete(anamnesisId);
    try {
      await api.deleteAnamnesis(anamnesisId);
      setHistory(prev => prev.filter(h => h.id !== anamnesisId));
    } catch (e) {
      dialog.alert("Erro", "Não foi possível excluir o rascunho.");
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
    }, 300);
  };

  if (!patient) return <div>Carregando...</div>;

  const historyList = history || [];

  return (
    <>
      {/* --- PRINT LAYOUT (Using ID for Global CSS targeting) --- */}
      {printAnamnesisData && (
        <div id="print-area" className="hidden">
           <div className="font-sans text-slate-900 max-w-4xl mx-auto">
             {/* Header */}
             <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
                <div>
                   <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">GENESIS MEDICAL</h1>
                   <p className="text-sm text-slate-500 uppercase tracking-widest">Relatório de Atendimento</p>
                </div>
                <div className="text-right">
                   <p className="text-sm font-medium">Data: {new Date(printAnamnesisData.created_at).toLocaleDateString()}</p>
                   <p className="text-sm font-medium">Hora: {new Date(printAnamnesisData.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
             </div>

             {/* Patient & Doctor Info */}
             <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8 grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Paciente</span>
                  <span className="text-lg font-bold text-slate-900">{patient.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</span>
                  <span className="text-base text-slate-900">{patient.cpf || 'Não informado'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Nascimento</span>
                  <span className="text-base text-slate-900">{patient.dob ? new Date(patient.dob).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Médico Responsável</span>
                  <span className="text-base text-slate-900 font-medium">Dr. {printAnamnesisData.doctor?.name}</span>
                </div>
             </div>

             {/* SOAP Content */}
             <div className="space-y-8">
                <div className="relative">
                   <h3 className="text-base font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                     <span className="bg-slate-900 text-white w-6 h-6 flex items-center justify-center rounded text-xs">S</span> Subjetivo
                   </h3>
                   <div className="text-sm leading-relaxed text-justify prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: printAnamnesisData.soap.s }}></div>
                </div>

                <div className="relative">
                   <h3 className="text-base font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                     <span className="bg-slate-900 text-white w-6 h-6 flex items-center justify-center rounded text-xs">O</span> Objetivo
                   </h3>
                   <div className="text-sm leading-relaxed text-justify prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: printAnamnesisData.soap.o }}></div>
                </div>

                <div className="relative">
                   <h3 className="text-base font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                     <span className="bg-slate-900 text-white w-6 h-6 flex items-center justify-center rounded text-xs">A</span> Avaliação
                   </h3>
                   <div className="text-sm leading-relaxed text-justify prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: printAnamnesisData.soap.a }}></div>
                </div>

                <div className="relative">
                   <h3 className="text-base font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                     <span className="bg-slate-900 text-white w-6 h-6 flex items-center justify-center rounded text-xs">P</span> Plano
                   </h3>
                   <div className="text-sm leading-relaxed text-justify prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: printAnamnesisData.soap.p }}></div>
                </div>
             </div>

             {/* Footer / Signature */}
             <div className="mt-24 pt-8 text-center break-inside-avoid">
                 <div className="inline-block px-12 border-t border-slate-800">
                    <p className="font-bold text-slate-900 mt-2">Dr. {printAnamnesisData.doctor?.name}</p>
                    <p className="text-xs text-slate-500">CRM: {printAnamnesisData.doctor?.crm || '___________'}</p>
                 </div>
                 <p className="text-[10px] text-slate-400 mt-8">Documento gerado eletronicamente pelo sistema Genesis Medical em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}.</p>
             </div>
           </div>
        </div>
      )}

      {/* --- VIEW MODAL (Eye Icon) --- */}
      {viewAnamnesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col animate-fade-in-up">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                 <div>
                    <h3 className="font-bold text-slate-800">Visualizar Anamnese</h3>
                    <p className="text-xs text-slate-500">{new Date(viewAnamnesis.created_at).toLocaleDateString()} - Dr. {viewAnamnesis.doctor?.name}</p>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => handlePrint(viewAnamnesis)} className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-blue-900 transition-colors" title="Imprimir">
                       <Printer size={20} />
                    </button>
                    <button onClick={() => setViewAnamnesis(null)} className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-red-600 transition-colors">
                       <X size={20} />
                    </button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                 {/* SOAP Content View */}
                 <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm uppercase"><span className="bg-blue-100 p-1 rounded">S</span> Subjetivo</h4>
                       <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: viewAnamnesis.soap.s }}></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2 text-sm uppercase"><span className="bg-emerald-100 p-1 rounded">O</span> Objetivo</h4>
                       <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: viewAnamnesis.soap.o }}></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2 text-sm uppercase"><span className="bg-amber-100 p-1 rounded">A</span> Avaliação</h4>
                       <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: viewAnamnesis.soap.a }}></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2 text-sm uppercase"><span className="bg-purple-100 p-1 rounded">P</span> Plano</h4>
                       <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: viewAnamnesis.soap.p }}></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- SCREEN LAYOUT --- */}
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
                      Histórico ({historyList.length})
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
                        {historyList.map(item => (
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
                                {/* Always Show View Button */}
                                <button 
                                    onClick={() => setViewAnamnesis(item)}
                                    className="text-slate-500 hover:text-blue-600 p-1 hover:bg-blue-50 rounded"
                                    title="Visualizar Completa"
                                >
                                    <Eye size={18} />
                                </button>

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

                            {/* Content Preview (HTML SAFE) */}
                            <div className="grid grid-cols-2 gap-6 text-sm opacity-60">
                              <div><strong className="text-blue-700 block text-xs uppercase mb-1">Subjetivo</strong> <div className="text-slate-600 line-clamp-3 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.soap.s }}></div></div>
                              <div><strong className="text-blue-700 block text-xs uppercase mb-1">Objetivo</strong> <div className="text-slate-600 line-clamp-3 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.soap.o }}></div></div>
                            </div>
                          </div>
                        ))}
                        {historyList.length === 0 && <p className="text-center text-slate-400 py-10">Nenhum histórico encontrado.</p>}
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