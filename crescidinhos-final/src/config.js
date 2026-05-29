// =============================================================
// config.js — Crescidinhos Fotografia
// Estrutura compatível com App.js (.label .icon .modalities)
// duracao_min = minutos para bloqueio automático no Google Calendar
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

export const WEBHOOK_CONFIRMAR =
  "https://ribbitingboar-n8n.cloudfy.live/webhook/confirmar-agendamento";

export const SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co";
export const SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3";

export const REGRAS = {
  descontoExtras: 0.10,
  toleranciaAtrasoMin: 15,
  prazoCancelamentoHoras: 48,
  prazoSelecaoFotosDias: 5,
  prazoEntregaDias: 10,
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
  const sub = subtotal; // alias para ExtrasPanel
  const disc = desconto;
  const total = subtotal - desconto;
  return { base, totalExtras, desconto, disc, sub, total };
};

// ─── EXTRAS COMUNS ───────────────────────────────────────────────
const ALBUM      = { id: "album",      label: "Álbum impresso",    price: 750 };
const QUADRO     = { id: "quadro",     label: "Quadros",           price: 280 };
const FOTOGRAFO2 = { id: "fotografo2", label: "+1 Fotógrafo",       price: 450 };
const MAKINGOFF  = { id: "makingoff",  label: "Making off",         price: 400 };
const HORA_EXTRA = { id: "hora-extra", label: "Hora adicional",     price: 275 };
const BALOES     = { id: "baloes",     label: "Balões",             price: 160 };
const ENSAIO_DUO = { id: "extra-duo",  label: "Ensaio Duo",         price: 280, precisaAgenda: true, duracao_min: 60 };
const SMASH_BAS  = { id: "extra-smash",     label: "Smash Básico",    price: 380, precisaAgenda: true, duracao_min: 60 };
const SMASH_COMP = { id: "extra-smash-comp", label: "Smash Completo", price: 620, precisaAgenda: true, duracao_min: 60 };

