// GaleriaPanel.jsx — Crescidinhos Fotografia
// Painel da Thais: upload, gerenciamento e visualização da seleção

import { useState, useEffect, useRef } from "react";
import { SUPABASE_URL, SUPABASE_KEY } from "./config";

const sb = async (path, opts = {}) => {
  const { headers: h = {}, ...rest } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...h },
    ...rest,
  });
  if (!res.ok) throw new Error(await res.text());
  const t = await res.text();
  return t ? JSON.parse(t) : null;
};

const uploadFoto = async (file, agId) => {
  const ext = file.name.split(".").pop();
  const path = `${agId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/galerias/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(await res.text());
  return { nome: file.name, url: `${SUPABASE_URL}/storage/v1/object/public/galerias/${path}`, path };
};

const deletarFoto = async (path) => {
  await fetch(`${SUPABASE_URL}/storage/v1/object/galerias/${path}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
};

const C = { primary: "#b8967e", light: "#f5f0eb", border: "#e8e0d8", text: "#3d2b1f", muted: "#a09080", green: "#2e7d32", red: "#c62828" };
const inp = { padding: "8px 12px", borderRadius: 8, fontSize: 13, border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, outline: "none", width: "100%", boxSizing: "border-box" };
const btn = (bg, extra = {}) => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", ...extra });

