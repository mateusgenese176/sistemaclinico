import React, { useState, useEffect, useRef } from 'react';
import { MedicalDocument, PrescriptionItem, User, ExamRoutine } from '../types';
import { api } from '../supabaseClient';
import { 
  UNIQUE_LAB_EXAMS, 
  UNIQUE_IMAGE_EXAMS, 
  getStoredCustomExams, 
  saveCustomExamsToStorage, 
  removeCustomExamFromStorage, 
  CustomExamsCatalog,
  getStoredExamRoutines,
  saveExamRoutineToStorage,
  deleteExamRoutineFromStorage,
  fetchCustomExamsFromSupabase,
  saveCustomExamsToSupabase,
  removeCustomExamFromSupabase,
  fetchExamRoutinesFromSupabase,
  saveExamRoutineToSupabase,
  deleteExamRoutineFromSupabase
} from '../data/examsData';
import { 
  X, Plus, PlusCircle, Trash2, ChevronDown, Search, Check, Printer, 
  FileText, Activity, ShieldAlert, BookmarkCheck, Bookmark, Sparkles, 
  Edit2, CheckCircle2 
} from 'lucide-react';
import { useDialog } from './Dialog';

interface QuickDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  doctor: User;
  initialType?: 'prescription' | 'special_prescription' | 'referral' | 'exam';
  initialDoc?: MedicalDocument | null;
  onSaveSuccess: () => void;
  onPrintAfterSave?: (doc: MedicalDocument) => void;
}

const USAGE_MODES = [
  'Uso Oral', 'Uso Tópico', 'Uso Endovenoso', 'Uso Intramuscular', 'Uso Subcutâneo',
  'Uso Intranasal', 'Uso Oftálmico', 'Uso Otológico', 'Uso Retal', 'Uso Vaginal',
  'Uso Inalatório', 'Uso Contínuo', 'Outro'
];

