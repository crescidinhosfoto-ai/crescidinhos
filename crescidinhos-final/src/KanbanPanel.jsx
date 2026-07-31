// KanbanPanel.jsx — Crescidinhos Fotografia
// Painel Kanban para acompanhar o funil de atendimento da Clarice v2

import { useState, useEffect, useCallback } from "react";
import { linkWhatsAppEmpresa } from "./config";
import { sb } from "./supabaseAuth";

const COLUNAS = [
  { slug: "novo_lead",         label: "Novo Lead",          cor: "#698494" },
  { slug: "a_atender",         label: "A Atender",          cor: "#f57c00" },
  { slug: "orcamento_enviado", label: "Orçamento Enviado",  cor: "#0277bd" },
  { slug: "fechado",           label: "Fechado ✓",          cor: "#2e7d32" },
  { slug: "pendencia_aberta",  label: "Pendência Aberta",   cor: "#c62828" },
  { slug: "thais_responde",    label: "Thais Responde",     cor: "#7b1fa2" },
];

function tempoRelativo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function KanbanPanel() {
  const [conversas, setConversas] = useState([]);
  const [tarefas, setTarefas] = useState({});
  const [cardSel, setCardSel] = useState(null);
  const [menuAberto, setMenuAberto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTarefas, setLoadingTarefas] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sb("conversas?select=*&order=ultima_mensagem_em.desc.nullslast,atualizado_em.desc");
      setConversas(res || []);
    } catch (e) {
      console.error("Kanban:", e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCard = async (conv) => {
    setCardSel(conv);
    if (conv.categoria === "fechado" && !tarefas[conv.telefone]) {
      setLoadingTarefas(true);
      try {
        const res = await sb(`tarefas?telefone=eq.${encodeURIComponent(conv.telefone)}&order=criado_em.asc`);
        setTarefas(t => ({ ...t, [conv.telefone]: res || [] }));
      } catch (e) {
        console.error("Tarefas:", e.message);
      }
      setLoadingTarefas(false);
    }
  };

  const marcarTarefa = async (telefone, id, statusAtual) => {
    const novoStatus = statusAtual === "concluido" ? "pendente" : "concluido";
    try {
      await sb(`tarefas?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: novoStatus }),
      });
      setTarefas(t => ({
        ...t,
        [telefone]: (t[telefone] || []).map(tf =>
          tf.id === id ? { ...tf, status: novoStatus } : tf
        ),
      }));
    } catch (e) {
      console.error("Marcar tarefa:", e.message);
    }
  };

  const moverCard = async (conv, novaCategoria) => {
    if (novaCategoria === conv.categoria) { setMenuAberto(null); return; }
    try {
      await sb(`conversas?telefone=eq.${encodeURIComponent(conv.telefone)}`, {
        method: "PATCH",
        body: JSON.stringify({ categoria: novaCategoria, atualizado_em: new Date().toISOString() }),
      });
      setConversas(cs =>
        cs.map(c => c.telefone === conv.telefone ? { ...c, categoria: novaCategoria } : c)
      );
    } catch (e) {
      console.error("Mover card:", e.message);
    }
    setMenuAberto(null);
  };

  const importarHistorico = async () => {
    setImportando(true);
    setMsgImport("");
    try {
      // Busca todos os telefones em mensagens
      const msgs = await sb("mensagens?select=telefone&order=created_at.desc");
      if (!msgs?.length) { setMsgImport("Nenhuma mensagem encontrada."); setImportando(false); return; }

      // Deduplica — mantém o registro mais recente por telefone
      const seen = new Set();
      const unicos = [];
      for (const m of msgs) {
        if (m.telefone && !seen.has(m.telefone)) {
          seen.add(m.telefone);
          unicos.push(m.telefone);
        }
      }

      // Filtra os que já existem no kanban
      const existentes = new Set(conversas.map(c => c.telefone));
      const novos = unicos.filter(t => !existentes.has(t));

      if (!novos.length) {
        setMsgImport("✅ Todos os contatos já estão no Kanban.");
        setImportando(false);
        return;
      }

      // Upsert em lotes de 50
      const agora = new Date().toISOString();
      const payload = novos.map(tel => ({
        telefone: tel,
        categoria: "a_atender",
        nome_contato: tel,
        criado_em: agora,
        atualizado_em: agora,
      }));

      for (let i = 0; i < payload.length; i += 50) {
        await sb("conversas", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify(payload.slice(i, i + 50)),
        });
      }

      setMsgImport(`✅ ${novos.length} contato(s) importado(s) para "A Atender".`);
      await carregar();
    } catch (e) {
      setMsgImport("❌ Erro ao importar: " + e.message);
    }
    setImportando(false);
  };

  const porColuna = (slug) => conversas.filter(c => c.categoria === slug);
  const tarefasCard = cardSel ? (tarefas[cardSel.telefone] || []) : [];

  return (
    <div style={{ maxWidth: "100%" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, color: "#b8967e", fontSize: 16 }}>📋 Kanban de Atendimento</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#a09080" }}>
            {conversas.length} conversa(s) • Clarice v2
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={importarHistorico} disabled={importando}
            style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e8e0d8", background: "#fff", fontSize: 12, cursor: "pointer", color: "#555" }}>
            {importando ? "Importando..." : "📥 Importar histórico"}
          </button>
          <button onClick={carregar} disabled={loading}
            style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e8e0d8", background: "#fff", fontSize: 12, cursor: "pointer", color: "#555" }}>
            {loading ? "..." : "↺ Atualizar"}
          </button>
        </div>
      </div>

      {msgImport && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: msgImport.startsWith("✅") ? "#e8f5e8" : "#fde8e8", marginBottom: 12, fontSize: 12, color: msgImport.startsWith("✅") ? "#2e7d32" : "#c62828" }}>
          {msgImport}
        </div>
      )}

      {/* Board */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}
        onClick={(e) => { if (e.target === e.currentTarget) setMenuAberto(null); }}>
        {COLUNAS.map(col => {
          const cards = porColuna(col.slug);
          return (
            <div key={col.slug} style={{ minWidth: 220, maxWidth: 240, flexShrink: 0 }}>
              {/* Cabeçalho da coluna */}
              <div style={{
                padding: "8px 12px",
                borderRadius: "10px 10px 0 0",
                background: col.cor,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 0,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.03em" }}>
                  {col.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "1px 7px" }}>
                  {cards.length}
                </span>
              </div>

              {/* Lista de cards */}
              <div style={{
                background: "#f5f0eb",
                borderRadius: "0 0 10px 10px",
                border: `1.5px solid ${col.cor}`,
                borderTop: "none",
                minHeight: 80,
                padding: 8,
              }}>
                {cards.length === 0 && (
                  <p style={{ fontSize: 11, color: "#c0b8b0", textAlign: "center", margin: "16px 0" }}>vazio</p>
                )}
                {cards.map(conv => (
                  <CardConversa
                    key={conv.telefone}
                    conv={conv}
                    cor={col.cor}
                    menuAberto={menuAberto}
                    onAbrirCard={() => abrirCard(conv)}
                    onToggleMenu={() => setMenuAberto(menuAberto === conv.telefone ? null : conv.telefone)}
                    onMover={(slug) => moverCard(conv, slug)}
                    isThais={col.slug === "thais_responde"}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de tarefas */}
      {cardSel && (
        <div onClick={() => setCardSel(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, maxHeight: "75vh", overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>
                  {cardSel.nome_contato || cardSel.telefone}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#a09080" }}>
                  {cardSel.telefone} • {tempoRelativo(cardSel.atualizado_em)}
                </p>
              </div>
              <button onClick={() => setCardSel(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", lineHeight: 1 }}>✕</button>
            </div>

            {cardSel.categoria === "fechado" ? (
              <>
                <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#2e7d32" }}>✅ Tarefas pós-venda</p>
                {loadingTarefas && <p style={{ fontSize: 13, color: "#999" }}>Carregando tarefas...</p>}
                {!loadingTarefas && tarefasCard.length === 0 && (
                  <p style={{ fontSize: 13, color: "#a09080" }}>Nenhuma tarefa registrada para este atendimento.</p>
                )}
                {tarefasCard.map(tf => (
                  <button key={tf.id} onClick={() => marcarTarefa(cardSel.telefone, tf.id, tf.status)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      background: tf.status === "concluido" ? "#f0faf0" : "#fff",
                      border: "1.5px solid #e8e0d8", borderRadius: 10, padding: "10px 12px",
                      marginBottom: 8, cursor: "pointer", textAlign: "left",
                    }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 6, border: "2px solid",
                      borderColor: tf.status === "concluido" ? "#2e7d32" : "#ccc",
                      background: tf.status === "concluido" ? "#2e7d32" : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, fontSize: 12, color: "#fff",
                    }}>
                      {tf.status === "concluido" ? "✓" : ""}
                    </span>
                    <span style={{ fontSize: 13, color: tf.status === "concluido" ? "#888" : "#1a1a1a", textDecoration: tf.status === "concluido" ? "line-through" : "none" }}>
                      {tf.tipo}
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <div style={{ padding: "12px 0" }}>
                <p style={{ fontSize: 13, color: "#a09080", margin: 0 }}>
                  Categoria atual: <strong style={{ color: COLUNAS.find(c => c.slug === cardSel.categoria)?.cor || "#333" }}>
                    {COLUNAS.find(c => c.slug === cardSel.categoria)?.label || cardSel.categoria}
                  </strong>
                </p>
                <p style={{ fontSize: 12, color: "#bbb", margin: "8px 0 0" }}>
                  Tarefas só aparecem em atendimentos com status "Fechado".
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CardConversa({ conv, cor, menuAberto, onAbrirCard, onToggleMenu, onMover, isThais }) {
  const aberto = menuAberto === conv.telefone;
  const nome = conv.nome_contato && conv.nome_contato !== conv.telefone
    ? conv.nome_contato
    : formatarTelefone(conv.telefone);

  return (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          border: "1.5px solid #e8e0d8",
          borderLeft: `4px solid ${cor}`,
          padding: "10px 10px 10px 12px",
          cursor: "pointer",
        }}
        onClick={onAbrirCard}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", flex: 1, marginRight: 4 }}>
            {nome}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {isThais && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: "#fff", background: "#c62828",
                borderRadius: 4, padding: "2px 5px",
              }}>AGUARDA</span>
            )}
            <button onClick={e => { e.stopPropagation(); onToggleMenu(); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>
              ⋯
            </button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "#a09080" }}>
            {tempoRelativo(conv.ultima_mensagem_em || conv.atualizado_em)}
          </span>
          <a href={linkWhatsAppEmpresa(conv.telefone)}
            target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, color: "#25D366", fontWeight: 600,
              textDecoration: "none", padding: "2px 6px",
              borderRadius: 6, background: "#f0fdf4",
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.554 4.1 1.523 5.82L.057 23.286c-.094.317.206.603.52.498l5.694-1.823A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.214-3.713 1.188 1.21-3.614-.235-.372A9.818 9.818 0 1112 21.818z"/>
            </svg>
            Abrir
          </a>
        </div>
      </div>

      {/* Menu mover */}
      {aberto && (
        <div onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", top: 0, right: 0, zIndex: 50,
            background: "#fff", borderRadius: 10, border: "1.5px solid #e8e0d8",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: 8, minWidth: 190,
          }}>
          <p style={{ margin: "0 0 6px", fontSize: 10, color: "#a09080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 4px" }}>
            Mover para
          </p>
          {COLUNAS.map(col => (
            <button key={col.slug} onClick={() => onMover(col.slug)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                background: conv.categoria === col.slug ? "#f5f0eb" : "transparent",
                border: "none", borderRadius: 6, padding: "7px 8px", cursor: "pointer", textAlign: "left",
                fontSize: 12, color: conv.categoria === col.slug ? col.cor : "#333",
                fontWeight: conv.categoria === col.slug ? 700 : 400,
              }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.cor, flexShrink: 0 }} />
              {col.label}
              {conv.categoria === col.slug && " ✓"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatarTelefone(tel) {
  if (!tel) return "—";
  const n = tel.replace(/\D/g, "");
  if (n.length === 13) return `(${n.slice(2, 4)}) ${n.slice(4, 9)}-${n.slice(9)}`;
  if (n.length === 12) return `(${n.slice(2, 4)}) ${n.slice(4, 8)}-${n.slice(8)}`;
  return tel;
}
