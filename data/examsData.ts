import { ExamRoutine } from '../types';
import { api } from '../supabaseClient';

export const LAB_EXAMS: string[] = [
  "Ácido fólico",
  "Ácido láctico (lactato)",
  "Ácido valpróico (dosagem sérica)",
  "Ácido úrico",
  "Albuminemia",
  "Aldosterona",
  "Alfa-1-antitripsina",
  "Alfa-fetoproteína (AFP)",
  "Alumínio sérico",
  "Amilase",
  "Androstenediona",
  "Anti-CCP (peptídeo citruñado cíclico)",
  "Anti-DNA nativo",
  "Anti-HBs",
  "Anti-HCV",
  "Anti-Ro/SSA",
  "Anti-La/SSB",
  "Anti-Sm",
  "Anti-RNP",
  "Anticoagulante lúpico",
  "Antigenemia para Citomegalovírus",
  "Antitireoglobulina (Anti-TG)",
  "Antitireoperoxidase (Anti-TPO)",
  "Apolipoproteína A1 (Apo A1)",
  "Apolipoproteína B (Apo B)",
  "Bilirrubinas (total e frações)",
  "BNP / NT-proBNP",
  "Calcitonina",
  "Calcemia (cálcio total e iônico)",
  "Capacidade total de ligação do ferro (TIBC)",
  "Carbamazepina (dosagem sérica)",
  "C3 e C4 (complementos)",
  "CEA (antígeno carcinoembrionário)",
  "Ceruloplasmina",
  "Citomegalovírus (IgG e IgM)",
  "Cloro",
  "Cobre sérico",
  "Cortisol (matutino / vespertino)",
  "Creatinina",
  "Creatinofosfocinase (CPK)",
  "Crioglobulinas",
  "Desidrogenase láctica (DHL)",
  "DHEA (desidroepiandrosterona)",
  "DHEA-S (sulfato de desidroepiandrosterona)",
  "Digoxina (dosagem sérica)",
  "Dímero D",
  "Eletroforese de proteínas",
  "Estradiol",
  "Fator reumatoide (FR)",
  "Fator V de Leiden",
  "Ferritina",
  "Fibrinogênio",
  "Fator de crescimento semelhante à insulina 1 (IGF-1)",
  "Fosfatase alcalina (FA)",
  "Fósforo",
  "Fator antinúcleo (FAN)",
  "Gama-glutamiltransferase (GGT)",
  "Gasometria arterial/venosa",
  "Glicemia de jejum",
  "HBsAg",
  "Hematócrito",
  "Hemoglobina glicada (HbA1c)",
  "Hemocultura",
  "Hemograma completo",
  "Hepatite A (Anti-HAV IgG e IgM)",
  "Hormônio adrenocorticotrófico (ACTH)",
  "Hormônio folículo-estimulante (FSH)",
  "Hormônio luteinizante (LH)",
  "Hormônio do crescimento (GH)",
  "HTLV I/II (sorologia)",
  "Imunoglobulinas (IgA, IgG, IgM, IgE)",
  "Insulina",
  "Ionograma (sódio, potássio, cloro)",
  "Lipase",
  "Lipidograma (colesterol total, HDL, LDL, VLDL, triglicérides)",
  "Lítio sérico",
  "Magnésio",
  "Paratormônio (PTH)",
  "Pesquisa de hematozoários (gota espessa)",
  "Peptídeo C",
  "Prolactina",
  "Progesterona",
  "Proteína C ativa",
  "Proteína S livre",
  "Proteína C-reativa (PCR)",
  "Proteínas totais e frações",
  "PSA (total e livre)",
  "Reticulócitos",
  "Rubéola (IgG e IgM)",
  "Sorologia para Chagas",
  "Sorologia para Dengue (NS1, IgG, IgM)",
  "Sorologia para HIV",
  "Sorologia para Sífilis (VDRL / FTA-ABS)",
  "T3 total e livre",
  "T4 total e livre",
  "Tacrolimus (nível sérico)",
  "Tempo de protrombina (TP / INR)",
  "Tempo de tromboplastina parcial ativada (TTPA)",
  "Testosterona total e livre",
  "Tiroxina ligada à globulina (TBG)",
  "Toxoplasmose (IgG e IgM)",
  "Transaminase oxalacética (TGO / AST)",
  "Transaminase pirúvica (TGP / ALT)",
  "Transglutaminase tissular (IgA)",
  "Troponina Quantitativa",
  "Troponina Qualitativa",
  "TSH (hormônio tireostimulante)",
  "T4 total",
  "T4 livre",
  "T3 total",
  "T3 livre",
  "Ureia",
  "Velocidade de hemossedimentação (VHS)",
  "Vitamina A",
  "Vitamina B1",
  "Vitamina B6",
  "Vitamina B12",
  "Vitamina D (25-hidroxivitamina D)",
  "Vitamina E",
  "Vitamina K",
  "Zinco sérico"
];

