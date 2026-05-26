// GaleriaCliente.jsx — Crescidinhos Fotografia
// Galeria de seleção de fotos para o cliente

import { useState, useEffect, useCallback } from "react";
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

// ── Marca d'água sobre a foto ──────────────────────────────────────
function Marca() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", userSelect: "none" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", transform: "rotate(-35deg)", textAlign: "center", lineHeight: 1.4, textShadow: "0 1px 2px rgba(0,0,0,0.5)", letterSpacing: "0.5px", whiteSpace: "pre-line" }}>
        {"Crescidinhos\nFotografia"}
      </span>
    </div>
  );
}

// ── Lightbox (visualização ampliada) ──────────────────────────────
function Lightbox({ fotos, idx, selecao, onClose, onToggle, onNav }) {
  const foto = fotos[idx];
  const isSelecionada = selecao.includes(foto?.url);

  // Swipe touch
  const touchStart = useState(null);

  const handleTouchStart = (e) => { touchStart[1](e.touches[0].clientX); };
  const handleTouchEnd = (e) => {
    if (touchStart[0] === null) return;
    const diff = touchStart[0] - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? onNav(1) : onNav(-1); }
    touchStart[1](null);
  };

  if (!foto) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.97)", zIndex: 1000, display: "flex", flexDirection: "column" }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Topo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", flexShrink: 0 }}>
        <button onClick={onClose}
          style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "6px 12px", cursor: "pointer" }}>
          ⊞ Ver todas
        </button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{idx + 1} / {fotos.length}</span>
      </div>

      {/* Foto */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={foto.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
        <Marca />
      </div>

      {/* Navegação */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", flexShrink: 0 }}>
        <button onClick={() => onNav(-1)} disabled={idx === 0}
          style={{ background: idx === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)", border: "none", borderRadius: 50, width: 44, height: 44, color: idx === 0 ? "rgba(255,255,255,0.2)" : "#fff", fontSize: 20, cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ‹
        </button>

        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, maxWidth: "60%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", textAlign: "center" }}>
          {foto.nome}
        </span>

        <button onClick={() => onNav(1)} disabled={idx === fotos.length - 1}
          style={{ background: idx === fotos.length - 1 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)", border: "none", borderRadius: 50, width: 44, height: 44, color: idx === fotos.length - 1 ? "rgba(255,255,255,0.2)" : "#fff", fontSize: 20, cursor: idx === fotos.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ›
        </button>
      </div>

      {/* Selecionar */}
      <div style={{ padding: "0 16px 24px", flexShrink: 0 }}>
        <button onClick={() => onToggle(foto.url)}
          style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", background: isSelecionada ? "#c62828" : C.primary, color: "#fff", transition: "background 0.2s" }}>
          {isSelecionada ? "✕ Remover seleção" : "✓ Selecionar esta foto"}
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────
export default function GaleriaCliente({ agendamento }) {
  const [galeria, setGaleria] = useState(null);
  const [selecao, setSelecao] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [confirmada, setConfirmada] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState(null); // null = grade, número = lightbox
  const [cofrinhoSaldo, setCofrinhoSaldo] = useState(0);
  const [cofrinhoData, setCofrinhoData] = useState(null);
  const [usandoCofrinho, setUsandoCofrinho] = useState(false);

  useEffect(() => {
    const buscar = async () => {
      setLoading(true);
      const res = await sb(`galerias?agendamento_id=eq.${agendamento.id}&select=*`);
      if (res && res.length > 0 && res[0].ativa) {
        setGaleria(res[0]);
        setSelecao(res[0].selecao || []);
        setConfirmada(res[0].selecao_confirmada || false);
      }
      // Busca saldo e dados do cofrinho do cliente
      if (agendamento.cliente_id) {
        const cli = await sb(`clientes?id=eq.${agendamento.cliente_id}&select=cofrinho_saldo,cofrinho`);
        if (cli && cli[0]) {
          if (cli[0].cofrinho_saldo) setCofrinhoSaldo(Number(cli[0].cofrinho_saldo));
          if (cli[0].cofrinho) setCofrinhoData(cli[0].cofrinho);
        }
      }
      setLoading(false);
    };
    buscar();
  }, [agendamento.id]);

  const toggleFoto = useCallback((url) => {
    if (confirmada) return;
    setSelecao(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  }, [confirmada]);

  const navLightbox = (dir) => {
    setLightboxIdx(prev => {
      const next = prev + dir;
      if (next < 0 || next >= fotos.length) return prev;
      return next;
    });
  };

  const salvarSelecao = async (confirmar = false) => {
    setSalvando(true);
    try {
      const payload = { selecao, selecao_confirmada: confirmar };
      await sbPatch(`galerias?id=eq.${galeria.id}`, payload);
      if (confirmar) setConfirmada(true);
      setGaleria(prev => ({ ...prev, selecao, selecao_confirmada: confirmar }));
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    setSalvando(false);
  };

  const MP_TOKEN = 'APP_USR-6587879092760162-052100-b495626cba5c1d859c2be43374d0fa23-3417831486';

  const aplicarCofrinho = async () => {
    if (!window.confirm(`Descontar R$ ${Math.min(cofrinhoSaldo, valorExtras).toFixed(2).replace(".", ",")} do seu Cofrinho?\n\nAtenção: ao usar o cofrinho, sua assinatura será encerrada.`)) return;
    setUsandoCofrinho(true);
    try {
      const desconto = Math.min(cofrinhoSaldo, valorExtras);
      const novoSaldo = cofrinhoSaldo - desconto;
      // Atualiza saldo
      await sbPatch(`clientes?id=eq.${agendamento.cliente_id}`, { cofrinho_saldo: novoSaldo });
      await sbPatch(`galerias?id=eq.${galeria.id}`, { cofrinho_desconto: desconto });
      // Cancela assinatura no Mercado Pago
      const preapprovalId = cofrinhoData?.preapproval_id;
      if (preapprovalId) {
        await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        }).catch(() => {});
        // Marca cofrinho como cancelado no Supabase
        await sbPatch(`clientes?id=eq.${agendamento.cliente_id}`, {
          cofrinho: { ...cofrinhoData, status: 'cancelado', saldo: novoSaldo },
        });
      }
      setCofrinhoSaldo(novoSaldo);
      setGaleria(prev => ({ ...prev, cofrinho_desconto: desconto }));
      alert(`✅ R$ ${desconto.toFixed(2).replace(".", ",")} descontado!\nSua assinatura foi encerrada. Obrigada por guardar com a Crescidinhos! 🌸`);
    } catch (e) { alert("Erro: " + e.message); }
    setUsandoCofrinho(false);
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
  const cofrinhoDesconto = galeria.cofrinho_desconto || 0;
  const valorRestante = Math.max(0, valorExtras - cofrinhoDesconto);
  const fotos = galeria.fotos || [];

  // Nomes das fotos selecionadas
  const nomesSelecionados = selecao.map(url => {
    const foto = fotos.find(f => f.url === url);
    return foto?.nome || url.split("/").pop();
  });

  return (
    <>
      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          fotos={fotos}
          idx={lightboxIdx}
          selecao={selecao}
          onClose={() => setLightboxIdx(null)}
          onToggle={toggleFoto}
          onNav={navLightbox}
        />
      )}

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
          {!confirmada && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: C.primary }}>
              💡 Toque em uma foto para ampliar e selecionar
            </p>
          )}
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
          {fotos.map((f, i) => {
            const sel = selecao.includes(f.url);
            return (
              <div key={i} onClick={() => setLightboxIdx(i)}
                style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", cursor: "pointer", border: `3px solid ${sel ? C.primary : "transparent"}`, transition: "border 0.15s", background: "#eee" }}>
                <img src={f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <Marca />
                {sel && (
                  <div style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontSize: 13, lineHeight: 1 }}>✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Nomes das fotos selecionadas */}
        {selecao.length > 0 && (
          <div style={{ background: "#faf8f5", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Fotos selecionadas ({selecao.length}):
            </p>
            {nomesSelecionados.map((nome, i) => (
              <p key={i} style={{ fontSize: 11, color: C.text, margin: "2px 0", fontFamily: "monospace" }}>
                {i + 1}. {nome}
              </p>
            ))}
          </div>
        )}

        {/* Seção de pagamento de extras */}
        {extras > 0 && !confirmada && (
          <div style={{ background: "#fff8e1", border: "1.5px solid #ffe082", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#e65100" }}>
              📌 {extras} foto(s) extra(s) — R$ {valorExtras.toFixed(2).replace(".", ",")}
            </p>

            {/* Opção Cofrinho */}
            {cofrinhoSaldo > 0 && !cofrinhoDesconto && (
              <div style={{ background: "#fff", border: "1.5px solid #d4a96a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: C.text }}>
                  🪙 Você tem <strong>R$ {cofrinhoSaldo.toFixed(2).replace(".", ",")}</strong> no Cofrinho!
                </p>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: C.muted }}>
                  {cofrinhoSaldo >= valorExtras
                    ? "Seu saldo cobre todas as fotos extras."
                    : `Seu saldo cobre R$ ${cofrinhoSaldo.toFixed(2).replace(".", ",")} — restaria R$ ${(valorExtras - cofrinhoSaldo).toFixed(2).replace(".", ",")}.`}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={aplicarCofrinho} disabled={usandoCofrinho}
                    style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#c8860a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    🪙 {usandoCofrinho ? "Aguarde..." : "Usar Cofrinho"}
                  </button>
                  {galeria.link_pagamento_extras && (
                    <a href={galeria.link_pagamento_extras} target="_blank" rel="noreferrer"
                      style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#1565C0", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      💳 Pagar
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Desconto cofrinho aplicado */}
            {cofrinhoDesconto > 0 && (
              <div style={{ background: "#fff", border: "1.5px solid #c8e6c9", borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 13, color: C.green }}>
                  ✅ Cofrinho aplicado: <strong>- R$ {cofrinhoDesconto.toFixed(2).replace(".", ",")}</strong>
                </p>
                {valorRestante > 0 && (
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: C.text }}>
                    Restante a pagar: <strong>R$ {valorRestante.toFixed(2).replace(".", ",")}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Sem cofrinho — só pagamento */}
            {cofrinhoSaldo === 0 && !cofrinhoDesconto && (
              galeria.link_pagamento_extras ? (
                <a href={galeria.link_pagamento_extras} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: 13, borderRadius: 10, background: "#1565C0", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600, boxSizing: "border-box" }}>
                  💳 Pagar fotos extras — R$ {valorExtras.toFixed(2).replace(".", ",")}
                </a>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: "#f57c00", textAlign: "center" }}>⏳ Aguarde o link de pagamento das fotos extras.</p>
              )
            )}

            {/* Pagamento do restante após cofrinho */}
            {cofrinhoDesconto > 0 && valorRestante > 0 && galeria.link_pagamento_extras && (
              <a href={galeria.link_pagamento_extras} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: 13, borderRadius: 10, background: "#1565C0", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600, boxSizing: "border-box", marginTop: 8 }}>
                💳 Pagar restante — R$ {valorRestante.toFixed(2).replace(".", ",")}
              </a>
            )}
          </div>
        )}

        {/* Botões de salvar/confirmar */}
        {!confirmada && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => salvarSelecao(false)} disabled={salvando}
              style={{ flex: 1, padding: 12, borderRadius: 10, background: "#fff", border: `1.5px solid ${C.border}`, fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.text }}>
              💾 Salvar rascunho
            </button>
            <button
              onClick={() => { if (window.confirm(`Confirmar seleção de ${selecao.length} foto(s)?`)) salvarSelecao(true); }}
              disabled={salvando || selecao.length === 0 || (extras > 0 && valorRestante > 0 && !galeria.link_pagamento_extras)}
              style={{ flex: 2, padding: 12, borderRadius: 10, background: selecao.length === 0 ? "#ccc" : C.primary, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: selecao.length === 0 ? "default" : "pointer" }}>
              {salvando ? "Salvando..." : "✅ Confirmar seleção"}
            </button>
          </div>
        )}

        {/* Confirmada */}
        {confirmada && (
          <div style={{ background: "#e8f5e8", border: "1.5px solid #a5d6a7", borderRadius: 10, padding: 14, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.green }}>✅ Seleção enviada para a Thais!</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Suas fotos em alta resolução serão entregues em breve.</p>
          </div>
        )}
      </div>
    </>
  );
}