export default function QuickDocumentModal({
  isOpen,
  onClose,
  patientId,
  doctor,
  initialType = 'prescription',
  initialDoc = null,
  onSaveSuccess,
  onPrintAfterSave
}: QuickDocumentModalProps) {
  const dialog = useDialog();
  const [docType, setDocType] = useState<'prescription' | 'special_prescription' | 'referral' | 'exam'>(initialType);
  const [loading, setLoading] = useState(false);

  // Receituário State
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    { medication: '', quantity: '', dosage: '', usageMode: 'Uso Oral' }
  ]);

  // Encaminhamento State
  const [referralText, setReferralText] = useState('');

  // Exame State
  const [examCategory, setExamCategory] = useState<'laboratorial' | 'imagem'>('laboratorial');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [customExams, setCustomExams] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [customCatalog, setCustomCatalog] = useState<CustomExamsCatalog>(() => getStoredCustomExams());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Exam Routines State
  const [examRoutines, setExamRoutines] = useState<ExamRoutine[]>(() => getStoredExamRoutines());
  const [showRoutineContextMenu, setShowRoutineContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showCreateRoutineModal, setShowCreateRoutineModal] = useState(false);
  const [showExploreRoutinesModal, setShowExploreRoutinesModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<ExamRoutine | null>(null);
  const [routineSearchTerm, setRoutineSearchTerm] = useState('');
  const [routineContextMenuSearch, setRoutineContextMenuSearch] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Form State for Creating/Editing Routine
  const [routineForm, setRoutineForm] = useState<{
    name: string;
    category: 'laboratorial' | 'imagem' | 'geral';
    description: string;
    exams: string[];
  }>({
    name: '',
    category: 'laboratorial',
    description: '',
    exams: []
  });
  const [routineExamSearch, setRoutineExamSearch] = useState('');
  const [routineExamDropdown, setRoutineExamDropdown] = useState(false);
  const routineDropdownRef = useRef<HTMLDivElement>(null);
  const lastContextMenuClick = useRef<{ time: number } | null>(null);

  // Initialize or Reset
  useEffect(() => {
    if (isOpen) {
      // Carrega do cache instantâneo para UI inicial imediata
      setCustomCatalog(getStoredCustomExams());
      setExamRoutines(getStoredExamRoutines());

      // Sincroniza diretamente com o Supabase com base no médico autenticado
      if (doctor?.id) {
        fetchCustomExamsFromSupabase(doctor.id).then(catalog => {
          setCustomCatalog(catalog);
        }).catch(err => console.error("Erro ao buscar exames personalizados no Supabase:", err));

        fetchExamRoutinesFromSupabase(doctor.id).then(routines => {
          setExamRoutines(routines);
        }).catch(err => console.error("Erro ao buscar rotinas no Supabase:", err));
      }
    }

    if (initialDoc) {
      setDocType(initialDoc.type);
      if (initialDoc.type === 'prescription' || initialDoc.type === 'special_prescription') {
        setPrescriptionItems(initialDoc.content.items || [{ medication: '', quantity: '', dosage: '', usageMode: 'Uso Oral' }]);
      } else if (initialDoc.type === 'referral') {
        setReferralText(initialDoc.content.text || '');
      } else if (initialDoc.type === 'exam') {
        setExamCategory(initialDoc.content.examCategory || 'laboratorial');
        setSelectedExams(initialDoc.content.selectedExams || []);
        setCustomExams(initialDoc.content.customExams || '');
      }
    } else {
      setDocType(initialType);
      setPrescriptionItems([{ medication: '', quantity: '', dosage: '', usageMode: 'Uso Oral' }]);
      setReferralText('');
      setExamCategory('laboratorial');
      setSelectedExams([]);
      setCustomExams('');
      setExamSearch('');
    }
  }, [isOpen, initialType, initialDoc]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (routineDropdownRef.current && !routineDropdownRef.current.contains(event.target as Node)) {
        setRoutineExamDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filter exams based on search query, integrating custom exams into the official catalog
  const baseExams = examCategory === 'laboratorial' ? UNIQUE_LAB_EXAMS : UNIQUE_IMAGE_EXAMS;
  const currentCategoryCustoms = customCatalog[examCategory] || [];
  const availableExams = Array.from(new Set([...currentCategoryCustoms, ...baseExams]))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const filteredExams = availableExams.filter(exam =>
    exam.toLowerCase().includes(examSearch.toLowerCase().trim()) &&
    !selectedExams.includes(exam)
  );

  // Filter routines in floating context menu based on routineContextMenuSearch
  const filteredContextMenuRoutines = examRoutines.filter(r => {
    if (!routineContextMenuSearch.trim()) return true;
    const term = routineContextMenuSearch.toLowerCase().trim();
    return (
      r.name.toLowerCase().includes(term) ||
      (r.description && r.description.toLowerCase().includes(term)) ||
      r.exams.some(ex => ex.toLowerCase().includes(term))
    );
  });

  const isExamCustom = (examName: string) => {
    return (customCatalog[examCategory] || []).some(
      c => c.trim().toLowerCase() === examName.trim().toLowerCase()
    );
  };

  const handleAddExam = (examName: string) => {
    if (!selectedExams.includes(examName)) {
      setSelectedExams(prev => [...prev, examName]);
    }
    setExamSearch('');
    setShowDropdown(false);
  };

  const handleRemoveExam = (examName: string) => {
    setSelectedExams(prev => prev.filter(e => e !== examName));
  };

  const handleDeleteCustomExam = async (examName: string) => {
    const confirmed = await dialog.confirm(
      "Excluir Exame",
      `Tem certeza que deseja excluir o exame "${examName}" do banco de dados oficial?`,
      "danger"
    );
    if (confirmed) {
      const updated = await removeCustomExamFromSupabase(doctor?.id, examName, examCategory, customCatalog);
      setCustomCatalog(updated);
      setSelectedExams(prev => prev.filter(e => e.trim().toLowerCase() !== examName.trim().toLowerCase()));
      setFeedbackToast(`Exame "${examName}" removido do banco com sucesso.`);
      setTimeout(() => setFeedbackToast(null), 3000);
    }
  };

  const handleKeyDownSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredExams.length > 0) {
        // Select top matching option
        handleAddExam(filteredExams[0]);
      } else if (examSearch.trim().length > 0) {
        // Add custom exam and integrate into the official catalog and Supabase
        const newExam = examSearch.trim();
        if (!selectedExams.some(e => e.toLowerCase() === newExam.toLowerCase())) {
          setSelectedExams(prev => [...prev, newExam]);
        }
        const updated = await saveCustomExamsToSupabase(doctor?.id, [newExam], examCategory, customCatalog);
        setCustomCatalog(updated);
        setExamSearch('');
        setShowDropdown(false);
      }
    }
  };

  // Add custom exams split by comma and integrate into the official catalog
  const handleAddCustomCommas = async () => {
    if (!customExams.trim()) return;
    const parts = customExams
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    if (parts.length === 0) return;

    // Add to selected exams
    setSelectedExams(prev => {
      const next = [...prev];
      parts.forEach(part => {
        if (!next.some(existing => existing.toLowerCase() === part.toLowerCase())) {
          next.push(part);
        }
      });
      return next;
    });

    // Integrate into the official searchable catalog in Supabase
    const updated = await saveCustomExamsToSupabase(doctor?.id, parts, examCategory, customCatalog);
    setCustomCatalog(updated);

    // Clear Outros textarea
    setCustomExams('');
  };

  // ---------------- ROTINAS DE SOLICITAÇÃO DE EXAMES (DOUBLE RIGHT-CLICK & HANDLERS) ----------------

  const handleContextMenu = (e: React.MouseEvent) => {
    if (docType !== 'exam') return;

    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 500; // ms
    const MIN_CLICK_DELAY = 80; // ms: previne que disparos imediatos ou múltiplos do mesmo clique acionem o duplo clique

    if (
      lastContextMenuClick.current &&
      (now - lastContextMenuClick.current.time <= DOUBLE_CLICK_DELAY) &&
      (now - lastContextMenuClick.current.time >= MIN_CLICK_DELAY)
    ) {
      // Duplo clique com o botão direito confirmado!
      const menuWidth = 350;
      const menuHeight = 460;
      const x = Math.min(e.clientX, window.innerWidth - menuWidth - 20);
      const y = Math.min(e.clientY, window.innerHeight - menuHeight - 20);
      setShowRoutineContextMenu({ x: Math.max(10, x), y: Math.max(10, y) });
      setRoutineContextMenuSearch('');
      lastContextMenuClick.current = null;
    } else {
      lastContextMenuClick.current = { time: now };
    }
  };

  const handleSelectRoutine = (routine: ExamRoutine) => {
    if (!routine.exams || routine.exams.length === 0) {
      dialog.alert("Atenção", "Esta rotina não possui exames cadastrados.");
      return;
    }

    let addedCount = 0;
    setSelectedExams(prev => {
      const next = [...prev];
      routine.exams.forEach(exam => {
        if (!next.some(e => e.toLowerCase() === exam.toLowerCase())) {
          next.push(exam);
          addedCount++;
        }
      });
      return next;
    });

    if (routine.category === 'imagem' && examCategory !== 'imagem') {
      setExamCategory('imagem');
    } else if (routine.category === 'laboratorial' && examCategory !== 'laboratorial') {
      setExamCategory('laboratorial');
    }

    setShowRoutineContextMenu(null);
    setRoutineContextMenuSearch('');
    setShowExploreRoutinesModal(false);

    setFeedbackToast(`Rotina "${routine.name}" aplicada! (${routine.exams.length} exames adicionados)`);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  const openCreateRoutineModal = (prefillWithCurrentExams: boolean = false) => {
    setEditingRoutine(null);
    setRoutineForm({
      name: '',
      category: examCategory === 'imagem' ? 'imagem' : 'laboratorial',
      description: '',
      exams: prefillWithCurrentExams && selectedExams.length > 0 ? [...selectedExams] : []
    });
    setRoutineExamSearch('');
    setShowCreateRoutineModal(true);
    setShowRoutineContextMenu(null);
    setRoutineContextMenuSearch('');
  };

  const openEditRoutine = (routine: ExamRoutine) => {
    setEditingRoutine(routine);
    setRoutineForm({
      name: routine.name,
      category: routine.category,
      description: routine.description || '',
      exams: [...routine.exams]
    });
    setRoutineExamSearch('');
    setShowCreateRoutineModal(true);
    setShowRoutineContextMenu(null);
    setRoutineContextMenuSearch('');
    setShowExploreRoutinesModal(false);
  };

  const handleAddExamToRoutine = (input: string) => {
    if (!input.trim()) return;
    const items = input
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    setRoutineForm(prev => {
      const nextExams = [...prev.exams];
      items.forEach(item => {
        if (!nextExams.some(e => e.toLowerCase() === item.toLowerCase())) {
          nextExams.push(item);
        }
      });
      return { ...prev, exams: nextExams };
    });
    setRoutineExamSearch('');
    setRoutineExamDropdown(false);
  };

  const handleSaveRoutine = async () => {
    if (!routineForm.name.trim()) {
      dialog.alert("Atenção", "Por favor, informe o nome da rotina.");
      return;
    }
    if (routineForm.exams.length === 0) {
      dialog.alert("Atenção", "Por favor, adicione ao menos um exame a esta rotina.");
      return;
    }

    const routineToSave: ExamRoutine = {
      id: editingRoutine?.id || `routine-${Date.now()}`,
      name: routineForm.name.trim(),
      category: routineForm.category,
      description: routineForm.description.trim(),
      exams: routineForm.exams,
      created_at: editingRoutine?.created_at || new Date().toISOString(),
      user_id: doctor?.id
    };

    // Salva diretamente no Supabase (banco de dados)
    const saved = await saveExamRoutineToSupabase(doctor?.id, routineToSave);
    
    // Atualiza estado de rotinas
    setExamRoutines(prev => {
      const idx = prev.findIndex(r => r.id === routineToSave.id || (saved.id && r.id === saved.id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });

    setShowCreateRoutineModal(false);
    setEditingRoutine(null);
    setFeedbackToast(`Rotina "${saved.name}" salva no banco de dados com sucesso!`);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleDeleteRoutine = async (routineId: string, routineName: string) => {
    const confirmed = await dialog.confirm(
      "Excluir Rotina",
      `Deseja realmente excluir a rotina "${routineName}" do banco de dados?`,
      "danger"
    );
    if (confirmed) {
      await deleteExamRoutineFromSupabase(routineId);
      setExamRoutines(prev => prev.filter(r => r.id !== routineId));
      setFeedbackToast(`Rotina "${routineName}" excluída do banco com sucesso.`);
      setTimeout(() => setFeedbackToast(null), 3500);
    }
  };

  // Exames disponíveis para seleção ao criar/editar rotina (todos os laboratoriais e imagem)
  const allAvailableForRoutine = Array.from(new Set([
    ...(customCatalog.laboratorial || []),
    ...(customCatalog.imagem || []),
    ...UNIQUE_LAB_EXAMS,
    ...UNIQUE_IMAGE_EXAMS
  ])).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const routineFilteredExams = allAvailableForRoutine.filter(exam =>
    exam.toLowerCase().includes(routineExamSearch.toLowerCase().trim()) &&
    !routineForm.exams.some(e => e.toLowerCase() === exam.toLowerCase())
  );

  const filteredExamRoutines = examRoutines.filter(r => {
    const term = routineSearchTerm.toLowerCase().trim();
    if (!term) return true;
    return r.name.toLowerCase().includes(term) ||
      (r.description && r.description.toLowerCase().includes(term)) ||
      r.exams.some(e => e.toLowerCase().includes(term));
  });

  const handleSave = async (shouldPrint: boolean = false) => {
    if (!patientId || !doctor) return;

    let finalSelected = [...selectedExams];
    if (docType === 'exam' && customExams.trim()) {
      const parts = customExams
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      if (parts.length > 0) {
        parts.forEach(part => {
          if (!finalSelected.some(existing => existing.toLowerCase() === part.toLowerCase())) {
            finalSelected.push(part);
          }
        });
        const updated = await saveCustomExamsToSupabase(doctor?.id, parts, examCategory, customCatalog);
        setCustomCatalog(updated);
      }
    }

    if (docType === 'exam' && finalSelected.length === 0) {
      dialog.alert("Atenção", "Por favor, selecione ou digite ao menos um exame para solicitar.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patient_id: patientId,
        doctor_id: doctor.id,
        type: docType,
        content: (docType === 'prescription' || docType === 'special_prescription') 
          ? { items: prescriptionItems } 
          : docType === 'referral' 
            ? { text: referralText }
            : { 
                examCategory, 
                selectedExams: finalSelected, 
                customExams: '' 
              }
      };

      const { data, error } = await api.createDocument(payload);
      if (error) throw error;

      onSaveSuccess();
      
      const createdDoc: MedicalDocument = {
        id: (data as any)?.[0]?.id || Date.now().toString(),
        patient_id: patientId,
        doctor_id: doctor.id,
        type: docType,
        content: payload.content,
        created_at: new Date().toISOString(),
        doctor
      };

      if (shouldPrint && onPrintAfterSave) {
        onPrintAfterSave(createdDoc);
      } else {
        await dialog.alert("Sucesso", "Documento salvo com sucesso.");
      }

      onClose();
    } catch (e: any) {
      console.error(e);
      dialog.alert("Erro", "Falha ao salvar o documento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Novo Documento Médico</h3>
            <p className="text-xs text-slate-500">Gere receitas, encaminhamentos ou solicitações de exames.</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6" onContextMenu={handleContextMenu}>
          
          {/* Main Document Type Selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setDocType('prescription')}
              className={`py-3 px-3 rounded-xl border-2 font-bold transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
                docType === 'prescription'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <FileText size={16} />
              Receita Simples
            </button>
            <button
              type="button"
              onClick={() => setDocType('special_prescription')}
              className={`py-3 px-3 rounded-xl border-2 font-bold transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
                docType === 'special_prescription'
                  ? 'border-purple-800 bg-purple-50 text-purple-900 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert size={16} className="text-purple-700" />
              Receita Especial
            </button>
            <button
              type="button"
              onClick={() => setDocType('referral')}
              className={`py-3 px-3 rounded-xl border-2 font-bold transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
                docType === 'referral'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <FileText size={16} />
              Encaminhamento
            </button>
            <button
              type="button"
              onClick={() => setDocType('exam')}
              className={`py-3 px-3 rounded-xl border-2 font-bold transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
                docType === 'exam'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Activity size={16} />
              Exames
            </button>
          </div>

          {/* PRESCRIPTION FORM (SIMPLES OU ESPECIAL) */}
          {(docType === 'prescription' || docType === 'special_prescription') && (
            <div className="space-y-6">
              {docType === 'special_prescription' && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-900 flex items-center gap-3 shadow-xs">
                  <ShieldAlert size={18} className="text-purple-700 shrink-0" />
                  <div>
                    <span className="font-bold block">Receituário de Controle Especial (Duas Vias):</span>
                    Imprime automaticamente em 2 vias (1ª Via - Farmácia e 2ª Via - Paciente) com layout regulamentar contendo Identificação do Emitente, Comprador e Fornecedor.
                  </div>
                </div>
              )}
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
                  <button 
                    onClick={() => setPrescriptionItems(prev => prev.filter((_, i) => i !== idx))} 
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-6"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}

              <button
                onClick={() => setPrescriptionItems([...prescriptionItems, { medication: '', quantity: '', dosage: '', usageMode: 'Uso Oral' }])}
                className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <PlusCircle size={18}/> Adicionar Item à Receita
              </button>
            </div>
          )}

          {/* REFERRAL FORM */}
          {docType === 'referral' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase">Texto do Encaminhamento</label>
              <textarea
                rows={10}
                value={referralText}
                onChange={e => setReferralText(e.target.value)}
                placeholder="Descreva o motivo do encaminhamento, especialidade médica e observações clínicas..."
                className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-sm text-slate-800 leading-relaxed"
              />
            </div>
          )}

          {/* EXAM FORM */}
          {docType === 'exam' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Category Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setExamCategory('laboratorial');
                    setExamSearch('');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                    examCategory === 'laboratorial'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Exames Laboratoriais
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExamCategory('imagem');
                    setExamSearch('');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                    examCategory === 'imagem'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Exame de Imagem
                </button>
              </div>

              {/* Typeable Dropdown / Searchable Input */}
              <div className="relative" ref={dropdownRef}>
                <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                    <span>Buscar e Selecionar Exame ({examCategory === 'laboratorial' ? 'Laboratório' : 'Imagem'})</span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowExploreRoutinesModal(true)}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/90 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs group cursor-pointer"
                      title="Gerenciar rotinas de exames (ou dê duplo clique com botão direito nesta tela para abrir o tooltip flutuante)"
                    >
                      <BookmarkCheck size={14} className="text-blue-700 group-hover:scale-110 transition-transform" />
                      <span>Gerenciar Rotinas</span>
                      <span className="text-[9px] bg-blue-200/80 text-blue-900 px-1.5 py-0.5 rounded font-normal hidden sm:inline">
                        2x clique direito
                      </span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-normal hidden md:inline">Enter para selecionar</span>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400"
                    placeholder={
                      examCategory === 'laboratorial'
                        ? "Digite para buscar (ex: Hemograma, Glicemia, TSH)..."
                        : "Digite para buscar (ex: Ecocardiograma, USG, Raio-X)..."
                    }
                    value={examSearch}
                    onChange={e => {
                      setExamSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleKeyDownSearch}
                  />
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {/* Dropdown Options */}
                {showDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredExams.length > 0 ? (
                      filteredExams.map((exam, idx) => {
                        const isCustom = isExamCustom(exam);
                        return (
                          <div
                            key={exam}
                            onClick={() => handleAddExam(exam)}
                            className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 text-xs font-semibold text-slate-700 flex justify-between items-center group transition-colors cursor-pointer select-none ${
                              idx === 0 ? 'bg-blue-50/50 text-blue-900' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                              <span className="truncate">{exam}</span>
                              {isCustom && (
                                <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                                  Personalizado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {idx === 0 && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase">
                                  Pressione Enter ↵
                                </span>
                              )}
                              {isCustom && (
                                <button
                                  type="button"
                                  title="Excluir este exame do buscador"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDeleteCustomExam(exam);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors group/del"
                                >
                                  <X size={14} className="stroke-[2.5]" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        {examSearch.trim() ? (
                          <span>Exame não encontrado no banco. Pressione <b>Enter</b> para adicionar "<b>{examSearch}</b>" ao buscador.</span>
                        ) : (
                          <span>Digite o nome do exame para buscar...</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Exams Tags/Chips */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase">
                    Exames Selecionados ({selectedExams.length})
                  </label>
                  {selectedExams.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedExams([])}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remover Todos
                    </button>
                  )}
                </div>

                {selectedExams.length === 0 ? (
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    Nenhum exame selecionado ainda. Utilize o campo acima para buscar ou selecione no banco de dados.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {selectedExams.map((exam, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-semibold shadow-sm animate-fade-in"
                      >
                        <span className="text-blue-200 text-[10px] font-mono">{index + 1}.</span>
                        {exam}
                        <button
                          type="button"
                          onClick={() => handleRemoveExam(exam)}
                          className="p-0.5 hover:bg-blue-800 rounded-full transition-colors text-blue-200 hover:text-white"
                          title="Remover Exame"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* "Outros" Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">
                    Outros (Exames não listados - separe por vírgula)
                  </label>
                  <span className="text-[10px] text-slate-400">Integrado automaticamente ao buscador</span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={customExams}
                    onChange={e => setCustomExams(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddCustomCommas();
                      }
                    }}
                    placeholder="Ex: Vitamina B3, Exame genético específico, Exame de tolerância à lactose..."
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-xs text-slate-800 resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCommas}
                    disabled={!customExams.trim()}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 self-end flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} />
                    Adicionar Exames
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Exames adicionados por este campo passam a constar no buscador oficial, com ícone de exclusão (<span className="text-slate-600 font-bold">X</span>) para retirada futura quando desejado.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-sm font-bold"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors text-sm font-bold"
          >
            {loading ? 'Salvando...' : 'Apenas Salvar'}
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl shadow-lg shadow-blue-900/20 font-bold text-sm flex items-center gap-2 transition-all"
          >
            <Printer size={16} />
            {loading ? 'Salvando...' : 'Salvar e Imprimir'}
          </button>
        </div>

      </div>

      {/* Floating Context Menu (Duplo clique com o botão direito) */}
      {showRoutineContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => {
              setShowRoutineContextMenu(null);
              setRoutineContextMenuSearch('');
            }}
            onContextMenu={(e) => { 
              e.preventDefault(); 
              setShowRoutineContextMenu(null);
              setRoutineContextMenuSearch('');
            }}
          />
          <div 
            className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 w-84 sm:w-96 max-h-[85vh] flex flex-col animate-scale-in text-slate-800 overflow-hidden"
            style={{ top: showRoutineContextMenu.y, left: showRoutineContextMenu.x }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/90">
              <div className="flex items-center gap-2">
                <BookmarkCheck size={16} className="text-blue-900" />
                <span className="font-bold text-xs uppercase tracking-wide text-slate-800">Rotinas de Exames</span>
                {examRoutines.length > 0 && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-semibold">
                    {examRoutines.length}
                  </span>
                )}
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowRoutineContextMenu(null);
                  setRoutineContextMenuSearch('');
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                title="Fechar"
              >
                <X size={14} />
              </button>
            </div>

            {/* Search Bar for Routines */}
            <div className="px-3 pt-2 pb-2 border-b border-slate-100 bg-white">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={routineContextMenuSearch}
                  onChange={e => setRoutineContextMenuSearch(e.target.value)}
                  placeholder="Pesquisar rotina ou exame..."
                  className="w-full pl-8 pr-7 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900 focus:bg-white outline-none transition-all text-xs text-slate-800 placeholder:text-slate-400 shadow-inner"
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {routineContextMenuSearch && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoutineContextMenuSearch('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                    title="Limpar pesquisa"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Action: Create Routine */}
            <div className="p-2 border-b border-slate-100 bg-blue-50/40">
              <button 
                type="button"
                onClick={() => openCreateRoutineModal(selectedExams.length > 0)}
                className="w-full text-left px-3 py-2 text-xs font-bold text-blue-900 hover:bg-blue-100/70 rounded-xl flex items-center justify-between transition-colors shadow-xs"
              >
                <span className="flex items-center gap-2">
                  <Plus size={15} className="text-blue-700" />
                  Criar rotina de exames
                </span>
                {selectedExams.length > 0 && (
                  <span className="text-[10px] bg-blue-200/80 text-blue-900 px-1.5 py-0.5 rounded font-mono font-medium">
                    +{selectedExams.length} da tela
                  </span>
                )}
              </button>
            </div>

            {/* Pre-created Routines List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-64">
              <div className="px-2 pt-1 pb-1 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {routineContextMenuSearch.trim() ? 'Resultados da pesquisa' : 'Rotinas pré-criadas (clique para adicionar)'}
                </p>
                {routineContextMenuSearch.trim() && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {filteredContextMenuRoutines.length} encontrada{filteredContextMenuRoutines.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {examRoutines.length === 0 ? (
                <div className="text-center py-5 px-3 text-xs text-slate-400">
                  Nenhuma rotina pré-criada ainda.<br />
                  <button 
                    type="button"
                    onClick={() => openCreateRoutineModal(false)}
                    className="text-blue-600 hover:underline font-bold mt-1 inline-block"
                  >
                    Criar minha primeira rotina
                  </button>
                </div>
              ) : filteredContextMenuRoutines.length === 0 ? (
                <div className="text-center py-6 px-3 text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">Nenhuma rotina encontrada</p>
                  <p className="text-[11px] text-slate-400">Nenhum resultado para "{routineContextMenuSearch}"</p>
                  <button 
                    type="button"
                    onClick={() => setRoutineContextMenuSearch('')}
                    className="text-blue-600 hover:underline font-bold text-xs mt-1 inline-block"
                  >
                    Limpar pesquisa
                  </button>
                </div>
              ) : (
                filteredContextMenuRoutines.map(routine => (
                  <div 
                    key={routine.id}
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/70 transition-colors cursor-pointer border border-transparent hover:border-blue-100"
                    onClick={() => handleSelectRoutine(routine)}
                    title={`Adicionar ${routine.exams.length} exames desta rotina aos exames solicitados`}
                  >
                    <div className="min-w-0 pr-2 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Bookmark size={13} className="text-blue-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-900">
                          {routine.name}
                        </span>
                        {routine.category && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                            {routine.category === 'laboratorial' ? 'Lab' : routine.category === 'imagem' ? 'Imagem' : 'Geral'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate flex items-center gap-1">
                        <span className="font-semibold text-slate-600">{routine.exams.length} exames</span>
                        <span>•</span>
                        <span className="truncate">{routine.exams.slice(0, 3).join(', ')}{routine.exams.length > 3 ? '...' : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                      <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-lg group-hover:bg-blue-900 group-hover:text-white transition-colors">
                        + Inserir
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer link to explore / manage */}
            {examRoutines.length > 0 && (
              <div className="p-2 border-t border-slate-100 bg-slate-50">
                <button 
                  type="button"
                  onClick={() => {
                    setShowRoutineContextMenu(null);
                    setRoutineContextMenuSearch('');
                    setShowExploreRoutinesModal(true);
                  }}
                  className="w-full text-center text-xs font-bold text-slate-600 hover:text-blue-700 py-1.5 rounded-lg hover:bg-slate-200/60 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Search size={13} /> Gerenciar / Explorar rotinas
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create / Edit Routine Modal */}
      {showCreateRoutineModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-900 rounded-xl">
                  <BookmarkCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {editingRoutine ? 'Editar Rotina de Exames' : 'Criar Nova Rotina de Exames'}
                  </h3>
                  <p className="text-xs text-slate-500">Agrupe exames frequentes para solicitar rapidamente com duplo clique.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setShowCreateRoutineModal(false); setEditingRoutine(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Nome da Rotina <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none"
                  placeholder="Ex: Check-up Cardiológico, Pré-Operatório, Rastreio Renal..."
                  value={routineForm.name}
                  onChange={e => setRoutineForm({ ...routineForm, name: e.target.value })}
                  autoFocus
                />
              </div>

              {/* Category & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    className="w-full p-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none bg-white"
                    value={routineForm.category}
                    onChange={e => setRoutineForm({ ...routineForm, category: e.target.value as any })}
                  >
                    <option value="laboratorial">Laboratorial</option>
                    <option value="imagem">Exames de Imagem</option>
                    <option value="geral">Misto / Geral</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Descrição / Indicação Clínica (Opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none"
                    placeholder="Ex: Exames de rotina para acompanhamento anual"
                    value={routineForm.description}
                    onChange={e => setRoutineForm({ ...routineForm, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Quick import from currently selected exams */}
              {selectedExams.length > 0 && (
                <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl flex items-center justify-between gap-3">
                  <div className="text-xs text-blue-900">
                    <span className="font-bold">Exames na tela:</span> Há {selectedExams.length} exame(s) selecionado(s) atualmente.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const combined = Array.from(new Set([...routineForm.exams, ...selectedExams]));
                      setRoutineForm({ ...routineForm, exams: combined });
                    }}
                    className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Sparkles size={13} />
                    Importar todos ({selectedExams.length})
                  </button>
                </div>
              )}

              {/* Add exams to routine */}
              <div className="relative" ref={routineDropdownRef}>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex justify-between items-center">
                  <span>Adicionar Exames à Rotina</span>
                  <span className="text-[10px] text-slate-400 font-normal">Pressione Enter ou separe por vírgula</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-9 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-xs text-slate-800"
                    placeholder="Digite o nome do exame para adicionar à rotina..."
                    value={routineExamSearch}
                    onChange={e => {
                      setRoutineExamSearch(e.target.value);
                      setRoutineExamDropdown(true);
                    }}
                    onFocus={() => setRoutineExamDropdown(true)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (routineFilteredExams.length > 0 && !routineExamSearch.includes(',')) {
                          handleAddExamToRoutine(routineFilteredExams[0]);
                        } else if (routineExamSearch.trim()) {
                          handleAddExamToRoutine(routineExamSearch.trim());
                        }
                      }
                    }}
                  />
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <button
                    type="button"
                    disabled={!routineExamSearch.trim()}
                    onClick={() => {
                      if (routineExamSearch.trim()) {
                        handleAddExamToRoutine(routineExamSearch.trim());
                      }
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-blue-900 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:bg-slate-300"
                  >
                    Adicionar
                  </button>

                  {/* Dropdown in Routine Modal */}
                  {routineExamDropdown && routineExamSearch.trim().length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {routineFilteredExams.slice(0, 10).map((exam, idx) => (
                        <div
                          key={exam}
                          onClick={() => handleAddExamToRoutine(exam)}
                          className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer flex justify-between items-center text-slate-700 font-medium"
                        >
                          <span>{exam}</span>
                          {idx === 0 && (
                            <span className="text-[10px] text-blue-600 bg-blue-100 px-1 rounded">Enter ↵</span>
                          )}
                        </div>
                      ))}
                      {routineFilteredExams.length === 0 && (
                        <div 
                          onClick={() => handleAddExamToRoutine(routineExamSearch.trim())}
                          className="p-2.5 text-xs text-blue-800 hover:bg-blue-50 cursor-pointer text-center font-medium"
                        >
                          + Adicionar "<b>{routineExamSearch.trim()}</b>" como novo exame
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected exams in routine */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-600 uppercase">
                    Exames Inclusos na Rotina ({routineForm.exams.length})
                  </span>
                  {routineForm.exams.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRoutineForm({ ...routineForm, exams: [] })}
                      className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                    >
                      Remover todos
                    </button>
                  )}
                </div>

                {routineForm.exams.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    Nenhum exame adicionado nesta rotina ainda. Adicione exames pelo campo acima ou importe da tela.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {routineForm.exams.map((ex, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-900 text-white rounded-lg text-xs font-medium shadow-xs"
                      >
                        <span className="text-[10px] text-blue-200 font-mono">{idx + 1}.</span>
                        <span>{ex}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRoutineForm({
                              ...routineForm,
                              exams: routineForm.exams.filter((_, i) => i !== idx)
                            });
                          }}
                          className="p-0.5 hover:bg-blue-800 rounded text-blue-200 hover:text-white"
                          title="Remover este exame da rotina"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => { setShowCreateRoutineModal(false); setEditingRoutine(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRoutine}
                className="px-5 py-2 text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white rounded-xl shadow-md shadow-blue-900/20 transition-all flex items-center gap-1.5"
              >
                <Check size={14} />
                {editingRoutine ? 'Atualizar Rotina' : 'Salvar Rotina'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Explore / Manage Routines Modal */}
      {showExploreRoutinesModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col animate-scale-in overflow-hidden border border-slate-200">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-900 rounded-xl">
                  <BookmarkCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Minhas Rotinas de Exames</h3>
                  <p className="text-xs text-slate-500">Selecione uma rotina para incluir na solicitação ou gerencie suas rotinas.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowExploreRoutinesModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Toolbar: Search and Create */}
            <div className="p-4 border-b border-slate-100 flex gap-2.5 bg-white shrink-0">
              <div className="relative flex-1">
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none"
                  placeholder="Buscar rotinas por nome ou exame..."
                  value={routineSearchTerm}
                  onChange={e => setRoutineSearchTerm(e.target.value)}
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowExploreRoutinesModal(false);
                  openCreateRoutineModal(selectedExams.length > 0);
                }}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition-colors"
              >
                <Plus size={14} />
                Nova Rotina
              </button>
            </div>

            {/* Routine Cards List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {filteredExamRoutines.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhuma rotina encontrada com os critérios pesquisados.
                </div>
              ) : (
                filteredExamRoutines.map(routine => (
                  <div
                    key={routine.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/30 hover:border-blue-200 transition-all group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-800 text-sm">{routine.name}</h4>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {routine.category === 'laboratorial' ? 'Laboratório' : routine.category === 'imagem' ? 'Imagem' : 'Geral'}
                          </span>
                          <span className="text-[11px] font-semibold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                            {routine.exams.length} exames
                          </span>
                        </div>
                        {routine.description && (
                          <p className="text-xs text-slate-500 mt-1 italic">{routine.description}</p>
                        )}

                        {/* Badges preview */}
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {routine.exams.map((ex, i) => (
                            <span
                              key={i}
                              className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectRoutine(routine)}
                          className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <Plus size={13} />
                          Adicionar aos Exames
                        </button>

                        <div className="flex items-center gap-1 mt-1 sm:mt-0">
                          <button
                            type="button"
                            onClick={() => openEditRoutine(routine)}
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar rotina"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir rotina"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowExploreRoutinesModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-[10002] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-slide-up text-xs font-semibold">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}
    </div>
  );
}
