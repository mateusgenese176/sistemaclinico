import { createClient } from '@supabase/supabase-js';

// Provided keys
const SUPABASE_URL = 'https://qwjbueqfirnnxqyeqgyz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3amJ1ZXFmaXJubnhxeWVxZ3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzY4OTAsImV4cCI6MjA3OTUxMjg5MH0.zcvNfDJ5N7mcpPz4tF61oBFzsN5tTu1TqOw2lS4bg3g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Schema creation script including RPC functions for safe deletion
export const SCHEMA_SQL = `
-- 1. Create Tables (Idempotent)
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null,
  role text not null check (role in ('admin', 'doctor', 'receptionist')),
  name text not null,
  crm text,
  created_at timestamptz default now()
);

create table if not exists patients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  dob date,
  cpf text,
  contact text,
  social_info text,
  tags text[],
  anthropometrics jsonb default '{}'::jsonb,
  photo_url text,
  created_at timestamptz default now()
);

-- Fix Columns if missing
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name='patients' and column_name='photo_url') then 
    alter table patients add column photo_url text; 
  end if; 
  if not exists (select 1 from information_schema.columns where table_name='anamneses' and column_name='status') then 
    alter table anamneses add column status text default 'final'; 
  end if;
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='crm') then 
    alter table users add column crm text; 
  end if;
end $$;

create table if not exists appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references users(id) on delete cascade,
  date date not null,
  start_time text not null,
  type text not null,
  status text default 'scheduled',
  created_at timestamptz default now()
);

create table if not exists anamneses (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references users(id) on delete cascade,
  soap jsonb not null,
  status text default 'final',
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references users(id) on delete cascade,
  receiver_id uuid references users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- 2. INITIAL ADMIN (If not exists)
insert into users (username, password, role, name) 
values ('admin', 'admin', 'admin', 'Administrator') 
on conflict (username) do nothing;

-- 3. RLS POLICIES (Allow all for this demo app)
-- We drop first to avoid "policy already exists" errors
alter table users enable row level security;
drop policy if exists "Public access users" on users;
create policy "Public access users" on users for all using (true);

alter table patients enable row level security;
drop policy if exists "Public access patients" on patients;
create policy "Public access patients" on patients for all using (true);

alter table appointments enable row level security;
drop policy if exists "Public access appointments" on appointments;
create policy "Public access appointments" on appointments for all using (true);

alter table anamneses enable row level security;
drop policy if exists "Public access anamneses" on anamneses;
create policy "Public access anamneses" on anamneses for all using (true);

alter table messages enable row level security;
drop policy if exists "Public access messages" on messages;
create policy "Public access messages" on messages for all using (true);

alter table notifications enable row level security;
drop policy if exists "Public access notifications" on notifications;
create policy "Public access notifications" on notifications for all using (true);

-- 4. POWERFUL DELETE FUNCTIONS (RPC)
-- Function to delete a user and EVERYTHING related to them safely
create or replace function delete_user_fully(target_id uuid)
returns void as $$
begin
  delete from notifications where user_id = target_id;
  delete from messages where sender_id = target_id or receiver_id = target_id;
  delete from appointments where doctor_id = target_id;
  delete from anamneses where doctor_id = target_id;
  delete from users where id = target_id;
end;
$$ language plpgsql security definer;

-- Function to delete a patient and EVERYTHING related to them safely
create or replace function delete_patient_fully(target_id uuid)
returns void as $$
begin
  delete from appointments where patient_id = target_id;
  delete from anamneses where patient_id = target_id;
  delete from patients where id = target_id;
end;
$$ language plpgsql security definer;
`;

export const api = {
  // Users
  getUsers: async () => supabase.from('users').select('*'),
  createUser: async (user: any) => supabase.from('users').insert(user),
  updateUser: async (id: string, updates: any) => supabase.from('users').update(updates).eq('id', id),
  
  deleteUser: async (id: string) => {
    // Try the "Nuclear Option" first (RPC Function)
    const { error } = await supabase.rpc('delete_user_fully', { target_id: id });
    
    if (error) {
      console.warn("RPC delete failed (SQL not updated?), trying manual cascade...", error);
      // Fallback: Manual cleanup attempt from client side (less reliable due to permissions/network)
      await supabase.from('notifications').delete().eq('user_id', id);
      await supabase.from('messages').delete().or(`sender_id.eq.${id},receiver_id.eq.${id}`);
      await supabase.from('appointments').delete().eq('doctor_id', id);
      await supabase.from('anamneses').delete().eq('doctor_id', id);
      return await supabase.from('users').delete().eq('id', id);
    }
    return { error };
  },
  
  // Patients
  getPatients: async () => supabase.from('patients').select('*').order('name'),
  getPatient: async (id: string) => supabase.from('patients').select('*').eq('id', id).single(),
  createPatient: async (patient: any) => supabase.from('patients').insert(patient),
  updatePatient: async (id: string, updates: any) => supabase.from('patients').update(updates).eq('id', id),
  
  deletePatient: async (id: string) => {
     // Try RPC first
     const { error } = await supabase.rpc('delete_patient_fully', { target_id: id });

     if (error) {
       console.warn("RPC delete failed, trying manual...", error);
       await supabase.from('appointments').delete().eq('patient_id', id);
       await supabase.from('anamneses').delete().eq('patient_id', id);
       return await supabase.from('patients').delete().eq('id', id);
     }
     return { error };
  },
  
  // Appointments
  getAppointments: async (date: string) => 
    supabase.from('appointments')
      .select('*, patient:patients(name), doctor:users(name)')
      .eq('date', date),
  
  createAppointment: async (apt: any) => {
    if (apt.doctor_id) {
      await supabase.from('notifications').insert({
        user_id: apt.doctor_id,
        content: `Nova consulta marcada: ${apt.date} às ${apt.start_time}`,
      });
    }
    return supabase.from('appointments').insert(apt);
  },
  
  updateAppointment: async (id: string, updates: any) => supabase.from('appointments').update(updates).eq('id', id),
  deleteAppointment: async (id: string) => supabase.from('appointments').delete().eq('id', id),

  // Anamnesis
  getAnamneses: async (patientId: string) => 
    supabase.from('anamneses')
      .select('*, doctor:users(name, crm)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
  
  getAnamnesis: async (id: string) => supabase.from('anamneses').select('*').eq('id', id).single(),
  createAnamnesis: async (data: any) => supabase.from('anamneses').insert(data).select(), 
  updateAnamnesis: async (id: string, data: any) => supabase.from('anamneses').update(data).eq('id', id),
  deleteAnamnesis: async (id: string) => supabase.from('anamneses').delete().eq('id', id),

  // Chat
  getMessages: async (user1: string, user2: string) => {
    // Get messages between two users (sent by A to B OR sent by B to A)
    return supabase
      .from('messages')
      .select('*, sender:users(name)')
      .or(`and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`)
      .order('created_at', { ascending: true })
      .limit(100);
  },
  
  sendMessage: async (msg: any) => supabase.from('messages').insert(msg),

  // Notifications
  getNotifications: async (userId: string) => 
    supabase.from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false }),
  
  markNotificationRead: async (id: string) => supabase.from('notifications').update({ read: true }).eq('id', id),
  markAllNotificationsRead: async (userId: string) => supabase.from('notifications').update({ read: true }).eq('user_id', userId),
};