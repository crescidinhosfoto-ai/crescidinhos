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
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const fmtData = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const fmtPhone = (p) => {
  const d = p.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return p;
};

export default function AgentePanel() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [phones, setPhones] = useState([]);
  const [tab, setTab] = useState("status");
  const [msg, setMsg] = useState(null);

  const showMsg = (text, type = "ok") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await sb("perfil_agente?ativo=eq.true&order=criado_em.desc&limit=1");
      setProfile(rows?.[0] || null);
      setEditPrompt(rows?.[0]?.system_prompt || "");
    } catch (e) {
      showMsg("Erro ao carregar perfil", "err");
    }
    setLoading(false);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const rows = await sb(
        "conversas_whatsapp?order=created_at.desc&limit=200"
      );
      if (!rows) return;
      setConversations(rows);
      const uniquePhones = [...new Map(rows.map((r) => [r.numero_telefone, r])).values()];
      setPhones(uniquePhones);
      if (!selectedPhone && uniquePhones.length > 0) {
        setSelectedPhone(uniquePhones[0].numero_telefone);
      }
    } catch (e) {
      console.error("Erro ao carregar conversas", e);
    }
  }, [selectedPhone]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => {
    if (tab === "conversas") loadConversations();
  }, [tab, loadConversations]);

  const toggleAgent = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await sb(`perfil_agente?id=eq.${profile.id}`, {
        method: "PATCH",
        body: JSON.stringify({ agente_ligado: !profile.agente_ligado }),
      });
      showMsg(profile.agente_ligado ? "Agente desligado" : "Agente ligado! ✅");
      await loadProfile();
    } catch (e) {
      showMsg("Erro ao alterar status", "err");
    }
    setSaving(false);
  };

  const savePrompt = async () => {
    if (!editPrompt.trim()) return;
    setSaving(true);
    try {
      if (profile) {
        await sb(`perfil_agente?id=eq.${profile.id}`, {
          method: "PATCH",
          body: JSON.stringify({ system_prompt: editPrompt }),
        });
      } else {
        // Disable any existing active
        await sb("perfil_agente?ativo=eq.true", {
          method: "PATCH",
          body: JSON.stringify({ ativo: false }),
        });
        await sb("perfil_agente", {
          method: "POST",
          body: JSON.stringify({
            system_prompt: editPrompt,
            ativo: true,
            agente_ligado: false,
          }),
        });
      }
      showMsg("System prompt salvo! ✅");
      setEditMode(false);
      await loadProfile();
    } catch (e) {
      showMsg("Erro ao salvar", "err");
    }
    setSaving(false);
  };

  const phoneConversations = conversations.filter(
    (c) => c.numero_telefone === selectedPhone
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const attentionCount = conversations.filter((c) => c.precisa_atencao).length;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 520, margin: "0 auto" }}>
      {/* Toast */}
      {msg && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: msg.type === "err" ? "#c62828" : "#2e7d32",
          color: "#fff", padding: "10px 20px", borderRadius: 10, zIndex: 9999,
          fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#fff", border: "1.5px solid #e8e0d8", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>🤖 Agente WhatsApp</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#999" }}>Responde clientes automaticamente no seu estilo</p>
          </div>
          {profile && (
            <button
              onClick={toggleAgent}
              disabled={saving}
              style={{
                padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700,
                background: profile.agente_ligado ? "#e8f5e9" : "#f5f0eb",
                color: profile.agente_ligado ? "#2e7d32" : "#666",
                transition: "all 0.2s"
              }}
            >
              {profile.agente_ligado ? "● LIGADO" : "○ DESLIGADO"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          ["status", "⚙️ Status"],
          ["prompt", "✍️ Estilo"],
          ["conversas", `💬 Conversas${attentionCount > 0 ? ` (${attentionCount}⚠️)` : ""}`],
          ["instrucoes", "📖 Instruções"],
        ].map(([t, l]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "9px 4px", borderRadius: 8, fontSize: 10, fontWeight: 600,
              background: tab === t ? "#1a1a1a" : "#fff",
              color: tab === t ? "#fff" : "#666",
              border: `2px solid ${tab === t ? "#1a1a1a" : "#e8e0d8"}`,
              cursor: "pointer"
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* STATUS TAB */}
      {tab === "status" && (
        <div>
          {loading ? (
            <p style={{ textAlign: "center", color: "#999", fontSize: 13 }}>Carregando...</p>
          ) : !profile ? (
            <div style={{ background: "#fff8e1", border: "1.5px solid #ffe082", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 24, margin: "0 0 8px" }}>⚠️</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#5d4037", margin: "0 0 6px" }}>Nenhum perfil de atendimento configurado</p>
              <p style={{ fontSize: 12, color: "#795548", margin: 0 }}>
                Vá em <b>Instruções</b> para aprender como gerar o perfil, ou vá em <b>Estilo</b> para colar o system prompt manualmente.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ background: "#fff", border: "1.5px solid #e8e0d8", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: "#b8967e", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 12px" }}>Status do Agente</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: profile.agente_ligado ? "#4caf50" : "#ccc"
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: profile.agente_ligado ? "#2e7d32" : "#666" }}>
                    {profile.agente_ligado ? "Respondendo automaticamente" : "Pausado — não está respondendo"}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#999", margin: 0 }}>
                  Perfil criado em: {fmtData(profile.criado_em)}
                </p>
              </div>

              <div style={{ background: "#fff", border: "1.5px solid #e8e0d8", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: "#b8967e", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 10px" }}>O que o agente faz</p>
                {[
                  ["✅", "Responde dúvidas de preço e serviços"],
                  ["✅", "Informa disponibilidade de datas"],
                  ["✅", "Envia o link do app para agendamento"],
                  ["⚠️", "Avisa você sobre situações especiais"],
                  ["❌", "NUNCA agenda diretamente (só pelo app)"],
                  ["❌", "NUNCA faz desconto ou negocia preços"],
                ].map(([icon, desc], i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{icon}</span>
                    <span style={{ fontSize: 12, color: "#444", lineHeight: 1.4 }}>{desc}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: profile.agente_ligado ? "#e8f5e9" : "#f5f0eb", border: `1.5px solid ${profile.agente_ligado ? "#c8e6c9" : "#e8e0d8"}`, borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: profile.agente_ligado ? "#2e7d32" : "#666", margin: 0, textAlign: "center" }}>
                  {profile.agente_ligado
                    ? "🟢 O agente está ativo e respondendo mensagens recebidas no WhatsApp."
                    : "⚪ O agente está pausado. Clique em DESLIGADO acima para ligar."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROMPT TAB */}
      {tab === "prompt" && (
        <div>
          <div style={{ background: "#fff", border: "1.5px solid #e8e0d8", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: "#b8967e", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 10px" }}>
              Estilo de Atendimento (System Prompt)
            </p>
            <p style={{ fontSize: 12, color: "#666", margin: "0 0 14px", lineHeight: 1.5 }}>
              Este texto define como o agente vai se comunicar — seu tom, suas expressões, sua forma de atender.
              Gerado automaticamente pela análise das suas conversas do WhatsApp ou editado manualmente.
            </p>

            {!editMode ? (
              <>
                {profile?.system_prompt ? (
                  <div style={{
                    background: "#f9f6f3", borderRadius: 8, padding: 14,
                    fontSize: 12, color: "#444", lineHeight: 1.6,
                    whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto",
                    marginBottom: 12, border: "1px solid #e8e0d8"
                  }}>
                    {profile.system_prompt}
                  </div>
                ) : (
                  <div style={{ background: "#f5f0eb", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                    <p style={{ fontSize: 12, color: "#888", margin: 0, textAlign: "center" }}>Nenhum perfil definido ainda.</p>
                  </div>
                )}
                <button
                  onClick={() => setEditMode(true)}
                  style={{ width: "100%", padding: 12, borderRadius: 8, background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                >
                  ✏️ {profile?.system_prompt ? "Editar" : "Criar"} System Prompt
                </button>
              </>
            ) : (
              <>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={12}
                  placeholder="Descreva como o agente deve se comunicar: tom de voz, expressões típicas, como responder sobre preços, como direcionar para o app..."
                  style={{
                    width: "100%", boxSizing: "border-box", borderRadius: 8,
                    border: "1.5px solid #e8e0d8", padding: 12, fontSize: 12,
                    fontFamily: "monospace", lineHeight: 1.6, resize: "vertical",
                    marginBottom: 10, background: "#f9f6f3"
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setEditMode(false); setEditPrompt(profile?.system_prompt || ""); }}
                    style={{ flex: 1, padding: 11, borderRadius: 8, background: "#f5f0eb", border: "none", cursor: "pointer", fontSize: 13, color: "#666" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={savePrompt}
                    disabled={saving || !editPrompt.trim()}
                    style={{ flex: 2, padding: 11, borderRadius: 8, background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </>
            )}
          </div>

          {profile?.analise && (
            <details style={{ background: "#fff", border: "1.5px solid #e8e0d8", borderRadius: 12, padding: 16 }}>
              <summary style={{ fontSize: 12, fontWeight: 600, color: "#666", cursor: "pointer" }}>📊 Ver análise do estilo</summary>
              <div style={{ marginTop: 12, fontSize: 12, color: "#444", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {profile.analise}
              </div>
            </details>
          )}
        </div>
      )}

      {/* CONVERSAS TAB */}
      {tab === "conversas" && (
        <div>
          {phones.length === 0 ? (
            <div style={{ background: "#fff", border: "1.5px solid #e8e0d8", borderRadius: 12, padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 24, margin: "0 0 8px" }}>💬</p>
              <p style={{ fontSize: 13, color: "#888" }}>Nenhuma conversa registrada ainda.</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, height: 480 }}>
              {/* Phone list */}
              <div style={{
                width: 140, background: "#fff", border: "1.5px solid #e8e0d8",
                borderRadius: 12, overflowY: "auto", flexShrink: 0
              }}>
                {phones.map((p) => {
                  const hasAlert = conversations.some(c => c.numero_telefone === p.numero_telefone && c.precisa_atencao);
                  const isSelected = selectedPhone === p.numero_telefone;
                  return (
                    <button
                      key={p.numero_telefone}
                      onClick={() => setSelectedPhone(p.numero_telefone)}
                      style={{
                        width: "100%", padding: "10px 10px", textAlign: "left",
                        background: isSelected ? "#f5f0eb" : "transparent",
                        border: "none", borderBottom: "1px solid #f0ebe5",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#1a1a1a", lineBreak: "anywhere" }}>
                        {fmtPhone(p.numero_telefone)}
                        {hasAlert && " ⚠️"}
                      </div>
                      <div style={{ fontSize: 9, color: "#999", marginTop: 2 }}>
                        {fmtData(p.created_at)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Conversation */}
              <div style={{
                flex: 1, background: "#fff", border: "1.5px solid #e8e0d8",
                borderRadius: 12, overflowY: "auto", padding: 12, display: "flex",
                flexDirection: "column", gap: 8
              }}>
                {phoneConversations.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#999", textAlign: "center" }}>Selecione um contato</p>
                ) : phoneConversations.map((c) => (
                  <div key={c.id} style={{
                    display: "flex",
                    justifyContent: c.remetente === "cliente" ? "flex-start" : "flex-end"
                  }}>
                    <div style={{
                      maxWidth: "80%", padding: "8px 12px", borderRadius: 12,
                      background: c.remetente === "cliente" ? "#f5f0eb" : (c.remetente === "thais" ? "#e3f2fd" : "#e8f5e9"),
                      fontSize: 12, lineHeight: 1.5, position: "relative"
                    }}>
                      {c.precisa_atencao && (
                        <div style={{ fontSize: 10, color: "#e65100", fontWeight: 700, marginBottom: 2 }}>⚠️ Precisa atenção</div>
                      )}
                      <div style={{ color: "#333" }}>{c.mensagem}</div>
                      <div style={{ fontSize: 9, color: "#999", marginTop: 4, textAlign: "right" }}>
                        {c.remetente === "agente" ? "🤖 Agente" : c.remetente === "thais" ? "📸 Você" : "👤 Cliente"}
                        {" · "}{fmtData(c.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INSTRUÇÕES TAB */}
      {tab === "instrucoes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", border: "1.5px solid #e8e0d8", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: "#b8967e", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 14px" }}>
              Como configurar o agente
            </p>

            {[
              {
                num: "1",
                title: "Exporte conversas do WhatsApp",
                desc: "Abra uma conversa com cliente → toque nos 3 pontinhos (⋮) → Mais → Exportar conversa → Sem mídia. Repita para 5 a 10 conversas diferentes (orçamentos, agendamentos, dúvidas).",
              },
              {
                num: "2",
                title: "Execute o script de análise",
                desc: `No computador, com Python instalado:\n\npip install anthropic requests\npython analise_estilo.py conversa.zip SUA_CHAVE_CLAUDE\n\nO script analisa seu estilo e salva o perfil automaticamente no sistema.`,
                mono: true,
              },
              {
                num: "3",
                title: "Configure as tabelas no Supabase",
                desc: "Execute o arquivo setup_supabase.sql no SQL Editor do Supabase para criar as tabelas necessárias (uma vez só).",
              },
              {
                num: "4",
                title: "Configure o webhook na Evolution API",
                desc: "No painel da Evolution API, configure o webhook para apontar para o endereço do servidor webhook.py quando uma mensagem chegar.",
              },
              {
                num: "5",
                title: "Suba o servidor do agente",
                desc: `ANTHROPIC_API_KEY=sk-ant-... uvicorn webhook:app --host 0.0.0.0 --port 8000`,
                mono: true,
              },
              {
                num: "6",
                title: "Ligue o agente aqui",
                desc: "Na aba Status, clique em DESLIGADO para ligar o agente. Pronto!",
              },
            ].map(({ num, title, desc, mono }) => (
              <div key={num} style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0
                }}>
                  {num}
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{title}</p>
                  {mono ? (
                    <pre style={{
                      margin: 0, fontSize: 11, color: "#444", lineHeight: 1.6,
                      background: "#f5f0eb", padding: "8px 10px", borderRadius: 6,
                      whiteSpace: "pre-wrap", fontFamily: "monospace"
                    }}>
                      {desc}
                    </pre>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: "#666", lineHeight: 1.6 }}>{desc}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "#e8f5e9", border: "1.5px solid #c8e6c9", borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#2e7d32", margin: "0 0 6px" }}>💡 Dica importante</p>
            <p style={{ fontSize: 12, color: "#388e3c", margin: 0, lineHeight: 1.5 }}>
              Você pode editar o system prompt manualmente na aba <b>Estilo</b> — não precisa rodar o script se preferir escrever o perfil você mesma.
              O agente respeita exatamente o que está escrito no prompt.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
