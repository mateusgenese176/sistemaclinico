
import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { api } from '../supabaseClient';
import { Appointment, UserRole } from '../types';
import { Calendar, Users, Clock, ArrowRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const LOGO_URL = "https://i.ibb.co/n8rLsXSJ/upscalemedia-transformed-1.png";

  useEffect(() => {
    const fetchToday = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.getAppointments(today);
      if (data) {
        let apts = (data as Appointment[]) || [];
        if (user?.role === UserRole.DOCTOR) {
          apts = apts.filter(a => a.doctor_id === user.id);
        }
        setAppointments(apts);
      } else {
        setAppointments([]);
      }
      setLoading(false);
    };
    fetchToday();
  }, [user]);

  // Blindagem de array
  const safeAppointments = appointments || [];

  const stats = [
    { label: 'Pacientes Hoje', value: safeAppointments.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Próxima Consulta', value: safeAppointments.find(a => a.status === 'scheduled')?.start_time || '--:--', icon: Clock, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-1/2 right-10 transform -translate-y-1/2 opacity-10">
          <img src={LOGO_URL} alt="Logo" className="w-64 h-auto brightness-0 invert" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Olá, {user?.name}</h1>
          <p className="text-slate-300">
            {user?.role === UserRole.DOCTOR 
              ? 'Tenha um excelente dia de atendimentos.' 
              : 'Bem-vindo ao painel de gerenciamento Genesis.'}
          </p>
          <div className="mt-6 flex gap-3">
             <button onClick={() => navigate('/calendar')} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors text-sm font-medium">
                Ver Agenda Completa
             </button>
             {user?.role === UserRole.DOCTOR && (
                <button onClick={() => navigate('/patients')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-transparent shadow-lg shadow-blue-900/20">
                  Meus Pacientes
                </button>
             )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
             <Calendar size={24} />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-medium">Data de Hoje</p>
             <p className="text-xl font-bold text-slate-900">{new Date().toLocaleDateString('pt-BR')}</p>
           </div>
        </div>
        
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg text-white ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Schedule Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <Activity size={18} className="text-blue-900"/> 
               {user?.role === UserRole.DOCTOR ? 'Seus Atendimentos Hoje' : 'Consultas do Dia'}
             </h3>
             <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">{safeAppointments.length}</span>
           </div>
           
           <div className="p-0 flex-1 overflow-y-auto max-h-[400px]">
             {loading ? (
                <div className="p-8 text-center text-slate-400">Carregando...</div>
             ) : safeAppointments.length > 0 ? (
               <div className="divide-y divide-slate-100">
                 {safeAppointments.map(apt => (
                   <div key={apt.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                         <div className="font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded text-sm">{apt.start_time}</div>
                         <div>
                            <p className="font-bold text-slate-800">{apt.patient?.name || 'Paciente Removido'}</p>
                            <p className="text-xs text-slate-500 capitalize">{apt.type === 'first' ? 'Primeira Consulta' : apt.type === 'return' ? 'Retorno' : 'Continuidade'}</p>
                         </div>
                      </div>
                      
                      {user?.role === UserRole.DOCTOR && (
                        <button 
                          onClick={() => navigate(`/patients/${apt.patient_id}`)}
                          className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-blue-50 rounded-full"
                          title="Ir para Prontuário"
                        >
                          <ArrowRight size={18} />
                        </button>
                      )}
                   </div>
                 ))}
               </div>
             ) : (
               <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                 <Calendar size={32} className="mb-2 opacity-20"/>
                 <p>Nenhuma consulta agendada para hoje.</p>
               </div>
             )}
           </div>
        </div>
        
        {/* Quick Actions Panel */}
        <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-white flex flex-col justify-center">
             <h3 className="text-xl font-bold mb-6">Acesso Rápido</h3>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => navigate('/calendar')} className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl text-left transition-colors group">
                   <Calendar className="mb-3 text-blue-400 group-hover:scale-110 transition-transform" size={28} />
                   <span className="font-semibold block">Ver Agenda</span>
                   <span className="text-xs text-slate-400">Gerenciar horários</span>
                </button>
                <button onClick={() => navigate('/patients/new')} className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl text-left transition-colors group">
                   <Users className="mb-3 text-emerald-400 group-hover:scale-110 transition-transform" size={28} />
                   <span className="font-semibold block">Novo Paciente</span>
                   <span className="text-xs text-slate-400">Cadastrar ficha</span>
                </button>
             </div>
        </div>
      </div>
    </div>
  );
}
