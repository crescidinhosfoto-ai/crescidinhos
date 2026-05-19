// =============================================================
// config.js — Crescidinhos Fotografia
// =============================================================

export const PHOTOGRAPHER = {
  email: "crescidinhosfoto@gmail.com",
  name: "Crescidinhos Fotografia",
  owner: "Thais de Sa Nascimento Dutra",
  cpf: "410.593.908-41",
  cnpj: "64.189.121/0001-06",
  phone: "(14) 99684-5521",
  whatsapp: "5514996845521",
  instagram: "@crescidinhosfotografia",
  pix: "(14) 99684-5521",
  cidade: "Bauru e Região",
  endereco: "Padre Anchieta 775, Bela Vista, Bauru/SP",
  site: "crescidinhosfoto.com.br",
  agendamento: "app.crescidinhosfoto.com.br",
};

export const WEBHOOK_URL =
  "https://ribbitingboar-n8n.cloudfy.live/webhook/novo-agendamento";

export const WEBHOOK_HORARIOS =
  "https://ribbitingboar-n8n.cloudfy.live/webhook/horarios-disponiveis";

export const SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co";
export const SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3";

export const EVOLUTION_URL = "https://ribbitingboar-evolution.cloudfy.live";
export const EVOLUTION_KEY = "gNnhqK2sv964EPigBYm1WJkBc91gu1t4";
export const EVOLUTION_INSTANCE = "crescidinhos";

export const REGRAS = {
  descontoExtras: 0.10,
  toleranciaAtrasoMin: 15,
  prazoCancelamentoHoras: 48,
  prazoSelecaoFotosDias: 5,
  prazoEntregaDias: 20,
  fotoExtraValor: 12,
};

export const fmtPreco = (v) =>
  v ? `R$ ${Number(v).toFixed(2).replace(".", ",")}` : "A combinar";

export const calcularTotal = (servico, extras = []) => {
  const base = servico?.preco || 0;
  const totalExtras = extras.reduce((s, e) => s + (e.preco || 0), 0);
  const desconto = totalExtras > 0 ? (base + totalExtras) * REGRAS.descontoExtras : 0;
  return base + totalExtras - desconto;
};

// Horários padrão (fallback se Google Calendar não responder)
export const TIMES = [
  "08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30",
  "13:00","13:30",
];

