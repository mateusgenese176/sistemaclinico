import React, { useState, useEffect, useRef } from 'react';
import { MedicalDocument, PrescriptionItem, User } from '../types';
import { api } from '../supabaseClient';
import { UNIQUE_LAB_EXAMS, UNIQUE_IMAGE_EXAMS } from '../data/examsData';
import { X, Plus, PlusCircle, Trash2, ChevronDown, Search, Check, Printer, FileText, Activity } from 'lucide-react';
import { useDialog } from './Dialog';

interface QuickDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  doctor: User;
  initialType?: 'prescription' | 'referral' | 'exam';
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
  const [docType, setDocType] = useState<'prescription' | 'referral' | 'exam'>(initialType);
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize or Reset
  useEffect(() => {
    if (initialDoc) {
      setDocType(initialDoc.type);
      if (initialDoc.type === 'prescription') {
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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filter exams based on search query
  const availableExams = examCategory === 'laboratorial' ? UNIQUE_LAB_EXAMS : UNIQUE_IMAGE_EXAMS;
  const filteredExams = availableExams.filter(exam =>
    exam.toLowerCase().includes(examSearch.toLowerCase().trim()) &&
    !selectedExams.includes(exam)
  );

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

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredExams.length > 0) {
        // Select top matching option
        handleAddExam(filteredExams[0]);
      } else if (examSearch.trim().length > 0) {
        // Add custom exam
        if (!selectedExams.includes(examSearch.trim())) {
          setSelectedExams(prev => [...prev, examSearch.trim()]);
        }
        setExamSearch('');
        setShowDropdown(false);
      }
    }
  };

  // Add custom exams split by comma
  const handleAddCustomCommas = () => {
    if (!customExams.trim()) return;
    const parts = customExams
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    const newExams = [...selectedExams];
    parts.forEach(part => {
      if (!newExams.includes(part)) {
        newExams.push(part);
      }
    });
    setSelectedExams(newExams);
    setCustomExams('');
  };

  const handleSave = async (shouldPrint: boolean = false) => {
    if (!patientId || !doctor) return;

    if (docType === 'exam' && selectedExams.length === 0 && !customExams.trim()) {
      dialog.alert("Atenção", "Por favor, selecione ou digite ao menos um exame para solicitar.");
      return;
    }

    setLoading(true);
    try {
      let finalCustom = customExams.trim();
      
      const payload = {
        patient_id: patientId,
        doctor_id: doctor.id,
        type: docType,
        content: docType === 'prescription' 
          ? { items: prescriptionItems } 
          : docType === 'referral' 
            ? { text: referralText }
            : { 
                examCategory, 
                selectedExams, 
                customExams: finalCustom 
              }
      };

      const { data, error } = await api.createDocument(payload);
      if (error) throw error;

      onSaveSuccess();
      
      const createdDoc: MedicalDocument = {
        id: data && data[0] ? data[0].id : Date.now().toString(),
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
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* Main Document Type Selector */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setDocType('prescription')}
              className={`py-3 px-4 rounded-xl border-2 font-bold transition-all text-sm flex items-center justify-center gap-2 ${
                docType === 'prescription'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <FileText size={18} />
              Receituário
            </button>
            <button
              type="button"
              onClick={() => setDocType('referral')}
              className={`py-3 px-4 rounded-xl border-2 font-bold transition-all text-sm flex items-center justify-center gap-2 ${
                docType === 'referral'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <FileText size={18} />
              Encaminhamento
            </button>
            <button
              type="button"
              onClick={() => setDocType('exam')}
              className={`py-3 px-4 rounded-xl border-2 font-bold transition-all text-sm flex items-center justify-center gap-2 ${
                docType === 'exam'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Activity size={18} />
              Exames
            </button>
          </div>

          {/* PRESCRIPTION FORM */}
          {docType === 'prescription' && (
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
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex justify-between items-center">
                  <span>Buscar e Selecionar Exame ({examCategory === 'laboratorial' ? 'Laboratório' : 'Imagem'})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Pressione Enter para selecionar a 1ª opção</span>
                </label>
                
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
                      filteredExams.map((exam, idx) => (
                        <button
                          key={exam}
                          type="button"
                          onClick={() => handleAddExam(exam)}
                          className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 text-xs font-semibold text-slate-700 flex justify-between items-center group transition-colors ${
                            idx === 0 ? 'bg-blue-50/50 text-blue-900' : ''
                          }`}
                        >
                          <span>{exam}</span>
                          {idx === 0 && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase">
                              Pressione Enter ↵
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        {examSearch.trim() ? (
                          <span>Exame não encontrado no banco. Pressione <b>Enter</b> para adicionar "<b>{examSearch}</b>".</span>
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
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Outros (Exames não listados - separe por vírgula)
                </label>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={customExams}
                    onChange={e => setCustomExams(e.target.value)}
                    placeholder="Ex: Vitamina B3, Exame genético específico, Exame de tolerância à lactose..."
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-xs text-slate-800 resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCommas}
                    disabled={!customExams.trim()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors disabled:opacity-50 self-end"
                  >
                    Adicionar como Tags
                  </button>
                </div>
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
    </div>
  );
}
