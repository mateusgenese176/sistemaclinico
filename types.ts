export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  RECEPTIONIST = 'receptionist'
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  crm?: string; // Doctor's medical license number
  created_at?: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  cpf: string;
  contact: string;
  social_info: string;
  tags?: string[]; // stored as text[] in supabase
  anthropometrics?: Anthropometrics;
  photo_url?: string; // Base64 string or URL
}

export interface Anthropometrics {
  weight?: number;
  height?: number;
  bmi?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  type: 'first' | 'return' | 'continuity';
  status: 'scheduled' | 'completed' | 'cancelled';
  patient?: Patient; // Joined
  doctor?: User; // Joined
}

export interface Anamnesis {
  id: string;
  patient_id: string;
  doctor_id: string;
  soap: {
    s: string;
    o: string;
    a: string;
    p: string;
  };
  status: 'draft' | 'final';
  created_at: string;
  doctor?: User;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  receiver_id?: string; // Null for public channel
  content: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  content: string;
  read: boolean;
  created_at: string;
}