// Deduplicated & trimmed list
export const UNIQUE_LAB_EXAMS: string[] = Array.from(new Set(LAB_EXAMS.map(e => e.trim()))).sort((a, b) => a.localeCompare(b, 'pt-BR'));

export const IMAGE_EXAMS: string[] = [
  "Angio-ressonância magnética de aorta abdominal",
  "Angio-ressonância magnética de aorta torácica",
  "Angio-ressonância magnética de carótidas e vertebrais",
  "Angio-ressonância magnética de encéfalo (arterial)",
  "Angio-ressonância magnética de encéfalo (venosa/morfologia de seios venosos)",
  "Angio-ressonância magnética de artérias renais",
  "Angiotomografia computadorizada de aorta abdominal",
  "Angiotomografia computadorizada de aorta torácica",
  "Angiotomografia computadorizada de artérias coronárias (escore de cálcio e angio)",
  "Angiotomografia computadorizada de artérias renais",
  "Angiotomografia computadorizada de carótidas e vertebrais",
  "Angiotomografia computadorizada de membros inferiores (arterial)",
  "Angiotomografia computadorizada de membros superiores (arterial)",
  "Angiotomografia computadorizada de tórax (protocolo para TEP/pulmonar)",
  "Cintilografia miocárdica de perfusão (estresse e repouso)",
  "Cintilografia óssea corpo total",
  "Cintilografia de tireoide com captação",
  "Colangiorressonância magnética",
  "Densitometria óssea de fêmur e coluna lombar",
  "Ecocardiograma transesofágico com Doppler",
  "Ecocardiograma transtorácico com Doppler",
  "Mamografia digital bilateral",
  "PET-CT com FDG-18 corpo inteiro",
  "Radiografia de abdômen agudo (série de abdômen agudo)",
  "Radiografia de abdômen simples",
  "Radiografia de articulação sacroilíaca",
  "Radiografia de bacia / quadril",
  "Radiografia de bacia em incidência de rã",
  "Radiografia de coluna cervical (AP, perfil e oblíquas)",
  "Radiografia de coluna lombar (AP, perfil e dinâmicas)",
  "Radiografia de coluna torácica (AP e perfil)",
  "Radiografia de cotovelo",
  "Radiografia de crânio",
  "Radiografia de escafóide / punho",
  "Radiografia de joelho (AP, perfil e patela)",
  "Radiografia de mão e punho para idade óssea",
  "Radiografia de mãos e pés",
  "Radiografia de ombro",
  "Radiografia de pé e tornozelo",
  "Radiografia de seios da face",
  "Radiografia de tórax (PA e perfil)",
  "Ressonância magnética de abdome superior com contraste",
  "Ressonância magnética de abdome superior sem contraste",
  "Ressonância magnética de bacia / articulações sacroilíacas com contraste",
  "Ressonância magnética de bacia / articulações sacroilíacas sem contraste",
  "Ressonância magnética de coluna cervical com contraste",
  "Ressonância magnética de coluna cervical sem contraste",
  "Ressonância magnética de coluna lombar com contraste",
  "Ressonância magnética de coluna lombar sem contraste",
  "Ressonância magnética de coluna torácica com contraste",
  "Ressonância magnética de coluna torácica sem contraste",
  "Ressonância magnética de encéfalo com contraste",
  "Ressonância magnética de encéfalo sem contraste",
  "Ressonância magnética de joelho",
  "Ressonância magnética de mama com contraste",
  "Ressonância magnética de ombro",
  "Ressonância magnética de pelve com protocolo para endometriose",
  "Ressonância magnética de pelve / próstata multiparamétrica",
  "Ressonância magnética de pelve feminina com contraste",
  "Ressonância magnética de pelve feminina sem contraste",
  "Ressonância magnética de pescoço / partes moles com contraste",
  "Ressonância magnética de pescoço / partes moles sem contraste",
  "Ressonância magnética de tornozelo / pé",
  "Tomografia computadorizada de abdome total com contraste",
  "Tomografia computadorizada de abdome total sem contraste",
  "Tomografia computadorizada de abdome e pelve com protocolo para litíase (sem contraste)",
  "Tomografia computadorizada de abdome e pelve trifásica (dinâmica)",
  "Tomografia computadorizada de coluna cervical com contraste",
  "Tomografia computadorizada de coluna cervical sem contraste",
  "Tomografia computadorizada de coluna lombar com contraste",
  "Tomografia computadorizada de coluna lombar sem contraste",
  "Tomografia computadorizada de coluna torácica com contraste",
  "Tomografia computadorizada de coluna torácica sem contraste",
  "Tomografia computadorizada de crânio com contraste",
  "Tomografia computadorizada de crânio sem contraste",
  "Tomografia computadorizada de mastoides / ossos temporais",
  "Tomografia computadorizada de orbita com contraste",
  "Tomografia computadorizada de órbita sem contraste",
  "Tomografia computadorizada de pelve com contraste",
  "Tomografia computadorizada de pelve sem contraste",
  "Tomografia computadorizada de pescoço / partes moles com contraste",
  "Tomografia computadorizada de pescoço / partes moles sem contraste",
  "Tomografia computadorizada de seios da face",
  "Tomografia computadorizada de tórax de alta resolução (TCAR) sem contraste",
  "Tomografia computadorizada de tórax com contraste",
  "Tomografia computadorizada de tórax sem contraste",
  "Ultrassonografia de abdome total",
  "Ultrassonografia de abdome superior",
  "Ultrassonografia de articulação (ombro, joelho, cotovelo, tornozelo, etc.)",
  "Ultrassonografia de bolsa escrotal / testículos",
  "Ultrassonografia de mamas",
  "Ultrassonografia de parede abdominal (pesquisa de hérnias)",
  "Ultrassonografia de pelve ginecológica (via abdominal)",
  "Ultrassonografia de pelve transvaginal",
  "Ultrassonografia de próstata via abdominal (vias urinárias)",
  "Ultrassonografia de próstata transretal",
  "Ultrassonografia de rins e vias urinárias",
  "Ultrassonografia de tireoide e cervical",
  "Ultrassonografia de tecidos moles / partes moles",
  "Ultrassonografia Doppler de artérias carótidas e vertebrais",
  "Ultrassonografia Doppler de artérias renais",
  "Ultrassonografia Doppler arterial de membro inferior",
  "Ultrassonografia Doppler arterial de membro superior",
  "Ultrassonografia Doppler venoso de membro inferior (pesquisa de TVP)",
  "Ultrassonografia Doppler venoso de membro superior"
];

