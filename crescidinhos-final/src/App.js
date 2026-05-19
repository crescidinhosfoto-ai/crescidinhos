import { useState, useRef, useCallback, useEffect } from "react";
import {
  PHOTOGRAPHER, SERVICES, TIMES, WEBHOOK_URL, SUPABASE_URL, SUPABASE_KEY,
  EVOLUTION_URL, EVOLUTION_KEY, EVOLUTION_INSTANCE, fmtPreco, COFRINHO_PLANOS
} from "./config";
import { fetchHorariosDisponiveis } from "./googleCalendar";
import ContractPanel from "./ContractPanel";
import ContractPage from "./ContractPage";
import DisponibilidadePanel from "./DisponibilidadePanel";

// ─── ROTA CONTRATO ───────────────────────────────────────────────
if (typeof window !== "undefined" && window.location.pathname.startsWith("/contrato/")) {
  // renderizado em main.jsx com <ContractPage />
}

// ─── SUPABASE ────────────────────────────────────────────────────
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

const getClienteByEmail    = (email) => sb(`clientes?email=eq.${encodeURIComponent(email)}&limit=1`);
const getClienteByTelefone = (tel)   => sb(`clientes?telefone=eq.${encodeURIComponent(tel)}&limit=1`);
const criarCliente         = (data)  => sb("clientes", { method: "POST", body: JSON.stringify(data) });
const atualizarCliente     = (id, d) => sb(`clientes?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(d) });
const criarAgendamento     = (data)  => sb("agendamentos", { method: "POST", body: JSON.stringify(data) });
const getAgendamentos      = ()      => sb("agendamentos?select=*,clientes(*)&order=data.asc,hora.asc");
const getClientes          = ()      => sb("clientes?select=*,agendamentos(*)&order=created_at.desc");
const getAgendamentosByCliente = (cid) => sb(`agendamentos?cliente_id=eq.${cid}&order=data.desc`);
const atualizarAgendamento = (id, d) => sb(`agendamentos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(d) });
const deletarAgendamento   = (id)    => sb(`agendamentos?id=eq.${id}`, { method: "DELETE" });
const deletarCliente       = (id)    => sb(`clientes?id=eq.${id}`, { method: "DELETE" });
const deletarAgendamentosCliente = (cid) => sb(`agendamentos?cliente_id=eq.${cid}`, { method: "DELETE" });
const getDisponibilidades  = ()      => sb("disponibilidades?select=data,horarios&order=data.asc");

const diasDesde = (d) => d ? Math.floor((Date.now() - new Date(d)) / 86400000) : null;
const fmtData   = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "-";
const fmtDataHora = (d) => d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

// ─── CORES / ESTILOS ─────────────────────────────────────────────
const C = {
  bg: "#faf8f5", card: "#fff", border: "#e8e0d8",
  primary: "#b8967e", primaryDark: "#9a7a64", text: "#3d2b1f",
  muted: "#a09080", light: "#f5f0eb", green: "#6a8f6a",
  red: "#c0392b", yellow: "#e6a817", blue: "#5b8fa8",
};
const btn = (bg = C.primary, extra = {}) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 10,
  padding: "10px 18px", fontSize: 14, fontWeight: 600,
  cursor: "pointer", transition: "opacity .2s", ...extra,
});
const input = {
  width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14,
  border: `1.5px solid ${C.border}`, background: "#fff", color: C.text,
  outline: "none", boxSizing: "border-box",
};
const label = { display: "block", fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 };
const card  = { background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 };

// ─── STATUS BADGE ────────────────────────────────────────────────
const STATUS_COLORS = {
  "Pendente": "#e6a817", "Confirmado": "#6a8f6a", "Contrato": "#5b8fa8",
  "Concluído": "#9a7a64", "Cancelado": "#c0392b",
};
const Badge = ({ status }) => (
  <span style={{
    background: STATUS_COLORS[status] || "#bbb", color: "#fff",
    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
  }}>{status || "Pendente"}</span>
);

// ─── MÁSCARA TELEFONE ────────────────────────────────────────────
const maskTel = (v) => {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 7) return `(${n.slice(0,2)}) ${n.slice(2)}`;
  if (n.length <= 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
  return v;
};

