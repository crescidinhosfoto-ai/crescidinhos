export async function createCalendarEvent(accessToken, { service, date, time, nomeMae, nomeCrianca, email, phone }) {
  const [hour, minute] = time.split(":").map(Number);
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const toISO = (d) => d.toISOString();

  const event = {
    summary: `📸 ${service} — ${nomeCrianca}`,
    description: `Ensaio: ${service}\nCriança: ${nomeCrianca}\nMãe: ${nomeMae}\nE-mail: ${email}\nWhatsApp: ${phone}`,
    start: { dateTime: toISO(start), timeZone: "America/Sao_Paulo" },
    end:   { dateTime: toISO(end),   timeZone: "America/Sao_Paulo" },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email",  minutes: 1440 },
        { method: "popup",  minutes: 60   },
      ],
    },
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Erro ao criar evento no Google Calendar");
  }
  return await response.json();
}

export async function fetchCalendarEvents(accessToken) {
  const now = new Date().toISOString();
  const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${threeMonths}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) throw new Error("Erro ao buscar eventos");
  const data = await response.json();
  return data.items || [];
}
