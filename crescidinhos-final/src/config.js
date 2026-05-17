// =============================================================
// config.js — Crescidinhos Fotografia
// Versão final com catálogo completo, preços e descrições reais
// =============================================================

export const PHOTOGRAPHER = {
  email: "crescidinhosfoto@gmail.com",
  name: "Crescidinhos Fotografia",
  owner: "Thais de Sa Nascimento Dutra",
  cpf: "000.000.000-00",
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
  prazoEntregaEventosDias: 10,   // 10 dias corridos
  prazoEntregaEnsaiosDias: 20,
  fotoExtraValor: 12,
  fotoExtraValorAlt: 8,
};

// =============================================================
// EXTRAS reutilizáveis
// =============================================================
export const EXTRAS_EVENTOS = [
  { id: "duo",          label: "Ensaio Duo",            price: 280, desc: "Ensaio infantil duo incluso no evento" },
  { id: "smash_basico", label: "Smash the Cake básico", price: 380, desc: "Sessão smash básica inclusa no evento" },
  { id: "quadros",      label: "Quadros",               price: 280, desc: "Quadros decorativos" },
  { id: "baloes",       label: "Balões",                price: 160, desc: "Decoração com balões" },
  { id: "album",        label: "Álbum",                 price: 750, desc: "Álbum impresso personalizado" },
];

export const EXTRAS_15ANOS = [
  { id: "estudio_life",   label: "Ensaio no estúdio Life", price: 380,  desc: "20 fotos" },
  { id: "estudio_plus",   label: "Ensaio no estúdio Plus", price: 480,  desc: "30 fotos" },
  { id: "externo",        label: "Ensaio externo",         price: 580,  desc: "40 fotos — dentro de Bauru" },
  { id: "album",          label: "Álbum",                  price: 750,  desc: null },
  { id: "quadros",        label: "Quadros",                price: 280,  desc: null },
  { id: "fotografo",      label: "+ 1 fotógrafo",          price: 450,  desc: null },
  { id: "making_off",     label: "Making off",             price: 400,  desc: null },
  { id: "hora_adicional", label: "Hora adicional",         price: 275,  desc: "Por hora" },
];

