import React, { useState, useEffect } from 'react';
import { api } from '../supabaseClient';
import { Appointment, Patient, User } from '../types';
import { ChevronLeft, ChevronRight, Plus, User as UserIcon, AlertCircle, Trash2, Edit2, Search, Printer, DollarSign, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../components/Dialog';

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog();
  
  // States
  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day'); // Toggle view
  const [appointments, setAppointments] = useState<Appointment[]>([]); // Current view appointments
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]); // For calendar indicators
  
  const [doctors, setDoctors] = useState<User[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [patients, setPatients] = useState<Patient[]>([]);
  
  const LOGO_URL = "https://i.ibb.co/n8rLsXSJ/upscalemedia-transformed-1.png";

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Search State for Modal
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');

  const [newApt, setNewApt] = useState({ 
    patient_id: '', 
    doctor_id: '', 
    start_time: '09:00', 
    date: '', 
    type: 'first' as const,
    plan: 'particular',
    price: '' as any
  });

  useEffect(() => {
    fetchData();
    api.getUsers().then(({ data }) => {
        const allUsers = (data as User[]) || [];
        setDoctors(allUsers.filter((u:any) => u.role === 'doctor'));
    });
    api.getPatients().then(({ data }) => {
        setPatients((data as Patient[]) || []);
    });
  }, [date, viewMode]); // Re-fetch when date or mode changes

  const fetchData = async () => {
    if (viewMode === 'day') {
        const dateStr = date.toISOString().split('T')[0];
        const { data } = await api.getAppointments(dateStr);
        setAppointments((data as Appointment[]) || []);
    } else {
        // In month view, we fetch broadly to show indicators
        // For optimization, we could fetch range, but getAppointments() gets all if no date provided
        // We will filter client side for the month dots
        const { data } = await api.getAppointments();
        setMonthAppointments((data as Appointment[]) || []);
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(date);
    if (viewMode === 'day') {
        newDate.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    } else {
        newDate.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setDate(newDate);
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(date.getFullYear(), date.getMonth(), day);
    setDate(newDate);
    setViewMode('day');
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sunday

  const renderCalendarGrid = () => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-slate-50/50 border border-transparent"></div>);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDayDate = new Date(year, month, i);
      const isToday = new Date().toDateString() === currentDayDate.toDateString();
      const isSelected = date.toDateString() === currentDayDate.toDateString();
      const dateStr = currentDayDate.toISOString().split('T')[0];
      
      // Filter appointments for this day to show indicators
      const dayApts = monthAppointments.filter(a => a.date === dateStr && (selectedDoctor === 'all' || a.doctor_id === selectedDoctor));
      
      days.push(
        <div 
          key={i} 
          onClick={() => handleDayClick(i)}
          className={`
            min-h-[100px] border border-slate-100 p-2 cursor-pointer transition-all hover:bg-blue-50 relative group
            ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : 'bg-white'}
          `}
        >
           <div className="flex justify-between items-start">
             <span className={`
               w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
               ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}
             `}>
               {i}
             </span>
             {dayApts.length > 0 && (
               <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 rounded-full">
                 {dayApts.length}
               </span>
             )}
           </div>

           <div className="mt-2 space-y-1 overflow-hidden">
              {dayApts.slice(0, 3).map(apt => (
                <div key={apt.id} className="text-[10px] truncate px-1 py-0.5 rounded bg-slate-100 text-slate-600 border-l-2 border-blue-400">
                   {apt.start_time} {apt.patient?.name.split(' ')[0]}
                </div>
              ))}
              {dayApts.length > 3 && (
                <div className="text-[10px] text-slate-400 pl-1">+ {dayApts.length - 3} mais</div>
              )}
           </div>
        </div>
      );
    }
    return days;
  };

  // --- DRAG AND DROP LOGIC (Day View) ---
  const handleDragStart = (e: React.DragEvent, aptId: string) => {
    e.dataTransfer.setData("aptId", aptId);
  };

  const handleDrop = async (e: React.DragEvent, time: string) => {
    const aptId = e.dataTransfer.getData("aptId");
    if (!aptId) return;
    
    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return;

    const updated = { ...apt, start_time: time };
    setAppointments(prev => prev.map(p => p.id === aptId ? updated : p));
    
    await api.updateAppointment(aptId, { start_time: time });
  };

  // --- MODAL & CRUD LOGIC ---
  const openModal = (apt?: Appointment) => {
    setError('');
    if (apt) {
        setEditingId(apt.id);
        setNewApt({
            patient_id: apt.patient_id,
            doctor_id: apt.doctor_id,
            start_time: apt.start_time,
            date: apt.date,
            type: apt.type as any,
            plan: apt.plan || 'particular',
            price: apt.price !== undefined ? apt.price : ''
        });
        setSelectedPatientName(apt.patient?.name || '');
        setSearchTerm('');
    } else {
        setEditingId(null);
        setNewApt({ 
          patient_id: '', 
          doctor_id: '', 
          start_time: '09:00', 
          date: date.toISOString().split('T')[0],
          type: 'first',
          plan: 'particular',
          price: ''
        });
        setSelectedPatientName('');
        setSearchTerm('');
    }
    setShowModal(true);
  };

  const handlePatientSelect = (p: Patient) => {
    setNewApt(prev => ({ ...prev, patient_id: p.id }));
    setSelectedPatientName(p.name);
    setSearchTerm('');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const confirmed = await dialog.confirm("Excluir Consulta", "Tem certeza que deseja cancelar e excluir esta consulta?", "danger");
      if(!confirmed) return;
      
      setAppointments(prev => prev.filter(a => a.id !== id));
      // Also update month view cache if needed
      setMonthAppointments(prev => prev.filter(a => a.id !== id));

      try {
          await api.deleteAppointment(id);
      } catch (e) {
          dialog.alert("Erro", "Erro ao excluir consulta no banco de dados.");
          fetchData();
      }
  };

  // Helper to safely format YYYY-MM-DD
  const formatSafeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const printAppointmentConfirmation = (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    const printWindow = window.open('', '_blank', 'width=1122,height=793'); // A4 Landscape ratio approximation
    if (!printWindow) {
      dialog.alert("Bloqueio", "Permita popups para imprimir.");
      return;
    }

    const docDate = new Date().toLocaleDateString('pt-BR');
    const aptDate = formatSafeDate(apt.date);
    const aptTime = apt.start_time;
    const doctorName = (doctors || []).find(d => d.id === apt.doctor_id)?.name || 'Médico Responsável';
    const attendantName = user?.name || 'Atendente';

    // Address construction
    let addressStr = 'Endereço não informado';
    if (apt.patient?.address) {
       const a = apt.patient.address;
       addressStr = `${a.street || ''}, ${a.number || ''} ${a.complement ? '- ' + a.complement : ''} - ${a.neighborhood || ''}, ${a.city || ''}/${a.state || ''}`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comprovante de Agendamento</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
           @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
           body { font-family: 'Inter', sans-serif; background: white; margin: 0; padding: 0; }
           
           /* Force Landscape */
           @page { size: A4 landscape; margin: 0.5cm; }
           
           .sheet { 
             width: 100%; 
             height: 100vh; 
             box-sizing: border-box;
             padding: 1cm;
             display: flex;
             flex-direction: column;
           }

           .header {
             display: flex;
             justify-content: space-between;
             align-items: center;
             border-bottom: 3px solid #1e3a8a;
             padding-bottom: 20px;
             margin-bottom: 30px;
           }

           .main-content {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              flex-grow: 1;
           }

           .box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 25px;
           }

           .box-title {
              font-size: 14px;
              font-weight: 700;
              text-transform: uppercase;
              color: #1e3a8a;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 20px;
           }

           .info-row {
              margin-bottom: 15px;
           }
           .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;}
           .value { font-size: 16px; font-weight: 600; color: #0f172a; }

           .signatures {
              margin-top: auto;
              padding-top: 40px;
              display: flex;
              justify-content: space-between;
              gap: 50px;
           }
           .sig-line {
              flex: 1;
              border-top: 1px solid #94a3b8;
              text-align: center;
              padding-top: 10px;
           }
           .sig-name { font-weight: 700; font-size: 14px; }
           .sig-role { font-size: 11px; color: #64748b; text-transform: uppercase;}
        </style>
      </head>
      <body>
        <div class="sheet">
           <div class="header">
              <div class="flex items-center gap-4">
                 <img src="${LOGO_URL}" alt="Genesis" class="h-16 w-auto" />
                 <div>
                   <h1 class="text-3xl font-bold uppercase tracking-wider text-slate-900">Genesis Medical</h1>
                   <p class="text-sm text-slate-500 font-medium">Comprovante de Agendamento</p>
                 </div>
              </div>
              <div class="text-right">
                 <p class="text-xs text-slate-500 uppercase font-bold">Data de Emissão</p>
                 <p class="text-lg font-bold text-slate-900">${docDate}</p>
              </div>
           </div>

           <div class="main-content">
              <!-- Patient Column -->
              <div class="box">
                 <div class="box-title">Dados do Paciente</div>
                 
                 <div class="info-row">
                    <span class="label">Nome Completo</span>
                    <span class="value" style="font-size: 20px;">${apt.patient?.name}</span>
                 </div>

                 <div class="grid grid-cols-2 gap-4">
                    <div class="info-row">
                        <span class="label">CPF</span>
                        <span class="value font-mono">${apt.patient?.cpf || 'Não informado'}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">RG</span>
                        <span class="value text-slate-400 font-light border-b border-dashed border-slate-300 w-full block">________________</span>
                    </div>
                 </div>

                 <div class="info-row">
                    <span class="label">Endereço</span>
                    <span class="value text-sm leading-snug block">${addressStr}</span>
                 </div>
                 
                 <div class="info-row">
                    <span class="label">Contato</span>
                    <span class="value">${apt.patient?.contact || 'Não informado'}</span>
                 </div>
              </div>

              <!-- Appointment Column -->
              <div class="box">
                 <div class="box-title">Dados do Agendamento</div>
                 
                 <div class="grid grid-cols-2 gap-4">
                    <div class="info-row">
                        <span class="label">Data da Consulta</span>
                        <span class="value text-blue-900" style="font-size: 20px;">${aptDate}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Horário</span>
                        <span class="value text-blue-900" style="font-size: 20px;">${aptTime}</span>
                    </div>
                 </div>

                 <div class="info-row">
                    <span class="label">Médico Responsável</span>
                    <span class="value">Dr. ${doctorName}</span>
                 </div>

                 <div class="grid grid-cols-2 gap-4">
                    <div class="info-row">
                        <span class="label">Tipo</span>
                        <span class="value capitalize">${apt.type === 'first' ? 'Primeira Consulta' : apt.type === 'return' ? 'Retorno' : 'Continuidade'}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Plano / Convênio</span>
                        <span class="value uppercase">${apt.plan || 'Particular'}</span>
                    </div>
                 </div>

                 <div class="info-row mt-4 p-4 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                    <span class="label mb-0">Valor do Procedimento</span>
                    <span class="value text-emerald-700">R$ ${Number(apt.price).toFixed(2)}</span>
                 </div>
              </div>
           </div>

           <div class="signatures">
              <div class="sig-line">
                 <p class="sig-name">${apt.patient?.name}</p>
                 <p class="sig-role">Assinatura do Paciente</p>
              </div>
              <div class="sig-line">
                 <p class="sig-name">${attendantName}</p>
                 <p class="sig-role">Atendente Responsável</p>
              </div>
              <div class="sig-line">
                 <p class="sig-name">Dr. ${doctorName}</p>
                 <p class="sig-role">Carimbo/Assinatura do Médico</p>
              </div>
           </div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCreateOrUpdate = async () => {
    setError('');
    
    if (!newApt.patient_id || !newApt.doctor_id || !newApt.date) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const payload = {
        ...newApt,
        price: newApt.price ? parseFloat(newApt.price) : 0,
        status: 'scheduled'
      };

      if (editingId) {
          await api.updateAppointment(editingId, payload);
      } else {
          const { error: apiError } = await api.createAppointment(payload);
          if (apiError) throw apiError;
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar.');
    }
  };

  const safeAppointments = appointments || [];
  const filteredAppointments = selectedDoctor === 'all' ? safeAppointments : safeAppointments.filter(a => a.doctor_id === selectedDoctor);
  const timeSlots = Array.from({ length: 11 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
  const filteredPatientSearch = searchTerm ? (patients || []).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.cpf?.includes(searchTerm)) : [];

  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button 
                onClick={() => handleNavigate('prev')} 
                className="p-1 hover:bg-white hover:shadow-sm rounded transition text-slate-600"
                title={viewMode === 'day' ? "Dia Anterior" : "Mês Anterior"}
            >
                <ChevronLeft size={16}/>
            </button>
            <span className="font-semibold w-40 text-center text-slate-800 capitalize">
              {viewMode === 'day' 
                 ? date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
                 : date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
              }
            </span>
            <button 
                onClick={() => handleNavigate('next')} 
                className="p-1 hover:bg-white hover:shadow-sm rounded transition text-slate-600"
                title={viewMode === 'day' ? "Próximo Dia" : "Próximo Mês"}
            >
                <ChevronRight size={16}/>
            </button>
          </div>
          
          <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-1">
             <button 
               onClick={() => setViewMode('day')}
               className={`px-3 py-1 rounded text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'day' ? 'bg-white shadow-sm text-blue-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <Clock size={14}/> Dia
             </button>
             <button 
               onClick={() => setViewMode('month')}
               className={`px-3 py-1 rounded text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'month' ? 'bg-white shadow-sm text-blue-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <CalendarIcon size={14}/> Mês
             </button>
          </div>

          <select 
            value={selectedDoctor} 
            onChange={e => setSelectedDoctor(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-900 outline-none text-slate-700"
          >
            <option value="all">Todos os Médicos</option>
            {(doctors || []).map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
          </select>
        </div>

        <button 
          onClick={() => openModal()}
          className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all font-medium"
        >
          <Plus size={18} /> Nova Consulta
        </button>
      </div>

      {/* VIEW: DAY MODE */}
      {viewMode === 'day' && (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto animate-fade-in">
            <div className="grid grid-cols-[80px_1fr] divide-x divide-slate-100 h-full">
            <div className="divide-y divide-slate-100 bg-slate-50">
                {timeSlots.map(time => (
                <div key={time} className="h-28 flex items-center justify-center text-xs text-slate-400 font-medium">
                    {time}
                </div>
                ))}
            </div>
            <div className="divide-y divide-slate-100 relative">
                {timeSlots.map(time => (
                <div 
                    key={time} 
                    className="h-28 transition-colors hover:bg-slate-50/50 p-2 group relative"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, time)}
                >
                    <div className="absolute inset-0 border-2 border-dashed border-blue-200 opacity-0 group-hover:opacity-50 pointer-events-none transition-opacity" />

                    {filteredAppointments
                    .filter(a => a.start_time === time)
                    .map(apt => (
                        <div
                        key={apt.id}
                        draggable
                        onDragStart={e => handleDragStart(e, apt.id)}
                        className={`
                            mb-2 p-3 rounded-lg border-l-4 shadow-sm cursor-move hover:shadow-md transition-all bg-white group/apt relative
                            ${apt.type === 'first' ? 'border-purple-500' : 
                            apt.type === 'return' ? 'border-blue-500' : 'border-emerald-500'}
                        `}
                        >
                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 hidden group-hover/apt:flex gap-1 bg-white/90 rounded p-1 shadow-sm border border-slate-100 z-10">
                            <button onClick={(e) => printAppointmentConfirmation(apt, e)} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded" title="Imprimir"><Printer size={14}/></button>
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/patients/${apt.patient_id}`); }} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded" title="Perfil"><UserIcon size={14}/></button>
                            <button onClick={(e) => { e.stopPropagation(); openModal(apt); }} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded"><Edit2 size={14}/></button>
                            <button onClick={(e) => handleDelete(apt.id, e)} className="p-1 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded"><Trash2 size={14}/></button>
                        </div>

                        <div className="flex justify-between items-start">
                            <span className="font-semibold text-slate-700 text-sm truncate pr-16">{apt.patient?.name || 'Paciente'}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                            ${apt.type === 'first' ? 'bg-purple-50 text-purple-700' : 
                                apt.type === 'return' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}
                            `}>
                            {apt.type === 'first' ? '1ª Vez' : apt.type === 'return' ? 'Retorno' : 'Cont.'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-2 justify-between">
                            <span className="flex items-center gap-1"><UserIcon size={12} /> Dr. {(doctors || []).find(d => d.id === apt.doctor_id)?.name.split(' ')[0]}</span>
                            {apt.price && <span className="font-bold text-green-600">R$ {apt.price}</span>}
                        </div>
                        </div>
                    ))}
                </div>
                ))}
            </div>
            </div>
        </div>
      )}

      {/* VIEW: MONTH MODE */}
      {viewMode === 'month' && (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col animate-fade-in">
           <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {weekDays.map(day => (
                 <div key={day} className="py-3 text-center text-xs font-bold uppercase text-slate-500 tracking-wider">
                    {day}
                 </div>
              ))}
           </div>
           <div className="flex-1 grid grid-cols-7 auto-rows-fr">
              {renderCalendarGrid()}
           </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-900 mb-4">{editingId ? 'Editar Consulta' : 'Nova Consulta'}</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Intelligent Patient Search */}
              <div className="relative">
                <label className="text-sm font-medium text-slate-700">Paciente</label>
                {selectedPatientName ? (
                   <div className="flex items-center justify-between mt-1 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-blue-900 font-medium">{selectedPatientName}</span>
                      <button 
                        onClick={() => { setSelectedPatientName(''); setNewApt(prev => ({...prev, patient_id: ''})); }}
                        className="text-blue-400 hover:text-blue-700"
                      >
                         <AlertCircle size={16} className="rotate-45"/> {/* Using icon as 'X' */}
                      </button>
                   </div>
                ) : (
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-blue-900 outline-none"
                      placeholder="Digite o nome para buscar..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <div className="absolute z-10 w-full bg-white shadow-xl rounded-lg mt-1 border border-slate-100 max-h-48 overflow-y-auto">
                        {filteredPatientSearch.length > 0 ? (
                           filteredPatientSearch.map(p => (
                             <button
                               key={p.id}
                               onClick={() => handlePatientSelect(p)}
                               className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-sm"
                             >
                               <span className="font-bold text-slate-800">{p.name}</span>
                               <span className="block text-xs text-slate-400">{p.cpf || 'Sem CPF'}</span>
                             </button>
                           ))
                        ) : (
                           <div className="p-3 text-sm text-slate-400 text-center">Nenhum paciente encontrado.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Médico</label>
                <select 
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-900 outline-none"
                  value={newApt.doctor_id}
                  onChange={e => setNewApt({...newApt, doctor_id: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {(doctors || []).map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                </select>
              </div>

              {/* Date Field */}
              <div>
                <label className="text-sm font-medium text-slate-700">Data</label>
                <input 
                  type="date"
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-900 outline-none"
                  value={newApt.date}
                  onChange={e => setNewApt({...newApt, date: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Horário</label>
                  <select 
                    className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-900 outline-none"
                    value={newApt.start_time}
                    onChange={e => setNewApt({...newApt, start_time: e.target.value})}
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Tipo</label>
                  <select 
                    className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-900 outline-none"
                    value={newApt.type}
                    onChange={e => setNewApt({...newApt, type: e.target.value as any})}
                  >
                    <option value="first">Primeira</option>
                    <option value="return">Retorno</option>
                    <option value="continuity">Continuidade</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium text-slate-700">Plano/Convênio</label>
                    <select 
                       className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-900 outline-none"
                       value={newApt.plan}
                       onChange={e => setNewApt({...newApt, plan: e.target.value})}
                    >
                       <option value="particular">Particular</option>
                       <option value="unimed">Unimed</option>
                       <option value="cartao_sao_gabriel">Cartão São Gabriel</option>
                       <option value="select">Select</option>
                       <option value="outro">Outro</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-slate-700">Valor (R$)</label>
                    <div className="relative">
                       <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                       <input 
                         type="number"
                         step="0.01"
                         className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2.5 pl-8 focus:ring-2 focus:ring-blue-900 outline-none"
                         value={newApt.price}
                         onChange={e => setNewApt({...newApt, price: e.target.value})}
                         placeholder="0.00"
                       />
                    </div>
                 </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateOrUpdate}
                  className="flex-1 bg-blue-900 text-white py-2.5 rounded-lg hover:bg-blue-800 font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                  {editingId ? 'Salvar' : 'Agendar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}