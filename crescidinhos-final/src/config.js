// =============================================================
// config.js — Crescidinhos Fotografia
// Versão SEM preços expostos ao cliente (valores ficam com a Clarice)
// =============================================================

export const PHOTOGRAPHER = {
  email: "crescidinhosfoto@gmail.com",
  name: "Crescidinhos Fotografia",
  owner: "Thais de Sa Nascimento Dutra",
  cpf: "000.000.000-00", // ⚠️ Preencha seu CPF
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

// Horários disponíveis para agendamento
export const TIMES = [
  "08:00", "09:00", "09:30",
  "10:00", "10:30", "11:00",
  "13:00", "13:30", "14:00",
  "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00",
];

// =============================================================
// SERVIÇOS
// Cada serviço tem:
//   icon, label, description — exibidos na listagem (SEM preço)
//   modalities — opções que o cliente escolhe dentro do serviço
//     (se só tem 1 modalidade, é selecionada automaticamente)
// =============================================================
export const SERVICES = [
  {
    id: "gestante",
    label: "Gestante",
    icon: "🤰",
    description: "De 28 a 38 semanas de gestação. Registramos esse momento único com todo cuidado.",
    modalities: [
      { id: "lite",  label: "Lite",  detail: "1 cenário clean + 1 cenário família · 20 fotos · Até 2 trocas de roupa" },
      { id: "plus",  label: "Plus",  detail: "1 cenário clean + 1 cenário família · 30 fotos · Até 2 trocas de roupa" },
    ],
  },
  {
    id: "newborn",
    label: "Newborn",
    icon: "👶",
    description: "Bebês até 12 dias de vida. Cenário temático + cenário família.",
    modalities: [
      { id: "unico", label: "Sessão Newborn", detail: "Cenário temático adaptado + cenário família (pais e irmãos) · 15 fotos" },
    ],
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento Mensal",
    icon: "📅",
    description: "Do primeiro mês ao primeiro aninho — 11 meses de registro com o Mascote Elefante Crescidinho incluso.",
    modalities: [
      { id: "chamego", label: "Chamego", detail: "1 cenário temático bebê + 1 cenário mascote · Todas as fotos · Pagamento mensal" },
      { id: "afeto",   label: "Afeto",   detail: "1 cenário temático + 1 cenário família + 1 cenário mascote · Todas as fotos · Pagamento mensal" },
    ],
  },
  {
    id: "tematico",
    label: "Temático Sazonal",
    icon: "🎨",
    description: "Dia das Mães, Páscoa, Natal, Junina, Dia das Crianças e muito mais.",
    modalities: [
      { id: "1-cenario",  label: "1 Cenário",  detail: "30 min · 15 fotos · Até 5 participantes" },
      { id: "2-cenarios", label: "2 Cenários", detail: "40 min · 25 fotos · Até 5 participantes" },
    ],
  },
  {
    id: "adulto-familia",
    label: "Adulto / Família",
    icon: "👨‍👩‍👧",
    description: "Ensaio para casais, famílias e adultos. Registre a sua história com amor.",
    modalities: [
      { id: "lite", label: "Lite", detail: "1 cenário clean + 1 cenário família · 20 fotos · Até 2 trocas de roupa" },
      { id: "plus", label: "Plus", detail: "1 cenário clean + 1 cenário família · 30 fotos · Até 2 trocas de roupa" },
    ],
  },
  {
    id: "infantil",
    label: "Infantil Avulso",
    icon: "🧒",
    description: "Ensaio externo para crianças — momentos da infância registrados com muito amor.",
    modalities: [
      { id: "unico", label: "Ensaio Externo", detail: "1h · 30 a 40 fotos editadas em alta resolução · Até 2 trocas de roupa" },
    ],
  },
  {
    id: "aniversario",
    label: "Aniversário",
    icon: "🎂",
    description: "O aniversário passa tão rápido — registramos cada detalhe especial do seu dia.",
    modalities: [
      { id: "economico",  label: "Econômico",             detail: "3h de cobertura fotográfica · Todas as fotos tratadas · Entrega em 1 mês" },
      { id: "pacote1",    label: "4h de cobertura",       detail: "4h de cobertura fotográfica · Todas as fotos tratadas · Entrega em 1 mês" },
      { id: "pacote2",    label: "4h + Ensaio no estúdio", detail: "4h de cobertura + ensaio no estúdio com o tema da festa (sem balão incluso) · Todas as fotos tratadas · Entrega em 1 mês" },
    ],
  },
  {
    id: "batizado",
    label: "Batizado / Confraternização",
    icon: "✝️",
    description: "Cobertura completa da sua celebração especial em Bauru. Não inclui aniversários.",
    modalities: [
      { id: "1h30", label: "1h30 de evento", detail: "Cobertura completa · Todas as fotos tratadas · Entrega via link nuvem" },
      { id: "2h",   label: "2h de evento",   detail: "Cobertura completa · Todas as fotos tratadas · Entrega via link nuvem" },
    ],
  },
  {
    id: "quinze-anos",
    label: "15 Anos",
    icon: "👑",
    description: "Um momento único que merece ser eternizado com todo cuidado e emoção.",
    modalities: [
      { id: "economico", label: "Econômico", detail: "6h de cobertura · 1 fotógrafo · Todas as fotos + link download · 10 fotos reveladas + Pen-drive" },
      { id: "pacote1",   label: "Pacote 1",  detail: "8h de cobertura · 2 fotógrafos · Making-off · Todas as fotos + link download · 10 fotos reveladas + Pen-drive" },
    ],
  },
];