export default function GaleriaPanel({ agendamento }) {
  const [galeria, setGaleria] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const [config, setConfig] = useState({ fotos_incluidas: 20, preco_foto_extra: 0 });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selecionadasParaExcluir, setSelecionadasParaExcluir] = useState(new Set());
  const fileRef = useRef();

  useEffect(() => { carregar(); }, [agendamento.id]);

  const carregar = async () => {
    try {
      const res = await sb(`galerias?agendamento_id=eq.${agendamento.id}&select=*`);
      if (res && res.length > 0) {
        setGaleria(res[0]);
        setConfig({ fotos_incluidas: res[0].fotos_incluidas, preco_foto_extra: res[0].preco_foto_extra });
      }
    } catch (e) { console.error(e); }
  };

  const garantirGaleria = async () => {
    if (galeria) return galeria;
    const nova = await sb("galerias", {
      method: "POST",
      body: JSON.stringify({ agendamento_id: agendamento.id, fotos: [], fotos_incluidas: config.fotos_incluidas, preco_foto_extra: config.preco_foto_extra }),
    });
    const g = nova[0];
    setGaleria(g);
    return g;
  };

  const handleFiles = async (files) => {
    setUploading(true);
    setMsg("");
    try {
      const g = await garantirGaleria();
      const uploads = await Promise.all(Array.from(files).map(f => uploadFoto(f, agendamento.id)));
      const fotosAtuais = g.fotos || [];
      const novasFotos = [...fotosAtuais, ...uploads];
      await sb(`galerias?id=eq.${g.id}`, { method: "PATCH", body: JSON.stringify({ fotos: novasFotos }) });
      setGaleria(prev => ({ ...prev, fotos: novasFotos }));
      setMsg(`✅ ${uploads.length} foto(s) enviada(s)!`);
    } catch (e) { setMsg("❌ Erro: " + e.message); }
    setUploading(false);
  };

  // ── Modo exclusão ──────────────────────────────────────────────
  const toggleParaExcluir = (idx) => {
    setSelecionadasParaExcluir(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const selecionarTodas = () => {
    const todas = new Set((galeria?.fotos || []).map((_, i) => i));
    setSelecionadasParaExcluir(todas);
  };

  const desmarcarTodas = () => setSelecionadasParaExcluir(new Set());

  const excluirSelecionadas = async () => {
    if (selecionadasParaExcluir.size === 0) return;
    if (!window.confirm(`Excluir ${selecionadasParaExcluir.size} foto(s)? Essa ação não pode ser desfeita.`)) return;
    try {
      const fotos = galeria.fotos || [];
      const paraExcluir = [...selecionadasParaExcluir].map(i => fotos[i]);
      await Promise.all(paraExcluir.map(f => deletarFoto(f.path)));
      const novas = fotos.filter((_, i) => !selecionadasParaExcluir.has(i));
      await sb(`galerias?id=eq.${galeria.id}`, { method: "PATCH", body: JSON.stringify({ fotos: novas }) });
      setGaleria(prev => ({ ...prev, fotos: novas }));
      setSelecionadasParaExcluir(new Set());
      setDeleteMode(false);
      setMsg(`✅ ${paraExcluir.length} foto(s) excluída(s).`);
    } catch (e) { setMsg("❌ Erro: " + e.message); }
  };

  const cancelarDeleteMode = () => { setDeleteMode(false); setSelecionadasParaExcluir(new Set()); };

  const salvarConfig = async () => {
    setSaving(true);
    try {
      const g = await garantirGaleria();
      await sb(`galerias?id=eq.${g.id}`, { method: "PATCH", body: JSON.stringify({ fotos_incluidas: Number(config.fotos_incluidas), preco_foto_extra: Number(config.preco_foto_extra) }) });
      setGaleria(prev => ({ ...prev, ...config }));
      setMsg("✅ Configurações salvas.");
    } catch (e) { setMsg("❌ " + e.message); }
    setSaving(false);
  };

  const toggleAtiva = async () => {
    if (!galeria) return;
    const novoEstado = !galeria.ativa;
    try {
      await sb(`galerias?id=eq.${galeria.id}`, { method: "PATCH", body: JSON.stringify({ ativa: novoEstado }) });
      setGaleria(prev => ({ ...prev, ativa: novoEstado }));
      setMsg(novoEstado ? "✅ Galeria publicada para o cliente!" : "Galeria ocultada do cliente.");
    } catch (e) { alert("Erro: " + e.message); }
  };

  const salvarLinkExtras = async (link) => {
    if (!galeria) return;
    try {
      await sb(`galerias?id=eq.${galeria.id}`, { method: "PATCH", body: JSON.stringify({ link_pagamento_extras: link }) });
      setGaleria(prev => ({ ...prev, link_pagamento_extras: link }));
    } catch (e) { console.error(e); }
  };

  const selecao = galeria?.selecao || [];
  const extras = Math.max(0, selecao.length - (galeria?.fotos_incluidas || 0));
  const valorExtras = extras * (galeria?.preco_foto_extra || 0);
  const fotos = galeria?.fotos || [];

  // Nomes das fotos selecionadas pelo cliente
  const nomesSelecionados = selecao.map(url => {
    const foto = fotos.find(f => f.url === url);
    return foto?.nome || url.split("/").pop();
  });

  return (
    <div>
      <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 12px" }}>📸 Galeria de Fotos</p>

      {/* Config */}
      <div style={{ background: "#faf8f5", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "1px" }}>Configuração</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 4 }}>Fotos inclusas no pacote</label>
            <input style={inp} type="number" value={config.fotos_incluidas} onChange={e => setConfig(c => ({ ...c, fotos_incluidas: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 4 }}>Preço por foto extra (R$)</label>
            <input style={inp} type="number" step="0.01" value={config.preco_foto_extra} onChange={e => setConfig(c => ({ ...c, preco_foto_extra: e.target.value }))} />
          </div>
        </div>
        <button onClick={salvarConfig} disabled={saving} style={btn(C.primary, { fontSize: 12 })}>{saving ? "Salvando..." : "Salvar configuração"}</button>
      </div>

      {/* Upload */}
      {!deleteMode && (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${drag ? C.primary : C.border}`, borderRadius: 10, padding: 24, textAlign: "center", cursor: "pointer", background: drag ? "#fdf5ef" : "#fff", marginBottom: 12, transition: "all 0.2s" }}
        >
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{uploading ? "⏳ Enviando fotos..." : "📁 Arraste as fotos aqui ou clique para selecionar"}</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: C.border }}>JPG, PNG — 1200px recomendado</p>
        </div>
      )}

      {msg && <p style={{ fontSize: 13, color: msg.startsWith("✅") ? C.green : C.red, marginBottom: 10 }}>{msg}</p>}

      {/* Grade de fotos */}
      {fotos.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {/* Barra de ações */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{fotos.length} foto(s) na galeria</p>
            {!deleteMode ? (
              <button onClick={() => setDeleteMode(true)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: C.muted, cursor: "pointer" }}>
                🗑️ Gerenciar fotos
              </button>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={selecionadasParaExcluir.size === fotos.length ? desmarcarTodas : selecionarTodas} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: C.text, cursor: "pointer" }}>
                  {selecionadasParaExcluir.size === fotos.length ? "Desmarcar todas" : "Selecionar todas"}
                </button>
                <button onClick={cancelarDeleteMode} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: C.muted, cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {fotos.map((f, i) => {
              const marcada = selecionadasParaExcluir.has(i);
              return (
                <div key={i} onClick={() => deleteMode && toggleParaExcluir(i)}
                  style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "#eee", cursor: deleteMode ? "pointer" : "default", border: deleteMode && marcada ? `3px solid ${C.red}` : "3px solid transparent", boxSizing: "border-box" }}>
                  <img src={f.url} alt={f.nome} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: deleteMode && marcada ? 0.5 : 1 }} />
                  {deleteMode && (
                    <div style={{ position: "absolute", top: 4, left: 4, width: 20, height: 20, borderRadius: 4, background: marcada ? C.red : "rgba(255,255,255,0.8)", border: `2px solid ${marcada ? C.red : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {marcada && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>
                  )}
                  {!deleteMode && (
                    <button onClick={() => { if (!window.confirm("Remover esta foto?")) return; (async () => { await deletarFoto(f.path); const novas = fotos.filter((_, j) => j !== i); await sb(`galerias?id=eq.${galeria.id}`, { method: "PATCH", body: JSON.stringify({ fotos: novas }) }); setGaleria(prev => ({ ...prev, fotos: novas })); })(); }}
                      style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, cursor: "pointer", padding: "2px 5px" }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botão excluir selecionadas */}
          {deleteMode && selecionadasParaExcluir.size > 0 && (
            <button onClick={excluirSelecionadas} style={btn(C.red, { width: "100%", marginTop: 10 })}>
              🗑️ Excluir {selecionadasParaExcluir.size} foto(s) selecionada(s)
            </button>
          )}
        </div>
      )}

      {/* Publicar */}
      {galeria && (
        <button onClick={toggleAtiva} style={btn(galeria.ativa ? "#c62828" : C.green, { width: "100%", marginBottom: 12 })}>
          {galeria.ativa ? "🔒 Ocultar galeria do cliente" : "🌐 Publicar galeria para o cliente"}
        </button>
      )}

      {/* Seleção do cliente */}
      {selecao.length > 0 && (
        <div style={{ background: "#e8f5e8", border: `1.5px solid #a5d6a7`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.green, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "1px" }}>
            ✅ Seleção do cliente {galeria.selecao_confirmada ? "(confirmada)" : "(em andamento)"}
          </p>
          <p style={{ fontSize: 13, color: C.text, margin: "0 0 8px" }}>
            {selecao.length} foto(s) · {galeria.fotos_incluidas} inclusa(s)
            {extras > 0 && ` · ${extras} extra(s) = R$ ${valorExtras.toFixed(2).replace(".", ",")} `}
          </p>

          {/* Grid das selecionadas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5, marginBottom: 10 }}>
            {selecao.map((url, i) => (
              <div key={i} style={{ aspectRatio: "1", borderRadius: 6, overflow: "hidden", border: `2px solid ${C.green}` }}>
                <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              </div>
            ))}
          </div>

          {/* Nomes das fotos selecionadas */}
          <div style={{ background: "#fff", border: `1px solid #c8e6c9`, borderRadius: 8, padding: "8px 12px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.green, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Arquivos selecionados:</p>
            {nomesSelecionados.map((nome, i) => (
              <p key={i} style={{ fontSize: 11, color: C.text, margin: "2px 0", fontFamily: "monospace" }}>
                {i + 1}. {nome}
              </p>
            ))}
          </div>

          {/* Link de pagamento extras */}
          {extras > 0 && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 4 }}>Link de pagamento das extras (InfinityPay)</label>
              <input style={inp} type="url" placeholder="Cole o link aqui" defaultValue={galeria.link_pagamento_extras || ""} onBlur={e => salvarLinkExtras(e.target.value)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
