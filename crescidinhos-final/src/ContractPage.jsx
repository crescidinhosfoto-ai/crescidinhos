// =============================================================
// ContractPage.jsx — Crescidinhos Fotografia
// Página pública: cliente acessa o link, lê e assina o contrato
// Rota: /contrato/:id  (id = agendamento_id no Supabase)
// =============================================================

import { useState, useEffect } from "react";

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

// Extrai o id da URL: /contrato/XXXX
function getContratoId() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || null;
}

export default function ContractPage() {
  const [estado, setEstado] = useState("carregando"); // carregando | ok | assinado | erro | naoencontrado
  const [agendamento, setAgendamento] = useState(null);

  useEffect(() => {
    const id = getContratoId();
    if (!id || id === "contrato") { setEstado("naoencontrado"); return; }
    carregarContrato(id);
  }, []);

  async function carregarContrato(id) {
    try {
      const r = await sb(`agendamentos?id=eq.${id}&select=*,clientes(*)`);
      if (!r || r.length === 0) { setEstado("naoencontrado"); return; }
      const ag = r[0];
      if (ag.signature) { setEstado("assinado"); setAgendamento(ag); return; }
      if (!ag.contrato_html) { setEstado("erro"); return; }
      setAgendamento(ag);
      setEstado("ok");
    } catch (e) {
      console.error(e);
      setEstado("erro");
    }
  }

  // ── Estados de loading / erro ────────────────────────────────
  if (estado === "carregando") return (
    <div style={s.center}>
      <div style={s.spinner}>🐘</div>
      <p style={s.msg}>Carregando contrato...</p>
    </div>
  );

  if (estado === "naoencontrado") return (
    <div style={s.center}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
      <h2 style={s.titulo}>Contrato não encontrado</h2>
      <p style={s.msg}>Verifique o link recebido ou entre em contato com a Crescidinhos.</p>
      <a href="https://wa.me/5514996845521" style={s.btnWA}>💬 Falar com a Crescidinhos</a>
    </div>
  );

  if (estado === "erro") return (
    <div style={s.center}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={s.titulo}>Contrato ainda não gerado</h2>
      <p style={s.msg}>O contrato ainda não foi preparado. Entre em contato com a Crescidinhos.</p>
      <a href="https://wa.me/5514996845521" style={s.btnWA}>💬 Falar com a Crescidinhos</a>
    </div>
  );

  if (estado === "assinado") return (
    <div style={s.center}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
      <h2 style={{ ...s.titulo, color: "#2e7d32" }}>Contrato já assinado!</h2>
      <p style={s.msg}>
        Assinado em <strong>{agendamento?.signed_at}</strong>.<br />
        Você receberá uma cópia por e-mail. 🌸
      </p>
      <a href="https://wa.me/5514996845521" style={s.btnWA}>💬 Falar com a Crescidinhos</a>
    </div>
  );

  // ── Contrato disponível para assinatura ───────────────────────
  return (
    <div style={{ background: "#f8f4f5", minHeight: "100vh" }}>
      {/* Banner topo */}
      <div style={s.banner}>
        <span style={s.bannerText}>📄 Contrato de prestação de serviços · Crescidinhos Fotografia</span>
        <span style={s.bannerSub}>{agendamento?.clientes?.nome_mae} · {agendamento?.servico}</span>
      </div>

      {/* Iframe com o HTML do contrato */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 0 40px" }}>
        <iframe
          srcDoc={agendamento?.contrato_html}
          title="Contrato"
          style={{
            width: "100%",
            minHeight: "85vh",
            border: "none",
            background: "#fff",
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Rodapé fixo com instrução */}
      <div style={s.footer}>
        <p style={s.footerText}>
          ✍️ Role até o final do contrato acima para ler, assinar e confirmar.
        </p>
        <p style={s.footerSub}>
          Dúvidas? <a href="https://wa.me/5514996845521" style={{ color: "#72243E" }}>Fale com a Crescidinhos</a>
        </p>
      </div>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────
const s = {
  center: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "32px 24px", textAlign: "center", background: "#f8f4f5",
    fontFamily: "sans-serif",
  },
  spinner: { fontSize: 52, marginBottom: 16, animation: "pulse 1.5s infinite" },
  titulo: {
    fontFamily: "'Playfair Display', serif", fontSize: 22,
    color: "#72243E", marginBottom: 8,
  },
  msg: { fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 24 },
  btnWA: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 24px", borderRadius: 10,
    background: "#25D366", color: "#fff", textDecoration: "none",
    fontSize: 14, fontWeight: 600,
  },
  banner: {
    background: "#72243E", padding: "14px 20px",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 4,
  },
  bannerText: {
    fontSize: 13, fontWeight: 600, color: "#F4C0D1",
    letterSpacing: "0.02em",
  },
  bannerSub: { fontSize: 11, color: "#D9A7B4" },
  footer: {
    position: "sticky", bottom: 0,
    background: "#FBEAF0", borderTop: "1px solid #F4C0D1",
    padding: "12px 20px", textAlign: "center",
  },
  footerText: { fontSize: 13, color: "#72243E", fontWeight: 500, margin: 0 },
  footerSub: { fontSize: 12, color: "#999", margin: "4px 0 0" },
};
