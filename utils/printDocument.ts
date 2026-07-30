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

  const formatPatientAddress = (p: Patient) => {
    if (!p.address) return '__________________________________________________________________________';
    const a = p.address;
    if (typeof a === 'string') return a;
    const parts = [];
    if (a.street) parts.push(`${a.street}${a.number ? ', ' + a.number : ''}`);
    if (a.neighborhood) parts.push(a.neighborhood);
    if (a.city) parts.push(`${a.city}${a.state ? '-' + a.state : ''}`);
    if (a.cep) parts.push(`CEP: ${a.cep}`);
    return parts.join(' - ') || '__________________________________________________________________________';
  };

  if (doc.type === 'special_prescription') {
    // RECEITUÁRIO DE CONTROLE ESPECIAL (DUAS VIAS)
    const patientAddressStr = formatPatientAddress(patient);
    
    const itemsHtml = (doc.content.items || []).map((item, idx) => `
      <div style="margin-bottom: 18px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; text-transform: uppercase; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px;">
          <span>${idx + 1}. ${item.medication}</span>
          <span>${item.quantity}</span>
        </div>
        <div style="font-size: 12px; margin-top: 4px; color: #334155; line-height: 1.4; padding-left: 10px;">
          ${item.usageMode ? `<b>${item.usageMode}:</b> ` : ''}${item.dosage}
        </div>
      </div>
    `).join('');

    const renderVia = (viaNum: 1 | 2) => `
      <div class="special-page" style="page-break-after: ${viaNum === 1 ? 'always' : 'avoid'}; min-height: 27cm; padding: 1.2cm 1.5cm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; background: white;">
        <div>
          <!-- Header Title -->
          <h1 style="text-align: center; font-size: 18px; font-weight: 800; font-family: sans-serif; text-transform: uppercase; margin: 0 0 16px 0; letter-spacing: 0.5px; color: #0f172a;">
            RECEITUÁRIO DE CONTROLE ESPECIAL
          </h1>

          <!-- Top Section: Emitente Box & Via Indicator -->
          <div style="display: flex; gap: 15px; margin-bottom: 20px; align-items: stretch;">
            <!-- Box Emitente -->
            <div style="flex: 1; border: 1.5px solid #1e293b; border-radius: 10px; padding: 10px 14px; text-align: center; background: #fff;">
              <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #1e293b; padding-bottom: 3px; margin-bottom: 6px; letter-spacing: 0.5px; color: #0f172a;">
                IDENTIFICAÇÃO DO EMITENTE
              </div>
              <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
                Dr(a). ${doctor.name}
              </div>
              <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                Medicina | CRM ${doctor.crm || ''}
              </div>
              <div style="font-size: 10.5px; line-height: 1.35; color: #475569;">
                Av. José Veríssimo, 752 - Maurício de Nassau - Caruaru / PE<br/>
                Telefones: (81) 3727-7250 / 9 9642-0590
              </div>
            </div>

            <!-- Via Indicator -->
            <div style="width: 130px; display: flex; flex-direction: column; justify-content: center; gap: 8px;">
              <div style="border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 4px 0; text-align: center; ${viaNum === 1 ? 'background-color: #f1f5f9;' : 'opacity: 0.4;'}">
                <div style="font-size: 12px; font-weight: 800;">1ª VIA</div>
                <div style="font-size: 10px; font-weight: 700;">FARMÁCIA</div>
              </div>
              <div style="border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 4px 0; text-align: center; ${viaNum === 2 ? 'background-color: #f1f5f9;' : 'opacity: 0.4;'}">
                <div style="font-size: 12px; font-weight: 800;">2ª VIA</div>
                <div style="font-size: 10px; font-weight: 700;">PACIENTE</div>
              </div>
            </div>
          </div>

          <!-- Patient & Address Section -->
          <div style="font-size: 13px; line-height: 1.8; margin-bottom: 20px; color: #0f172a;">
            <div>
              <b>Paciente:</b> <span style="font-weight: 700; text-transform: uppercase; margin-left: 6px;">${patient.name}</span>
            </div>
            <div>
              <b>Endereço:</b> <span style="margin-left: 6px;">${patientAddressStr}</span>
            </div>
            <div style="margin-top: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              Prescrição:
            </div>
          </div>

          <!-- Prescription Body items -->
          <div style="min-height: 7cm; margin-bottom: 15px;">
            ${itemsHtml || '<div style="font-style: italic; color: #94a3b8;">Nenhum medicamento informado.</div>'}
          </div>
        </div>

        <div>
          <!-- City / Date & Doctor Signature Row -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 600; color: #334155;">
              Caruaru, ${docDate}
            </div>
            <div style="text-align: center; min-width: 280px;">
              <div style="border-top: 1px solid #0f172a; padding-top: 4px; font-size: 12px; font-weight: 700; color: #0f172a;">
                Carimbo e Assinatura do Médico
              </div>
            </div>
          </div>

          <!-- Bottom Boxes: Comprador & Fornecedor -->
          <div style="display: flex; gap: 12px; margin-top: 10px;">
            <!-- Box Comprador -->
            <div style="flex: 1; border: 1.5px solid #1e293b; border-radius: 10px; padding: 8px 12px; font-size: 10.5px; background: #fff;">
              <div style="font-weight: 800; text-align: center; text-transform: uppercase; border-bottom: 1px solid #1e293b; padding-bottom: 3px; margin-bottom: 6px; color: #0f172a;">
                IDENTIFICAÇÃO DO COMPRADOR
              </div>
              <div style="line-height: 1.95; color: #1e293b;">
                Nome: _____________________________________________<br/>
                Ident: ______________________ Órg. Emissor: _________<br/>
                Endereço: __________________________________________<br/>
                Cidade: ______________________ UF: _________________<br/>
                Telefone: ( &nbsp; &nbsp; ) ___________________________________
              </div>
            </div>

            <!-- Box Fornecedor -->
            <div style="flex: 1; border: 1.5px solid #1e293b; border-radius: 10px; padding: 8px 12px; font-size: 10.5px; display: flex; flex-direction: column; justify-content: space-between; background: #fff;">
              <div>
                <div style="font-weight: 800; text-align: center; text-transform: uppercase; border-bottom: 1px solid #1e293b; padding-bottom: 3px; margin-bottom: 6px; color: #0f172a;">
                  IDENTIFICAÇÃO DO FORNECEDOR
                </div>
              </div>
              <div style="margin-top: 35px; border-top: 1px dashed #94a3b8; padding-top: 4px; display: flex; justify-content: space-between; font-size: 9.5px; color: #334155;">
                <span>Assinatura do Farmacêutico</span>
                <span>Data: ____/____/________</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Receituário de Controle Especial - ${patient.name}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background: white; -webkit-print-color-adjust: exact; }
        </style>
      </head>
      <body>
        ${renderVia(1)}
        ${renderVia(2)}
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    return;
  }

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
