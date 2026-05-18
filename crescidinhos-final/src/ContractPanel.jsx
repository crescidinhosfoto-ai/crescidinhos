// =============================================================
// ContractPanel.jsx — Crescidinhos Fotografia
// v3: links separados cliente/fotografia + status de assinaturas
// =============================================================

import { useState, useEffect } from "react";
importar { gerarContratoHTML, gerarNumeroContrato, fmtData } de "./ContractGenerator";
import { SERVICES } from "./config";

const SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co";
const SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3";
const EVOLUTION_URL = "https://ribbitingboar-evolution.cloudfy.live/message/sendText/crescidinhos";
const EVOLUTION_KEY = "gNnhqK2sv964EPigBYm1WJkBc91gu1t4";
const N8N_EMAIL = "https://ribbitingboar-n8n.cloudfy.live/webhook/enviar-contrato-email";
const APP_URL = "https://app.crescidinhosfoto.com.br";

const sb = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cabeçalhos: {
      apikey: SUPABASE_KEY,
      Autorização: `Portador ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Preferência: "retorno=representação",
      ...opções.cabeçalhos,
    },
    ...opções,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  retornar texto ? JSON.parse(texto) : nulo;
};

função assíncrona enviarWhatsApp(número, mensagem) {
  const tel = numero.replace(/\D/g, "");
  se (!tel || tel.length < 10) retorne;
  aguardar fetch(EVOLUTION_URL, {
    método: "POST",
    cabeçalhos: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
    corpo: JSON.stringify({ número: `55${tel}`, texto: mensagem }),
  }).catch(() => {});
}

função assíncrona enviarEmail(dados) {
  aguardar fetch(N8N_EMAIL, {
    método: "POST",
    cabeçalhos: { "Content-Type": "application/json" },
    corpo: JSON.stringify(dados),
  }).catch(() => {});
}

// ── Estilos ─────────────────────────── ────────────────────────────
const inp = {
  largura: "100%", preenchimento: "10px 12px", raio da borda: 8,
  borda: "1,5px sólida #e0d8d0", tamanho da fonte: 13, tamanho da caixa: "caixa de borda",
  contorno: "nenhum", fundo: "#fff", família_da_fonte: "inherit", cor: "#1a1a1a",
  margemInferior: 12,
};
const lbl = { fontSize: 12, color: "#555", fontWeight: 600, display: "block", marginBottom: 5 };

função Campo({ rótulo, filhos }) {
  retornar (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{labellabel>
      {crianças}
    </div>
  );
}

função btnStyle(bg) {
  retornar {
    largura: "100%", preenchimento: 13, raio da borda: 10,
    fundo: bg, cor: bg === "#ccc" ? "#999" : "#fff",
    borda: "nenhuma", tamanho da fonte: 14, peso da fonte: 600,
    cursor: bg === "#ccc" ? "não permitido" : "ponteiro",
    fontFamily: "inherit", marginTop: 4,
  };
}

// ── Componente de status de assinatura ────────────────────────────
função SigStatus({ label, assinado, data }) {
  retornar (
    <div style={{
      exibir: "flexível", justificarConteúdo: "espaço-entre", alinharItens: "centro",
      preenchimento: "8px 0", bordaInferior: "1px sólida #f0e8e0", tamanhoDaFonte: 12,
    }}>
      <span style={{ color: "#888" }}>{label}</span>
      {assinado}
        ? <span style={{ color: "#2e7d32", fontWeight: 600 }}>✅ Assinado{data ? ` em ${data}` : ""}</span>
        : <span style={{ color: "#f57c00", fontWeight: 600 }}>⏳ Pendente</span>
      }
    </div>
  );
}

// ── Componente principal ───────────────────── ─────────────────────
export default function ContractPanel({ agendamento, onUpdate }) {
  const cl = agendamento?.clientes || {};
  const catKey = agendamento?.servico_id || "infantil";
  const cat = SERVICES.find(s => s.id === catKey);

  // Estado do Jesus
  const [form, setForm] = useState({
    cpf: agendamento?.cpf_mae || cl.cpf_mae || "",
    valor: agendamento?.valor || "",
    formaPagamento: agendamento?.forma_pagamento || "",
    autorizaImagem: verdadeiro,
    obs: agendamento?.obs || "",
    extras: [],
    localEnsaio: "",
  });

  // Estado do painel
  const [status, setStatus] = useState(() => {
    if (agendamento?.assinatura && agendamento?.assinatura_contratada) return "assinado_ambos";
    if (agendamento?.assinatura) return "enviado"; // cliente já assinado
    if (agendamento?.contrato_html) return "enviado";
    retornar "ocioso";
  });

  const [numContrato, setNumContrato] = useState(agendamento?.contrato_numero || "");

  // Status de assinaturas — recarga do Supabase ao abrir
  const [sigStatus, setSigStatus] = useState({
    cliente: !!agendamento?.assinatura,
    contratada: !!agendamento?.signature_contratada,
    responsavel: !!agendamento?.signature_responsavel,
    assinado_em: agendamento?.assinado_em || "",
  });

  useEffect(() => {
    if (agendamento?.contrato_html) {
      recarregarSigStatus();
    }
  }, [agendamento?.id]);

  função assíncrona recarregarSigStatus() {
    tentar {
      const r = await sb(
        `agendamentos?id=eq.${agendamento.id}&select=signature,signature_contratada,signature_responsavel,signed_at`
      );
      se (r && r[0]) {
        const a = r[0];
        setSigStatus({
          cliente: !!a.assinatura,
          contratada: !!a.signature_contratada,
          responsavel: !!a.signature_responsavel,
          assinado_em: a.assinado_em || "",
        });
        se (a.assinatura && a.assinatura_contratada) {
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
  const extrasDisponiveis = gato?.extras || [];
  const descontoExtras = cat?.descontoExtras || falso;
  função toggleExtra(e) {
    const prev = form.extras;
    const existe = prev.some(x => x.id === e.id);
    set("extras", existe ? prev.filter(x => x.id !== e.id) : [...prev, e]);
  }

  // Cálculo
  const totalExtras = form.extras.reduce((a, e) => a + (e.price || 0), 0);
  const baseVal = Number(form.valor) || 0;
  const sub = baseVal + totalExtras;
  const desconto = descontoExtras && form.extras.length > 0 ? Math.round(sub * 0,10): 0;
  const valorFinal = sub - desconto;

  // Menor
  const filhos = cl.filhos || [];
  const temMenor = filhos.comprimento > 0 || !!cl.nome_crianca;
  const nomeCrianca = filhos[0]?.nome_crianca || cl.nome_crianca || "";
  const idadeCriança = filhos[0]?.idade || cl.idade || "";

  // Links do contrato
  const linkCliente = `${APP_URL}/contrato/${agendamento?.id}`;
  const linkFotografa = `${APP_URL}/contrato/${agendamento?.id}?p=fotografa`;

  // ── Gerar e enviar ─────────────────────── ───────────────────────
  função assíncrona gerarEEnviar() {
    setStatus("gerando");
    tentar {
      const numero = gerarNumeroContrato(catKey);
      setNumContrato(numero);

      const dadosContrato = {
        catKey,
        catLabel: gato?.label || agendamento?.serviço || "",
        planoId: agendamento?.modalidade_id || "",
        planoLabel: agendamento?.modalidade || "",
        fotos: cat?.modalidades?.find(m => m.id === agendamento?.modalidade_id)?.fotos,
        duracao: cat?.modalidades?.find(m => m.id === agendamento?.modalidade_id)?.duracao,
        localExterno: catKey?.includes("externa") || catKey?.includes("externo"),
        localEnsaio: form.localEnsaio ||
          (catKey?.includes("externa") || catKey?.includes("externo")
            ? "A confirmar"
            : "Crescidinhos Fotografia — Padre Anchieta 775, Bauru/SP"),
        valorTotal: valorFinal,
        valorMensal: catKey === "cofrinho" ? Número(form.valor): nulo,
        desconto,
        formaPagamento: form.formaPagamento,
        extras: formulário.extras,
        descontoExtras: descontoExtras && form.extras.length > 0,
        autorizaUsoImagem: form.autorizaImagem,
        prazoEntrega: ["aniversario","batizado","quinze-anos"].includes(catKey)
          ? "10 dias corridos" : "20 dias úteis",
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

      const html = gerarContratoHTML(dadosContrato);

      // 1. Salva no Supabase
      await sb(`agendamentos?id=eq.${agendamento.id}`, {
        método: "PATCH",
        corpo: JSON.stringify({
          cpf_mae: form.cpf,
          valor: valorFinal,
          forma_pagamento: form.formaPagamento,
          obs: formulário.obs,
          contrato_html: html,
          contrato_numero: numero,
          contrato_gerado_em: new Date().toISOString(),
          status: "Contrato",
        }),
      });

      // 2. WhatsApp para o cliente
      const primeiroNome = cl.nome_mae?.split(" ")[0] || “cliente”;
      aguardar enviarWhatsApp(
        cl.telefone,
        `Olá, ${primeiroNome}! 🎀\n\nSeu contrato da Crescidinhos Fotografia está pronto!\n\n📋 *${cat?.label || agendamento?.servico}*\n📅 ${agendamento?.data ? fmtData(agendamento.data) : ""}\n\nAcesse o link abaixo para ler e transferir digitalmente:\n${linkCliente}\n\n_Qualquer dúvida, é só chamar! 🐘_`
      );

      // 3. E-mail via n8n
      aguardar enviarEmail({
        destinatário: cl.email,
        nome: cl.nome_mae,
        serviço: gato?.label || agendamento?.serviço,
        plano: agendamento?.modalidade,
        dataEnsaio: agendamento?.data,
        numeroContrato: numero,
        linkContrato: linkCliente,
        contratoHTML: html,
      });

      // 4. Notifica Thais com link para concorrer
      aguardar enviarWhatsApp(
        "14996845521",
        `📄 *Contrato gerado!*\n\nCliente: ${cl.nome_mae}\nServiço: ${cat?.label || agendamento?.servico}\nContrato: ${numero}\n\nLink enviado ao cliente.\n\n✍️ *Seu link para discutir:*\n${linkFotografa}`
      );

      onUpdate?.({ status: "Contrato", contrato_numero: numero, valor: valorFinal });
      setStatus("enviado");
      setSigStatus({cliente: falso, contratada: falso, responsavel: falso, assinado_at: "" });
    } catch (erro) {
      console.error(err);
      setStatus("erro");
    }
  }

  // ── Render: ambos concordaram ─────────────────────────────────────
  if (status === "assinado_ambos") return (
    <div style={{ background: "#e6f4ea", border: "1.5px solid #a5d6a7", borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 14, color: "#2e7d32", fontWeight: 600, margin: "0 0 6px" }}>✅ Contrato celebrado por ambas as partes!</p>
      <p style={{ fontSize: 12, color: "#555", margin: "0 0 4px" }}>Assinado em {sigStatus.signed_at || agendamento?.signed_at}</p>
      <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Nº {numContrato || agendamento?.contrato_numero}</p>
      <a
        href={linkCliente}
        alvo="_blank"
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
        <SigStatus label="Cliente" assinado={sigStatus.cliente} data={sigStatus.signed_at} />
        {temMenor && (
          <SigStatus label="Responsável legal" assinado={sigStatus.responsavel} date={sigStatus.signed_at} />
        )}
        <SigStatus label="Contratada (você)" assinado={sigStatus.contratada} date={sigStatus.signed_at} />
        <botão
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
            <p style={{ fontSize: 12, fontWeight: 600, color: "#7b1fa2", margin: 0 }}>📷 Seu link para alternar</p>
            <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0 0" }}>Use este para revisar como fotografia</p>
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

  // ── Renderização: gerando ────────────────────── ───────────────────────
  if (status === "gerando") return (
    <div style={{ background: "#FFF3CD", border: "1px solid #FFE082", borderRadius: 10, padding: 14, textAlign: "center", fontSize: 13, color: "#856404" }}>
      ⏳ Gerando contrato e enviando para o cliente...
    </div>
  );

  // ── Renderização: erro ──────────────────────── ────────────────────────
  if (status === "erro") retornar (
    <div>
      <div style={{ background: "#FFEBEE", border: "1px solid #EF9A9A", borderRadius: 10, padding: 14, fontSize: 13, color: "#B71C1C", marginBottom: 10 }}>
        ❌ Erro ao gerar contrato. Verifique a conexão e tente novamente.
      </div>
      <button onClick={() => setStatus("idle")} style={btnStyle("#72243E")}>Tentando novamente</button>
    </div>
  );

  // ── Render: inativo — formulário de geração ────────────────────────
  retornar (
    <div>
      <p style={{ fontSize: 11, color: "#b8967e", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 14px" }}>
        Gerar
      </p>

      <Etiqueta do campo="CPF do cliente">
        <entrada
          estilo={inp}
          espaço reservado="000.000.000-00"
          valor={form.cpf}
          onChange={e => set("cpf", e.target.value)}
        />
      </Campo>

      <Field label="Valor total (R$)">
        <entrada
          estilo={inp}
          tipo="número"
          placeholder="0,00"
          valor={form.valor}
          onChange={e => set("valor", e.target.value)}
        />
      </Campo>

      <Field label="Forma de pagamento">
        <select style={inp} value={form.formaPagamento} onChange={e => set("formaPagamento", e.target.value)}>
          <option value="">Selecione...</option>
          <option>Pix — à vista</option>
          <option>Cartão de crédito — à vista</option>
          <option>Cartão de crédito — 2x</option>
          <option>Cartão de crédito — 3x</option>
          <option>50% entrada + 50% no dia do ensaio</option>
          <option>Entrada + parcelas (a combinação)</option>
        </select>
      </Campo>

      {(catKey?.includes("externa") || catKey?.includes("externo")) && (
        <Field label="Local do ensaio externo">
          <entrada
            estilo={inp}
            placeholder="Endereço ou nome do local"
            valor={form.localEnsaio}
            onChange={e => set("localEnsaio", e.target.value)}
          />
        </Campo>
      )}

      {/* Extras para eventos */}
      {extrasDisponiveis.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>
            sítio
            {descontoExtras && (
              <span style={{ marginLeft: 6, fontSize: 10, background: "#EAF3DE", color: "#27500A", padding: "1px 7px", borderRadius: 20, fontWeight: 600 }}>
                10% de desconto ao incluir
              </span>
            )}
          </label>
          {extrasDisponiveis.map(e => {
            const sel = form.extras.some(x => x.id === e.id);
            retornar (
              <div
                chave={e.id}
                onClick={() => toggleExtra(e)}
                estilo={{
                  exibir: "flex", alinharItens: "centro", justificarConteúdo: "espaço-entre",
                  preenchimento: "9px 12px", raio da borda: 9, margem inferior: 5, cursor: "ponteiro",
                  borda: sel ? "2px sólida #1a1a1a" : "1,5px sólida #e8e0d8",
                  fundo: sel ? "#1a1a1a" : "#fff",
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

      {/* Autorização de imagem */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Autorização de uso de imagem</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[["Autoriza", true], ["Não autorizada", false]].map(([txt, val]) => (
            <botão
              chave={txt}
              onClick={() => set("autorizaImagem", val)}
              estilo={{
                flex: 1, padding: "9px 0", borderRadius: 9, cursor: "pointer",
                Tamanho da fonte: 12, Peso da fonte: 600,
                borda: form.autorizaImagem === val ? "2px solid #1a1a1a" : "1.5px solid #e8e0d8",
                background: form.autorizaImagem === val ? "#1a1a1a" : "#fff",
                cor: form.autorizaImagem === val ? "#fff" : "#666",
              }}
            >
              {TXT}
            </button>
          ))}
        </div>
      </div>

      <Field label="Observações (aparecem no contrato)">
        <textarea
          style={{ ...inp, resize: "vertical", marginBottom: 0 }}
          linhas={2}
          valor={form.obs}
          onChange={e => set("obs", e.target.value)}
          placeholder="Ex: pacote inclui cenário temático de Páscoa..."
        />
      </Campo>

      <botão
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
