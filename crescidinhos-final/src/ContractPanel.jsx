// =============================================================
// ContractPanel.jsx — Crescidinhos Fotografia
// v3: links separados cliente/fotógrafa + status de assinaturas
// =============================================================

import { useState, useEffect } from "react";
import { gerarContratoHTML, gerarNumeroContrato, fmtData } from "./ContractGenerator";
import { SERVICES } from "./config";

const SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co";
const SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3";
const EVOLUTION_URL = "https://ribbitingboar-evolution.cloudfy.live/message/sendText/crescidinhos";
const EVOLUTION_KEY = "gNnhqK2sv964EPigBYm1WJkBc91gu1t4";
const N8N_EMAIL     = "https://ribbitingboar-n8n.cloudfy.live/webhook/enviar-contrato-email";
const APP_URL       = "https://app.crescidinhosfoto.com.br";

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

async function enviarWhatsApp(numero, mensagem) {
  const tel = numero.replace(/\D/g, "");
  if (!tel || tel.length < 10) return;
  await fetch(EVOLUTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
    body: JSON.stringify({ number: `55${tel}`, text: mensagem }),
  }).catch(() => {});
}

async function enviarEmail(dados) {
  await fetch(N8N_EMAIL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  }).catch(() => {});
}

// ── Estilos ───────────────────────────────────────────────────────
const inp = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1.5px solid #e0d8d0", fontSize: 13, boxSizing: "border-box",
  outline: "none", background: "#fff", fontFamily: "inherit", color: "#1a1a1a",
  marginBottom: 12,
};
const lbl = { fontSize: 12, color: "#555", fontWeight: 600, display: "block", marginBottom: 5 };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

function btnStyle(bg) {
  return {
    width: "100%", padding: 13, borderRadius: 10,
    background: bg, color: bg === "#ccc" ? "#999" : "#fff",
    border: "none", fontSize: 14, fontWeight: 600,
    cursor: bg === "#ccc" ? "not-allowed" : "pointer",
    fontFamily: "inherit", marginTop: 4,
  };
}

