import React, { useState, useRef, useEffect } from 'react';
import { api } from '../supabaseClient';
import { Patient, Address } from '../types';
import { X, Camera, Upload, Check, MapPin, Search, AlertCircle } from 'lucide-react';
import { useDialog } from './Dialog';

interface PatientEditModalProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Patient) => void;
}

export default function PatientEditModal({ patient, isOpen, onClose, onSave }: PatientEditModalProps) {
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Basic states from patient
  const [editP, setEditP] = useState({
    name: patient.name || '',
    cpf: patient.cpf || '',
    contact: patient.contact || '',
    dob: patient.dob || '',
    social_info: patient.social_info || '',
    photo_url: patient.photo_url || '',
    insurance_plan: patient.insurance_plan || 'Particular'
  });

  // Address State
  const [address, setAddress] = useState<Address>({
    cep: patient.address?.cep || '',
    street: patient.address?.street || '',
    number: patient.address?.number || '',
    complement: patient.address?.complement || '',
    neighborhood: patient.address?.neighborhood || '',
    city: patient.address?.city || '',
    state: patient.address?.state || ''
  });

  const [loadingCep, setLoadingCep] = useState(false);

  // Webcam State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Synchronize when patient prop changes
  useEffect(() => {
    setEditP({
      name: patient.name || '',
      cpf: patient.cpf || '',
      contact: patient.contact || '',
      dob: patient.dob || '',
      social_info: patient.social_info || '',
      photo_url: patient.photo_url || '',
      insurance_plan: patient.insurance_plan || 'Particular'
    });
    setAddress({
      cep: patient.address?.cep || '',
      street: patient.address?.street || '',
      number: patient.address?.number || '',
      complement: patient.address?.complement || '',
      neighborhood: patient.address?.neighborhood || '',
      city: patient.address?.city || '',
      state: patient.address?.state || ''
    });
    setError('');
  }, [patient, isOpen]);

  // Masks
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const maskCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
  };

  const handleCepBlur = async () => {
    const cep = address.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(prev => ({
            ...prev,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }));
        }
      } catch (e) {
        console.error("Erro CEP", e);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (e) {
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg');
        setEditP({ ...editP, photo_url: base64 });
        stopCamera();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditP({ ...editP, photo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: editP.name,
        cpf: editP.cpf,
        contact: editP.contact,
        dob: editP.dob ? editP.dob : null,
        social_info: editP.social_info,
        photo_url: editP.photo_url || null,
        insurance_plan: editP.insurance_plan,
        address: address
      };

      const { error: apiError } = await api.updatePatient(patient.id, payload);
      if (apiError) throw apiError;
      
      onSave({
        ...patient,
        ...payload
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao atualizar paciente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Modal Header */}
        <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Editar Paciente</h2>
            <p className="text-slate-500 text-xs">Atualize os dados cadastrais do paciente.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Photo Section */}
          <div className="flex flex-col items-center justify-center space-y-3">
            {isCameraOpen ? (
              <div className="relative w-64 h-48 bg-black rounded-xl overflow-hidden shadow-md">
                <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" onLoadedMetadata={() => videoRef.current?.play()} />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <button type="button" onClick={stopCamera} className="bg-red-500 p-2 rounded-full text-white hover:bg-red-600 shadow-md">
                    <X size={16}/>
                  </button>
                  <button type="button" onClick={capturePhoto} className="bg-green-500 p-2 rounded-full text-white hover:bg-green-600 shadow-md">
                    <Check size={16}/>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-28 h-28 rounded-full bg-slate-100 border-4 border-slate-200 shadow-md overflow-hidden group">
                {editP.photo_url ? (
                  <img src={editP.photo_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-300">
                    <Camera size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-white">
                  <button type="button" onClick={startCamera} className="text-[10px] font-semibold hover:text-blue-200 flex flex-col items-center">
                    <Camera size={16} /> Tirar Foto
                  </button>
                  <label className="text-[10px] font-semibold hover:text-blue-200 flex flex-col items-center cursor-pointer">
                    <Upload size={16} /> Upload
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
            )}
            
            {!isCameraOpen && (
              <div className="flex gap-4 text-xs font-semibold">
                <button type="button" onClick={startCamera} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Camera size={14}/> Tirar Foto
                </button>
                <label className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer">
                  <Upload size={14}/> Upload
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
              <input required 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800" 
                value={editP.name} onChange={e => setEditP({...editP, name: e.target.value})} placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label>
              <input 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800 font-mono" 
                value={editP.cpf} 
                onChange={e => setEditP({...editP, cpf: maskCPF(e.target.value)})} 
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Nascimento *</label>
              <input type="date" required 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800" 
                value={editP.dob} onChange={e => setEditP({...editP, dob: e.target.value})} 
              />
            </div>
            <div className="md:col-span-2 snap-none">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contato</label>
              <input 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800" 
                value={editP.contact} 
                onChange={e => setEditP({...editP, contact: maskPhone(e.target.value)})} 
                placeholder="(81) 9.9999-9999"
                maxLength={16}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plano de Saúde</label>
              <select 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800"
                value={editP.insurance_plan}
                onChange={e => setEditP({...editP, insurance_plan: e.target.value})}
              >
                <option value="Particular">Particular</option>
                <option value="HapVida">HapVida</option>
                <option value="Unimed">Unimed</option>
                <option value="Sulamerica">Sulamerica</option>
                <option value="Select">Select</option>
                <option value="Life">Life</option>
                <option value="Cartão São Gabriel">Cartão São Gabriel</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Address Section */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-blue-900"/> Endereço
              </h3>
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">CEP</label>
                  <div className="relative">
                    <input 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800 font-mono" 
                      value={address.cep} 
                      onChange={e => setAddress({...address, cep: maskCEP(e.target.value)})} 
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                    />
                    {loadingCep && <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-blue-900"><Search size={12}/></div>}
                  </div>
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Rua / Logradouro</label>
                  <input 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800" 
                    value={address.street} 
                    onChange={e => setAddress({...address, street: e.target.value})} 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Número</label>
                  <input 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800" 
                    value={address.number} 
                    onChange={e => setAddress({...address, number: e.target.value})} 
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Bairro</label>
                  <input 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800" 
                    value={address.neighborhood} 
                    onChange={e => setAddress({...address, neighborhood: e.target.value})} 
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Cidade</label>
                  <input 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800" 
                    value={address.city} 
                    onChange={e => setAddress({...address, city: e.target.value})} 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">UF</label>
                  <input 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800 uppercase" 
                    value={address.state} 
                    onChange={e => setAddress({...address, state: e.target.value})} 
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Informações Sociais</label>
              <textarea rows={3} 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none transition-all text-sm text-slate-800 resize-none" 
                value={editP.social_info} onChange={e => setEditP({...editP, social_info: e.target.value})} 
                placeholder="Descreva o contexto social, familiar e profissional..." 
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex gap-3 border-t border-slate-100 bg-white sticky bottom-0 z-10">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-2.5 bg-slate-100 rounded-lg text-slate-700 font-bold hover:bg-slate-200 transition-colors text-sm">
              Cancelar
            </button>
            <button disabled={loading} type="submit" className="flex-1 py-2.5 bg-blue-900 rounded-lg text-white font-bold hover:bg-blue-800 transition-colors shadow-md text-sm">
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