export const UNIQUE_IMAGE_EXAMS: string[] = Array.from(new Set(IMAGE_EXAMS.map(e => e.trim()))).sort((a, b) => a.localeCompare(b, 'pt-BR'));

export const CUSTOM_EXAMS_STORAGE_KEY = 'clinica_custom_exams_catalog_v1';

export interface CustomExamsCatalog {
  laboratorial: string[];
  imagem: string[];
}

export function getStoredCustomExams(): CustomExamsCatalog {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CUSTOM_EXAMS_STORAGE_KEY) : null;
    if (!raw) return { laboratorial: [], imagem: [] };
    const parsed = JSON.parse(raw);
    return {
      laboratorial: Array.isArray(parsed?.laboratorial) ? parsed.laboratorial.map((s: any) => String(s).trim()).filter(Boolean) : [],
      imagem: Array.isArray(parsed?.imagem) ? parsed.imagem.map((s: any) => String(s).trim()).filter(Boolean) : []
    };
  } catch (e) {
    console.error('Erro ao recuperar exames personalizados do armazenamento:', e);
    return { laboratorial: [], imagem: [] };
  }
}

export function saveCustomExamsToStorage(
  newExams: string[],
  category: 'laboratorial' | 'imagem'
): CustomExamsCatalog {
  try {
    const current = getStoredCustomExams();
    const cleanList = newExams
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const baseList = category === 'laboratorial' ? UNIQUE_LAB_EXAMS : UNIQUE_IMAGE_EXAMS;
    const baseSet = new Set(baseList.map(e => e.toLowerCase()));
    const customSet = new Set(current[category].map(e => e.toLowerCase()));

    const newlyAdded: string[] = [];
    cleanList.forEach(exam => {
      const lower = exam.toLowerCase();
      // Don't duplicate if already in base catalog or already registered in custom catalog
      if (!baseSet.has(lower) && !customSet.has(lower)) {
        customSet.add(lower);
        newlyAdded.push(exam);
      }
    });

    if (newlyAdded.length > 0) {
      current[category] = [...current[category], ...newlyAdded];
      if (typeof window !== 'undefined') {
        localStorage.setItem(CUSTOM_EXAMS_STORAGE_KEY, JSON.stringify(current));
      }
    }

    return current;
  } catch (e) {
    console.error('Erro ao salvar exames personalizados:', e);
    return getStoredCustomExams();
  }
}

