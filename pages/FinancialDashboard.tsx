import React, { useEffect, useState } from 'react';
import { api } from '../supabaseClient';
import { Appointment } from '../types';
import { DollarSign, TrendingUp, Calendar, CreditCard, PieChart, Printer, CheckCircle, Clock, RotateCcw } from 'lucide-react';
import { useAuth } from '../App';
import { useDialog } from '../components/Dialog';

export default function FinancialDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // Date Filter
  const [filter, setFilter] = useState<'today' | 'month' | 'all'>('month');
  // Status Filter: 'all' | 'completed' (Paid) | 'scheduled' (Pending)
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'completed' | 'scheduled'>('all');
  
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const dialog = useDialog();

  const LOGO_URL = "https://i.ibb.co/n8rLsXSJ/upscalemedia-transformed-1.png";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await api.getAppointments();
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  };

  const toggleStatus = async (apt: Appointment) => {
    const newStatus = apt.status === 'completed' ? 'scheduled' : 'completed';
    const actionName = newStatus === 'completed' ? 'MARCAR COMO PAGO' : 'MARCAR COMO PENDENTE';
    
    // Optimistic Update
    setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: newStatus } : a));

    try {
        await api.updateAppointment(apt.id, { status: newStatus });
    } catch (e) {
        // Rollback
        setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: apt.status } : a));
        dialog.alert("Erro", "Não foi possível atualizar o status financeiro.");
    }
  };

  const getFilteredData = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return appointments
      .filter(a => a.status !== 'cancelled') // Exclude cancelled from financials by default
      .filter(a => {
        // 1. Filter by Date
        const aDate = new Date(a.date);
        let dateMatch = true;
        if (filter === 'today') dateMatch = a.date === today;
        if (filter === 'month') dateMatch = aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear;
        
        // 2. Filter by Status (Payment)
        let statusMatch = true;
        if (paymentStatus === 'completed') statusMatch = a.status === 'completed';
        if (paymentStatus === 'scheduled') statusMatch = a.status === 'scheduled';
        
        return dateMatch && statusMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
        dialog.alert("Bloqueio", "Permita popups para imprimir.");
        return;
    }

    const reportDate = new Date().toLocaleDateString('pt-BR');
    
    // Convert current filters to text
    const periodText = filter === 'today' ? 'Hoje' : filter === 'month' ? 'Mês Atual' : 'Todo o Período';
    const statusText = paymentStatus === 'all' ? 'Todos' : paymentStatus === 'completed' ? 'Realizados (Pagos)' : 'Pendentes (Agendados)';

    const rowsHtml = data.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(item.date).toLocaleDateString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.patient?.name || 'N/A'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">Dr. ${item.doctor?.name || 'N/A'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-transform: capitalize;">${item.plan || 'Particular'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                <span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${item.status === 'completed' ? '#dcfce7; color: #166534;' : '#fef3c7; color: #b45309;'}">
                    ${item.status === 'completed' ? 'PAGO' : 'PENDENTE'}
                </span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">R$ ${Number(item.price).toFixed(2)}</td>
        </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <title>Extrato Financeiro - Genesis</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; background: #f3f4f6; padding: 10px; border-bottom: 2px solid #ddd; font-weight: bold; text-transform: uppercase; }
          .totals { margin-top: 30px; text-align: right; font-size: 16px; }
          .badge { font-weight: bold; background: #eee; padding: 4px 8px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
           <div style="display:flex; align-items:center; gap: 15px;">
              <img src="${LOGO_URL}" style="height: 40px;" />
              <div>
                  <h1>Extrato Financeiro</h1>
                  <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Genesis Medical System</p>
              </div>
           </div>
           <div style="text-align: right; font-size: 12px;">
              <p>Gerado em: <b>${reportDate}</b></p>
              <p>Período: <b>${periodText}</b></p>
              <p>Status: <b>${statusText}</b></p>
           </div>
        </div>

        <table>
           <thead>
              <tr>
                 <th>Data</th>
                 <th>Paciente</th>
                 <th>Médico</th>
                 <th>Convênio</th>
                 <th>Status</th>
                 <th style="text-align: right;">Valor</th>
              </tr>
           </thead>
           <tbody>
              ${rowsHtml}
           </tbody>
        </table>

        <div class="totals">
           <p>Quantidade de Registros: <b>${totalCount}</b></p>
           <p style="font-size: 20px;">Valor Total: <b style="color: #166534;">R$ ${totalRevenue.toFixed(2)}</b></p>
        </div>

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="text-green-600" /> Dashboard Financeiro
           </h2>
           <p className="text-slate-500 text-sm">Visão geral de faturamento e fluxo de caixa</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
           {/* Date Filters */}
           <div className="flex bg-white rounded-lg p-1 border border-slate-200">
             <button onClick={() => setFilter('today')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'today' ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'text-slate-500 hover:text-slate-700'}`}>Hoje</button>
             <button onClick={() => setFilter('month')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'month' ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'text-slate-500 hover:text-slate-700'}`}>Mês</button>
             <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'text-slate-500 hover:text-slate-700'}`}>Total</button>
           </div>
           
           {/* Status Filters */}
           <div className="flex bg-white rounded-lg p-1 border border-slate-200">
             <button onClick={() => setPaymentStatus('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${paymentStatus === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
             <button onClick={() => setPaymentStatus('completed')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${paymentStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-500 hover:text-slate-700'}`}>Realizados</button>
             <button onClick={() => setPaymentStatus('scheduled')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${paymentStatus === 'scheduled' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'text-slate-500 hover:text-slate-700'}`}>Pendentes</button>
           </div>

           <button 
             onClick={handlePrintReport} 
             className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all"
           >
              <Printer size={14} /> Imprimir Extrato
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <DollarSign size={100} />
           </div>
           <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                 <DollarSign size={28} />
              </div>
              <div>
                 <p className="text-sm text-slate-500 font-medium">Valor Total</p>
                 <p className="text-3xl font-bold text-slate-900">R$ {totalRevenue.toFixed(2)}</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
           <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                 <Calendar size={28} />
              </div>
              <div>
                 <p className="text-sm text-slate-500 font-medium">Qtd. Registros</p>
                 <p className="text-3xl font-bold text-slate-900">{totalCount}</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
           <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
                 <TrendingUp size={28} />
              </div>
              <div>
                 <p className="text-sm text-slate-500 font-medium">Ticket Médio</p>
                 <p className="text-3xl font-bold text-slate-900">R$ {totalCount > 0 ? (totalRevenue / totalCount).toFixed(2) : '0.00'}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
           <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
             <PieChart size={20} className="text-blue-900" /> Por Convênio
           </h3>
           
           <div className="space-y-5">
             {planLabels.length === 0 && <p className="text-slate-400 text-center py-4">Sem dados para o período.</p>}
             {planLabels.map(plan => {
               const val = revenueByPlan[plan];
               const percent = totalRevenue > 0 ? (val / totalRevenue) * 100 : 0;
               return (
                 <div key={plan}>
                   <div className="flex justify-between text-xs mb-1.5 uppercase font-bold tracking-wide">
                      <span className="text-slate-600">{plan.replace(/_/g, ' ')}</span>
                      <span className="text-slate-900">{percent.toFixed(1)}%</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                   </div>
                   <p className="text-xs text-right text-slate-400">R$ {val.toFixed(2)}</p>
                 </div>
               )
             })}
           </div>
        </div>

        {/* Detailed Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
           <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CreditCard size={20} className="text-blue-900" /> Detalhamento de Transações
              </h3>
              <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">
                 {data.length} registros
              </span>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold">
                 <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Paciente</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Plano</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {data.length === 0 && (
                    <tr>
                       <td colSpan={5} className="px-6 py-10 text-center text-slate-400">Nenhum registro encontrado para os filtros selecionados.</td>
                    </tr>
                  )}
                  {data.map(apt => (
                    <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {new Date(apt.date).toLocaleDateString()}
                          <span className="block text-[10px] text-slate-400">{apt.start_time}</span>
                       </td>
                       <td className="px-6 py-4 font-medium text-slate-800">
                          {apt.patient?.name || 'Paciente Removido'}
                          <span className="block text-[10px] text-slate-400 font-normal">Dr. {apt.doctor?.name}</span>
                       </td>
                       <td className="px-6 py-4">
                          <button 
                            onClick={() => toggleStatus(apt)}
                            className={`
                              inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 cursor-pointer border
                              ${apt.status === 'completed' 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' 
                                : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'}
                            `}
                            title={apt.status === 'completed' ? "Clique para marcar como Pendente" : "Clique para marcar como Pago"}
                          >
                             {apt.status === 'completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                             {apt.status === 'completed' ? 'Pago' : 'Pendente'}
                          </button>
                       </td>
                       <td className="px-6 py-4 capitalize text-slate-600">{apt.plan?.replace(/_/g, ' ') || 'Particular'}</td>
                       <td className="px-6 py-4 text-right font-bold text-slate-700">R$ {Number(apt.price).toFixed(2)}</td>
                    </tr>
                  ))}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
}