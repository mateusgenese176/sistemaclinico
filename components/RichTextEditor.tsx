import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, List, AlignLeft, AlignCenter, AlignRight, AlignJustify, FilePlus, ChevronDown, Plus, Search, Eye, Edit2, Trash2, X, Save, Command } from 'lucide-react';
import { api } from '../supabaseClient';
import { useAuth } from '../App';

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
}

const RichTextEditor = React.forwardRef<any, RichTextEditorProps>(({ 
  value, 
  onChange, 
  placeholder, 
  fieldId,
  colorTheme = 'blue',
  onTab
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
      const routine = routines.find(r => r.shortcut.toLowerCase() === e.key.toLowerCase());
      if (routine) {
        e.preventDefault();
        insertHTML(routine.content);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleSaveRoutine = async () => {
    if (!user || !routineForm.name || !routineForm.shortcut || !routineForm.content) return;
    
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
      className={`relative border rounded-xl bg-white overflow-hidden transition-all focus-within:ring-4 ${themeColors[colorTheme]}`}
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
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <RichTextEditor 
                    value={routineForm.content}
                    onChange={v => setRoutineForm({...routineForm, content: v})}
                    fieldId="routine_editor"
                    colorTheme="blue"
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
                <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold text-xs">
                      {r.shortcut.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{r.name}</p>
                      <p className="text-[10px] text-slate-400">Atalho: Ctrl + {r.shortcut.toUpperCase()}</p>
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
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50 flex-wrap">
        <button onClick={() => execCommand('bold')} className={buttonClass} title="Negrito">
          <Bold size={16} />
        </button>
        <button onClick={() => execCommand('italic')} className={buttonClass} title="Itálico">
          <Italic size={16} />
        </button>
        
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
        className="p-6 min-h-[160px] outline-none text-slate-700 text-sm leading-relaxed prose prose-sm max-w-none"
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