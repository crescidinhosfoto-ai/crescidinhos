// =============================================================
// config.js — Crescidinhos Fotografia
// Estrutura compatível com App.js (usa .label, .icon, .modalities)
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

export const SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co";
export const SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3";

export const REGRAS = {
  descontoExtras: 0.10,
  toleranciaAtrasoMin: 15,
  prazoCancelamentoHoras: 48,
  prazoSelecaoFotosDias: 5,
  prazoEntregaDias: 20,
  fotoExtraValor: 12,
};

export const TIMES = [
  "08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30",
  "13:00","13:30",
];

export const fmtPreco = (price, priceLabel, periodo) => {
  if (priceLabel) return priceLabel;
  if (!price) return "A combinar";
  const fmt = `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
  return periodo ? `${fmt}/${periodo}` : fmt;
};

export const calcularTotal = (basePrice, extras = [], temDesconto = false) => {
  const base = Number(basePrice) || 0;
  const totalExtras = extras.reduce((s, e) => s + (Number(e.price) || 0), 0);
  const subtotal = base + totalExtras;
  const desconto = temDesconto && totalExtras > 0 ? subtotal * 0.10 : 0;
  return { base, totalExtras, desconto, total: subtotal - desconto };
};

// ─── EXTRAS COMUNS ────────────────────────────────────────────────
const ALBUM      = { id: "album",      label: "Álbum impresso",    price: 750 };
const QUADRO     = { id: "quadro",     label: "Quadro decorativo", price: 280 };
const FOTOGRAFO2 = { id: "fotografo2", label: "+1 Fotógrafo",       price: 450 };
const MAKINGOFF  = { id: "makingoff",  label: "Making off",         price: 400 };
const HORA_EXTRA = { id: "hora-extra", label: "Hora adicional",     price: 275 };
const BALOES     = { id: "baloes",     label: "Decoração balões",   price: 160 };

export const SERVICES = [
  // ─── NEWBORN ────────────────────────────────────────────────────
  {
    id: "newborn", icon: "🍼", label: "Newborn",
    grupo: "ensaio",
    detail: "Ensaio especializado para recém-nascidos até 21 dias de vida.",
    descontoExtras: true,
    modalities: [
      { id: "newborn-studio", label: "Sessão Newborn", price: 580,
        detail: "30 fotos editadas · 2–3h · Estúdio", fotos: 30, duracao: "2–3h" },
    ],
    extras: [ALBUM, QUADRO],
  },
  // ─── INFANTIL ───────────────────────────────────────────────────
  {
    id: "infantil", icon: "🎂", label: "Infantil",
    grupo: "ensaio",
    detail: "Smash the cake e ensaios de aniversário no estúdio.",
    descontoExtras: true,
    modalities: [
      { id: "smash-basico", label: "Smash Básico",  price: 380, detail: "20 fotos editadas · 1h · Estúdio",    fotos: 20, duracao: "1h" },
      { id: "smash-plus",   label: "Smash Plus",    price: 480, detail: "30 fotos editadas · 1,5h · Estúdio",  fotos: 30, duracao: "1,5h" },
      { id: "ensaio-duo",   label: "Ensaio Duo",    price: 280, detail: "15 fotos editadas · 45min · Estúdio", fotos: 15, duracao: "45min" },
    ],
    extras: [ALBUM, QUADRO, BALOES],
  },
  // ─── EXTERNO ────────────────────────────────────────────────────
  {
    id: "externo", icon: "🌿", label: "Ensaio Externo",
    grupo: "ensaio",
    detail: "Ensaio ao ar livre em locação combinada com a fotógrafa.",
    descontoExtras: true,
    modalities: [
      { id: "externo-basico", label: "Ensaio Externo", price: 580,
        detail: "40 fotos editadas · 1,5h · Locação externa", fotos: 40, duracao: "1,5h" },
    ],
    extras: [ALBUM, QUADRO],
  },
  // ─── GESTANTE ───────────────────────────────────────────────────
  {
    id: "gestante", icon: "🤰", label: "Gestante",
    grupo: "ensaio",
    detail: "Ensaio para mamães entre 28 e 36 semanas de gestação.",
    descontoExtras: true,
    modalities: [
      { id: "gestante-studio",  label: "No Estúdio", price: 380, detail: "20 fotos editadas · 1h · Estúdio",   fotos: 20, duracao: "1h" },
      { id: "gestante-externo", label: "Externo",    price: 480, detail: "30 fotos editadas · 1,5h · Externo", fotos: 30, duracao: "1,5h" },
    ],
    extras: [ALBUM, QUADRO],
  },
  // ─── CHAMEGO ────────────────────────────────────────────────────
  {
    id: "chamego", icon: "🥰", label: "Chamego",
    grupo: "ensaio",
    detail: "Ensaio família + recém-nascido em casa ou estúdio.",
    descontoExtras: true,
    modalities: [
      { id: "chamego-studio",  label: "No Estúdio",       price: 480, detail: "25 fotos editadas · 1,5h · Estúdio",     fotos: 25, duracao: "1,5h" },
      { id: "chamego-externo", label: "Em Casa / Externo", price: 580, detail: "30 fotos editadas · 2h · A combinar",    fotos: 30, duracao: "2h" },
    ],
    extras: [ALBUM, QUADRO],
  },
  // ─── AFETO ──────────────────────────────────────────────────────
  {
    id: "afeto", icon: "💛", label: "Afeto",
    grupo: "ensaio",
    detail: "Ensaio família com crianças de qualquer idade.",
    descontoExtras: true,
    modalities: [
      { id: "afeto-studio",  label: "No Estúdio", price: 480, detail: "25 fotos editadas · 1,5h · Estúdio", fotos: 25, duracao: "1,5h" },
      { id: "afeto-externo", label: "Externo",    price: 580, detail: "30 fotos editadas · 2h · Externo",   fotos: 30, duracao: "2h" },
    ],
    extras: [ALBUM, QUADRO],
  },
  // ─── ANIVERSÁRIO ────────────────────────────────────────────────
  {
    id: "aniversario", icon: "🎉", label: "Aniversário",
    grupo: "evento",
    detail: "Cobertura fotográfica completa da festa. Entrega em até 10 dias.",
    descontoExtras: true,
    modalities: [
      { id: "aniv-3h", label: "Cobertura 3h", price: 950,  detail: "100 fotos editadas · Dentro de Bauru", fotos: 100, duracao: "3h" },
      { id: "aniv-4h", label: "Cobertura 4h", price: 1150, detail: "130 fotos editadas · Dentro de Bauru", fotos: 130, duracao: "4h" },
      { id: "aniv-5h", label: "Cobertura 5h", price: 1350, detail: "160 fotos editadas · Dentro de Bauru", fotos: 160, duracao: "5h" },
      { id: "aniv-6h", label: "Cobertura 6h", price: 1550, detail: "200 fotos editadas · Dentro de Bauru", fotos: 200, duracao: "6h" },
    ],
    extras: [ALBUM, QUADRO, FOTOGRAFO2, MAKINGOFF, HORA_EXTRA],
  },
  // ─── BATIZADO ───────────────────────────────────────────────────
  {
    id: "batizado", icon: "✝️", label: "Batizado / Confraternização / Chá Revelação",
    grupo: "evento",
    detail: "Cobertura fotográfica da sua celebração especial. Entrega em até 10 dias.",
    descontoExtras: true,
    modalities: [
      { id: "bat-cerimonia", label: "Cerimônia",            price: 650,  detail: "60 fotos editadas · 2h · Igreja + Evento",  fotos: 60,  duracao: "2h" },
      { id: "bat-completo",  label: "Cerimônia + Recepção", price: 950,  detail: "100 fotos editadas · 4h · Igreja + Evento", fotos: 100, duracao: "4h" },
      { id: "bat-premium",   label: "Cobertura Completa",   price: 1250, detail: "150 fotos editadas · 6h · Igreja + Evento", fotos: 150, duracao: "6h" },
    ],
    extras: [ALBUM, QUADRO, FOTOGRAFO2, HORA_EXTRA],
  },
  // ─── 15 ANOS ────────────────────────────────────────────────────
  {
    id: "15anos", icon: "👑", label: "15 Anos",
    grupo: "evento",
    detail: "Um momento único que merece ser eternizado com todo cuidado e emoção.",
    descontoExtras: true,
    modalities: [
      { id: "15-ensaio",    label: "Ensaio Externo",     price: 580,  detail: "40 fotos editadas · 1,5h · Externo",             fotos: 40,  duracao: "1,5h" },
      { id: "15-cobertura", label: "Cobertura da Festa", price: 1650, detail: "200 fotos editadas · 6h · Evento",               fotos: 200, duracao: "6h" },
      { id: "15-completo",  label: "Ensaio + Cobertura", price: 2100, detail: "240 fotos editadas · 7,5h · Externo + Evento",   fotos: 240, duracao: "7,5h" },
    ],
    extras: [ALBUM, QUADRO, FOTOGRAFO2, MAKINGOFF, HORA_EXTRA],
  },
  // ─── COFRINHO ───────────────────────────────────────────────────
  {
    id: "cofrinho", icon: "🪙", label: "Cofrinho de Recordações",
    grupo: "cofrinho",
    detail: "Pague mensalmente e resgate em ensaios ou fotos extras. Resgate mínimo após 3 meses.",
    semAgenda: true,
    descontoExtras: false,
    modalities: [
      { id: "sementinha", label: "Sementinha 🌱", price: 50,  periodo: "mês", detail: "R$ 50/mês · Créditos acumulam todo mês" },
      { id: "broto",      label: "Broto 🌿",       price: 100, periodo: "mês", detail: "R$ 100/mês · Créditos acumulam todo mês" },
      { id: "florido",    label: "Florido 🌸",     price: 150, periodo: "mês", detail: "R$ 150/mês · Créditos acumulam todo mês" },
      { id: "crescido",   label: "Crescido 🌳",    price: 200, periodo: "mês", detail: "R$ 200/mês · Créditos acumulam todo mês" },
    ],
    extras: [],
  },
  // ─── VALE PRESENTE ──────────────────────────────────────────────
  {
    id: "vale", icon: "🎁", label: "Vale Presente",
    grupo: "vale",
    detail: "Presenteie alguém especial com um ensaio na Crescidinhos. O valor é escolhido por você.",
    semAgenda: true,
    descontoExtras: false,
    modalities: [
      { id: "vale-livre", label: "Valor livre", price: null, detail: "Você escolhe o valor — a presenteada escolhe o ensaio" },
    ],
    extras: [],
  },
];

export const COFRINHO_PLANOS = SERVICES.find(s => s.id === "cofrinho")?.modalities || [];
