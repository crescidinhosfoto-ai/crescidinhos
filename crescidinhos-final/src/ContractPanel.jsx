// =============================================================
// ContractPanel.jsx — Crescidinhos Fotografia
// Substituir o bloco "Contrato" atual no CRM (App.js)
// Dentro do detalhe do agendamento, após o bloco de pagamento
// =============================================================

import { useState } from "react";
import { gerarContratoHTML, gerarNumeroContrato, fmtData } from "./ContractGenerator";
import { SERVICES, EXTRAS_EVENTOS, EXTRAS_15ANOS } from "./config";

const SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co";
const SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3";
const EVOLUTION_URL = "https://ribbitingboar-evolution.cloudfy.live/message/sendText/crescidinhos";
const EVOLUTION_KEY = "gNnhqK2sv964EPigBYm1WJkBc91gu1t4";
const N8N_EMAIL    = "https://ribbitingboar-n8n.cloudfy.live/webhook/enviar-contrato-email";
const APP_URL      = "https://app.crescidinhosfoto.com.br";

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

// ── Helpers de estilo ─────────────────────────────────────────────
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

// ── Componente principal ──────────────────────────────────────────
export default function ContractPanel({ agendamento, onUpdate }) {
  const cl = agendamento?.clientes || {};
  const catKey = agendamento?.servico_id || "infantil";
  const cat = SERVICES.find(s => s.id === catKey);

  // Formulário
  const [form, setForm] = useState({
    cpf: agendamento?.cpf_mae || cl.cpf_mae || "",
    valor: agendamento?.valor || "",
    formaPagamento: agendamento?.forma_pagamento || "",
    autorizaImagem: true,
    obs: agendamento?.obs || "",
    extras: [],
    localEnsaio: "",
  });
  const [status, setStatus] = useState(
    agendamento?.signature ? "assinado" :
    agendamento?.contrato_html ? "enviado" : "idle"
  );
  const [numContrato, setNumContrato] = useState(agendamento?.contrato_numero || "");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Extras disponíveis para o serviço
  const extrasDisponiveis = cat?.extras || [];
  const descontoExtras = cat?.descontoExtras || false;

  function toggleExtra(e) {
    const prev = form.extras;
    const existe = prev.some(x => x.id === e.id);
    set("extras", existe ? prev.filter(x => x.id !== e.id) : [...prev, e]);
  }

  // Calcula desconto
  const totalExtras = form.extras.reduce((a, e) => a + (e.price || 0), 0);
  const baseVal = Number(form.valor) || 0;
  const sub = baseVal + totalExtras;
  const desconto = descontoExtras && form.extras.length > 0 ? Math.round(sub * 0.10) : 0;
  const valorFinal = sub - desconto;

  // Filhos e menor de idade
  const filhos = cl.filhos || [];
  const temMenor = filhos.length > 0 || !!cl.nome_crianca;
  const nomeCrianca = filhos[0]?.nome_crianca || cl.nome_crianca || "";
  const idadeCrianca = filhos[0]?.idade || cl.idade || "";

  async function gerarEEnviar() {
    setStatus("gerando");
    try {
      const numero = gerarNumeroContrato(catKey);
      setNumContrato(numero);

      const dadosContrato = {
        catKey,
        catLabel: cat?.label || agendamento?.servico || "",
        planoId: agendamento?.modalidade_id || "",
        planoLabel: agendamento?.modalidade || "",
        fotos: cat?.modalities?.find(m => m.id === agendamento?.modalidade_id)?.fotos,
        duracao: cat?.modalities?.find(m => m.id === agendamento?.modalidade_id)?.duracao,
        localExterno: catKey?.includes("externa") || catKey?.includes("externo"),
        localEnsaio: form.localEnsaio || (catKey?.includes("externa") || catKey?.includes("externo") ? "A confirmar" : "Crescidinhos Fotografia — Padre Anchieta 775, Bauru/SP"),
        valorTotal: valorFinal,
        valorMensal: catKey === "cofrinho" ? Number(form.valor) : null,
        desconto,
        formaPagamento: form.formaPagamento,
        extras: form.extras,
        descontoExtras: descontoExtras && form.extras.length > 0,
        autorizaUsoImagem: form.autorizaImagem,
        prazoEntrega: ["aniversario","batizado","quinze-anos"].includes(catKey) ? "10 dias corridos" : "20 dias úteis",
        // Cliente
        nomeCliente: cl.nome_mae || "",
        cpfCliente: form.cpf,
        emailCliente: cl.email || "",
        whatsappCliente: cl.telefone || "",
        // Menor
        temMenor,
        nomeCrianca,
        idadeCrianca,
        nomeResponsavel: cl.nome_mae || "",
        // Datas
        dataContrato: new Date().toISOString().split("T")[0],
        dataEnsaio: agendamento?.data || "",
        horaEnsaio: agendamento?.hora || "",
        // IDs
        numeroContrato: numero,
        agendamentoId: agendamento?.id || "",
      };

      const html = gerarContratoHTML(dadosContrato);
      const link = `${APP_URL}/contrato/${agendamento.id}`;

      // Salva no Supabase
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

      // WhatsApp para o cliente
      const msgWA = `Olá, ${cl.nome_mae?.split(" ")[0]}! 🎀\n\nSeu contrato da Crescidinhos Fotografia está pronto!\n\n📋 *${cat?.label || agendamento?.servico}*\n📅 ${agendamento?.data ? fmtData(agendamento.data) : ""}\n\nAcesse o link abaixo para ler e assinar digitalmente:\n${link}\n\n_Qualquer dúvida, é só chamar! 🐘_`;
      await enviarWhatsApp(cl.telefone, msgWA);

      // E-mail via n8n
      await enviarEmail({
        destinatario: cl.email,
        nome: cl.nome_mae,
        servico: cat?.label || agendamento?.servico,
        plano: agendamento?.modalidade,
        dataEnsaio: agendamento?.data,
        numeroContrato: numero,
        linkContrato: link,
        contratoHTML: html,
      });

      // Notifica Thais
      await enviarWhatsApp("14996845521",
        `📄 *Contrato gerado!*\n\nCliente: ${cl.nome_mae}\nServiço: ${cat?.label || agendamento?.servico}\nContrato: ${numero}\n\nLink enviado por WhatsApp e e-mail para a cliente.`
      );

      onUpdate?.({ status: "Contrato", contrato_numero: numero, valor: valorFinal });
      setStatus("enviado");
    } catch (err) {
      console.error(err);
      setStatus("erro");
    }
  }

  // ── Renders por estado ────────────────────────────────────────

  if (status === "assinado") return (
    <div style={{ background: "#e6f4ea", border: "1.5px solid #a5d6a7", borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 14, color: "#2e7d32", fontWeight: 600, margin: "0 0 6px" }}>✅ Contrato assinado!</p>
      <p style={{ fontSize: 12, color: "#555", margin: 0 }}>Assinado em {agendamento?.signed_at}</p>
      <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>Nº {agendamento?.contrato_numero}</p>
    </div>
  );

  if (status === "enviado") return (
    <div>
      <div style={{ background: "#e6f4ea", border: "1.5px solid #a5d6a7", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <p style={{ fontSize: 14, color: "#2e7d32", fontWeight: 600, margin: "0 0 4px" }}>✅ Contrato enviado!</p>
        <p style={{ fontSize: 12, color: "#555", margin: 0 }}>Nº {numContrato} · WhatsApp + e-mail enviados para {cl.nome_mae}</p>
      </div>
      <div style={{ background: "#faf8f5", border: "1.5px solid #e8e0d8", borderRadius: 10, padding: 12, fontSize: 12, color: "#888" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>Status</span><span style={{ fontWeight: 600, color: "#f57c00" }}>⏳ Aguardando assinatura do cliente</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Link do contrato</span>
          <a href={`${APP_URL}/contrato/${agendamento?.id}`} target="_blank" rel="noreferrer" style={{ color: "#72243E", fontWeight: 500 }}>Ver contrato →</a>
        </div>
      </div>
    </div>
  );

  if (status === "gerando") return (
    <div style={{ background: "#FFF3CD", border: "1px solid #FFE082", borderRadius: 10, padding: 14, textAlign: "center", fontSize: 13, color: "#856404" }}>
      ⏳ Gerando contrato e enviando para o cliente...
    </div>
  );

  if (status === "erro") return (
    <div>
      <div style={{ background: "#FFEBEE", border: "1px solid #EF9A9A", borderRadius: 10, padding: 14, fontSize: 13, color: "#B71C1C", marginBottom: 10 }}>
        ❌ Erro ao gerar. Verifique a conexão e tente novamente.
      </div>
      <button onClick={() => setStatus("idle")} style={btnStyle("#72243E")}>Tentar novamente</button>
    </div>
  );

  // idle — formulário de geração
  return (
    <div>
      <p style={{ fontSize: 11, color: "#b8967e", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 14px" }}>
        Gerar contrato
      </p>

      <Field label="CPF da cliente">
        <input style={inp} placeholder="000.000.000-00" value={form.cpf} onChange={e => set("cpf", e.target.value)} />
      </Field>

      <Field label="Valor total (R$)">
        <input style={inp} type="number" placeholder="0,00" value={form.valor} onChange={e => set("valor", e.target.value)} />
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
          <input style={inp} placeholder="Endereço ou nome do local" value={form.localEnsaio} onChange={e => set("localEnsaio", e.target.value)} />
        </Field>
      )}

      {/* Extras para eventos */}
      {extrasDisponiveis.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>
            Adicionais
            {descontoExtras && <span style={{ marginLeft: 6, fontSize: 10, background: "#EAF3DE", color: "#27500A", padding: "1px 7px", borderRadius: 20, fontWeight: 600 }}>10% OFF ao incluir</span>}
          </label>
          {extrasDisponiveis.map(e => {
            const sel = form.extras.some(x => x.id === e.id);
            return (
              <div key={e.id} onClick={() => toggleExtra(e)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 9, marginBottom: 5, cursor: "pointer", border: sel ? "2px solid #1a1a1a" : "1.5px solid #e8e0d8", background: sel ? "#1a1a1a" : "#fff" }}>
                <span style={{ fontSize: 13, color: sel ? "#fff" : "#1a1a1a" }}>{e.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: sel ? "#F4C0D1" : "#b8967e" }}>R$ {e.price?.toLocaleString("pt-BR")}</span>
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

      {/* Autorização de imagem */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Autorização de uso de imagem</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[["Autoriza", true], ["Não autoriza", false]].map(([txt, val]) => (
            <button key={txt} onClick={() => set("autorizaImagem", val)} style={{
              flex: 1, padding: "9px 0", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: form.autorizaImagem === val ? "2px solid #1a1a1a" : "1.5px solid #e8e0d8",
              background: form.autorizaImagem === val ? "#1a1a1a" : "#fff",
              color: form.autorizaImagem === val ? "#fff" : "#666",
            }}>{txt}</button>
          ))}
        </div>
      </div>

      <Field label="Observações (aparecem no contrato)">
        <textarea style={{ ...inp, resize: "vertical", marginBottom: 0 }} rows={2} value={form.obs} onChange={e => set("obs", e.target.value)} placeholder="Ex: pacote inclui cenário temático de Páscoa..." />
      </Field>

      <button
        onClick={gerarEEnviar}
        disabled={!form.cpf || !form.valor || !form.formaPagamento}
        style={btnStyle(!form.cpf || !form.valor || !form.formaPagamento ? "#ccc" : "#72243E")}
      >
        📄 Gerar e enviar contrato
      </button>
      <p style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 6 }}>
        Envia link por WhatsApp e e-mail para o cliente automaticamente
      </p>
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