// ─── MÁSCARA CPF ─────────────────────────────────────────────────
const maskCpf = (v) => {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`;
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // Rota contrato
  if (window.location.pathname.startsWith("/contrato/")) return <ContractPage />;

  const [tela, setTela]       = useState("home"); // home | agendamento | painel | minha-area
  const [crmAba, setCrmAba]   = useState("agendamentos"); // agendamentos | clientes | agenda | disponibilidade

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Georgia', serif", color: C.text }}>
      {tela === "home"        && <Home onAgendar={() => setTela("agendamento")} onPainel={() => setTela("painel")} onMinha={() => setTela("minha-area")} />}
      {tela === "agendamento" && <Agendamento onVoltar={() => setTela("home")} />}
      {tela === "painel"      && <Painel onVoltar={() => setTela("home")} />}
      {tela === "minha-area"  && <MinhaArea onVoltar={() => setTela("home")} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════
function Home({ onAgendar, onPainel, onMinha }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📸</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.primary, margin: "0 0 8px" }}>
          Crescidinhos Fotografia
        </h1>
        <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>
          Registrando momentos que crescem com você
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={onAgendar} style={btn(C.primary, { padding: "16px", fontSize: 16, borderRadius: 14 })}>
          📅 Agendar Ensaio
        </button>
        <button onClick={onMinha} style={btn(C.blue, { padding: "14px", fontSize: 15, borderRadius: 14 })}>
          👤 Minha Área
        </button>
        <button onClick={onPainel} style={{ ...btn("#888", { padding: "10px", fontSize: 13, borderRadius: 10 }) }}>
          🔐 Painel Fotógrafa
        </button>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: C.muted }}>
        {PHOTOGRAPHER.cidade} · {PHOTOGRAPHER.phone}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AGENDAMENTO (4 passos)
// ═══════════════════════════════════════════════════════════════
function Agendamento({ onVoltar }) {
  const [passo, setPasso]               = useState(1);
  const [clienteInfo, setClienteInfo]   = useState(null);
  const [servicoInfo, setServicoInfo]   = useState(null);
  const [dataHora, setDataHora]         = useState(null);
  const [loading, setLoading]           = useState(false);
  const [sucesso, setSucesso]           = useState(false);

  if (sucesso) return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2 style={{ color: C.primary }}>Agendamento confirmado!</h2>
      <p style={{ color: C.muted }}>Em breve você receberá uma mensagem no WhatsApp com os detalhes.</p>
      <button onClick={onVoltar} style={btn(C.primary, { marginTop: 24 })}>Voltar ao início</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={passo === 1 ? onVoltar : () => setPasso(p => p - 1)}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>←</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: C.primary }}>
            {["", "Quem é você?", "Escolha o serviço", "Data e horário", "Confirmar"][passo]}
          </h2>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= passo ? C.primary : C.border,
                transition: "background .3s",
              }} />
            ))}
          </div>
        </div>
      </div>

      {passo === 1 && <PassoCadastro onNext={(info) => { setClienteInfo(info); setPasso(2); }} />}
      {passo === 2 && <PassoServico  onNext={(info) => { setServicoInfo(info); setPasso(3); }} />}
      {passo === 3 && <PassoData     onNext={(info) => { setDataHora(info); setPasso(4); }} servicoInfo={servicoInfo} />}
      {passo === 4 && (
        <PassoConfirmar
          clienteInfo={clienteInfo}
          servicoInfo={servicoInfo}
          dataHora={dataHora}
          loading={loading}
          onVoltar={() => setPasso(3)}
          onConfirmar={async () => {
            setLoading(true);
            try {
              // Busca ou cria cliente
              let cliente = null;
              const existentes = await getClienteByEmail(clienteInfo.email);
              if (existentes?.length) {
                cliente = existentes[0];
                await atualizarCliente(cliente.id, {
                  nome_mae: clienteInfo.nome,
                  telefone: clienteInfo.telefone,
                });
              } else {
                const criados = await criarCliente({
                  nome_mae: clienteInfo.nome,
                  email: clienteInfo.email,
                  telefone: clienteInfo.telefone,
                  cpf_mae: clienteInfo.cpf || null,
                  rg: clienteInfo.rg || null,
                  data_nascimento: clienteInfo.dataNasc || null,
                  endereco: clienteInfo.endereco || null,
                  filhos: clienteInfo.filho ? [{ nome: clienteInfo.filho, nascimento: clienteInfo.filhoNasc, atipico: clienteInfo.atipico }] : [],
                  anamnese: clienteInfo.anamnese || null,
                  atipico: clienteInfo.atipico || false,
                });
                cliente = criados?.[0];
              }

              // Cria agendamento
              const agData = {
                cliente_id: cliente.id,
                cpf_mae: clienteInfo.cpf || null,
                servico: servicoInfo.servico.nome,
                servico_id: servicoInfo.servico.id,
                modalidade: servicoInfo.modalidade?.nome || null,
                modalidade_id: servicoInfo.modalidade?.id || null,
                data: dataHora.data,
                hora: dataHora.hora,
                valor: servicoInfo.total || servicoInfo.modalidade?.preco || null,
                obs: servicoInfo.obs || null,
                status: "Pendente",
                dados_evento: servicoInfo.dadosEvento || null,
              };
              const [ag] = await criarAgendamento(agData);

              // Webhook n8n
              await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  agendamento_id: ag.id,
                  nomeMae: clienteInfo.nome,
                  email: clienteInfo.email,
                  telefone: clienteInfo.telefone,
                  servico: servicoInfo.servico.nome,
                  modalidade: servicoInfo.modalidade?.nome || "",
                  data: dataHora.data,
                  hora: dataHora.hora,
                  valor: agData.valor,
                  nomeCrianca: clienteInfo.filho || "",
                  atipico: clienteInfo.atipico || false,
                }),
              });

              setSucesso(true);
            } catch (e) {
              alert("Erro ao agendar: " + e.message);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Passo 1: Cadastro ───────────────────────────────────────────
function PassoCadastro({ onNext }) {
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", cpf: "", rg: "", dataNasc: "", filho: "", filhoNasc: "", atipico: false });
  const [temFilho, setTemFilho] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [clienteExistente, setClienteExistente] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const buscarCliente = async (email) => {
    if (!email.includes("@")) return;
    const res = await getClienteByEmail(email);
    if (res?.length) {
      const c = res[0];
      setClienteExistente(c);
      setForm(f => ({ ...f, nome: c.nome_mae || "", telefone: c.telefone || "", cpf: c.cpf_mae || "" }));
    } else {
      setClienteExistente(null);
    }
  };

  const avancar = async () => {
    if (!form.nome || !form.email || !form.telefone) return alert("Preencha nome, e-mail e telefone.");
    if (temFilho === null) return alert("Informe se tem filho.");
    setLoading(true);
    try {
      onNext({ ...form, temFilho });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {clienteExistente && (
        <div style={{ background: "#e8f5e9", border: "1.5px solid #6a8f6a", borderRadius: 10, padding: 12, fontSize: 13, color: "#2e7d32" }}>
          ✅ Olá de volta, {clienteExistente.nome_mae?.split(" ")[0]}! Seus dados foram preenchidos.
        </div>
      )}

      <div>
        <label style={label}>E-mail *</label>
        <input style={input} type="email" value={form.email}
          onChange={e => set("email", e.target.value)}
          onBlur={e => buscarCliente(e.target.value)}
          placeholder="seu@email.com" />
      </div>
      <div>
        <label style={label}>Nome completo *</label>
        <input style={input} value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Seu nome" />
      </div>
      <div>
        <label style={label}>WhatsApp *</label>
        <input style={input} value={form.telefone}
          onChange={e => set("telefone", maskTel(e.target.value))}
          placeholder="(14) 99999-9999" inputMode="numeric" />
      </div>
      <div>
        <label style={label}>CPF</label>
        <input style={input} value={form.cpf}
          onChange={e => set("cpf", maskCpf(e.target.value))}
          placeholder="000.000.000-00" inputMode="numeric" />
      </div>

      {!clienteExistente && (
        <>
          <div>
            <label style={label}>RG</label>
            <input style={input} value={form.rg} onChange={e => set("rg", e.target.value)} placeholder="00.000.000-0" />
          </div>
          <div>
            <label style={label}>Data de nascimento</label>
            <input style={input} type="date" value={form.dataNasc} onChange={e => set("dataNasc", e.target.value)} />
          </div>
        </>
      )}

      <div>
        <label style={label}>Tem filho(a)? *</label>
        <div style={{ display: "flex", gap: 8 }}>
          {["Sim", "Não"].map(op => (
            <button key={op} onClick={() => setTemFilho(op === "Sim")}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: `1.5px solid ${temFilho === (op === "Sim") ? C.primary : C.border}`,
                background: temFilho === (op === "Sim") ? C.light : "#fff", cursor: "pointer", fontSize: 14 }}>
              {op}
            </button>
          ))}
        </div>
      </div>

      {temFilho && (
        <>
          <div>
            <label style={label}>Nome do filho(a)</label>
            <input style={input} value={form.filho} onChange={e => set("filho", e.target.value)} placeholder="Nome da criança" />
          </div>
          <div>
            <label style={label}>Data de nascimento do filho(a)</label>
            <input style={input} type="date" value={form.filhoNasc} onChange={e => set("filhoNasc", e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="atipico" checked={form.atipico} onChange={e => set("atipico", e.target.checked)} />
            <label htmlFor="atipico" style={{ fontSize: 13, cursor: "pointer" }}>Criança atípica (necessidades especiais)</label>
          </div>
        </>
      )}

      <button onClick={avancar} disabled={loading} style={btn(C.primary, { marginTop: 8 })}>
        {loading ? "Aguarde..." : "Continuar →"}
      </button>
    </div>
  );
}

// ─── Passo 2: Serviço ─────────────────────────────────────────────
function PassoServico({ onNext }) {
  const [servico, setServico]     = useState(null);
  const [modalidade, setModalidade] = useState(null);
  const [extras, setExtras]       = useState([]);
  const [dadosEvento, setDadosEvento] = useState({});
  const [obs, setObs]             = useState("");

  const toggleExtra = (ex) => {
    setExtras(prev =>
      prev.find(e => e.id === ex.id)
        ? prev.filter(e => e.id !== ex.id)
        : [...prev, ex]
    );
  };

  const total = modalidade
    ? modalidade.preco + extras.reduce((s, e) => s + e.preco, 0)
    : 0;

  const avancar = () => {
    if (!servico) return alert("Selecione um serviço.");
    if (servico.modalidades.length > 0 && !modalidade) return alert("Selecione uma opção.");
    if (servico.dadosEvento) {
      if (!dadosEvento.nomeAniversariante) return alert("Informe o nome do aniversariante.");
      if (!dadosEvento.localEvento) return alert("Informe o local do evento.");
    }
    onNext({ servico, modalidade, extras, dadosEvento: servico.dadosEvento ? dadosEvento : null, obs, total });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Serviços */}
      <div>
        <label style={label}>Tipo de serviço *</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SERVICES.map(s => (
            <button key={s.id} onClick={() => { setServico(s); setModalidade(null); setExtras([]); }}
              style={{
                padding: "12px 8px", borderRadius: 10, border: `1.5px solid ${servico?.id === s.id ? C.primary : C.border}`,
                background: servico?.id === s.id ? C.light : "#fff", cursor: "pointer", textAlign: "left",
              }}>
              <div style={{ fontSize: 20 }}>{s.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 4 }}>{s.nome}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{s.descricao}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Modalidades */}
      {servico && servico.modalidades.length > 0 && (
        <div>
          <label style={label}>Opção *</label>
          {servico.modalidades.map(m => (
            <button key={m.id} onClick={() => setModalidade(m)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${modalidade?.id === m.id ? C.primary : C.border}`,
                background: modalidade?.id === m.id ? C.light : "#fff", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
              }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.nome}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{m.entrega} · {m.duracao}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>{fmtPreco(m.preco)}</div>
            </button>
          ))}
        </div>
      )}

      {/* Extras */}
      {servico && servico.extras.length > 0 && (
        <div>
          <label style={label}>Adicionais (opcional)</label>
          {servico.extras.map(ex => {
            const sel = extras.find(e => e.id === ex.id);
            return (
              <button key={ex.id} onClick={() => toggleExtra(ex)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${sel ? C.primary : C.border}`,
                  background: sel ? C.light : "#fff", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
                }}>
                <div style={{ fontSize: 13 }}>{sel ? "✅ " : "○ "}{ex.nome}</div>
                <div style={{ fontSize: 13, color: C.primary }}>+ {fmtPreco(ex.preco)}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Dados do evento */}
      {servico?.dadosEvento && (
        <div style={{ background: C.light, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ ...label, marginBottom: 0 }}>Dados do evento</label>
          <div>
            <label style={label}>Nome do aniversariante *</label>
            <input style={input} value={dadosEvento.nomeAniversariante || ""}
              onChange={e => setDadosEvento(d => ({ ...d, nomeAniversariante: e.target.value }))} placeholder="Nome" />
          </div>
          <div>
            <label style={label}>Local do evento *</label>
            <input style={input} value={dadosEvento.localEvento || ""}
              onChange={e => setDadosEvento(d => ({ ...d, localEvento: e.target.value }))} placeholder="Salão, chácara, etc." />
          </div>
          <div>
            <label style={label}>Endereço do evento</label>
            <input style={input} value={dadosEvento.enderecoEvento || ""}
              onChange={e => setDadosEvento(d => ({ ...d, enderecoEvento: e.target.value }))} placeholder="Rua, número, bairro" />
          </div>
        </div>
      )}

      {/* Total */}
      {modalidade && (
        <div style={{ background: C.light, borderRadius: 10, padding: 12, textAlign: "center" }}>
          <span style={{ fontSize: 13, color: C.muted }}>Total estimado: </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.primary }}>{fmtPreco(total)}</span>
          {extras.length > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>10% desconto aplicado em pacotes</div>}
        </div>
      )}

      <div>
        <label style={label}>Observações (opcional)</label>
        <textarea style={{ ...input, height: 70, resize: "vertical" }} value={obs}
          onChange={e => setObs(e.target.value)} placeholder="Algo que devo saber..." />
      </div>

      <button onClick={avancar} style={btn(C.primary)}>Continuar →</button>
    </div>
  );
}

// ─── Passo 3: Data ────────────────────────────────────────────────
function PassoData({ onNext, servicoInfo }) {
  const hoje = new Date();
  const [mes, setMes]           = useState(hoje.getMonth());
  const [ano, setAno]           = useState(hoje.getFullYear());
  const [dataSel, setDataSel]   = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [horaSel, setHoraSel]   = useState(null);
  const [loadingH, setLoadingH] = useState(false);
  const [diasLiberados, setDiasLiberados] = useState([]); // datas com disponibilidade

  // Busca disponibilidades do mês
  useEffect(() => {
    const buscar = async () => {
      try {
        const disp = await getDisponibilidades();
        if (disp) {
          const datas = disp.map(d => d.data);
          setDiasLiberados(datas);
        }
      } catch {}
    };
    buscar();
  }, [mes, ano]);

  const selData = async (data) => {
    setDataSel(data);
    setHoraSel(null);
    setLoadingH(true);
    setHorarios([]);

    // Tenta Google Calendar via n8n
    let slots = await fetchHorariosDisponiveis(data);

    // Fallback: Supabase disponibilidades
    if (!slots || slots.length === 0) {
      try {
        const res = await sb(`disponibilidades?data=eq.${data}&select=horarios&limit=1`);
        if (res?.length) slots = res[0].horarios || [];
      } catch {}
    }

    setHorarios(slots || []);
    setLoadingH(false);
  };

  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const nomeMes = new Date(ano, mes).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => { if (mes === 0) { setMes(11); setAno(a => a-1); } else setMes(m => m-1); }}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>{nomeMes}</span>
          <button onClick={() => { if (mes === 11) { setMes(0); setAno(a => a+1); } else setMes(m => m+1); }}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
            <div key={d} style={{ fontSize: 10, color: C.muted, padding: "4px 0", fontWeight: 600 }}>{d}</div>
          ))}
          {Array(primeiroDia).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(diasNoMes).fill(null).map((_, i) => {
            const d = i + 1;
            const dataStr = `${ano}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const passado = new Date(dataStr) < new Date(hoje.toISOString().split("T")[0]);
            const liberado = diasLiberados.includes(dataStr);
            const sel = dataSel === dataStr;
            const domingo = new Date(dataStr).getDay() === 0;
            const disponivel = !passado && !domingo && liberado;

            return (
              <button key={d} onClick={() => disponivel && selData(dataStr)}
                disabled={!disponivel}
                style={{
                  padding: "6px 2px", borderRadius: 8, border: "none", fontSize: 13,
                  background: sel ? C.primary : disponivel ? "#e8f5e8" : "transparent",
                  color: sel ? "#fff" : disponivel ? C.green : passado || domingo ? "#ccc" : C.muted,
                  cursor: disponivel ? "pointer" : "default",
                  fontWeight: sel ? 700 : 400,
                }}>
                {d}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: C.muted, textAlign: "center", margin: "8px 0 0" }}>
          Datas verdes = disponíveis
        </p>
      </div>

      {dataSel && (
        <div>
          <label style={label}>Horário disponível *</label>
          {loadingH ? (
            <p style={{ color: C.muted, fontSize: 13 }}>Verificando horários...</p>
          ) : horarios.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13 }}>Nenhum horário disponível nesta data.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {horarios.map(h => (
                <button key={h} onClick={() => setHoraSel(h)}
                  style={{
                    padding: "10px 8px", borderRadius: 8,
                    border: `1.5px solid ${horaSel === h ? C.primary : C.border}`,
                    background: horaSel === h ? C.light : "#fff",
                    cursor: "pointer", fontSize: 14, fontWeight: horaSel === h ? 700 : 400,
                  }}>
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => { if (!dataSel) return alert("Selecione uma data."); if (!horaSel) return alert("Selecione um horário."); onNext({ data: dataSel, hora: horaSel }); }}
        style={btn(C.primary)}
        disabled={!dataSel || !horaSel}>
        Continuar →
      </button>
    </div>
  );
}

// ─── Passo 4: Confirmar ───────────────────────────────────────────
function PassoConfirmar({ clienteInfo, servicoInfo, dataHora, loading, onVoltar, onConfirmar }) {
  const linhas = [
    ["👤 Cliente",    clienteInfo.nome],
    ["📧 E-mail",     clienteInfo.email],
    ["📱 WhatsApp",   clienteInfo.telefone],
    ["📸 Serviço",    servicoInfo.servico.nome],
    ["🎯 Opção",      servicoInfo.modalidade?.nome || "-"],
    ["📅 Data",       fmtData(dataHora.data)],
    ["🕐 Horário",    dataHora.hora],
    ["💰 Valor est.", fmtPreco(servicoInfo.total)],
  ];

  return (
    <div>
      <div style={card}>
        {linhas.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
            <span style={{ color: C.muted }}>{k}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 16 }}>
        Ao confirmar, você concorda com as políticas de cancelamento (48h de antecedência).
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onVoltar} style={btn("#aaa", { flex: 1 })}>← Voltar</button>
        <button onClick={onConfirmar} disabled={loading} style={btn(C.green, { flex: 2 })}>
          {loading ? "Agendando..." : "✅ Confirmar agendamento"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAINEL FOTÓGRAFA (CRM)
// ═══════════════════════════════════════════════════════════════
function Painel({ onVoltar }) {
  const [autenticado, setAutenticado] = useState(false);
  const [senha, setSenha]             = useState("");
  const [aba, setAba]                 = useState("agendamentos");

  if (!autenticado) return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h2 style={{ color: C.primary, textAlign: "center" }}>🔐 Painel Fotógrafa</h2>
      <input style={input} type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)}
        onKeyDown={e => e.key === "Enter" && (senha === "crescidinhos2024" ? setAutenticado(true) : alert("Senha incorreta"))} />
      <button onClick={() => senha === "crescidinhos2024" ? setAutenticado(true) : alert("Senha incorreta")}
        style={btn(C.primary, { width: "100%", marginTop: 12 })}>Entrar</button>
      <button onClick={onVoltar} style={{ ...btn("#aaa", { width: "100%", marginTop: 8 }) }}>← Voltar</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.primary }}>📸 Painel Crescidinhos</h2>
        <button onClick={onVoltar} style={btn("#aaa", { padding: "6px 12px", fontSize: 12 })}>Sair</button>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
        {[
          { id: "agendamentos", label: "📅 Agendamentos" },
          { id: "clientes",     label: "👥 Clientes" },
          { id: "disponibilidade", label: "🗓 Disponibilidade" },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ ...btn(aba === a.id ? C.primary : "#ddd", { color: aba === a.id ? "#fff" : C.text, whiteSpace: "nowrap" }) }}>
            {a.label}
          </button>
        ))}
      </div>

      {aba === "agendamentos"    && <CRMAgendamentos />}
      {aba === "clientes"        && <CRMClientes />}
      {aba === "disponibilidade" && <DisponibilidadePanel />}
    </div>
  );
}

