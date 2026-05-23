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

    // 3. Monta intervalos bloqueados [inicio_min, fim_min)
    const intervalosOcupados = agendados
      .filter((ag) => ag.hora)
      .map((ag) => {
        const [h, m] = ag.hora.split(":").map(Number);
        const inicio = h * 60 + m;
        const dur = getDuracaoMin(ag); // usa duração real do serviço
        return [inicio, inicio + dur];
      });

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

// Mantidos para compatibilidade
export async function fetchCalendarEvents() { return []; }
export async function createCalendarEvent() { return null; }
