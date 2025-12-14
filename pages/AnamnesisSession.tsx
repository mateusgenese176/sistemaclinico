import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../supabaseClient';
import { Patient, UserRole, MedicalDocument, PrescriptionItem } from '../types';
import { useAuth } from '../App';
import { Save, CheckCircle, ArrowLeft, Clock, AlertTriangle, FileText, Activity, ClipboardList, Stethoscope, ScrollText, PlusCircle, Printer, Trash2, X, ChevronDown } from 'lucide-react';
import { useDialog } from '../components/Dialog';
import RichTextEditor from '../components/RichTextEditor';

export default function AnamnesisSession() {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  const navigate = useNavigate();
  const { user } = useAuth();
  const dialog = useDialog();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' });
  const [status, setStatus] = useState<'draft' | 'saving' | 'saved' | 'error'>('saved');
  const [anamnesisId, setAnamnesisId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // --- DOCUMENTOS RÁPIDOS STATE ---
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docType, setDocType] = useState<'prescription' | 'referral'>('prescription');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([{ medication: '', quantity: '', dosage: '', usageMode: 'Uso Oral' }]);
  const [referralText, setReferralText] = useState('');
  const [loadingDeleteDoc, setLoadingDeleteDoc] = useState<string | null>(null);

  const LOGO_URL = "https://i.ibb.co/n8rLsXSJ/upscalemedia-transformed-1.png";
  const HEADER_LOGO_URL = "https://i.ibb.co/sJR9zQKt/upscalemedia-transformed-1.png";

  const USAGE_MODES = [
    'Uso Oral', 'Uso Tópico', 'Uso Endovenoso', 'Uso Intramuscular', 'Uso Subcutâneo',
    'Uso Intranasal', 'Uso Oftálmico', 'Uso Otológico', 'Uso Retal', 'Uso Vaginal',
    'Uso Inalatório', 'Uso Contínuo', 'Outro'
  ];

  // --- MODELOS (TEMPLATES) ---
  const subjectiveTemplates = [
    {
      label: "Modelo Padrão",
      content: `
        <div><b>ID:</b> </div><br>
        <div><b>QP:</b> </div><br>
        <div><b>HDA:</b> </div><br>
        <div><b>HI:</b> </div><br>
        <div><b>HF:</b> </div><br>
        <div><b>HEV:</b> </div><br>
      `
    }
  ];

  const objectiveTemplates = [
    {
      label: "Ex. Físico Masculino",
      content: `BEG, LOTE, EUPNEICO, NORMOCORADO, ACIANÓTICO, AFEBRIL, ANICTÉRICO, HIDRATADO, FÂNEROS HIDRATADOS ECG: 15<br>
AR: MV+ EM AHT, S/RA<br>
ACV: RCR EM 2T, BNF, S/SA<br>
ABD: RHA+ EM 9QD, S/ VMG OU CTZ, DEPRESSÍVEL, INDOLOR, BLUMBERG NEGATIVO, ROVSING NEGATIVO, MURPHY NEGATIVO.<br>
EXT: SEM EDEMAS, SEM SINAIS DE TVP, TEC < 3S`
    },
    {
      label: "Ex. Físico Feminino",
      content: `BEG, LOTE, EUPNEICA, NORMOCORADA, ACIANÓTICA, AFEBRIL, ANICTÉRICA, HIDRATADA, FÂNEROS HIDRATADOS ECG: 15<br>
AR: MV+ EM AHT, S/RA<br>
ACV: RCR EM 2T, BNF, S/SA<br>
ABD: RHA+ EM 9QD, S/ VMG OU CTZ, DEPRESSÍVEL, INDOLOR, BLUMBERG NEGATIVO, ROVSING NEGATIVO, MURPHY NEGATIVO.<br>
EXT: SEM EDEMAS, SEM SINAIS DE TVP, TEC < 3S`
    }
  ];

  // Load Patient and existing Anamnesis if editing
  useEffect(() => {
    const init = async () => {
      if (patientId) {
        const { data } = await api.getPatient(patientId);
        setPatient(data as any);
        fetchDocuments();
      }
      
      if (editId) {
        setAnamnesisId(editId);
        const { data } = await api.getAnamnesis(editId);
        if (data) {
          setSoap(data.soap);
          setStatus('saved');
          setLastSaved(new Date(data.created_at));
        }
      } else {
        // Start fresh
        setStatus('draft');
      }
      setLoading(false);
    };
    init();
  }, [patientId, editId]);

  const fetchDocuments = async () => {
    if (patientId) {
      const { data } = await api.getDocuments(patientId);
      // Filter primarily for today or recent to be relevant to the session
      setDocuments((data as any) || []);
    }
  };

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === 'draft') {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => saveDraft(), 45000); 
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [soap, status]);

  const handleChange = (field: string, value: string) => {
    setSoap(prev => ({ ...prev, [field]: value }));
    setStatus('draft');
  };

  // Modified to return the ID so handleFinalize can use it immediately
  const saveDraft = async (): Promise<string | null> => {
    if (!patientId || !user) return null;
    setStatus('saving');

    try {
      const payload = {
        patient_id: patientId,
        doctor_id: user.id,
        soap: soap,
        status: 'draft'
      };

      let currentId = anamnesisId;

      if (currentId) {
        // Update existing
        await api.updateAnamnesis(currentId, payload);
      } else {
        // Create new
        const { data, error } = await api.createAnamnesis(payload);
        if (error) throw error;
        
        // Critically: grab the ID from the response immediately
        if (data && data.length > 0) {
          currentId = data[0].id;
          setAnamnesisId(currentId);
        }
      }
      
      setLastSaved(new Date());
      setStatus('saved');
      return currentId;
    } catch (e) {
      console.error(e);
      setStatus('error');
      return null;
    }
  };

  const handleFinalize = async () => {
    const confirmed = await dialog.confirm("Finalizar Anamnese", "Ao finalizar, você não poderá mais editar esta anamnese. Deseja continuar?");
    if (!confirmed) return;
    
    // Wait for save and get the DEFINITE ID
    const savedId = await saveDraft(); 
    
    if (savedId) {
      try {
        await api.updateAnamnesis(savedId, { status: 'final' });
        navigate(`/patients/${patientId}`);
      } catch (e) {
        dialog.alert("Erro", "Erro ao finalizar. Tente novamente.");
      }
    } else {
      dialog.alert("Erro", "Erro ao salvar o rascunho antes de finalizar.");
    }
  };

  // --- DOCUMENT FUNCTIONS ---
  const handleSaveDocument = async () => {
    if (!patientId || !user) return;
    
    try {
      const payload = {
         patient_id: patientId,
         doctor_id: user.id,
         type: docType,
         content: docType === 'prescription' ? { items: prescriptionItems } : { text: referralText }
      };
      
      const { data, error } = await api.createDocument(payload);
      if (error) throw error;
      
      await dialog.alert("Sucesso", "Documento salvo com sucesso.");
      setShowDocModal(false);
      fetchDocuments();
    } catch (e) {
      dialog.alert("Erro", "Falha ao salvar documento.");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const confirmed = await dialog.confirm("Excluir", "Deseja excluir este documento?", "danger");
    if (!confirmed) return;
    
    setLoadingDeleteDoc(docId);
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      dialog.alert("Erro", "Não foi possível excluir.");
    } finally {
      setLoadingDeleteDoc(null);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' anos';
  };

  const handlePrintDocument = (doc: MedicalDocument) => {
    if (!patient || !user) return;
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const docDate = new Date(doc.created_at).toLocaleDateString();
    
    // Construct Prescription HTML
    let contentHtml = '';
    
    if (doc.type === 'prescription' && doc.content.items) {
      const groupedItems: Record<string, PrescriptionItem[]> = {};
      doc.content.items.forEach(item => {
        const mode = item.usageMode || 'Uso Geral';
        if (!groupedItems[mode]) groupedItems[mode] = [];
        groupedItems[mode].push(item);
      });

      contentHtml = Object.entries(groupedItems).map(([mode, items]) => `
        <div style="margin-bottom: 25px; page-break-inside: avoid;">
          <div style="text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; font-size: 14px; text-decoration: underline; color: #1e3a8a;">
             ${mode}
          </div>
          <div class="space-y-4">
             ${items.map(item => `
                <div class="mb-6">
                   <div class="flex items-end text-lg font-bold uppercase text-slate-900">
                      <span style="flex-shrink: 0; padding-right: 5px;">${item.medication}</span>
                      <span style="flex-grow: 1; border-bottom: 2px dotted #94a3b8; margin: 0 5px; position: relative; top: -5px;"></span>
                      <span style="flex-shrink: 0; padding-left: 5px;">${item.quantity}</span>
                   </div>
                   <div class="text-sm pl-0 mt-2 text-slate-700 font-medium" style="line-height: 1.4;">${item.dosage}</div>
                </div>
             `).join('')}
          </div>
        </div>
      `).join('');

    } else if (doc.type === 'referral') {
       contentHtml = `<div class="prose max-w-none text-justify leading-relaxed whitespace-pre-wrap text-base font-medium text-slate-800">${doc.content.text}</div>`;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${doc.type === 'prescription' ? 'Receituário' : 'Encaminhamento'} - ${patient.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
           @page { size: A4; margin: 0; }
           body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; background: white; }
           .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60%; opacity: 0.10; z-index: 0; pointer-events: none; }
           .header-fixed { position: fixed; top: 0; left: 0; right: 0; height: 3.5cm; background: white; z-index: 10; padding: 1cm 2cm 0 2cm; display: flex; align-items: center; gap: 1.5rem; }
           .footer-fixed { position: fixed; bottom: 0; left: 0; right: 0; height: 2.5cm; background: white; z-index: 10; text-align: center; font-size: 10px; color: #1e3a8a; font-weight: bold; padding: 0.5cm 2cm 1cm 2cm; display: flex; flex-direction: column; justify-content: flex-end; }
           .content-wrap { padding-top: 4cm; padding-bottom: 3cm; padding-left: 2cm; padding-right: 2cm; position: relative; z-index: 5; display: flex; flex-direction: column; min-height: 25cm; }
           .signature-box { margin-top: auto; padding-top: 2cm; display: flex; justify-content: center; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <img src="${HEADER_LOGO_URL}" class="watermark" />
        <div class="header-fixed">
           <img src="${HEADER_LOGO_URL}" class="h-20 w-auto object-contain" />
           <div>
              <h1 class="text-2xl font-bold text-slate-900 uppercase tracking-widest">${doc.type === 'prescription' ? 'Receituário' : 'Encaminhamento'}</h1>
              <p class="text-sm text-slate-600">Paciente: <b class="text-slate-900 uppercase">${patient.name}</b></p>
              <p class="text-sm text-slate-600">Idade: ${calculateAge(patient.dob)} • Data: ${docDate}</p>
           </div>
        </div>
        <div class="footer-fixed">
           <p>Av. José Veríssimo, 752 - Maurício de Nassau</p>
           <p>Fones: (81) 3727-7250 | 9 9642-0590 (Recepção) | 9 9102-5771 (Autorização) | 9 7328-0845 (Financeiro)</p>
           <p>CEP 55.014-250 - Caruaru - PE</p>
        </div>
        <div class="content-wrap">
           <div>${contentHtml}</div>
           <div class="signature-box">
              <div class="text-center border-t border-slate-800 pt-2 px-12 min-w-[300px]">
                 <p class="font-bold text-slate-900">Dr. ${user.name}</p>
                 <p class="text-sm text-slate-600">CRM: ${user.crm || ''}</p>
              </div>
           </div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  if (!patient) return <div className="p-8 text-center text-slate-500">Paciente não encontrado.</div>;
  if (user?.role !== UserRole.DOCTOR) return <div className="p-8 text-center text-red-500">Acesso restrito a médicos.</div>;

  return (
    <>
      {/* --- DOCUMENT MODAL (Same as Profile) --- */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                 <h3 className="font-bold text-slate-800">Novo Documento</h3>
                 <button onClick={() => setShowDocModal(false)}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                 <div className="flex gap-4 mb-6">
                    <button 
                      onClick={() => setDocType('prescription')}
                      className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${docType === 'prescription' ? 'border-blue-900 bg-blue-50 text-blue-900' : 'border-slate-100 text-slate-400'}`}
                    >
                       Receituário Simples
                    </button>
                    <button 
                      onClick={() => setDocType('referral')}
                      className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${docType === 'referral' ? 'border-blue-900 bg-blue-50 text-blue-900' : 'border-slate-100 text-slate-400'}`}
                    >
                       Encaminhamento
                    </button>
                 </div>

                 {docType === 'prescription' ? (
                   <div className="space-y-6">
                      {prescriptionItems.map((item, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-2 items-start bg-slate-50 p-4 rounded-xl border border-slate-200 group shadow-sm">
                           <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3 w-full">
                              
                              <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Via de Uso</label>
                                <div className="relative">
                                    <select 
                                        className="w-full p-2.5 text-sm border border-slate-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-900 outline-none"
                                        value={USAGE_MODES.includes(item.usageMode || '') ? item.usageMode : 'Outro'}
                                        onChange={e => {
                                            const newItems = [...prescriptionItems];
                                            if (e.target.value === 'Outro') {
                                                newItems[idx].usageMode = ''; 
                                            } else {
                                                newItems[idx].usageMode = e.target.value;
                                            }
                                            setPrescriptionItems(newItems);
                                        }}
                                    >
                                        {USAGE_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                </div>
                                {(!item.usageMode || !USAGE_MODES.includes(item.usageMode)) && (
                                    <input 
                                        placeholder="Digite a via..." 
                                        className="w-full mt-2 p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none"
                                        value={item.usageMode}
                                        onChange={e => {
                                            const newItems = [...prescriptionItems];
                                            newItems[idx].usageMode = e.target.value;
                                            setPrescriptionItems(newItems);
                                        }}
                                    />
                                )}
                              </div>

                              <div className="md:col-span-3">
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Medicação</label>
                                 <input 
                                    placeholder="Ex: Dipirona 500mg" 
                                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none" 
                                    value={item.medication} 
                                    onChange={e => {
                                        const newItems = [...prescriptionItems];
                                        newItems[idx].medication = e.target.value;
                                        setPrescriptionItems(newItems);
                                    }} 
                                 />
                              </div>
                              
                              <div className="md:col-span-1">
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Qtd</label>
                                 <input 
                                    placeholder="Ex: 1 CX" 
                                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none" 
                                    value={item.quantity} 
                                    onChange={e => {
                                        const newItems = [...prescriptionItems];
                                        newItems[idx].quantity = e.target.value;
                                        setPrescriptionItems(newItems);
                                    }} 
                                 />
                              </div>
                              
                              <div className="md:col-span-6">
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Posologia / Modo de Uso</label>
                                 <textarea 
                                    rows={2}
                                    placeholder="Ex: Tomar 1cp a cada 6h se houver dor ou febre." 
                                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none resize-none" 
                                    value={item.dosage} 
                                    onChange={e => {
                                        const newItems = [...prescriptionItems];
                                        newItems[idx].dosage = e.target.value;
                                        setPrescriptionItems(newItems);
                                    }} 
                                 />
                              </div>
                           </div>
                           <button onClick={() => setPrescriptionItems(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-6"><Trash2 size={18}/></button>
                        </div>
                      ))}
                      
                      <button onClick={() => setPrescriptionItems([...prescriptionItems, {medication: '', quantity: '', dosage: '', usageMode: 'Uso Oral'}])} className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                         <PlusCircle size={18}/> Adicionar Item à Receita
                      </button>
                   </div>
                 ) : (
                   <div className="h-[400px]">
                      <RichTextEditor 
                        value={referralText}
                        onChange={setReferralText}
                        placeholder="Descreva o encaminhamento, motivo, especialidade e observações clínicas..."
                        colorTheme="blue"
                      />
                   </div>
                 )}
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                 <button onClick={() => setShowDocModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                 <button onClick={handleSaveDocument} className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shadow-lg shadow-blue-900/20 font-medium flex items-center gap-2">
                    <Printer size={18} /> Salvar e Imprimir
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-20 shadow-sm gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => navigate(`/patients/${patientId}`)} className="text-slate-400 hover:text-slate-700 transition-colors bg-slate-50 p-2 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                {editId ? 'Editando Rascunho' : 'Nova Anamnese (SOAP)'}
              </h1>
              <p className="text-sm text-slate-500">Paciente: <span className="font-semibold text-blue-900">{patient.name}</span></p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-medium">
              {status === 'saving' && <span className="text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full"><Clock size={12} className="animate-spin"/> Salvando...</span>}
              {status === 'saved' && <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle size={12}/> Salvo {lastSaved?.toLocaleTimeString()}</span>}
              {status === 'draft' && <span className="text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full"><AlertTriangle size={12}/> Não salvo</span>}
              {status === 'error' && <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full">Erro ao salvar</span>}
            </div>

            <div className="flex gap-2 w-full md:w-auto">
               <button 
                 onClick={() => saveDraft()}
                 className="flex-1 md:flex-none px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm transition-colors border border-slate-200"
               >
                 Salvar Rascunho
               </button>
               <button 
                 onClick={handleFinalize}
                 className="flex-1 md:flex-none px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium text-sm transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
               >
                 <Save size={16} /> Finalizar
               </button>
            </div>
          </div>
        </div>

        {/* Editor Content - 1 Column Layout */}
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-20">
          
          {/* Subjective */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
             <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-indigo-900">Subjetivo (S)</h2>
                  <p className="text-xs text-indigo-600">O que o paciente relata: sintomas, histórico, queixas.</p>
                </div>
             </div>
             
             <div className="p-2">
               <RichTextEditor 
                  value={soap.s} 
                  onChange={(v) => handleChange('s', v)}
                  placeholder="Descreva a história clínica, sintomas atuais e relatos do paciente..."
                  templates={subjectiveTemplates}
                  colorTheme="indigo"
               />
             </div>
          </section>

          {/* Objective */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
             <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-emerald-900">Objetivo (O)</h2>
                  <p className="text-xs text-emerald-600">O que você observa: exames físicos, sinais vitais, laboratório.</p>
                </div>
             </div>

             <div className="p-2">
               <RichTextEditor 
                  value={soap.o} 
                  onChange={(v) => handleChange('o', v)}
                  placeholder="Registre os dados do exame físico, resultados de exames e observações clínicas..."
                  templates={objectiveTemplates}
                  colorTheme="emerald"
               />
             </div>
          </section>

          {/* Assessment */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
             <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-amber-900">Avaliação (A)</h2>
                  <p className="text-xs text-amber-600">Sua análise: hipóteses diagnósticas, conclusão clínica.</p>
                </div>
             </div>
             
             <div className="p-2">
               <RichTextEditor 
                  value={soap.a} 
                  onChange={(v) => handleChange('a', v)}
                  placeholder="Descreva sua análise do caso e possíveis diagnósticos..."
                  colorTheme="amber"
               />
             </div>
          </section>

          {/* --- NEW QUICK DOCUMENTS SECTION --- */}
          <section className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden p-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                   <ScrollText size={20} className="text-slate-500" /> Documentos Rápidos
                </h3>
                <div className="flex gap-2">
                   <button 
                     onClick={() => { setDocType('prescription'); setPrescriptionItems([{ medication: '', quantity: '', dosage: '', usageMode: 'Uso Oral' }]); setShowDocModal(true); }}
                     className="text-xs bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                   >
                     <PlusCircle size={14} /> Nova Receita
                   </button>
                   <button 
                     onClick={() => { setDocType('referral'); setReferralText(''); setShowDocModal(true); }}
                     className="text-xs bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                   >
                     <PlusCircle size={14} /> Novo Encaminhamento
                   </button>
                </div>
             </div>
             
             {/* Simple List of Session Documents */}
             <div className="space-y-2">
               {documents.filter(d => new Date(d.created_at).toDateString() === new Date().toDateString()).length === 0 && (
                  <p className="text-sm text-slate-400 text-center italic py-2">Nenhum documento criado nesta sessão.</p>
               )}
               
               {documents.filter(d => new Date(d.created_at).toDateString() === new Date().toDateString()).map(doc => (
                 <div key={doc.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded ${doc.type === 'prescription' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          <ScrollText size={16} />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-800 capitalize">{doc.type === 'prescription' ? 'Receita' : 'Encaminhamento'}</p>
                          <p className="text-[10px] text-slate-400">{new Date(doc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handlePrintDocument(doc)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors" title="Imprimir">
                          <Printer size={16} />
                       </button>
                       <button 
                         onClick={() => handleDeleteDocument(doc.id)} 
                         disabled={loadingDeleteDoc === doc.id}
                         className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                         title="Excluir"
                       >
                          {loadingDeleteDoc === doc.id ? <Clock size={16} className="animate-spin"/> : <Trash2 size={16} />}
                       </button>
                    </div>
                 </div>
               ))}
             </div>
          </section>

          {/* Plan */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
             <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-blue-900">Plano (P)</h2>
                  <p className="text-xs text-blue-600">Conduta: medicamentos, solicitações de exames, orientações.</p>
                </div>
             </div>
             
             <div className="p-2">
               <RichTextEditor 
                  value={soap.p} 
                  onChange={(v) => handleChange('p', v)}
                  placeholder="Prescrições, encaminhamentos, orientações educativas e agendamento de retorno..."
                  colorTheme="blue"
               />
             </div>
          </section>

        </div>
      </div>
    </>
  );
}