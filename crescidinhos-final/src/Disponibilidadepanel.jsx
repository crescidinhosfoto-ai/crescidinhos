// =============================================================
// DisponibilidadePanel.jsx — Crescidinhos Fotografia
// Painel para Thais gerenciar datas e horários disponíveis
// =============================================================

import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co";
const SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3";

const sb = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const pad = n => String(n).padStart(2,"0");
const formatDate = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const formatDateBR = iso => { if(!iso) return ""; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };

const HORARIOS_PADRAO = [
  "07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30",
  "13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30",
  "19:00","19:30","20:00"
];

const BLOCOS = [
  { label: "Manhã", range: ["07:00","12:30"] },
  { label: "Tarde", range: ["13:00","17:30"] },
  { label: "Noite", range: ["18:00","20:00"] },
];

export default function DisponibilidadePanel() {
  const today = new Date();
  const [vy, setVy] = useState(today.getFullYear());
  const [vm, setVm] = useState(today.getMonth());
  const [disponibilidades, setDisponibilidades] = useState({}); // { "2026-05-24": ["08:00","09:00"] }
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dataSel, setDataSel] = useState(null); // data selecionada para editar horários
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      // Busca disponibilidades dos próximos 3 meses
      const inicio = formatDate(vy, vm, 1);
      const fim = formatDate(vm >= 10 ? vy+1 : vy, (vm+2) % 12, 28);
      const r = await sb(`disponibilidades?data=gte.${inicio}&data=lte.${fim}&order=data.asc`);
      const map = {};
      (r||[]).forEach(d => { map[d.data] = d.horarios || []; });
      setDisponibilidades(map);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [vy, vm]);

  useEffect(() => { carregar(); }, [carregar]);

  // Salva uma data no Supabase (upsert)
  const salvarData = async (data, horarios) => {
    setSalvando(true);
    try {
      if (horarios.length === 0) {
        // Remove a data se não há horários
        await sb(`disponibilidades?data=eq.${data}`, { method: "DELETE" });
        setDisponibilidades(d => { const n={...d}; delete n[data]; return n; });
      } else {
        await sb(`disponibilidades`, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ data, horarios }),
        });
        setDisponibilidades(d => ({ ...d, [data]: horarios }));
      }
      setMsg("Salvo ✓");
      setTimeout(() => setMsg(""), 2000);
    } catch(e) { alert("Erro ao salvar: " + e.message); }
    setSalvando(false);
  };

  // Toggle horário em uma data
  const toggleHorario = (hora) => {
    if (!dataSel) return;
    const atual = disponibilidades[dataSel] || [];
    const novo = atual.includes(hora) ? atual.filter(h=>h!==hora) : [...atual, hora].sort();
    setDisponibilidades(d => ({ ...d, [dataSel]: novo }));
  };

  // Selecionar bloco inteiro
  const toggleBloco = (bloco) => {
    if (!dataSel) return;
    const horasBloco = HORARIOS_PADRAO.filter(h => h >= bloco.range[0] && h <= bloco.range[1]);
    const atual = disponibilidades[dataSel] || [];
    const todasMarcadas = horasBloco.every(h => atual.includes(h));
    let novo;
    if (todasMarcadas) {
      novo = atual.filter(h => !horasBloco.includes(h));
    } else {
      novo = [...new Set([...atual, ...horasBloco])].sort();
    }
    setDisponibilidades(d => ({ ...d, [dataSel]: novo }));
  };

  // Copiar horários para múltiplas datas
  const [copiando, setCopiando] = useState(false);
  const [datasParaCopiar, setDatasParaCopiar] = useState([]);

  const confirmarCopia = async () => {
    if (!dataSel || datasParaCopiar.length === 0) return;
    setSalvando(true);
    const horarios = disponibilidades[dataSel] || [];
    try {
      for (const data of datasParaCopiar) {
        await sb(`disponibilidades`, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ data, horarios }),
        });
        setDisponibilidades(d => ({ ...d, [data]: horarios }));
      }
      setMsg(`Copiado para ${datasParaCopiar.length} data(s) ✓`);
      setTimeout(() => setMsg(""), 3000);
    } catch(e) { alert("Erro: " + e.message); }
    setCopiando(false);
    setDatasParaCopiar([]);
    setSalvando(false);
  };

  // Calendário
  const getDaysInMonth = (y,m) => new Date(y,m+1,0).getDate();
  const getFirstDay = (y,m) => new Date(y,m,1).getDay();
  const days = getDaysInMonth(vy, vm);
  const firstDay = getFirstDay(vy, vm);
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=days;d++) cells.push(d);

  const horariosDataSel = dataSel ? (disponibilidades[dataSel] || []) : [];

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, margin:0 }}>📅 Disponibilidade</h3>
        {msg && <span style={{ fontSize:12, color:"#2e7d32", fontWeight:600 }}>{msg}</span>}
        <button onClick={carregar} style={{ padding:"6px 12px", borderRadius:7, background:"#f5f0eb", border:"none", cursor:"pointer", fontSize:12, color:"#666" }}>🔄 Atualizar</button>
      </div>

      <p style={{ fontSize:12, color:"#999", marginBottom:16, lineHeight:1.6 }}>
        Clique em uma data para gerenciar os horários disponíveis. Datas marcadas em verde estão liberadas para agendamento.
      </p>

      {/* Calendário */}
      <div style={{ background:"#fff", border:"1.5px solid #e8e0d8", borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <button onClick={()=>vm===0?(setVm(11),setVy(y=>y-1)):setVm(m=>m-1)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#1a1a1a", padding:"4px 10px" }}>‹</button>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:600 }}>{MONTHS[vm]} {vy}</span>
          <button onClick={()=>vm===11?(setVm(0),setVy(y=>y+1)):setVm(m=>m+1)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#1a1a1a", padding:"4px 10px" }}>›</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 }}>
          {WEEKDAYS.map(w=><div key={w} style={{ textAlign:"center", fontSize:10, color:"#aaa", fontWeight:600, padding:"3px 0" }}>{w}</div>)}
          {cells.map((d,i) => {
            if(!d) return <div key={i}/>;
            const ds = formatDate(vy, vm, d);
            const isPast = new Date(ds) < new Date(today.toDateString());
            const temHorarios = (disponibilidades[ds] || []).length > 0;
            const isSel = dataSel === ds;
            return (
              <div
                key={i}
                onClick={() => !isPast && setDataSel(isSel ? null : ds)}
                style={{
                  textAlign:"center", padding:"6px 2px", borderRadius:8, fontSize:12,
                  fontWeight: isSel ? 700 : temHorarios ? 600 : 400,
                  background: isSel ? "#1a1a1a" : temHorarios ? "#e6f4ea" : "transparent",
                  color: isSel ? "#fff" : isPast ? "#ccc" : temHorarios ? "#2e7d32" : "#1a1a1a",
                  cursor: isPast ? "default" : "pointer",
                  border: isSel ? "2px solid #1a1a1a" : temHorarios ? "1.5px solid #a5d6a7" : "1.5px solid transparent",
                  position: "relative",
                }}
              >
                {d}
                {temHorarios && !isSel && (
                  <div style={{ fontSize:8, color:"#2e7d32", marginTop:1 }}>
                    {(disponibilidades[ds]||[]).length}h
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div style={{ display:"flex", gap:16, marginTop:8, fontSize:10, color:"#888" }}>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:"#e6f4ea", border:"1px solid #a5d6a7" }}/>
            Com horários liberados
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:"#1a1a1a" }}/>
            Selecionada
          </div>
        </div>
      </div>

      {/* Painel de horários da data selecionada */}
      {dataSel && (
        <div style={{ background:"#fff", border:"1.5px solid #e8e0d8", borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <p style={{ fontSize:11, color:"#b8967e", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", margin:"0 0 2px" }}>Horários disponíveis</p>
              <p style={{ fontSize:15, fontWeight:700, color:"#1a1a1a", margin:0, fontFamily:"'Cormorant Garamond',serif" }}>{formatDateBR(dataSel)}</p>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button
                onClick={() => setCopiando(!copiando)}
                style={{ padding:"6px 10px", borderRadius:7, background:"#f0f4ff", border:"1px solid #c0d0ff", cursor:"pointer", fontSize:11, color:"#1565C0", fontWeight:600 }}
              >
                📋 Copiar para...
              </button>
              <button
                onClick={() => salvarData(dataSel, horariosDataSel)}
                disabled={salvando}
                style={{ padding:"6px 14px", borderRadius:7, background: salvando?"#ccc":"#1a1a1a", border:"none", cursor: salvando?"default":"pointer", fontSize:12, color:"#fff", fontWeight:600 }}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>

          {/* Seleção rápida por bloco */}
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {BLOCOS.map(b => {
              const horasBloco = HORARIOS_PADRAO.filter(h => h >= b.range[0] && h <= b.range[1]);
              const todasMarcadas = horasBloco.every(h => horariosDataSel.includes(h));
              return (
                <button
                  key={b.label}
                  onClick={() => toggleBloco(b)}
                  style={{
                    flex:1, padding:"7px 4px", borderRadius:8, fontSize:11, fontWeight:600,
                    background: todasMarcadas ? "#1a1a1a" : "#f5f0eb",
                    color: todasMarcadas ? "#fff" : "#666",
                    border: "1.5px solid " + (todasMarcadas ? "#1a1a1a" : "#e8e0d8"),
                    cursor:"pointer"
                  }}
                >
                  {b.label}
                </button>
              );
            })}
            <button
              onClick={() => setDisponibilidades(d => ({ ...d, [dataSel]: [] }))}
              style={{ padding:"7px 10px", borderRadius:8, fontSize:11, background:"#fde8e8", border:"1.5px solid #f4a0a0", color:"#c62828", cursor:"pointer", fontWeight:600 }}
            >
              Limpar
            </button>
          </div>

          {/* Grid de horários */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
            {HORARIOS_PADRAO.map(h => {
              const marcado = horariosDataSel.includes(h);
              return (
                <button
                  key={h}
                  onClick={() => toggleHorario(h)}
                  style={{
                    padding:"8px 4px", borderRadius:8, fontSize:12, fontWeight:600,
                    background: marcado ? "#1a1a1a" : "#faf8f5",
                    color: marcado ? "#fff" : "#666",
                    border: "1.5px solid " + (marcado ? "#1a1a1a" : "#e8e0d8"),
                    cursor:"pointer"
                  }}
                >
                  {h}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize:11, color:"#888", marginTop:12, textAlign:"center" }}>
            {horariosDataSel.length} horário{horariosDataSel.length !== 1 ? "s" : ""} selecionado{horariosDataSel.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Copiar para outras datas */}
      {copiando && dataSel && (
        <div style={{ background:"#fff", border:"1.5px solid #e8e0d8", borderRadius:12, padding:16, marginBottom:16 }}>
          <p style={{ fontSize:11, color:"#b8967e", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", margin:"0 0 10px" }}>
            Copiar horários de {formatDateBR(dataSel)} para:
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:12 }}>
            {WEEKDAYS.map(w=><div key={w} style={{ textAlign:"center", fontSize:10, color:"#aaa", fontWeight:600, padding:"3px 0" }}>{w}</div>)}
            {cells.map((d,i) => {
              if(!d) return <div key={i}/>;
              const ds = formatDate(vy, vm, d);
              if(ds === dataSel) return <div key={i}/>;
              const isPast = new Date(ds) < new Date(today.toDateString());
              const isSel = datasParaCopiar.includes(ds);
              return (
                <div
                  key={i}
                  onClick={() => {
                    if(isPast) return;
                    setDatasParaCopiar(prev => prev.includes(ds) ? prev.filter(x=>x!==ds) : [...prev, ds]);
                  }}
                  style={{
                    textAlign:"center", padding:"6px 2px", borderRadius:8, fontSize:12,
                    background: isSel ? "#b8967e" : "transparent",
                    color: isSel ? "#fff" : isPast ? "#ccc" : "#1a1a1a",
                    cursor: isPast ? "default" : "pointer",
                    border: "1.5px solid " + (isSel ? "#b8967e" : "transparent"),
                  }}
                >
                  {d}
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => { setCopiando(false); setDatasParaCopiar([]); }} style={{ flex:1, padding:10, borderRadius:8, background:"#fff", border:"1.5px solid #e8e0d8", cursor:"pointer", fontSize:13, color:"#666" }}>Cancelar</button>
            <button
              disabled={datasParaCopiar.length === 0 || salvando}
              onClick={confirmarCopia}
              style={{ flex:2, padding:10, borderRadius:8, background: datasParaCopiar.length===0?"#ccc":"#1a1a1a", color:"#fff", border:"none", cursor: datasParaCopiar.length===0?"default":"pointer", fontSize:13, fontWeight:600 }}
            >
              {salvando ? "Copiando..." : `Copiar para ${datasParaCopiar.length} data(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Resumo do mês */}
      {!loading && (
        <div style={{ background:"#faf8f5", border:"1.5px solid #e8e0d8", borderRadius:12, padding:14 }}>
          <p style={{ fontSize:11, color:"#b8967e", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", margin:"0 0 10px" }}>
            Resumo — {MONTHS[vm]} {vy}
          </p>
          {Object.entries(disponibilidades)
            .filter(([d]) => d.startsWith(`${vy}-${pad(vm+1)}`))
            .sort(([a],[b]) => a.localeCompare(b))
            .map(([d, hs]) => (
              <div
                key={d}
                onClick={() => setDataSel(d)}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f0e8e0", cursor:"pointer" }}
              >
                <span style={{ fontSize:13, color:"#1a1a1a" }}>
                  {new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"})}
                </span>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end", maxWidth:"60%" }}>
                  {hs.slice(0,4).map(h => (
                    <span key={h} style={{ fontSize:10, padding:"2px 6px", borderRadius:10, background:"#e6f4ea", color:"#2e7d32", fontWeight:600 }}>{h}</span>
                  ))}
                  {hs.length > 4 && <span style={{ fontSize:10, color:"#888" }}>+{hs.length-4}</span>}
                </div>
              </div>
            ))
          }
          {Object.entries(disponibilidades).filter(([d]) => d.startsWith(`${vy}-${pad(vm+1)}`)).length === 0 && (
            <p style={{ fontSize:13, color:"#bbb", textAlign:"center", padding:"16px 0", margin:0 }}>
              Nenhuma data liberada neste mês
            </p>
          )}
        </div>
      )}
    </div>
  );
}
