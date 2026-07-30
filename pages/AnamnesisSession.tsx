import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../supabaseClient';
import { Patient, UserRole, MedicalDocument, PrescriptionItem } from '../types';
import { useAuth } from '../App';
import { Save, CheckCircle, ArrowLeft, Clock, AlertTriangle, FileText, Activity, ClipboardList, Stethoscope, ScrollText, PlusCircle, Printer, Trash2, X, ChevronDown, Eye, Copy, User } from 'lucide-react';
import { useDialog } from '../components/Dialog';
import RichTextEditor from '../components/RichTextEditor';
import QuickDocumentModal from '../components/QuickDocumentModal';
import PatientProfileSidebar from '../components/PatientProfileSidebar';
import PatientEditModal from '../components/PatientEditModal';
import { printMedicalDocument, HEADER_LOGO_URL } from '../utils/printDocument';

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

  // --- RETRACTABLE SIDEBAR STATE & PATIENT EDIT ---
  const [showPatientSidebar, setShowPatientSidebar] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- DOCUMENTOS RÁPIDOS STATE ---
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [initialDocType, setInitialDocType] = useState<'prescription' | 'referral' | 'exam'>('prescription');
  const [selectedDocForCopy, setSelectedDocForCopy] = useState<MedicalDocument | null>(null);
  const [viewingDoc, setViewingDoc] = useState<MedicalDocument | null>(null);
  const [loadingDeleteDoc, setLoadingDeleteDoc] = useState<string | null>(null);

  // --- REFS FOR TAB NAVIGATION ---
  const sRef = useRef<any>(null);
  const oRef = useRef<any>(null);
  const aRef = useRef<any>(null);
  const pRef = useRef<any>(null);

  const handleTab = (currentField: string, shift: boolean) => {
    const fields = ['s', 'o', 'a', 'p'];
    const currentIndex = fields.indexOf(currentField);
    const nextIndex = shift ? currentIndex - 1 : currentIndex + 1;
    
    if (nextIndex >= 0 && nextIndex < fields.length) {
      const nextField = fields[nextIndex];
      const refs: Record<string, any> = { s: sRef, o: oRef, a: aRef, p: pRef };
      refs[nextField].current?.focus();
    }
  };

  const LOGO_URL = "https://i.ibb.co/n8rLsXSJ/upscalemedia-transformed-1.png";
  const HEADER_LOGO_URL = "https://i.ibb.co/sJR9zQKt/upscalemedia-transformed-1.png";

  const USAGE_MODES = [
    'Uso Oral', 'Uso Tópico', 'Uso Endovenoso', 'Uso Intramuscular', 'Uso Subcutâneo',
    'Uso Intranasal', 'Uso Oftálmico', 'Uso Otológico', 'Uso Retal', 'Uso Vaginal',
    'Uso Inalatório', 'Uso Contínuo', 'Outro'
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

  const handleCopyDocument = (doc: MedicalDocument) => {
    setSelectedDocForCopy(doc);
    setInitialDocType(doc.type);
    setShowDocModal(true);
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
    printMedicalDocument(doc, patient, user);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  if (!patient) return <div className="p-8 text-center text-slate-500">Paciente não encontrado.</div>;
  if (user?.role !== UserRole.DOCTOR) return <div className="p-8 text-center text-red-500">Acesso restrito a médicos.</div>;

  return (
    <>
      {/* --- PATIENT EDIT MODAL --- */}
      {isEditModalOpen && patient && (
        <PatientEditModal
          patient={patient}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updated) => setPatient(updated)}
        />
      )}

      {/* --- QUICK DOCUMENT MODAL --- */}
      <QuickDocumentModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        patientId={patientId!}
        doctor={user!}
        initialType={initialDocType}
        initialDoc={selectedDocForCopy}
        onSaveSuccess={fetchDocuments}
        onPrintAfterSave={(doc) => handlePrintDocument(doc)}
      />

      {/* --- VIEW DOCUMENT MODAL --- */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-scale-in overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Eye size={18} className="text-blue-600" />
                Visualizar {viewingDoc.type === 'prescription' ? 'Receita' : viewingDoc.type === 'referral' ? 'Encaminhamento' : 'Solicitação de Exames'}
              </h3>
              <button onClick={() => setViewingDoc(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-white">
              <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-100">
                <img src={HEADER_LOGO_URL} className="h-12 w-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {viewingDoc.type === 'prescription' ? 'Receituário Simples' : viewingDoc.type === 'referral' ? 'Encaminhamento Médico' : 'Solicitação de Exames'}
                  </p>
                  <p className="text-sm font-medium text-slate-600">Data: {new Date(viewingDoc.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {viewingDoc.type === 'prescription' && viewingDoc.content.items ? (
                <div className="space-y-6">
                  {(() => {
                    const grouped: Record<string, PrescriptionItem[]> = {};
                    viewingDoc.content.items.forEach(item => {
                      const mode = item.usageMode || 'Uso Geral';
                      if (!grouped[mode]) grouped[mode] = [];
                      grouped[mode].push(item);
                    });
                    return Object.entries(grouped).map(([mode, items]) => (
                      <div key={mode} className="space-y-4">
                        <h4 className="text-xs font-bold text-blue-900 uppercase border-b border-blue-100 pb-1">{mode}</h4>
                        {items.map((item, idx) => (
                          <div key={idx} className="pl-2">
                            <div className="flex justify-between items-baseline border-b border-dashed border-slate-200 pb-1">
                              <span className="font-bold text-slate-900 uppercase">{item.medication}</span>
                              <span className="text-sm font-bold text-slate-700">{item.quantity}</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1 italic">{item.dosage}</p>
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              ) : viewingDoc.type === 'exam' ? (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    Categoria: {viewingDoc.content.examCategory === 'image' ? 'Exames de Imagem' : 'Exames Laboratoriais'}
                  </p>
                  <div className="space-y-2">
                    {[...(viewingDoc.content.selectedExams || []), ...(viewingDoc.content.customExams || [])].map((ex, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium">
                        {i + 1}. {ex}
                      </div>
                    ))}
                  </div>
                  {viewingDoc.content.text && (
                    <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-700">
                      <strong>Observações:</strong>
                      <p className="mt-1">{viewingDoc.content.text}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="prose prose-slate max-w-none text-slate-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: viewingDoc.content.text || '' }}
                />
              )}

              <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                <div className="inline-block border-t border-slate-300 pt-1 px-8">
                  <p className="font-bold text-slate-900">Dr. {viewingDoc.doctor?.name || user?.name}</p>
                  <p className="text-xs text-slate-500">CRM: {viewingDoc.doctor?.crm || user?.crm || ''}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
              <button 
                onClick={() => { handlePrintDocument(viewingDoc); setViewingDoc(null); }}
                className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shadow-lg shadow-blue-900/20 font-bold text-sm flex items-center gap-2"
              >
                <Printer size={16} /> Imprimir
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

          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            {/* Toggle Patient Sidebar Button */}
            <button
              onClick={() => setShowPatientSidebar(!showPatientSidebar)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
              title="Alternar Painel do Paciente"
            >
              <User size={16} className="text-indigo-600" />
              <span>{showPatientSidebar ? 'Ocultar Perfil' : 'Ver Perfil do Paciente'}</span>
            </button>

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

        {/* Main Workspace Layout (Sidebar + Expanded Fields) */}
        <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 flex flex-col lg:flex-row items-start gap-6 pb-20">
          
          {/* Patient Profile Retractable Sidebar (~40% width) */}
          <PatientProfileSidebar
            patient={patient}
            isOpen={showPatientSidebar}
            onToggle={() => setShowPatientSidebar(false)}
            onPatientUpdate={(updated) => setPatient(updated)}
            onOpenEditModal={() => setIsEditModalOpen(true)}
          />

          {/* Main Anamnesis Form (Expanded Width) */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            
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
                  ref={sRef}
                  value={soap.s} 
                  onChange={(v) => handleChange('s', v)}
                  placeholder="Descreva a história clínica, sintomas atuais e relatos do paciente..."
                  fieldId="s"
                  colorTheme="indigo"
                  onTab={(shift) => handleTab('s', shift)}
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
                  ref={oRef}
                  value={soap.o} 
                  onChange={(v) => handleChange('o', v)}
                  placeholder="Registre os dados do exame físico, resultados de exames e observações clínicas..."
                  fieldId="o"
                  colorTheme="emerald"
                  onTab={(shift) => handleTab('o', shift)}
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
                  ref={aRef}
                  value={soap.a} 
                  onChange={(v) => handleChange('a', v)}
                  placeholder="Descreva sua análise do caso e possíveis diagnósticos..."
                  fieldId="a"
                  colorTheme="amber"
                  onTab={(shift) => handleTab('a', shift)}
               />
             </div>
          </section>

          {/* --- NEW QUICK DOCUMENTS SECTION --- */}
          <section className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden p-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
             <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                   <ScrollText size={20} className="text-slate-500" /> Documentos Rápidos
                </h3>
                <div className="flex gap-2 flex-wrap">
                   <button 
                     onClick={() => { setSelectedDocForCopy(null); setInitialDocType('prescription'); setShowDocModal(true); }}
                     className="text-xs bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm"
                   >
                     <PlusCircle size={14} /> Nova Receita
                   </button>
                   <button 
                     onClick={() => { setSelectedDocForCopy(null); setInitialDocType('referral'); setShowDocModal(true); }}
                     className="text-xs bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm"
                   >
                     <PlusCircle size={14} /> Novo Encaminhamento
                   </button>
                   <button 
                     onClick={() => { setSelectedDocForCopy(null); setInitialDocType('exam'); setShowDocModal(true); }}
                     className="text-xs bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm"
                   >
                     <PlusCircle size={14} /> Novo Exame
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
                       <div className={`p-2 rounded ${doc.type === 'prescription' ? 'bg-indigo-50 text-indigo-700' : doc.type === 'referral' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          <ScrollText size={16} />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-800 capitalize">
                            {doc.type === 'prescription' ? 'Receita' : doc.type === 'referral' ? 'Encaminhamento' : 'Exames Solicitados'}
                          </p>
                          <p className="text-[10px] text-slate-400">{new Date(doc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setViewingDoc(doc)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors" title="Visualizar">
                          <Eye size={16} />
                       </button>
                       <button onClick={() => handleCopyDocument(doc)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors" title="Copiar para novo">
                          <Copy size={16} />
                       </button>
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
                  ref={pRef}
                  value={soap.p} 
                  onChange={(v) => handleChange('p', v)}
                  placeholder="Prescrições, encaminhamentos, orientações educativas e agendamento de retorno..."
                  fieldId="p"
                  colorTheme="blue"
                  onTab={(shift) => handleTab('p', shift)}
               />
             </div>
          </section>

          </div>
        </div>
      </div>
    </>
  );
}