// ─── CRM: Agendamentos ───────────────────────────────────────────
function CRMAgendamentos() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [sel, setSel]                   = useState(null);
  const [filtro, setFiltro]             = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try { setAgendamentos(await getAgendamentos() || []); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const update = async (id, patch) => {
    await atualizarAgendamento(id, patch);
    await carregar();
    setSel(s => s ? { ...s, ...patch } : s);
  };

  const deletar = async (id) => {
    if (!window.confirm("Deletar agendamento?")) return;
    await deletarAgendamento(id);
    setSel(null);
    await carregar();
  };

  const lista = agendamentos.filter(a => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (a.clientes?.nome_mae || "").toLowerCase().includes(q) ||
      (a.servico || "").toLowerCase().includes(q) ||
      (a.status || "").toLowerCase().includes(q);
  });

  if (sel) return (
    <DetalheAgendamento
      ag={sel}
      onVoltar={() => setSel(null)}
      onUpdate={(patch) => update(sel.id, patch)}
      onDeletar={() => deletar(sel.id)}
    />
  );

  return (
    <div>
      <input style={{ ...input, marginBottom: 12 }} placeholder="🔍 Buscar por nome, serviço ou status..."
        value={filtro} onChange={e => setFiltro(e.target.value)} />

      {loading ? <p style={{ color: C.muted }}>Carregando...</p> : lista.length === 0 ? (
        <p style={{ color: C.muted }}>Nenhum agendamento encontrado.</p>
      ) : lista.map(a => (
        <div key={a.id} onClick={() => setSel(a)}
          style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{a.clientes?.nome_mae || "Cliente"}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{a.servico} · {a.modalidade || ""}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{fmtData(a.data)} às {a.hora}</div>
          </div>
          <Badge status={a.status} />
        </div>
      ))}
    </div>
  );
}

