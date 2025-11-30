import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, List, AlignLeft, FilePlus, ChevronDown } from 'lucide-react';

interface Template {
  label: string;
  content: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  templates?: Template[];
  colorTheme?: 'indigo' | 'emerald' | 'amber' | 'blue';
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  templates = [],
  colorTheme = 'blue' 
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef(value);
  const [showTemplates, setShowTemplates] = useState(false);

  // Sync external value changes to innerHTML ONLY if they come from outside (DB, Template)
  // This prevents the cursor from jumping to start when the user is typing
  useEffect(() => {
    if (!editorRef.current) return;

    // If the new prop value is different from the last value we emitted...
    if (value !== lastHtmlRef.current) {
      // And strictly different from current HTML content...
      if (editorRef.current.innerHTML !== value) {
         // It means it's an external update (e.g. loaded from DB or Template inserted)
         editorRef.current.innerHTML = value;
         lastHtmlRef.current = value; // Sync ref
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Update our reference tracker BEFORE telling parent, so when parent updates props, 
      // the useEffect above sees they match and skips the DOM update.
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

  const insertTemplate = (content: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const success = document.execCommand('insertHTML', false, content);
      
      if (!success) {
        editorRef.current.innerHTML += content;
      }
      
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
      setShowTemplates(false);
    }
  };

  const themeColors = {
    indigo: 'border-indigo-100 focus-within:border-indigo-300 focus-within:ring-indigo-100',
    emerald: 'border-emerald-100 focus-within:border-emerald-300 focus-within:ring-emerald-100',
    amber: 'border-amber-100 focus-within:border-amber-300 focus-within:ring-amber-100',
    blue: 'border-blue-100 focus-within:border-blue-300 focus-within:ring-blue-100',
  };

  const buttonClass = "p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors";

  return (
    <div className={`border rounded-xl bg-white overflow-hidden transition-all focus-within:ring-4 ${themeColors[colorTheme]}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50">
        <button onClick={() => execCommand('bold')} className={buttonClass} title="Negrito">
          <Bold size={16} />
        </button>
        <button onClick={() => execCommand('italic')} className={buttonClass} title="Itálico">
          <Italic size={16} />
        </button>
        <button onClick={() => execCommand('insertUnorderedList')} className={buttonClass} title="Lista">
          <List size={16} />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        
        {/* Templates Dropdown */}
        {templates.length > 0 && (
          <div className="relative">
            <button 
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1 px-2 py-1.5 rounded bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
            >
              <FilePlus size={14} /> Modelos <ChevronDown size={12} />
            </button>
            
            {showTemplates && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTemplates(false)}></div>
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-100 z-20 py-1 overflow-hidden animate-fade-in-up">
                  {templates.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => insertTemplate(t.content)}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-slate-50 last:border-0"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-6 min-h-[160px] outline-none text-slate-700 text-sm leading-relaxed prose prose-sm max-w-none"
        style={{ whiteSpace: 'pre-wrap' }}
      />
      
      {/* Placeholder logic (CSS based mostly, but handled conditionally here for clarity) */}
      {!value && (
        <div className="absolute top-[52px] left-6 text-slate-300 text-sm pointer-events-none select-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}