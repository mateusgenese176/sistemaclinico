import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, api } from './supabaseClient';
import { User, Notification, UserRole } from './types';
import Login from './pages/Login';
import Layout from './components/Layout';
import AdminPage from './pages/Admin';
import CalendarPage from './pages/Calendar';
import PatientsPage from './pages/Patients';
import PatientCreate from './pages/PatientCreate';
import PatientProfile from './pages/PatientProfile';
import UserProfile from './pages/UserProfile';
import Dashboard from './pages/Dashboard';
import AnamnesisSession from './pages/AnamnesisSession';

// Auth Context
interface AuthContextType {
  user: User | null;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Check LocalStorage session on load
  useEffect(() => {
    const stored = localStorage.getItem('genesis_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  // Poll notifications if user is logged in (Simple approach instead of another realtime sub for now)
  useEffect(() => {
    if (user) {
      const fetchNotifs = async () => {
        const { data } = await api.getNotifications(user.id);
        if (data) setNotifications(data as Notification[]);
      };
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const login = async (username: string, pass: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', pass) // In prod, use hashing
      .single();

    if (error || !data) throw new Error('Failed');
    
    setUser(data as User);
    localStorage.setItem('genesis_user', JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('genesis_user');
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">Carregando Genesis...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout, notifications, setNotifications }}>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          
          {/* Protected Routes */}
          {user ? (
            <>
              {/* Specialized Full Screen Routes */}
              <Route path="/anamnesis/session/:patientId" element={<AnamnesisSession />} />
              
              {/* Layout Routes */}
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/patients" element={<PatientsPage />} />
                    <Route path="/patients/new" element={<PatientCreate />} />
                    <Route path="/patients/:id" element={<PatientProfile />} />
                    <Route path="/profile" element={<UserProfile />} />
                    <Route path="/admin" element={user.role === UserRole.ADMIN ? <AdminPage /> : <Navigate to="/dashboard" />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </Layout>
              } />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}