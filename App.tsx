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
import { DialogProvider } from './components/Dialog';

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

  // Check LocalStorage session on load with Safety Try/Catch
  useEffect(() => {
    try {
      const stored = localStorage.getItem('genesis_user');
      // Verify if stored is a valid non-undefined string
      if (stored && stored !== "undefined" && stored !== "null") {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          setUser(parsed);
        } else {
          // Invalid object structure
          localStorage.removeItem('genesis_user');
        }
      }
    } catch (e) {
      console.error("Storage corrupted, clearing...", e);
      localStorage.removeItem('genesis_user');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll notifications if user is logged in
  useEffect(() => {
    if (user) {
      const fetchNotifs = async () => {
        try {
          const { data } = await api.getNotifications(user.id);
          if (data) setNotifications(data as Notification[]);
        } catch (e) {
          console.error("Failed to fetch notifications", e);
        }
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

    if (error || !data) throw new Error('Falha no login. Verifique suas credenciais.');
    
    setUser(data as User);
    localStorage.setItem('genesis_user', JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    setNotifications([]);
    localStorage.removeItem('genesis_user');
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white flex-col gap-4">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p>Iniciando Genesis...</p>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, notifications, setNotifications }}>
      <DialogProvider>
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
      </DialogProvider>
    </AuthContext.Provider>
  );
}