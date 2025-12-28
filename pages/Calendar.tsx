
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../supabaseClient';
import { Appointment, Patient, User } from '../types';
import { 
  ChevronLeft, ChevronRight, Plus, User as UserIcon, 
  AlertCircle, Trash2, Edit2, Search, Printer, 
  Calendar as CalendarIcon, Clock, Play, FileText, 
  MoreHorizontal, CheckCircle2, UserCheck, GripVertical, X
} from 'lucide-react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../components/Dialog';

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog();
  
  const [date, setDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]); // Para busca do próximo paciente global
  const [doctors, setDoctors] = useState<User[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal & Search
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [newApt, setNewApt] = useState({ 
    patient_id: '', doctor_id: user?.role === 'doctor' ? user.id : '', 
    start_time: '08:00', date: '', type: 'first' as const,
    plan: 'particular', price: '' as any
  });

  const timeSlots = Array.from({ length: 21 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minutes = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [date]);

  useEffect(() => {
    api.getUsers().then(({ data }) => setDoctors(((data as User[]) || []).filter(u => u.role === 'doctor')));
    api.getPatients().then(({ data }) => setPatients((data as Patient[]) || []));
    // Carrega todos para o "Próximo Paciente"
    api.getAppointments().then(({ data }) => setAllAppointments((data as Appointment[]) || []));
  }, []);

  const fetchData = async () => {
    const dateStr = date.toISOString().split('T')[0];
    const { data } = await api.getAppointments(dateStr);
    setAppointments((data as Appointment[]) || []);
    
    // Atualiza a lista global para garantir que o próximo paciente esteja correto
    const { data: allData } = await api.getAppointments();
    setAllAppointments((allData as Appointment[]) || []);
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(date);
    if (direction === 'today') {
      setDate(new Date());
    } else {
      newDate.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
      setDate(newDate);
    }
  };

  // --- LÓGICA PRÓXIMO PACIENTE GLOBAL ---
  const globalNextApt = allAppointments
    .filter(a => a.status === 'scheduled')
    .filter(a => {
      const aptDateTime = new Date(`${a.date}T${a.start_time}:00`);
      return aptDateTime > currentTime;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time}:00`).getTime();
      const dateB = new Date(`${b.date}T${b.start_time}:00`).getTime();
      return dateA - dateB;
    })[0];

  const getTimeIndicatorPosition = () => {
    const startHour = 8;
    const hourHeight = 112; // 2 slots de 56px cada
    const hoursElapsed = currentTime.getHours() + currentTime.getMinutes() / 60 - startHour;
    return Math.max(0, hoursElapsed * hourHeight);
  };

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'return': return { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' };
      case 'continuity': return { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' };
      default: return { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' };
    }
  };

  // --- DRAG AND DROP ---
  const handleDragStart = (e: React.DragEvent, aptId: string) => {
    e.dataTransfer.setData("aptId", aptId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newTime: string) => {
    e.preventDefault();
    const aptId = e.dataTransfer.getData("aptId");
    if (!aptId) return;

    const apt = appointments.find(a => a.id === aptId);
    if (!apt || apt.start_time === newTime) return;

    // Feedback visual imediato (Optimistic UI)
    const updatedApts = appointments.map(a => a.id === aptId ? { ...a, start_time: newTime } : a);
    setAppointments(updatedApts);

    try {
      const { error } = await api.updateAppointment(aptId, { start_time: newTime });
      if (error) throw error;
    } catch (err) {
      dialog.alert("Erro", "Não foi possível reagendar a consulta.");
      fetchData(); // Rollback
    }
  };

  // CRUD functions (Modal)
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
        price: apt.price || '' 
      });
      setSelectedPatientName(apt.patient?.name || '');
    } else {
      setEditingId(null);
      setNewApt({ 
        patient_id: '', doctor_id: user?.role === 'doctor' ? user.id : '', 
        start_time: '08:00', date: date.toISOString().split('T')[0],
        type: 'first', plan: 'particular', price: ''
      });
      setSelectedPatientName('');
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (await dialog.confirm("Cancelar Consulta", "Deseja realmente remover este agendamento?", "danger")) {
      await api.deleteAppointment(id);
      fetchData();
    }
  };

  const handleSave = async () => {
    if (!newApt.patient_id || !newApt.doctor_id) return setError('Selecione paciente e médico.');
    try {
      const payload = { ...newApt, price: parseFloat(newApt.price) || 0 };
      editingId ? await api.updateAppointment(editingId, payload) : await api.createAppointment(payload);
      setShowModal(false);
      fetchData();
    } catch (e) { setError('Erro ao salvar.'); }
  };

  const filteredApts = selectedDoctor === 'all' ? appointments : appointments.filter(a => a.doctor_id === selectedDoctor);

  return (
    <div className="h-full flex flex-col space-y-6 text-slate-900 animate-fade-in-up">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Agenda de Consultas</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie seus horários e atendimentos</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/20 font-bold transition-all active:scale-95"
        >
          <Plus size={20} /> Nova Consulta
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN - MINI TOOLS */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Mini Calendar Navigation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <button onClick={() => handleNavigate('prev')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><ChevronLeft size={18}/></button>
                <span className="font-bold text-sm uppercase tracking-widest text-slate-700">{date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => handleNavigate('next')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><ChevronRight size={18}/></button>
             </div>
             <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-[10px] font-bold text-slate-400">{d}</span>)}
             </div>
             <div className="grid grid-cols-7 gap-1">
                {Array.from({length: 31}).map((_, i) => {
                  const isToday = new Date().getDate() === i+1 && new Date().getMonth() === date.getMonth() && new Date().getFullYear() === date.getFullYear();
                  const isSelected = date.getDate() === i+1;
                  return (
                    <button 
                      key={i} 
                      onClick={() => {
                        const d = new Date(date);
                        d.setDate(i+1);
                        setDate(d);
                      }}
                      className={`h-8 w-8 rounded-full text-xs flex items-center justify-center transition-all ${isSelected ? 'bg-blue-900 text-white font-bold' : isToday ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {i+1}
                    </button>
                  );
                })}
             </div>
          </div>

          {/* Next Patient Highlight (Global) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800">Próximo Paciente</h3>
                {globalNextApt && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">Confirmado</span>}
             </div>
             
             {globalNextApt ? (
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center font-bold text-blue-900 border border-blue-100">
                        {globalNextApt.patient?.name.charAt(0)}
                     </div>
                     <div className="overflow-hidden">
                        <p className="font-bold text-slate-900 truncate">{globalNextApt.patient?.name}</p>
                        <p className="text-xs text-slate-500 capitalize">
                           {new Date(globalNextApt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {globalNextApt.start_time}
                        </p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => navigate(`/patients/${globalNextApt.patient_id}`)} className="flex-1 bg-blue-900 hover:bg-blue-800 text-white py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-blue-900/10 active:scale-95">Iniciar Atendimento</button>
                  </div>
               </div>
             ) : (
               <p className="text-sm text-slate-400 italic py-4 text-center">Nenhum próximo agendamento.</p>
             )}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Hoje</p>
                <p className="text-2xl font-bold text-slate-900">{appointments.length}</p>
             </div>
             <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-slate-900">{appointments.filter(a => a.status === 'scheduled').length}</p>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN - TIMELINE */}
        <div className="xl:col-span-9 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden min-h-[800px]">
           
           {/* Timeline Toolbar */}
           <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => handleNavigate('today')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${date.toDateString() === new Date().toDateString() ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Hoje</button>
                 <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700">Amanhã</button>
                 <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700">Esta Semana</button>
              </div>

              <div className="relative w-full md:w-96">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                  placeholder="Buscar na agenda..."
                 />
              </div>

              <div className="hidden md:flex gap-4">
                 <div className="flex items-center gap-3 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> <span className="text-slate-500">Consulta</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> <span className="text-slate-500">Retorno</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> <span className="text-slate-500">Exame</span></div>
                 </div>
              </div>
           </div>

           {/* Timeline Body */}
           <div className="flex-1 overflow-y-auto relative bg-slate-50">
              
              <div className="p-6 border-b border-slate-200/60 bg-white">
                 <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">VISUALIZAÇÃO DIÁRIA</span>
                 <h2 className="text-xl font-bold text-slate-900 capitalize">
                    {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                 </h2>
              </div>

              {/* Current Time Line Indicator */}
              {date.toDateString() === new Date().toDateString() && (
                 <div 
                   className="absolute left-0 right-0 z-10 pointer-events-none flex items-center transition-all duration-1000"
                   style={{ top: `${getTimeIndicatorPosition() + 112}px` }} 
                 >
                    <span className="bg-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded ml-12 shadow-md text-white">{currentTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    <div className="h-px flex-1 bg-red-500/30"></div>
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                 </div>
              )}

              {/* Time Slots */}
              <div className="relative bg-white">
                 {timeSlots.map(time => (
                    <div 
                      key={time} 
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, time)}
                      className="flex min-h-[56px] border-b border-slate-100 group"
                    >
                       <div className="w-24 flex-shrink-0 flex justify-center py-4 border-r border-slate-50">
                          <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">{time}</span>
                       </div>
                       <div className="flex-1 p-2 relative">
                          <div className="absolute inset-2 border-2 border-dashed border-slate-100 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none"></div>
                          
                          <div className="relative z-0 space-y-2">
                            {filteredApts.filter(a => a.start_time === time).map(apt => {
                              const style = getTypeStyle(apt.type);
                              return (
                                <div 
                                  key={apt.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, apt.id)}
                                  onClick={() => openModal(apt)}
                                  className={`
                                    w-full p-4 rounded-2xl border-l-4 shadow-sm transition-all hover:shadow-md cursor-grab active:cursor-grabbing relative overflow-hidden group/card
                                    ${style.border} ${style.bg}
                                  `}
                                >
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                     <div className="flex items-center gap-4">
                                        <div className="hidden md:block">
                                           <GripVertical size={16} className="text-slate-300 group-hover/card:text-slate-400" />
                                        </div>
                                        <div>
                                           <div className="flex items-center gap-2">
                                              <span className="font-bold text-slate-900">{apt.patient?.name}</span>
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${style.badge}`}>
                                                 {apt.type === 'first' ? 'Consulta' : apt.type === 'return' ? 'Retorno' : 'Exame'}
                                              </span>
                                              {apt.status === 'completed' && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><UserCheck size={10}/> CHEGOU</span>}
                                           </div>
                                           <div className="flex items-center gap-4 mt-1">
                                              <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock size={12}/> {apt.start_time} • Dr. {apt.doctor?.name.split(' ')[0]}</span>
                                              <span className="text-[10px] text-slate-400 font-medium">Plano: {apt.plan || 'Particular'}</span>
                                           </div>
                                        </div>
                                     </div>

                                     <div className="flex gap-2 opacity-0 group-hover/card:opacity-100 transition-all">
                                        <button 
                                           onClick={(e) => { e.stopPropagation(); navigate(`/patients/${apt.patient_id}`); }}
                                           className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                                        >
                                           <FileText size={10}/> Prontuário
                                        </button>
                                        <button 
                                          onClick={(e) => handleDelete(apt.id, e)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 size={14}/>
                                        </button>
                                     </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                       </div>
                    </div>
                 ))}
                 
                 {/* Exemplo de Bloqueio (Opcional visual) */}
                 <div className="flex min-h-[112px] bg-slate-50/50 border-b border-slate-100">
                    <div className="w-24 flex-shrink-0 flex justify-center py-4 border-r border-slate-50">
                       <span className="text-xs font-bold text-slate-300">12:00</span>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center text-slate-400 gap-3 italic">
                       <Clock size={16} className="opacity-30" />
                       <span className="text-xs font-medium tracking-wide">Intervalo / Horário Almoço</span>
                    </div>
                 </div>

              </div>
           </div>
        </div>
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-slate-100">
            <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-200">
               <h3 className="text-xl font-bold text-slate-900">{editingId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
               <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-6 space-y-5">
               {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
               
               <div className="relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Paciente</label>
                  {selectedPatientName ? (
                     <div className="flex items-center justify-between mt-1 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <span className="text-blue-900 font-bold">{selectedPatientName}</span>
                        <button onClick={() => { setSelectedPatientName(''); setNewApt({...newApt, patient_id: ''}); }} className="text-slate-400 hover:text-red-500 transition-colors"><X size={16}/></button>
                     </div>
                  ) : (
                    <div className="relative mt-1">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                         className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                         placeholder="Buscar paciente..."
                         value={searchTerm}
                         onChange={e => setSearchTerm(e.target.value)}
                       />
                       {searchTerm && (
                         <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-xl max-h-48 overflow-y-auto">
                            {patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                              <button key={p.id} onClick={() => { setNewApt({...newApt, patient_id: p.id}); setSelectedPatientName(p.name); setSearchTerm(''); }} className="w-full text-left p-3 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0">{p.name}</button>
                            ))}
                         </div>
                       )}
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Horário</label>
                     <select 
                       className="w-full mt-1 bg-white border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-900 appearance-none"
                       value={newApt.start_time}
                       onChange={e => setNewApt({...newApt, start_time: e.target.value})}
                     >
                        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo</label>
                     <select 
                       className="w-full mt-1 bg-white border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-900 appearance-none"
                       value={newApt.type}
                       onChange={e => setNewApt({...newApt, type: e.target.value as any})}
                     >
                        <option value="first">Consulta</option>
                        <option value="return">Retorno</option>
                        <option value="continuity">Exame</option>
                     </select>
                  </div>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Médico Responsável</label>
                  <select 
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-900 appearance-none"
                    value={newApt.doctor_id}
                    onChange={e => setNewApt({...newApt, doctor_id: e.target.value})}
                  >
                     <option value="">Selecione...</option>
                     {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-4">
               <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors">Cancelar</button>
               <button onClick={handleSave} className="flex-1 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                  {editingId ? 'Salvar Alterações' : 'Confirmar Agenda'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