// ── Componente de status de assinatura ────────────────────────────
function SigStatus({ label, signed, date }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderBottom: "1px solid #f0e8e0", fontSize: 12,
    }}>
      <span style={{ color: "#888" }}>{label}</span>
      {signed
        ? <span style={{ color: "#2e7d32", fontWeight: 600 }}>✅ Assinado{date ? ` em ${date}` : ""}</span>
        : <span style={{ color: "#f57c00", fontWeight: 600 }}>⏳ Pendente</span>
      }
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export default function ContractPanel({ agendamento, onUpdate }) {
  const cl = agendamento?.clientes || {};
  const catKey = agendamento?.servico_id || "infantil";
  const cat = SERVICES.find(s => s.id === catKey);

  // Estado do formulário
  const isEvento = ["aniversario","batizado","quinze-anos"].includes(catKey);

  // Lê autorização de imagem da anamnese (já respondida pelo cliente)
  const autorizacaoDaAnamnese = cl.anamnese?.autoriza_imagem || cl.filhos?.[0]?.autoriza_imagem || null;
  const autorizaImagemInicial = autorizacaoDaAnamnese
    ? autorizacaoDaAnamnese === "Sim, pode usar!"
    : true;

  const [form, setForm] = useState({
    cpf: agendamento?.cpf_mae || cl.cpf_mae || "",
    valor: agendamento?.valor || "",
    formaPagamento: agendamento?.forma_pagamento || "",
    autorizaImagem: autorizaImagemInicial,
    obs: agendamento?.obs || "",
    extras: [],
    localEnsaio: "",
    // Evento: puxa do dados_evento salvo no agendamento
    localEvento: agendamento?.dados_evento?.local_nome || agendamento?.dados_evento?.local || "",
    nomeAniversariante: agendamento?.dados_evento?.nome_aniversariante || "",
  });

  // Estado do painel
  const [status, setStatus] = useState(() => {
    if (agendamento?.signature && agendamento?.signature_contratada) return "assinado_ambos";
    if (agendamento?.signature) return "enviado"; // cliente já assinou
    if (agendamento?.contrato_html) return "enviado";
    return "idle";
  });

  const [numContrato, setNumContrato] = useState(agendamento?.contrato_numero || "");
  const [previewHTML, setPreviewHTML] = useState(null); // HTML gerado para pré-visualizar

  // Status de assinaturas — recarrega do Supabase ao abrir
  const [sigStatus, setSigStatus] = useState({
    cliente: !!agendamento?.signature,
    contratada: !!agendamento?.signature_contratada,
    responsavel: !!agendamento?.signature_responsavel,
    signed_at: agendamento?.signed_at || "",
  });

  useEffect(() => {
    if (agendamento?.contrato_html) {
      recarregarSigStatus();
    }
  }, [agendamento?.id]);

  async function recarregarSigStatus() {
    try {
      const r = await sb(
        `agendamentos?id=eq.${agendamento.id}&select=signature,signature_contratada,signature_responsavel,signed_at`
      );
      if (r && r[0]) {
        const a = r[0];
        setSigStatus({
          cliente: !!a.signature,
          contratada: !!a.signature_contratada,
          responsavel: !!a.signature_responsavel,
          signed_at: a.signed_at || "",
        });
        if (a.signature && a.signature_contratada) {
          setStatus("assinado_ambos");
        } else if (a.signature || a.contrato_html) {
          setStatus("enviado");
        }
      }
    } catch (e) {
      console.error("Erro ao recarregar status:", e);
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Extras
  const extrasDisponiveis = cat?.extras || [];
  const descontoExtras = cat?.descontoExtras || false;
  function toggleExtra(e) {
    const prev = form.extras;
    const existe = prev.some(x => x.id === e.id);
    set("extras", existe ? prev.filter(x => x.id !== e.id) : [...prev, e]);
  }

  // Cálculo
  const totalExtras = form.extras.reduce((a, e) => a + (e.price || 0), 0);
  const baseVal = Number(form.valor) || 0;
  const sub = baseVal + totalExtras;
  const desconto = descontoExtras && form.extras.length > 0 ? Math.round(sub * 0.10) : 0;
  const valorFinal = sub - desconto;

  // Menor
  const filhos = cl.filhos || [];
  const temMenor = filhos.length > 0 || !!cl.nome_crianca;
  const nomeCrianca = filhos[0]?.nome_crianca || cl.nome_crianca || "";
  const idadeCrianca = filhos[0]?.idade || cl.idade || "";

  // Links do contrato
  const linkCliente   = `${APP_URL}/contrato/${agendamento?.id}`;
  const linkFotografa = `${APP_URL}/contrato/${agendamento?.id}?p=fotografa`;

  // ── Monta dadosContrato (reutilizado em preview e envio) ──────────
  function montarDados(numero) {
    return {
      catKey,
      catLabel: cat?.label || agendamento?.servico || "",
      planoId: agendamento?.modalidade_id || "",
      planoLabel: agendamento?.modalidade || "",
      fotos: cat?.modalities?.find(m => m.id === agendamento?.modalidade_id)?.fotos,
      duracao: cat?.modalities?.find(m => m.id === agendamento?.modalidade_id)?.duracao,
      localExterno: catKey?.includes("externa") || catKey?.includes("externo"),
      localEnsaio: isEvento
        ? (form.localEvento || "A confirmar")
        : (form.localEnsaio ||
            (catKey?.includes("externa") || catKey?.includes("externo")
              ? "A confirmar"
              : "Crescidinhos Fotografia — Padre Anchieta 775, Bauru/SP")),
      localEvento: form.localEvento || "",
      nomeAniversariante: form.nomeAniversariante || agendamento?.dados_evento?.nome_aniversariante || "",
      ensaioVinculado: agendamento?.obs?.startsWith("Inclui") ? agendamento.obs : null,
      valorTotal: valorFinal,
      valorMensal: catKey === "cofrinho" ? Number(form.valor) : null,
      desconto,
      formaPagamento: form.formaPagamento,
      extras: form.extras,
      descontoExtras: descontoExtras && form.extras.length > 0,
      autorizaUsoImagem: form.autorizaImagem,
      prazoEntrega: ["aniversario","batizado","quinze-anos"].includes(catKey) ? "10 dias corridos" : "20 dias úteis",
      nomeCliente: cl.nome_mae || "",
      cpfCliente: form.cpf,
      emailCliente: cl.email || "",
      whatsappCliente: cl.telefone || "",
      temMenor,
      nomeCrianca,
      idadeCrianca,
      nomeResponsavel: cl.nome_mae || "",
      dataContrato: new Date().toISOString().split("T")[0],
      dataEnsaio: agendamento?.data || "",
      horaEnsaio: agendamento?.hora || "",
      numeroContrato: numero,
      agendamentoId: agendamento?.id || "",
    };
  }

  // ── Pré-visualizar (não envia ainda) ────────────────────────────
  function abrirPreview() {
    const numero = gerarNumeroContrato(catKey);
    setNumContrato(numero);
    const html = gerarContratoHTML(montarDados(numero));
    setPreviewHTML(html);
    setStatus("preview");
  }

  // ── Confirmar e enviar (após aprovar preview) ────────────────────
  async function confirmarEEnviar() {
    setStatus("gerando");
    try {
      const html = previewHTML;
      const numero = numContrato;

      // 1. Salva no Supabase
      await sb(`agendamentos?id=eq.${agendamento.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          cpf_mae: form.cpf,
          valor: valorFinal,
          forma_pagamento: form.formaPagamento,
          obs: form.obs,
          contrato_html: html,
          contrato_numero: numero,
          contrato_gerado_em: new Date().toISOString(),
          status: "Contrato",
        }),
      });

      // 2. WhatsApp para o cliente
      const primeiroNome = cl.nome_mae?.split(" ")[0] || "cliente";
      await enviarWhatsApp(
        cl.telefone,
        `Olá, ${primeiroNome}! 🎀\n\nSeu contrato da Crescidinhos Fotografia está pronto!\n\n📋 *${cat?.label || agendamento?.servico}*\n📅 ${agendamento?.data ? fmtData(agendamento.data) : ""}\n\nAcesse o link abaixo para ler e assinar digitalmente:\n${linkCliente}\n\n_Qualquer dúvida, é só chamar! 🐘_`
      );

      // 3. E-mail via n8n
      await enviarEmail({
        destinatario: cl.email,
        nome: cl.nome_mae,
        servico: cat?.label || agendamento?.servico,
        plano: agendamento?.modalidade,
        dataEnsaio: agendamento?.data,
        numeroContrato: numero,
        linkContrato: linkCliente,
        contratoHTML: html,
      });

      // 4. Notifica Thais com link para assinar
      await enviarWhatsApp(
        "14996845521",
        `📄 *Contrato gerado!*\n\nCliente: ${cl.nome_mae}\nServiço: ${cat?.label || agendamento?.servico}\nContrato: ${numero}\n\nLink enviado ao cliente.\n\n✍️ *Seu link para assinar:*\n${linkFotografa}`
      );

      onUpdate?.({ status: "Contrato", contrato_numero: numero, valor: valorFinal });
      setStatus("enviado");
      setSigStatus({ cliente: false, contratada: false, responsavel: false, signed_at: "" });
    } catch (err) {
      console.error(err);
      setStatus("erro");
    }
  }

  // ── Render: pré-visualização ────────────────────────────────────
  if (status === "preview") return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => { setStatus("idle"); setPreviewHTML(null); }}
          style={{ padding: "8px 14px", borderRadius: 8, background: "#fff", border: "1.5px solid #e8e0d8", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#666" }}>
          ← Voltar e corrigir
        </button>
        <button onClick={confirmarEEnviar}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: "#72243E", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          ✅ Confirmar e enviar ao cliente
        </button>
      </div>
      <div style={{ background: "#fff3cd", border: "1px solid #ffe082", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#856404" }}>
        👁 Revise o contrato abaixo. Se precisar corrigir algo, clique em "Voltar e corrigir".
      </div>
      <div style={{ border: "1.5px solid #e8e0d8", borderRadius: 10, overflow: "hidden" }}>
        <iframe
          srcDoc={previewHTML}
          title="Pré-visualização do contrato"
          style={{ width: "100%", height: "70vh", border: "none" }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );

  // ── Render: ambos assinaram ─────────────────────────────────────
  if (status === "assinado_ambos") return (
    <div style={{ background: "#e6f4ea", border: "1.5px solid #a5d6a7", borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 14, color: "#2e7d32", fontWeight: 600, margin: "0 0 6px" }}>✅ Contrato assinado por ambas as partes!</p>
      <p style={{ fontSize: 12, color: "#555", margin: "0 0 4px" }}>Assinado em {sigStatus.signed_at || agendamento?.signed_at}</p>
      <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Nº {numContrato || agendamento?.contrato_numero}</p>
      <a
        href={linkCliente}
        target="_blank"
        rel="noreferrer"
        style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "#2e7d32", fontWeight: 600 }}
      >
        📄 Ver contrato assinado →
      </a>
    </div>
  );

  // ── Render: contrato enviado, aguardando assinaturas ────────────
  if (status === "enviado") return (
    <div>
      <div style={{ background: "#e6f4ea", border: "1.5px solid #a5d6a7", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <p style={{ fontSize: 14, color: "#2e7d32", fontWeight: 600, margin: "0 0 4px" }}>✅ Contrato enviado!</p>
        <p style={{ fontSize: 12, color: "#555", margin: 0 }}>Nº {numContrato || agendamento?.contrato_numero} · Link enviado por WhatsApp e e-mail para {cl.nome_mae}</p>
      </div>

      {/* Status das assinaturas */}
      <div style={{ background: "#faf8f5", border: "1.5px solid #e8e0d8", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: "#b8967e", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 10px" }}>
          Status das assinaturas
        </p>
        <SigStatus label="Cliente" signed={sigStatus.cliente} date={sigStatus.signed_at} />
        {temMenor && (
          <SigStatus label="Responsável legal" signed={sigStatus.responsavel} date={sigStatus.signed_at} />
        )}
        <SigStatus label="Contratada (você)" signed={sigStatus.contratada} date={sigStatus.signed_at} />
        <button
          onClick={recarregarSigStatus}
          style={{ marginTop: 10, fontSize: 11, color: "#888", background: "none", border: "1px solid #e8e0d8", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
        >
          🔄 Atualizar status
        </button>
      </div>

      {/* Links */}
      <div style={{ background: "#fff", border: "1.5px solid #e8e0d8", borderRadius: 10, padding: "12px 14px" }}>
        <p style={{ fontSize: 11, color: "#b8967e", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 10px" }}>
          Links do contrato
        </p>

        {/* Link do cliente */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0e8e0" }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>🌸 Link do cliente</p>
            <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0 0" }}>Enviado por WhatsApp e e-mail</p>
          </div>
          <a href={linkCliente} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#72243E", fontWeight: 600, textDecoration: "none" }}>
            Ver →
          </a>
        </div>

        {/* Link da fotógrafa */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 4px" }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#7b1fa2", margin: 0 }}>📷 Seu link para assinar</p>
            <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0 0" }}>Use este para assinar como fotógrafa</p>
          </div>
          <a href={linkFotografa} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#7b1fa2", fontWeight: 700, textDecoration: "none" }}>
            Assinar →
          </a>
        </div>

        {/* Aviso */}
        <div style={{ background: "#f3e5f5", borderRadius: 8, padding: "8px 10px", marginTop: 8, fontSize: 11, color: "#7b1fa2", lineHeight: 1.5 }}>
          💜 O cliente usa o link rosa (WhatsApp/e-mail). Você usa o link roxo acima. Cada um assina apenas no campo correspondente.
        </div>
      </div>
    </div>
  );

  // ── Render: gerando ─────────────────────────────────────────────
  if (status === "gerando") return (
    <div style={{ background: "#FFF3CD", border: "1px solid #FFE082", borderRadius: 10, padding: 14, textAlign: "center", fontSize: 13, color: "#856404" }}>
      ⏳ Gerando contrato e enviando para o cliente...
    </div>
  );

  // ── Render: erro ────────────────────────────────────────────────
  if (status === "erro") return (
    <div>
      <div style={{ background: "#FFEBEE", border: "1px solid #EF9A9A", borderRadius: 10, padding: 14, fontSize: 13, color: "#B71C1C", marginBottom: 10 }}>
        ❌ Erro ao gerar contrato. Verifique a conexão e tente novamente.
      </div>
      <button onClick={() => setStatus("idle")} style={btnStyle("#72243E")}>Tentar novamente</button>
    </div>
  );

  // ── Render: idle — formulário de geração ────────────────────────
  return (
    <div>
      <p style={{ fontSize: 11, color: "#b8967e", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 14px" }}>
        Gerar contrato
      </p>

      <Field label="CPF da cliente">
        <input
          style={inp}
          placeholder="000.000.000-00"
          value={form.cpf}
          onChange={e => set("cpf", e.target.value)}
        />
      </Field>

      <Field label="Valor total (R$)">
        <input
          style={inp}
          type="number"
          placeholder="0,00"
          value={form.valor}
          onChange={e => set("valor", e.target.value)}
        />
      </Field>

      <Field label="Forma de pagamento">
        <select style={inp} value={form.formaPagamento} onChange={e => set("formaPagamento", e.target.value)}>
          <option value="">Selecione...</option>
          <option>Pix — à vista</option>
          <option>Cartão de crédito — à vista</option>
          <option>Cartão de crédito — 2x</option>
          <option>Cartão de crédito — 3x</option>
          <option>50% entrada + 50% no dia do ensaio</option>
          <option>Entrada + parcelas (a combinar)</option>
        </select>
      </Field>

      {(catKey?.includes("externa") || catKey?.includes("externo")) && (
        <Field label="Local do ensaio externo">
          <input
            style={inp}
            placeholder="Endereço ou nome do local"
            value={form.localEnsaio}
            onChange={e => set("localEnsaio", e.target.value)}
          />
        </Field>
      )}

      {isEvento && (
        <>
          <Field label="Local do evento *">
            <input
              style={inp}
              placeholder="Nome e endereço do local (ex: Espaço Estrelas — Av. Nações 100, Bauru/SP)"
              value={form.localEvento}
              onChange={e => set("localEvento", e.target.value)}
            />
          </Field>
          <Field label="Nome do aniversariante">
            <input
              style={inp}
              placeholder="Ex: Maria Eduarda · 1 aninho"
              value={form.nomeAniversariante}
              onChange={e => set("nomeAniversariante", e.target.value)}
            />
          </Field>
        </>
      )}

      {/* Extras para eventos */}
      {extrasDisponiveis.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>
            Adicionais
            {descontoExtras && (
              <span style={{ marginLeft: 6, fontSize: 10, background: "#EAF3DE", color: "#27500A", padding: "1px 7px", borderRadius: 20, fontWeight: 600 }}>
                10% OFF ao incluir
              </span>
            )}
          </label>
          {extrasDisponiveis.map(e => {
            const sel = form.extras.some(x => x.id === e.id);
            return (
              <div
                key={e.id}
                onClick={() => toggleExtra(e)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px", borderRadius: 9, marginBottom: 5, cursor: "pointer",
                  border: sel ? "2px solid #1a1a1a" : "1.5px solid #e8e0d8",
                  background: sel ? "#1a1a1a" : "#fff",
                }}
              >
                <span style={{ fontSize: 13, color: sel ? "#fff" : "#1a1a1a" }}>{e.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: sel ? "#F4C0D1" : "#b8967e" }}>
                  R$ {e.price?.toLocaleString("pt-BR")}
                </span>
              </div>
            );
          })}
          {form.extras.length > 0 && (
            <div style={{ fontSize: 12, color: "#2e7d32", fontWeight: 500, marginTop: 6 }}>
              {desconto > 0 ? `Desconto 10%: - R$ ${desconto.toLocaleString("pt-BR")} · ` : ""}
              Total: R$ {valorFinal.toLocaleString("pt-BR")}
            </div>
          )}
        </div>
      )}

      {/* Autorização de imagem — sincroniza com anamnese */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Autorização de uso de imagem</label>
        {autorizacaoDaAnamnese && (
          <div style={{ fontSize: 11, color: "#1565C0", background: "#e3f2fd", border: "1px solid #90CAF9", borderRadius: 6, padding: "5px 10px", marginBottom: 6 }}>
            📋 Pré-preenchido da anamnese: <strong>"{autorizacaoDaAnamnese}"</strong>. Pode alterar se necessário.
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {[["Autoriza", true], ["Não autoriza", false]].map(([txt, val]) => (
            <button
              key={txt}
              onClick={() => set("autorizaImagem", val)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 9, cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                border: form.autorizaImagem === val ? "2px solid #1a1a1a" : "1.5px solid #e8e0d8",
                background: form.autorizaImagem === val ? "#1a1a1a" : "#fff",
                color: form.autorizaImagem === val ? "#fff" : "#666",
              }}
            >
              {txt}
            </button>
          ))}
        </div>
      </div>

      <Field label="Observações (aparecem no contrato)">
        <textarea
          style={{ ...inp, resize: "vertical", marginBottom: 0 }}
          rows={2}
          value={form.obs}
          onChange={e => set("obs", e.target.value)}
          placeholder="Ex: pacote inclui cenário temático de Páscoa..."
        />
      </Field>

      <button
        onClick={abrirPreview}
        disabled={!form.cpf || !form.valor || !form.formaPagamento || (isEvento && !form.localEvento)}
        style={btnStyle(!form.cpf || !form.valor || !form.formaPagamento || (isEvento && !form.localEvento) ? "#ccc" : "#72243E")}
      >
        👁 Pré-visualizar contrato
      </button>
      <p style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 6 }}>
        Revise o contrato antes de enviar ao cliente
      </p>
    </div>
  );
}
