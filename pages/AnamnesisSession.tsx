import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../supabaseClient';
import { Patient, UserRole } from '../types';
import { useAuth } from '../App';
import { Save, CheckCircle, ArrowLeft, Clock, AlertTriangle, FileText, Activity, ClipboardList, Stethoscope } from 'lucide-react';
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

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  if (!patient) return <div className="p-8 text-center text-slate-500">Paciente não encontrado.</div>;
  if (user?.role !== UserRole.DOCTOR) return <div className="p-8 text-center text-red-500">Acesso restrito a médicos.</div>;

  return (
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
  );
}