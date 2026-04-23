// ─────────────────────────────────────────────────────────────────
// CONFIGURAÇÕES DA CRESCIDINHOS FOTOGRAFIA — Thais de Sá
// ⚠️ Para alterar preços ou serviços, edite este arquivo
//    e faça Redeploy na Vercel. Simples assim!
// ─────────────────────────────────────────────────────────────────

export const PHOTOGRAPHER = {
  email: "crescidinhosfoto@gmail.com",     // ⚠️ Substitua pelo seu e-mail Google
  name: "Crescidinhos Fotografia",
  owner: "Thais de Sá Nascimento Dutra",
  cpf: "410.593.908-41",           // ⚠️ Preencha seu CPF
  phone: "(14) 99684-5521",
  whatsapp: "5514996845521",
  instagram: "@thaisdesafotografia",
  pix: "(14) 99684-5521",
  cidade: "Bauru e Região",
};

// ⚠️ Cole aqui a URL do Webhook do n8n (Cloudfy) após configurar
export const WEBHOOK_URL = "https://seu-n8n.cloudfy.host/webhook/novo-agendamento";

// ─── SERVIÇOS ─────────────────────────────────────────────────────
export const SERVICES = [
  {
    id: "gestante",
    label: "Gestante",
    icon: "🤰",
    desc: "O nosso ciclo começa aqui! Entre 28 e 38 semanas.",
    duration: "1h30",
    highlight: "Até 2 trocas de roupa · Pré-seleção em 10 dias",
    packages: [
      { name: "Lite", price: 460, fotos: 20, desc: "1 cenário clean + 1 cenário família · 20 fotos" },
      { name: "Plus", price: 580, fotos: 30, desc: "1 cenário clean + 1 cenário família · 30 fotos" },
    ],
    obs: "Reserva com 40% antecipado. Foto extra: R$ 12,00 cada. Desistência: valor da reserva não devolvido.",
    price: 460,
  },
  {
    id: "newborn",
    label: "Newborn",
    icon: "👶",
    desc: "Os primeiros 12 dias de vida do bebê.",
    duration: "Até 4h",
    highlight: "Cenário temático + 1 cenário família (pais e irmãos)",
    packages: [
      { name: "Único", price: 480, fotos: 15, desc: "Cenário temático adaptado + cenário família · 15 fotos · Em 3x sem juros" },
    ],
    obs: "Para bebês com mais de 12 dias, indicamos o Acompanhamento Mensal.",
    price: 480,
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento Mensal",
    icon: "📅",
    desc: "Registre a evolução do seu bebê por 11 meses.",
    duration: "1h por sessão",
    highlight: "11 meses · Mascote Elefante Crescidinho incluso",
    packages: [
      { name: "Chamego", price: 160, fotos: null, desc: "1 cenário temático bebê + 1 cenário mascote · Todas as fotos · R$ 160/mês" },
      { name: "Afeto",   price: 180, fotos: null, desc: "1 cenário temático bebê + 1 cenário família + 1 cenário mascote · Todas as fotos · R$ 180/mês" },
    ],
    obs: "Pacote por contrato de 11 meses. Pagamento mensal no dia do ensaio. Roupinhas disponíveis de 1 a 12 meses.",
    price: 160,
  },
  {
    id: "tematico",
    label: "Temático Sazonal",
    icon: "🎉",
    desc: "Dia das Mães, Páscoa, Natal, Junina, Dia das Crianças e mais.",
    duration: "30 a 40 min",
    highlight: "Reserva com 30 dias · Pago em 2x",
    packages: [
      { name: "1 Cenário",  price: 150, fotos: 15, desc: "1 cenário · 30 min · 15 fotos · Até 5 participantes · Foto extra R$ 8,00" },
      { name: "2 Cenários", price: 250, fotos: 25, desc: "2 cenários · 40 min · 25 fotos · Até 5 participantes · Foto extra R$ 8,00" },
    ],
    obs: "Em caso de desistência o valor do agendamento não será devolvido.",
    price: 150,
  },
  {
    id: "adulto",
    label: "Adulto / Família",
    icon: "👨‍👩‍👧",
    desc: "Seu ensaio, sua história. Mesmos pacotes da gestante.",
    duration: "1h30",
    highlight: "Até 2 trocas de roupa · Pré-seleção em 10 dias",
    packages: [
      { name: "Lite", price: 460, fotos: 20, desc: "1 cenário clean + 1 cenário família · 20 fotos" },
      { name: "Plus", price: 580, fotos: 30, desc: "1 cenário clean + 1 cenário família · 30 fotos" },
    ],
    obs: "Foto extra: R$ 12,00 cada. Para locais fora de Bauru, acréscimo de deslocamento.",
    price: 460,
  },
  {
    id: "infantil",
    label: "Infantil Avulso",
    icon: "🧒",
    desc: "Ensaio externo. Momentos da infância registrados com muito amor.",
    duration: "1h",
    highlight: "30 a 40 fotos editadas em alta resolução · Até 2 trocas de roupa",
    packages: [
      { name: "Único", price: 580, fotos: 35, desc: "Ensaio externo · 1h · 30 a 40 fotos editadas em alta resolução · Até 2 trocas de roupa · Em 3x de R$ 220,93" },
    ],
    obs: "Para locais fora de Bauru, acréscimo de deslocamento.",
    price: 580,
  },

  // ── ANIVERSÁRIOS ──────────────────────────────────────────────
  {
    id: "aniversario",
    label: "Aniversário",
    icon: "🎂",
    desc: "O aniversário passa tão rápido! Registramos cada detalhe especial.",
    duration: "3h a 4h",
    highlight: "Todas as fotos tratadas em alta resolução · Link Google Drive · Entrega em 1 mês",
    packages: [
      {
        name: "Econômico",
        price: 450,
        fotos: null,
        desc: "3h de cobertura fotográfica · Todas as fotos tratadas e em alta resolução · Link via Google Drive para download · Entrega final em 1 mês · Em 3x de R$ 171,41",
      },
      {
        name: "Pacote 1",
        price: 580,
        fotos: null,
        desc: "4h de cobertura fotográfica · Todas as fotos tratadas e em alta resolução · Link via Google Drive para download · Entrega final em 1 mês · Em 3x de R$ 220,93",
      },
      {
        name: "Pacote 2 — Com Ensaio",
        price: 780,
        fotos: null,
        desc: "4h de cobertura fotográfica + Ensaio no estúdio com o tema da festa (sem balão incluso) · Todas as fotos tratadas e em alta resolução · Link via Google Drive para download · Entrega final em 1 mês · Em 3x de R$ 297,11",
      },
    ],
    obs: "Dentro da cidade de Bauru. Para locais fora de Bauru, acréscimo de deslocamento.",
    price: 450,
  },

  // ── BATIZADOS E CONFRATERNIZAÇÕES ─────────────────────────────
  {
    id: "batizado",
    label: "Batizado / Confraternização",
    icon: "🕊️",
    desc: "Cobertura completa da sua celebração especial. Não inclui aniversários.",
    duration: "1h30 a 2h",
    highlight: "Dentro de Bauru · Todas as fotos tratadas · Entrega via link nuvem",
    packages: [
      {
        name: "1h30 de evento",
        price: 280,
        fotos: null,
        desc: "Cobertura completa da festa · 1h30 de duração · Todas as fotos tratadas e em alta resolução · Entrega via link nuvem · Em 2x de R$ 158,00",
      },
      {
        name: "2h de evento",
        price: 360,
        fotos: null,
        desc: "Cobertura completa da festa · 2h de duração · Todas as fotos tratadas e em alta resolução · Entrega via link nuvem · Em 2x de R$ 203,14",
      },
    ],
    obs: "Esses pacotes não incluem aniversários. Dentro da cidade de Bauru.",
    price: 280,
  },

  // ── 15 ANOS ───────────────────────────────────────────────────
  {
    id: "quinze_anos",
    label: "15 Anos",
    icon: "👑",
    desc: "Um momento único que merece ser eternizado com todo cuidado.",
    duration: "6h a 8h",
    highlight: "Todas as fotos tratadas · Link para download · 10 fotos reveladas + Pen-drive",
    packages: [
      {
        name: "Econômico",
        price: 1650,
        fotos: null,
        desc: "6h de cobertura · 1 fotógrafo · Todas as fotos tratadas em alta resolução + link download · Entrega em 10 dias · 10 fotos reveladas + Pen-drive · Em 3x de R$ 628,50",
      },
      {
        name: "Pacote 1",
        price: 2500,
        fotos: null,
        desc: "8h de cobertura · 2 fotógrafos · Making-off · Todas as fotos tratadas em alta resolução + link download · Entrega em 10 dias · 10 fotos reveladas + Pen-drive · Em 3x de R$ 952,27",
      },
    ],
    obs: "Ensaio avulso de 15 anos (externo, 1h, 30-40 fotos, 2 trocas): R$ 580,00. Para locais fora de Bauru, acréscimo de deslocamento.",
    price: 1650,
  },
];

// ─── HORÁRIOS ────────────────────────────────────────────────────
export const TIMES = ["08:00", "09:30", "11:00", "13:00", "14:30", "16:00", "17:30"];

// ─── PRODUTOS ADICIONAIS ──────────────────────────────────────────
export const PRODUCTS = [
  { name: "Quadro lona esticada (0,70x1,00cm)", price: 380 },
  { name: "Álbum (25x50cm, 20 págs., 50 fotos)", price: 750 },
  { name: "Foto extra — gestante/adulto/infantil", price: 12 },
  { name: "Foto extra — temático sazonal", price: 8 },
  { name: "Taxa de limpeza (pet)", price: 100 },
];