export const SERVICES = [
  // ─── CHAMEGO (Acompanhamento básico) ────────────────────────────
  {
    id: "chamego", icon: "🥰", label: "Chamego",
    grupo: "ensaio", categoria: "acompanhamento",
    detail: "Acompanhe a melhor fase do seu filho. Você pode escolher 1 cenário temático e faremos mais o cenário com o nosso mascote. Para você lembrar como eles crescem rápido.",
    descontoExtras: false,
    modalities: [
      { id: "chamego-trimestral", label: "A cada 3 meses", price: 230,
        detail: "35 fotos editadas · 1h · Estúdio", fotos: 35, duracao: "1h", duracao_min: 60 },
      { id: "chamego-anual", label: "12 meses completo", price: 160,
        detail: "20 fotos por sessão · 1h · Estúdio", fotos: 20, duracao: "1h", duracao_min: 60 },
    ],
    extras: [],
  },

  // ─── AFETO (Acompanhamento completo) ────────────────────────────
  {
    id: "afeto", icon: "💛", label: "Afeto",
    grupo: "ensaio", categoria: "acompanhamento",
    detail: "Acompanhe a melhor fase do seu filho. Você pode escolher 1 cenário temático, 1 cenário família e faremos mais o cenário com o nosso mascote. Para você lembrar como eles crescem rápido de um jeito mais completo.",
    descontoExtras: false,
    modalities: [
      { id: "afeto-trimestral", label: "A cada 3 meses", price: 280,
        detail: "55 fotos editadas · 1h · Estúdio", fotos: 55, duracao: "1h", duracao_min: 60 },
      { id: "afeto-anual", label: "12 meses completo", price: 180,
        detail: "40 fotos por sessão · 1h · Estúdio", fotos: 40, duracao: "1h", duracao_min: 60 },
    ],
    extras: [],
  },

  // ─── GESTANTE / REVELAÇÃO ────────────────────────────────────────
  {
    id: "gestante", icon: "🤰", label: "Gestante / Revelação",
    grupo: "ensaio",
    detail: "Da descoberta ou entre o período de 28 a 38 semanas. Registramos esse momento único no conforto do estúdio ou em locações dentro de Bauru.",
    descontoExtras: false,
    modalities: [
      { id: "gestante-life", label: "Estúdio — Life", price: 380,
        detail: "20 fotos · 2h · 1 cenário clean + 1 cenário Família", fotos: 20, duracao: "2h", duracao_min: 120 },
      { id: "gestante-plus", label: "Estúdio — Plus", price: 480,
        detail: "30 fotos · 2h · 1 cenário clean + 1 cenário Família", fotos: 30, duracao: "2h", duracao_min: 120 },
      { id: "gestante-ext", label: "Externa", price: 580,
        detail: "50 fotos · 2h · Locações dentro de Bauru", fotos: 50, duracao: "2h", duracao_min: 120 },
    ],
    extras: [],
  },

  // ─── NEWBORN ─────────────────────────────────────────────────────
  {
    id: "newborn", icon: "🍼", label: "Newborn",
    grupo: "ensaio",
    detail: "Verificar dia com a fotógrafa, devido à demanda e o tempo do serviço. Bebês preferencialmente até 10 dias de vida. Sessão com pausas e total segurança, 1 cenário para o registro do bebê e 1 cenário para registro de família.",
    descontoExtras: false,
    modalities: [
      { id: "newborn-studio", label: "Sessão Newborn", price: 480,
        detail: "20 fotos editadas · 3h · Sessão com pausas e segurança total", fotos: 20, duracao: "3h", duracao_min: 180 },
    ],
    extras: [],
  },

  // ─── ADULTO / CORPORATIVO ────────────────────────────────────────
  {
    id: "adulto", icon: "💼", label: "Adulto / Corporativo",
    grupo: "ensaio",
    detail: "Ensaio adulto, perfil profissional e corporativo no estúdio, com 2 cenários: 1 conforme o perfil do cliente e 1 clean. Ou no seu local de trabalho.",
    descontoExtras: false,
    modalities: [
      { id: "adulto-life", label: "Estúdio — Life", price: 380,
        detail: "20 fotos · 2h · 2 cenários", fotos: 20, duracao: "2h", duracao_min: 120 },
      { id: "adulto-plus", label: "Estúdio — Plus", price: 480,
        detail: "30 fotos · 2h · 2 cenários", fotos: 30, duracao: "2h", duracao_min: 120 },
      { id: "adulto-ext", label: "Externa", price: 420,
        detail: "40 fotos · 2h · Local de trabalho ou externo · Dentro de Bauru", fotos: 40, duracao: "2h", duracao_min: 120 },
    ],
    extras: [],
  },

  // ─── FAMÍLIA ─────────────────────────────────────────────────────
  {
    id: "familia", icon: "👨‍👩‍👧", label: "Família",
    grupo: "ensaio",
    detail: "Ensaio de família registrando com amor e a personalidade de cada família — até 5 participantes.",
    descontoExtras: false,
    modalities: [
      { id: "familia-life", label: "Estúdio — Life", price: 380,
        detail: "20 fotos · 2h · Estúdio", fotos: 20, duracao: "2h", duracao_min: 120 },
      { id: "familia-plus", label: "Estúdio — Plus", price: 480,
        detail: "30 fotos · 2h · Estúdio", fotos: 30, duracao: "2h", duracao_min: 120 },
      { id: "familia-ext", label: "Externa", price: 420,
        detail: "40 fotos · 2h · Luz natural e momentos únicos · Dentro de Bauru", fotos: 40, duracao: "2h", duracao_min: 120 },
    ],
    extras: [],
  },

  // ─── CAMPANHA SAZONAL ────────────────────────────────────────────
  {
    id: "sazonal", icon: "🌸", label: "Campanha Sazonal",
    grupo: "ensaio",
    detail: "Dia das Mães, Dia dos Pais, Páscoa, Junina, Natal e muito mais. Entre em contato para saber as campanhas disponíveis.",
    descontoExtras: false,
    modalities: [
      { id: "sazonal-consulta", label: "Consultar disponibilidade", price: null,
        detail: "Valor conforme a campanha · 1h · Entre em contato para saber as próximas datas", duracao: "1h", duracao_min: 60 },
    ],
    extras: [],
  },

  // ─── INFANTIL AVULSO ─────────────────────────────────────────────
  {
    id: "infantil", icon: "👶", label: "Infantil Avulso",
    grupo: "ensaio",
    detail: "Ensaios infantis avulsos — estúdio ou externo. Momentos da infância registrados com amor e diversão.",
    descontoExtras: false,
    modalities: [
      { id: "inf-duo", label: "Ensaio Duo", price: 280,
        detail: "60 fotos · 1h · 1 cenário temático + 1 cenário família", fotos: 60, duracao: "1h", duracao_min: 60 },
      { id: "inf-one", label: "Ensaio One", price: 180,
        detail: "40 fotos · 1h · 1 cenário temático", fotos: 40, duracao: "1h", duracao_min: 60 },
      { id: "inf-smash-basico", label: "Smash the Cake básico", price: 380,
        detail: "60 fotos · 1h · 1 cenário temático básico + 1 cenário família", fotos: 60, duracao: "1h", duracao_min: 60 },
      { id: "inf-smash-comp", label: "Smash the Cake completo", price: 620,
        detail: "A partir de 70 fotos · 1h · 1 cenário personalizado + família + bolo + arco de balão",
        priceLabel: "A partir de R$ 620,00", fotos: 70, duracao: "1h", duracao_min: 60 },
      { id: "inf-clean", label: "Ensaio Clean", price: 280,
        detail: "20 fotos · 1h · Fundo branco ou colorido · Acessórios cobrados separadamente", fotos: 20, duracao: "1h", duracao_min: 60 },
      { id: "inf-externo", label: "Externo", price: 320,
        detail: "40 fotos · 1h · Criança em ambiente externo · Luz natural · Dentro de Bauru", fotos: 40, duracao: "1h", duracao_min: 60 },
    ],
    extras: [],
  },

  // ─── ANIVERSÁRIO ─────────────────────────────────────────────────
  {
    id: "aniversario", icon: "🎉", label: "Aniversário",
    grupo: "evento",
    detail: "Cobertura fotográfica do seu evento, todas as fotos tratadas e entregues em até 10 dias. Valor para dentro de Bauru.",
    descontoExtras: true,
    modalities: [
      { id: "aniv-3h", label: "Básico 3h", price: 450,
        detail: "Cobertura 3h · Todas as fotos tratadas · Entrega em até 10 dias", duracao: "3h", duracao_min: 180 },
      { id: "aniv-4h", label: "Completo 4h", price: 580,
        detail: "Cobertura 4h · Todas as fotos tratadas · Entrega em até 10 dias", duracao: "4h", duracao_min: 240 },
    ],
    extras: [ENSAIO_DUO, SMASH_BAS, SMASH_COMP, QUADRO, BALOES, ALBUM],
  },

  // ─── BATIZADO / CONFRATERNIZAÇÃO / CHÁ REVELAÇÃO ─────────────────
  {
    id: "batizado", icon: "✝️", label: "Batizado / Confraternização / Chá Revelação",
    grupo: "evento",
    detail: "Cobertura fotográfica da sua celebração especial, todas as fotos tratadas e entregues em até 10 dias. Valor para dentro de Bauru.",
    descontoExtras: true,
    modalities: [
      { id: "bat-1h30", label: "1h30", price: 280,
        detail: "Cobertura 1h30 · Todas as fotos tratadas · Entrega em até 10 dias", duracao: "1h30", duracao_min: 90 },
      { id: "bat-2h", label: "2h", price: 360,
        detail: "Cobertura 2h · Todas as fotos tratadas · Entrega em até 10 dias", duracao: "2h", duracao_min: 120 },
    ],
    extras: [ENSAIO_DUO, SMASH_BAS, SMASH_COMP, QUADRO, BALOES, ALBUM],
  },

  // ─── 15 ANOS ─────────────────────────────────────────────────────
  {
    id: "15anos", icon: "👑", label: "15 Anos",
    grupo: "evento",
    detail: "Um momento único que merece ser eternizado com todo cuidado e emoção.",
    descontoExtras: true,
    modalities: [
      { id: "15-cobertura", label: "Cobertura do evento (6h)", price: 1650,
        detail: "Cobertura completa 6h", duracao: "6h", duracao_min: 360 },
    ],
    extras: [
      { id: "15-studio-life", label: "Ensaio Estúdio — Life (20 fotos)", price: 380, precisaAgenda: true, duracao_min: 120 },
      { id: "15-studio-plus", label: "Ensaio Estúdio — Plus (30 fotos)", price: 480, precisaAgenda: true, duracao_min: 120 },
      { id: "15-externo",     label: "Ensaio Externo (40 fotos)",         price: 580, precisaAgenda: true, duracao_min: 120 },
      ALBUM, QUADRO, FOTOGRAFO2, MAKINGOFF, HORA_EXTRA,
    ],
  },

  // ─── COFRINHO ────────────────────────────────────────────────────
  {
    id: "cofrinho", icon: "🪙", label: "Cofrinho de Recordações",
    grupo: "cofrinho",
    detail: "Pague mensalmente e resgate em ensaios ou fotos extras. Resgate mínimo após 3 meses.",
    semAgenda: true,
    descontoExtras: false,
    modalities: [
      { id: "sementinha", label: "Sementinha 🌱", price: 50,  periodo: "mês", detail: "R$ 50/mês · Créditos acumulam mensalmente" },
      { id: "broto",      label: "Broto 🌿",       price: 100, periodo: "mês", detail: "R$ 100/mês · Créditos acumulam mensalmente" },
      { id: "florido",    label: "Florido 🌸",     price: 150, periodo: "mês", detail: "R$ 150/mês · Créditos acumulam mensalmente" },
      { id: "crescido",   label: "Crescido 🌳",    price: 200, periodo: "mês", detail: "R$ 200/mês · Créditos acumulam mensalmente" },
    ],
    extras: [],
  },

  // ─── VALE PRESENTE ───────────────────────────────────────────────
  {
    id: "vale", icon: "🎁", label: "Vale Presente",
    grupo: "vale",
    detail: "Presenteie alguém especial com um ensaio na Crescidinhos. O valor é escolhido por você.",
    semAgenda: true,
    descontoExtras: false,
    modalities: [
      { id: "vale-livre", label: "Valor livre", price: null,
        detail: "Você escolhe o valor — a presenteada escolhe o ensaio" },
    ],
    extras: [],
  },
];

export const COFRINHO_PLANOS = SERVICES.find(s => s.id === "cofrinho")?.modalities || [];
