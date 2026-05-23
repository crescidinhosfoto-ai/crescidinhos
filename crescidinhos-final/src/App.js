import { useState, useRef, useCallback, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { PHOTOGRAPHER, SERVICES, TIMES, WEBHOOK_URL, WEBHOOK_CONFIRMAR, REGRAS, fmtPreco, calcularTotal } from "./config";
import { fetchHorariosDisponiveis, fetchDatasDisponiveis } from "./googleCalendar";
import ContractPanel from "./ContractPanel";
import ContractPage from "./ContractPage";
import DisponibilidadePanel from "./DisponibilidadePanel";
import GaleriaPanel from "./GaleriaPanel";
import GaleriaCliente from "./GaleriaCliente";

// ─── SUPABASE ────────────────────────────────────────────────────
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

const getClienteByTelefone = (tel) => sb(`clientes?telefone=eq.${encodeURIComponent(tel)}&limit=1`);
const getClienteByEmail    = (email) => sb(`clientes?email=eq.${encodeURIComponent(email)}&limit=1`);
const criarCliente         = (data) => sb("clientes", { method: "POST", body: JSON.stringify(data) });
const atualizarCliente     = (id, data) => sb(`clientes?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) });
const criarAgendamento     = (data) => sb("agendamentos", { method: "POST", body: JSON.stringify(data) });
const getAgendamentos      = () => sb("agendamentos?select=*,clientes(*)&order=data.asc,hora.asc");
const getClientes          = () => sb("clientes?select=*,agendamentos(*)&order=created_at.desc");
const getAgendamentosByCliente = (cid) => sb(`agendamentos?cliente_id=eq.${cid}&order=data.desc`);
const atualizarAgendamento = (id, data) => sb(`agendamentos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) });
const deletarCliente       = (id) => sb(`clientes?id=eq.${id}`, { method: "DELETE" });
const deletarAgendamentosCliente = (cid) => sb(`agendamentos?cliente_id=eq.${cid}`, { method: "DELETE" });
const deletarAgendamento = (id) => sb(`agendamentos?id=eq.${id}`, { method: "DELETE" });
// Vale Presente
const gerarCodigoVale=()=>{const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return 'C'+Array.from({length:5},()=>c[Math.floor(Math.random()*c.length)]).join('');};
const buscarValeByCode=(code)=>sb(`agendamentos?obs=ilike.*${encodeURIComponent(code)}*&status=eq.Ativo&select=*,clientes(nome_mae)&limit=1`);
const marcarValeUsado=(id)=>sb(`agendamentos?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({status:'Utilizado'})});
const MP_TOKEN='APP_USR-6587879092760162-052100-b495626cba5c1d859c2be43374d0fa23-3417831486';
const criarLinkMercadoPago=async(titulo,valor,referencia)=>{
  try{
    const r=await fetch('https://api.mercadopago.com/checkout/preferences',{
      method:'POST',
      headers:{'Authorization':`Bearer ${MP_TOKEN}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        items:[{title:titulo,quantity:1,unit_price:Number(valor),currency_id:'BRL'}],
        external_reference:referencia,
        back_urls:{
          success:'https://app.crescidinhosfoto.com.br',
          failure:'https://app.crescidinhosfoto.com.br',
          pending:'https://app.crescidinhosfoto.com.br'
        }
      })
    });
    const d=await r.json();
    return d.init_point||null;
  }catch(e){console.error('MP:',e);return null;}
};
const diasDesde = (d) => d ? Math.floor((new Date() - new Date(d)) / 86400000) : 9999;

// ─── SERVIÇOS QUE REQUEREM DADOS DE EVENTO/EXTERNO ───────────────
const SERVICOS_EVENTO   = ["aniversario","batizado","quinze-anos"];
const SERVICOS_EXTERNOS = ["gestante-externa","adulto-externo","familia-externa"];
const requerDadosEvento = (serviceId) => SERVICOS_EVENTO.includes(serviceId) || SERVICOS_EXTERNOS.includes(serviceId);

// ─── EVOLUTION API WhatsApp ───────────────────────────────────────
const EVOLUTION_URL = "https://ribbitingboar-evolution.cloudfy.live/message/sendText/crescidinhos";
const EVOLUTION_KEY = "gNnhqK2sv964EPigBYm1WJkBc91gu1t4";
const enviarWhatsApp = async (numero, mensagem) => {
  const tel = numero.replace(/\D/g,"");
  if(!tel||tel.length<10) return;
  try {
    await fetch(EVOLUTION_URL, {
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":EVOLUTION_KEY},
      body:JSON.stringify({number:`55${tel}`,text:mensagem})
    });
  } catch(e){ console.error("WA error:",e); }
};

// ─── HELPERS ─────────────────────────────────────────────────────
const MONTHS   = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const pad = n => String(n).padStart(2,"0");
const formatDate    = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const formatDateBR  = iso => { if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const mesAno        = iso => { if(!iso) return "—"; const [y,m]=iso.split("-"); return `${MONTHS[parseInt(m)-1]}/${y}`; };
const getDaysInMonth = (y,m) => new Date(y,m+1,0).getDate();
const getFirstDay    = (y,m) => new Date(y,m,1).getDay();

// ─── SHARED STYLES ────────────────────────────────────────────────
const inp = { width:"100%", padding:"11px 13px", borderRadius:8, border:"1.5px solid #e0d8d0", fontSize:13, boxSizing:"border-box", outline:"none", background:"#fff", fontFamily:"inherit", color:"#1a1a1a" };
const lbl = { fontSize:12, color:"#555", fontWeight:600, display:"block", marginBottom:5 };
const sec = { fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:"#b8967e", fontWeight:700, margin:"20px 0 10px", borderBottom:"1px solid #f0e8e0", paddingBottom:5 };

function Field({ label, required, children }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={lbl}>{label}{required&&<span style={{color:"#b8967e"}}> *</span>}</label>
      {children}
    </div>
  );
}
function Radio({ options, value, onChange }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
      {options.map(o=>(
        <label key={o} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",fontSize:13,color:"#333",lineHeight:1.5}}>
          <div onClick={()=>onChange(o)} style={{width:18,height:18,borderRadius:"50%",border:"2px solid "+(value===o?"#1a1a1a":"#ccc"),background:value===o?"#1a1a1a":"#fff",flexShrink:0,cursor:"pointer",marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {value===o&&<div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>}
          </div>
          {o}
        </label>
      ))}
    </div>
  );
}
function Check({ options, values=[], onChange }) {
  const toggle = o => onChange(values.includes(o)?values.filter(x=>x!==o):[...values,o]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
      {options.map(o=>(
        <label key={o} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13,color:"#333"}}>
          <div onClick={()=>toggle(o)} style={{width:18,height:18,borderRadius:4,border:"2px solid "+(values.includes(o)?"#1a1a1a":"#ccc"),background:values.includes(o)?"#1a1a1a":"#fff",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {values.includes(o)&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span>}
          </div>
          {o}
        </label>
      ))}
    </div>
  );
}

// ─── FORMULÁRIO DE DADOS DO EVENTO/EXTERNO ───────────────────────
function DadosEventoForm({ serviceId, data, onChange }) {
  const set = (k,v) => onChange({...data,[k]:v});
  const isEvento = SERVICOS_EVENTO.includes(serviceId);
  return (
    <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:"16px 14px",marginBottom:16}}>
      <p style={{...sec,marginTop:0}}>📍 Dados do {isEvento?"evento":"local externo"}</p>
      {isEvento && (
        <>
          <Field label="Nome do aniversariante" required>
            <input style={inp} value={data.nome_aniversariante||""} onChange={e=>set("nome_aniversariante",e.target.value)} placeholder="Nome completo"/>
          </Field>
          <Field label="Idade do aniversariante">
            <input style={inp} value={data.idade_aniversariante||""} onChange={e=>set("idade_aniversariante",e.target.value)} placeholder="Ex: 5 anos"/>
          </Field>
          <Field label="Número aproximado de convidados">
            <input style={inp} type="number" value={data.num_convidados||""} onChange={e=>set("num_convidados",e.target.value)} placeholder="Ex: 80"/>
          </Field>
        </>
      )}
      <Field label="Nome/tipo do local" required>
        <input style={inp} value={data.local_nome||""} onChange={e=>set("local_nome",e.target.value)} placeholder={isEvento?"Ex: Buffet Sonho de Festa":"Ex: Parque Vitória Régia"}/>
      </Field>
      <Field label="Rua e número">
        <input style={inp} value={data.local_rua||""} onChange={e=>set("local_rua",e.target.value)} placeholder="Rua, número"/>
      </Field>
      <Field label="Complemento">
        <input style={inp} value={data.local_complemento||""} onChange={e=>set("local_complemento",e.target.value)} placeholder="Sala, andar..."/>
      </Field>
      <Field label="Bairro">
        <input style={inp} value={data.local_bairro||""} onChange={e=>set("local_bairro",e.target.value)} placeholder="Bairro"/>
      </Field>
      <Field label="Cidade">
        <input style={inp} value={data.local_cidade||"Bauru"} onChange={e=>set("local_cidade",e.target.value)} placeholder="Bauru"/>
      </Field>
    </div>
  );
}

