// DisponibilidadePanel.jsx — Crescidinhos Fotografia
// Painel para a Thais liberar datas e horários disponíveis no Supabase

import { useState, useEffect, useCallback } from "react";
import { SUPABASE_URL, SUPABASE_KEY } from "./config";

// Gera todos os horários do dia em intervalos de 30 min: 00:00 até 23:30
const HORARIOS_DIA = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const sb = async (path, options = {}) => {
  // Desestrutura headers separado para não sobrescrever apikey/Authorization
  const { headers: extraHeaders = {}, ...restOptions } = options;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...extraHeaders,
    },
    ...restOptions,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const C = {
  primary: "#b8967e", light: "#f5f0eb", border: "#e8e0d8",
  text: "#3d2b1f", muted: "#a09080", green: "#6a8f6a", red: "#c0392b",
};
const btn = (bg, extra = {}) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 8,
  padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", ...extra,
});
const input = {
  padding: "8px 12px", borderRadius: 8, fontSize: 14,
  border: `1.5px solid ${C.border}`, background: "#fff", color: C.text,
  outline: "none",
};

export default function DisponibilidadePanel() {
  const hoje = new Date();
  const [mes, setMes]               = useState(hoje.getMonth());
  const [ano, setAno]               = useState(hoje.getFullYear());
  const [dataSel, setDataSel]       = useState(null);
  const [horariosSel, setHorariosSel] = useState([]);
  const [disponibilidades, setDisponibilidades] = useState({});
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");

  const nomeMes = new Date(ano, mes).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const mesStr = `${ano}-${String(mes + 1).padStart(2, "0")}`;
      // Calcula o último dia real do mês (evita erro com meses de 30 dias ou fevereiro)
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      const fimMes = `${mesStr}-${String(ultimoDia).padStart(2, "0")}`;
      const res = await sb(`disponibilidades?data=gte.${mesStr}-01&data=lte.${fimMes}&select=data,horarios`);
      const mapa = {};
      (res || []).forEach(d => { mapa[d.data] = d.horarios; });
      setDisponibilidades(mapa);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const selData = (dataStr) => {
    setDataSel(dataStr);
    setHorariosSel(disponibilidades[dataStr] || []);
    setMsg("");
  };

  const toggleHorario = (h) => {
    setHorariosSel(prev =>
      prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h].sort()
    );
  };

  const salvar = async () => {
    if (!dataSel) return;
    setSaving(true);
    setMsg("");
    try {
      // Sempre deleta primeiro — evita problemas de duplicata ou falta de UNIQUE constraint
      await sb(`disponibilidades?data=eq.${dataSel}`, { method: "DELETE" });

      if (horariosSel.length === 0) {
        const novo = { ...disponibilidades };
        delete novo[dataSel];
        setDisponibilidades(novo);
        setMsg("✅ Data removida das disponibilidades.");
      } else {
        // Insere novo registro limpo
        await sb("disponibilidades", {
          method: "POST",
          body: JSON.stringify({ data: dataSel, horarios: horariosSel }),
        });
        setDisponibilidades(d => ({ ...d, [dataSel]: horariosSel }));
        setMsg(`✅ ${horariosSel.length} horário(s) salvos para ${new Date(dataSel + "T12:00:00").toLocaleDateString("pt-BR")}.`);
      }
    } catch (e) {
      setMsg("❌ Erro ao salvar: " + e.message);
    }
    setSaving(false);
  };

  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDia = new Date(ano, mes, 1).getDay();

  const todos = HORARIOS_DIA;

  return (
    <div style={{ maxWidth: 480 }}>
      <h3 style={{ color: C.primary, marginBottom: 4 }}>🗓 Disponibilidade</h3>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
        Selecione uma data e os horários disponíveis para agendamento.
      </p>

      {/* Calendário */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => { if (mes === 0) { setMes(11); setAno(a => a - 1); } else setMes(m => m - 1); }}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>{nomeMes}</span>
          <button onClick={() => { if (mes === 11) { setMes(0); setAno(a => a + 1); } else setMes(m => m + 1); }}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
            <div key={d} style={{ fontSize: 10, color: C.muted, padding: "4px 0", fontWeight: 600 }}>{d}</div>
          ))}
          {Array(primeiroDia).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(diasNoMes).fill(null).map((_, i) => {
            const d = i + 1;
            const dataStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const temHorarios = disponibilidades[dataStr]?.length > 0;
            const sel = dataSel === dataStr;
            return (
              <button key={d} onClick={() => selData(dataStr)}
                style={{
                  padding: "6px 2px", borderRadius: 8, border: "none", fontSize: 13,
                  background: sel ? C.primary : temHorarios ? "#e8f5e8" : "transparent",
                  color: sel ? "#fff" : temHorarios ? C.green : C.text,
                  cursor: "pointer", fontWeight: sel ? 700 : temHorarios ? 600 : 400,
                  position: "relative",
                }}>
                {d}
                {temHorarios && !sel && (
                  <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: C.green }} />
                )}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: C.muted, textAlign: "center", margin: "8px 0 0" }}>
          Datas verdes = horários liberados
        </p>
      </div>

      {/* Horários */}
      {dataSel && (
        <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 700 }}>
            {new Date(dataSel + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>

          <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 12, paddingRight: 4 }}>
            {["Madrugada (00–05)", "Manhã (06–11)", "Tarde (12–17)", "Noite (18–23)"].map((titulo, bloco) => {
              const slots = todos.filter(h => {
                const hora = parseInt(h);
                return hora >= bloco * 6 && hora < (bloco + 1) * 6;
              });
              return (
                <div key={bloco} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, color: C.muted, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "1px" }}>{titulo}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5 }}>
                    {slots.map(h => {
                      const sel = horariosSel.includes(h);
                      return (
                        <button key={h} onClick={() => toggleHorario(h)}
                          style={{
                            padding: "7px 2px", borderRadius: 6,
                            border: `1.5px solid ${sel ? C.primary : C.border}`,
                            background: sel ? C.light : "#fff",
                            color: sel ? C.primary : C.text,
                            fontWeight: sel ? 700 : 400,
                            fontSize: 11, cursor: "pointer",
                          }}>
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setHorariosSel([...todos])} style={btn(C.muted, { flex: 1, fontSize: 12 })}>
              Todos
            </button>
            <button onClick={() => setHorariosSel([])} style={btn("#ddd", { flex: 1, fontSize: 12, color: C.text })}>
              Limpar
            </button>
            <button onClick={salvar} disabled={saving} style={btn(C.green, { flex: 2 })}>
              {saving ? "Salvando..." : "💾 Salvar"}
            </button>
          </div>

          {msg && (
            <p style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("✅") ? C.green : C.red }}>
              {msg}
            </p>
          )}
        </div>
      )}

      {/* Resumo do mês */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14 }}>Resumo do mês</p>
        {loading ? (
          <p style={{ color: C.muted, fontSize: 13 }}>Carregando...</p>
        ) : Object.keys(disponibilidades).length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13 }}>Nenhuma data liberada neste mês.</p>
        ) : (
          Object.entries(disponibilidades)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([data, hs]) => (
              <div key={data}
                onClick={() => selData(data)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                  fontSize: 13,
                }}>
                <span style={{ fontWeight: 600 }}>
                  {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span style={{ color: C.muted }}>{hs.length} horário(s): {hs.slice(0, 3).join(", ")}{hs.length > 3 ? "..." : ""}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
