
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../supabaseClient';
import { Patient, Anamnesis, UserRole, MedicalDocument, PrescriptionItem } from '../types';
import { useAuth } from '../App';
import { Printer, Activity, Tag, Camera, ArrowLeft, FileText, PlusCircle, Pencil, Trash2, Loader, Eye, X, Upload, Check, FilePlus, ScrollText, MapPin, ChevronDown } from 'lucide-react';
import { useDialog } from '../components/Dialog';
import RichTextEditor from '../components/RichTextEditor';

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const dialog = useDialog();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Anamnesis[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'anamnesis' | 'documents'>('details');
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  
  // View Modal State
  const [viewAnamnesis, setViewAnamnesis] = useState<Anamnesis | null>(null);

  // Document Modal State
  const [showDocModal, setShowDocModal] = useState(false);
  const [docType, setDocType] = useState<'prescription' | 'referral'>('prescription');
  
  // Prescription State
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([{ medication: '', quantity: '', dosage: '', usageMode: 'Uso Oral' }]);
  
  // Referral State
  const [referralText, setReferralText] = useState('');

  // Webcam State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [newTags, setNewTags] = useState('');
  const [anthropo, setAnthropo] = useState({ weight: '', height: '', bp_s: '', bp_d: '' });

  const LOGO_URL = "https://i.ibb.co/n8rLsXSJ/upscalemedia-transformed-1.png";
  const HEADER_LOGO_URL = "https://i.ibb.co/sJR9zQKt/upscalemedia-transformed-1.png";

  const USAGE_MODES = [
    'Uso Oral',
    'Uso Tópico',
    'Uso Endovenoso',
    'Uso Intramuscular',
    'Uso Subcutâneo',
    'Uso Intranasal',
    'Uso Oftálmico',
    'Uso Otológico',
    'Uso Retal',
    'Uso Vaginal',
    'Uso Inalatório',
    'Uso Contínuo',
    'Outro'
  ];

  const fetchHistory = async () => {
    if (id && user?.role === UserRole.DOCTOR) {
      const { data } = await api.getAnamneses(id);
      setHistory((data as any) || []);
      
      const { data: docs } = await api.getDocuments(id);
      setDocuments((docs as any) || []);
    }
  };

  useEffect(() => {
    if (id) {
      api.getPatient(id).then(({ data }) => setPatient(data as any));
      fetchHistory();
    }
  }, [id, user]);

  // Camera Cleanup on Unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleUpdateBio = async () => {
    if (!id || !patient) return;
    
    const currentTags = patient.tags || [];
    const addedTags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    const updatedTags = [...new Set([...currentTags, ...addedTags])];

    const updatedAnthropo = {
      ...patient.anthropometrics,
      weight: Number(anthropo.weight) || patient.anthropometrics?.weight,
      height: Number(anthropo.height) || patient.anthropometrics?.height,
      bp_systolic: Number(anthropo.bp_s) || patient.anthropometrics?.bp_systolic,
      bp_diastolic: Number(anthropo.bp_d) || patient.anthropometrics?.bp_diastolic,
      bmi: (Number(anthropo.weight) && Number(anthropo.height)) 
        ? Number((Number(anthropo.weight) / ((Number(anthropo.height)/100) ** 2)).toFixed(2))
        : patient.anthropometrics?.bmi
    };

    await api.updatePatient(id, {
      tags: updatedTags,
      anthropometrics: updatedAnthropo
    });
    
    const { data } = await api.getPatient(id);
    if(data) setPatient(data as any);
    setNewTags('');
    setAnthropo({ weight: '', height: '', bp_s: '', bp_d: '' });
    await dialog.alert("Sucesso", "Os dados antropométricos e tags foram atualizados com sucesso!");
  };

  const updatePhoto = async (base64: string) => {
     if(id) {
        await api.updatePatient(id, { photo_url: base64 });
        setPatient(prev => prev ? ({ ...prev, photo_url: base64 }) : null);
     }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && id) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await updatePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (e) {
      dialog.alert("Erro", "Não foi possível acessar a câmera.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg');
        updatePhoto(base64);
        stopCamera();
      }
    }
  };

  const handleDeleteAnamnesis = async (anamnesisId: string) => {
    const confirmed = await dialog.confirm("Excluir Rascunho", "Deseja excluir este rascunho permanentemente?", "danger");
    if (!confirmed) return;
    
    setLoadingDelete(anamnesisId);
    try {
      await api.deleteAnamnesis(anamnesisId);
      setHistory(prev => prev.filter(h => h.id !== anamnesisId));
    } catch (e) {
      dialog.alert("Erro", "Não foi possível excluir o rascunho.");
    } finally {
      setLoadingDelete(null);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const confirmed = await dialog.confirm("Excluir Documento", "Deseja excluir este documento permanentemente?", "danger");
    if (!confirmed) return;
    
    setLoadingDelete(docId);
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      dialog.alert("Erro", "Não foi possível excluir.");
    } finally {
      setLoadingDelete(null);
    }
  };

  const handleEditAnamnesis = (anamnesisId: string) => {
    navigate(`/anamnesis/session/${id}?editId=${anamnesisId}`);
  };

  // Helper for date formatting without timezone shift
  const formatSafeDate = (dateStr: string) => {
    if(!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  const handlePrint = (anamnesis: Anamnesis) => {
    if (!patient) return;
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      dialog.alert("Bloqueio de Popup", "Por favor, permita popups para imprimir o documento.");
      return;
    }

    const docDate = new Date(anamnesis.created_at).toLocaleDateString();
    const docTime = new Date(anamnesis.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const patientDob = formatSafeDate(patient.dob);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Prontuário - ${patient.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4; margin: 1.5cm; }
          .break-inside-avoid { page-break-inside: avoid; }
        </style>
      </head>
      <body class="bg-white text-slate-900 p-8 max-w-4xl mx-auto">
        <div class="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
          <div>
              <div class="flex items-center gap-3 mb-2">
                 <img src="${LOGO_URL}" alt="Genesis" class="h-12 w-auto object-contain" />
                 <h1 class="text-3xl font-bold tracking-tight text-slate-900">GENESIS MEDICAL</h1>
              </div>
              <p class="text-xs text-slate-500 uppercase tracking-widest pl-1">Relatório de Atendimento Clínico</p>
          </div>
          <div class="text-right">
              <p class="text-sm font-medium text-slate-600">Data: <span class="font-bold text-slate-900">${docDate}</span></p>
              <p class="text-sm font-medium text-slate-600">Hora: <span class="font-bold text-slate-900">${docTime}</span></p>
          </div>
        </div>
        <div class="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-2 gap-y-4 gap-x-8 text-sm break-inside-avoid shadow-sm">
          <div>
            <span class="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Paciente</span>
            <span class="text-lg font-bold text-slate-900 block">${patient.name}</span>
          </div>
          <div>
            <span class="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">CPF</span>
            <span class="text-base text-slate-800 font-mono">${patient.cpf || 'Não informado'}</span>
          </div>
          <div>
            <span class="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Data de Nascimento</span>
            <span class="text-base text-slate-800">${patientDob}</span>
          </div>
          <div>
            <span class="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Médico Responsável</span>
            <span class="text-base text-slate-800 font-medium">Dr. ${anamnesis.doctor?.name}</span>
          </div>
        </div>
        <div class="space-y-8">
          <div class="break-inside-avoid">
             <div class="flex items-center gap-2 border-b border-indigo-200 pb-2 mb-3">
               <span class="bg-indigo-900 text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold">S</span> 
               <h3 class="text-base font-bold text-indigo-900 uppercase">Subjetivo</h3>
             </div>
             <div class="text-sm leading-relaxed text-justify text-slate-700 pl-2">
               ${anamnesis.soap.s}
             </div>
          </div>
          <div class="break-inside-avoid">
             <div class="flex items-center gap-2 border-b border-emerald-200 pb-2 mb-3">
               <span class="bg-emerald-900 text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold">O</span> 
               <h3 class="text-base font-bold text-emerald-900 uppercase">Objetivo</h3>
             </div>
             <div class="text-sm leading-relaxed text-justify text-slate-700 pl-2">
               ${anamnesis.soap.o}
             </div>
          </div>
          <div class="break-inside-avoid">
             <div class="flex items-center gap-2 border-b border-amber-200 pb-2 mb-3">
               <span class="bg-amber-900 text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold">A</span> 
               <h3 class="text-base font-bold text-amber-900 uppercase">Avaliação</h3>
             </div>
             <div class="text-sm leading-relaxed text-justify text-slate-700 pl-2">
               ${anamnesis.soap.a}
             </div>
          </div>
          <div class="break-inside-avoid">
             <div class="flex items-center gap-2 border-b border-blue-200 pb-2 mb-3">
               <span class="bg-blue-900 text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold">P</span> 
               <h3 class="text-base font-bold text-blue-900 uppercase">Plano</h3>
             </div>
             <div class="text-sm leading-relaxed text-justify text-slate-700 pl-2">
               ${anamnesis.soap.p}
             </div>
          </div>
        </div>
        <div class="mt-24 pt-8 text-center break-inside-avoid">
            <div class="inline-block px-12 border-t border-slate-400 min-w-[300px]">
              <p class="font-bold text-slate-900 mt-2 text-lg">Dr. ${anamnesis.doctor?.name}</p>
              <p class="text-sm text-slate-600">CRM: ${anamnesis.doctor?.crm || '___________'}</p>
            </div>
            <p class="text-[10px] text-slate-400 mt-8 italic">Documento gerado eletronicamente pelo sistema Genesis Medical em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}.</p>
        </div>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 500); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' anos';
  }

  const handlePrintDocument = (doc: MedicalDocument, preview = false) => {
    if (!patient || !user) return;
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const docDate = new Date(doc.created_at).toLocaleDateString();
    
    // Construct Prescription HTML
    let contentHtml = '';
    
    if (doc.type === 'prescription' && doc.content.items) {
      // Group by Usage Mode
      const groupedItems: Record<string, PrescriptionItem[]> = {};
      
      doc.content.items.forEach(item => {
        const mode = item.usageMode || 'Uso Geral';
        if (!groupedItems[mode]) {
          groupedItems[mode] = [];
        }
        groupedItems[mode].push(item);
      });

      // Generate HTML for groups
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
       // Rich Text is already HTML
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
           @page { 
             size: A4; 
             margin: 0;
           }
           body { 
             margin: 0; 
             padding: 0; 
             font-family: 'Inter', sans-serif; 
             -webkit-print-color-adjust: exact; 
             background: white; 
           }
           
           /* Fixed Elements (Repeat on every page) */
           .watermark {
             position: fixed;
             top: 50%; left: 50%;
             transform: translate(-50%, -50%);
             width: 60%;
             opacity: 0.10; 
             z-index: 0;
             pointer-events: none;
           }
           .header-fixed {
             position: fixed;
             top: 0; left: 0; right: 0;
             height: 3.5cm;
             background: white;
             z-index: 10;
             padding: 1cm 2cm 0 2cm;
             display: flex;
             align-items: center;
             gap: 1.5rem;
           }
           .footer-fixed {
             position: fixed;
             bottom: 0; left: 0; right: 0;
             height: 2.5cm;
             background: white;
             z-index: 10;
             text-align: center;
             font-size: 10px;
             color: #1e3a8a; /* Blue-900 */
             font-weight: bold;
             padding: 0.5cm 2cm 1cm 2cm;
             display: flex;
             flex-direction: column;
             justify-content: flex-end;
           }

           /* Content Flow */
           .content-wrap {
             /* Reserve space for Header and Footer to prevent overlap */
             padding-top: 4cm; 
             padding-bottom: 3.5cm; /* Ensure content doesn't hit the footer */
             padding-left: 2cm;
             padding-right: 2cm;
             position: relative;
             z-index: 5;
           }
           
           .signature-box {
              margin-top: 2cm; /* Ensure separation from text */
              display: flex;
              justify-content: center;
              page-break-inside: avoid; /* Don't split signature */
           }

           /* Typography Tweaks */
           h3 { margin-top: 0; }
           .prose p { margin-bottom: 0.5em; }
        </style>
      </head>
      <body>
        <!-- Repeated Watermark -->
        <img src="${HEADER_LOGO_URL}" class="watermark" />
        
        <!-- Repeated Header -->
        <div class="header-fixed">
           <img src="${HEADER_LOGO_URL}" class="h-20 w-auto object-contain" />
           <div>
              <h1 class="text-2xl font-bold text-slate-900 uppercase tracking-widest">${doc.type === 'prescription' ? 'Receituário' : 'Encaminhamento'}</h1>
              <p class="text-sm text-slate-600">Paciente: <b class="text-slate-900 uppercase">${patient.name}</b></p>
              <p class="text-sm text-slate-600">Idade: ${calculateAge(patient.dob)} • Data: ${docDate}</p>
           </div>
        </div>

        <!-- Repeated Footer -->
        <div class="footer-fixed">
           <p>Av. José Veríssimo, 752 - Maurício de Nassau</p>
           <p>Fones: (81) 3727-7250 | 9 9642-0590 (Recepção) | 9 9102-5771 (Autorização) | 9 7328-0845 (Financeiro)</p>
           <p>CEP 55.014-250 - Caruaru - PE</p>
        </div>

        <!-- Flowing Content -->
        <div class="content-wrap">
           ${contentHtml}

           <!-- Signature Block (Flows with text, avoids break, always at end of content) -->
           <div class="signature-box">
              <div class="text-center border-t border-slate-800 pt-2 px-12 min-w-[300px]">
                 <p class="font-bold text-slate-900">Dr. ${user.name}</p>
                 <p class="text-sm text-slate-600">CRM: ${user.crm || ''}</p>
              </div>
           </div>
        </div>
        
        <script>
           ${!preview ? 'window.onload = () => window.print();' : ''}
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSaveDocument = async () => {
    if (!patient || !user) return;
    
    try {
      const payload = {
         patient_id: patient.id,
         doctor_id: user.id,
         type: docType,
         content: docType === 'prescription' ? { items: prescriptionItems } : { text: referralText }
      };
      
      const { data, error } = await api.createDocument(payload);
      if (error) throw error;
      
      await dialog.alert("Sucesso", "Documento salvo com sucesso.");
      setShowDocModal(false);
      fetchHistory();
    } catch (e) {
      dialog.alert("Erro", "Falha ao salvar documento.");
    }
  };

  if (!patient) return <div>Carregando...</div>;

  const historyList = history || [];

  return (
    <>
      {/* --- DOCUMENT MODAL --- */}
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
                                                newItems[idx].usageMode = ''; // Clear so input shows
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
                                {/* If Custom/Empty, show input */}
                                {(!item.usageMode || !USAGE_MODES.includes(item.usageMode)) && (
                                    <input 
                                        placeholder="Digite a via (ex: Uso Inalatório)" 
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
                                    placeholder="Nome da Medicação (ex: Dipirona 500mg)" 
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

      {/* --- VIEW MODAL (Eye Icon) --- */}
      {viewAnamnesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col animate-fade-in-up">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                 <div>
                    <h3 className="font-bold text-slate-800">Visualizar Anamnese</h3>
                    <p className="text-xs text-slate-500">{new Date(viewAnamnesis.created_at).toLocaleDateString()} - Dr. {viewAnamnesis.doctor?.name}</p>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => handlePrint(viewAnamnesis)} className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-blue-900 transition-colors" title="Imprimir em Nova Janela">
                       <Printer size={20} />
                    </button>
                    <button onClick={() => setViewAnamnesis(null)} className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-red-600 transition-colors">
                       <X size={20} />
                    </button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                 {/* SOAP Content View */}
                 <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm uppercase"><span className="bg-blue-100 p-1 rounded">S</span> Subjetivo</h4>
                       <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: viewAnamnesis.soap.s }}></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2 text-sm uppercase"><span className="bg-emerald-100 p-1 rounded">O</span> Objetivo</h4>
                       <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: viewAnamnesis.soap.o }}></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2 text-sm uppercase"><span className="bg-amber-100 p-1 rounded">A</span> Avaliação</h4>
                       <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: viewAnamnesis.soap.a }}></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2 text-sm uppercase"><span className="bg-purple-100 p-1 rounded">P</span> Plano</h4>
                       <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: viewAnamnesis.soap.p }}></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-between items-center no-print">
          <button onClick={() => navigate('/patients')} className="text-slate-500 hover:text-blue-900 flex items-center gap-2 transition-colors">
              <ArrowLeft size={20} /> Voltar
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Profile Card */}
          <div className="w-full md:w-1/3 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center relative group">
                  
                  {isCameraOpen ? (
                     <div className="relative w-full h-48 bg-black rounded-xl overflow-hidden shadow-lg mb-4">
                        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" onLoadedMetadata={() => videoRef.current?.play()} />
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-4">
                           <button type="button" onClick={stopCamera} className="bg-red-500 p-2 rounded-full text-white"><X size={16}/></button>
                           <button type="button" onClick={capturePhoto} className="bg-green-500 p-2 rounded-full text-white"><Check size={16}/></button>
                        </div>
                     </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto rounded-full bg-slate-100 border-4 border-slate-50 shadow-md overflow-hidden mb-4 relative">
                        {patient.photo_url ? (
                        <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover" />
                        ) : (
                        <div className="flex items-center justify-center w-full h-full text-slate-300 text-4xl font-bold">{patient.name.charAt(0)}</div>
                        )}
                        
                        {/* Hover Upload */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium flex-col gap-2">
                           <button onClick={startCamera} className="hover:text-blue-200 flex flex-col items-center">
                              <Camera size={20} className="mb-1" /> Camera
                           </button>
                           <label className="hover:text-blue-200 flex flex-col items-center cursor-pointer">
                              <Upload size={20} className="mb-1" /> Upload
                              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                           </label>
                        </div>
                    </div>
                  )}
                  
                  <h2 className="text-2xl font-bold text-slate-900">{patient.name}</h2>
                  <p className="text-slate-500 text-sm">ID: {patient.id.slice(0, 8)}</p>
                  <p className="text-slate-500 text-sm mb-4">CPF: {patient.cpf || 'N/A'}</p>
                  
                  <div className="flex justify-center flex-wrap gap-2">
                    {patient.tags?.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-medium uppercase tracking-wider">{tag}</span>
                    ))}
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Activity size={18} className="text-blue-900"/> Dados Clínicos
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">IMC</span>
                      <span className="text-xl font-bold text-slate-800">{patient.anthropometrics?.bmi || '--'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Peso</span>
                      <span className="text-lg font-semibold text-slate-700">{patient.anthropometrics?.weight || '--'} kg</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Altura</span>
                      <span className="text-lg font-semibold text-slate-700">{patient.anthropometrics?.height || '--'} cm</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">PA</span>
                      <span className="text-lg font-semibold text-slate-700">
                        {patient.anthropometrics?.bp_systolic}/{patient.anthropometrics?.bp_diastolic}
                      </span>
                    </div>
                </div>
              </div>

              {/* Address Card */}
              {patient.address && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                     <MapPin size={18} className="text-blue-900"/> Endereço
                   </h3>
                   <div className="text-sm text-slate-600">
                      <p>{patient.address.street}, {patient.address.number}</p>
                      <p>{patient.address.neighborhood} - {patient.address.city}/{patient.address.state}</p>
                      <p className="text-xs text-slate-400 mt-1">CEP: {patient.address.cep}</p>
                   </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-2">Informações Sociais</h3>
                <p className="text-sm text-slate-600 leading-relaxed italic">{patient.social_info || 'Não informado.'}</p>
              </div>
          </div>

          {/* Right Column */}
          <div className="w-full md:w-2/3">
              {user?.role === UserRole.DOCTOR ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
                  <div className="flex border-b border-slate-200 no-print bg-slate-50">
                    <button 
                      onClick={() => setActiveTab('details')}
                      className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'details' ? 'bg-white text-blue-900 border-t-2 border-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Gerenciar
                    </button>
                    <button 
                      onClick={() => setActiveTab('anamnesis')}
                      className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'anamnesis' ? 'bg-white text-blue-900 border-t-2 border-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Histórico ({historyList.length})
                    </button>
                    <button 
                      onClick={() => setActiveTab('documents')}
                      className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'documents' ? 'bg-white text-blue-900 border-t-2 border-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Documentos ({documents.length})
                    </button>
                  </div>
    
                  <div className="p-6 flex-1">
                    {activeTab === 'details' && (
                      <div className="space-y-6">
                        <div className="bg-blue-900 rounded-xl p-6 text-white text-center shadow-lg shadow-blue-900/30">
                            <h3 className="text-xl font-bold mb-2">Iniciar Atendimento</h3>
                            <p className="text-blue-200 mb-6 text-sm">Abra uma nova sessão de anamnese para registrar a evolução do paciente.</p>
                            <button 
                              onClick={() => navigate(`/anamnesis/session/${patient.id}`)}
                              className="bg-white text-blue-900 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                              <PlusCircle size={20} /> Nova Anamnese SOAP
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                          <h4 className="md:col-span-2 text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Activity size={12}/> Atualizar Biometria e Tags</h4>
                          <input 
                            placeholder="Peso (kg)" className="bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={anthropo.weight} onChange={e => setAnthropo({...anthropo, weight: e.target.value})}
                          />
                          <input 
                            placeholder="Altura (cm)" className="bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={anthropo.height} onChange={e => setAnthropo({...anthropo, height: e.target.value})}
                          />
                          <input 
                            placeholder="PA Sistólica" className="bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={anthropo.bp_s} onChange={e => setAnthropo({...anthropo, bp_s: e.target.value})}
                          />
                          <input 
                            placeholder="PA Diastólica" className="bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={anthropo.bp_d} onChange={e => setAnthropo({...anthropo, bp_d: e.target.value})}
                          />
                          <input 
                            placeholder="Adicionar tags (separadas por vírgula)" className="md:col-span-2 bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                            value={newTags} onChange={e => setNewTags(e.target.value)}
                          />
                          <button onClick={handleUpdateBio} className="md:col-span-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded transition-colors text-sm">
                              Atualizar Dados
                          </button>
                        </div>
                      </div>
                    )}
    
                    {activeTab === 'anamnesis' && (
                      <div className="space-y-6">
                        {historyList.map(item => (
                          <div key={item.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all bg-white group relative">
                            {item.status === 'draft' ? (
                                <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wide">Rascunho</div>
                            ) : (
                                <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wide">Finalizado</div>
                            )}

                            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                              <div>
                                <p className="font-bold text-blue-900 text-lg">{new Date(item.created_at).toLocaleDateString()}</p>
                                <p className="text-xs text-slate-400 font-medium">Médico Responsável: Dr. {item.doctor?.name}</p>
                              </div>
                              
                              <div className="flex gap-2 no-print">
                                <button 
                                    onClick={() => setViewAnamnesis(item)}
                                    className="text-slate-500 hover:text-blue-600 p-1 hover:bg-blue-50 rounded"
                                    title="Visualizar Completa"
                                >
                                    <Eye size={18} />
                                </button>

                                {item.status === 'draft' && (
                                  <>
                                    <button 
                                        onClick={() => handleEditAnamnesis(item.id)}
                                        className="text-blue-500 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                                        title="Editar Rascunho"
                                      >
                                        <Pencil size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteAnamnesis(item.id)}
                                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                        title="Excluir"
                                    >
                                        {loadingDelete === item.id ? <Loader size={18} className="animate-spin"/> : <Trash2 size={18} />}
                                    </button>
                                  </>
                                )}
                                {item.status === 'final' && (
                                  <button onClick={() => handlePrint(item)} className="text-slate-300 hover:text-blue-900 transition-colors" title="Imprimir Relatório">
                                    <Printer size={20} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 text-sm opacity-60">
                              <div><strong className="text-blue-700 block text-xs uppercase mb-1">Subjetivo</strong> <div className="text-slate-600 line-clamp-3 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.soap.s }}></div></div>
                              <div><strong className="text-blue-700 block text-xs uppercase mb-1">Objetivo</strong> <div className="text-slate-600 line-clamp-3 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.soap.o }}></div></div>
                            </div>
                          </div>
                        ))}
                        {historyList.length === 0 && <p className="text-center text-slate-400 py-10">Nenhum histórico encontrado.</p>}
                      </div>
                    )}

                    {activeTab === 'documents' && (
                       <div className="space-y-6">
                          <button 
                             onClick={() => {
                                setShowDocModal(true);
                                setPrescriptionItems([{ medication: '', quantity: '', dosage: '', usageMode: 'Uso Oral' }]);
                                setReferralText('');
                             }} 
                             className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-blue-900 hover:text-blue-900 transition-all font-bold flex items-center justify-center gap-2"
                          >
                             <FilePlus size={24} /> Novo Documento
                          </button>

                          {documents.map(doc => (
                             <div key={doc.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all bg-white flex justify-between items-center group">
                                <div className="flex items-center gap-4">
                                   <div className={`p-3 rounded-lg ${doc.type === 'prescription' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                      <ScrollText size={24} />
                                   </div>
                                   <div>
                                      <p className="font-bold text-slate-800 text-lg capitalize">{doc.type === 'prescription' ? 'Receituário' : 'Encaminhamento'}</p>
                                      <p className="text-xs text-slate-500">Dr. {doc.doctor?.name} • {new Date(doc.created_at).toLocaleDateString()}</p>
                                   </div>
                                </div>
                                <div className="flex gap-2">
                                   <button 
                                      onClick={() => handlePrintDocument(doc)}
                                      className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                                      title="Imprimir"
                                   >
                                      <Printer size={20} />
                                   </button>
                                   <button 
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Excluir"
                                   >
                                      {loadingDelete === doc.id ? <Loader size={20} className="animate-spin"/> : <Trash2 size={20} />}
                                   </button>
                                </div>
                             </div>
                          ))}
                          {documents.length === 0 && <p className="text-center text-slate-400 py-4">Nenhum documento gerado.</p>}
                       </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center text-slate-400">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText size={32} className="text-slate-300"/>
                  </div>
                  <h3 className="text-lg font-medium text-slate-600">Acesso Restrito</h3>
                  <p>Apenas médicos podem visualizar e criar anamneses.</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
}