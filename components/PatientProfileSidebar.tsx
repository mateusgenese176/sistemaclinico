import React, { useState, useEffect } from 'react';
import { Patient, MedicalHistory, Address, Anamnesis } from '../types';
import { api } from '../supabaseClient';
import { 
  User, Phone, MapPin, Calendar, CreditCard, Activity, Tag, 
  ShieldAlert, HeartPulse, Pill, Syringe, Building2, Plus, Trash2, 
  ChevronLeft, X, Save, FileText, Pencil, Check, AlertCircle,
  History, Clock, Eye, Printer, ChevronDown, Loader2
} from 'lucide-react';
import { useDialog } from './Dialog';
import { printAnamnesisDocument } from '../utils/printDocument';

interface PatientProfileSidebarProps {
  patient: Patient;
  isOpen: boolean;
  onToggle: () => void;
  onPatientUpdate: (updated: Patient) => void;
  onOpenEditModal: () => void;
}

export default function PatientProfileSidebar({
  patient,
  isOpen,
  onToggle,
  onPatientUpdate,
  onOpenEditModal
}: PatientProfileSidebarProps) {
  const dialog = useDialog();

  // State for inline adding items to medical history
  const [newAllergy, setNewAllergy] = useState('');
  const [newComorbidity, setNewComorbidity] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newSurgery, setNewSurgery] = useState('');
  const [newHospitalization, setNewHospitalization] = useState('');

  const [savingField, setSavingField] = useState<string | null>(null);

  // State for chronological anamneses history
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([]);
  const [loadingAnamneses, setLoadingAnamneses] = useState(false);
  const [isAnamnesesOpen, setIsAnamnesesOpen] = useState(false);
  const [selectedAnamnesis, setSelectedAnamnesis] = useState<Anamnesis | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPatientAnamneses = async () => {
      if (!patient?.id) return;
      setLoadingAnamneses(true);
      try {
        const { data, error } = await api.getAnamneses(patient.id);
        if (!error && data && isMounted) {
          setAnamneses((data as any) || []);
        }
      } catch (err) {
        console.warn('Erro ao carregar histórico de anamneses:', err);
      } finally {
        if (isMounted) setLoadingAnamneses(false);
      }
    };

    fetchPatientAnamneses();
    return () => {
      isMounted = false;
    };
  }, [patient?.id]);

  const stripHtml = (html?: string) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const localHistoryFallback = (() => {
    if (patient.medical_history && Object.keys(patient.medical_history).length > 0) {
      return patient.medical_history;
    }
    try {
      const saved = localStorage.getItem(`medical_history_${patient.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  })();

  const medicalHistory: MedicalHistory = patient.medical_history || localHistoryFallback || {
    allergies: [],
    comorbidities: [],
    continuous_medications: [],
    surgeries: [],
    hospitalizations: []
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' anos';
  };

  const updateMedicalHistory = async (updatedHistory: MedicalHistory) => {
    // 1. Immediately update parent component state so UI responds instantly
    onPatientUpdate({
      ...patient,
      medical_history: updatedHistory
    });

    // 2. Persist locally in localStorage as a robust fallback
    try {
      localStorage.setItem(`medical_history_${patient.id}`, JSON.stringify(updatedHistory));
    } catch (err) {
      console.warn('LocalStorage save failed', err);
    }

    // 3. Persist remotely to Supabase (catch error silently if schema column doesn't exist)
    try {
      const { error } = await api.updatePatient(patient.id, {
        medical_history: updatedHistory
      });
      if (error) {
        console.warn('Supabase update returned error (column might be missing on remote DB):', error);
      }
    } catch (e) {
      console.warn('Network error updating medical history in Supabase:', e);
    }
  };

  const handleAddItem = async (
    field: keyof MedicalHistory,
    value: string,
    clearFn: () => void
  ) => {
    if (!value.trim()) return;
    setSavingField(field);
    const currentList = medicalHistory[field] || [];
    const updatedList = [...currentList, value.trim()];
    const updatedHistory = {
      ...medicalHistory,
      [field]: updatedList
    };

    await updateMedicalHistory(updatedHistory);
    clearFn();
    setSavingField(null);
  };

  const handleRemoveItem = async (field: keyof MedicalHistory, index: number) => {
    const currentList = medicalHistory[field] || [];
    const updatedList = currentList.filter((_, i) => i !== index);
    const updatedHistory = {
      ...medicalHistory,
      [field]: updatedList
    };
    await updateMedicalHistory(updatedHistory);
  };

  if (!isOpen) return null;

  return (
    <>
      <aside className="w-full lg:w-[380px] xl:w-[420px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-y-auto animate-fade-in transition-all">
      {/* Sidebar Header */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-2">
          <User size={20} className="text-blue-400" />
          <h2 className="font-bold text-sm tracking-wide">Perfil do Paciente</h2>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium"
          title="Recolher Painel"
        >
          <span>Ocultar</span>
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Patient Identity Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm relative">
          <div className="flex items-start gap-3">
            {patient.photo_url ? (
              <img
                src={patient.photo_url}
                alt={patient.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xl border-2 border-white shadow-md">
                {patient.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-base leading-tight truncate">
                {patient.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {patient.dob ? `${calculateAge(patient.dob)} (${new Date(patient.dob).toLocaleDateString()})` : 'Data de Nasc. N/A'}
              </p>
              
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="bg-blue-100 text-blue-900 font-bold text-[10px] px-2 py-0.5 rounded-full border border-blue-200 uppercase">
                  {patient.insurance_plan || 'Particular'}
                </span>
                {patient.cpf && (
                  <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    CPF: {patient.cpf}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onOpenEditModal}
            className="mt-3 w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Pencil size={12} className="text-blue-600" /> Editar Cadastro da Recepção
          </button>
        </div>

        {/* --- DADOS MÉDICOS SECTIONS --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <HeartPulse size={18} className="text-red-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
              Histórico & Dados Médicos
            </h3>
          </div>

          {/* --- ANAMNESES ANTERIORES (LISTA CRONOLÓGICA) --- */}
          <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-200/90 rounded-xl overflow-hidden shadow-xs transition-all">
            <button
              type="button"
              onClick={() => setIsAnamnesesOpen(!isAnamnesesOpen)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-blue-100/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <History size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Anamneses Anteriores
                    </span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full border border-blue-200">
                      {loadingAnamneses ? '...' : anamneses.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {loadingAnamneses
                      ? 'Carregando histórico...'
                      : anamneses.length === 0
                      ? 'Nenhuma anterior registrada'
                      : `${anamneses.length} ${anamneses.length === 1 ? 'consulta anterior' : 'consultas anteriores'}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-blue-900 group-hover:text-blue-700 transition-colors shrink-0 ml-2">
                <span className="text-[11px] font-semibold hidden sm:inline">
                  {isAnamnesesOpen ? 'Ocultar' : 'Ver Lista'}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${isAnamnesesOpen ? 'rotate-180 text-blue-900' : 'text-slate-400'}`}
                />
              </div>
            </button>

            {/* Lista Cronológica Expansível */}
            {isAnamnesesOpen && (
              <div className="border-t border-blue-200/70 p-2.5 space-y-2 bg-white/95 max-h-72 overflow-y-auto animate-fade-in">
                {loadingAnamneses ? (
                  <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 size={15} className="animate-spin text-blue-600" />
                    <span>Carregando atendimentos...</span>
                  </div>
                ) : anamneses.length === 0 ? (
                  <div className="p-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">
                      Nenhuma anamnese anterior encontrada para este paciente.
                    </p>
                  </div>
                ) : (
                  anamneses.map((item, index) => {
                    const dateObj = new Date(item.created_at);
                    const formattedDate = dateObj.toLocaleDateString('pt-BR');
                    const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const isDraft = item.status === 'draft';
                    const previewText = stripHtml(item.soap?.s || item.soap?.a || item.soap?.o || item.soap?.p || '');

                    return (
                      <div
                        key={item.id || index}
                        onClick={() => setSelectedAnamnesis(item)}
                        className="p-2.5 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer shadow-2xs group relative"
                        title="Clique para abrir e ver os dados completos desta anamnese"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-blue-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-900">
                              {formattedDate}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              às {formattedTime}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isDraft ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isDraft ? 'Rascunho' : 'Finalizada'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1.5">
                          <span className="font-medium text-slate-700 truncate">
                            Dr(a). {item.doctor?.name || 'Médico'}
                          </span>
                          <span className="text-blue-700 font-bold group-hover:text-blue-900 flex items-center gap-1 shrink-0 text-[11px]">
                            <Eye size={12} /> Abrir
                          </span>
                        </div>

                        {previewText ? (
                          <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 leading-relaxed">
                            "{previewText}"
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">Sem anotações no resumo.</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 1. Alergias */}
          <div className="bg-red-50/60 border border-red-200/80 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-red-600" /> ALERGIAS
              </span>
              <span className="text-[10px] bg-red-100 text-red-800 font-semibold px-1.5 py-0.5 rounded">
                {(medicalHistory.allergies || []).length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(medicalHistory.allergies || []).length === 0 ? (
                <p className="text-xs text-red-600/70 italic">Nenhuma alergia relatada.</p>
              ) : (
                medicalHistory.allergies!.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-white border border-red-300 text-red-900 font-medium text-xs px-2.5 py-1 rounded-lg shadow-2xs"
                  >
                    {item}
                    <button
                      onClick={() => handleRemoveItem('allergies', idx)}
                      className="text-red-400 hover:text-red-700 p-0.5 rounded hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add Allergy Input */}
            <div className="flex gap-1.5 mt-2">
              <input
                type="text"
                placeholder="Ex: Penicilina, Dipirona..."
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('allergies', newAllergy, () => setNewAllergy(''));
                  }
                }}
                className="flex-1 bg-white border border-red-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-red-400 outline-none text-slate-800"
              />
              <button
                onClick={() => handleAddItem('allergies', newAllergy, () => setNewAllergy(''))}
                disabled={!newAllergy.trim()}
                className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors"
                title="Adicionar Alergia"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* 2. Comorbidades */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Activity size={14} className="text-amber-600" /> COMORBIDADES
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                {(medicalHistory.comorbidities || []).length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(medicalHistory.comorbidities || []).length === 0 ? (
                <p className="text-xs text-amber-700/70 italic">Nenhuma comorbidade registrada.</p>
              ) : (
                medicalHistory.comorbidities!.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-900 font-medium text-xs px-2.5 py-1 rounded-lg shadow-2xs"
                  >
                    {item}
                    <button
                      onClick={() => handleRemoveItem('comorbidities', idx)}
                      className="text-amber-500 hover:text-amber-800 p-0.5 rounded hover:bg-amber-50 transition-colors"
                      title="Remover"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-1.5 mt-2">
              <input
                type="text"
                placeholder="Ex: Hipertensão, Diabetes..."
                value={newComorbidity}
                onChange={(e) => setNewComorbidity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('comorbidities', newComorbidity, () => setNewComorbidity(''));
                  }
                }}
                className="flex-1 bg-white border border-amber-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-amber-400 outline-none text-slate-800"
              />
              <button
                onClick={() => handleAddItem('comorbidities', newComorbidity, () => setNewComorbidity(''))}
                disabled={!newComorbidity.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white p-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors"
                title="Adicionar Comorbidade"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* 3. Medicamentos de Uso Contínuo */}
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Pill size={14} className="text-indigo-600" /> MEDICAMENTOS DE USO CONTÍNUO
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-1.5 py-0.5 rounded">
                {(medicalHistory.continuous_medications || []).length}
              </span>
            </div>

            <div className="space-y-1.5">
              {(medicalHistory.continuous_medications || []).length === 0 ? (
                <p className="text-xs text-indigo-700/70 italic">Nenhum medicamento contínuo.</p>
              ) : (
                medicalHistory.continuous_medications!.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white border border-indigo-200 text-indigo-950 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-2xs"
                  >
                    <span>{item}</span>
                    <button
                      onClick={() => handleRemoveItem('continuous_medications', idx)}
                      className="text-indigo-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-1.5 mt-2">
              <input
                type="text"
                placeholder="Ex: Losartana 50mg 1x/dia..."
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('continuous_medications', newMedication, () => setNewMedication(''));
                  }
                }}
                className="flex-1 bg-white border border-indigo-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none text-slate-800"
              />
              <button
                onClick={() => handleAddItem('continuous_medications', newMedication, () => setNewMedication(''))}
                disabled={!newMedication.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors"
                title="Adicionar Medicamento"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* 4. Histórico de Cirurgias */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Syringe size={14} className="text-emerald-600" /> HISTÓRICO DE CIRURGIAS
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                {(medicalHistory.surgeries || []).length}
              </span>
            </div>

            <div className="space-y-1.5">
              {(medicalHistory.surgeries || []).length === 0 ? (
                <p className="text-xs text-emerald-700/70 italic">Nenhuma cirurgia relatada.</p>
              ) : (
                medicalHistory.surgeries!.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white border border-emerald-200 text-emerald-950 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-2xs"
                  >
                    <span>{item}</span>
                    <button
                      onClick={() => handleRemoveItem('surgeries', idx)}
                      className="text-emerald-500 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-1.5 mt-2">
              <input
                type="text"
                placeholder="Ex: Apendicectomia (2019)..."
                value={newSurgery}
                onChange={(e) => setNewSurgery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('surgeries', newSurgery, () => setNewSurgery(''));
                  }
                }}
                className="flex-1 bg-white border border-emerald-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-400 outline-none text-slate-800"
              />
              <button
                onClick={() => handleAddItem('surgeries', newSurgery, () => setNewSurgery(''))}
                disabled={!newSurgery.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors"
                title="Adicionar Cirurgia"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* 5. Histórico de Internações */}
          <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Building2 size={14} className="text-purple-600" /> HISTÓRICO DE INTERNAÇÕES
              </span>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.5 rounded">
                {(medicalHistory.hospitalizations || []).length}
              </span>
            </div>

            <div className="space-y-1.5">
              {(medicalHistory.hospitalizations || []).length === 0 ? (
                <p className="text-xs text-purple-700/70 italic">Nenhuma internação registrada.</p>
              ) : (
                medicalHistory.hospitalizations!.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white border border-purple-200 text-purple-950 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-2xs"
                  >
                    <span>{item}</span>
                    <button
                      onClick={() => handleRemoveItem('hospitalizations', idx)}
                      className="text-purple-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-1.5 mt-2">
              <input
                type="text"
                placeholder="Ex: Pneumonia em 2022 (5 dias)..."
                value={newHospitalization}
                onChange={(e) => setNewHospitalization(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('hospitalizations', newHospitalization, () => setNewHospitalization(''));
                  }
                }}
                className="flex-1 bg-white border border-purple-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-purple-400 outline-none text-slate-800"
              />
              <button
                onClick={() => handleAddItem('hospitalizations', newHospitalization, () => setNewHospitalization(''))}
                disabled={!newHospitalization.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white p-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors"
                title="Adicionar Internação"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* --- DADOS ADICIONADOS PELA RECEPÇÃO --- */}
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2 pb-1">
            <FileText size={16} className="text-slate-500" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Dados Cadastrais da Recepção
            </h3>
          </div>

          {/* Contact & Social */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
            <div>
              <span className="font-bold text-slate-500 block mb-0.5 flex items-center gap-1">
                <Phone size={12} /> Contato
              </span>
              <p className="font-medium text-slate-800">{patient.contact || 'Não informado'}</p>
            </div>

            {patient.address && (patient.address.street || patient.address.city) && (
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-500 block mb-0.5 flex items-center gap-1">
                  <MapPin size={12} /> Endereço
                </span>
                <p className="font-medium text-slate-800 leading-snug">
                  {patient.address.street}
                  {patient.address.number ? `, ${patient.address.number}` : ''}
                  {patient.address.neighborhood ? ` - ${patient.address.neighborhood}` : ''}
                  <br />
                  {patient.address.city} - {patient.address.state} {patient.address.cep ? `(${patient.address.cep})` : ''}
                </p>
              </div>
            )}

            {patient.social_info && (
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-500 block mb-0.5">Observações da Recepção</span>
                <p className="text-slate-700 bg-white p-2 rounded border border-slate-200 italic">
                  "{patient.social_info}"
                </p>
              </div>
            )}
          </div>

          {/* Antropometria */}
          {patient.anthropometrics && (
            <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-3 text-xs space-y-2">
              <span className="font-bold text-blue-900 block flex items-center gap-1">
                <Activity size={12} className="text-blue-600" /> Antropometria & Sinais Vitais
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border border-blue-100">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Peso / Altura</span>
                  <span className="font-bold text-slate-800">
                    {patient.anthropometrics.weight ? `${patient.anthropometrics.weight} kg` : '-'} / {patient.anthropometrics.height ? `${patient.anthropometrics.height} cm` : '-'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded border border-blue-100">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">IMC</span>
                  <span className="font-bold text-slate-800">
                    {patient.anthropometrics.bmi ? `${patient.anthropometrics.bmi} kg/m²` : '-'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded border border-blue-100 col-span-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Pressão Arterial</span>
                  <span className="font-bold text-blue-900">
                    {patient.anthropometrics.bp_systolic && patient.anthropometrics.bp_diastolic
                      ? `${patient.anthropometrics.bp_systolic} x ${patient.anthropometrics.bp_diastolic} mmHg`
                      : 'Não informada'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Patient Tags */}
          {patient.tags && patient.tags.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
              <span className="font-bold text-slate-500 block flex items-center gap-1">
                <Tag size={12} /> Tags do Paciente
              </span>
              <div className="flex flex-wrap gap-1">
                {patient.tags.map((tag, i) => (
                  <span key={i} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>

    {/* --- POPUP INTERNO: DETALHES COMPLETOS DA ANAMNESE ANTERIOR --- */}
    {selectedAnamnesis && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in border border-slate-200">
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/90 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 text-xs font-bold px-2 py-0.5 rounded-md uppercase">
                  <History size={12} /> Histórico de Anamnese
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase ${
                    selectedAnamnesis.status === 'draft'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedAnamnesis.status === 'draft' ? 'Rascunho' : 'Finalizada'}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {new Date(selectedAnamnesis.created_at).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(selectedAnamnesis.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight truncate">
                Consulta de {patient.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Médico Responsável: Dr(a). {selectedAnamnesis.doctor?.name || 'Não identificado'}{' '}
                {selectedAnamnesis.doctor?.crm ? `(CRM: ${selectedAnamnesis.doctor.crm})` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => printAnamnesisDocument(selectedAnamnesis, patient)}
                className="p-2 hover:bg-white rounded-xl text-slate-600 hover:text-blue-900 transition-colors border border-slate-200 shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
                title="Imprimir Anamnese"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAnamnesis(null)}
                className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors border border-slate-200 shadow-2xs"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body - SOAP Sections */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-800">
            {/* S - Subjetivo */}
            <div className="bg-slate-50 rounded-xl border border-indigo-100 overflow-hidden shadow-2xs">
              <div className="bg-indigo-50/80 px-4 py-2.5 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    S
                  </span>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-950">
                    Subjetivo (Queixa & Relato do Paciente)
                  </h4>
                </div>
              </div>
              <div className="p-4 text-sm leading-relaxed text-slate-700">
                {selectedAnamnesis.soap?.s ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: selectedAnamnesis.soap.s }}
                  />
                ) : (
                  <p className="text-slate-400 italic text-xs">Sem anotações registradas no campo subjetivo.</p>
                )}
              </div>
            </div>

            {/* O - Objetivo */}
            <div className="bg-slate-50 rounded-xl border border-emerald-100 overflow-hidden shadow-2xs">
              <div className="bg-emerald-50/80 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                    O
                  </span>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                    Objetivo (Exame Físico & Dados Vitais)
                  </h4>
                </div>
              </div>
              <div className="p-4 text-sm leading-relaxed text-slate-700">
                {selectedAnamnesis.soap?.o ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: selectedAnamnesis.soap.o }}
                  />
                ) : (
                  <p className="text-slate-400 italic text-xs">Sem anotações registradas no campo objetivo.</p>
                )}
              </div>
            </div>

            {/* A - Avaliação */}
            <div className="bg-slate-50 rounded-xl border border-amber-100 overflow-hidden shadow-2xs">
              <div className="bg-amber-50/80 px-4 py-2.5 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                    A
                  </span>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-950">
                    Avaliação (Hipóteses Diagnósticas & Raciocínio Clínico)
                  </h4>
                </div>
              </div>
              <div className="p-4 text-sm leading-relaxed text-slate-700">
                {selectedAnamnesis.soap?.a ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: selectedAnamnesis.soap.a }}
                  />
                ) : (
                  <p className="text-slate-400 italic text-xs">Sem anotações registradas no campo avaliação.</p>
                )}
              </div>
            </div>

            {/* P - Plano */}
            <div className="bg-slate-50 rounded-xl border border-purple-100 overflow-hidden shadow-2xs">
              <div className="bg-purple-50/80 px-4 py-2.5 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                    P
                  </span>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-purple-950">
                    Plano (Conduta, Prescrições & Orientações)
                  </h4>
                </div>
              </div>
              <div className="p-4 text-sm leading-relaxed text-slate-700">
                {selectedAnamnesis.soap?.p ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: selectedAnamnesis.soap.p }}
                  />
                ) : (
                  <p className="text-slate-400 italic text-xs">Sem anotações registradas no campo plano.</p>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Atendimento registrado em{' '}
              {new Date(selectedAnamnesis.created_at).toLocaleDateString('pt-BR')}
            </span>
            <button
              type="button"
              onClick={() => setSelectedAnamnesis(null)}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
