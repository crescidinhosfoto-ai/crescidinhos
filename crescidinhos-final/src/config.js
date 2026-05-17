// =============================================================
// config.js — Crescidinhos Fotografia
// Atualizado com catálogo completo de serviços e preços reais
// Mantém compatibilidade total com App.js existente
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

export const TIMES = [
  "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
];

export const REGRAS = {
  descontoExtras: 0.10,
  toleranciaAtrasoMin: 15,
  prazoCancelamentoHoras: 48,
  prazoSelecaoFotosDias: 5,
  prazoEntregaDias: 20,
  fotoExtraValor: 12,
  fotoExtraValorAlt: 8,
};

export const EXTRAS_EVENTOS = [
  { id: "duo",          label: "Ensaio Duo",             price: 280 },
  { id: "smash_basico", label: "Smash the Cake básico",  price: 380 },
  { id: "quadros",      label: "Quadros",                price: 280 },
  { id: "baloes",       label: "Balões",                 price: 160 },
  { id: "album",        label: "Álbum",                  price: 750 },
];

export const EXTRAS_15ANOS = [
  { id: "estudio_life",   label: "Ensaio no estúdio Life", price: 380,  desc: "20 fotos" },
  { id: "estudio_plus",   label: "Ensaio no estúdio Plus", price: 480,  desc: "30 fotos" },
  { id: "externo",        label: "Ensaio externo",         price: 580,  desc: "40 fotos — dentro de Bauru" },
  { id: "album",          label: "Álbum",                  price: 750,  desc: null },
  { id: "quadros",        label: "Quadros",                price: 280,  desc: null },
  { id: "fotografo",      label: "+ 1 fotógrafo",          price: null, desc: "Valor a combinar" },
  { id: "making_off",     label: "Making off",             price: 450,  desc: null },
  { id: "hora_adicional", label: "Hora adicional",         price: 275,  desc: "Por hora" },
];