// ─── Detalhe do Agendamento ───────────────────────────────────────
function DetalheAgendamento({ ag, onVoltar, onUpdate, onDeletar }) {
  const [status, setStatus]   = useState(ag.status || "Pendente");
  const [pagSt, setPagSt]     = useState(ag.pagamento_status || "");
  const [obs, setObs]         = useState(ag.obs || "");
  const [saving, setSaving]   = useState(false);

  const salvar = async () => {
    setSaving(true);
    await onUpdate({ status, pagamento_status: pagSt, obs });
    setSaving(false);
    alert("Salvo!");
  };

  const cliente = ag.clientes || {};
  const dadosEvento = ag.dados_evento;

  return (
    <div>
      <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, marginBottom: 12 }}>
        ← Voltar
      </button>

      {/* Dados do cliente */}
      <div style={card}>
        <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Cliente</p>
        {[
          ["Nome", cliente.nome_mae],
          ["E-mail", cliente.email],
          ["WhatsApp", cliente.telefone],
          ["CPF", cliente.cpf_mae],
        ].map(([k, v]) => v ? (
          <div key={k} style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: C.muted, minWidth: 70 }}>{k}:</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ) : null)}
      </div>

      {/* Dados do agendamento */}
      <div style={card}>
        <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Agendamento</p>
        {[
          ["Serviço", ag.servico],
          ["Opção", ag.modalidade],
          ["Data", fmtData(ag.data)],
          ["Horário", ag.hora],
          ["Valor", fmtPreco(ag.valor)],
        ].map(([k, v]) => v ? (
          <div key={k} style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: C.muted, minWidth: 70 }}>{k}:</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ) : null)}
      </div>

      {/* Dados do evento */}
      {dadosEvento && (
        <div style={card}>
          <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Dados do Evento</p>
          {Object.entries(dadosEvento).map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: C.muted, minWidth: 120 }}>{k}:</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Contrato */}
      <div style={card}>
        <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Contrato</p>
        <ContractPanel agendamento={ag} onUpdate={onUpdate} />
      </div>

      {/* Status e ações */}
      <div style={card}>
        <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Status</p>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Status do agendamento</label>
          <select style={{ ...input }} value={status} onChange={e => setStatus(e.target.value)}>
            {["Pendente","Confirmado","Contrato","Concluído","Cancelado"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Status do pagamento</label>
          <select style={{ ...input }} value={pagSt} onChange={e => setPagSt(e.target.value)}>
            {["","Pendente","Sinal pago","Pago","Reembolsado"].map(s => (
              <option key={s} value={s}>{s || "—"}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Observações internas</label>
          <textarea style={{ ...input, height: 60 }} value={obs} onChange={e => setObs(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={salvar} disabled={saving} style={btn(C.green, { flex: 2 })}>
            {saving ? "Salvando..." : "💾 Salvar"}
          </button>
          <button onClick={onDeletar} style={btn(C.red, { flex: 1 })}>🗑 Deletar</button>
        </div>
      </div>
    </div>
  );
}

// ─── CRM: Clientes ────────────────────────────────────────────────
function CRMClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sel, setSel]           = useState(null);
  const [filtro, setFiltro]     = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try { setClientes(await getClientes() || []); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const deletar = async (c) => {
    if (!window.confirm(`Deletar ${c.nome_mae} e todos os agendamentos?`)) return;
    await deletarAgendamentosCliente(c.id);
    await deletarCliente(c.id);
    setSel(null);
    await carregar();
  };

  const lista = clientes.filter(c => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (c.nome_mae || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.telefone || "").includes(q);
  });

  if (sel) return (
    <DetalheCliente
      cliente={sel}
      onVoltar={() => setSel(null)}
      onDeletar={() => deletar(sel)}
      onUpdate={async (patch) => { await atualizarCliente(sel.id, patch); await carregar(); setSel(s => ({ ...s, ...patch })); }}
    />
  );

  return (
    <div>
      <input style={{ ...input, marginBottom: 12 }} placeholder="🔍 Buscar cliente..."
        value={filtro} onChange={e => setFiltro(e.target.value)} />

      {loading ? <p style={{ color: C.muted }}>Carregando...</p> : lista.length === 0 ? (
        <p style={{ color: C.muted }}>Nenhum cliente encontrado.</p>
      ) : lista.map(c => (
        <div key={c.id} onClick={() => setSel(c)}
          style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{c.nome_mae}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{c.email}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{c.telefone}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: C.muted }}>
            {c.agendamentos?.length || 0} agendamentos
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Detalhe Cliente ──────────────────────────────────────────────
function DetalheCliente({ cliente, onVoltar, onDeletar, onUpdate }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm]         = useState({
    nome_mae: cliente.nome_mae || "",
    email: cliente.email || "",
    telefone: cliente.telefone || "",
    cpf_mae: cliente.cpf_mae || "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const salvar = async () => {
    await onUpdate(form);
    setEditando(false);
    alert("Dados atualizados!");
  };

  const agendamentos = cliente.agendamentos || [];

  return (
    <div>
      <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, marginBottom: 12 }}>
        ← Voltar
      </button>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>Dados pessoais</p>
          <button onClick={() => setEditando(e => !e)} style={btn(C.blue, { padding: "4px 10px", fontSize: 12 })}>
            {editando ? "Cancelar" : "✏️ Editar"}
          </button>
        </div>

        {editando ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["Nome", "nome_mae"], ["E-mail", "email"], ["Telefone", "telefone"], ["CPF", "cpf_mae"]].map(([lb, k]) => (
              <div key={k}>
                <label style={label}>{lb}</label>
                <input style={input} value={form[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
            <button onClick={salvar} style={btn(C.green)}>💾 Salvar</button>
          </div>
        ) : (
          [["Nome", cliente.nome_mae], ["E-mail", cliente.email], ["Telefone", cliente.telefone], ["CPF", cliente.cpf_mae]].map(([k, v]) => v ? (
            <div key={k} style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: C.muted, minWidth: 80 }}>{k}:</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ) : null)
        )}
      </div>

      {/* Histórico de agendamentos */}
      <div style={card}>
        <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>
          Histórico ({agendamentos.length})
        </p>
        {agendamentos.length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted }}>Sem agendamentos.</p>
        ) : agendamentos.map(a => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{a.servico}</div>
              <div style={{ color: C.muted }}>{fmtData(a.data)} · {a.hora}</div>
            </div>
            <Badge status={a.status} />
          </div>
        ))}
      </div>

      <button onClick={onDeletar} style={btn(C.red, { width: "100%" })}>🗑 Deletar cliente</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MINHA ÁREA (cliente)
// ═══════════════════════════════════════════════════════════════
function MinhaArea({ onVoltar }) {
  const [email, setEmail]     = useState("");
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aba, setAba]         = useState("ensaios");
  const [agendamentos, setAgendamentos] = useState([]);

  const entrar = async () => {
    if (!email.includes("@")) return alert("E-mail inválido.");
    setLoading(true);
    try {
      const res = await getClienteByEmail(email);
      if (!res?.length) { alert("E-mail não encontrado. Faça um agendamento primeiro."); setLoading(false); return; }
      const c = res[0];
      setCliente(c);
      const ags = await getAgendamentosByCliente(c.id);
      setAgendamentos(ags || []);
    } catch (e) { alert("Erro: " + e.message); }
    setLoading(false);
  };

  if (!cliente) return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: 24 }}>
      <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, marginBottom: 16 }}>← Voltar</button>
      <h2 style={{ color: C.primary, marginBottom: 24 }}>👤 Minha Área</h2>
      <label style={label}>Seu e-mail</label>
      <input style={input} type="email" value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === "Enter" && entrar()} placeholder="seu@email.com" />
      <button onClick={entrar} disabled={loading} style={btn(C.primary, { width: "100%", marginTop: 12 })}>
        {loading ? "Buscando..." : "Entrar"}
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.primary, fontSize: 18 }}>Olá, {cliente.nome_mae?.split(" ")[0]}! 🌸</h2>
        <button onClick={() => { setCliente(null); setEmail(""); }} style={btn("#aaa", { padding: "6px 12px", fontSize: 12 })}>Sair</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
        {[["ensaios","📷 Ensaios"],["contratos","📄 Contratos"],["perfil","⚙️ Perfil"]].map(([id, lb]) => (
          <button key={id} onClick={() => setAba(id)}
            style={{ ...btn(aba === id ? C.primary : "#ddd", { color: aba === id ? "#fff" : C.text, whiteSpace: "nowrap", fontSize: 13 }) }}>
            {lb}
          </button>
        ))}
      </div>

      {aba === "ensaios" && (
        <div>
          {agendamentos.length === 0 ? (
            <p style={{ color: C.muted }}>Nenhum agendamento encontrado.</p>
          ) : agendamentos.map(a => (
            <div key={a.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 700 }}>{a.servico}</span>
                <Badge status={a.status} />
              </div>
              <div style={{ fontSize: 13, color: C.muted }}>
                {fmtData(a.data)} às {a.hora}
                {a.modalidade && <> · {a.modalidade}</>}
                {a.valor && <> · {fmtPreco(a.valor)}</>}
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === "contratos" && (
        <div>
          {agendamentos.filter(a => a.contrato_numero || a.signature).length === 0 ? (
            <p style={{ color: C.muted }}>Nenhum contrato encontrado.</p>
          ) : agendamentos.filter(a => a.contrato_numero || a.signature).map(a => (
            <div key={a.id} style={card}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.servico} — {fmtData(a.data)}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                Contrato {a.contrato_numero || "—"} · {a.signature ? "✅ Assinado" : "⏳ Pendente"}
              </div>
              {!a.signature && a.contrato_numero && (
                <a href={`/contrato/${a.id}`}
                  style={{ ...btn(C.primary, { display: "inline-block", textDecoration: "none", fontSize: 13, padding: "8px 14px" }) }}>
                  📝 Ver e assinar
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {aba === "perfil" && (
        <PerfilCliente cliente={cliente} onUpdate={async (patch) => {
          await atualizarCliente(cliente.id, patch);
          setCliente(c => ({ ...c, ...patch }));
          alert("Perfil atualizado!");
        }} />
      )}
    </div>
  );
}

// ─── Perfil do cliente ────────────────────────────────────────────
function PerfilCliente({ cliente, onUpdate }) {
  const [form, setForm] = useState({
    nome_mae: cliente.nome_mae || "",
    telefone: cliente.telefone || "",
    cpf_mae: cliente.cpf_mae || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const salvar = async () => {
    setSaving(true);
    await onUpdate(form);
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={label}>Nome</label>
        <input style={input} value={form.nome_mae} onChange={e => set("nome_mae", e.target.value)} />
      </div>
      <div>
        <label style={label}>WhatsApp</label>
        <input style={input} value={form.telefone} onChange={e => set("telefone", maskTel(e.target.value))} />
      </div>
      <div>
        <label style={label}>CPF</label>
        <input style={input} value={form.cpf_mae} onChange={e => set("cpf_mae", maskCpf(e.target.value))} />
      </div>
      <div>
        <label style={label}>E-mail</label>
        <input style={{ ...input, background: "#f5f0eb" }} value={cliente.email} disabled />
      </div>
      <button onClick={salvar} disabled={saving} style={btn(C.green)}>
        {saving ? "Salvando..." : "💾 Atualizar perfil"}
      </button>
    </div>
  );
}
