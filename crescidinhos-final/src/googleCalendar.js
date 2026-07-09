// googleCalendar.js — Crescidinhos Fotografia
// Lê disponibilidade direto do Supabase (tabela disponibilidades)
// Bloqueia automaticamente horários já agendados, considerando duração do serviço

import { SUPABASE_URL, SUPABASE_KEY, SERVICES } from "./config";

// Busca duração do serviço no config pelo servico_id ou label
function getDuracaoMin(ag) {
  if (ag.duracao_min && ag.duracao_min > 0) return ag.duracao_min;
  // Tenta achar pela modalidade no config
  if (ag.servico_id || ag.modalidade_id) {
    for (const svc of SERVICES) {
      for (const mod of svc.modalities || []) {
        if (mod.id === ag.modalidade_id || mod.id === ag.servico_id) {
          return mod.duracao_min || 60;
        }
      }
    }
  }
  return 60; // fallback: 1h
}

const sbGet = async (path) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

/**
 * Busca quais datas do mês têm horários liberados no Supabase
 * @param {number} ano
 * @param {number} mes - 1-12
 * @returns {Promise<string[]>} ex: ["2026-05-24","2026-05-27"]
 */
export async function fetchDatasDisponiveis(ano, mes) {
  try {
    const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
    // Calcula o último dia real do mês (evita erro com meses de 30 dias ou fevereiro)
    const ultimoDia = new Date(ano, mes, 0).getDate(); // mes já é 1-indexed aqui
    const fimMes = `${mesStr}-${String(ultimoDia).padStart(2, "0")}`;
    const res = await sbGet(
      `disponibilidades?data=gte.${mesStr}-01&data=lte.${fimMes}&select=data`
    );
    return (res || []).map((d) => d.data);
  } catch (err) {
    console.warn("[Disp] datas error:", err);
    return [];
  }
}

/**
 * Busca horários disponíveis para uma data, bloqueando os já ocupados
 * @param {string} data - formato 'YYYY-MM-DD'
 * @param {number} duracaoMin - duração do serviço em minutos (default 60)
 * @returns {Promise<string[]>} ex: ["09:00","10:00"]
 */
export async function fetchHorariosDisponiveis(data, duracaoMin = 60) {
  try {
    // 1. Horários liberados pela Thais para este dia
    const dispRes = await sbGet(
      `disponibilidades?data=eq.${data}&select=horarios`
    );
    if (!dispRes || dispRes.length === 0) return [];
    const horariosLiberados = dispRes[0].horarios || [];
    if (horariosLiberados.length === 0) return [];

    // 2. Agendamentos ativos do dia para calcular bloqueios
    const agsRes = await sbGet(
      `agendamentos?data=eq.${data}&status=not.in.(Cancelado)&select=hora,duracao_min,servico_id,modalidade_id`
    );
    const agendados = agsRes || [];

    // 3a. Compromissos pessoais que bloqueiam horário
    const diaInteiroRes = await sbGet(
      `compromissos?data=eq.${data}&dia_inteiro=eq.true&bloqueia_horario=eq.true&select=id&limit=1`
    );
    if (diaInteiroRes?.length > 0) return [];

    const compRes = await sbGet(
      `compromissos?data=eq.${data}&dia_inteiro=eq.false&bloqueia_horario=eq.true&select=hora_inicio,hora_fim`
    );
    const intervalosCompromissos = (compRes || [])
      .filter(c => c.hora_inicio && c.hora_fim)
      .map(c => {
        const [hi, mi] = c.hora_inicio.split(":").map(Number);
        const [hf, mf] = c.hora_fim.split(":").map(Number);
        return [hi * 60 + mi, hf * 60 + mf];
      });

    // 3b. Monta intervalos bloqueados [inicio_min, fim_min)
    const intervalosOcupados = [
      ...agendados
        .filter((ag) => ag.hora)
        .map((ag) => {
          const [h, m] = ag.hora.split(":").map(Number);
          const inicio = h * 60 + m;
          const dur = getDuracaoMin(ag);
          return [inicio, inicio + dur];
        }),
      ...intervalosCompromissos,
    ];

    // 4. Filtra slots: o slot é válido se [slot, slot+duracaoMin) não colide com ocupados
    return horariosLiberados.filter((slot) => {
      const [sh, sm] = slot.split(":").map(Number);
      const slotInicio = sh * 60 + sm;
      const slotFim = slotInicio + duracaoMin;
      return !intervalosOcupados.some(
        ([inicio, fim]) => slotInicio < fim && slotFim > inicio
      );
    });
  } catch (err) {
    console.warn("[Disp] horarios error:", err);
    return [];
  }
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
