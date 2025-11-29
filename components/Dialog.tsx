import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, X } from 'lucide-react';

type DialogType = 'alert' | 'confirm' | 'danger';

interface DialogOptions {
  title: string;
  description: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  alert: (title: string, description: string) => Promise<void>;
  confirm: (title: string, description: string, type?: DialogType) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<DialogOptions>({ title: '', description: '' });
  
  // Ref to store the resolve function of the promise
  const awaiter = useRef<(value: boolean) => void>(() => {});

  const alert = (title: string, description: string): Promise<void> => {
    return new Promise((resolve) => {
      setConfig({ title, description, type: 'alert', confirmText: 'OK' });
      setIsOpen(true);
      awaiter.current = () => {
        setIsOpen(false);
        resolve();
      };
    });
  };

  const confirm = (title: string, description: string, type: DialogType = 'confirm'): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({ 
        title, 
        description, 
        type, 
        confirmText: type === 'danger' ? 'Sim, Excluir' : 'Confirmar',
        cancelText: 'Cancelar' 
      });
      setIsOpen(true);
      awaiter.current = (choice: boolean) => {
        setIsOpen(false);
        resolve(choice);
      };
    });
  };

  const handleClose = (result: boolean) => {
    if (awaiter.current) {
      awaiter.current(result);
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => config.type !== 'alert' && handleClose(false)}
          />

          {/* Modal */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden transform transition-all scale-100 animate-scale-in">
            <div className={`h-2 w-full ${config.type === 'danger' ? 'bg-red-500' : config.type === 'alert' ? 'bg-blue-500' : 'bg-blue-900'}`} />
            
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full flex-shrink-0 
                  ${config.type === 'danger' ? 'bg-red-100 text-red-600' : 
                    config.type === 'alert' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}
                >
                  {config.type === 'danger' ? <AlertCircle size={24} /> : 
                   config.type === 'alert' ? <CheckCircle size={24} /> : <HelpCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{config.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{config.description}</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                {config.type !== 'alert' && (
                  <button 
                    onClick={() => handleClose(false)}
                    className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors"
                  >
                    {config.cancelText || 'Cancelar'}
                  </button>
                )}
                <button 
                  onClick={() => handleClose(true)}
                  className={`px-6 py-2 rounded-lg text-white font-medium text-sm shadow-lg transition-transform active:scale-95
                    ${config.type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 
                      config.type === 'alert' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' : 'bg-blue-900 hover:bg-blue-800 shadow-blue-900/20'}`}
                >
                  {config.confirmText || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};