// =============================================================
// SERVICES — catálogo completo
// Campos: id, label, icon, grupo, description, requerCrianca,
//         modalities[], extras[], descontoExtras, tipo
// =============================================================
export const SERVICES = [

  // ── ACOMPANHAMENTO CHAMEGO ─────────────────────────────────
  {
    id: "chamego",
    label: "Acompanhamento Chamego",
    icon: "🐘",
    grupo: "acompanhamento",
    description: "Acompanhe a melhor fase do seu filho. Você pode escolher 1 cenário temático e faremos mais o cenário com o nosso Mascote. Para você lembrar como eles crescem rápido.",
    requerCrianca: true,
    modalities: [
      {
        id: "chamego_trimestral",
        label: "A cada 3 meses",
        detail: "35 fotos · 1 cenário temático + cenário Mascote · Sessões trimestrais",
        price: 230,
        fotos: 35,
      },
      {
        id: "chamego_anual",
        label: "12 meses completo",
        detail: "20 fotos por sessão · 1 cenário temático + cenário Mascote · 12 sessões ao longo do ano",
        price: 160,
        fotos: 20,
        obs: "Valor por sessão no pacote anual",
      },
    ],
  },

  // ── ACOMPANHAMENTO AFETO ───────────────────────────────────
  {
    id: "afeto",
    label: "Acompanhamento Afeto",
    icon: "🐘",
    grupo: "acompanhamento",
    description: "Acompanhe a melhor fase do seu filho. Você pode escolher 1 cenário temático, 1 cenário família e faremos mais o cenário com o nosso Mascote. Para você lembrar como eles crescem rápido de um jeito mais completo.",
    requerCrianca: true,
    modalities: [
      {
        id: "afeto_trimestral",
        label: "A cada 3 meses",
        detail: "55 fotos · 1 cenário temático + 1 cenário família + cenário Mascote · Sessões trimestrais",
        price: 280,
        fotos: 55,
      },
      {
        id: "afeto_anual",
        label: "12 meses completo",
        detail: "40 fotos por sessão · 1 cenário temático + 1 cenário família + cenário Mascote · 12 sessões",
        price: 180,
        fotos: 40,
        obs: "Valor por sessão no pacote anual",
      },
    ],
  },

  // ── GESTANTE / REVELAÇÃO — ESTÚDIO ────────────────────────
  {
    id: "gestante-estudio",
    label: "Gestante / Revelação — Estúdio",
    icon: "🤱",
    grupo: "gestante",
    description: "Da descoberta ou entre o período de 28 a 38 semanas. Registramos esse momento único no conforto do estúdio. Com 1 cenário clean e 1 cenário Família.",
    requerCrianca: false,
    modalities: [
      {
        id: "gestante_estudio_life",
        label: "Life",
        detail: "20 fotos · 1 cenário clean + 1 cenário família · No estúdio",
        price: 380,
        fotos: 20,
      },
      {
        id: "gestante_estudio_plus",
        label: "Plus",
        detail: "30 fotos · 1 cenário clean + 1 cenário família · No estúdio",
        price: 480,
        fotos: 30,
      },
    ],
  },

  // ── GESTANTE / REVELAÇÃO — EXTERNA ────────────────────────
  {
    id: "gestante-externa",
    label: "Gestante / Revelação — Externa",
    icon: "🤱",
    grupo: "gestante",
    description: "Da descoberta ou entre o período de 28 a 38 semanas. Registramos esse momento único em locações dentro de Bauru.",
    requerCrianca: false,
    modalities: [
      {
        id: "gestante_externa",
        label: "Ensaio Externo",
        detail: "50 fotos · 1h de ensaio · Locações dentro de Bauru",
        price: 580,
        fotos: 50,
        duracao: "1h",
        obs: "Valor válido para locais dentro de Bauru",
      },
    ],
  },

  // ── NEWBORN ────────────────────────────────────────────────
  {
    id: "newborn",
    label: "Newborn",
    icon: "👶",
    grupo: "newborn",
    description: "Bebês preferencialmente até 10 dias de vida. Sessão com pausas e total segurança, 1 cenário para o registro do bebê e 1 cenário para registro de família.",
    requerCrianca: true,
    modalities: [
      {
        id: "newborn_unico",
        label: "Sessão Newborn",
        detail: "20 fotos · 1 cenário bebê + 1 cenário família · Pausas para alimentação",
        price: 480,
        fotos: 20,
        obs: "Preferencialmente até 10 dias de vida",
      },
    ],
  },

  // ── CAMPANHA SAZONAL ───────────────────────────────────────
  {
    id: "campanha",
    label: "Campanha Sazonal",
    icon: "🎨",
    grupo: "campanha",
    description: "Dia das Mães, Dia dos Pais, Páscoa, Junina, Natal e muito mais..",
    requerCrianca: false,
    modalities: [
      {
        id: "campanha_ativa",
        label: "Campanha",
        detail: "Valor e fotos conforme campanha vigente · Cenário exclusivo",
        price: null,
        fotos: null,
        obs: "Valor e detalhes definidos por campanha. Consulte a Crescidinhos.",
      },
    ],
  },

  // ── ADULTO / CORPORATIVO — ESTÚDIO ────────────────────────
  {
    id: "adulto-estudio",
    label: "Adulto / Corporativo — Estúdio",
    icon: "👤",
    grupo: "adulto",
    description: "Ensaio adulto, perfil profissional e corporativo no estúdio, com 2 cenários: 1 conforme o perfil do cliente e 1 clean.",
    requerCrianca: false,
    modalities: [
      {
        id: "adulto_estudio_life",
        label: "Life",
        detail: "20 fotos · 1 cenário perfil + 1 cenário clean · No estúdio",
        price: 380,
        fotos: 20,
      },
      {
        id: "adulto_estudio_plus",
        label: "Plus",
        detail: "30 fotos · 1 cenário perfil + 1 cenário clean · No estúdio",
        price: 480,
        fotos: 30,
      },
    ],
  },

  // ── ADULTO / CORPORATIVO — EXTERNO ────────────────────────
  {
    id: "adulto-externo",
    label: "Adulto / Corporativo — Externo",
    icon: "👤",
    grupo: "adulto",
    description: "O ensaio pode ser realizado no local de trabalho do cliente ou em locações externas dentro de Bauru.",
    requerCrianca: false,
    modalities: [
      {
        id: "adulto_externo",
        label: "Externo",
        detail: "40 fotos · 1h de ensaio · Dentro de Bauru",
        price: 420,
        fotos: 40,
        duracao: "1h",
        obs: "Valor válido para locais dentro de Bauru",
      },
    ],
  },

  // ── FAMÍLIA — ESTÚDIO ──────────────────────────────────────
  {
    id: "familia-estudio",
    label: "Família — Estúdio",
    icon: "👨‍👩‍👧",
    grupo: "familia",
    description: "Ensaio de família no estúdio. Registrando com amor e a personalidade de cada família.",
    requerCrianca: false,
    modalities: [
      {
        id: "familia_estudio_life",
        label: "Life",
        detail: "20 fotos · No estúdio",
        price: 380,
        fotos: 20,
      },
      {
        id: "familia_estudio_plus",
        label: "Plus",
        detail: "30 fotos · No estúdio",
        price: 480,
        fotos: 30,
      },
    ],
  },

  // ── FAMÍLIA — EXTERNA ──────────────────────────────────────
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
    description: "Ensaios infantis avulsos — estúdio ou externo. Momentos da infância registrados com amor e diversão.",
    requerCrianca: true,
    modalities: [
      {
        id: "infantil_duo",
        label: "Ensaio Duo",
        detail: "60 fotos · 1 cenário temático + 1 cenário família",
        price: 280,
        fotos: 60,
      },
      {
        id: "infantil_one",
        label: "Ensaio One",
        detail: "40 fotos · 1 cenário temático",
        price: 180,
        fotos: 40,
      },
      {
        id: "infantil_smash_basico",
        label: "Smash the Cake básico",
        detail: "60 fotos · 1 cenário temático básico + 1 cenário família",
        price: 380,
        fotos: 60,
      },
      {
        id: "infantil_smash_completo",
        label: "Smash the Cake completo",
        detail: "A partir de 70 fotos · 1 cenário temático personalizado + 1 cenário família + bolo + arco de balão",
        price: 620,
        fotos: 70,
        incluso: ["Bolo", "Arco de balão"],
      },
      {
        id: "infantil_clean",
        label: "Ensaio Clean",
        detail: "20 fotos · Fundo branco ou colorido · Acessórios como balões numéricos, balões ou bolo são cobrados separadamente",
        price: 280,
        fotos: 20,
      },
      {
        id: "infantil_externo",
        label: "Externo",
        detail: "40 fotos · 1h de ensaio · Dentro de Bauru",
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
    description: "Cobertura fotográfica do seu evento, todas as fotos tratadas e entregues em até 10 dias. Valor para dentro de Bauru.",
    requerCrianca: false,
    descontoExtras: true,
    extras: EXTRAS_EVENTOS,
    modalities: [
      {
        id: "aniversario_3h",
        label: "Básico 3h",
        detail: "3h de cobertura · Todas as fotos tratadas · Entrega em até 10 dias · Dentro de Bauru",
        price: 450,
        duracao: "3h",
      },
      {
        id: "aniversario_4h",
        label: "Completo 4h",
        detail: "4h de cobertura · Todas as fotos tratadas · Entrega em até 10 dias · Dentro de Bauru",
        price: 580,
        duracao: "4h",
      },
    ],
  },

  // ── BATIZADO / CONFRATERNIZAÇÃO / CHÁ REVELAÇÃO ────────────
  {
    id: "batizado",
    label: "Batizado / Confraternização / Chá Revelação",
    icon: "⛪",
    grupo: "evento",
    description: "Cobertura fotográfica da sua celebração especial, todas as fotos tratadas e entregues em até 10 dias. Valor para dentro de Bauru.",
    requerCrianca: false,
    descontoExtras: true,
    extras: EXTRAS_EVENTOS,
    modalities: [
      {
        id: "batizado_1h30",
        label: "1h30",
        detail: "1h30 de cobertura · Todas as fotos tratadas · Entrega em até 10 dias · Dentro de Bauru",
        price: 280,
        duracao: "1h30",
      },
      {
        id: "batizado_2h",
        label: "2h",
        detail: "2h de cobertura · Todas as fotos tratadas · Entrega em até 10 dias · Dentro de Bauru",
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
        detail: "6h de cobertura · Todas as fotos tratadas · Entrega em até 10 dias",
        price: 1650,
        duracao: "6h",
        obs: "Hora extra: R$ 275/h. Adicionais disponíveis após seleção.",
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
    description: "Pague mensalmente e resgate em ensaios ou fotos extras. Resgate mínimo após 3 meses.",
    requerCrianca: false,
    modalities: [
      {
        id: "cofrinho_sementinha",
        label: "🌱 Sementinha",
        detail: "R$ 600 ao ano · Resgate mínimo após 3 meses · Elegível em ensaios e fotos extras",
        price: 50,
        priceLabel: "R$ 50/mês",
        periodo: "mensal",
      },
      {
        id: "cofrinho_broto",
        label: "🌿 Broto",
        detail: "R$ 1.200 ao ano · Resgate mínimo após 3 meses · Elegível em ensaios e fotos extras",
        price: 100,
        priceLabel: "R$ 100/mês",
        periodo: "mensal",
      },
      {
        id: "cofrinho_florido",
        label: "🌸 Florido",
        detail: "R$ 1.800 ao ano · Resgate mínimo após 3 meses · Elegível em ensaios e fotos extras",
        price: 150,
        priceLabel: "R$ 150/mês",
        periodo: "mensal",
      },
      {
        id: "cofrinho_crescido",
        label: "🌳 Crescido",
        detail: "R$ 2.400 ao ano · Resgate mínimo após 3 meses · Elegível em ensaios e fotos extras",
        price: 200,
        priceLabel: "R$ 200/mês",
        periodo: "mensal",
      },
    ],
  },

  // ── VALE PRESENTE ──────────────────────────────────────────
  {
    id: "vale-presente",
    label: "Vale Presente",
    icon: "🎁",
    grupo: "vale",
    tipo: "vale",
    description: "Presenteie alguém especial com um ensaio na Crescidinhos. O valor é escolhido por você.",
    requerCrianca: false,
    modalities: [
      {
        id: "vale_presente",
        label: "Vale Presente",
        detail: "Você escolhe o valor a presentear. Pode ser usado em qualquer ensaio.",
        price: null,
        priceLabel: "Valor livre",
        obs: "Informe o valor desejado no campo de observações.",
      },
    ],
  },
];

// =============================================================
// HELPERS
// =============================================================
export function modeloContrato(serviceId) {
  const m = {
    chamego: "pacote_recorrente",
    afeto: "pacote_recorrente",
    "gestante-estudio": "ensaio",
    "gestante-externa": "ensaio",
    newborn: "menor_newborn",
    campanha: "ensaio",
    "adulto-estudio": "ensaio",
    "adulto-externo": "ensaio",
    "familia-estudio": "ensaio",
    "familia-externa": "ensaio",
    infantil: "menor_infantil",
    aniversario: "evento",
    batizado: "evento",
    "quinze-anos": "evento",
    cofrinho: "assinatura",
    "vale-presente": "vale",
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

export function fmtPreco(price, priceLabel, periodo) {
  if (priceLabel) return priceLabel;
  if (!price) return "A consultar";
  const base = `R$ ${price.toLocaleString("pt-BR")}`;
  if (periodo === "mensal") return `${base}/mês`;
  return base;
}