// =============================================================
// SERVICES — usado diretamente pelo App.js (formato mantido)
// Campos novos: price, fotos, duracao, obs, grupo,
//               requerCrianca, extras, descontoExtras, tipo
// =============================================================
export const SERVICES = [

  // ── ACOMPANHAMENTOS ────────────────────────────────────────
  {
    id: "chamego",
    label: "Acompanhamento Chamego",
    icon: "🐘",
    grupo: "acompanhamento",
    description: "Acompanhamento fotográfico com tema sazonal. Registre cada fase do crescimento.",
    requerCrianca: true,
    modalities: [
      {
        id: "chamego_trimestral",
        label: "A cada 3 meses",
        detail: "35 fotos por sessão · Tema sazonal · Sessões trimestrais",
        price: 230,
        fotos: 35,
      },
      {
        id: "chamego_anual",
        label: "12 meses completo",
        detail: "20 fotos por sessão · 12 sessões ao longo do ano",
        price: 160,
        fotos: 20,
        obs: "Valor por sessão no pacote anual",
      },
    ],
  },

  {
    id: "afeto",
    label: "Acompanhamento Afeto",
    icon: "🐘",
    grupo: "acompanhamento",
    description: "Acompanhamento premium com mais fotos. O registro mais completo do crescimento.",
    requerCrianca: true,
    modalities: [
      {
        id: "afeto_trimestral",
        label: "A cada 3 meses",
        detail: "55 fotos por sessão · Tema sazonal · Sessões trimestrais",
        price: 280,
        fotos: 55,
      },
      {
        id: "afeto_anual",
        label: "12 meses completo",
        detail: "40 fotos por sessão · 12 sessões ao longo do ano",
        price: 180,
        fotos: 40,
        obs: "Valor por sessão no pacote anual",
      },
    ],
  },

  // ── GESTANTE ───────────────────────────────────────────────
  {
    id: "gestante-estudio",
    label: "Gestante — Estúdio",
    icon: "🤱",
    grupo: "gestante",
    description: "De 28 a 38 semanas. Registramos esse momento único no conforto do estúdio.",
    requerCrianca: false,
    modalities: [
      {
        id: "gestante_estudio_life",
        label: "Life",
        detail: "20 fotos · Ensaio gestante no estúdio · Até 2 trocas de roupa",
        price: 380,
        fotos: 20,
      },
      {
        id: "gestante_estudio_plus",
        label: "Plus",
        detail: "30 fotos · Ensaio gestante no estúdio · Até 3 trocas de roupa",
        price: 480,
        fotos: 30,
      },
    ],
  },

  {
    id: "gestante-externa",
    label: "Gestante — Externa",
    icon: "🤱",
    grupo: "gestante",
    description: "Ensaio externo para gestantes em locações especiais dentro de Bauru.",
    requerCrianca: false,
    modalities: [
      {
        id: "gestante_externa",
        label: "Ensaio Externo",
        detail: "50 fotos · 1h de ensaio · Dentro de Bauru",
        price: 580,
        fotos: 50,
        duracao: "1h",
        obs: "Valor válido para locais dentro de Bauru",
      },
    ],
  },

  // ── RECÉM-NASCIDO ──────────────────────────────────────────
  {
    id: "newborn",
    label: "Newborn",
    icon: "👶",
    grupo: "newborn",
    description: "Bebês preferencialmente até 15 dias de vida. Sessão com pausas e total segurança.",
    requerCrianca: true,
    modalities: [
      {
        id: "newborn_unico",
        label: "Sessão Newborn",
        detail: "20 fotos · Cenário temático + cenário família · Pausas para alimentação",
        price: 480,
        fotos: 20,
        obs: "Preferencialmente até 15 dias de vida",
      },
    ],
  },

  // ── CAMPANHA SAZONAL ───────────────────────────────────────
  {
    id: "campanha",
    label: "Campanha Sazonal",
    icon: "🎨",
    grupo: "campanha",
    description: "Dia das Mães, Dia dos Pais, Páscoa, Junina, Natal e muito mais.",
    requerCrianca: false,
    modalities: [
      {
        id: "campanha_ativa",
        label: "Campanha",
        detail: "Valor e fotos conforme campanha vigente · Cenário exclusivo",
        price: null,
        fotos: null,
        obs: "Valor definido por campanha. Consulte a Clarice.",
      },
    ],
  },

  // ── ADULTO / CORPORATIVO ───────────────────────────────────
  {
    id: "adulto",
    label: "Adulto / Corporativo",
    icon: "👤",
    grupo: "adulto",
    description: "Ensaio adulto, perfil profissional e corporativo no estúdio.",
    requerCrianca: false,
    modalities: [
      {
        id: "adulto_life",
        label: "Life",
        detail: "20 fotos · Ensaio adulto ou profissional no estúdio",
        price: 380,
        fotos: 20,
      },
      {
        id: "adulto_plus",
        label: "Plus",
        detail: "30 fotos · Ensaio adulto ou profissional no estúdio",
        price: 480,
        fotos: 30,
      },
    ],
  },

  // ── FAMÍLIA ────────────────────────────────────────────────
  {
    id: "familia-estudio",
    label: "Família — Estúdio",
    icon: "👨‍👩‍👧",
    grupo: "familia",
    description: "Ensaio de família no estúdio. Registre a sua história com amor.",
    requerCrianca: false,
    modalities: [
      {
        id: "familia_estudio_life",
        label: "Life",
        detail: "20 fotos · Família no estúdio · Até 2 trocas de roupa",
        price: 380,
        fotos: 20,
      },
      {
        id: "familia_estudio_plus",
        label: "Plus",
        detail: "30 fotos · Família no estúdio · Até 3 trocas de roupa",
        price: 480,
        fotos: 30,
      },
    ],
  },

  {
    id: "familia-externa",
    label: "Família — Externa",
    icon: "👨‍👩‍👧",
    grupo: "familia",
    description: "Ensaio de família em ambiente externo. Luz natural e momentos únicos.",
    requerCrianca: false,
    modalities: [
      {
        id: "familia_externa",
        label: "Externa",
        detail: "40 fotos · 1h de ensaio · Dentro de Bauru",
        price: 420,
        fotos: 40,
        duracao: "1h",
        obs: "Valor válido para locais dentro de Bauru",
      },
    ],
  },

  // ── INFANTIL AVULSO ────────────────────────────────────────
  {
    id: "infantil",
    label: "Infantil Avulso",
    icon: "🧒",
    grupo: "infantil",
    description: "Ensaios infantis avulsos — estúdio ou externo. Momentos da infância com amor.",
    requerCrianca: true,
    modalities: [
      {
        id: "infantil_duo",
        label: "Ensaio Duo",
        detail: "60 fotos · Para dois no estúdio",
        price: 280,
        fotos: 60,
      },
      {
        id: "infantil_one",
        label: "Ensaio One",
        detail: "40 fotos · Individual no estúdio",
        price: 180,
        fotos: 40,
      },
      {
        id: "infantil_smash_basico",
        label: "Smash the Cake básico",
        detail: "60 fotos · Smash básico no estúdio",
        price: 380,
        fotos: 60,
      },
      {
        id: "infantil_smash_completo",
        label: "Smash the Cake completo",
        detail: "A partir de 70 fotos · Inclui bolo e balão",
        price: 620,
        fotos: 70,
        incluso: ["Bolo", "Balão"],
      },
      {
        id: "infantil_clean",
        label: "Ensaio Clean",
        detail: "20 fotos · Estética minimalista e atemporal",
        price: 280,
        fotos: 20,
      },
      {
        id: "infantil_externo",
        label: "Externo",
        detail: "40 fotos · 1h de ensaio externo · Dentro de Bauru",
        price: 420,
        fotos: 40,
        duracao: "1h",
        obs: "Valor válido para locais dentro de Bauru",
      },
    ],
  },

  // ── ANIVERSÁRIO ────────────────────────────────────────────
  {
    id: "aniversario",
    label: "Aniversário",
    icon: "🎂",
    grupo: "evento",
    description: "Cobertura completa do aniversário. Cada detalhe especial registrado.",
    requerCrianca: false,
    descontoExtras: true,
    extras: EXTRAS_EVENTOS,
    modalities: [
      {
        id: "aniversario_3h",
        label: "Básico 3h",
        detail: "3h de cobertura · Todas as fotos tratadas · Entrega em até 20 dias úteis",
        price: 450,
        duracao: "3h",
      },
      {
        id: "aniversario_4h",
        label: "Completo 4h",
        detail: "4h de cobertura · Todas as fotos tratadas · Entrega em até 20 dias úteis",
        price: 580,
        duracao: "4h",
      },
    ],
  },

  // ── BATIZADO / CONFRATERNIZAÇÃO ────────────────────────────
  {
    id: "batizado",
    label: "Batizado / Confraternização",
    icon: "⛪",
    grupo: "evento",
    description: "Cobertura completa da sua celebração especial em Bauru.",
    requerCrianca: false,
    descontoExtras: true,
    extras: EXTRAS_EVENTOS,
    modalities: [
      {
        id: "batizado_1h30",
        label: "1h30 de evento",
        detail: "1h30 de cobertura · Todas as fotos tratadas · Entrega via link",
        price: 280,
        duracao: "1h30",
      },
      {
        id: "batizado_2h",
        label: "2h de evento",
        detail: "2h de cobertura · Todas as fotos tratadas · Entrega via link",
        price: 360,
        duracao: "2h",
      },
    ],
  },

  // ── 15 ANOS ────────────────────────────────────────────────
  {
    id: "quinze-anos",
    label: "15 Anos",
    icon: "👑",
    grupo: "evento",
    description: "Um momento único que merece ser eternizado com todo cuidado e emoção.",
    requerCrianca: false,
    descontoExtras: false,
    extras: EXTRAS_15ANOS,
    modalities: [
      {
        id: "quinze_anos_cobertura",
        label: "Cobertura do evento",
        detail: "6h de cobertura · Todas as fotos tratadas · Entrega via link + download",
        price: 1650,
        duracao: "6h",
        obs: "Hora extra: R$ 275/h. Adicionais disponíveis.",
      },
    ],
  },

  // ── COFRINHO DE RECORDAÇÕES ────────────────────────────────
  {
    id: "cofrinho",
    label: "Cofrinho de Recordações",
    icon: "💰",
    grupo: "cofrinho",
    tipo: "assinatura",
    description: "Pague mensalmente e resgate em ensaios ou fotos extras após 3 meses.",
    requerCrianca: false,
    modalities: [
      {
        id: "cofrinho_sementinha",
        label: "🌱 Sementinha",
        detail: "R$ 50/mês · R$ 600 ao ano · Resgate mínimo após 3 meses",
        price: 50,
        priceLabel: "R$ 50/mês",
        periodo: "mensal",
      },
      {
        id: "cofrinho_broto",
        label: "🌿 Broto",
        detail: "R$ 100/mês · R$ 1.200 ao ano · Resgate mínimo após 3 meses",
        price: 100,
        priceLabel: "R$ 100/mês",
        periodo: "mensal",
      },
      {
        id: "cofrinho_florido",
        label: "🌸 Florido",
        detail: "R$ 150/mês · R$ 1.800 ao ano · Resgate mínimo após 3 meses",
        price: 150,
        priceLabel: "R$ 150/mês",
        periodo: "mensal",
      },
      {
        id: "cofrinho_crescido",
        label: "🌳 Crescido",
        detail: "R$ 200/mês · R$ 2.400 ao ano · Resgate mínimo após 3 meses",
        price: 200,
        priceLabel: "R$ 200/mês",
        periodo: "mensal",
      },
    ],
  },
];

// =============================================================
// HELPERS
// =============================================================
export function modeloContrato(serviceId) {
  const m = {
    chamego: "pacote_recorrente", afeto: "pacote_recorrente",
    "gestante-estudio": "ensaio", "gestante-externa": "ensaio",
    newborn: "menor_newborn", campanha: "ensaio",
    adulto: "ensaio", "familia-estudio": "ensaio", "familia-externa": "ensaio",
    infantil: "menor_infantil", aniversario: "evento",
    batizado: "evento", "quinze-anos": "evento", cofrinho: "assinatura",
  };
  return m[serviceId] || "ensaio";
}

export function requerAnamnese(serviceId) {
  return SERVICES.find(s => s.id === serviceId)?.requerCrianca === true;
}

export function calcularTotal(basePrice, extras = [], temDesconto = false) {
  const totalExtras = extras.reduce((a, e) => a + (e.price || 0), 0);
  const sub = (basePrice || 0) + totalExtras;
  const disc = (temDesconto && extras.length > 0) ? Math.round(sub * REGRAS.descontoExtras) : 0;
  return { sub, disc, total: sub - disc };
}
