// googleCalendar.js — Crescidinhos Fotografia
// Disponibilidade de horários + criação de evento no Google Calendar

// A disponibilidade agora é calculada no n8n, não aqui.
//
// Antes, para saber quais horários estavam livres, o navegador lia a
// agenda pessoal da fotógrafa, os compromissos e todos os agendamentos
// do dia — e fazia a conta. Isso significava entregar a agenda inteira
// para qualquer pessoa que abrisse a tela de agendamento.
//
// Agora o site pergunta "quais horários estão livres neste dia, para um
// ensaio de X minutos?" e recebe só a lista. A conta é a mesma; o que
// muda é que o dado sensível não sai mais do servidor.
const N8N_AGENDA = "https://ribbitingboar-n8n.cloudfy.live/webhook";

const pedir = async (rota) => {
  try {
    const res = await fetch(`${N8N_AGENDA}/${rota}`);
    if (!res.ok) return [];
    const dados = await res.json();
    return Array.isArray(dados) ? dados : [];
  } catch (err) {
    console.warn("[Disp] falhou:", err);
    return [];
  }
};

/**
 * Datas do mês que têm horário liberado
 * @param {number} ano
 * @param {number} mes - 1-12
 * @returns {Promise<string[]>} ex: ["2026-05-24","2026-05-27"]
 */
export async function fetchDatasDisponiveis(ano, mes) {
  const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
  // Último dia real do mês (evita erro com meses de 30 dias ou fevereiro)
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${mesStr}-${String(ultimoDia).padStart(2, "0")}`;
  return pedir(`agenda-datas?inicio=${mesStr}-01&fim=${fim}`);
}

/**
 * Horários livres de uma data, já descontando o que está ocupado
 * @param {string} data - formato 'YYYY-MM-DD'
 * @param {number} duracaoMin - duração do serviço em minutos
 * @returns {Promise<string[]>} ex: ["09:00","10:00"]
 */
export async function fetchHorariosDisponiveis(data, duracaoMin = 60) {
  if (!data) return [];
  return pedir(`agenda-horarios?data=${data}&duracao=${duracaoMin}`);
}

/**
 * Cria um evento no Google Calendar do usuário autenticado
 * @param {string} token - access_token do Google (auth.token.access_token)
 * @param {object} ag - agendamento com data, hora, servico, clientes, etc.
 * @returns {Promise<{ok:boolean, id?:string, error?:string}>}
 */
export async function criarEventoGoogleCalendar(token, ag) {
  try {
    const cl = ag.clientes || {};
    const [h, m] = (ag.hora || "09:00").split(":").map(Number);
    const dur = ag.duracao_min || 60;
    const pad = (n) => String(n).padStart(2, "0");
    // Ancora no horário de Brasília (-03:00, sem horário de verão desde 2019) em vez do
    // fuso local do navegador, que fazia o evento aparecer 3h à frente no Google Calendar.
    const inicio = new Date(`${ag.data}T${pad(h)}:${pad(m)}:00-03:00`);
    const fim = new Date(inicio.getTime() + dur * 60000);
    // Converte o instante UTC de volta pra hora de parede de São Paulo antes de formatar.
    const fmtDT = (d) => new Date(d.getTime() - 3 * 60 * 60000).toISOString().slice(0,19);

    const evento = {
      summary: `📸 ${ag.servico}${ag.modalidade ? " — " + ag.modalidade : ""} · ${cl.nome_mae || ""}`,
      description: [
        cl.nome_mae   ? `Cliente: ${cl.nome_mae}`   : null,
        cl.telefone   ? `Tel: ${cl.telefone}`        : null,
        ag.servico    ? `Serviço: ${ag.servico}`     : null,
        ag.modalidade ? `Modalidade: ${ag.modalidade}` : null,
        ag.valor      ? `Valor: R$ ${Number(ag.valor).toFixed(2).replace(".",",")}` : null,
      ].filter(Boolean).join("\n"),
      start: { dateTime: `${fmtDT(inicio)}-03:00`, timeZone: "America/Sao_Paulo" },
      end:   { dateTime: `${fmtDT(fim)}-03:00`,    timeZone: "America/Sao_Paulo" },
      colorId: "1",
    };

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evento),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: err };
    }
    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Mantidos para compatibilidade
export async function fetchCalendarEvents() { return []; }
export async function createCalendarEvent() { return null; }
