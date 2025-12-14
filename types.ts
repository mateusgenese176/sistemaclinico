
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

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  cpf: string;
  contact: string;
  social_info: string;
  address?: Address; // New Address field
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
  plan?: string; // 'particular', 'unimed', etc.
  price?: number;
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

export interface PrescriptionItem {
  medication: string;
  quantity: string;
  dosage: string;
  usageMode?: string; // e.g., 'Uso Oral', 'Uso Tópico'
}

export interface MedicalDocument {
  id: string;
  patient_id: string;
  doctor_id: string;
  type: 'prescription' | 'referral'; // Receituário ou Encaminhamento
  content: {
    items?: PrescriptionItem[]; // Para receituário
    text?: string; // Para encaminhamento (HTML Rich Text)
  }; 
  created_at: string;
  doctor?: User;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  receiver_id?: string; // Null for public channel
  content: string;
  is_urgent?: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  content: string;
  read: boolean;
  created_at: string;
}