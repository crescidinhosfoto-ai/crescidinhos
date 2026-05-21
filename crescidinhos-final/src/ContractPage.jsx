// =============================================================
// ContractPage.jsx — Crescidinhos Fotografia
// v5: bloqueio por perfil + PDF após assinatura + botão voltar
// =============================================================

import { useState, useEffect, useRef } from "react";

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

function getContratoId() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || null;
}

function getPerfil() {
  const params = new URLSearchParams(window.location.search);
  return params.get("p") === "fotografa" ? "fotografa" : "cliente";
}

// ── Carrega scripts externos dinamicamente ────────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Canvas de assinatura ──────────────────────────────────────────
function SignaturePad({ onSign, disabled, jaSalvo, nomeLabel, dataLabel, savedImage }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [assinado, setAssinado] = useState(jaSalvo);
  const [salvando, setSalvando] = useState(false);
  const [vazio, setVazio] = useState(true);

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy };
    }
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  function isEmpty(canvas) {
    return !canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.some(v => v !== 0);
  }

  // Restaura assinatura salva no canvas
  useEffect(() => {
    if (savedImage && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = savedImage;
    }
  }, [savedImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || disabled || assinado) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#72243E"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";

    const onDown = (e) => { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e, canvas); };
    const onMove = (e) => {
      e.preventDefault();
      if (!drawing.current) return;
      const p = getPos(e, canvas);
      ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(p.x, p.y); ctx.stroke();
      lastPos.current = p;
      setVazio(isEmpty(canvas));
    };
    const onUp = () => { drawing.current = false; };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp);
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onUp);
    };
  }, [disabled, assinado]);

  function limpar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setVazio(true);
  }

  async function confirmar() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty(canvas)) { alert("Por favor, assine antes de confirmar."); return; }
    setSalvando(true);
    const ok = await onSign(canvas.toDataURL("image/png"));
    if (ok) setAssinado(true);
    setSalvando(false);
  }

  if (disabled) return (
    <div style={st.sigBox}>
      <div style={st.sigCanvasLocked}>
        <p style={{ fontSize: 12, color: "#aaa", margin: 0, textAlign: "center" }}>
          🔒 Campo reservado para {nomeLabel}
        </p>
      </div>
      <p style={st.sigLabel}>{nomeLabel}</p>
    </div>
  );

  if (assinado) return (
    <div style={st.sigBox}>
      <canvas ref={canvasRef} width={600} height={220}
        style={{ ...st.canvas, borderColor: "#a5d6a7", cursor: "default", opacity: 0.85 }} />
      <p style={{ fontSize: 12, color: "#2e7d32", fontWeight: 600, margin: "6px 0 2px", textAlign: "center" }}>✅ Assinado</p>
      <p style={st.sigLabel}>{nomeLabel}</p>
      {dataLabel && <p style={st.sigDate}>{dataLabel}</p>}
    </div>
  );

  return (
    <div style={st.sigBox}>
      <div style={{ position: "relative" }}>
        <canvas ref={canvasRef} width={600} height={220} style={st.canvas} />
        {vazio && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", pointerEvents: "none",
          }}>
            <span style={{ fontSize: 28, marginBottom: 6 }}>✍️</span>
            <span style={{ fontSize: 13, color: "#c9a0b0", fontWeight: 500 }}>Toque aqui e assine com o dedo</span>
          </div>
        )}
      </div>
      <div style={st.sigActions}>
        <button onClick={limpar} style={st.btnClear}>Limpar</button>
        <button onClick={confirmar} disabled={salvando || vazio}
          style={{ ...st.btnConfirm, opacity: (salvando || vazio) ? 0.5 : 1 }}>
          {salvando ? "Salvando..." : "Assinar ✍️"}
        </button>
      </div>
      <p style={st.sigLabel}>{nomeLabel}</p>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export default function ContractPage() {
  const [estado, setEstado] = useState("carregando");
  const [agendamento, setAgendamento] = useState(null);
  const [sigCliente, setSigCliente] = useState(null);
  const [sigContratada, setSigContratada] = useState(null);
  const [sigResp, setSigResp] = useState(null);
  const [signedAt, setSignedAt] = useState("");
  const [ambosAssinaram, setAmbosAssinaram] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const contratoRef = useRef(null);

  const perfil = getPerfil();
  const id = getContratoId();

  useEffect(() => {
    if (!id || id === "contrato") { setEstado("naoencontrado"); return; }
    carregarContrato();
  }, []);

  async function carregarContrato() {
    try {
      const r = await sb(`agendamentos?id=eq.${id}&select=*,clientes(*)`);
      if (!r || r.length === 0) { setEstado("naoencontrado"); return; }
      const ag = r[0];
      if (!ag.contrato_html) { setEstado("erro"); return; }
      setAgendamento(ag);
      setSigCliente(ag.signature || null);
      setSigContratada(ag.signature_contratada || null);
      setSigResp(ag.signature_responsavel || null);
      setSignedAt(ag.signed_at || "");
      const temMenor = ag.clientes?.filhos?.length > 0 || !!ag.clientes?.nome_crianca;
      const ambos = ag.signature && ag.signature_contratada && (!temMenor || ag.signature_responsavel);
      setAmbosAssinaram(!!ambos);
      setEstado("ok");
    } catch (e) {
      console.error(e);
      setEstado("erro");
    }
  }

  async function salvarAssinatura(campo, dataUrl) {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR") + " às " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const ag = agendamento;
      const temMenor = ag.clientes?.filhos?.length > 0 || !!ag.clientes?.nome_crianca;
      const ns = campo === "signature"             ? dataUrl : sigCliente;
      const nc = campo === "signature_contratada"  ? dataUrl : sigContratada;
      const nr = campo === "signature_responsavel" ? dataUrl : sigResp;
      const ambos = ns && nc && (!temMenor || nr);
      const payload = { [campo]: dataUrl };
      if (ambos) { payload.signed_at = dateStr; payload.status = "Contrato"; }

      await sb(`agendamentos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload) });

      if (campo === "signature")             setSigCliente(dataUrl);
      if (campo === "signature_contratada")  setSigContratada(dataUrl);
      if (campo === "signature_responsavel") setSigResp(dataUrl);

      if (ambos) {
        setSignedAt(dateStr);
        setAmbosAssinaram(true);
        setStatusMsg("✅ Contrato assinado e salvo em " + dateStr);
        // Notifica n8n
        fetch("https://ribbitingboar-n8n.cloudfy.live/webhook/contrato-assinado", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agendamento_id: id, contrato_id: ag.contrato_numero,
            signed_at: now.toISOString(),
            cliente_email: ag.clientes?.email || "",
            cliente_nome: ag.clientes?.nome_mae || "",
            cliente_whatsapp: ag.clientes?.telefone || "",
          }),
        }).catch(() => {});
      } else {
        setStatusMsg(perfil === "cliente"
          ? "✅ Sua assinatura foi salva! Aguardando assinatura da fotógrafa."
          : "✅ Sua assinatura foi salva! Aguardando assinatura do cliente."
        );
      }
      return true;
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar assinatura. Tente novamente.");
      return false;
    }
  }

  // ── Gerar PDF ─────────────────────────────────────────────────
  async function gerarPDF() {
    setGerandoPDF(true);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

      const elemento = contratoRef.current;
      if (!elemento) throw new Error("Elemento não encontrado");

      const canvas = await window.html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = pdfW / imgW;
      const scaledH = imgH * ratio;

      // Divide em páginas se necessário
      let posY = 0;
      while (posY < scaledH) {
        if (posY > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -posY, pdfW, scaledH);
        posY += pdfH;
      }

      const nomeArquivo = `Contrato_Crescidinhos_${agendamento?.contrato_numero || id}.pdf`;
      pdf.save(nomeArquivo);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Tente novamente.");
    }
    setGerandoPDF(false);
  }

  function voltarAoApp() {
    window.location.href = "https://app.crescidinhosfoto.com.br";
  }

  // ── Estados de carregamento ───────────────────────────────────
  if (estado === "carregando") return (
    <div style={st.center}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🐘</div>
      <p style={st.msg}>Carregando contrato...</p>
    </div>
  );
  if (estado === "naoencontrado") return (
    <div style={st.center}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
      <h2 style={st.titulo}>Contrato não encontrado</h2>
      <p style={st.msg}>Verifique o link recebido ou entre em contato com a Crescidinhos.</p>
      <a href="https://wa.me/5514996845521" style={st.btnWA}>💬 Falar com a Crescidinhos</a>
    </div>
  );
  if (estado === "erro") return (
    <div style={st.center}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={st.titulo}>Contrato ainda não gerado</h2>
      <p style={st.msg}>O contrato ainda não foi preparado. Entre em contato com a Crescidinhos.</p>
      <a href="https://wa.me/5514996845521" style={st.btnWA}>💬 Falar com a Crescidinhos</a>
    </div>
  );

  const ag = agendamento;
  const cl = ag?.clientes || {};
  const temMenor = cl.filhos?.length > 0 || !!cl.nome_crianca;

  return (
    <div style={{ background: "#f8f4f5", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* Banner topo */}
      <div style={st.banner}>
        <span style={st.bannerText}>📄 Contrato · Crescidinhos Fotografia</span>
        <span style={st.bannerSub}>{cl.nome_mae} · {ag.servico}</span>
        <span style={perfil === "fotografa" ? st.badgeFotografa : st.badgeCliente}>
          {perfil === "fotografa" ? "📷 Você está assinando como Contratada" : "🌸 Você está assinando como Contratante"}
        </span>
      </div>

      {/* Área capturada para o PDF */}
      <div ref={contratoRef} style={{ background: "#f8f4f5" }}>

        {/* Conteúdo do contrato */}
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px 16px" }}>
          <div
            dangerouslySetInnerHTML={{ __html: extrairCorpoContrato(ag.contrato_html) }}
            style={{ background: "#fff", borderRadius: 12, padding: "32px 28px", marginBottom: 24 }}
          />
        </div>

        {/* Seção de assinaturas */}
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 16px 32px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px 20px" }}>
            <h3 style={st.sigTitle}>Assinaturas Digitais</h3>

            {/* Status */}
            {ambosAssinaram ? (
              <div style={st.statusSigned}>✅ Contrato assinado por ambas as partes em {signedAt}</div>
            ) : statusMsg ? (
              <div style={st.statusPending}>{statusMsg}</div>
            ) : (
              <div style={st.statusPending}>
                {perfil === "fotografa"
                  ? "✍️ Assine no campo Contratada abaixo"
                  : "✍️ Leia o contrato acima e assine abaixo para confirmar"}
              </div>
            )}

            {/* Grid assinaturas */}
            <div style={st.sigGrid}>
              <div>
                <p style={st.sigSectionLabel}>1. Contratante</p>
                <SignaturePad
                  disabled={perfil === "fotografa"}
                  jaSalvo={!!sigCliente}
                  savedImage={sigCliente}
                  nomeLabel={cl.nome_mae || "Cliente"}
                  dataLabel={signedAt}
                  onSign={(d) => salvarAssinatura("signature", d)}
                />
                <div style={st.sigInfo}>
                  <strong>CPF:</strong> {ag.cpf_mae || cl.cpf_mae || "—"}<br />
                  <strong>E-mail:</strong> {cl.email || "—"}
                </div>
              </div>
              <div>
                <p style={st.sigSectionLabel}>{temMenor ? "3." : "2."} Contratada</p>
                <SignaturePad
                  disabled={perfil === "cliente"}
                  jaSalvo={!!sigContratada}
                  savedImage={sigContratada}
                  nomeLabel="Thais de Sá Nascimento"
                  dataLabel={signedAt}
                  onSign={(d) => salvarAssinatura("signature_contratada", d)}
                />
                <div style={st.sigInfo}>
                  <strong>Crescidinhos Fotografia</strong><br />
                  CNPJ: 64.189.121/0001-06<br />
                  Padre Anchieta 775, Bauru/SP
                </div>
              </div>
            </div>

            {/* Responsável legal */}
            {temMenor && (
              <div style={{ marginTop: 24 }}>
                <p style={st.sigSectionLabel}>2. Responsável Legal (menor)</p>
                <div style={st.sigGrid}>
                  <div>
                    <SignaturePad
                      disabled={perfil === "fotografa"}
                      jaSalvo={!!sigResp}
                      savedImage={sigResp}
                      nomeLabel={cl.nome_mae || "Responsável legal"}
                      dataLabel={signedAt}
                      onSign={(d) => salvarAssinatura("signature_responsavel", d)}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ padding: 14, background: "#FBEAF0", borderRadius: 10, fontSize: 12, color: "#72243E", lineHeight: 1.6 }}>
                      <strong>ECA Digital — Lei nº 15.211/2025</strong><br />
                      As imagens do menor serão utilizadas apenas para as finalidades autorizadas.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
              Assinaturas válidas nos termos da Lei nº 14.063/2020 (Assinaturas Eletrônicas).
            </p>
          </div>
        </div>

      </div>{/* fim contratoRef */}

      {/* Botões de ação — fora da área do PDF */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Baixar PDF */}
        <button
          onClick={gerarPDF}
          disabled={gerandoPDF}
          style={{
            width: "100%", padding: 14, borderRadius: 12, marginBottom: 12,
            background: gerandoPDF ? "#ccc" : "#72243E", color: "#fff",
            border: "none", fontSize: 15, fontWeight: 600,
            cursor: gerandoPDF ? "default" : "pointer", fontFamily: "inherit",
          }}
        >
          {gerandoPDF ? "⏳ Gerando PDF..." : "📄 Baixar contrato em PDF"}
        </button>

        {/* Voltar ao app */}
        <button
          onClick={voltarAoApp}
          style={{
            width: "100%", padding: 14, borderRadius: 12,
            background: "#fff", color: "#1a1a1a",
            border: "2px solid #e8e0d8", fontSize: 15, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ← Voltar ao app
        </button>

        {/* WhatsApp */}
        <a
          href="https://wa.me/5514996845521"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: 14, borderRadius: 12, marginTop: 12,
            background: "#25D366", color: "#fff", textDecoration: "none",
            fontSize: 15, fontWeight: 600, boxSizing: "border-box",
          }}
        >
          💬 Falar com a Crescidinhos
        </a>
      </div>

      {/* Rodapé fixo */}
      <div style={st.footer}>
        <p style={st.footerText}>
          Crescidinhos Fotografia · <a href="https://wa.me/5514996845521" style={{ color: "#72243E" }}>Dúvidas?</a>
        </p>
      </div>
    </div>
  );
}

function extrairCorpoContrato(html) {
  if (!html) return "";
  return html
    .replace(/<div class="sig-section"[\s\S]*$/, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>[\s\S]*?<\/html>/i, "")
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .trim();
}

const st = {
  center: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "32px 24px", textAlign: "center", background: "#f8f4f5",
    fontFamily: "'Inter', sans-serif",
  },
  titulo: { fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#72243E", margin: "0 0 8px" },
  msg: { fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 24 },
  btnWA: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 24px", borderRadius: 10,
    background: "#25D366", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600,
  },
  banner: {
    background: "#72243E", padding: "14px 20px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  },
  bannerText: { fontSize: 13, fontWeight: 600, color: "#F4C0D1", letterSpacing: "0.02em" },
  bannerSub: { fontSize: 11, color: "#D9A7B4" },
  badgeCliente: {
    marginTop: 6, padding: "4px 14px", borderRadius: 20,
    background: "#e3f2fd", color: "#1565C0", fontSize: 11, fontWeight: 600,
  },
  badgeFotografa: {
    marginTop: 6, padding: "4px 14px", borderRadius: 20,
    background: "#f3e5f5", color: "#7b1fa2", fontSize: 11, fontWeight: 600,
  },
  sigTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 18,
    color: "#72243E", textAlign: "center", margin: "0 0 16px",
  },
  statusPending: {
    textAlign: "center", padding: 12, borderRadius: 10, fontSize: 13,
    fontWeight: 500, marginBottom: 20,
    background: "#FFF3CD", color: "#856404", border: "1px solid #FFE082",
  },
  statusSigned: {
    textAlign: "center", padding: 12, borderRadius: 10, fontSize: 13,
    fontWeight: 500, marginBottom: 20,
    background: "#EAF3DE", color: "#27500A", border: "1px solid #C0DD97",
  },
  sigGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  sigSectionLabel: {
    fontSize: 11, fontWeight: 700, color: "#698494",
    textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px",
  },
  sigBox: { textAlign: "center" },
  canvas: {
    border: "1px dashed #D9A7B4", borderRadius: 8, cursor: "crosshair",
    display: "block", width: "100%", touchAction: "none", background: "#fafaf8",
  },
  sigCanvasLocked: {
    border: "1px dashed #e0e0e0", borderRadius: 8, background: "#f5f5f5",
    height: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
  },
  sigActions: { display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" },
  btnClear: {
    fontSize: 12, color: "#999", background: "none",
    border: "1px solid #e8dde0", borderRadius: 6, padding: "4px 12px", cursor: "pointer",
  },
  btnConfirm: {
    fontSize: 12, color: "#fff", background: "#72243E",
    border: "none", borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontWeight: 600,
  },
  sigLabel: { fontSize: 11, color: "#aaa", marginTop: 6, textAlign: "center" },
  sigDate: { fontSize: 10, color: "#bbb", textAlign: "center" },
  sigInfo: {
    marginTop: 10, padding: "10px 12px",
    background: "#faf8f5", border: "1px solid #e8dde0",
    borderRadius: 8, fontSize: 12, color: "#555", lineHeight: 1.6,
  },
  footer: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    background: "#FBEAF0", borderTop: "1px solid #F4C0D1",
    padding: "10px 20px", textAlign: "center",
  },
  footerText: { fontSize: 12, color: "#72243E", fontWeight: 500, margin: 0 },
};
