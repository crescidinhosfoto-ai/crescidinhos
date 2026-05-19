// googleCalendar.js — Crescidinhos Fotografia
// Busca horários disponíveis via n8n (que lê o iCal do Google Calendar)

const N8N_BASE = "https://ribbitingboar-n8n.cloudfy.live";

/**
 * Busca horários disponíveis para uma data via n8n (iCal do Google Calendar)
 * @param {string} data - formato 'YYYY-MM-DD'
 * @returns {Promise<string[]|null>} array de horários ou null se erro (usar fallback)
 */
export async function fetchHorariosDisponiveis(data) {
  try {
    const url = `${N8N_BASE}/webhook/horarios-disponiveis?data=${data}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.horarios) ? json.horarios : null;
  } catch (err) {
    console.warn("[Google Calendar] Erro ao buscar horários:", err.message);
    return null; // null = usar fallback Supabase ou horários padrão
  }
}

// Mantido para compatibilidade — não usado ativamente
export async function fetchCalendarEvents() {
  return [];
}

export async function createCalendarEvent() {
  return null;
}
