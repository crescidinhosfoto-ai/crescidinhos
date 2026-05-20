// GaleriaCliente.jsx — Crescidinhos Fotografia
// Galeria de seleção de fotos para o cliente

import { useState, useEffect } from "react";
import { SUPABASE_URL, SUPABASE_KEY } from "./config";

const sb = async (path) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  const t = await res.text();
  return t ? JSON.parse(t) : null;
};

const sbPatch = async (path, data) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
};

const C = { primary: "#b8967e", light: "#f5f0eb", border: "#e8e0d8", text: "#3d2b1f", muted: "#a09080", green: "#2e7d32", red: "#c62828" };

function FotoComMarca({ url, selecionada, onClick }) {
  return (
    <div onClick={onClick} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", cursor: "pointer", border: `3px solid ${selecionada ? C.primary : "transparent"}`, transition: "border 0.15s", background: "#eee" }}>
      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {/* Marca d'água CSS */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", userSelect: "none" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", transform: "rotate(-35deg)", textAlign: "center", lineHeight: 1.4, textShadow: "0 1px 2px rgba(0,0,0,0.4)", letterSpacing: "0.5px" }}>
          Crescidinhos{"\n"}Fotografia
        </span>
      </div>
      {selecionada && (
        <div style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 13, lineHeight: 1 }}>✓</span>
        </div>
      )}
    </div>
  );
}

export default function GaleriaCliente({ agendamento }) {
  const [galeria, setGaleria] = useState(null);
  const [selecao, setSelecao] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [confirmada, setConfirmada] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscar = async () => {
      setLoading(true);
      const res = await sb(`galerias?agendamento_id=eq.${agendamento.id}&select=*`);
      if (res && res.length > 0 && res[0].ativa) {
        setGaleria(res[0]);
        setSelecao(res[0].selecao || []);
        setConfirmada(res[0].selecao_confirmada || false);
      }
      setLoading(false);
    };
    buscar();
  }, [agendamento.id]);

  const toggleFoto = (url) => {
    if (confirmada) return;
    setSelecao(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  };

  const salvarSelecao = async (confirmar = false) => {
    setSalvando(true);
    try {
      await sbPatch(`galerias?id=eq.${galeria.id}`, { selecao, selecao_confirmada: confirmar });
      if (confirmar) setConfirmada(true);
      setGaleria(prev => ({ ...prev, selecao, selecao_confirmada: confirmar }));
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    setSalvando(false);
  };

  if (loading) return <p style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 24 }}>Carregando galeria...</p>;
  if (!galeria) return (
    <div style={{ textAlign: "center", padding: "40px 16px" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
      <p style={{ fontSize: 14, color: C.muted }}>Sua galeria ainda não está disponível.</p>
      <p style={{ fontSize: 12, color: C.muted }}>Assim que as fotos forem preparadas, você receberá uma notificação.</p>
    </div>
  );

  const incluidas = galeria.fotos_incluidas || 0;
  const extras = Math.max(0, selecao.length - incluidas);
  const precoExtra = galeria.preco_foto_extra || 0;
  const valorExtras = extras * precoExtra;
  const fotos = galeria.fotos || [];

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ background: C.light, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: C.text }}>
          {confirmada ? "✅ Seleção confirmada!" : "Selecione suas fotos"}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
          {incluidas} foto(s) inclusa(s) no pacote · {fotos.length} disponíveis
          {precoExtra > 0 && ` · Extras: R$ ${precoExtra.toFixed(2).replace(".", ",")} cada`}
        </p>
      </div>

      {/* Contador */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: selecao.length > incluidas ? C.primary : C.green, fontFamily: "'Cormorant Garamond',serif" }}>{selecao.length}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>selecionada(s)</p>
        </div>
        <div style={{ background: extras > 0 ? "#fff8e1" : "#fff", border: `1.5px solid ${extras > 0 ? "#ffe082" : C.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: extras > 0 ? "#f57c00" : C.muted, fontFamily: "'Cormorant Garamond',serif" }}>
            {extras > 0 ? `R$ ${valorExtras.toFixed(2).replace(".", ",")}` : "—"}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{extras > 0 ? `${extras} extra(s)` : "sem extras"}</p>
        </div>
      </div>

      {/* Grade de fotos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {fotos.map((f, i) => (
          <FotoComMarca key={i} url={f.url} selecionada={selecao.includes(f.url)} onClick={() => toggleFoto(f.url)} />
        ))}
      </div>

      {/* Pagamento extras */}
      {extras > 0 && galeria.link_pagamento_extras && !confirmada && (
        <a href={galeria.link_pagamento_extras} target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: 14, borderRadius: 10, background: "#1565C0", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600, boxSizing: "border-box", marginBottom: 10 }}>
          💳 Pagar fotos extras — R$ {valorExtras.toFixed(2).replace(".", ",")}
        </a>
      )}
      {extras > 0 && !galeria.link_pagamento_extras && !confirmada && (
        <div style={{ background: "#fff8e1", border: "1.5px solid #ffe082", borderRadius: 10, padding: 12, marginBottom: 10, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#f57c00" }}>⏳ Aguarde o link de pagamento das fotos extras.</p>
        </div>
      )}

      {/* Botões */}
      {!confirmada && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => salvarSelecao(false)} disabled={salvando} style={{ flex: 1, padding: 12, borderRadius: 10, background: "#fff", border: `1.5px solid ${C.border}`, fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.text }}>
            💾 Salvar rascunho
          </button>
          <button onClick={() => { if (window.confirm(`Confirmar seleção de ${selecao.length} foto(s)?`)) salvarSelecao(true); }} disabled={salvando || selecao.length === 0 || (extras > 0 && !galeria.link_pagamento_extras)} style={{ flex: 2, padding: 12, borderRadius: 10, background: selecao.length === 0 ? "#ccc" : C.primary, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: selecao.length === 0 ? "default" : "pointer" }}>
            {salvando ? "Salvando..." : "✅ Confirmar seleção"}
          </button>
        </div>
      )}

      {confirmada && (
        <div style={{ background: "#e8f5e8", border: "1.5px solid #a5d6a7", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.green }}>✅ Seleção enviada para a Thais!</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Suas fotos em alta resolução serão entregues em breve.</p>
        </div>
      )}
    </div>
  );
}
