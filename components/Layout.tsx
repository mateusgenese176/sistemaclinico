import React, { useState } from 'react';
import { 
  Menu, Calendar, Users, FileText, UserPlus, 
  LogOut, Bell, ChevronLeft, ChevronRight, UserCircle, Home, CheckCircle, X
} from 'lucide-react';
import { useAuth } from '../App';
import ChatWidget from './Chat';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../supabaseClient';

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { user, logout, notifications, setNotifications } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'Agenda', path: '/calendar' },
    { icon: Users, label: 'Pacientes', path: '/patients' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ icon: UserPlus, label: 'Usuários', path: '/admin' });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllRead = async () => {
    if(user) {
      await api.markAllNotificationsRead(user.id);
      setNotifications([]);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transform transition-all duration-300 ease-in-out shadow-xl
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:relative md:translate-x-0
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span className="text-3xl text-blue-400">⚕</span> Genesis
                </h1>
                <p className="text-xs text-slate-400 mt-1">Medical System</p>
              </div>
            )}
             {collapsed && <span className="text-3xl text-blue-400">⚕</span>}

            {/* Desktop Collapse Toggle */}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex bg-slate-800 p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-2 mt-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${location.pathname.startsWith(item.path) 
                    ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/40' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : ''}
              >
                <item.icon size={22} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Footer User Profile */}
          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <Link 
              to="/profile"
              className={`flex items-center gap-3 mb-4 px-2 rounded-lg hover:bg-slate-800 p-2 transition-colors cursor-pointer ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-blue-700 flex items-center justify-center font-bold text-lg text-white shadow-md">
                {user?.name.charAt(0)}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate text-white">{user?.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{user?.role === 'receptionist' ? 'Atendente' : user?.role === 'doctor' ? 'Médico' : 'Admin'}</p>
                </div>
              )}
            </Link>
            
            <button 
              onClick={handleLogout}
              className={`flex items-center gap-2 w-full px-2 py-2 text-sm text-red-300 hover:text-white hover:bg-red-900/20 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
              title="Sair"
            >
              <LogOut size={20} />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Mobile */}
        <header className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center z-40 border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-blue-900">
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-900 text-lg">Genesis</span>
          <div className="w-6"></div> 
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 relative bg-slate-50">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Floating Widgets */}
        <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50">
           {/* Notification Badge */}
           {notifications.length > 0 && (
            <div className="bg-white p-3 rounded-full shadow-lg border border-slate-100 relative group cursor-pointer hover:scale-105 transition-transform">
              <Bell className="text-blue-600" size={24} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                {notifications.length}
              </span>
              
              {/* Notification Popover */}
              <div className="absolute bottom-full right-0 mb-3 w-80 bg-white rounded-xl shadow-xl border border-slate-100 hidden group-hover:block p-0 text-sm overflow-hidden">
                <div className="bg-slate-800 px-4 py-3 flex justify-between items-center">
                  <h3 className="font-bold text-white">Notificações</h3>
                  <button onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }} className="text-xs text-blue-300 hover:text-white flex items-center gap-1">
                    <CheckCircle size={12}/> Marcar todas
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-600 flex justify-between items-start gap-2 relative group/item">
                      <span className="flex-1">{n.content}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                        className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <ChatWidget />
        </div>
      </div>
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}