// ─── CALENDAR (lê disponibilidades do Supabase) ──────────────────
function Calendar({ selectedDate, onSelectDate, onHorariosChange, onDatasChange, duracaoMin = 60 }) {
  const today = new Date();
  const [vy,setVy] = useState(today.getFullYear());
  const [vm,setVm] = useState(today.getMonth());
  const [diasLiberados,setDiasLiberados] = useState([]);
  const [carregandoMes,setCarregandoMes] = useState(false);
  const [refreshKey,setRefreshKey] = useState(0);
  useEffect(()=>{
    const buscar = async () => {
      setCarregandoMes(true);
      const datas = await fetchDatasDisponiveis(vy, vm+1);
      setDiasLiberados(datas||[]);
      if(onDatasChange) onDatasChange(datas||[]);
      setCarregandoMes(false);
    };
    buscar();
  },[vy,vm,refreshKey]);
  const days = new Date(vy,vm+1,0).getDate();
  const firstDay = new Date(vy,vm,1).getDay();
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=days;d++) cells.push(d);
  const handleSelect = async (ds) => {
    onSelectDate(ds);
    if(onHorariosChange) {
      const slots = await fetchHorariosDisponiveis(ds, duracaoMin);
      onHorariosChange(slots||[]);
    }
  };
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button onClick={()=>vm===0?(setVm(11),setVy(y=>y-1)):setVm(m=>m-1)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#1a1a1a",padding:"4px 10px"}}>‹</button>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:600}}>{MONTHS[vm]} {vy}</span>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <button onClick={()=>setRefreshKey(k=>k+1)} title="Atualizar disponibilidade" style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:"#aaa",padding:"4px 6px"}}>{carregandoMes?"⏳":"🔄"}</button>
          <button onClick={()=>vm===11?(setVm(0),setVy(y=>y+1)):setVm(m=>m+1)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#1a1a1a",padding:"4px 10px"}}>›</button>
        </div>
      </div>
      {carregandoMes&&<p style={{textAlign:"center",fontSize:12,color:"#bbb",padding:"8px 0"}}>Verificando disponibilidade...</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {WEEKDAYS.map(w=><div key={w} style={{textAlign:"center",fontSize:10,color:"#aaa",fontWeight:600,padding:"3px 0"}}>{w}</div>)}
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const ds=`${vy}-${String(vm+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const isPast=new Date(ds)<new Date(today.toDateString());
          const isLiberado=diasLiberados.includes(ds);
          const isSel=selectedDate===ds;
          const disponivel=!isPast&&isLiberado;
          return <div key={i} onClick={()=>disponivel&&handleSelect(ds)} style={{textAlign:"center",padding:"7px 0",borderRadius:8,fontSize:13,fontWeight:isSel?700:400,background:isSel?"#1a1a1a":disponivel?"#e8f5e8":"transparent",color:isSel?"#fff":disponivel?"#2e7d32":isPast?"#ccc":"#1a1a1a",cursor:disponivel?"pointer":"default"}}>{d}</div>;
        })}
      </div>
      <p style={{fontSize:11,color:"#aaa",textAlign:"center",margin:"6px 0 0"}}>Datas verdes = horários disponíveis</p>
    </div>
  );
}

// ─── STEP BAR ────────────────────────────────────────────────────
function StepBar({ step, steps }) {
  return (
    <div style={{display:"flex",alignItems:"center",marginBottom:26}}>
      {steps.map((l,i)=>(
        <div key={l} style={{display:"contents"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1}}>
            <div style={{width:28,height:28,borderRadius:"50%",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",background:step>i+1?"#b8967e":step===i+1?"#1a1a1a":"#e8e0d8",color:step>=i+1?"#fff":"#aaa"}}>
              {step>i+1?"✓":i+1}
            </div>
            <span style={{fontSize:9,color:step===i+1?"#1a1a1a":"#aaa",fontWeight:step===i+1?700:400,textAlign:"center"}}>{l}</span>
          </div>
          {i<steps.length-1&&<div style={{flex:1,height:1,background:step>i+1?"#b8967e":"#e8e0d8",margin:"0 2px",marginBottom:18}}/>}
        </div>
      ))}
    </div>
  );
}

// ─── ANAMNESE ────────────────────────────────────────────────────
const ECA = `Em conformidade com o ECA Digital (Lei nº 15.211/2025) e a LGPD: (1) As imagens do menor serão utilizadas apenas para as finalidades autorizadas, zelando pela dignidade da criança. (2) Fica vedada a publicação de fotos que exponham rotina ou localização escolar. (3) Você pode solicitar a remoção de qualquer imagem em até 24 horas.`;

const ANAMNESE_LABELS = {
  transtorno:"Transtorno",tempo_transtorno:"Tempo desde diagnóstico",fazTerapia:"Faz terapia",
  desc_terapias:"Terapias",medicamentos:"Medicamentos",estereotipias:"Estereotipias",
  prevenir_crises:"Como prevenir crises",contornar:"Como contornar momentos difíceis",
  incomoda:"O que incomoda",incomoda_outro:"Incomoda (outro)",gosta:"Do que gosta",
  brinquedos:"Brinquedos favoritos",brinquedos_outro:"Brinquedo (outro)",
  social_atip:"Interação social",comunicacao:"Como se comunica",comunicacao_outro:"Comunicação (outro)",
  tempo_amb_atip:"Adaptação ao ambiente",ensaio_atip:"Já fez ensaio",
  desc_ensaio_atip:"Como foi o ensaio",outros_eventos:"Outros eventos com fotógrafo",
  extra_atip:"Informações extras",eca_atip:"Concordou com ECA",
  postar_transtorno:"Autoriza postar sobre transtorno",esquecer_mundo:"O que faz esquecer o mundo",
  personagem:"Personagem / música favorita",mania_roupa:"Mania com roupas",
  barulhos:"Como lida com barulhos",reacao_querer:"Reação quando quer algo",
  toque:"Gosta de toque",tempo_amb_tip:"Adaptação ao ambiente",
  ensaio_tip:"Já fez ensaio",desc_ensaio_tip:"Como foi o ensaio",
  extra_tip:"Informações extras",eca_tip:"Concordou com ECA",
};

function AnamneseForm({ data, onChange, titulo }) {
  const set = (k,v) => onChange({...data,[k]:v});
  const atipico = data.atipico;
  return (
    <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:"16px 14px",marginBottom:12}}>
      {titulo && <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:"#b8967e",margin:"0 0 12px"}}>{titulo}</p>}
      <Field label="Nome da criança" required><input style={inp} value={data.nome_crianca||""} onChange={e=>set("nome_crianca",e.target.value)} placeholder="Nome da criança"/></Field>
      <Field label="Idade" required><input style={inp} value={data.idade||""} onChange={e=>set("idade",e.target.value)} placeholder="Ex: 2 anos e 3 meses"/></Field>
      <Field label="Seu filho é atípico? (TEA, TDAH, Síndrome de Down...)" required>
        <Radio options={["Sim","Não"]} value={data.atipico} onChange={v=>set("atipico",v)}/>
      </Field>
      {atipico==="Sim"&&(
        <div style={{background:"#fdf9f6",border:"1.5px solid #f0ddd0",borderRadius:10,padding:"14px 12px",marginTop:4}}>
          <p style={{...sec,marginTop:0}}>🧡 Crianças atípicas</p>
          <Field label="Qual transtorno?" required><input style={inp} value={data.transtorno||""} onChange={e=>set("transtorno",e.target.value)} placeholder="Ex: TEA nível 1, TDAH..."/></Field>
          <Field label="Há quanto tempo descobriu?"><Radio options={["Menos de 6 meses","Menos de 1 ano","Mais de 1 ano","Mais de 2 anos"]} value={data.tempo_transtorno} onChange={v=>set("tempo_transtorno",v)}/></Field>
          <Field label="Faz terapias?"><Radio options={["Sim","Não"]} value={data.fazTerapia} onChange={v=>set("fazTerapia",v)}/></Field>
          {data.fazTerapia==="Sim"&&<Field label="Quais terapias e há quanto tempo?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.desc_terapias||""} onChange={e=>set("desc_terapias",e.target.value)} placeholder="Ex: ABA há 1 ano..."/></Field>}
          <Field label="Medicamentos ou métodos alternativos"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.medicamentos||""} onChange={e=>set("medicamentos",e.target.value)}/></Field>
          <Field label="Possui estereotipias? Descreva."><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.estereotipias||""} onChange={e=>set("estereotipias",e.target.value)}/></Field>
          <Field label="Como podemos prevenir crises?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.prevenir_crises||""} onChange={e=>set("prevenir_crises",e.target.value)}/></Field>
          <Field label="Como contornar momentos difíceis?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.contornar||""} onChange={e=>set("contornar",e.target.value)}/></Field>
          <Field label="O que incomoda a criança?">
            <Check options={["Luzes fortes / Flashes","Barulhos altos / Música","Toque físico / Texturas","Cheiros fortes"]} values={data.incomoda||[]} onChange={v=>set("incomoda",v)}/>
            <input style={{...inp,marginTop:8}} value={data.incomoda_outro||""} onChange={e=>set("incomoda_outro",e.target.value)} placeholder="Outro..."/>
          </Field>
          <Field label="Do que gosta muito?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.gosta||""} onChange={e=>set("gosta",e.target.value)} placeholder="Personagens, músicas — usamos para criar conexão!"/></Field>
          <Field label="Brinquedos favoritos?">
            <Check options={["Fidget Spinner","Squishies/Slime","Bolas texturizadas"]} values={data.brinquedos||[]} onChange={v=>set("brinquedos",v)}/>
            <input style={{...inp,marginTop:8}} value={data.brinquedos_outro||""} onChange={e=>set("brinquedos_outro",e.target.value)} placeholder="Outro..."/>
          </Field>
          <Field label="Interação social"><Radio options={["Tranquilo, se relaciona com todos.","Não gosta de se socializar."]} value={data.social_atip} onChange={v=>set("social_atip",v)}/></Field>
          <Field label="Como se comunica?">
            <Radio options={["Fala verbalmente","Aponta/Gestos","Comunicação alternativa (cartões/tablet)","Não verbal"]} value={data.comunicacao} onChange={v=>set("comunicacao",v)}/>
            <input style={{...inp,marginTop:8}} value={data.comunicacao_outro||""} onChange={e=>set("comunicacao_outro",e.target.value)} placeholder="Outro..."/>
          </Field>
          <Field label="Precisa de tempo para se acostumar?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.tempo_amb_atip||""} onChange={e=>set("tempo_amb_atip",e.target.value)}/></Field>
          <Field label="Já fez ensaios?"><Radio options={["Sim","Não"]} value={data.ensaio_atip} onChange={v=>set("ensaio_atip",v)}/></Field>
          {data.ensaio_atip==="Sim"&&<Field label="Como foi?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.desc_ensaio_atip||""} onChange={e=>set("desc_ensaio_atip",e.target.value)}/></Field>}
          <Field label="Outros eventos com fotógrafo?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.outros_eventos||""} onChange={e=>set("outros_eventos",e.target.value)}/></Field>
          <Field label="Mais alguma informação importante?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.extra_atip||""} onChange={e=>set("extra_atip",e.target.value)}/></Field>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:10,padding:14,marginTop:10}}>
            <p style={{fontSize:12,fontWeight:700,color:"#1a1a1a",margin:"0 0 8px"}}>🔒 ECA Digital e LGPD</p>
            <p style={{fontSize:11,color:"#666",lineHeight:1.6,margin:"0 0 12px"}}>{ECA}</p>
            <Field label="Concorda com o ECA Digital?" required><Radio options={["Sim","Não"]} value={data.eca_atip} onChange={v=>set("eca_atip",v)}/></Field>
            {data.eca_atip==="Sim"&&<Field label="Podemos postar sobre o transtorno?"><Radio options={["Sim, pode postar e falar sobre as questões dele!","Não, prefiro ficar mais reservada."]} value={data.postar_transtorno} onChange={v=>set("postar_transtorno",v)}/></Field>}
          </div>
        </div>
      )}
      {atipico==="Não"&&(
        <div style={{background:"#f8fbf9",border:"1.5px solid #d8ece0",borderRadius:10,padding:"14px 12px",marginTop:4}}>
          <p style={{...sec,marginTop:0,color:"#5a9a6a"}}>🌿 Crianças típicas</p>
          <Field label="O que faz esquecer o mundo por 10 minutos?" required><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.esquecer_mundo||""} onChange={e=>set("esquecer_mundo",e.target.value)}/></Field>
          <Field label="Personagem ou música favorita?" required><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.personagem||""} onChange={e=>set("personagem",e.target.value)}/></Field>
          <Field label="Mania com roupas?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.mania_roupa||""} onChange={e=>set("mania_roupa",e.target.value)}/></Field>
          <Field label="Como lida com barulhos inesperados?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.barulhos||""} onChange={e=>set("barulhos",e.target.value)}/></Field>
          <Field label="Reação quando quer muito algo?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.reacao_querer||""} onChange={e=>set("reacao_querer",e.target.value)}/></Field>
          <Field label="Gosta de abraço?"><Radio options={["Gosta de abraços quentinhos!","Mais na dele(a)!"]} value={data.toque} onChange={v=>set("toque",v)}/></Field>
          <Field label="Precisa de tempo para se adaptar?" required><Radio options={["Melhor ter um tempo para se adaptar","Ele é tranquilo, vai que vai!"]} value={data.tempo_amb_tip} onChange={v=>set("tempo_amb_tip",v)}/></Field>
          <Field label="Já fez ensaios?"><Radio options={["Sim","Não"]} value={data.ensaio_tip} onChange={v=>set("ensaio_tip",v)}/></Field>
          {data.ensaio_tip==="Sim"&&<Field label="Como foi?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.desc_ensaio_tip||""} onChange={e=>set("desc_ensaio_tip",e.target.value)}/></Field>}
          <Field label="Mais alguma informação?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.extra_tip||""} onChange={e=>set("extra_tip",e.target.value)}/></Field>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:10,padding:14,marginTop:10}}>
            <p style={{fontSize:12,fontWeight:700,color:"#1a1a1a",margin:"0 0 8px"}}>🔒 ECA Digital e LGPD</p>
            <p style={{fontSize:11,color:"#666",lineHeight:1.6,margin:"0 0 12px"}}>{ECA}</p>
            <Field label="Concorda com o ECA Digital?" required><Radio options={["Sim","Não"]} value={data.eca_tip} onChange={v=>set("eca_tip",v)}/></Field>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EXTRAS PANEL ────────────────────────────────────────────────
function ExtrasPanel({ extras, selected, onChange, temDesconto, basePrice }) {
  const toggleExtra = (e) => {
    const existe = selected.some(x=>x.id===e.id);
    onChange(existe ? selected.filter(x=>x.id!==e.id) : [...selected, e]);
  };
  const calc = calcularTotal(basePrice, selected, temDesconto);
  return (
    <div style={{marginTop:16,background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:"14px 14px 10px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:0}}>Adicionais opcionais</p>
        {temDesconto&&<span style={{fontSize:10,background:"#e6f4ea",color:"#2e7d32",padding:"2px 8px",borderRadius:20,fontWeight:600}}>10% OFF no total com extras</span>}
      </div>
      {extras.map(e=>{
        const sel = selected.some(x=>x.id===e.id);
        return (
          <div key={e.id} onClick={()=>toggleExtra(e)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:10,marginBottom:6,cursor:"pointer",border:sel?"2px solid #1a1a1a":"1.5px solid #e8e0d8",background:sel?"#1a1a1a":"#fff",transition:"all .15s"}}>
            <div>
              <p style={{margin:0,fontSize:13,fontWeight:600,color:sel?"#fff":"#1a1a1a"}}>{e.label}</p>
              {e.desc&&<p style={{margin:"2px 0 0",fontSize:11,color:sel?"#ccc":"#999"}}>{e.desc}</p>}
            </div>
            <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:sel?"#fff":"#b8967e"}}>{e.price?`R$ ${e.price.toLocaleString("pt-BR")}`:""}</p>
              <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(sel?"#fff":"#ccc"),background:sel?"#fff":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginTop:4,marginLeft:"auto"}}>
                {sel&&<span style={{color:"#1a1a1a",fontSize:12,lineHeight:1}}>✓</span>}
              </div>
            </div>
          </div>
        );
      })}
      {selected.length>0&&(
        <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #e8e0d8"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888",marginBottom:4}}>
            <span>Subtotal</span><span>R$ {calc.sub.toLocaleString("pt-BR")}</span>
          </div>
          {calc.disc>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#2e7d32",marginBottom:4}}>
            <span>Desconto 10%</span><span>- R$ {calc.disc.toLocaleString("pt-BR")}</span>
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,color:"#1a1a1a"}}>
            <span>Total</span><span>R$ {calc.total.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SERVICE SELECTOR ────────────────────────────────────────────
function ServiceSelector({ onConfirm, onValeResgatar, onValeComprar, excluirGrupos=[] }) {
  const [openId, setOpenId] = useState(null);
  const [openCatId, setOpenCatId] = useState(null);
  const [selService, setSelService] = useState(null);
  const [selModality, setSelModality] = useState(null);
  const [selExtras, setSelExtras] = useState([]);

  // Agrupa Chamego e Afeto em categoria Acompanhamento
  const catServices = SERVICES.filter(s => s.categoria === "acompanhamento" && !excluirGrupos.includes(s.grupo));
  const otherServices = SERVICES.filter(s => s.categoria !== "acompanhamento" && !excluirGrupos.includes(s.grupo));
  const groupedItems = [
    { type:"categoria", id:"acompanhamento", icon:"📆", label:"Acompanhamento", services: catServices },
    ...otherServices.map(s => ({ type:"service", ...s }))
  ];

  const handleService = (s) => {
    if(openId===s.id){ setOpenId(null); return; }
    setOpenId(s.id);
    if(s.modalities.length===1){ setSelService(s); setSelModality(s.modalities[0]); setSelExtras([]); }
    else if(selService?.id!==s.id){ setSelService(s); setSelModality(null); setSelExtras([]); }
  };

  const handleModality = (s,m) => { setSelService(s); setSelModality(m); setSelExtras([]); };
  const canContinue = selService && selModality;
  const calc = selModality?.price ? calcularTotal(selModality.price, selExtras, selService?.descontoExtras) : null;

  return (
    <div>
      <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a",marginBottom:4}}>Que tipo de ensaio você deseja?</h3>
      <p style={{fontSize:13,color:"#999",marginBottom:20,lineHeight:1.6}}>Escolha o serviço e depois selecione o que melhor combina com você 🌸</p>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
        {groupedItems.map(item=>{
          if(item.type==="categoria"){
            const isCatOpen=openCatId===item.id;
            return(
              <div key={item.id} style={{borderRadius:14,border:isCatOpen?"2px solid #b8967e":"2px solid #e8e0d8",background:isCatOpen?"#faf8f5":"#fff",overflow:"hidden",transition:"border-color .15s"}}>
                <div onClick={()=>setOpenCatId(isCatOpen?null:item.id)} style={{padding:"15px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:26,flexShrink:0}}>{item.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:"#1a1a1a",margin:0,lineHeight:1.2}}>{item.label}</p>
                    <p style={{fontSize:12,color:"#999",margin:"4px 0 0"}}>Chamego · Afeto</p>
                  </div>
                  <span style={{fontSize:13,color:"#b8967e",flexShrink:0,fontWeight:700,marginLeft:8}}>{isCatOpen?"▲":"▼"}</span>
                </div>
                {isCatOpen&&(
                  <div style={{borderTop:"1px solid #f0e8e0",padding:"10px 12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                    {item.services.map(s=>{
                      const isOpen=openId===s.id;
                      const isSel=selService?.id===s.id;
                      return(
                        <div key={s.id} style={{borderRadius:12,border:isSel?"2px solid #1a1a1a":isOpen?"2px solid #b8967e":"2px solid #e8e0d8",background:isOpen?"#fff":"#faf8f5",overflow:"hidden"}}>
                          <div onClick={()=>handleService(s)} style={{padding:"13px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
                            <span style={{fontSize:22,flexShrink:0}}>{s.icon}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:"#1a1a1a",margin:0}}>{s.label}</p>
                              <p style={{fontSize:11,color:"#999",margin:"3px 0 0",lineHeight:1.4}}>{s.detail?.substring(0,60)}...</p>
                            </div>
                            <span style={{fontSize:12,color:"#b8967e",flexShrink:0,fontWeight:700}}>{isOpen?"▲":"▼"}</span>
                          </div>
                          {isOpen&&(
                            <div style={{borderTop:"1px solid #f0e8e0",padding:"10px 14px 14px"}}>
                              <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Escolha uma opção:</p>
                              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                {s.modalities.map(m=>{
                                  const isMSel=selService?.id===s.id&&selModality?.id===m.id;
                                  return(
                                    <div key={m.id} onClick={()=>handleModality(s,m)} style={{padding:"12px 14px",borderRadius:10,border:isMSel?"2px solid #1a1a1a":"2px solid #e8e0d8",background:isMSel?"#1a1a1a":"#fff",cursor:"pointer",transition:"all .15s"}}>
                                      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                                        <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,border:"2px solid "+(isMSel?"#fff":"#ccc"),background:isMSel?"#fff":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}>
                                          {isMSel&&<div style={{width:8,height:8,borderRadius:"50%",background:"#1a1a1a"}}/>}
                                        </div>
                                        <div style={{flex:1}}>
                                          <p style={{fontSize:14,fontWeight:700,color:isMSel?"#fff":"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{m.label}</p>
                                          <p style={{fontSize:12,color:isMSel?"#ccc":"#888",margin:"3px 0 0",lineHeight:1.5}}>{m.detail}</p>
                                          {m.price&&<p style={{fontSize:13,fontWeight:700,color:isMSel?"#fff":"#b8967e",margin:"5px 0 0"}}>{fmtPreco(m.price,m.priceLabel,m.periodo)}</p>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          // Serviço normal
          const s=item;
          const isOpen=openId===s.id;
          const isSel=selService?.id===s.id;
          return (
            <div key={s.id} style={{borderRadius:14,border:isSel?"2px solid #1a1a1a":isOpen?"2px solid #b8967e":"2px solid #e8e0d8",background:isOpen?"#faf8f5":"#fff",overflow:"hidden",transition:"border-color .15s"}}>
              <div onClick={()=>handleService(s)} style={{padding:"15px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:26,flexShrink:0}}>{s.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:"#1a1a1a",margin:0,lineHeight:1.2}}>{s.label}</p>
                  <p style={{fontSize:12,color:"#999",margin:"4px 0 0",lineHeight:1.5}}>{s.description}</p>
                </div>
                <span style={{fontSize:13,color:"#b8967e",flexShrink:0,fontWeight:700,marginLeft:8}}>{isOpen?"▲":"▼"}</span>
              </div>
              {isOpen&&(
                <div style={{borderTop:"1px solid #f0e8e0",padding:"12px 16px 16px"}}>
                  {s.grupo==="vale"?(
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <button onClick={()=>onValeComprar?onValeComprar():handleModality(s,s.modalities[0])} style={{padding:'13px 14px',borderRadius:10,background:'#1a1a1a',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:600,fontFamily:"'Cormorant Garamond',serif",textAlign:'left'}}>🎁 Comprar um vale presente</button>
                      {onValeResgatar&&<button onClick={onValeResgatar} style={{padding:'13px 14px',borderRadius:10,background:'#fff',color:'#1a1a1a',border:'1.5px solid #1a1a1a',cursor:'pointer',fontSize:14,fontWeight:600,fontFamily:"'Cormorant Garamond',serif",textAlign:'left'}}>🔑 Resgatar um vale presente</button>}
                      <p style={{fontSize:11,color:'#999',margin:'4px 0 0',lineHeight:1.5}}>{s.modalities[0].detail}</p>
                    </div>
                  ) : s.modalities.length===1?(
                    <div style={{padding:"12px 14px",borderRadius:10,background:"#e6f4ea",border:"2px solid #a5d6a7"}}>
                      <p style={{fontSize:13,color:"#2e7d32",fontWeight:700,margin:"0 0 4px"}}>✅ {s.modalities[0].label}</p>
                      <p style={{fontSize:12,color:"#555",margin:0,lineHeight:1.6}}>{s.modalities[0].detail}</p>
                      {s.modalities[0].obs&&<p style={{fontSize:11,color:"#856404",margin:"5px 0 0"}}>⚠ {s.modalities[0].obs}</p>}
                      {s.modalities[0].price&&<p style={{fontSize:13,fontWeight:700,color:"#2e7d32",margin:"6px 0 0"}}>{fmtPreco(s.modalities[0].price,s.modalities[0].priceLabel,s.modalities[0].periodo)}</p>}
                      {!s.modalities[0].price&&<p style={{fontSize:12,color:"#999",margin:"5px 0 0"}}>Valor a consultar</p>}
                    </div>
                  ):(
                    <div>
                      <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Escolha uma opção:</p>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {s.modalities.map(m=>{
                          const isMSel=selService?.id===s.id&&selModality?.id===m.id;
                          return (
                            <div key={m.id} onClick={()=>handleModality(s,m)} style={{padding:"12px 14px",borderRadius:10,border:isMSel?"2px solid #1a1a1a":"2px solid #e8e0d8",background:isMSel?"#1a1a1a":"#fff",cursor:"pointer",transition:"all .15s"}}>
                              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                                <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,border:"2px solid "+(isMSel?"#fff":"#ccc"),background:isMSel?"#fff":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}>
                                  {isMSel&&<div style={{width:8,height:8,borderRadius:"50%",background:"#1a1a1a"}}/>}
                                </div>
                                <div style={{flex:1}}>
                                  <p style={{fontSize:14,fontWeight:700,color:isMSel?"#fff":"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{m.label}</p>
                                  <p style={{fontSize:12,color:isMSel?"#ccc":"#888",margin:"3px 0 0",lineHeight:1.5}}>{m.detail}</p>
                                  {m.obs&&<p style={{fontSize:11,color:isMSel?"#ffd":"#856404",margin:"3px 0 0"}}>⚠ {m.obs}</p>}
                                  {m.incluso&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:5}}>{m.incluso.map(i=><span key={i} style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:isMSel?"rgba(255,255,255,0.2)":"#f0e8e0",color:isMSel?"#fff":"#b8967e",fontWeight:600}}>{i}</span>)}</div>}
                                  {m.price?<p style={{fontSize:13,fontWeight:700,color:isMSel?"#fff":"#b8967e",margin:"5px 0 0"}}>{fmtPreco(m.price,m.priceLabel,m.periodo)}{m.fotos&&!m.priceLabel?<span style={{fontSize:11,fontWeight:400,marginLeft:6}}>{m.fotos===70?"a partir de 70 fotos":`· ${m.fotos} fotos`}</span>:null}{m.duracao?<span style={{fontSize:11,fontWeight:400,marginLeft:6}}>· {m.duracao}</span>:null}</p>:<p style={{fontSize:12,color:isMSel?"#ddd":"#999",margin:"5px 0 0"}}>Valor a consultar</p>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {s.extras&&selService?.id===s.id&&selModality&&(
                    <ExtrasPanel extras={s.extras} selected={selExtras} onChange={setSelExtras} temDesconto={!!s.descontoExtras} basePrice={selModality.price||0}/>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {canContinue&&(
        <div style={{padding:"14px 16px",background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,margin:"0 0 2px",textTransform:"uppercase",letterSpacing:"1px"}}>Selecionado</p>
            <p style={{fontSize:14,fontWeight:700,color:"#1a1a1a",margin:0}}>{selService.icon} {selService.label}</p>
            <p style={{fontSize:12,color:"#888",margin:"2px 0 0"}}>{selModality.label}</p>
            {calc&&<p style={{fontSize:13,fontWeight:700,color:"#b8967e",margin:"2px 0 0"}}>R$ {calc.total.toLocaleString("pt-BR")}{calc.disc>0?" (com desconto)":""}</p>}
          </div>
          <button style={{padding:"6px 10px",borderRadius:8,background:"#f0e8e0",border:"none",cursor:"pointer",fontSize:18,color:"#b8967e",lineHeight:1}} onClick={()=>{setSelService(null);setSelModality(null);setOpenId(null);setSelExtras([])}}>✕</button>
        </div>
      )}
      <button disabled={!canContinue} onClick={()=>onConfirm(selService,selModality,selExtras)} style={{width:"100%",padding:"14px",borderRadius:12,background:canContinue?"#1a1a1a":"#e8e0d8",color:canContinue?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:17,cursor:canContinue?"pointer":"default",transition:"background .2s"}}>
        {canContinue?`Continuar com ${selService.label} — ${selModality.label} →`:"Selecione um serviço para continuar"}
      </button>
    </div>
  );
}

// ─── STATUS ───────────────────────────────────────────────────────
const STATUS_COLORS = {
  "Pendente":          {bg:"#fff8e1",color:"#f57c00"},
  "A Realizar":        {bg:"#e8f4fd",color:"#0277bd"},
  "Confirmado":        {bg:"#e3f2fd",color:"#1565C0"},
  "Contrato":          {bg:"#f3e5f5",color:"#7b1fa2"},
  "Concluído":         {bg:"#e6f4ea",color:"#2e7d32"},
  "Cancelado":         {bg:"#fde8e8",color:"#c62828"},
  "Cancelado (multa)": {bg:"#fde8e8",color:"#b71c1c"},
};
const PAG_COLORS = {
  "Pendente":  {bg:"#fff8e1",color:"#f57c00"},
  "Parcial":   {bg:"#e3f2fd",color:"#1565C0"},
  "Pago":      {bg:"#e6f4ea",color:"#2e7d32"},
  "Cancelado": {bg:"#fde8e8",color:"#c62828"},
};

// ─── FICHA RÁPIDA ─────────────────────────────────────────────────
function FichaRapida({ agendamento, onVerMais, onFechar }) {
  const cl=agendamento?.clientes||{};
  const anamnese=cl.anamnese||{};
  const atipico=cl.atipico;
  const camposPrio=atipico?[["transtorno","Transtorno"],["prevenir_crises","Como prevenir crises"],["contornar","Como contornar"],["incomoda","O que incomoda"],["gosta","Do que gosta"],["comunicacao","Como se comunica"],["tempo_amb_atip","Adaptação"]]:[["esquecer_mundo","O que faz esquecer o mundo"],["personagem","Personagem / música favorita"],["toque","Gosta de toque"],["tempo_amb_tip","Adaptação"],["barulhos","Como lida com barulhos"]];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",padding:20,paddingBottom:36}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <p style={{fontSize:10,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 4px"}}>📸 {agendamento.servico}{agendamento.modalidade?` — ${agendamento.modalidade}`:""} · {formatDateBR(agendamento.data)} às {agendamento.hora}</p>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,margin:"0 0 2px"}}>{cl.nome_mae}</h2>
            <p style={{fontSize:13,color:"#888",margin:0}}>{cl.nome_crianca?" 👶 "+cl.nome_crianca+(cl.idade?" · "+cl.idade:""):""}{atipico?" · 🧡 Atípico":" · 🌿 Típico"}</p>
          </div>
          <button onClick={onFechar} style={{background:"#f5f0eb",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:18,color:"#999",lineHeight:1}}>✕</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <a href={`https://wa.me/55${(cl.telefone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{flex:1,padding:"9px",borderRadius:10,background:"#25D366",color:"#fff",textDecoration:"none",fontSize:12,fontWeight:600,textAlign:"center"}}>💬 WhatsApp</a>
          <a href={`mailto:${cl.email}`} style={{flex:1,padding:"9px",borderRadius:10,background:"#e3f2fd",color:"#1565C0",textDecoration:"none",fontSize:12,fontWeight:600,textAlign:"center"}}>✉️ E-mail</a>
        </div>
        {Object.keys(anamnese).length>0?(
          <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>📋 Anamnese</p>
            {camposPrio.map(([k,label])=>{const v=anamnese[k];if(!v||v==="")return null;return(<div key={k} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #f0e8e0"}}><span style={{fontSize:10,color:"#b8967e",display:"block",fontWeight:700,marginBottom:3}}>{label}</span><span style={{fontSize:13,color:"#333",lineHeight:1.5}}>{Array.isArray(v)?v.join(", "):String(v)}</span></div>);})}
          </div>
        ):(
          <div style={{background:"#faf8f5",border:"1.5px dashed #e8e0d8",borderRadius:12,padding:14,marginBottom:12,textAlign:"center"}}><p style={{fontSize:13,color:"#bbb",margin:0}}>Anamnese não preenchida</p></div>
        )}
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div><p style={{fontSize:11,color:"#aaa",margin:"0 0 2px"}}>Valor</p><p style={{fontSize:16,fontWeight:700,color:"#1a1a1a",fontFamily:"'Cormorant Garamond',serif",margin:0}}>R$ {Number(agendamento.valor||0).toFixed(2).replace(".",",")}</p></div>
            <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:(PAG_COLORS[agendamento.pagamento_status]||PAG_COLORS["Pendente"]).bg,color:(PAG_COLORS[agendamento.pagamento_status]||PAG_COLORS["Pendente"]).color}}>💳 {agendamento.pagamento_status||"Pendente"}</span>
          </div>
          {agendamento.pagamento_link&&<a href={agendamento.pagamento_link} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",borderRadius:8,background:"#f0f7ff",color:"#1565C0",textDecoration:"none",fontSize:13,fontWeight:600}}>🔗 Link InfinityPay</a>}
        </div>
        <button onClick={onVerMais} style={{width:"100%",padding:13,borderRadius:10,background:"#1a1a1a",color:"#fff",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:"pointer"}}>Ver ficha completa →</button>
      </div>
    </div>
  );
}

// ─── AGENDA VIEW ──────────────────────────────────────────────────
function AgendaView({ auth, onVerCliente }) {
  const [agendamentos,setAgendamentos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [fichaSel,setFichaSel]=useState(null);
  const carregar=useCallback(async()=>{setLoading(true);try{const ags=await getAgendamentos();setAgendamentos(ags||[]);}catch(e){console.error(e);}finally{setLoading(false);};},[]);
  useEffect(()=>{carregar();},[carregar]);
  const hoje=new Date().toISOString().substring(0,10);
  const upcoming=agendamentos.filter(a=>a.data&&a.data>=hoje&&a.status!=="Cancelado").sort((a,b)=>a.data.localeCompare(b.data)||(a.hora||"").localeCompare(b.hora||"")).slice(0,50);
  const porDia={};upcoming.forEach(a=>{if(!porDia[a.data])porDia[a.data]=[];porDia[a.data].push(a);});
  const dias=Object.keys(porDia).sort();
  return (
    <div>
      {fichaSel&&<FichaRapida agendamento={fichaSel} onFechar={()=>setFichaSel(null)} onVerMais={()=>{setFichaSel(null);onVerCliente(fichaSel.id);}}/>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,margin:0}}>📅 Próximos ensaios</h3>
        <button onClick={carregar} style={{padding:"6px 12px",borderRadius:7,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:12,color:"#666"}}>🔄 Atualizar</button>
      </div>
      {loading&&<p style={{textAlign:"center",color:"#bbb",fontSize:13,padding:"30px 0"}}>Sincronizando com Google Calendar...</p>}
      {!loading&&dias.length===0&&<div style={{textAlign:"center",padding:"48px 16px"}}><div style={{fontSize:40,marginBottom:12}}>📭</div><p style={{fontSize:14,color:"#bbb"}}>Nenhum evento nos próximos dias</p></div>}
      {!loading&&dias.map(dia=>{
        const isHoje=dia===hoje;
        const d=new Date(dia+"T12:00:00");
        const diaLabel=isHoje?"Hoje":d.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
        return(
          <div key={dia} style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:12,fontWeight:700,color:isHoje?"#b8967e":"#888",textTransform:"capitalize"}}>{diaLabel}</span>
              {isHoje&&<span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:"#fdf0e8",color:"#b8967e"}}>HOJE</span>}
              <div style={{flex:1,height:1,background:"#f0e8e0"}}/>
            </div>
            {porDia[dia].map(ag=>{
              const cl=ag?.clientes||{};const st=STATUS_COLORS[ag.status]||STATUS_COLORS["Pendente"];const pc=PAG_COLORS[ag.pagamento_status]||PAG_COLORS["Pendente"];
              return(
                <div key={ag.id} onClick={()=>setFichaSel(ag)} style={{padding:14,border:"1.5px solid "+(isHoje?"#f0ddd0":"#e8e0d8"),borderRadius:12,marginBottom:8,cursor:"pointer",background:isHoje?"#fffbf8":"#fff",borderLeft:`4px solid ${isHoje?"#b8967e":"#e8e0d8"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:700,color:"#b8967e",fontFamily:"'Cormorant Garamond',serif"}}>{ag.hora}</span>
                        <span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{cl.nome_mae||"—"}</span>
                      </div>
                      <p style={{margin:"0 0 4px",fontSize:12,color:"#888"}}>{ag.servico}{ag.modalidade?" — "+ag.modalidade:""}</p>
                      {cl.telefone&&<p style={{margin:"0 0 6px",fontSize:12,color:"#999"}}>📞 {cl.telefone}</p>}
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:st.bg,color:st.color}}>{ag.status}</span>
                        <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {ag.pagamento_status||"Pendente"}</span>
                        {cl.anamnese&&Object.keys(cl.anamnese).length>0&&<span style={{padding:"2px 8px",borderRadius:10,fontSize:10,background:"#f5f0eb",color:"#888"}}>📋 Anamnese</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8}}>
                      <p style={{fontSize:13,fontWeight:700,color:"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {Number(ag.valor||0).toFixed(2).replace(".",",")}</p>
                      <span style={{fontSize:10,color:"#b8967e",fontWeight:700}}>Ver ficha →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── CRM VIEW ─────────────────────────────────────────────────────
function CRMView({ abrirAgendamentoId, onAgendamentoAberto }) {
  const [agendamentos,setAgendamentos]=useState([]);
  const [clientes,setClientes]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);
  const [selectedCliente,setSelectedCliente]=useState(null);
  const [tab,setTab]=useState("agendamentos");
  const [filter,setFilter]=useState("Todos");
  const [mesFiltro,setMesFiltro]=useState("todos");
  const [showNew,setShowNew]=useState(false);
  const [newClient,setNewClient]=useState({nome_mae:"",email:"",telefone:"",servico:"",modalidade:"",data:"",hora:"",valor:"",obs:"",cpf_mae:"",pagamento_link:""});
  const [newAnamnese,setNewAnamnese]=useState({});
  const [salvando,setSalvando]=useState(false);
  const [editandoCliente,setEditandoCliente]=useState(false);
  const [editClienteForm,setEditClienteForm]=useState({});
  const [confirmDeleteCliente,setConfirmDeleteCliente]=useState(false);
  const [salvandoEditCliente,setSalvandoEditCliente]=useState(false);

  const carregar=useCallback(async()=>{setLoading(true);try{const [ags,cls]=await Promise.all([getAgendamentos(),getClientes()]);setAgendamentos(ags||[]);setClientes(cls||[]);}catch(e){console.error(e);}finally{setLoading(false);};},[]);
  useEffect(()=>{carregar();},[carregar]);
  useEffect(()=>{if(abrirAgendamentoId&&agendamentos.length>0){setSelected(abrirAgendamentoId);setTab("agendamentos");onAgendamentoAberto&&onAgendamentoAberto();}},[abrirAgendamentoId,agendamentos]);

  const update=async(id,patch)=>{
    try{
      await atualizarAgendamento(id,patch);
      setAgendamentos(as=>as.map(a=>a.id===id?{...a,...patch}:a));
      if(patch.status==="Confirmado"){
        const ag=agendamentos.find(a=>a.id===id)||{};
        const cl=ag.clientes||{};
        fetch(WEBHOOK_CONFIRMAR,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            id,
            nome_mae:cl.nome_mae,
            nome_crianca:ag.nome_crianca||cl.nome_crianca,
            email:cl.email,
            telefone:cl.telefone,
            servico:ag.servico,
            modalidade:ag.modalidade,
            data:ag.data,
            hora:ag.hora,
            duracao_min:ag.duracao_min||60,
            valor:ag.valor,
          }),
        }).catch(()=>{});
      }
    }catch(e){alert("Erro: "+e.message);}
  };
  const agendamento=selected?agendamentos.find(a=>a.id===selected):null;
  const cliente=selectedCliente?clientes.find(c=>c.id===selectedCliente):null;
  const mesesDisp=[...new Set(agendamentos.map(a=>a.data?.substring(0,7)).filter(Boolean))].sort().reverse();
  const filtered=agendamentos.filter(a=>{const statusOk=filter==="Todos"||a.status===filter;const mesOk=mesFiltro==="todos"||(a.data&&a.data.startsWith(mesFiltro));return statusOk&&mesOk;});

  // Stats
  if(!loading&&tab==="stats"){
    const porMes={};agendamentos.filter(a=>a.status!=="Cancelado").forEach(a=>{if(!a.data)return;const m=a.data.substring(0,7);if(!porMes[m])porMes[m]={recebido:0,pendente:0,total:0,qtd:0};const val=Number(a.valor||0);porMes[m].total+=val;porMes[m].qtd+=1;if(a.pagamento_status==="Pago")porMes[m].recebido+=val;else porMes[m].pendente+=val;});
    const mesesOrd=Object.keys(porMes).sort().reverse();
    const totalRecebido=agendamentos.reduce((acc,a)=>a.pagamento_status==="Pago"?acc+Number(a.valor||0):acc,0);
    const totalPendente=agendamentos.filter(a=>a.status!=="Cancelado").reduce((acc,a)=>a.pagamento_status!=="Pago"?acc+Number(a.valor||0):acc,0);
    return(
      <div>
        <div style={{display:"flex",gap:6,marginBottom:16}}>{[["agendamentos","📅 Agenda"],["clientes","👥 Clientes"],["stats","📊 Resumo"]].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px 4px",borderRadius:8,fontSize:11,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{l}</button>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div style={{padding:16,background:"#e6f4ea",border:"1.5px solid #a5d6a7",borderRadius:12,textAlign:"center"}}><p style={{fontSize:11,color:"#2e7d32",fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"1px"}}>💰 Recebido</p><p style={{fontSize:22,fontWeight:700,color:"#2e7d32",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {totalRecebido.toFixed(2).replace(".",",")}</p></div>
          <div style={{padding:16,background:"#fff8e1",border:"1.5px solid #ffe082",borderRadius:12,textAlign:"center"}}><p style={{fontSize:11,color:"#f57c00",fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"1px"}}>⏳ A receber</p><p style={{fontSize:22,fontWeight:700,color:"#f57c00",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {totalPendente.toFixed(2).replace(".",",")}</p></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>{[["Agendamentos",agendamentos.length,"#1a1a1a"],["Clientes",clientes.length,"#b8967e"],["Concluídos",agendamentos.filter(a=>a.status==="Concluído").length,"#2e7d32"]].map(([l,n,cor])=><div key={l} style={{padding:12,background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,textAlign:"center"}}><p style={{fontSize:22,fontWeight:700,color:cor,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{n}</p><p style={{fontSize:10,color:"#999",margin:"3px 0 0"}}>{l}</p></div>)}</div>
        <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Receita por mês</p>
        {mesesOrd.map(m=>{const d=porMes[m];const pct=d.total>0?Math.round((d.recebido/d.total)*100):0;return(<div key={m} style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{mesAno(m+"-01")}</span><span style={{fontSize:11,color:"#999"}}>{d.qtd} ensaio{d.qtd!==1?"s":""} · Total: R$ {d.total.toFixed(2).replace(".",",")}</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}><div><p style={{fontSize:10,color:"#2e7d32",fontWeight:700,margin:"0 0 2px"}}>✅ Recebido</p><p style={{fontSize:14,fontWeight:700,color:"#2e7d32",margin:0}}>R$ {d.recebido.toFixed(2).replace(".",",")}</p></div><div><p style={{fontSize:10,color:"#f57c00",fontWeight:700,margin:"0 0 2px"}}>⏳ A receber</p><p style={{fontSize:14,fontWeight:700,color:"#f57c00",margin:0}}>R$ {d.pendente.toFixed(2).replace(".",",")}</p></div></div><div style={{height:6,background:"#f0e8e0",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:"#2e7d32",borderRadius:4}}/></div><p style={{fontSize:10,color:"#999",margin:"4px 0 0",textAlign:"right"}}>{pct}% recebido</p></div>);})}
      </div>
    );
  }

  // ── Detalhe do agendamento ──────────────────────────────────────
  if(agendamento){
    const st=STATUS_COLORS[agendamento.status]||STATUS_COLORS["Pendente"];
    const cl=agendamento.clientes||{};
    const camposAnamnese=Object.entries(cl.anamnese||{}).filter(([k,v])=>v&&v!==""&&!["nome_mae","email","phone","nome_crianca","idade","atipico"].includes(k));
    const dadosEvento=agendamento.dados_evento||{};
    const temDadosEvento=Object.keys(dadosEvento).length>0;
    return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#999",fontSize:13,padding:0}}>← Voltar</button>
          <button onClick={async()=>{if(!window.confirm("Excluir este agendamento?"))return;try{await atualizarAgendamento(agendamento.id,{status:"Cancelado"});setSelected(null);carregar();}catch(e){alert("Erro: "+e.message);}}} style={{padding:"5px 10px",borderRadius:7,background:"#fde8e8",border:"1px solid #f4a0a0",cursor:"pointer",fontSize:11,color:"#c62828",fontWeight:600}}>🗑 Excluir</button>
        </div>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div><h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 2px"}}>{cl.nome_mae}</h3><p style={{fontSize:12,color:"#999",margin:0}}>{cl.nome_crianca?"👶 "+cl.nome_crianca+(cl.atipico?" · 🧡 Atípico":" · 🌿 Típico"):""}</p></div>
            <span style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.color}}>{agendamento.status}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>{[["Serviço",agendamento.servico],["Modalidade",agendamento.modalidade||"—"],["Valor",`R$ ${Number(agendamento.valor||0).toFixed(2).replace(".",",")}`],["WhatsApp",cl.telefone]].map(([k,v])=><div key={k}><span style={{fontSize:10,color:"#aaa",display:"block"}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{v||"—"}</span></div>)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={{fontSize:10,color:"#aaa",display:"block",marginBottom:3}}>Data</label><input style={{...inp,fontSize:13}} type="date" defaultValue={agendamento.data||""} onBlur={e=>e.target.value&&update(agendamento.id,{data:e.target.value})}/></div>
            <div><label style={{fontSize:10,color:"#aaa",display:"block",marginBottom:3}}>Horário</label><input style={{...inp,fontSize:13}} type="time" defaultValue={agendamento.hora||""} onBlur={e=>e.target.value&&update(agendamento.id,{hora:e.target.value})}/></div>
          </div>
        </div>

        {/* Dados do evento */}
        {temDadosEvento&&(
          <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>📍 Dados do evento/local</p>
            {[
              dadosEvento.nome_aniversariante&&["Aniversariante",dadosEvento.nome_aniversariante+(dadosEvento.idade_aniversariante?" · "+dadosEvento.idade_aniversariante:"")],
              dadosEvento.num_convidados&&["Convidados",dadosEvento.num_convidados],
              dadosEvento.local_nome&&["Local",dadosEvento.local_nome],
              (dadosEvento.local_rua||dadosEvento.local_cidade)&&["Endereço",[dadosEvento.local_rua,dadosEvento.local_complemento,dadosEvento.local_bairro,dadosEvento.local_cidade].filter(Boolean).join(", ")],
            ].filter(Boolean).map(([k,v])=>(
              <div key={k} style={{marginBottom:8,paddingBottom:8,borderBottom:"1px solid #f0e8e0"}}>
                <span style={{fontSize:10,color:"#b8967e",display:"block",fontWeight:600,marginBottom:2}}>{k}</span>
                <span style={{fontSize:13,color:"#444"}}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {camposAnamnese.length>0?(
          <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>📋 Anamnese — {cl.atipico?"🧡 Atípica":"🌿 Típica"}</p>
            {camposAnamnese.map(([k,v])=><div key={k} style={{marginBottom:8,paddingBottom:8,borderBottom:"1px solid #f0e8e0"}}><span style={{fontSize:10,color:"#b8967e",display:"block",fontWeight:600,marginBottom:2}}>{ANAMNESE_LABELS[k]||k.replace(/_/g," ")}</span><span style={{fontSize:13,color:"#444",lineHeight:1.5}}>{Array.isArray(v)?v.join(", "):String(v)}</span></div>)}
          </div>
        ):(
          <div style={{background:"#faf8f5",border:"1.5px dashed #e8e0d8",borderRadius:12,padding:14,marginBottom:12,textAlign:"center"}}><p style={{fontSize:13,color:"#bbb",margin:0}}>Anamnese não preenchida</p></div>
        )}
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
          <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Status do agendamento</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{Object.keys(STATUS_COLORS).map(s=><button key={s} onClick={()=>update(agendamento.id,{status:s})} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,border:"2px solid "+(agendamento.status===s?"#1a1a1a":"#e8e0d8"),background:agendamento.status===s?"#1a1a1a":"#fff",color:agendamento.status===s?"#fff":"#666",cursor:"pointer"}}>{s}</button>)}</div>
        </div>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
          <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>💳 Pagamento</p>
          <Field label="Status do pagamento"><div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>{Object.keys(PAG_COLORS).map(s=><button key={s} onClick={()=>update(agendamento.id,{pagamento_status:s})} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,border:"2px solid "+((agendamento.pagamento_status||"Pendente")===s?"#1a1a1a":"#e8e0d8"),background:(agendamento.pagamento_status||"Pendente")===s?"#1a1a1a":"#fff",color:(agendamento.pagamento_status||"Pendente")===s?"#fff":"#666",cursor:"pointer"}}>{s}</button>)}</div></Field>
          <Field label="Link de pagamento (InfinityPay)"><input style={inp} type="url" placeholder="Cole aqui o link" value={agendamento.pagamento_link||""} onChange={e=>update(agendamento.id,{pagamento_link:e.target.value})}/></Field>
          {agendamento.pagamento_link&&<a href={agendamento.pagamento_link} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px",borderRadius:8,background:"#e3f2fd",color:"#1565C0",textDecoration:"none",fontSize:13,fontWeight:600}}>🔗 Abrir link de pagamento</a>}
        </div>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
          <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>📄 Contrato</p>
          <ContractPanel agendamento={agendamento} onUpdate={(patch)=>update(agendamento.id,patch)}/>
        </div>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
          <GaleriaPanel agendamento={agendamento}/>
        </div>
        <a href={`https://wa.me/55${(cl.telefone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:13,borderRadius:10,background:"#25D366",color:"#fff",textDecoration:"none",fontSize:14,fontWeight:600,boxSizing:"border-box"}}>💬 Abrir WhatsApp</a>
      </div>
    );
  }

  // ── Detalhe do cliente ──────────────────────────────────────────
  if(cliente){
    const ensaiosCliente=agendamentos.filter(a=>a.cliente_id===cliente.id);
    const endereco=cliente.endereco||{};
    const salvarEdicaoCliente=async()=>{setSalvandoEditCliente(true);try{await atualizarCliente(cliente.id,editClienteForm);setClientes(cs=>cs.map(c=>c.id===cliente.id?{...c,...editClienteForm}:c));setEditandoCliente(false);}catch(e){alert("Erro: "+e.message);}setSalvandoEditCliente(false);};
    const excluirClienteFn=async()=>{try{await deletarAgendamentosCliente(cliente.id);await deletarCliente(cliente.id);setSelectedCliente(null);setConfirmDeleteCliente(false);carregar();}catch(e){alert("Erro ao excluir: "+e.message);}};
    return(
      <div>
        <button onClick={()=>{setSelectedCliente(null);setEditandoCliente(false);setConfirmDeleteCliente(false);}} style={{background:"none",border:"none",cursor:"pointer",color:"#999",fontSize:13,marginBottom:16,padding:0}}>← Voltar</button>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:0}}>{cliente.nome_mae}</h3>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{setEditandoCliente(!editandoCliente);setEditClienteForm({nome_mae:cliente.nome_mae||"",email:cliente.email||"",telefone:cliente.telefone||"",cpf_mae:cliente.cpf_mae||"",rg:cliente.rg||"",data_nascimento:cliente.data_nascimento||"",endereco:cliente.endereco||{}});}} style={{padding:"5px 10px",borderRadius:7,background:"#f0f4ff",border:"1px solid #c0d0ff",cursor:"pointer",fontSize:12,color:"#1565C0",fontWeight:600}}>✏️ Editar</button>
              <button onClick={()=>setConfirmDeleteCliente(true)} style={{padding:"5px 10px",borderRadius:7,background:"#fde8e8",border:"1px solid #f4a0a0",cursor:"pointer",fontSize:12,color:"#c62828",fontWeight:600}}>🗑 Excluir</button>
            </div>
          </div>
          {editandoCliente?(
            <div>
              {[["nome_mae","Nome"],["email","E-mail"],["telefone","WhatsApp"],["cpf_mae","CPF"],["rg","RG"],["data_nascimento","Data de nascimento"]].map(([k,l])=>(
                <Field key={k} label={l}><input style={{...inp,marginBottom:0}} value={editClienteForm[k]||""} onChange={e=>setEditClienteForm(f=>({...f,[k]:e.target.value}))}/></Field>
              ))}
              <p style={{...sec,marginTop:12}}>Endereço</p>
              {[["cep","CEP"],["rua","Rua e número"],["complemento","Complemento"],["bairro","Bairro"],["cidade","Cidade"]].map(([k,l])=>(
                <Field key={k} label={l}><input style={{...inp,marginBottom:0}} value={editClienteForm.endereco?.[k]||""} onChange={e=>setEditClienteForm(f=>({...f,endereco:{...f.endereco,[k]:e.target.value}}))}/></Field>
              ))}
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button onClick={()=>setEditandoCliente(false)} style={{flex:1,padding:10,borderRadius:8,background:"#fff",border:"1.5px solid #e8e0d8",cursor:"pointer",fontSize:13,color:"#666"}}>Cancelar</button>
                <button disabled={salvandoEditCliente} onClick={salvarEdicaoCliente} style={{flex:2,padding:10,borderRadius:8,background:"#1a1a1a",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600}}>{salvandoEditCliente?"Salvando...":"Salvar"}</button>
              </div>
            </div>
          ):(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                {[["E-mail",cliente.email],["WhatsApp",cliente.telefone],["CPF",cliente.cpf_mae],["RG",cliente.rg],["Nascimento",cliente.data_nascimento],["Total de ensaios",cliente.total_ensaios||ensaiosCliente.length],["Último ensaio",formatDateBR(cliente.ultimo_ensaio)]].map(([k,v])=><div key={k}><span style={{fontSize:10,color:"#aaa",display:"block"}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{v||"—"}</span></div>)}
              </div>
              {(endereco.rua||endereco.cidade)&&(
                <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #f0e8e0"}}>
                  <span style={{fontSize:10,color:"#aaa",display:"block",marginBottom:2}}>Endereço</span>
                  <span style={{fontSize:13,color:"#1a1a1a"}}>{[endereco.rua,endereco.complemento,endereco.bairro,endereco.cidade].filter(Boolean).join(", ")}{endereco.cep?" — CEP "+endereco.cep:""}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {confirmDeleteCliente&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"#fff",borderRadius:14,padding:24,maxWidth:360,width:"100%"}}>
              <p style={{fontSize:16,fontWeight:700,color:"#c62828",margin:"0 0 8px"}}>⚠️ Excluir cliente</p>
              <p style={{fontSize:13,color:"#555",margin:"0 0 20px",lineHeight:1.6}}>Isso excluirá <strong>{cliente.nome_mae}</strong> e todos os seus {ensaiosCliente.length} agendamento(s). Esta ação não pode ser desfeita.</p>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setConfirmDeleteCliente(false)} style={{flex:1,padding:11,borderRadius:8,background:"#fff",border:"1.5px solid #e8e0d8",cursor:"pointer",fontSize:13}}>Cancelar</button>
                <button onClick={excluirClienteFn} style={{flex:2,padding:11,borderRadius:8,background:"#c62828",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600}}>Confirmar exclusão</button>
              </div>
            </div>
          </div>
        )}
        {cliente.filhos&&cliente.filhos.length>0&&(
          <div style={{marginBottom:12}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 8px"}}>👶 Filhos cadastrados</p>
            {cliente.filhos.map((f,i)=>(
              <div key={i} style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:10,padding:"10px 14px",marginBottom:6}}>
                <p style={{margin:0,fontSize:13,fontWeight:600}}>{f.nome_crianca} · {f.idade}</p>
                <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>{f.atipico==="Sim"?"🧡 Atípico":"🌿 Típico"}</p>
              </div>
            ))}
          </div>
        )}
        <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"16px 0 10px"}}>Histórico de ensaios</p>
        {ensaiosCliente.length===0&&<p style={{fontSize:13,color:"#bbb",textAlign:"center",padding:"20px 0"}}>Nenhum ensaio registrado</p>}
        {ensaiosCliente.map(a=>{const st=STATUS_COLORS[a.status]||STATUS_COLORS["Pendente"];const pc=PAG_COLORS[a.pagamento_status]||PAG_COLORS["Pendente"];return(<div key={a.id} onClick={()=>{setSelectedCliente(null);setSelected(a.id);}} style={{padding:12,border:"1.5px solid #e8e0d8",borderRadius:10,marginBottom:8,cursor:"pointer",background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between"}}><div><p style={{margin:0,fontSize:13,fontWeight:600}}>{a.servico}{a.modalidade?` — ${a.modalidade}`:""}</p><p style={{margin:"2px 0 0",fontSize:11,color:"#999"}}>{formatDateBR(a.data)} às {a.hora}</p><div style={{display:"flex",gap:5,marginTop:4}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:st.bg,color:st.color}}>{a.status}</span><span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {a.pagamento_status||"Pendente"}</span></div></div><p style={{fontSize:13,fontWeight:700,color:"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {Number(a.valor||0).toFixed(2).replace(".",",")}</p></div></div>);})}
        <a href={`https://wa.me/55${(cliente.telefone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:13,borderRadius:10,background:"#25D366",color:"#fff",textDecoration:"none",fontSize:14,fontWeight:600,boxSizing:"border-box",marginTop:12}}>💬 Abrir WhatsApp</a>
      </div>
    );
  }

  // ── Lista principal ─────────────────────────────────────────────
  return(
    <div>
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,overflowY:"auto",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:20,maxWidth:480,margin:"0 auto",paddingBottom:40}}>
            <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,margin:"0 0 4px"}}>Novo agendamento</h3>
            <p style={sec}>📅 Dados do agendamento</p>
            {[["nome_mae","Nome da mãe","text"],["cpf_mae","CPF da mãe","text"],["email","E-mail","email"],["telefone","WhatsApp","tel"],["data","Data do ensaio","date"],["hora","Horário","time"],["valor","Valor (R$)","number"]].map(([k,l,t])=>(<Field key={k} label={l}><input style={inp} type={t} value={newClient[k]||""} onChange={e=>setNewClient(n=>({...n,[k]:e.target.value}))}/></Field>))}
            <Field label="Serviço"><select style={inp} value={newClient.servico} onChange={e=>setNewClient(n=>({...n,servico:e.target.value,modalidade:""}))}>
              <option value="">Selecione...</option>
              {SERVICES.map(s=><option key={s.id} value={s.label}>{s.label}</option>)}
            </select></Field>
            {newClient.servico&&(()=>{const svc=SERVICES.find(s=>s.label===newClient.servico);if(!svc||svc.modalities.length<=1)return null;return(<Field label="Modalidade"><select style={inp} value={newClient.modalidade} onChange={e=>setNewClient(n=>({...n,modalidade:e.target.value}))}><option value="">Selecione...</option>{svc.modalities.map(m=><option key={m.id} value={m.label}>{m.label}</option>)}</select></Field>);})()}
            <Field label="Observações"><textarea style={{...inp,resize:"vertical"}} rows={2} value={newClient.obs||""} onChange={e=>setNewClient(n=>({...n,obs:e.target.value}))}/></Field>
            <Field label="Link InfinityPay"><input style={inp} type="url" placeholder="Cole o link" value={newClient.pagamento_link||""} onChange={e=>setNewClient(n=>({...n,pagamento_link:e.target.value}))}/></Field>
            <p style={sec}>👶 Dados da criança (opcional)</p>
            <AnamneseForm data={newAnamnese} onChange={setNewAnamnese} titulo={null}/>
            <div style={{display:"flex",gap:10,marginTop:24}}>
              <button onClick={()=>{setShowNew(false);setNewClient({nome_mae:"",email:"",telefone:"",servico:"",modalidade:"",data:"",hora:"",valor:"",obs:"",cpf_mae:"",pagamento_link:""});setNewAnamnese({});}} style={{flex:1,padding:12,borderRadius:10,background:"#fff",border:"1.5px solid #e8e0d8",cursor:"pointer",color:"#666"}}>Cancelar</button>
              <button disabled={salvando} onClick={async()=>{setSalvando(true);try{const ex=await getClienteByTelefone(newClient.telefone);let cid;const filhos=newAnamnese.nome_crianca?[newAnamnese]:[];if(ex&&ex.length>0){cid=ex[0].id;await atualizarCliente(cid,{nome_mae:newClient.nome_mae,email:newClient.email,cpf_mae:newClient.cpf_mae,filhos,anamnese:newAnamnese,updated_at:new Date().toISOString()});}else{const nc=await criarCliente({nome_mae:newClient.nome_mae,email:newClient.email,telefone:newClient.telefone,cpf_mae:newClient.cpf_mae,atipico:newAnamnese.atipico==="Sim",filhos,anamnese:newAnamnese});cid=nc[0].id;}const svc=SERVICES.find(s=>s.label===newClient.servico);const modLabel=newClient.modalidade||(svc?.modalities[0]?.label)||"";const mod=svc?.modalities?.find(m=>m.label===modLabel)||svc?.modalities?.[0];const duracaoMin=mod?.duracao_min||60;await criarAgendamento({cliente_id:cid,servico:newClient.servico,servico_id:svc?.id||null,modalidade:modLabel,modalidade_id:mod?.id||null,data:newClient.data,hora:newClient.hora,valor:newClient.valor,obs:newClient.obs,cpf_mae:newClient.cpf_mae,pagamento_link:newClient.pagamento_link||null,pagamento_status:"Pendente",status:"Pendente",duracao_min:duracaoMin});setShowNew(false);setNewClient({nome_mae:"",email:"",telefone:"",servico:"",modalidade:"",data:"",hora:"",valor:"",obs:"",cpf_mae:"",pagamento_link:""});setNewAnamnese({});carregar();}catch(e){alert("Erro: "+e.message);}finally{setSalvando(false);}}} style={{flex:2,padding:12,borderRadius:10,background:salvando?"#ccc":"#1a1a1a",color:"#fff",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:salvando?"default":"pointer"}}>{salvando?"Salvando...":"Salvar agendamento"}</button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:6,marginBottom:16}}>{[["agendamentos","📅 Agenda"],["clientes","👥 Clientes"],["stats","📊 Resumo"]].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px 4px",borderRadius:8,fontSize:11,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{l}</button>)}</div>
      {loading&&<p style={{textAlign:"center",color:"#bbb",fontSize:13,padding:"30px 0"}}>Carregando...</p>}
      {!loading&&tab==="agendamentos"&&(
        <>
          <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
            <div style={{flex:1,overflowX:"auto"}}><div style={{display:"flex",gap:5}}>{["Todos",...Object.keys(STATUS_COLORS)].map(s=><button key={s} onClick={()=>setFilter(s)} style={{padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap",background:filter===s?"#1a1a1a":"#fff",color:filter===s?"#fff":"#666",border:"1.5px solid "+(filter===s?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{s}</button>)}</div></div>
            <button onClick={()=>setShowNew(true)} style={{padding:"8px 14px",borderRadius:8,background:"#b8967e",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,flexShrink:0}}>+ Novo</button>
          </div>
          {mesesDisp.length>1&&(<div style={{overflowX:"auto",marginBottom:12}}><div style={{display:"flex",gap:5}}>{[["todos","Todos"],...mesesDisp.map(m=>[m,mesAno(m+"-01")])].map(([v,l])=><button key={v} onClick={()=>setMesFiltro(v)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap",background:mesFiltro===v?"#b8967e":"#fff",color:mesFiltro===v?"#fff":"#888",border:"1.5px solid "+(mesFiltro===v?"#b8967e":"#e8e0d8"),cursor:"pointer"}}>{l}</button>)}</div></div>)}
          {filtered.length===0&&<p style={{textAlign:"center",color:"#bbb",fontSize:14,marginTop:40}}>Nenhum agendamento</p>}
          {filtered.map(a=>{const st=STATUS_COLORS[a.status]||STATUS_COLORS["Pendente"];const pc=PAG_COLORS[a.pagamento_status]||PAG_COLORS["Pendente"];const cl=a.clientes||{};return(<div key={a.id} style={{padding:14,border:"1.5px solid #e8e0d8",borderRadius:12,marginBottom:10,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1,cursor:"pointer"}} onClick={()=>setSelected(a.id)}><p style={{margin:0,fontWeight:600,fontSize:14,color:"#1a1a1a"}}>{cl.nome_mae||"—"}</p><p style={{margin:"3px 0 0",fontSize:12,color:"#555"}}>{a.servico}{a.modalidade?` — ${a.modalidade}`:""}</p><p style={{margin:"2px 0 0",fontSize:11,color:"#999"}}>{formatDateBR(a.data)} às {a.hora}</p><div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:st.bg,color:st.color}}>{a.status}</span><span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {a.pagamento_status||"Pendente"}</span></div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,marginLeft:8,flexShrink:0}}><p style={{fontSize:14,fontWeight:700,color:"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {Number(a.valor||0).toFixed(2).replace(".",",")}</p><button onClick={async(e)=>{e.stopPropagation();if(!window.confirm(`Deletar agendamento de ${cl.nome_mae||"cliente"}?`))return;try{await deletarAgendamento(a.id);await carregar();}catch(err){alert("Erro: "+err.message);}}} style={{padding:"3px 8px",borderRadius:6,background:"#fde8e8",border:"1px solid #f4a0a0",cursor:"pointer",fontSize:11,color:"#c62828",fontWeight:600,lineHeight:1.4}}>🗑</button></div></div></div>);})}
        </>
      )}
      {!loading&&tab==="clientes"&&(
        <>
          <p style={{fontSize:12,color:"#999",marginBottom:12}}>{clientes.length} cliente{clientes.length!==1?"s":""} cadastrada{clientes.length!==1?"s":""}</p>
          {clientes.length===0&&<p style={{textAlign:"center",color:"#bbb",fontSize:14,marginTop:40}}>Nenhuma cliente ainda</p>}
          {clientes.map(c=>{const dias=diasDesde(c.ultimo_ensaio);const badge=dias<90?{label:"Frequente 🌟",bg:"#e6f4ea",color:"#2e7d32"}:dias<180?{label:"Regular",bg:"#e3f2fd",color:"#1565C0"}:c.ultimo_ensaio?{label:"Retorno",bg:"#fff8e1",color:"#f57c00"}:{label:"Nova",bg:"#f3e5f5",color:"#7b1fa2"};return(<div key={c.id} onClick={()=>setSelectedCliente(c.id)} style={{padding:14,border:"1.5px solid #e8e0d8",borderRadius:12,marginBottom:10,cursor:"pointer",background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><p style={{margin:0,fontWeight:600,fontSize:14}}>{c.nome_mae}</p><p style={{margin:"3px 0 0",fontSize:12,color:"#999"}}>{c.filhos?.length>0?`👶 ${c.filhos.length} filho(s)`:""}</p><p style={{margin:"3px 0 0",fontSize:11,color:"#b8967e"}}>{c.total_ensaios||0} ensaio{(c.total_ensaios||0)!==1?"s":""} · último: {formatDateBR(c.ultimo_ensaio)}</p></div><span style={{padding:"3px 8px",borderRadius:12,fontSize:10,fontWeight:700,background:badge.bg,color:badge.color,flexShrink:0}}>{badge.label}</span></div></div>);})}
        </>
      )}
    </div>
  );
}

// ─── ESTÚDIO VIEW ─────────────────────────────────────────────────
function EstudioView() {
  const [expandido,setExpandido] = useState(null);
  const C = { primary:"#b8967e", light:"#f5f0eb", border:"#e8e0d8", text:"#3d2b1f", muted:"#a09080" };
  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#b8967e,#d4b89a)",borderRadius:14,padding:"20px 18px",marginBottom:20,color:"#fff",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:8}}>🐘</div>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,margin:"0 0 6px"}}>Crescidinhos Fotografia</h2>
        <p style={{fontSize:12,opacity:.9,margin:0}}>{PHOTOGRAPHER.endereco}</p>
      </div>
      <div style={{background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:16}}>
        <p style={{fontSize:11,color:C.primary,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>📞 Contato</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <a href={`https://wa.me/${PHOTOGRAPHER.whatsapp}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:10,background:"#e8f5e9",textDecoration:"none",fontSize:13,fontWeight:600,color:"#2e7d32"}}>
            💬 WhatsApp
          </a>
          <a href={`https://instagram.com/${PHOTOGRAPHER.instagram.replace("@","")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:10,background:"#fce4ec",textDecoration:"none",fontSize:13,fontWeight:600,color:"#c2185b"}}>
            📸 Instagram
          </a>
        </div>
        <div style={{marginTop:10,padding:"10px 12px",background:"#faf8f5",borderRadius:8}}>
          <p style={{fontSize:12,color:C.muted,margin:"0 0 2px"}}>Endereço</p>
          <p style={{fontSize:13,fontWeight:600,color:C.text,margin:0}}>{PHOTOGRAPHER.endereco}</p>
        </div>
      </div>
      <p style={{fontSize:11,color:C.primary,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Nossos serviços</p>
      {SERVICES.filter(s=>s.grupo!=="cofrinho"&&s.grupo!=="vale").map(s=>(
        <div key={s.id} style={{background:"#fff",border:`1.5px solid ${expandido===s.id?C.primary:C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden"}}>
          <button onClick={()=>setExpandido(expandido===s.id?null:s.id)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <span style={{fontSize:14,fontWeight:600,color:C.text}}>{s.label}</span>
            </div>
            <span style={{fontSize:16,color:C.muted,transform:expandido===s.id?"rotate(180deg)":"none",transition:"transform .2s"}}>›</span>
          </button>
          {expandido===s.id&&(
            <div style={{padding:"0 14px 14px"}}>
              <p style={{fontSize:12,color:C.muted,lineHeight:1.6,margin:"0 0 10px"}}>{s.detail}</p>
              {s.modalities.map(m=>(
                <div key={m.id} style={{padding:"8px 10px",background:C.light,borderRadius:8,marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:13,fontWeight:600,color:C.text}}>{m.label}</span>
                    <span style={{fontSize:13,fontWeight:700,color:C.primary}}>{m.price?`R$ ${Number(m.price).toLocaleString("pt-BR")}`:"A combinar"}</span>
                  </div>
                  {m.detail&&<p style={{fontSize:11,color:C.muted,margin:"3px 0 0"}}>{m.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PAINEL DO CLIENTE ────────────────────────────────────────────
function ClientePanel() {
  // ── Estado principal ──
  const [logado,setLogado]=useState(null);
  const [agendamentos,setAgendamentos]=useState([]);
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState("agendamentos");
  const [galeriaAg,setGaleriaAg]=useState(null);
  const [editandoPerfil,setEditandoPerfil]=useState(false);
  const [perfilForm,setPerfilForm]=useState({});
  const [salvandoPerfil,setSalvandoPerfil]=useState(false);

  // ── Estado de autenticação ──
  const [authTela,setAuthTela]=useState('verificando');
  // valores: 'verificando','email','pin','bio','setup','setup-pin','setup-bio'
  const [email,setEmail]=useState('');
  const [pinInput,setPinInput]=useState('');
  const [bioDisponivel,setBioDisponivel]=useState(false);
  const [temPIN,setTemPIN]=useState(false);
  const [temBio,setTemBio]=useState(false);
  const [erroAuth,setErroAuth]=useState('');
  const [setupPinStep,setSetupPinStep]=useState(1);
  const [setupPin1,setSetupPin1]=useState('');

  // ── Init ──
  useEffect(()=>{
    if(window.PublicKeyCredential){
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok=>setBioDisponivel(ok)).catch(()=>setBioDisponivel(false));
    }
    verificarSessao();
  },[]);

  const verificarSessao=async()=>{
    try{
      const sess=JSON.parse(localStorage.getItem('cresci_session')||'null');
      if(sess&&sess.expires>Date.now()&&sess.email){
        const em=sess.email;
        setEmail(em);
        const hasPIN=!!localStorage.getItem(`cresci_pin_${em}`);
        const hasBio=!!localStorage.getItem('cresci_bio_credId')&&localStorage.getItem('cresci_bio_email')===em;
        setTemPIN(hasPIN);setTemBio(hasBio);
        if(hasBio){setAuthTela('bio');}
        else if(hasPIN){setAuthTela('pin');}
        else{await loginComEmail(em);return;}
      } else {setAuthTela('email');}
    }catch(e){setAuthTela('email');}
  };

  const hashPIN=async(pin)=>{
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  };

  const loginComEmail=async(emailParam)=>{
    const em=emailParam||email;
    if(!em)return;
    setLoading(true);setErroAuth('');
    try{
      const r=await getClienteByEmail(em);
      if(r&&r.length>0){
        const cl=r[0];
        setLogado(cl);
        const ags=await getAgendamentosByCliente(cl.id);
        setAgendamentos(ags||[]);
        localStorage.setItem('cresci_session',JSON.stringify({email:em,clienteId:cl.id,nome:cl.nome_mae,expires:Date.now()+(7*24*60*60*1000)}));
        const hasPIN=!!localStorage.getItem(`cresci_pin_${em}`);
        const hasBio=!!localStorage.getItem('cresci_bio_credId')&&localStorage.getItem('cresci_bio_email')===em;
        setTemPIN(hasPIN);setTemBio(hasBio);
        if(!hasPIN&&!hasBio){setAuthTela('setup');}
      } else {setErroAuth('E-mail não encontrado. Verifique ou fale com a Crescidinhos.');}
    }catch(e){setErroAuth('Erro ao verificar. Tente novamente.');}
    setLoading(false);
  };

  const loginComPIN=async()=>{
    if(pinInput.length<4){setErroAuth('PIN deve ter 4 a 6 dígitos');return;}
    setLoading(true);setErroAuth('');
    try{
      const h=await hashPIN(pinInput);
      const savedH=localStorage.getItem(`cresci_pin_${email}`);
      if(h===savedH){await loginComEmail(email);}
      else{setErroAuth('PIN incorreto');setPinInput('');}
    }catch(e){setErroAuth('Erro ao verificar PIN');}
    setLoading(false);
  };

  const loginComBio=async()=>{
    setLoading(true);setErroAuth('');
    try{
      const credIdB64=localStorage.getItem('cresci_bio_credId');
      if(!credIdB64){setErroAuth('Biometria não configurada');setLoading(false);return;}
      const credId=Uint8Array.from(atob(credIdB64),c=>c.charCodeAt(0));
      const challenge=crypto.getRandomValues(new Uint8Array(32));
      const rpId=window.location.hostname==='localhost'?'localhost':window.location.hostname;
      await navigator.credentials.get({publicKey:{challenge,rpId,allowCredentials:[{type:'public-key',id:credId}],userVerification:'required',timeout:60000}});
      const bioEmail=localStorage.getItem('cresci_bio_email');
      await loginComEmail(bioEmail);
    }catch(e){
      if(e.name==='NotAllowedError'){setErroAuth('Biometria cancelada ou não reconhecida');}
      else{setErroAuth('Erro na biometria. Tente outra forma.');}
    }
    setLoading(false);
  };

  const configurarPIN=async()=>{
    if(pinInput.length<4){setErroAuth('Use 4 a 6 dígitos');return;}
    if(setupPinStep===1){setSetupPin1(pinInput);setPinInput('');setSetupPinStep(2);setErroAuth('');return;}
    if(pinInput!==setupPin1){setErroAuth('PINs não coincidem. Tente novamente.');setPinInput('');setSetupPinStep(1);return;}
    setLoading(true);
    const h=await hashPIN(pinInput);
    localStorage.setItem(`cresci_pin_${logado.email}`,h);
    setTemPIN(true);setSetupPinStep(1);setPinInput('');setSetupPin1('');
    if(bioDisponivel){setAuthTela('setup-bio');}else{setAuthTela(null);}
    setLoading(false);
  };

  const configurarBio=async()=>{
    setLoading(true);setErroAuth('');
    try{
      const challenge=crypto.getRandomValues(new Uint8Array(32));
      const userId=new TextEncoder().encode(logado.id.toString());
      const rpId=window.location.hostname==='localhost'?'localhost':window.location.hostname;
      const cred=await navigator.credentials.create({publicKey:{challenge,rp:{name:'Crescidinhos Fotografia',id:rpId},user:{id:userId,name:logado.email,displayName:logado.nome_mae},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},timeout:60000}});
      const credIdB64=btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
      localStorage.setItem('cresci_bio_credId',credIdB64);
      localStorage.setItem('cresci_bio_email',logado.email);
      setTemBio(true);setAuthTela(null);
    }catch(e){
      if(e.name==='NotAllowedError'){setErroAuth('Biometria cancelada.');}
      else{setErroAuth('Erro: '+e.message);}
    }
    setLoading(false);
  };

  const sair=()=>{
    const em=logado?.email||email;
    setLogado(null);setPinInput('');setErroAuth('');
    localStorage.removeItem('cresci_session');
    const hasPIN=!!localStorage.getItem(`cresci_pin_${em}`);
    const hasBio=!!localStorage.getItem('cresci_bio_credId')&&localStorage.getItem('cresci_bio_email')===em;
    setEmail(em);
    if(hasBio){setAuthTela('bio');}else if(hasPIN){setAuthTela('pin');}else{setEmail('');setAuthTela('email');}
  };

  // ── Teclado PIN ──
  const PINKeypad=({valor,onChange,onConfirm})=>(
    <div>
      <div style={{display:'flex',justifyContent:'center',gap:12,marginBottom:28}}>
        {Array.from({length:6}).map((_,i)=>(
          <div key={i} style={{width:14,height:14,borderRadius:'50%',background:i<valor.length?'#1a1a1a':'#e8e0d8',border:'2px solid '+(i<valor.length?'#1a1a1a':'#ccc'),transition:'all .15s'}}/>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,maxWidth:240,margin:'0 auto'}}>
        {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i)=>(
          <button key={i} onClick={()=>{
            if(d==='⌫'){onChange(valor.slice(0,-1));setErroAuth('');}
            else if(d===''){}
            else if(valor.length<6){onChange(valor+d);}
          }} style={{padding:'16px 0',borderRadius:12,border:'1.5px solid #e8e0d8',background:d===''?'transparent':'#fff',fontSize:d==='⌫'?18:20,fontWeight:600,color:'#1a1a1a',cursor:d===''?'default':'pointer',boxShadow:d===''?'none':'0 1px 3px rgba(0,0,0,0.06)'}}>{d}</button>
        ))}
      </div>
      {valor.length>=4&&(
        <button onClick={onConfirm} disabled={loading} style={{width:'100%',padding:13,borderRadius:10,background:'#1a1a1a',color:'#fff',border:'none',fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:'pointer',marginTop:16,maxWidth:240,display:'block',margin:'16px auto 0'}}>
          {loading?'Verificando...':'Confirmar →'}
        </button>
      )}
    </div>
  );

  const recarregarAgs=async()=>{
    if(!logado)return;
    try{const ags=await getAgendamentosByCliente(logado.id);setAgendamentos(ags||[]);}catch(e){}
  };
  useEffect(()=>{if(logado&&(tab==="agendamentos"||tab==="contratos"))recarregarAgs();},[tab,logado?.id]);

  const salvarPerfil=async()=>{setSalvandoPerfil(true);try{await atualizarCliente(logado.id,perfilForm);setLogado(l=>({...l,...perfilForm}));setEditandoPerfil(false);}catch(e){alert("Erro ao salvar: "+e.message);}setSalvandoPerfil(false);};

  // ── Telas de autenticação ──
  if(!logado||authTela==='setup'||authTela==='setup-pin'||authTela==='setup-bio'){

    if(authTela==='verificando'){
      return <div style={{textAlign:'center',padding:'80px 16px'}}><div style={{fontSize:48}}>🐘</div><p style={{color:'#aaa',marginTop:12,fontSize:13}}>Carregando...</p></div>;
    }

    if(authTela==='email'||(!authTela&&!logado)){
      return(
        <div style={{textAlign:"center",padding:"48px 16px"}}>
          <div style={{fontSize:48,marginBottom:16}}>🐘</div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:"#1a1a1a",marginBottom:8}}>Minha Área</h2>
          <p style={{fontSize:13,color:"#888",marginBottom:24,lineHeight:1.6}}>Acesse seus agendamentos, contratos e Cofrinho 🌸</p>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:14,padding:20,textAlign:"left",marginBottom:16}}>
            <Field label="Seu e-mail cadastrado">
              <input style={inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErroAuth('');}} onKeyDown={e=>e.key==="Enter"&&loginComEmail()}/>
            </Field>
            {erroAuth&&<p style={{fontSize:12,color:'#c62828',margin:'-8px 0 12px',textAlign:'center'}}>{erroAuth}</p>}
            <button onClick={()=>loginComEmail()} disabled={loading||!email} style={{width:"100%",padding:13,borderRadius:10,background:email?"#1a1a1a":"#e8e0d8",color:email?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:email?"pointer":"default"}}>
              {loading?"Verificando...":"Acessar minha área →"}
            </button>
          </div>
          <p style={{fontSize:12,color:"#aaa",lineHeight:1.6}}>Não tem cadastro?<br/>Faça um agendamento e a Crescidinhos cria seu perfil 🤍</p>
        </div>
      );
    }

    if(authTela==='pin'){
      return(
        <div style={{textAlign:'center',padding:'40px 16px'}}>
          <div style={{fontSize:44,marginBottom:12}}>🔐</div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:'#1a1a1a',marginBottom:4}}>Digite seu PIN</h2>
          <p style={{fontSize:12,color:'#888',marginBottom:28}}>Confirme seu PIN para entrar</p>
          {erroAuth&&<p style={{fontSize:12,color:'#c62828',marginBottom:16}}>{erroAuth}</p>}
          <PINKeypad valor={pinInput} onChange={v=>{setPinInput(v);setErroAuth('');}} onConfirm={loginComPIN}/>
          <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:20,flexWrap:'wrap'}}>
            {temBio&&<button onClick={()=>{setAuthTela('bio');setErroAuth('');setPinInput('');}} style={{padding:'8px 14px',borderRadius:8,background:'#f5f0eb',border:'none',cursor:'pointer',fontSize:12,color:'#b8967e',fontWeight:600}}>👆 Usar digital</button>}
            <button onClick={()=>{setAuthTela('email');setErroAuth('');setPinInput('');setEmail('');}} style={{padding:'8px 14px',borderRadius:8,background:'#f5f0eb',border:'none',cursor:'pointer',fontSize:12,color:'#888'}}>📧 Usar e-mail</button>
          </div>
        </div>
      );
    }

    if(authTela==='bio'){
      return(
        <div style={{textAlign:'center',padding:'48px 16px'}}>
          <div style={{fontSize:64,marginBottom:16}}>👆</div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:'#1a1a1a',marginBottom:8}}>Acesso rápido</h2>
          <p style={{fontSize:13,color:'#888',marginBottom:32,lineHeight:1.6}}>Use sua digital ou reconhecimento facial para entrar.</p>
          {erroAuth&&<p style={{fontSize:12,color:'#c62828',marginBottom:16}}>{erroAuth}</p>}
          <button onClick={loginComBio} disabled={loading} style={{width:'100%',padding:14,borderRadius:10,background:'#1a1a1a',color:'#fff',border:'none',fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:'pointer',marginBottom:12}}>
            {loading?'Verificando...':'👆 Entrar com biometria'}
          </button>
          <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:8,flexWrap:'wrap'}}>
            {temPIN&&<button onClick={()=>{setAuthTela('pin');setErroAuth('');setPinInput('');}} style={{padding:'8px 14px',borderRadius:8,background:'#f5f0eb',border:'none',cursor:'pointer',fontSize:12,color:'#b8967e',fontWeight:600}}>🔢 Usar PIN</button>}
            <button onClick={()=>{setAuthTela('email');setErroAuth('');setPinInput('');setEmail('');}} style={{padding:'8px 14px',borderRadius:8,background:'#f5f0eb',border:'none',cursor:'pointer',fontSize:12,color:'#888'}}>📧 Usar e-mail</button>
          </div>
        </div>
      );
    }

    if(authTela==='setup'){
      return(
        <div style={{padding:'32px 16px',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:12}}>🔒</div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:'#1a1a1a',marginBottom:8}}>Proteja sua conta</h2>
          <p style={{fontSize:13,color:'#888',marginBottom:28,lineHeight:1.6}}>Adicione uma camada de segurança para próximos acessos. 🌸</p>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
            <button onClick={()=>{setSetupPinStep(1);setPinInput('');setSetupPin1('');setAuthTela('setup-pin');}} style={{padding:14,borderRadius:10,background:'#1a1a1a',color:'#fff',border:'none',fontFamily:"'Cormorant Garamond',serif",fontSize:15,cursor:'pointer'}}>🔢 Criar PIN</button>
            {bioDisponivel&&<button onClick={()=>setAuthTela('setup-bio')} style={{padding:14,borderRadius:10,background:'#fff',color:'#1a1a1a',border:'1.5px solid #1a1a1a',fontFamily:"'Cormorant Garamond',serif",fontSize:15,cursor:'pointer'}}>👆 Ativar digital / Face ID</button>}
            <button onClick={()=>setAuthTela(null)} style={{padding:12,borderRadius:10,background:'transparent',color:'#aaa',border:'none',fontSize:13,cursor:'pointer'}}>Agora não</button>
          </div>
        </div>
      );
    }

    if(authTela==='setup-pin'){
      return(
        <div style={{textAlign:'center',padding:'32px 16px'}}>
          <div style={{fontSize:44,marginBottom:12}}>🔢</div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:'#1a1a1a',marginBottom:4}}>
            {setupPinStep===1?'Crie seu PIN':'Confirme seu PIN'}
          </h2>
          <p style={{fontSize:12,color:'#888',marginBottom:28}}>
            {setupPinStep===1?'Digite de 4 a 6 números':'Digite novamente para confirmar'}
          </p>
          {erroAuth&&<p style={{fontSize:12,color:'#c62828',marginBottom:12}}>{erroAuth}</p>}
          <PINKeypad valor={pinInput} onChange={v=>{setPinInput(v);setErroAuth('');}} onConfirm={configurarPIN}/>
          <button onClick={()=>{setAuthTela('setup');setPinInput('');setSetupPinStep(1);setErroAuth('');}} style={{marginTop:16,padding:'8px 14px',borderRadius:8,background:'transparent',border:'none',cursor:'pointer',fontSize:12,color:'#aaa'}}>← Voltar</button>
        </div>
      );
    }

    if(authTela==='setup-bio'){
      return(
        <div style={{textAlign:'center',padding:'48px 16px'}}>
          <div style={{fontSize:64,marginBottom:16}}>👆</div>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:'#1a1a1a',marginBottom:8}}>Ativar digital / Face ID</h2>
          <p style={{fontSize:13,color:'#888',marginBottom:32,lineHeight:1.6}}>Seu celular pedirá confirmação biométrica para cadastrar.</p>
          {erroAuth&&<p style={{fontSize:12,color:'#c62828',marginBottom:16}}>{erroAuth}</p>}
          <button onClick={configurarBio} disabled={loading} style={{width:'100%',padding:14,borderRadius:10,background:'#1a1a1a',color:'#fff',border:'none',fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:'pointer',marginBottom:12}}>
            {loading?'Aguardando...':'👆 Ativar biometria'}
          </button>
          <button onClick={()=>setAuthTela(null)} style={{padding:'8px 14px',borderRadius:8,background:'transparent',border:'none',cursor:'pointer',fontSize:12,color:'#aaa'}}>Pular por agora</button>
        </div>
      );
    }
  }

  // ── Painel principal ──
  const cofrinho=logado.cofrinho;
  const endereco=logado.endereco||{};

  return(
    <div>
      <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:"14px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:36}}>🐘</div>
        <div><p style={{margin:0,fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:"#1a1a1a"}}>Olá, {logado.nome_mae?.split(" ")[0]}! 🌸</p><p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>{logado.email}</p></div>
        <button onClick={sair} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:8,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:12,color:"#666"}}>Sair</button>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto"}}>
        {[["agendamentos","📅 Ensaios"],["contratos","📄 Contratos"],["cofrinho","💰 Cofrinho"],["vale","🎁 Vale"],["estudio","🐘 Estúdio"],["perfil","👤 Perfil"]].map(([t,l])=>
          <button key={t} onClick={()=>setTab(t)} style={{flex:"0 0 auto",padding:"9px 14px",borderRadius:8,fontSize:11,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
        )}
      </div>

      {tab==="agendamentos"&&(
        <div>
          {agendamentos.length===0&&<div style={{textAlign:"center",padding:"40px 16px"}}><div style={{fontSize:40,marginBottom:12}}>📭</div><p style={{fontSize:14,color:"#bbb"}}>Nenhum ensaio ainda</p></div>}
          {agendamentos.map(a=>{const st=STATUS_COLORS[a.status]||STATUS_COLORS["Pendente"];const pc=PAG_COLORS[a.pagamento_status]||PAG_COLORS["Pendente"];const galeriaAberta=galeriaAg===a.id;return(
            <div key={a.id} style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div><p style={{margin:0,fontSize:14,fontWeight:700,color:"#1a1a1a"}}>{a.servico}</p><p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>{a.modalidade}</p></div>
                <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.color}}>{a.status}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><p style={{fontSize:10,color:"#aaa",margin:"0 0 2px"}}>Data</p><p style={{fontSize:13,fontWeight:600,margin:0}}>{formatDateBR(a.data)} às {a.hora}</p></div>
                <div><p style={{fontSize:10,color:"#aaa",margin:"0 0 2px"}}>Valor</p><p style={{fontSize:13,fontWeight:600,margin:0}}>R$ {Number(a.valor||0).toFixed(2).replace(".",",")}</p></div>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:a.pagamento_link||a.status==="Confirmado"?8:0}}>
                <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {a.pagamento_status||"Pendente"}</span>
                <button onClick={()=>setGaleriaAg(galeriaAberta?null:a.id)} style={{padding:"4px 12px",borderRadius:8,background:galeriaAberta?"#1a1a1a":"#f5f0eb",color:galeriaAberta?"#fff":"#b8967e",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}>📷 {galeriaAberta?"Fechar":"Ver galeria"}</button>
              </div>
              {a.pagamento_link&&a.pagamento_status!=="Pago"&&<a href={a.pagamento_link} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",padding:"10px",borderRadius:8,background:"#1565C0",color:"#fff",textDecoration:"none",fontSize:13,fontWeight:600,boxSizing:"border-box",marginBottom:6}}>💳 Realizar pagamento →</a>}
              {(a.status==="Confirmado"||a.signature)&&<a href={`https://app.crescidinhosfoto.com.br/contrato/${a.id}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",padding:"10px",borderRadius:8,background:"#f5f0eb",color:"#b8967e",textDecoration:"none",fontSize:13,fontWeight:600,boxSizing:"border-box",border:"1.5px solid #e8e0d8"}}>📄 Ver / assinar contrato →</a>}
              {galeriaAberta&&<div style={{marginTop:14,borderTop:"1px solid #f0e8e0",paddingTop:14}}><GaleriaCliente agendamento={a}/></div>}
            </div>
          );})}
        </div>
      )}

      {tab==="contratos"&&(
        <div>
          {agendamentos.filter(a=>a.signature||a.status==="Contrato").length===0&&<div style={{textAlign:"center",padding:"40px 16px"}}><div style={{fontSize:40,marginBottom:12}}>📄</div><p style={{fontSize:14,color:"#bbb"}}>Nenhum contrato ainda</p></div>}
          {agendamentos.filter(a=>a.signature||a.status==="Contrato").map(a=>(
            <div key={a.id} style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:10}}>
              <p style={{margin:0,fontSize:14,fontWeight:700}}>{a.servico} — {a.modalidade}</p>
              <p style={{margin:"4px 0 8px",fontSize:12,color:"#888"}}>{formatDateBR(a.data)} · Nº {a.contrato_numero||"—"}</p>
              {a.signature&&a.signature_contratada
                ?<span style={{fontSize:12,color:"#2e7d32",fontWeight:600}}>✅ Assinado em {a.signed_at}</span>
                :<a href={`https://app.crescidinhosfoto.com.br/contrato/${a.id}`} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#72243E",fontWeight:600}}>✍️ Assinar contrato →</a>
              }
            </div>
          ))}
        </div>
      )}

      {tab==="cofrinho"&&(
        <div>
          {cofrinho?(
            <div style={{background:"linear-gradient(135deg,#D9A7B4,#698494)",borderRadius:16,padding:20,color:"#fff"}}>
              <p style={{fontSize:11,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 4px",opacity:.8}}>Cofrinho de Recordações</p>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:"0 0 4px"}}>{cofrinho.plano}</p>
              <p style={{fontSize:14,margin:"0 0 16px",opacity:.9}}>R$ {cofrinho.saldo?.toLocaleString("pt-BR")} de saldo</p>
              <div style={{background:"rgba(255,255,255,0.2)",borderRadius:8,height:8,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(cofrinho.meses_pagos/12)*100)}%`,background:"#fff",borderRadius:8}}/></div>
              <p style={{fontSize:11,margin:"6px 0 0",opacity:.8}}>{cofrinho.meses_pagos} meses pagos · Resgate após 3 meses</p>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"40px 16px"}}>
              <div style={{fontSize:40,marginBottom:12}}>💰</div>
              <p style={{fontSize:14,fontWeight:700,color:"#1a1a1a",marginBottom:8}}>Cofrinho de Recordações</p>
              <p style={{fontSize:13,color:"#888",marginBottom:20,lineHeight:1.6}}>Acumule saldo mensalmente e resgate em ensaios. 🌸</p>
              <a href="https://wa.me/5514996845521?text=Olá! Quero assinar o Cofrinho 💰" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 24px",borderRadius:10,background:"#25D366",color:"#fff",textDecoration:"none",fontSize:14,fontWeight:600}}>💬 Quero assinar</a>
            </div>
          )}
        </div>
      )}

      {tab==="vale"&&(
        <div>
          {agendamentos.filter(a=>a.servico_id==="vale"||(a.obs||'').includes('VALE:')).length>0?(
            agendamentos.filter(a=>a.servico_id==="vale"||(a.obs||'').includes('VALE:')).map(a=>(
              <div key={a.id} style={{background:"linear-gradient(135deg,#72243E,#b8967e)",borderRadius:14,padding:18,marginBottom:12,color:"#fff"}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,margin:"0 0 4px"}}>Vale Presente</p>
                <p style={{fontSize:24,fontWeight:700,margin:"0 0 8px"}}>R$ {Number(a.valor||0).toFixed(2).replace(".",",")}</p>
                <p style={{fontSize:11,opacity:.7}}>{a.status==="Concluído"?"✅ Utilizado":"⏳ Disponível"}</p>
              </div>
            ))
          ):(
            <div style={{textAlign:"center",padding:"40px 16px"}}>
              <div style={{fontSize:40,marginBottom:12}}>🎁</div>
              <a href="https://wa.me/5514996845521?text=Olá! Quero comprar um Vale Presente 🎁" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 24px",borderRadius:10,background:"#72243E",color:"#fff",textDecoration:"none",fontSize:14,fontWeight:600}}>🎁 Comprar vale presente</a>
            </div>
          )}
        </div>
      )}

      {tab==="estudio"&&<EstudioView/>}

      {tab==="perfil"&&(
        <div>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:0}}>Seus dados</p>
              <button onClick={()=>{setEditandoPerfil(!editandoPerfil);setPerfilForm({nome_mae:logado.nome_mae||"",email:logado.email||"",cpf_mae:logado.cpf_mae||"",rg:logado.rg||"",data_nascimento:logado.data_nascimento||"",endereco:logado.endereco||{}});}} style={{padding:"5px 10px",borderRadius:7,background:"#f0f4ff",border:"1px solid #c0d0ff",cursor:"pointer",fontSize:12,color:"#1565C0",fontWeight:600}}>✏️ Atualizar</button>
            </div>
            {editandoPerfil?(
              <div>
                {[["nome_mae","Nome completo"],["email","E-mail"],["cpf_mae","CPF"],["rg","RG"],["data_nascimento","Data de nascimento"]].map(([k,l])=>(
                  <Field key={k} label={l}><input style={{...inp,marginBottom:0}} value={perfilForm[k]||""} onChange={e=>setPerfilForm(f=>({...f,[k]:e.target.value}))}/></Field>
                ))}
                <p style={{...sec,marginTop:12}}>Endereço</p>
                {[["cep","CEP"],["rua","Rua e número"],["complemento","Complemento"],["bairro","Bairro"],["cidade","Cidade"]].map(([k,l])=>(
                  <Field key={k} label={l}><input style={{...inp,marginBottom:0}} value={perfilForm.endereco?.[k]||""} onChange={e=>setPerfilForm(f=>({...f,endereco:{...f.endereco,[k]:e.target.value}}))}/></Field>
                ))}
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button onClick={()=>setEditandoPerfil(false)} style={{flex:1,padding:10,borderRadius:8,background:"#fff",border:"1.5px solid #e8e0d8",cursor:"pointer",fontSize:13,color:"#666"}}>Cancelar</button>
                  <button disabled={salvandoPerfil} onClick={salvarPerfil} style={{flex:2,padding:10,borderRadius:8,background:"#1a1a1a",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600}}>{salvandoPerfil?"Salvando...":"Salvar"}</button>
                </div>
              </div>
            ):(
              <div>
                {[["Nome",logado.nome_mae],["E-mail",logado.email],["WhatsApp",logado.telefone],["CPF",logado.cpf_mae],["RG",logado.rg],["Nascimento",logado.data_nascimento]].map(([k,v])=>v?(
                  <div key={k} style={{marginBottom:8}}><p style={{fontSize:10,color:"#aaa",margin:"0 0 2px"}}>{k}</p><p style={{fontSize:13,fontWeight:600,margin:0}}>{v}</p></div>
                ):null)}
                {(endereco.rua||endereco.cidade)&&(
                  <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #f0e8e0"}}>
                    <p style={{fontSize:10,color:"#aaa",margin:"0 0 2px"}}>Endereço</p>
                    <p style={{fontSize:13,fontWeight:600,margin:0}}>{[endereco.rua,endereco.complemento,endereco.bairro,endereco.cidade].filter(Boolean).join(", ")}{endereco.cep?" — CEP "+endereco.cep:""}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          {logado.filhos?.length>0&&(
            <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
              <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>👶 Filhos</p>
              {logado.filhos.map((f,i)=>(
                <div key={i} style={{padding:"10px 0",borderBottom:"1px solid #f0e8e0"}}>
                  <p style={{margin:0,fontSize:13,fontWeight:600}}>{f.nome_crianca} · {f.idade}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>{f.atipico==="Sim"?"🧡 Atípico":"🌿 Típico"}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 14px"}}>🔒 Segurança</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:600}}>🔢 PIN</p>
                <p style={{margin:'2px 0 0',fontSize:11,color:temPIN?'#2e7d32':'#aaa'}}>{temPIN?'✅ Configurado':'Não configurado'}</p>
              </div>
              <button onClick={()=>{setSetupPinStep(1);setPinInput('');setSetupPin1('');setAuthTela('setup-pin');}} style={{padding:'6px 12px',borderRadius:8,background:'#f5f0eb',border:'none',cursor:'pointer',fontSize:12,color:'#b8967e',fontWeight:600}}>{temPIN?'Alterar':'Ativar'}</button>
            </div>
            {bioDisponivel&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid #f0e8e0'}}>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:600}}>👆 Digital / Face ID</p>
                  <p style={{margin:'2px 0 0',fontSize:11,color:temBio?'#2e7d32':'#aaa'}}>{temBio?'✅ Configurado':'Não configurado'}</p>
                </div>
                <button onClick={()=>setAuthTela('setup-bio')} style={{padding:'6px 12px',borderRadius:8,background:'#f5f0eb',border:'none',cursor:'pointer',fontSize:12,color:'#b8967e',fontWeight:600}}>{temBio?'Reconfigurar':'Ativar'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CLIENT BOOKING FLOW ──────────────────────────────────────────
function ClientView() {
  const [step,setStep]=useState(1);
  const [service,setService]=useState(null);
  const [modality,setModality]=useState(null);
  const [extras,setExtras]=useState([]);
  const [date,setDate]=useState(null);
  const [time,setTime]=useState(null);
  const [horariosDisponiveis,setHorariosDisponiveis]=useState([]);
  const [datasDisponiveis,setDatasDisponiveis]=useState(null);
  const [dadosEvento,setDadosEvento]=useState({});
  const [submitted,setSubmitted]=useState(false);
  const [loading,setLoading]=useState(false);
  const [clienteExistente,setClienteExistente]=useState(null);
  const [verificando,setVerificando]=useState(false);
  // Vale Presente
  const [resgatandoVale,setResgatandoVale]=useState(false);
  const [valeComprando,setValeComprando]=useState(false);
  const [valeValorLivreMode,setValeValorLivreMode]=useState(false);
  const [valeValorLivreInput,setValeValorLivreInput]=useState('');
  const [valeCodeInput,setValeCodeInput]=useState('');
  const [valeEncontrado,setValeEncontrado]=useState(null);
  const [loadingVale,setLoadingVale]=useState(false);
  const [erroVale,setErroVale]=useState('');
  const [codigoGerado,setCodigoGerado]=useState('');
  const [linkPagamento,setLinkPagamento]=useState('');

  const cadastroSalvo=(()=>{try{return JSON.parse(sessionStorage.getItem("cres_cadastro")||"{}");}catch{return {};}})();
  const [cadastro,setCadastroRaw]=useState({
    nome_mae:"",email:"",telefone:"",cpf:"",rg:"",data_nascimento:"",
    endereco_cep:"",endereco_rua:"",endereco_complemento:"",endereco_bairro:"",endereco_cidade:"Bauru",
    temFilho:"",
    ...cadastroSalvo
  });
  const [filhos,setFilhosRaw]=useState(()=>{try{return JSON.parse(sessionStorage.getItem("cres_filhos")||"[{}]");}catch{return [{}];}});

  const setCadastro=(fn)=>{setCadastroRaw(prev=>{const next=typeof fn==="function"?fn(prev):fn;try{sessionStorage.setItem("cres_cadastro",JSON.stringify(next));}catch{}return next;});};
  const setFilhos=(fn)=>{setFilhosRaw(prev=>{const next=typeof fn==="function"?fn(prev):fn;try{sessionStorage.setItem("cres_filhos",JSON.stringify(next));}catch{}return next;});};
  const setCad=(k,v)=>setCadastro(p=>({...p,[k]:v}));
  const limparSessao=()=>{try{sessionStorage.removeItem("cres_cadastro");sessionStorage.removeItem("cres_filhos");}catch{}};

  const semAgenda=service?.grupo==="cofrinho"||service?.grupo==="vale"||valeComprando;
  const precisaDadosEvento=service&&requerDadosEvento(service.id);
  const STEPS=semAgenda?["Cadastro","Serviço","Confirmar"]:["Cadastro","Serviço","Data","Confirmar"];

  const verificarCliente=async(telefone)=>{
    const tel=telefone.replace(/\D/g,"");
    if(tel.length<10)return;
    setVerificando(true);
    try{
      const r=await getClienteByTelefone(tel);
      if(r&&r.length>0){
        const cl=r[0];
        setClienteExistente(cl);
        setCadastro({nome_mae:cl.nome_mae||"",email:cl.email||"",cpf:cl.cpf_mae||"",telefone:tel,temFilho:cl.filhos?.length>0?"Sim":cl.anamnese?.nome_crianca?"Sim":"",rg:"",data_nascimento:"",endereco_cep:"",endereco_rua:"",endereco_complemento:"",endereco_bairro:"",endereco_cidade:"Bauru"});
      }else{setClienteExistente(null);}
    }catch(e){}
    setVerificando(false);
  };

  const addFilho=()=>setFilhos(f=>[...f,{}]);
  const removeFilho=(i)=>setFilhos(f=>f.filter((_,idx)=>idx!==i));
  const updateFilho=(i,data)=>setFilhos(f=>f.map((x,idx)=>idx===i?data:x));

  const validarVale=async()=>{
    const code=valeCodeInput.trim().toUpperCase();
    if(!code){setErroVale('Digite o código do vale');return;}
    setLoadingVale(true);setErroVale('');
    try{
      const r=await buscarValeByCode(code);
      if(r&&r.length>0){
        setValeEncontrado(r[0]);
      } else {
        setErroVale('Código não encontrado ou vale já utilizado. Verifique e tente novamente.');
      }
    }catch(e){setErroVale('Erro ao validar. Tente novamente.');}
    setLoadingVale(false);
  };

  const handleSubmit=async()=>{
    setLoading(true);
    try{
      const tel=cadastro.telefone.replace(/\D/g,"");
      let cid;
      const ex=await getClienteByTelefone(tel);
      const filhosData=cadastro.temFilho==="Sim"&&!clienteExistente?filhos:[];
      const anamnese=filhosData[0]||{};
      const enderecoObj={cep:cadastro.endereco_cep,rua:cadastro.endereco_rua,complemento:cadastro.endereco_complemento,bairro:cadastro.endereco_bairro,cidade:cadastro.endereco_cidade};
      const camposCliente={nome_mae:cadastro.nome_mae,email:cadastro.email,cpf_mae:cadastro.cpf,rg:cadastro.rg||null,data_nascimento:cadastro.data_nascimento||null,endereco:enderecoObj};
      if(ex&&ex.length>0){
        cid=ex[0].id;
        await atualizarCliente(cid,{nome_mae:cadastro.nome_mae,email:cadastro.email,cpf_mae:cadastro.cpf||null,updated_at:new Date().toISOString()});
      }else{
        const nc=await criarCliente({...camposCliente,telefone:tel,atipico:anamnese.atipico==="Sim",filhos:filhosData,anamnese,ultimo_ensaio:date,total_ensaios:1});
        cid=nc[0].id;
      }
      const nomeCrianca=clienteExistente
        ?(cadastro.nomeCriancaSel&&cadastro.nomeCriancaSel!=="__nova"?cadastro.nomeCriancaSel:cadastro.nomeCriancaNova||"")
        :(anamnese.nome_crianca||"");

      // ── COMPRAR vale presente ──
      if(valeComprando){
        const codigo=gerarCodigoVale();
        const isLivre=service?.id==='vale'||modality?.id==='vale-livre';
        const valor=Number(modality?.price||0);
        const servicoLabel=isLivre?'Vale Presente (Valor Livre)':service?.label||'Vale Presente';
        const modalidadeLabel=isLivre?'Valor livre':modality?.label||'';
        const extrasStr=extras.length>0?`\nAdicionais: ${extras.map(e=>e.label).join(', ')}`:'';
        const tituloMP=`Vale Presente Crescidinhos — ${servicoLabel}${modalidadeLabel?' ('+modalidadeLabel+')':''}`;
        const linkMP=await criarLinkMercadoPago(tituloMP,valor,`VALE-${codigo}`);
        await criarAgendamento({
          cliente_id:cid,
          servico:servicoLabel,servico_id:isLivre?'vale':service?.id,
          modalidade:modalidadeLabel,modalidade_id:isLivre?'vale-livre':modality?.id,
          valor,status:"Ativo",pagamento_status:"Pago",
          obs:`VALE:${codigo}`,
          pagamento_link:linkMP||null,
        });
        const msgFotografa=`🎁 *Novo Vale Presente!*\n\nCompradora: ${cadastro.nome_mae}\nPara: ${servicoLabel}${modalidadeLabel?' — '+modalidadeLabel:''}${extrasStr}\nValor: R$ ${valor.toFixed(2).replace('.',',')}\nCódigo: ${codigo}\nWhatsApp: ${cadastro.telefone}${linkMP?'\n\n💳 Link: '+linkMP:''}\n\nAguardando pagamento.`;
        const linkTxt=linkMP?`\n\n💳 *Pague agora:* ${linkMP}`:'';
        const msgCompradora=`🎁 *Seu Vale Presente foi criado!*\n\nOlá, ${cadastro.nome_mae?.split(' ')[0]}! 🌸\n\nAqui estão os dados do vale que você presenteou:\n\n🎀 *Ensaio:* ${servicoLabel}${modalidadeLabel?' — '+modalidadeLabel:''}${extrasStr}\n💰 *Valor:* R$ ${valor.toFixed(2).replace('.',',')}\n🔑 *Código:* ${codigo}${linkTxt}\n\nEncaminhe este código para a presenteada — ela usará para resgatar o ensaio no app da Crescidinhos. 🌸\n\n_Crescidinhos Fotografia_`;
        await enviarWhatsApp("14996845521",msgFotografa);
        const telCompradora=tel.replace(/\D/g,'');
        if(telCompradora.length>=10) await enviarWhatsApp(telCompradora,msgCompradora).catch(()=>{});
        setCodigoGerado(codigo);
        setLinkPagamento(linkMP||'');
        setLoading(false);limparSessao();setSubmitted(true);
        return;
      }

      // ── RESGATAR vale presente ──
      if(resgatandoVale&&valeEncontrado){
        const valorVale=Number(valeEncontrado.valor||0);
        const calc=service?.descontoExtras?calcularTotal(modality?.price||0,extras,true):{total:modality?.price||0};
        await criarAgendamento({
          cliente_id:cid,servico:service?.label,servico_id:service?.id||null,
          modalidade:modality?.label,modalidade_id:modality?.id||null,
          duracao_min:modality?.duracao_min||60,nome_crianca:nomeCrianca||null,
          data:date,hora:time,valor:calc.total||null,
          status:"Pendente",pagamento_status:valorVale>=(calc.total||0)?"Pago":"Pendente",
          obs:`Resgate do vale ${valeCodeInput.toUpperCase()}`,
          dados_evento:precisaDadosEvento?dadosEvento:null,
        });
        await marcarValeUsado(valeEncontrado.id);
        const dataFmt=date?`${date.split("-").reverse().join("/")}`:"-";
        await enviarWhatsApp("14996845521",`🎁 *Vale Presente resgatado!*\n\nPresenteada: ${cadastro.nome_mae}\nServiço: ${service?.label}${modality?.label?" — "+modality.label:""}\nData: ${dataFmt} às ${time||"-"}\nCódigo: ${valeCodeInput.toUpperCase()}\n\nAcesse o painel para confirmar.`);
        setLoading(false);limparSessao();setSubmitted(true);
        return;
      }

      // ── Agendamento normal ──
      const calc=service?.descontoExtras?calcularTotal(modality?.price||0,extras,true):{total:modality?.price||0};
      await criarAgendamento({
        cliente_id:cid,servico:service?.label,servico_id:service?.id||null,
        modalidade:modality?.label,modalidade_id:modality?.id||null,
        duracao_min:modality?.duracao_min||60,nome_crianca:nomeCrianca||null,
        data:date,hora:time,valor:calc.total||modality?.price||null,
        status:"Pendente",pagamento_status:"Pendente",
        dados_evento:precisaDadosEvento?dadosEvento:null,
      });
      const dataFmt=date?`${date.split("-").reverse().join("/")}`:"-";
      const msgEvento=dadosEvento.nome_aniversariante?`\nAniversariante: ${dadosEvento.nome_aniversariante}${dadosEvento.local_nome?"\nLocal: "+dadosEvento.local_nome:""}`: "";
      await enviarWhatsApp("14996845521",`🌸 *Novo agendamento!*\n\nCliente: ${cadastro.nome_mae}\nServiço: ${service?.label}${modality?.label?" — "+modality.label:""}\nData: ${dataFmt} às ${time||"-"}\nWhatsApp: ${cadastro.telefone}${msgEvento}\n\nAcesse o painel para confirmar.`);
      await fetch(WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome_mae:cadastro.nome_mae,email:cadastro.email,phone:cadastro.telefone,servico:service?.label,servico_id:service?.id,modalidade:modality?.label,modalidade_id:modality?.id,duracao_min:modality?.duracao_min||60,grupo:service?.grupo,data:date,hora:time,filhos:filhosData,extras:extras.map(e=>e.label),valor:calc.total,dados_evento:dadosEvento})}).catch(()=>{});
    }catch(e){console.error(e);}
    setLoading(false);limparSessao();setSubmitted(true);
  };

  const Btn=({disabled,onClick,label})=><button disabled={disabled} onClick={onClick} style={{flex:2,padding:"13px",borderRadius:10,background:!disabled?"#1a1a1a":"#e8e0d8",color:!disabled?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:!disabled?"pointer":"default"}}>{label}</button>;
  const Back=({onClick})=><button onClick={onClick} style={{flex:1,padding:"12px",borderRadius:10,background:"#fff",border:"2px solid #e8e0d8",cursor:"pointer",fontSize:14,color:"#666"}}>← Voltar</button>;

  if(submitted&&codigoGerado)return(
    <div style={{textAlign:"center",padding:"48px 16px"}}>
      <div style={{fontSize:52,marginBottom:16}}>🎁</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:"#1a1a1a",marginBottom:8}}>Vale criado com sucesso!</h2>
      <p style={{color:"#888",fontSize:13,lineHeight:1.7,marginBottom:24}}>Compartilhe o código abaixo com a presenteada. Ela usará para resgatar o ensaio. 🌸</p>
      <div style={{background:"linear-gradient(135deg,#72243E,#b8967e)",borderRadius:16,padding:24,marginBottom:20,color:"#fff"}}>
        <p style={{fontSize:12,letterSpacing:"2px",textTransform:"uppercase",margin:"0 0 8px",opacity:.8}}>Código do Vale</p>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:40,fontWeight:700,margin:"0 0 8px",letterSpacing:"6px"}}>{codigoGerado}</p>
        <p style={{fontSize:12,opacity:.7,margin:0}}>{service?.id==='vale'?'Valor livre':'Ensaio: '+service?.label+(modality?.label?' — '+modality.label:'')} · R$ {Number(modality?.price||0).toFixed(2).replace('.',',')}</p>
      </div>
      {linkPagamento?(
        <a href={linkPagamento} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:14,borderRadius:10,background:"#009EE3",color:"#fff",textDecoration:"none",fontSize:15,fontWeight:700,boxSizing:"border-box",marginBottom:10}}>
          💳 Pagar agora com Mercado Pago →
        </a>
      ):(
        <p style={{fontSize:12,color:"#aaa",marginBottom:10,lineHeight:1.6}}>⚠️ Aguardamos o pagamento para ativar o vale.</p>
      )}
      <button onClick={()=>{try{navigator.clipboard.writeText(codigoGerado);}catch(e){}alert(`Código ${codigoGerado} copiado!`);}} style={{width:"100%",padding:13,borderRadius:10,background:"#fff",border:"1.5px solid #e8e0d8",cursor:"pointer",fontSize:14,fontWeight:600,color:"#1a1a1a",marginBottom:12}}>📋 Copiar código</button>
      <p style={{fontSize:12,color:"#aaa",lineHeight:1.6}}>Envie o código para a presenteada — ela usa no app para resgatar o ensaio. 🌸</p>
    </div>
  );

  if(submitted&&resgatandoVale)return(
    <div style={{textAlign:"center",padding:"48px 16px"}}>
      <div style={{fontSize:52,marginBottom:16}}>🌸</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:"#1a1a1a",marginBottom:8}}>Vale resgatado!</h2>
      <p style={{color:"#888",fontSize:14,lineHeight:1.7,marginBottom:20}}>Em breve a <strong>Crescidinhos</strong> confirmará seu horário pelo WhatsApp. 🤍</p>
      <div style={{padding:16,background:"#faf8f5",borderRadius:12,textAlign:"left"}}>
        {[["Serviço",service?.label],["Modalidade",modality?.label],["Data",formatDateBR(date)],["Horário",time],["Nome",cadastro.nome_mae],["Vale utilizado",valeCodeInput.toUpperCase()]].filter(([,v])=>v).map(([k,v])=><p key={k} style={{fontSize:13,color:"#666",margin:"0 0 5px"}}><strong>{k}:</strong> {v}</p>)}
      </div>
    </div>
  );

  if(submitted)return(
    <div style={{textAlign:"center",padding:"48px 16px"}}>
      <div style={{fontSize:52,marginBottom:16}}>🌸</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:"#1a1a1a",marginBottom:8}}>Solicitação enviada!</h2>
      <p style={{color:"#888",fontSize:14,lineHeight:1.7,marginBottom:20}}>Em breve a <strong>Crescidinhos</strong> confirmará seu horário pelo WhatsApp. 🤍</p>
      <div style={{padding:16,background:"#faf8f5",borderRadius:12,textAlign:"left"}}>
        {[["Serviço",service?.label],["Modalidade",modality?.label],["Data",formatDateBR(date)],["Horário",time],["Nome",cadastro.nome_mae]].filter(([,v])=>v).map(([k,v])=><p key={k} style={{fontSize:13,color:"#666",margin:"0 0 5px"}}><strong>{k}:</strong> {v}</p>)}
      </div>
    </div>
  );

  const criancaOk=cadastro.temFilho!=="Sim"||(clienteExistente?(cadastro.nomeCriancaSel&&cadastro.nomeCriancaSel!=="__nova"?true:!!cadastro.nomeCriancaNova):filhos.some(f=>f.nome_crianca));
  const cadastroOk=cadastro.nome_mae&&cadastro.email&&cadastro.telefone&&cadastro.temFilho&&criancaOk;

  return(
    <div>
      <StepBar step={step} steps={STEPS}/>

      {step===1&&(
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a",marginBottom:4}}>Seus dados</h3>
          <p style={{fontSize:13,color:"#999",marginBottom:20,lineHeight:1.6}}>Preenchido uma vez, salvo para sempre 🌸</p>
          <Field label="WhatsApp" required>
            <input style={inp} type="tel" value={cadastro.telefone} onChange={e=>{setCad("telefone",e.target.value);verificarCliente(e.target.value);}} placeholder="(00) 00000-0000"/>
          </Field>
          {verificando&&<p style={{fontSize:11,color:"#b8967e",margin:"-8px 0 8px"}}>Verificando cadastro...</p>}

          {clienteExistente?(
            <div>
              <div style={{padding:12,background:"#e6f4ea",borderRadius:8,marginBottom:16}}>
                <p style={{fontSize:13,color:"#2e7d32",margin:0,fontWeight:600}}>✅ Olá, {clienteExistente.nome_mae?.split(" ")[0]}! Encontramos seu cadastro. 🌸</p>
                <p style={{fontSize:11,color:"#555",margin:"4px 0 0"}}>Para atualizar seus dados acesse "Minha Área" após o agendamento.</p>
              </div>
              <Field label="Nome completo" required><input style={inp} value={cadastro.nome_mae} onChange={e=>setCad("nome_mae",e.target.value)}/></Field>
              <Field label="E-mail" required><input style={inp} type="email" value={cadastro.email} onChange={e=>setCad("email",e.target.value)}/></Field>
              <Field label="Este ensaio é para uma criança?" required>
                <Radio options={["Sim","Não"]} value={cadastro.temFilho} onChange={v=>{setCad("temFilho",v);setCad("nomeCriancaSel","");setCad("nomeCriancaNova","");}}/>
              </Field>
              {cadastro.temFilho==="Sim"&&(
                <div style={{marginTop:4}}>
                  {clienteExistente.filhos?.length>0?(
                    <Field label="Qual criança é o ensaio?" required>
                      <select style={inp} value={cadastro.nomeCriancaSel||""} onChange={e=>setCad("nomeCriancaSel",e.target.value)}>
                        <option value="">Selecione...</option>
                        {clienteExistente.filhos.map((f,i)=>(
                          <option key={i} value={f.nome_crianca}>{f.nome_crianca}{f.idade?" · "+f.idade:""}</option>
                        ))}
                        <option value="__nova">+ Outra criança</option>
                      </select>
                    </Field>
                  ):null}
                  {(!clienteExistente.filhos?.length||cadastro.nomeCriancaSel==="__nova")&&(
                    <Field label="Nome da criança" required>
                      <input style={inp} value={cadastro.nomeCriancaNova||""} onChange={e=>setCad("nomeCriancaNova",e.target.value)} placeholder="Nome da criança"/>
                    </Field>
                  )}
                </div>
              )}
            </div>
          ):(
            <div>
              <Field label="Nome completo" required><input style={inp} value={cadastro.nome_mae} onChange={e=>setCad("nome_mae",e.target.value)} placeholder="Seu nome completo"/></Field>
              <Field label="E-mail" required><input style={inp} type="email" value={cadastro.email} onChange={e=>setCad("email",e.target.value)} placeholder="seu@email.com"/></Field>
              <Field label="CPF"><input style={inp} value={cadastro.cpf} onChange={e=>setCad("cpf",e.target.value)} placeholder="000.000.000-00"/></Field>
              <Field label="RG"><input style={inp} value={cadastro.rg} onChange={e=>setCad("rg",e.target.value)} placeholder="00.000.000-0"/></Field>
              <Field label="Data de nascimento"><input style={inp} type="date" value={cadastro.data_nascimento} onChange={e=>setCad("data_nascimento",e.target.value)}/></Field>
              <p style={sec}>📍 Endereço</p>
              <Field label="CEP"><input style={inp} value={cadastro.endereco_cep} onChange={e=>setCad("endereco_cep",e.target.value)} placeholder="00000-000"/></Field>
              <Field label="Rua e número"><input style={inp} value={cadastro.endereco_rua} onChange={e=>setCad("endereco_rua",e.target.value)} placeholder="Rua, número"/></Field>
              <Field label="Complemento"><input style={inp} value={cadastro.endereco_complemento} onChange={e=>setCad("endereco_complemento",e.target.value)} placeholder="Apto, sala..."/></Field>
              <Field label="Bairro"><input style={inp} value={cadastro.endereco_bairro} onChange={e=>setCad("endereco_bairro",e.target.value)} placeholder="Bairro"/></Field>
              <Field label="Cidade"><input style={inp} value={cadastro.endereco_cidade} onChange={e=>setCad("endereco_cidade",e.target.value)} placeholder="Bauru"/></Field>
              <Field label="Este ensaio é para uma criança?" required>
                <Radio options={["Sim","Não"]} value={cadastro.temFilho} onChange={v=>{setCad("temFilho",v);if(v==="Não")setFilhos([{}]);}}/>
              </Field>
              {cadastro.temFilho==="Sim"&&(
                <div>
                  {filhos.map((f,i)=>(
                    <div key={i} style={{position:"relative"}}>
                      {filhos.length>1&&<button onClick={()=>removeFilho(i)} style={{position:"absolute",top:12,right:12,background:"#fde8e8",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12,color:"#c62828",zIndex:1}}>✕ Remover</button>}
                      <AnamneseForm data={f} onChange={data=>updateFilho(i,data)} titulo={filhos.length>1?`👶 Filho ${i+1}`:null}/>
                    </div>
                  ))}
                  <button onClick={addFilho} style={{width:"100%",padding:11,borderRadius:10,background:"#faf8f5",border:"1.5px dashed #b8967e",cursor:"pointer",fontSize:13,color:"#b8967e",fontWeight:600,marginBottom:16}}>+ Adicionar outro filho</button>
                </div>
              )}
            </div>
          )}
          <button disabled={!cadastroOk} onClick={()=>setStep(2)} style={{width:"100%",padding:"14px",borderRadius:12,background:cadastroOk?"#1a1a1a":"#e8e0d8",color:cadastroOk?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:17,cursor:cadastroOk?"pointer":"default"}}>Continuar →</button>
        </div>
      )}

      {/* ── Step 2: seleção normal de serviço ── */}
      {step===2&&!resgatandoVale&&!valeComprando&&(
        <div>
          <ServiceSelector
            onConfirm={(s,m,ex)=>{setService(s);setModality(m);setExtras(ex||[]);setDadosEvento({});setStep(3);}}
            onValeResgatar={()=>{setResgatandoVale(true);setValeCodeInput('');setValeEncontrado(null);setErroVale('');}}
            onValeComprar={()=>{setValeComprando(true);setValeValorLivreMode(false);setValeValorLivreInput('');setService(null);setModality(null);window.scrollTo({top:0,behavior:'smooth'});}}
          />
          <div style={{marginTop:12}}><Back onClick={()=>setStep(1)}/></div>
        </div>
      )}

      {/* ── Step 2: COMPRAR VALE — catálogo de serviços ── */}
      {step===2&&valeComprando&&!valeValorLivreMode&&(
        <div>
          <div style={{background:'linear-gradient(135deg,#72243E,#b8967e)',borderRadius:12,padding:'14px 16px',marginBottom:20,color:'#fff',display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:28}}>🎁</span>
            <div>
              <p style={{margin:0,fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700}}>Comprando um Vale Presente</p>
              <p style={{margin:'2px 0 0',fontSize:12,opacity:.85}}>Escolha o ensaio que você quer presentear</p>
            </div>
          </div>
          <ServiceSelector
            excluirGrupos={['vale','cofrinho']}
            onConfirm={(s,m,ex)=>{setService(s);setModality(m);setExtras(ex||[]);setDadosEvento({});setStep(3);}}
          />
          {/* Valor Livre */}
          <div style={{marginTop:10,borderRadius:14,border:'2px solid #e8e0d8',background:'#fff',overflow:'hidden'}}>
            <div onClick={()=>setValeValorLivreMode(true)} style={{padding:'15px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:14}}>
              <span style={{fontSize:26,flexShrink:0}}>💝</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:'#1a1a1a',margin:0}}>Valor Livre</p>
                <p style={{fontSize:12,color:'#999',margin:'4px 0 0',lineHeight:1.5}}>Contribua com qualquer valor — a presenteada desconta em qualquer ensaio</p>
              </div>
              <span style={{fontSize:13,color:'#b8967e',flexShrink:0,fontWeight:700}}>→</span>
            </div>
          </div>
          <div style={{marginTop:12}}><Back onClick={()=>{setValeComprando(false);setService(null);setModality(null);}}/></div>
        </div>
      )}

      {/* ── Step 2: COMPRAR VALE — valor livre ── */}
      {step===2&&valeComprando&&valeValorLivreMode&&(
        <div style={{textAlign:'center',padding:'8px 0'}}>
          <div style={{fontSize:44,marginBottom:12}}>💝</div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:'#1a1a1a',marginBottom:4}}>Valor Livre</h3>
          <p style={{fontSize:13,color:'#888',marginBottom:24,lineHeight:1.6}}>Escolha o valor que deseja presentear.<br/>A presenteada usará como desconto em qualquer ensaio.</p>
          <div style={{background:'#fff',border:'1.5px solid #e8e0d8',borderRadius:14,padding:20,textAlign:'left',marginBottom:16}}>
            <Field label="Valor do vale (R$)">
              <input style={{...inp,fontSize:20,fontWeight:700,textAlign:'center'}} type="number" min="1" step="0.01" placeholder="Ex: 200,00" value={valeValorLivreInput} onChange={e=>{setValeValorLivreInput(e.target.value);}}/>
            </Field>
            {valeValorLivreInput&&<p style={{fontSize:13,color:'#2e7d32',fontWeight:600,textAlign:'center',margin:'-8px 0 12px'}}>✅ Vale de R$ {parseFloat(valeValorLivreInput).toFixed(2).replace('.',',')}</p>}
            <button onClick={()=>{
              setService({id:'vale',label:'Vale Presente',grupo:'vale',icon:'💝'});
              setModality({id:'vale-livre',label:'Valor livre',price:parseFloat(valeValorLivreInput)||0});
              setStep(3);
            }} disabled={!valeValorLivreInput||parseFloat(valeValorLivreInput)<=0} style={{width:'100%',padding:13,borderRadius:10,background:valeValorLivreInput?'#1a1a1a':'#e8e0d8',color:valeValorLivreInput?'#fff':'#aaa',border:'none',fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:valeValorLivreInput?'pointer':'default'}}>
              Continuar com valor livre →
            </button>
          </div>
          <Back onClick={()=>setValeValorLivreMode(false)}/>
        </div>
      )}

      {/* ── Step 2: RESGATAR — digitar código ── */}
      {step===2&&resgatandoVale&&!valeEncontrado&&(
        <div style={{textAlign:'center',padding:'8px 0'}}>
          <div style={{fontSize:44,marginBottom:12}}>🔑</div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:'#1a1a1a',marginBottom:4}}>Resgatar Vale Presente</h3>
          <p style={{fontSize:13,color:'#888',marginBottom:24,lineHeight:1.6}}>Digite o código que você recebeu</p>
          <div style={{background:'#fff',border:'1.5px solid #e8e0d8',borderRadius:14,padding:20,textAlign:'left',marginBottom:16}}>
            <Field label="Código do vale">
              <input style={{...inp,textTransform:'uppercase',letterSpacing:'3px',fontSize:18,fontWeight:700,textAlign:'center'}}
                placeholder="Ex: C7X3KP"
                value={valeCodeInput}
                onChange={e=>{setValeCodeInput(e.target.value.toUpperCase());setErroVale('');}}
                onKeyDown={e=>e.key==='Enter'&&validarVale()}
                maxLength={8}
              />
            </Field>
            {erroVale&&<p style={{fontSize:12,color:'#c62828',margin:'-8px 0 12px',textAlign:'center'}}>{erroVale}</p>}
            <button onClick={validarVale} disabled={loadingVale||!valeCodeInput} style={{width:'100%',padding:13,borderRadius:10,background:valeCodeInput?'#1a1a1a':'#e8e0d8',color:valeCodeInput?'#fff':'#aaa',border:'none',fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:valeCodeInput?'pointer':'default'}}>
              {loadingVale?'Validando...':'Validar código →'}
            </button>
          </div>
          <Back onClick={()=>{setResgatandoVale(false);setValeCodeInput('');setErroVale('');}}/>
        </div>
      )}

      {/* ── Step 2: RESGATAR — código validado, escolher ensaio ── */}
      {step===2&&resgatandoVale&&valeEncontrado&&(
        <div>
          <div style={{background:'linear-gradient(135deg,#72243E,#b8967e)',borderRadius:12,padding:16,marginBottom:20,color:'#fff',textAlign:'center'}}>
            <p style={{fontSize:11,letterSpacing:'1px',textTransform:'uppercase',margin:'0 0 4px',opacity:.8}}>Vale encontrado ✅</p>
            {valeEncontrado.servico_id==='vale'?(
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:700,margin:'0 0 2px'}}>💝 R$ {Number(valeEncontrado.valor||0).toFixed(2).replace('.',',')} — Valor Livre</p>
            ):(
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,margin:'0 0 2px'}}>{valeEncontrado.servico} — {valeEncontrado.modalidade}</p>
            )}
            <p style={{fontSize:11,opacity:.7,margin:'4px 0 0'}}>Código: {valeCodeInput.toUpperCase()} · R$ {Number(valeEncontrado.valor||0).toFixed(2).replace('.',',')}</p>
          </div>
          {valeEncontrado.servico_id==='vale'?(
            <>
              <p style={{fontSize:13,color:'#888',marginBottom:16,fontWeight:600}}>Escolha o ensaio que deseja usar seu vale:</p>
              <ServiceSelector
                excluirGrupos={['vale','cofrinho']}
                onConfirm={(s,m,ex)=>{setService(s);setModality(m);setExtras(ex||[]);setDadosEvento({});setStep(3);}}
              />
            </>
          ):(
            <>
              <div style={{background:'#faf8f5',border:'1.5px solid #e8e0d8',borderRadius:12,padding:16,marginBottom:16}}>
                <p style={{fontSize:11,color:'#b8967e',fontWeight:700,margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'1px'}}>Ensaio incluído no vale</p>
                <p style={{fontSize:15,fontWeight:700,color:'#1a1a1a',margin:'0 0 2px'}}>{valeEncontrado.servico}</p>
                <p style={{fontSize:13,color:'#888',margin:0}}>{valeEncontrado.modalidade}</p>
              </div>
              <button onClick={()=>{
                const svc=SERVICES.find(s=>s.id===valeEncontrado.servico_id);
                const mod=svc?.modalities?.find(m=>m.id===valeEncontrado.modalidade_id)||{id:valeEncontrado.modalidade_id,label:valeEncontrado.modalidade,price:valeEncontrado.valor};
                setService(svc||{id:valeEncontrado.servico_id,label:valeEncontrado.servico,icon:'🎁',grupo:'ensaio'});
                setModality(mod);setExtras([]);
                setStep(3);
              }} style={{width:'100%',padding:14,borderRadius:10,background:'#1a1a1a',color:'#fff',border:'none',fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:'pointer'}}>
                Agendar este ensaio →
              </button>
            </>
          )}
          <div style={{marginTop:12}}><Back onClick={()=>{setValeEncontrado(null);setValeCodeInput('');setErroVale('');setResgatandoVale(true);}}/></div>
        </div>
      )}

      {step===3&&!semAgenda&&(
        <div>
          <div style={{padding:"10px 12px",background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:10,marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{service?.icon}</span>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{service?.label} — {modality?.label}</p>
              {extras.length>0&&<p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>+ {extras.map(e=>e.label).join(", ")}</p>}
            </div>
          </div>

          {precisaDadosEvento&&(
            <DadosEventoForm serviceId={service.id} data={dadosEvento} onChange={setDadosEvento}/>
          )}

          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>Escolha a data e horário</h3>
          <p style={{fontSize:12,color:"#999",marginBottom:14}}>Selecione uma data verde disponível</p>
          <Calendar selectedDate={date} onSelectDate={d=>{setDate(d);setTime(null);}} onHorariosChange={setHorariosDisponiveis} onDatasChange={setDatasDisponiveis} duracaoMin={modality?.duracao_min||60}/>
          {!date&&datasDisponiveis!==null&&datasDisponiveis.length===0&&(
            <div style={{marginTop:12,padding:"10px 14px",background:"#fff8e1",border:"1.5px solid #ffe082",borderRadius:10}}>
              <p style={{fontSize:12,color:"#f57c00",margin:"0 0 6px",fontWeight:600}}>⚠️ Nenhuma data liberada neste mês.</p>
              <a href={`https://wa.me/${PHOTOGRAPHER.whatsapp}?text=Olá! Quero agendar um ${service?.label} e não encontrei datas disponíveis no app.`} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#25D366",fontWeight:600,display:"inline-flex",alignItems:"center",gap:5}}>
                💬 Falar pelo WhatsApp para verificar datas →
              </a>
            </div>
          )}
          {date&&(
            <div style={{marginTop:14}}>
              <p style={{fontSize:12,color:"#999",marginBottom:10}}>Horários disponíveis em <strong>{formatDateBR(date)}</strong>:</p>
              {horariosDisponiveis.length===0?(
                <p style={{fontSize:12,color:"#f57c00",background:"#fff8e1",padding:"10px 12px",borderRadius:8}}>⚠️ Nenhum horário disponível nesta data.</p>
              ):(
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {horariosDisponiveis.map(t=><button key={t} onClick={()=>setTime(t)} style={{padding:"8px 14px",borderRadius:8,fontSize:13,border:time===t?"2px solid #1a1a1a":"2px solid #e8e0d8",background:time===t?"#1a1a1a":"#fff",color:time===t?"#fff":"#1a1a1a",cursor:"pointer"}}>{t}</button>)}
                </div>
              )}
            </div>
          )}
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <Back onClick={()=>setStep(2)}/>
            <Btn disabled={!date||!time} onClick={()=>setStep(4)} label="Continuar →"/>
          </div>
        </div>
      )}

      {(step===4||(step===3&&semAgenda))&&(
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>
            {service?.grupo==="vale"&&!resgatandoVale?'Confirmar vale presente':'Confirmar agendamento'}
          </h3>
          <p style={{fontSize:12,color:"#999",marginBottom:16}}>Verifique os dados antes de enviar</p>
          {valeComprando&&(
            <div style={{background:'linear-gradient(135deg,#72243E,#b8967e)',borderRadius:10,padding:14,marginBottom:16,color:'#fff'}}>
              <p style={{fontSize:11,opacity:.8,margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>🎁 Vale sendo criado</p>
              <p style={{fontSize:15,fontWeight:700,margin:'0 0 2px'}}>{service?.id==='vale'?'Valor Livre':service?.label+' — '+modality?.label}</p>
              <p style={{fontSize:14,fontWeight:700,margin:0}}>R$ {Number(modality?.price||0).toFixed(2).replace('.',',')}</p>
            </div>
          )}
          {resgatandoVale&&valeEncontrado&&(
            <div style={{background:'linear-gradient(135deg,#72243E,#b8967e)',borderRadius:10,padding:12,marginBottom:16,color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><p style={{fontSize:11,opacity:.8,margin:'0 0 2px'}}>Vale sendo resgatado</p><p style={{fontSize:16,fontWeight:700,margin:0}}>R$ {Number(valeEncontrado.valor||0).toFixed(2).replace('.',',')} · {valeCodeInput.toUpperCase()}</p></div>
              <span style={{fontSize:24}}>🎁</span>
            </div>
          )}
          <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:16}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,margin:"0 0 10px",letterSpacing:"1px",textTransform:"uppercase"}}>Resumo</p>
            {[
              ["Serviço",`${service?.icon} ${service?.label}`],
              ["Modalidade",modality?.label],
              !semAgenda?["Data",`${formatDateBR(date)} às ${time}`]:null,
              ["Nome",cadastro.nome_mae],
              ["E-mail",cadastro.email],
              extras.length>0?["Adicionais",extras.map(e=>e.label).join(", ")]:null,
              modality?.price?["Valor estimado",`R$ ${calcularTotal(modality.price,extras,!!service?.descontoExtras).total.toLocaleString("pt-BR")}`]:null,
              dadosEvento.nome_aniversariante?["Aniversariante",dadosEvento.nome_aniversariante+(dadosEvento.idade_aniversariante?" · "+dadosEvento.idade_aniversariante:"")]:null,
              dadosEvento.local_nome?["Local",dadosEvento.local_nome]:null,
            ].filter(Boolean).map(([k,v])=>v&&(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0e8e0"}}>
                <span style={{fontSize:12,color:"#999"}}>{k}</span>
                <span style={{fontSize:13,color:"#1a1a1a",fontWeight:600,textAlign:"right",maxWidth:"60%"}}>{v}</span>
              </div>
            ))}
            {!clienteExistente&&cadastro.temFilho==="Sim"&&filhos.filter(f=>f.nome_crianca).map((f,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0e8e0"}}>
                <span style={{fontSize:12,color:"#999"}}>{filhos.length>1?`Filho ${i+1}`:"Criança"}</span>
                <span style={{fontSize:13,color:"#1a1a1a",fontWeight:600}}>{f.nome_crianca} · {f.idade}</span>
              </div>
            ))}
          </div>
          <div style={{padding:12,background:"#fdf8f5",border:"1.5px solid #f0ddd0",borderRadius:10,marginBottom:16}}>
            <p style={{fontSize:12,color:"#b8967e",margin:0,lineHeight:1.6}}>💬 Em breve a <strong>Crescidinhos</strong> entrará em contato pelo WhatsApp para confirmar seu horário.</p>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Back onClick={()=>setStep(semAgenda?2:3)}/>
            <Btn disabled={loading} onClick={handleSubmit} label={loading?"Enviando...":"Enviar solicitação 🌸"}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PHOTOGRAPHER LOGIN ───────────────────────────────────────────
function PhotographerLogin({ onLogin }) {
  const login=useGoogleLogin({
    onSuccess:async(t)=>{try{const r=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:`Bearer ${t.access_token}`}});const info=await r.json();onLogin({token:t,email:info.email});}catch{alert("Não foi possível verificar o usuário.");}},
    onError:()=>alert("Erro ao fazer login."),
    scope:"https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
  });
  return(
    <div style={{textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:40,marginBottom:16}}>📷</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:"#1a1a1a",marginBottom:8}}>Área Restrita</h2>
      <p style={{fontSize:13,color:"#888",marginBottom:32,lineHeight:1.6}}>Acesse com sua conta Google para entrar no painel.</p>
      <button onClick={()=>login()} style={{display:"inline-flex",alignItems:"center",gap:12,padding:"14px 28px",borderRadius:10,background:"#fff",border:"2px solid #e8e0d8",cursor:"pointer",fontSize:14,fontWeight:600,color:"#1a1a1a",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 35.7 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2C43 35 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
        Entrar com Google
      </button>
    </div>
  );
}

// ─── PHOTOGRAPHER PANEL ───────────────────────────────────────────
function PhotographerPanel({ auth, onLogout }) {
  const [tab,setTab]=useState("agenda");
  const [abrirAgId,setAbrirAgId]=useState(null);
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,padding:"10px 14px",background:"#fff",borderRadius:12,border:"1.5px solid #e8e0d8"}}>
        <div><p style={{margin:0,fontSize:13,fontWeight:600,color:"#1a1a1a"}}>Painel da fotógrafa 📷</p><p style={{margin:"2px 0 0",fontSize:11,color:"#999"}}>{auth.email}</p></div>
        <button onClick={onLogout} style={{padding:"6px 12px",borderRadius:8,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:12,color:"#666"}}>Sair</button>
      </div>
      {auth.email!==PHOTOGRAPHER.email&&<div style={{padding:16,background:"#fde8e8",borderRadius:12,marginBottom:16,textAlign:"center"}}><p style={{fontSize:13,color:"#c62828",margin:0}}>🚫 Acesso restrito à fotógrafa.</p></div>}
      {auth.email===PHOTOGRAPHER.email&&(
        <>
          <div style={{display:"flex",gap:6,marginBottom:20}}>
            {[["agenda","📅 Agenda"],["crm","🗂 CRM"],["disponibilidade","🗓 Horários"]].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 4px",borderRadius:8,fontSize:11,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{l}</button>)}
          </div>
          {tab==="agenda"&&<AgendaView auth={auth} onVerCliente={(id)=>{setAbrirAgId(id);setTab("crm");}}/>}
          {tab==="crm"&&<CRMView abrirAgendamentoId={abrirAgId} onAgendamentoAberto={()=>setAbrirAgId(null)}/>}
          {tab==="disponibilidade"&&<DisponibilidadePanel/>}
        </>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  if(window.location.pathname.startsWith("/contrato/")){
    return <ContractPage/>;
  }
  const [view,setView]=useState("home");
  const [auth,setAuth]=useState(null);
  const btnBase={display:"flex",alignItems:"center",gap:16,width:"100%",padding:"20px 22px",borderRadius:16,cursor:"pointer",border:"2px solid #e8e0d8",background:"#fff",textAlign:"left",transition:"all .15s"};
  return(
    <div style={{fontFamily:"'Lato',sans-serif",background:"#f5f0eb",minHeight:"100vh",paddingBottom:48}}>
      <div style={{background:"#fff",padding:"20px 24px 14px",borderBottom:"1px solid #e8e0d8",marginBottom:24,textAlign:"center"}}>
        <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,margin:0,color:"#1a1a1a",cursor:"pointer"}} onClick={()=>setView("home")}>crescidinhos</h1>
        <p style={{fontSize:10,color:"#b8967e",margin:"2px 0 0",letterSpacing:"3px",textTransform:"uppercase"}}>fotografia</p>
        {view!=="home"&&(
          <div style={{marginTop:14,display:"inline-flex",background:"#f5f0eb",borderRadius:8,padding:3}}>
            <button onClick={()=>setView("home")} style={{padding:"7px 14px",borderRadius:6,fontSize:11,fontWeight:600,background:"transparent",color:"#888",border:"none",cursor:"pointer"}}>← Início</button>
          </div>
        )}
      </div>
      <div style={{maxWidth:480,margin:"0 auto",padding:"0 18px"}}>
        {view==="home"&&(
          <div>
            <p style={{fontSize:14,color:"#888",marginBottom:24,lineHeight:1.7,textAlign:"center"}}>Bem-vinda! Como posso te ajudar hoje? 🌸</p>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <button onClick={()=>setView("client")} style={{...btnBase,background:"#1a1a1a",border:"2px solid #1a1a1a"}}>
                <span style={{fontSize:32,flexShrink:0}}>📸</span>
                <div>
                  <p style={{margin:0,fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"#fff"}}>Agendar Ensaio</p>
                  <p style={{margin:"4px 0 0",fontSize:12,color:"#aaa"}}>Escolha seu serviço e data</p>
                </div>
              </button>
              <button onClick={()=>setView("minha-area")} style={{...btnBase}}>
                <span style={{fontSize:32,flexShrink:0}}>👤</span>
                <div>
                  <p style={{margin:0,fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"#1a1a1a"}}>Minha Área</p>
                  <p style={{margin:"4px 0 0",fontSize:12,color:"#888"}}>Agendamentos, contratos e fotos</p>
                </div>
              </button>
              <button onClick={()=>setView("photographer")} style={{...btnBase,background:"#f5f0eb"}}>
                <span style={{fontSize:32,flexShrink:0}}>🗂</span>
                <div>
                  <p style={{margin:0,fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"#1a1a1a"}}>Área da Fotógrafa</p>
                  <p style={{margin:"4px 0 0",fontSize:12,color:"#888"}}>Painel de gerenciamento</p>
                </div>
              </button>
            </div>
          </div>
        )}
        {view==="client"&&<ClientView/>}
        {view==="minha-area"&&<ClientePanel/>}
        {view==="photographer"&&!auth&&<PhotographerLogin onLogin={setAuth}/>}
        {view==="photographer"&&auth&&<PhotographerPanel auth={auth} onLogout={()=>{setAuth(null);setView("home");}}/>}
      </div>
    </div>
  );
}