export const SERVICES = [
  // ─── NEWBORN ───────────────────────────────────────────────────
  {
    id: "newborn",
    emoji: "🍼",
    nome: "Newborn",
    descricao: "Ensaio especializado para recém-nascidos até 21 dias",
    modalidades: [
      { id: "newborn-studio", nome: "Sessão Newborn", preco: 580, entrega: "30 fotos editadas", duracao: "2–3h", local: "Estúdio" },
    ],
    extras: [
      { id: "album", nome: "Álbum impresso", preco: 750 },
      { id: "quadro", nome: "Quadro decorativo", preco: 280 },
    ],
    dadosEvento: false,
    anamnese: true,
  },
  // ─── INFANTIL ──────────────────────────────────────────────────
  {
    id: "infantil",
    emoji: "🎂",
    nome: "Infantil",
    descricao: "Smash the cake e ensaios de aniversário",
    modalidades: [
      { id: "smash-basico", nome: "Smash Básico", preco: 380, entrega: "20 fotos editadas", duracao: "1h", local: "Estúdio" },
      { id: "smash-plus",   nome: "Smash Plus",   preco: 480, entrega: "30 fotos editadas", duracao: "1,5h", local: "Estúdio" },
      { id: "ensaio-duo",   nome: "Ensaio Duo",   preco: 280, entrega: "15 fotos editadas", duracao: "45min", local: "Estúdio" },
    ],
    extras: [
      { id: "album",  nome: "Álbum impresso",  preco: 750 },
      { id: "quadro", nome: "Quadro decorativo", preco: 280 },
      { id: "baloes", nome: "Decoração balões",  preco: 160 },
    ],
    dadosEvento: false,
    anamnese: true,
  },
  // ─── ENSAIO EXTERNO ────────────────────────────────────────────
  {
    id: "externo",
    emoji: "🌿",
    nome: "Ensaio Externo",
    descricao: "Ensaio ao ar livre em locação combinada",
    modalidades: [
      { id: "externo-basico", nome: "Ensaio Externo", preco: 580, entrega: "40 fotos editadas", duracao: "1,5h", local: "Externo" },
    ],
    extras: [
      { id: "album",  nome: "Álbum impresso",  preco: 750 },
      { id: "quadro", nome: "Quadro decorativo", preco: 280 },
    ],
    dadosEvento: true,
    anamnese: false,
  },
  // ─── GESTANTE ──────────────────────────────────────────────────
  {
    id: "gestante",
    emoji: "🤰",
    nome: "Gestante",
    descricao: "Ensaio para mamães entre 28 e 36 semanas",
    modalidades: [
      { id: "gestante-studio",   nome: "Sessão Estúdio",  preco: 380, entrega: "20 fotos editadas", duracao: "1h",  local: "Estúdio" },
      { id: "gestante-externo",  nome: "Sessão Externa",  preco: 480, entrega: "30 fotos editadas", duracao: "1,5h", local: "Externo" },
    ],
    extras: [
      { id: "album",  nome: "Álbum impresso",  preco: 750 },
      { id: "quadro", nome: "Quadro decorativo", preco: 280 },
    ],
    dadosEvento: false,
    anamnese: false,
  },
  // ─── CHAMEGO ───────────────────────────────────────────────────
  {
    id: "chamego",
    emoji: "🥰",
    nome: "Chamego",
    descricao: "Ensaio família + recém-nascido em casa ou estúdio",
    modalidades: [
      { id: "chamego-studio",  nome: "No Estúdio",     preco: 480, entrega: "25 fotos editadas", duracao: "1,5h", local: "Estúdio" },
      { id: "chamego-externo", nome: "Em Casa / Externo", preco: 580, entrega: "30 fotos editadas", duracao: "2h", local: "A combinar" },
    ],
    extras: [
      { id: "album",  nome: "Álbum impresso",  preco: 750 },
      { id: "quadro", nome: "Quadro decorativo", preco: 280 },
    ],
    dadosEvento: false,
    anamnese: false,
  },
  // ─── AFETO ─────────────────────────────────────────────────────
  {
    id: "afeto",
    emoji: "💛",
    nome: "Afeto",
    descricao: "Ensaio família com crianças de qualquer idade",
    modalidades: [
      { id: "afeto-studio",  nome: "No Estúdio",  preco: 480, entrega: "25 fotos editadas", duracao: "1,5h", local: "Estúdio" },
      { id: "afeto-externo", nome: "Externo",     preco: 580, entrega: "30 fotos editadas", duracao: "2h",   local: "Externo" },
    ],
    extras: [
      { id: "album",  nome: "Álbum impresso",  preco: 750 },
      { id: "quadro", nome: "Quadro decorativo", preco: 280 },
    ],
    dadosEvento: false,
    anamnese: false,
  },
  // ─── ANIVERSÁRIO ───────────────────────────────────────────────
  {
    id: "aniversario",
    emoji: "🎉",
    nome: "Aniversário",
    descricao: "Cobertura completa de festas de aniversário",
    modalidades: [
      { id: "aniv-3h", nome: "Cobertura 3h", preco: 950,  entrega: "100 fotos editadas", duracao: "3h", local: "Evento" },
      { id: "aniv-4h", nome: "Cobertura 4h", preco: 1150, entrega: "130 fotos editadas", duracao: "4h", local: "Evento" },
      { id: "aniv-5h", nome: "Cobertura 5h", preco: 1350, entrega: "160 fotos editadas", duracao: "5h", local: "Evento" },
      { id: "aniv-6h", nome: "Cobertura 6h", preco: 1550, entrega: "200 fotos editadas", duracao: "6h", local: "Evento" },
    ],
    extras: [
      { id: "album",       nome: "Álbum impresso",     preco: 750 },
      { id: "quadro",      nome: "Quadro decorativo",  preco: 280 },
      { id: "fotografo2",  nome: "+1 Fotógrafo",        preco: 450 },
      { id: "makingoff",   nome: "Making off",          preco: 400 },
      { id: "hora-extra",  nome: "Hora adicional",      preco: 275 },
    ],
    dadosEvento: true,
    anamnese: false,
  },
  // ─── BATIZADO ──────────────────────────────────────────────────
  {
    id: "batizado",
    emoji: "✝️",
    nome: "Batizado",
    descricao: "Cobertura do batizado e celebração",
    modalidades: [
      { id: "bat-cerimonia",  nome: "Cerimônia",              preco: 650,  entrega: "60 fotos editadas",  duracao: "2h", local: "Igreja + Evento" },
      { id: "bat-completo",   nome: "Cerimônia + Recepção",   preco: 950,  entrega: "100 fotos editadas", duracao: "4h", local: "Igreja + Evento" },
      { id: "bat-premium",    nome: "Cobertura Completa",     preco: 1250, entrega: "150 fotos editadas", duracao: "6h", local: "Igreja + Evento" },
    ],
    extras: [
      { id: "album",       nome: "Álbum impresso",     preco: 750 },
      { id: "quadro",      nome: "Quadro decorativo",  preco: 280 },
      { id: "fotografo2",  nome: "+1 Fotógrafo",        preco: 450 },
      { id: "hora-extra",  nome: "Hora adicional",      preco: 275 },
    ],
    dadosEvento: true,
    anamnese: false,
  },
  // ─── 15 ANOS ──────────────────────────────────────────────────
  {
    id: "15anos",
    emoji: "👑",
    nome: "15 Anos",
    descricao: "Ensaio e cobertura completa da festa de 15 anos",
    modalidades: [
      { id: "15-ensaio",    nome: "Ensaio Externo",     preco: 580,  entrega: "40 fotos editadas",  duracao: "1,5h", local: "Externo" },
      { id: "15-cobertura", nome: "Cobertura da Festa", preco: 1650, entrega: "200 fotos editadas", duracao: "6h",   local: "Evento" },
      { id: "15-completo",  nome: "Ensaio + Cobertura", preco: 2100, entrega: "240 fotos editadas", duracao: "7,5h", local: "Externo + Evento" },
    ],
    extras: [
      { id: "album",       nome: "Álbum impresso",     preco: 750 },
      { id: "quadro",      nome: "Quadro decorativo",  preco: 280 },
      { id: "fotografo2",  nome: "+1 Fotógrafo",        preco: 450 },
      { id: "makingoff",   nome: "Making off",          preco: 400 },
      { id: "hora-extra",  nome: "Hora adicional",      preco: 275 },
    ],
    dadosEvento: true,
    anamnese: false,
  },
];

// Cofrinho de Recordações
export const COFRINHO_PLANOS = [
  { id: "sementinha", nome: "Sementinha 🌱", preco: 50,  creditos: 50  },
  { id: "broto",      nome: "Broto 🌿",       preco: 100, creditos: 100 },
  { id: "florido",    nome: "Florido 🌸",     preco: 150, creditos: 150 },
  { id: "crescido",   nome: "Crescido 🌳",    preco: 200, creditos: 200 },
];
