const N8N_BASE = "https://ribbitingboar-n8n.cloudfy.live";

export async function fetchHorariosDisponiveis(data) {
  try {
    const url = `${N8N_BASE}/webhook/horarios-disponiveis?data=${data}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.horarios) ? json.horarios : null;
  } catch (err) {
    console.warn("[Google Calendar] Erro:", err.message);
    return null;
  }
}

export async function fetchCalendarEvents() { return []; }
export async function createCalendarEvent() { return null; }