export function removeCustomExamFromStorage(
  examName: string,
  category: 'laboratorial' | 'imagem'
): CustomExamsCatalog {
  try {
    const current = getStoredCustomExams();
    const targetLower = examName.trim().toLowerCase();
    current[category] = current[category].filter(e => e.trim().toLowerCase() !== targetLower);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CUSTOM_EXAMS_STORAGE_KEY, JSON.stringify(current));
    }
    return current;
  } catch (e) {
    console.error('Erro ao remover exame personalizado:', e);
    return getStoredCustomExams();
  }
}

// ---------------- SUPABASE INTEGRATION FOR CUSTOM EXAMS ----------------

export async function fetchCustomExamsFromSupabase(userId: string): Promise<CustomExamsCatalog> {
  try {
    if (!userId) return getStoredCustomExams();

    const { data, error } = await api.getCustomExamsCatalog(userId);
    if (!error && data?.content) {
      try {
        const parsed = JSON.parse(data.content);
        const catalog: CustomExamsCatalog = {
          laboratorial: Array.isArray(parsed?.laboratorial) ? parsed.laboratorial.map((s: any) => String(s).trim()).filter(Boolean) : [],
          imagem: Array.isArray(parsed?.imagem) ? parsed.imagem.map((s: any) => String(s).trim()).filter(Boolean) : []
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(CUSTOM_EXAMS_STORAGE_KEY, JSON.stringify(catalog));
        }
        return catalog;
      } catch (parseErr) {
        console.error('Erro ao decodificar JSON do catálogo do Supabase:', parseErr);
      }
    }

    // Se ainda não existir no Supabase para este médico, verificar se há dados no cache local e migrar
    const local = getStoredCustomExams();
    if (local.laboratorial.length > 0 || local.imagem.length > 0) {
      try {
        await api.saveCustomExamsCatalog(userId, local);
      } catch (saveErr) {
        console.warn('Erro ao migrar catálogo local para o Supabase:', saveErr);
      }
      return local;
    }

    return { laboratorial: [], imagem: [] };
  } catch (err) {
    console.error('Erro ao buscar catálogo de exames no Supabase:', err);
    return getStoredCustomExams();
  }
}

export async function saveCustomExamsToSupabase(
  userId: string | undefined,
  newExams: string[],
  category: 'laboratorial' | 'imagem',
  currentCatalog?: CustomExamsCatalog
): Promise<CustomExamsCatalog> {
  const current: CustomExamsCatalog = currentCatalog 
    ? { laboratorial: [...(currentCatalog.laboratorial || [])], imagem: [...(currentCatalog.imagem || [])] }
    : getStoredCustomExams();

  const cleanList = newExams.map(e => e.trim()).filter(e => e.length > 0);
  const baseList = category === 'laboratorial' ? UNIQUE_LAB_EXAMS : UNIQUE_IMAGE_EXAMS;
  const baseSet = new Set(baseList.map(e => e.toLowerCase()));
  const customSet = new Set((current[category] || []).map(e => e.toLowerCase()));

  const newlyAdded: string[] = [];
  cleanList.forEach(exam => {
    const lower = exam.toLowerCase();
    if (!baseSet.has(lower) && !customSet.has(lower)) {
      customSet.add(lower);
      newlyAdded.push(exam);
    }
  });

  if (newlyAdded.length > 0) {
    current[category] = [...(current[category] || []), ...newlyAdded];
    if (typeof window !== 'undefined') {
      localStorage.setItem(CUSTOM_EXAMS_STORAGE_KEY, JSON.stringify(current));
    }
    if (userId) {
      try {
        await api.saveCustomExamsCatalog(userId, current);
      } catch (err) {
        console.error('Erro ao salvar exames personalizados no Supabase:', err);
      }
    }
  }

  return current;
}

