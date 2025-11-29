
import React, { useEffect, useState } from 'react';
import { api } from '../supabaseClient';
import { Appointment } from '../types';
import { DollarSign, TrendingUp, Calendar, CreditCard, PieChart } from 'lucide-react';
import { useAuth } from '../App';

export default function FinancialDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<'today' | 'month' | 'all'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data } = await api.getAppointments();
      setAppointments((data as Appointment[]) || []);
      setLoading(false);
    };
    loadData();
  }, []);

  const getFilteredData = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return appointments.filter(a => {
      const aDate = new Date(a.date);
      if (filter === 'today') return a.date === today;
      if (filter === 'month') return aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear;
      return true;
    });
  };

  const data = getFilteredData();

  const totalRevenue = data.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const totalCount = data.length;
  
  // Group by Plan
  const revenueByPlan: Record<string, number> = {};
  data.forEach(a => {
    const p = a.plan || 'particular';
    revenueByPlan[p] = (revenueByPlan[p] || 0) + (Number(a.price) || 0);
  });

  const planLabels = Object.keys(revenueByPlan);
  const maxPlanVal = Math.max(...Object.values(revenueByPlan), 1);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
           <DollarSign className="text-green-600" /> Financeiro
        </h2>
        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
          <button onClick={() => setFilter('today')} className={`px-4 py-2 text-sm rounded-md transition-colors ${filter === 'today' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-500'}`}>Hoje</button>
          <button onClick={() => setFilter('month')} className={`px-4 py-2 text-sm rounded-md transition-colors ${filter === 'month' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-500'}`}>Este Mês</button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm rounded-md transition-colors ${filter === 'all' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-500'}`}>Total</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                 <DollarSign size={28} />
              </div>
              <div>
                 <p className="text-sm text-slate-500 font-medium">Faturamento ({filter === 'today' ? 'Hoje' : filter === 'month' ? 'Mensal' : 'Total'})</p>
                 <p className="text-2xl font-bold text-slate-900">R$ {totalRevenue.toFixed(2)}</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                 <Calendar size={28} />
              </div>
              <div>
                 <p className="text-sm text-slate-500 font-medium">Consultas Realizadas</p>
                 <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
                 <TrendingUp size={28} />
              </div>
              <div>
                 <p className="text-sm text-slate-500 font-medium">Ticket Médio</p>
                 <p className="text-2xl font-bold text-slate-900">R$ {totalCount > 0 ? (totalRevenue / totalCount).toFixed(2) : '0.00'}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Breakdown Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
             <PieChart size={20} className="text-blue-900" /> Faturamento por Convênio
           </h3>
           
           <div className="space-y-4">
             {planLabels.length === 0 && <p className="text-slate-400 text-center py-10">Sem dados financeiros.</p>}
             {planLabels.map(plan => {
               const val = revenueByPlan[plan];
               const percent = (val / totalRevenue) * 100;
               return (
                 <div key={plan}>
                   <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium text-slate-700">{plan.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-slate-900">R$ {val.toFixed(2)} ({percent.toFixed(1)}%)</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                   </div>
                 </div>
               )
             })}
           </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
           <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
             <CreditCard size={20} className="text-blue-900" /> Transações Recentes
           </h3>
           <div className="overflow-y-auto flex-1 max-h-[300px]">
             {data.length === 0 && <p className="text-slate-400 text-center py-10">Nenhuma transação.</p>}
             <div className="divide-y divide-slate-100">
               {data.slice(0, 10).map(apt => (
                 <div key={apt.id} className="py-3 flex justify-between items-center">
                    <div>
                       <p className="text-sm font-bold text-slate-800">{apt.patient?.name}</p>
                       <p className="text-xs text-slate-500 capitalize">{apt.plan?.replace(/_/g, ' ') || 'Particular'} • {new Date(apt.date).toLocaleDateString()}</p>
                    </div>
                    <span className="font-bold text-green-600 text-sm">+ R$ {Number(apt.price).toFixed(2)}</span>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
