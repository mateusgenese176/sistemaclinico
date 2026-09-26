import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Baseline, Highlighter, List, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  FilePlus, ChevronDown, Plus, Search, Eye, Edit2, Trash2, X, Save, Command, Check, RotateCcw 
} from 'lucide-react';
import { api } from '../supabaseClient';
import { useAuth } from '../App';

const TEXT_COLORS = [
  { label: 'Padrão (Escuro)', color: '#0f172a' },
  { label: 'Cinza', color: '#64748b' },
  { label: 'Vermelho Clínico', color: '#dc2626' },
  { label: 'Laranja Alerta', color: '#ea580c' },
  { label: 'Âmbar Atenção', color: '#d97706' },
  { label: 'Verde Normal', color: '#16a34a' },
  { label: 'Azul Destaque', color: '#2563eb' },
  { label: 'Roxo Diagnóstico', color: '#7c3aed' },
  { label: 'Rosa', color: '#db2777' },
  { label: 'Azul Petróleo', color: '#0891b2' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Amarelo Neón', color: '#fef08a' },
  { label: 'Verde Suave', color: '#bbf7d0' },
  { label: 'Azul Céu', color: '#bfdbfe' },
  { label: 'Laranja Suave', color: '#fed7aa' },
  { label: 'Rosa Suave', color: '#fbcfe8' },
  { label: 'Lilás Suave', color: '#e9d5ff' },
  { label: 'Cinza Suave', color: '#e2e8f0' },
  { label: 'Pêssego', color: '#fecdd3' },
];

interface Routine {
  id: string;
  name: string;
  shortcut: string;
  content: string;
  field_id: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldId: string;
  colorTheme?: 'indigo' | 'emerald' | 'amber' | 'blue';
  onTab?: (shift: boolean) => void;
  className?: string;
}

const RichTextEditor = React.forwardRef<any, RichTextEditorProps>(({ 
  value, 
  onChange, 
  placeholder, 
  fieldId,
  colorTheme = 'blue',
  onTab,
  className = ''
}, ref) => {
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef(""); 

  // Expose focus method via ref
  React.useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus();
    }
  }));
  
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [viewingRoutine, setViewingRoutine] = useState<Routine | null>(null);
  
  const [routineForm, setRoutineForm] = useState({ name: '', shortcut: '', content: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const lastContextMenuClick = useRef<{ time: number } | null>(null);

  // Text & Highlight Color State
  const [currentTextColor, setCurrentTextColor] = useState('#0f172a');
  const [currentHighlightColor, setCurrentHighlightColor] = useState('#fef08a');
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const textColorContainerRef = useRef<HTMLDivElement>(null);
  const highlightContainerRef = useRef<HTMLDivElement>(null);
  const savedSelectionRange = useRef<Range | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRange.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRange.current);
      }
    }
  };

  // Close floating color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (textColorContainerRef.current && !textColorContainerRef.current.contains(target)) {
        setShowTextColorPicker(false);
      }
      if (highlightContainerRef.current && !highlightContainerRef.current.contains(target)) {
        setShowHighlightPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const applyTextColor = (color: string) => {
    restoreSelection();
    execCommand('foreColor', color);
    setCurrentTextColor(color);
    setShowTextColorPicker(false);
  };

  const applyHighlightColor = (color: string) => {
    restoreSelection();
    if (color === 'transparent' || !color) {
      document.execCommand('hiliteColor', false, 'transparent');
      document.execCommand('backColor', false, 'transparent');
    } else {
      if (!document.execCommand('hiliteColor', false, color)) {
        document.execCommand('backColor', false, color);
      }
    }
    if (editorRef.current) {
      editorRef.current.focus();
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
    setCurrentHighlightColor(color === 'transparent' ? '#fef08a' : color);
    setShowHighlightPicker(false);
  };

  useEffect(() => {
    fetchRoutines();
  }, [fieldId, user]);

  const fetchRoutines = async () => {
    if (!user) return;
    const { data } = await api.getRoutines(user.id, fieldId);
    setRoutines((data as Routine[]) || []);
  };

  // Sync external value changes to innerHTML ONLY if they come from outside (DB, Template)
  useEffect(() => {
    if (!editorRef.current) return;

    if (value !== lastHtmlRef.current) {
      if (editorRef.current.innerHTML !== value) {
         editorRef.current.innerHTML = value;
         lastHtmlRef.current = value;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html; 
      onChange(html);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
  };

  const insertHTML = (content: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const success = document.execCommand('insertHTML', false, content);
      
      if (!success) {
        editorRef.current.innerHTML += content;
      }
      
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab Navigation
    if (e.key === 'Tab') {
      e.preventDefault();
      if (onTab) onTab(e.shiftKey);
      return;
    }

    // Shortcuts: Ctrl + Key
    if (e.ctrlKey) {
      if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        execCommand('underline');
        return;
      }
      const routine = routines.find(r => r.shortcut.toLowerCase() === e.key.toLowerCase());
      if (routine) {
        e.preventDefault();
        insertHTML(routine.content);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 500; // ms

    if (lastContextMenuClick.current && (now - lastContextMenuClick.current.time < DOUBLE_CLICK_DELAY)) {
      setShowContextMenu({ x: e.clientX, y: e.clientY });
      lastContextMenuClick.current = null;
    } else {
      lastContextMenuClick.current = { time: now };
    }
  };

  const handleSaveRoutine = async () => {
    if (!user || !routineForm.name || !routineForm.shortcut || !routineForm.content || !fieldId) {
      console.error("Missing required fields for routine:", { user: !!user, name: !!routineForm.name, shortcut: !!routineForm.shortcut, content: !!routineForm.content, fieldId: !!fieldId });
      return;
    }
    
    const payload = {
      ...routineForm,
      user_id: user.id,
      field_id: fieldId
    };

    if (editingRoutine) {
      const { error } = await api.updateRoutine(editingRoutine.id, payload);
      if (error) {
        console.error("Error updating routine:", error);
        return;
      }
    } else {
      const { error } = await api.createRoutine(payload);
      if (error) {
        console.error("Error creating routine:", error);
        return;
      }
    }

    setShowCreateModal(false);
    setEditingRoutine(null);
    setRoutineForm({ name: '', shortcut: '', content: '' });
    fetchRoutines();
  };

  const handleDeleteRoutine = async (id: string) => {
    await api.deleteRoutine(id);
    fetchRoutines();
  };

  const openEditRoutine = (r: Routine) => {
    setEditingRoutine(r);
    setRoutineForm({ name: r.name, shortcut: r.shortcut, content: r.content });
    setShowCreateModal(true);
    setShowExploreModal(false);
  };

  const themeColors = {
    indigo: 'border-indigo-100 focus-within:border-indigo-300 focus-within:ring-indigo-100',
    emerald: 'border-emerald-100 focus-within:border-emerald-300 focus-within:ring-emerald-100',
    amber: 'border-amber-100 focus-within:border-amber-300 focus-within:ring-amber-100',
    blue: 'border-blue-100 focus-within:border-blue-300 focus-within:ring-blue-100',
  };

  const buttonClass = "p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors";

  return (
    <div 
      className={`relative border rounded-xl bg-white overflow-hidden transition-all focus-within:ring-4 flex flex-col ${themeColors[colorTheme]} ${className}`}
      onContextMenu={handleContextMenu}
    >
      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowContextMenu(null)}></div>
          <div 
            className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-slate-200 py-1 w-48 animate-scale-in"
            style={{ top: showContextMenu.y, left: showContextMenu.x }}
          >
            <button 
              onClick={() => { setShowCreateModal(true); setShowContextMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            >
              <Plus size={14} /> Criar rotina
            </button>
            <button 
              onClick={() => { setShowExploreModal(true); setShowContextMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            >
              <Search size={14} /> Explorar rotinas
            </button>
          </div>
        </>
      )}

      {/* Create/Edit Routine Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">{editingRoutine ? 'Editar Rotina' : 'Criar Nova Rotina'}</h3>
              <button onClick={() => { setShowCreateModal(false); setEditingRoutine(null); }}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nome da rotina</label>
                <input 
                  className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none"
                  placeholder="Ex: Nega Alergias"
                  value={routineForm.name}
                  onChange={e => setRoutineForm({...routineForm, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tecla de atalho (Ctrl + ...)</label>
                <input 
                  className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none"
                  placeholder="Ex: 1"
                  maxLength={1}
                  value={routineForm.shortcut}
                  onChange={e => setRoutineForm({...routineForm, shortcut: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Texto de rotina</label>
                <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col max-h-[300px]">
                  <RichTextEditor 
                    value={routineForm.content}
                    onChange={v => setRoutineForm({...routineForm, content: v})}
                    fieldId="routine_editor"
                    colorTheme="blue"
                    className="border-none rounded-none overflow-hidden"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => { setShowCreateModal(false); setEditingRoutine(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSaveRoutine} className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shadow-lg shadow-blue-900/20 font-medium flex items-center gap-2">
                <Save size={18} /> Salvar Rotina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explore Routines Modal */}
      {showExploreModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Explorar Rotinas ({fieldId.toUpperCase()})</h3>
              <button onClick={() => setShowExploreModal(false)}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                  placeholder="Pesquisar rotinas..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {routines.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group group/item">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => { insertHTML(r.content); setShowExploreModal(false); }}
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold text-xs group-hover/item:bg-blue-100 group-hover/item:text-blue-700 transition-colors">
                      {r.shortcut.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 group-hover/item:text-blue-900">{r.name}</p>
                      <p className="text-[10px] text-slate-400">Atalho: Ctrl + {r.shortcut.toUpperCase()} • Clique para inserir</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setViewingRoutine(r)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Visualizar"><Eye size={16}/></button>
                    <button onClick={() => openEditRoutine(r)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Editar"><Edit2 size={16}/></button>
                    <button onClick={() => handleDeleteRoutine(r.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
              {routines.length === 0 && <p className="text-center text-slate-400 py-8 italic">Nenhuma rotina cadastrada para este campo.</p>}
            </div>
          </div>
        </div>
      )}

      {/* View Routine Modal */}
      {viewingRoutine && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Visualizar Rotina: {viewingRoutine.name}</h3>
              <button onClick={() => setViewingRoutine(null)}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
            </div>
            <div className="p-8">
              <div 
                className="prose prose-sm max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: viewingRoutine.content }}
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => { insertHTML(viewingRoutine.content); setViewingRoutine(null); setShowExploreModal(false); }} className="px-6 py-2 bg-blue-900 text-white rounded-lg font-bold flex items-center gap-2">
                <Command size={16} /> Usar Rotina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50 shrink-0 sticky top-0 z-20 shadow-sm flex-wrap">
        <button onClick={() => execCommand('bold')} className={buttonClass} title="Negrito (Ctrl+B)">
          <Bold size={16} />
        </button>
        <button onClick={() => execCommand('italic')} className={buttonClass} title="Itálico (Ctrl+I)">
          <Italic size={16} />
        </button>
        <button onClick={() => execCommand('underline')} className={buttonClass} title="Sublinhado (Ctrl+U)">
          <Underline size={16} />
        </button>
        
        <div className="w-px h-4 bg-slate-300 mx-1"></div>

        {/* Sessão de Cores (Antes do Alinhamento de Parágrafo) */}
        {/* 1. Cor do Texto com Color Picker Flutuante */}
        <div ref={textColorContainerRef} className="relative">
          <button
            type="button"
            onMouseDown={() => saveSelection()}
            onClick={() => {
              setShowTextColorPicker(!showTextColorPicker);
              setShowHighlightPicker(false);
            }}
            className={`${buttonClass} ${showTextColorPicker ? 'bg-slate-200 text-slate-800' : ''} flex flex-col items-center justify-center`}
            title="Cor do Texto"
          >
            <Baseline size={16} />
            <span
              className="w-3.5 h-0.5 rounded-full mt-0.5 shadow-2xs"
              style={{ backgroundColor: currentTextColor }}
            />
          </button>

          {showTextColorPicker && (
            <div className="absolute top-full left-0 mt-1.5 z-40 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-56 animate-scale-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Cor do Texto
                </span>
                <button
                  type="button"
                  onMouseDown={() => saveSelection()}
                  onClick={() => applyTextColor('#0f172a')}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-1"
                  title="Restaurar cor padrão"
                >
                  <RotateCcw size={10} /> Padrão
                </button>
              </div>

              {/* Grid de Cores Rápidas */}
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                {TEXT_COLORS.map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onMouseDown={() => saveSelection()}
                    onClick={() => applyTextColor(item.color)}
                    className="w-7 h-7 rounded-lg border border-slate-200 hover:scale-110 transition-transform flex items-center justify-center shadow-2xs cursor-pointer"
                    style={{ backgroundColor: item.color }}
                    title={item.label}
                  >
                    {currentTextColor.toLowerCase() === item.color.toLowerCase() && (
                      <Check
                        size={12}
                        className={
                          item.color === '#0f172a' || item.color === '#dc2626' || item.color === '#2563eb' || item.color === '#7c3aed' || item.color === '#0891b2'
                            ? 'text-white'
                            : 'text-slate-900'
                        }
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Color Picker Personalizado Flutuante */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-600">Personalizada:</span>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="w-6 h-6 rounded-lg border border-slate-300 shadow-2xs overflow-hidden relative">
                    <input
                      type="color"
                      value={currentTextColor}
                      onMouseDown={() => saveSelection()}
                      onChange={(e) => applyTextColor(e.target.value)}
                      className="absolute -top-3 -left-3 w-12 h-12 cursor-pointer opacity-0"
                    />
                    <div className="w-full h-full" style={{ backgroundColor: currentTextColor }} />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-slate-500 uppercase group-hover:text-blue-900 transition-colors">
                    {currentTextColor}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 2. Marca-texto com Color Picker Flutuante */}
        <div ref={highlightContainerRef} className="relative">
          <button
            type="button"
            onMouseDown={() => saveSelection()}
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowTextColorPicker(false);
            }}
            className={`${buttonClass} ${showHighlightPicker ? 'bg-slate-200 text-slate-800' : ''} flex flex-col items-center justify-center`}
            title="Cor do Marca-texto"
          >
            <Highlighter size={16} />
            <span
              className="w-3.5 h-0.5 rounded-full mt-0.5 shadow-2xs"
              style={{ backgroundColor: currentHighlightColor }}
            />
          </button>

          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1.5 z-40 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-56 animate-scale-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Marca-texto
                </span>
                <button
                  type="button"
                  onMouseDown={() => saveSelection()}
                  onClick={() => applyHighlightColor('transparent')}
                  className="text-[10px] text-red-600 hover:text-red-800 font-semibold hover:underline flex items-center gap-1"
                  title="Remover cor de destaque"
                >
                  <X size={10} /> Sem destaque
                </button>
              </div>

              {/* Grid de Cores de Marca-texto */}
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {HIGHLIGHT_COLORS.map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onMouseDown={() => saveSelection()}
                    onClick={() => applyHighlightColor(item.color)}
                    className="w-8 h-7 rounded-lg border border-slate-200 hover:scale-110 transition-transform flex items-center justify-center shadow-2xs cursor-pointer"
                    style={{ backgroundColor: item.color }}
                    title={item.label}
                  >
                    {currentHighlightColor.toLowerCase() === item.color.toLowerCase() && (
                      <Check size={12} className="text-slate-800" />
                    )}
                  </button>
                ))}
              </div>

              {/* Color Picker Personalizado Flutuante para Marca-texto */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-600">Personalizada:</span>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="w-6 h-6 rounded-lg border border-slate-300 shadow-2xs overflow-hidden relative">
                    <input
                      type="color"
                      value={currentHighlightColor}
                      onMouseDown={() => saveSelection()}
                      onChange={(e) => applyHighlightColor(e.target.value)}
                      className="absolute -top-3 -left-3 w-12 h-12 cursor-pointer opacity-0"
                    />
                    <div className="w-full h-full" style={{ backgroundColor: currentHighlightColor }} />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-slate-500 uppercase group-hover:text-blue-900 transition-colors">
                    {currentHighlightColor}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        
        <button onClick={() => execCommand('justifyLeft')} className={buttonClass} title="Alinhar à Esquerda">
          <AlignLeft size={16} />
        </button>
        <button onClick={() => execCommand('justifyCenter')} className={buttonClass} title="Centralizar">
          <AlignCenter size={16} />
        </button>
        <button onClick={() => execCommand('justifyRight')} className={buttonClass} title="Alinhar à Direita">
          <AlignRight size={16} />
        </button>
        <button onClick={() => execCommand('justifyFull')} className={buttonClass} title="Justificar">
          <AlignJustify size={16} />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1"></div>

        <button onClick={() => execCommand('insertUnorderedList')} className={buttonClass} title="Lista">
          <List size={16} />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`p-6 outline-none text-slate-700 text-sm leading-relaxed prose prose-sm max-w-none flex-1 min-h-0 overflow-y-auto ${fieldId === 'routine_editor' ? 'min-h-[180px] max-h-[260px]' : 'min-h-[160px] max-h-[380px]'}`}
        style={{ whiteSpace: 'pre-wrap' }}
      />
      
      {/* Placeholder logic */}
      {!value && (
        <div className="absolute top-[52px] left-6 text-slate-300 text-sm pointer-events-none select-none">
          {placeholder}
        </div>
      )}
    </div>
  );
});

export default RichTextEditor;