// googleCalendar.js — Crescidinhos Fotografia
// Busca disponibilidade via n8n (que lê o iCal do Google Calendar da Thais)

const N8N_BASE = "https://ribbitingboar-n8n.cloudfy.live";

/**
 * Busca horários disponíveis para uma data específica
 * @param {string} data - formato 'YYYY-MM-DD'
 * @returns {Promise<string[]|null>} ex: ["09:00","10:00"] ou null se erro
 */
export async function fetchHorariosDisponiveis(data) {
  try {
    const res = await fetch(`${N8N_BASE}/webhook/horarios-disponiveis?data=${data}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.horarios) ? json.horarios : null;
  } catch (err) {
    console.warn("[GCal] horarios error:", err.message);
    return null;
  }
}

/**
 * Busca quais datas do mês têm pelo menos 1 slot "Ensaio" no Google Calendar
 * @param {number} ano
 * @param {number} mes - 1-12
 * @returns {Promise<string[]>} ex: ["2026-05-24","2026-05-27"]
 */
export async function fetchDatasDisponiveis(ano, mes) {
  try {
    const res = await fetch(`${N8N_BASE}/webhook/datas-disponiveis?ano=${ano}&mes=${mes}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.datas) ? json.datas : [];
  } catch (err) {
    console.warn("[GCal] datas error:", err.message);
    return [];
  }
}

// Mantidos para compatibilidade
export async function fetchCalendarEvents() { return []; }
export async function createCalendarEvent() { return null; }