export async function removeCustomExamFromSupabase(
  userId: string | undefined,
  examName: string,
  category: 'laboratorial' | 'imagem',
  currentCatalog?: CustomExamsCatalog
): Promise<CustomExamsCatalog> {
  const current: CustomExamsCatalog = currentCatalog 
    ? { laboratorial: [...(currentCatalog.laboratorial || [])], imagem: [...(currentCatalog.imagem || [])] }
    : getStoredCustomExams();

  const targetLower = examName.trim().toLowerCase();
  current[category] = (current[category] || []).filter(e => e.trim().toLowerCase() !== targetLower);

  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_EXAMS_STORAGE_KEY, JSON.stringify(current));
  }
  if (userId) {
    try {
      await api.saveCustomExamsCatalog(userId, current);
    } catch (err) {
      console.error('Erro ao remover exame personalizado do Supabase:', err);
    }
  }

  return current;
}

// ---------------- EXAM ROUTINES (ROTINAS DE SOLICITAÇÃO DE EXAMES) ----------------

export const EXAM_ROUTINES_STORAGE_KEY = 'genesis_exam_routines';

export const DEFAULT_EXAM_ROUTINES: ExamRoutine[] = [
  {
    id: 'routine-checkup-geral',
    name: 'Check-up Básico (Geral)',
    category: 'laboratorial',
    description: 'Rotina anual preventiva com exames laboratoriais básicos',
    exams: [
      'Hemograma completo',
      'Glicemia de jejum',
      'Creatinina',
      'Ureia',
      'Colesterol total e frações (Lipidograma)',
      'Triglicerídeos',
      'TGO (AST)',
      'TGP (ALT)',
      'TSH',
      'Urina tipo I (EAS)'
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 'routine-pre-operatorio',
    name: 'Pré-Operatório Básico',
    category: 'geral',
    description: 'Avaliação pré-anestésica e cirúrgica básica',
    exams: [
      'Hemograma completo',
      'Coagulograma completo (TAP + TTPA)',
      'Glicemia de jejum',
      'Ureia',
      'Creatinina',
      'Eletrocardiograma (ECG)',
      'Radiografia de tórax (PA e Perfil)'
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 'routine-metabolico-cardio',
    name: 'Rastreio Metabólico & Cardiovascular',
    category: 'laboratorial',
    description: 'Acompanhamento de hipertensão arterial, dislipidemia e diabetes',
    exams: [
      'Hemoglobina glicada (HbA1c)',
      'Glicemia de jejum',
      'Colesterol total e frações (Lipidograma)',
      'Triglicerídeos',
      'Creatinina',
      'Potássio',
      'Sódio',
      'Microalbuminúria'
    ],
    created_at: new Date().toISOString()
  }
];

export function getStoredExamRoutines(): ExamRoutine[] {
  try {
    if (typeof window === 'undefined') return DEFAULT_EXAM_ROUTINES;
    const raw = localStorage.getItem(EXAM_ROUTINES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(EXAM_ROUTINES_STORAGE_KEY, JSON.stringify(DEFAULT_EXAM_ROUTINES));
      return DEFAULT_EXAM_ROUTINES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_EXAM_ROUTINES;
  } catch (e) {
    console.error('Erro ao ler rotinas de exames do localStorage:', e);
    return DEFAULT_EXAM_ROUTINES;
  }
}

export function saveExamRoutineToStorage(routine: ExamRoutine): ExamRoutine[] {
  try {
    const list = getStoredExamRoutines();
    const existingIndex = list.findIndex(r => r.id === routine.id);
    let updated: ExamRoutine[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = routine;
    } else {
      updated = [routine, ...list];
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(EXAM_ROUTINES_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error('Erro ao salvar rotina de exames:', e);
    return getStoredExamRoutines();
  }
}

export function deleteExamRoutineFromStorage(id: string): ExamRoutine[] {
  try {
    const list = getStoredExamRoutines();
    const updated = list.filter(r => r.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(EXAM_ROUTINES_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error('Erro ao remover rotina de exames:', e);
    return getStoredExamRoutines();
  }
}

// ---------------- SUPABASE INTEGRATION FOR EXAM ROUTINES ----------------

export async function fetchExamRoutinesFromSupabase(userId: string): Promise<ExamRoutine[]> {
  try {
    if (!userId) return getStoredExamRoutines();

    const { data, error } = await api.getRoutines(userId, 'exam_routine');
    if (!error && data && data.length > 0) {
      const dbRoutines: ExamRoutine[] = data.map((r: any) => {
        try {
          const parsed = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
          return {
            id: r.id,
            user_id: r.user_id,
            name: r.name,
            category: parsed?.category || 'geral',
            description: parsed?.description || '',
            exams: Array.isArray(parsed?.exams) ? parsed.exams : [],
            created_at: r.created_at
          };
        } catch {
          return {
            id: r.id,
            user_id: r.user_id,
            name: r.name,
            category: 'geral',
            description: '',
            exams: [],
            created_at: r.created_at
          };
        }
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(EXAM_ROUTINES_STORAGE_KEY, JSON.stringify(dbRoutines));
      }
      return dbRoutines;
    }

    // Se o médico ainda não tiver nenhuma rotina de exames salva no Supabase:
    // Persistimos as rotinas padrão iniciais no banco de dados para ele com UUIDs reais!
    const seededRoutines: ExamRoutine[] = [];
    for (const defRoutine of DEFAULT_EXAM_ROUTINES) {
      try {
        const payload = {
          user_id: userId,
          field_id: 'exam_routine',
          name: defRoutine.name,
          shortcut: '',
          content: JSON.stringify({
            category: defRoutine.category,
            description: defRoutine.description || '',
            exams: defRoutine.exams
          })
        };
        const { data: created, error: createError } = await api.createRoutine(payload);
        if (!createError && created?.id) {
          seededRoutines.push({
            ...defRoutine,
            id: created.id,
            user_id: userId,
            created_at: created.created_at || new Date().toISOString()
          });
        }
      } catch (seedErr) {
        console.warn('Erro ao inicializar rotina padrão no Supabase:', seedErr);
      }
    }

    if (seededRoutines.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(EXAM_ROUTINES_STORAGE_KEY, JSON.stringify(seededRoutines));
      }
      return seededRoutines;
    }

    return DEFAULT_EXAM_ROUTINES;
  } catch (err) {
    console.error('Erro ao buscar rotinas de exames no Supabase:', err);
    return getStoredExamRoutines();
  }
}

export async function saveExamRoutineToSupabase(
  userId: string,
  routine: ExamRoutine
): Promise<ExamRoutine> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routine.id);
  const payload = {
    user_id: userId,
    field_id: 'exam_routine',
    name: routine.name.trim(),
    shortcut: '',
    content: JSON.stringify({
      category: routine.category,
      description: routine.description?.trim() || '',
      exams: routine.exams
    })
  };

  let savedRoutine: ExamRoutine = { ...routine, user_id: userId };

  if (isUuid) {
    try {
      const { data, error } = await api.updateRoutine(routine.id, payload);
      if (!error && data) {
        savedRoutine = {
          ...routine,
          id: data.id,
          created_at: data.created_at || routine.created_at
        };
      }
    } catch (updateErr) {
      console.error('Erro ao atualizar rotina no Supabase:', updateErr);
    }
  } else {
    try {
      const { data, error } = await api.createRoutine(payload);
      if (!error && data) {
        savedRoutine = {
          ...routine,
          id: data.id,
          created_at: data.created_at || new Date().toISOString()
        };
      }
    } catch (createErr) {
      console.error('Erro ao criar rotina no Supabase:', createErr);
    }
  }

  // Atualiza cache local
  saveExamRoutineToStorage(savedRoutine);
  return savedRoutine;
}

export async function deleteExamRoutineFromSupabase(
  routineId: string
): Promise<void> {
  deleteExamRoutineFromStorage(routineId);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routineId);
  if (isUuid) {
    try {
      await api.deleteRoutine(routineId);
    } catch (err) {
      console.error('Erro ao deletar rotina no Supabase:', err);
    }
  }
}

