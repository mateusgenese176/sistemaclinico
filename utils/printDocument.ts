import { MedicalDocument, Patient, User, PrescriptionItem } from '../types';

export const HEADER_LOGO_URL = "https://i.ibb.co/sJR9zQKt/upscalemedia-transformed-1.png";

export function printMedicalDocument(doc: MedicalDocument, patient: Patient, doctor: User) {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) return;

  const docDate = new Date(doc.created_at || Date.now()).toLocaleDateString('pt-BR');
  
  const calculateAge = (dob?: string) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' anos';
  };

  let title = 'Documento Médico';
  let contentHtml = '';

  if (doc.type === 'prescription' && doc.content.items) {
    title = 'Receituário';
    const groupedItems: Record<string, PrescriptionItem[]> = {};
    doc.content.items.forEach(item => {
      const mode = item.usageMode || 'Uso Geral';
      if (!groupedItems[mode]) groupedItems[mode] = [];
      groupedItems[mode].push(item);
    });

    contentHtml = Object.entries(groupedItems).map(([mode, items]) => `
      <div style="margin-bottom: 25px; page-break-inside: avoid;">
        <div style="text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; font-size: 14px; text-decoration: underline; color: #1e3a8a;">
           ${mode}
        </div>
        <div class="space-y-4">
           ${items.map(item => `
              <div class="mb-6">
                 <div class="flex items-end text-lg font-bold uppercase text-slate-900">
                    <span style="flex-shrink: 0; padding-right: 5px;">${item.medication}</span>
                    <span style="flex-grow: 1; border-bottom: 2px dotted #94a3b8; margin: 0 5px; position: relative; top: -5px;"></span>
                    <span style="flex-shrink: 0; padding-left: 5px;">${item.quantity}</span>
                 </div>
                 <div class="text-sm pl-0 mt-2 text-slate-700 font-medium" style="line-height: 1.4;">${item.dosage}</div>
              </div>
           `).join('')}
        </div>
      </div>
    `).join('');

  } else if (doc.type === 'referral') {
    title = 'Encaminhamento';
    contentHtml = `<div class="prose max-w-none text-justify leading-relaxed whitespace-pre-wrap text-base font-medium text-slate-800">${doc.content.text || ''}</div>`;

  } else if (doc.type === 'exam') {
    const isLab = doc.content.examCategory !== 'imagem';
    title = isLab ? 'Solicitação de Exames Laboratoriais' : 'Solicitação de Exame de Imagem';
    
    // Combine selectedExams and customExams split by comma
    const customList = (doc.content.customExams || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const allExams = Array.from(new Set([...(doc.content.selectedExams || []), ...customList]));

    if (isLab) {
      // Laboratorial: Listed numerically, up to 3 columns dispostos
      contentHtml = `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
            Solicitação de Exames Laboratoriais
          </h2>
          <div style="columns: 3; column-gap: 25px; word-break: break-word;">
            ${allExams.map((exam, idx) => `
              <div style="break-inside: avoid; margin-bottom: 12px; font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.4;">
                <span style="color: #1e3a8a; font-weight: bold; margin-right: 4px;">${idx + 1}.</span> ${exam}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Imagem: Each exam listed clearly with spacing/page-break-inside: avoid
      contentHtml = `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
            Solicitação de Exame(s) de Imagem
          </h2>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${allExams.map((exam, idx) => `
              <div style="padding: 14px 18px; background-color: #f8fafc; border-left: 4px solid #1e3a8a; border-radius: 6px; page-break-inside: avoid;">
                <div style="font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase;">
                  ${idx + 1}. ${exam}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title} - ${patient.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
         @page { size: A4; margin: 0; }
         body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; background: white; }
         .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60%; opacity: 0.10; z-index: 0; pointer-events: none; }
         .header-fixed { position: fixed; top: 0; left: 0; right: 0; height: 3.5cm; background: white; z-index: 10; padding: 1cm 2cm 0 2cm; display: flex; align-items: center; gap: 1.5rem; }
         .footer-fixed { position: fixed; bottom: 0; left: 0; right: 0; height: 2.5cm; background: white; z-index: 10; text-align: center; font-size: 10px; color: #1e3a8a; font-weight: bold; padding: 0.5cm 2cm 1cm 2cm; display: flex; flex-direction: column; justify-content: flex-end; }
         .content-wrap { padding-top: 4cm; padding-bottom: 3cm; padding-left: 2cm; padding-right: 2cm; position: relative; z-index: 5; display: flex; flex-direction: column; min-height: 25cm; }
         .signature-box { margin-top: auto; padding-top: 2cm; display: flex; justify-content: center; page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <img src="${HEADER_LOGO_URL}" class="watermark" />
      <div class="header-fixed">
         <img src="${HEADER_LOGO_URL}" class="h-20 w-auto object-contain" />
         <div>
            <h1 class="text-xl font-bold text-slate-900 uppercase tracking-widest">${title}</h1>
            <p class="text-sm text-slate-600">Paciente: <b class="text-slate-900 uppercase">${patient.name}</b></p>
            <p class="text-sm text-slate-600">Idade: ${calculateAge(patient.dob)} • Data: ${docDate}</p>
         </div>
      </div>
      <div class="footer-fixed">
         <p>Av. José Veríssimo, 752 - Maurício de Nassau</p>
         <p>Fones: (81) 3727-7250 | 9 9642-0590 (Recepção) | 9 9102-5771 (Autorização) | 9 7328-0845 (Financeiro)</p>
         <p>CEP 55.014-250 - Caruaru - PE</p>
      </div>
      <div class="content-wrap">
         <div>${contentHtml}</div>
         <div class="signature-box">
            <div class="text-center border-t border-slate-800 pt-2 px-12 min-w-[300px]">
               <p class="font-bold text-slate-900">Dr. ${doctor.name}</p>
               <p class="text-sm text-slate-600">CRM: ${doctor.crm || ''}</p>
            </div>
         </div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}
