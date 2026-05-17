import { useState, useRef, useCallback, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { PHOTOGRAPHER, SERVICES, TIMES, WEBHOOK_URL, REGRAS, fmtPreco, calcularTotal } from "./config";
import { fetchCalendarEvents } from "./googleCalendar";

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
const diasDesde = (d) => d ? Math.floor((new Date() - new Date(d)) / 86400000) : 9999;

// ─── HELPERS ─────────────────────────────────────────────────────
const MONTHS   = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const pad = n => String(n).padStart(2,"0");
const formatDate = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const formatDateBR = iso => { if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const mesAno = iso => { if(!iso) return "—"; const [y,m]=iso.split("-"); return `${MONTHS[parseInt(m)-1]}/${y}`; };
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

// ─── CALENDAR ────────────────────────────────────────────────────
function Calendar({ selectedDate, onSelectDate }) {
  const today = new Date();
  const [vy,setVy] = useState(today.getFullYear());
  const [vm,setVm] = useState(today.getMonth());
  const days = getDaysInMonth(vy,vm);
  const firstDay = getFirstDay(vy,vm);
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=days;d++) cells.push(d);
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button onClick={()=>vm===0?(setVm(11),setVy(y=>y-1)):setVm(m=>m-1)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#1a1a1a",padding:"4px 10px"}}>‹</button>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:600}}>{MONTHS[vm]} {vy}</span>
        <button onClick={()=>vm===11?(setVm(0),setVy(y=>y+1)):setVm(m=>m+1)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#1a1a1a",padding:"4px 10px"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {WEEKDAYS.map(w=><div key={w} style={{textAlign:"center",fontSize:10,color:"#aaa",fontWeight:600,padding:"3px 0"}}>{w}</div>)}
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const ds=formatDate(vy,vm,d);
          const isPast=new Date(ds)<new Date(today.toDateString());
          const isSun=i%7===0;
          const isSel=selectedDate===ds;
          return <div key={i} onClick={()=>!isPast&&!isSun&&onSelectDate(ds)} style={{textAlign:"center",padding:"7px 0",borderRadius:8,fontSize:13,fontWeight:isSel?700:400,background:isSel?"#1a1a1a":"transparent",color:isSel?"#fff":isPast||isSun?"#ccc":"#1a1a1a",cursor:isPast||isSun?"default":"pointer"}}>{d}</div>;
        })}
      </div>
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

// ─── ANAMNESE (criança individual) ───────────────────────────────
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
function ServiceSelector({ onConfirm }) {
  const [openId, setOpenId] = useState(null);
  const [selService, setSelService] = useState(null);
  const [selModality, setSelModality] = useState(null);
  const [selExtras, setSelExtras] = useState([]);

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
        {SERVICES.map(s=>{
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
                  {s.tipo==="vale"?(
                    <div style={{padding:"12px 14px",borderRadius:10,background:"#e6f4ea",border:"2px solid #a5d6a7"}}>
                      <p style={{fontSize:13,color:"#2e7d32",fontWeight:700,margin:"0 0 4px"}}>🎁 Vale Presente</p>
                      <p style={{fontSize:12,color:"#555",margin:0,lineHeight:1.6}}>{s.modalities[0].detail}</p>
                      <p style={{fontSize:11,color:"#856404",margin:"6px 0 0"}}>⚠ Informe o valor desejado nas observações do próximo passo.</p>
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

                  {/* Extras após seleção de modalidade */}
                  {s.extras&&selService?.id===s.id&&selModality&&(
                    <ExtrasPanel
                      extras={s.extras}
                      selected={selExtras}
                      onChange={setSelExtras}
                      temDesconto={!!s.descontoExtras}
                      basePrice={selModality.price||0}
                    />
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
            {selModality.price&&!calc&&<p style={{fontSize:13,fontWeight:700,color:"#b8967e",margin:"2px 0 0"}}>{fmtPreco(selModality.price,selModality.priceLabel,selModality.periodo)}</p>}
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

// ─── SIGNATURE PAD ────────────────────────────────────────────────
function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const getPos=(e,c)=>{const r=c.getBoundingClientRect();return{x:(e.touches?e.touches[0].clientX:e.clientX)-r.left,y:(e.touches?e.touches[0].clientY:e.clientY)-r.top};};
  const start=(e)=>{e.preventDefault();drawing.current=true;const c=canvasRef.current;const ctx=c.getContext("2d");const p=getPos(e,c);ctx.beginPath();ctx.moveTo(p.x,p.y);};
  const draw=(e)=>{e.preventDefault();if(!drawing.current)return;const c=canvasRef.current;const ctx=c.getContext("2d");const p=getPos(e,c);ctx.lineWidth=2;ctx.lineCap="round";ctx.strokeStyle="#1a1a1a";ctx.lineTo(p.x,p.y);ctx.stroke();setHasDrawn(true);};
  const stop=()=>{drawing.current=false;};
  const clear=()=>{canvasRef.current.getContext("2d").clearRect(0,0,380,160);setHasDrawn(false);};
  const save=()=>onSave(canvasRef.current.toDataURL("image/png"));
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:420}}>
        <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 4px"}}>Assinar contrato</h3>
        <p style={{fontSize:12,color:"#999",margin:"0 0 16px"}}>Assine com o dedo no espaço abaixo</p>
        <canvas ref={canvasRef} width={380} height={160} style={{width:"100%",height:160,border:"1.5px solid #e0d8d0",borderRadius:8,touchAction:"none",cursor:"crosshair",background:"#fafaf8"}} onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop} onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}/>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={clear} style={{flex:1,padding:"10px",borderRadius:8,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:13,color:"#666"}}>Limpar</button>
          <button onClick={onCancel} style={{flex:1,padding:"10px",borderRadius:8,background:"#fff",border:"1.5px solid #e0d8d0",cursor:"pointer",fontSize:13,color:"#666"}}>Cancelar</button>
          <button onClick={save} disabled={!hasDrawn} style={{flex:2,padding:"10px",borderRadius:8,background:hasDrawn?"#1a1a1a":"#e8e0d8",color:hasDrawn?"#fff":"#aaa",border:"none",cursor:hasDrawn?"pointer":"default",fontFamily:"'Cormorant Garamond',serif",fontSize:15}}>Assinar ✍️</button>
        </div>
      </div>
    </div>
  );
}

// ─── CONTRACT VIEW ────────────────────────────────────────────────
function ContractView({ contract, onSigned }) {
  const [showPad, setShowPad] = useState(false);
  const [agreed, setAgreed] = useState(false);
  return (
    <div>
      {showPad&&<SignaturePad onSave={(sig)=>{setShowPad(false);onSigned({...contract,signature:sig,signedAt:new Date().toLocaleString("pt-BR")});}} onCancel={()=>setShowPad(false)}/>}
      <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:20,marginBottom:16}}>
        <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>Contrato de Prestação de Serviços Fotográficos</p>
        <p style={sec}>Partes</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7,margin:"0 0 8px"}}><strong>CONTRATADA:</strong> {PHOTOGRAPHER.name}, {PHOTOGRAPHER.owner}, CPF {PHOTOGRAPHER.cpf}, {PHOTOGRAPHER.email}</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7,margin:0}}><strong>CONTRATANTE:</strong> {contract.nome_mae}, CPF {contract.cpf_mae||"___.___.___-__"}, {contract.email}</p>
        <p style={sec}>Objeto</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>Prestação de serviços fotográficos — <strong>{contract.service}</strong>{contract.modality?` · ${contract.modality}`:""}{contract.nome_crianca?` · criança: ${contract.nome_crianca}`:""} · data: <strong>{formatDateBR(contract.date)}</strong> às <strong>{contract.time}</strong>.</p>
        <p style={sec}>Valor e Pagamento</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>Valor total: <strong>R$ {Number(contract.valor||0).toFixed(2).replace(".",",")}</strong>, conforme combinado.</p>
        {contract.pagamento_link&&<p style={{fontSize:13,color:"#444",lineHeight:1.7}}>Link de pagamento: <a href={contract.pagamento_link} target="_blank" rel="noreferrer" style={{color:"#b8967e"}}>{contract.pagamento_link}</a></p>}
        <p style={sec}>Cancelamento e Reagendamento</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7,whiteSpace:"pre-line"}}>{"• Cancelamento com mais de 7 dias: reembolso integral do sinal.\n• Cancelamento entre 3 e 7 dias: sinal não reembolsável, pode ser usado para reagendamento.\n• Cancelamento com menos de 48h: sinal perdido, nova data sujeita à disponibilidade.\n• Imprevisto da CONTRATADA: nova data sem custos adicionais."}</p>
        <p style={sec}>Direitos de Imagem</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>A CONTRATANTE autoriza o uso das imagens para portfólio e redes sociais. A remoção pode ser solicitada a qualquer momento, atendida em até 24 horas.</p>
        <p style={sec}>🔒 ECA Digital — Lei nº 15.211/2025 e LGPD</p>
        <p style={{fontSize:12,color:"#555",lineHeight:1.7}}>{ECA}</p>
        {contract.obs&&<><p style={sec}>Observações</p><p style={{fontSize:13,color:"#444",lineHeight:1.7}}>{contract.obs}</p></>}
        <p style={{fontSize:11,color:"#bbb",marginTop:20}}>Gerado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}.</p>
      </div>
      <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:20,cursor:"pointer"}}>
        <div onClick={()=>setAgreed(!agreed)} style={{width:20,height:20,borderRadius:4,border:"2px solid "+(agreed?"#1a1a1a":"#ccc"),background:agreed?"#1a1a1a":"#fff",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {agreed&&<span style={{color:"#fff",fontSize:12}}>✓</span>}
        </div>
        <span style={{fontSize:13,color:"#444",lineHeight:1.6}}>Li e concordo com todos os termos deste contrato.</span>
      </label>
      {contract.signature
        ?<div style={{padding:16,background:"#e6f4ea",borderRadius:12,textAlign:"center"}}><p style={{fontSize:14,color:"#2e7d32",fontWeight:600,margin:"0 0 4px"}}>✅ Contrato assinado!</p><p style={{fontSize:12,color:"#555",margin:0}}>Assinado em {contract.signedAt}</p><img src={contract.signature} alt="assinatura" style={{marginTop:8,maxWidth:200,opacity:0.7}}/></div>
        :<button onClick={()=>setShowPad(true)} disabled={!agreed} style={{width:"100%",padding:14,borderRadius:10,background:agreed?"#1a1a1a":"#e8e0d8",color:agreed?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:agreed?"pointer":"default"}}>✍️ Assinar contrato</button>
      }
    </div>
  );
}

// ─── STATUS ───────────────────────────────────────────────────────
const STATUS_COLORS = {
  "Pendente":   {bg:"#fff8e1",color:"#f57c00"},
  "Confirmado": {bg:"#e3f2fd",color:"#1565C0"},
  "Contrato":   {bg:"#f3e5f5",color:"#7b1fa2"},
  "Concluído":  {bg:"#e6f4ea",color:"#2e7d32"},
  "Cancelado":  {bg:"#fde8e8",color:"#c62828"},
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
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>📋 Anamnese — {atipico?"🧡 Atípica":"🌿 Típica"}</p>
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
  const [calEvents,setCalEvents]=useState([]);
  const [agendamentos,setAgendamentos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [fichaSel,setFichaSel]=useState(null);
  const carregar=useCallback(async()=>{setLoading(true);try{const [ev,ags]=await Promise.all([fetchCalendarEvents(auth.token.access_token),getAgendamentos()]);setCalEvents(ev||[]);setAgendamentos(ags||[]);}catch(e){console.error(e);}finally{setLoading(false);};},[auth]);
  useEffect(()=>{carregar();},[carregar]);
  const cruzar=(ev)=>{const dt=ev.start?.dateTime||ev.start?.date;if(!dt)return null;const data=dt.substring(0,10);const hora=dt.length>10?new Date(dt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):null;return agendamentos.find(a=>{if(a.data!==data)return false;if(!hora)return true;return a.hora&&a.hora.startsWith(hora.substring(0,5));})};
  const hoje=new Date().toISOString().substring(0,10);
  const upcoming=calEvents.filter(e=>{const dt=e.start?.dateTime||e.start?.date;return dt&&dt.substring(0,10)>=hoje;}).sort((a,b)=>((a.start?.dateTime||a.start?.date||"")).localeCompare(b.start?.dateTime||b.start?.date||"")).slice(0,30);
  const porDia={};upcoming.forEach(e=>{const dt=e.start?.dateTime||e.start?.date||"";const dia=dt.substring(0,10);if(!porDia[dia])porDia[dia]=[];porDia[dia].push(e);});
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
            {porDia[dia].map(evento=>{
              const ag=cruzar(evento);const cl=ag?.clientes||{};const dt=evento.start?.dateTime||evento.start?.date;const hora=dt&&dt.length>10?new Date(dt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"";const st=ag?STATUS_COLORS[ag.status]||STATUS_COLORS["Pendente"]:null;const pc=ag?PAG_COLORS[ag.pagamento_status]||PAG_COLORS["Pendente"]:null;
              return(
                <div key={evento.id} onClick={()=>ag&&setFichaSel(ag)} style={{padding:14,border:"1.5px solid "+(isHoje?"#f0ddd0":"#e8e0d8"),borderRadius:12,marginBottom:8,cursor:ag?"pointer":"default",background:isHoje?"#fffbf8":"#fff",borderLeft:`4px solid ${isHoje?"#b8967e":"#e8e0d8"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        {hora&&<span style={{fontSize:13,fontWeight:700,color:"#b8967e",fontFamily:"'Cormorant Garamond',serif"}}>{hora}</span>}
                        <span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{evento.summary?.replace("📸 ","")}</span>
                      </div>
                      {ag&&(<div><p style={{margin:"0 0 4px",fontSize:12,color:"#888"}}>{cl.nome_crianca?"👶 "+cl.nome_crianca+(cl.atipico?" · 🧡 Atípico":" · 🌿 Típico")+"("+cl.idade+")":cl.nome_mae}</p>{ag.modalidade&&<p style={{margin:"0 0 4px",fontSize:11,color:"#b8967e"}}>📌 {ag.modalidade}</p>}<p style={{margin:"0 0 6px",fontSize:12,color:"#999"}}>📞 {cl.telefone}</p><div style={{display:"flex",gap:5,flexWrap:"wrap"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:st.bg,color:st.color}}>{ag.status}</span><span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {ag.pagamento_status||"Pendente"}</span>{cl.anamnese&&<span style={{padding:"2px 8px",borderRadius:10,fontSize:10,background:"#f5f0eb",color:"#888"}}>📋 Anamnese</span>}</div></div>)}
                      {!ag&&evento.description&&<p style={{margin:"4px 0 0",fontSize:11,color:"#aaa",lineHeight:1.5}}>{evento.description.substring(0,80)}</p>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8}}>
                      {ag&&<p style={{fontSize:13,fontWeight:700,color:"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {Number(ag.valor||0).toFixed(2).replace(".",",")}</p>}
                      {ag&&<span style={{fontSize:10,color:"#b8967e",fontWeight:700}}>Ver ficha →</span>}
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
  const [showContract,setShowContract]=useState(false);
  const [showNew,setShowNew]=useState(false);
  const [newClient,setNewClient]=useState({nome_mae:"",nome_crianca:"",email:"",telefone:"",servico:"",modalidade:"",data:"",hora:"",valor:"",obs:"",cpf_mae:"",pagamento_link:""});
  const [newAnamnese,setNewAnamnese]=useState({});
  const [salvando,setSalvando]=useState(false);

  const carregar=useCallback(async()=>{setLoading(true);try{const [ags,cls]=await Promise.all([getAgendamentos(),getClientes()]);setAgendamentos(ags||[]);setClientes(cls||[]);}catch(e){console.error(e);}finally{setLoading(false);};},[]);
  useEffect(()=>{carregar();},[carregar]);
  useEffect(()=>{if(abrirAgendamentoId&&agendamentos.length>0){setSelected(abrirAgendamentoId);setTab("agendamentos");onAgendamentoAberto&&onAgendamentoAberto();}},[abrirAgendamentoId,agendamentos]);

  const update=async(id,patch)=>{try{await atualizarAgendamento(id,patch);setAgendamentos(as=>as.map(a=>a.id===id?{...a,...patch}:a));}catch(e){alert("Erro: "+e.message);}};
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

  if(showContract&&agendamento) return(<ContractView contract={{...agendamento,nome_mae:agendamento.clientes?.nome_mae,nome_crianca:agendamento.clientes?.nome_crianca,email:agendamento.clientes?.email,service:agendamento.servico,modality:agendamento.modalidade,date:agendamento.data,time:agendamento.hora}} onSigned={async(sc)=>{await update(agendamento.id,{signature:sc.signature,signed_at:sc.signedAt,status:"Contrato"});setShowContract(false);}}/>);

  if(agendamento){
    const st=STATUS_COLORS[agendamento.status]||STATUS_COLORS["Pendente"];const cl=agendamento.clientes||{};
    const camposAnamnese=Object.entries(cl.anamnese||{}).filter(([k,v])=>v&&v!==""&&!["nome_mae","email","phone","nome_crianca","idade","atipico"].includes(k));
    return(
      <div>
        <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#999",fontSize:13,marginBottom:16,padding:0}}>← Voltar</button>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div><h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 2px"}}>{cl.nome_mae}</h3><p style={{fontSize:12,color:"#999",margin:0}}>{cl.nome_crianca?"👶 "+cl.nome_crianca+(cl.atipico?" · 🧡 Atípico":" · 🌿 Típico"):""}</p></div>
            <span style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.color}}>{agendamento.status}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["Serviço",agendamento.servico],["Modalidade",agendamento.modalidade||"—"],["Data",formatDateBR(agendamento.data)],["Horário",agendamento.hora],["Valor",`R$ ${Number(agendamento.valor||0).toFixed(2).replace(".",",")}`],["WhatsApp",cl.telefone]].map(([k,v])=><div key={k}><span style={{fontSize:10,color:"#aaa",display:"block"}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{v||"—"}</span></div>)}</div>
        </div>
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
          <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Contrato</p>
          {agendamento.signature?<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:"#2e7d32"}}>✅ Assinado em {agendamento.signed_at}</span></div>:<div>
            <p style={{fontSize:12,color:"#888",margin:"0 0 10px"}}>Contrato ainda não assinado.</p>
            <Field label="CPF da cliente"><input style={inp} placeholder="000.000.000-00" value={agendamento.cpf_mae||""} onChange={e=>update(agendamento.id,{cpf_mae:e.target.value})}/></Field>
            <Field label="Valor do ensaio (R$)"><input style={inp} type="number" value={agendamento.valor||""} onChange={e=>update(agendamento.id,{valor:e.target.value})}/></Field>
            <Field label="Observações"><textarea style={{...inp,resize:"vertical"}} rows={2} value={agendamento.obs||""} onChange={e=>update(agendamento.id,{obs:e.target.value})}/></Field>
            <button onClick={()=>setShowContract(true)} style={{width:"100%",padding:12,borderRadius:10,background:"#7b1fa2",color:"#fff",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:15,cursor:"pointer"}}>📄 Gerar e assinar contrato</button>
          </div>}
        </div>
        <a href={`https://wa.me/55${(cl.telefone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:13,borderRadius:10,background:"#25D366",color:"#fff",textDecoration:"none",fontSize:14,fontWeight:600,boxSizing:"border-box"}}>💬 Abrir WhatsApp</a>
      </div>
    );
  }

  if(cliente){
    const ensaiosCliente=agendamentos.filter(a=>a.cliente_id===cliente.id);
    return(
      <div>
        <button onClick={()=>setSelectedCliente(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#999",fontSize:13,marginBottom:16,padding:0}}>← Voltar</button>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 4px"}}>{cliente.nome_mae}</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>{[["E-mail",cliente.email],["WhatsApp",cliente.telefone],["Total de ensaios",cliente.total_ensaios||ensaiosCliente.length],["Último ensaio",formatDateBR(cliente.ultimo_ensaio)]].map(([k,v])=><div key={k}><span style={{fontSize:10,color:"#aaa",display:"block"}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{v||"—"}</span></div>)}</div>
        </div>
        {/* Filhos */}
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

  return(
    <div>
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,overflowY:"auto",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:20,maxWidth:480,margin:"0 auto",paddingBottom:40}}>
            <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,margin:"0 0 4px"}}>Novo agendamento</h3>
            <p style={{fontSize:12,color:"#999",margin:"0 0 16px"}}>Dados do ensaio + dados da cliente</p>
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
              <button onClick={()=>{setShowNew(false);setNewClient({nome_mae:"",nome_crianca:"",email:"",telefone:"",servico:"",modalidade:"",data:"",hora:"",valor:"",obs:"",cpf_mae:"",pagamento_link:""});setNewAnamnese({});}} style={{flex:1,padding:12,borderRadius:10,background:"#fff",border:"1.5px solid #e8e0d8",cursor:"pointer",color:"#666"}}>Cancelar</button>
              <button disabled={salvando} onClick={async()=>{setSalvando(true);try{const ex=await getClienteByTelefone(newClient.telefone);let cid;const filhos=newAnamnese.nome_crianca?[newAnamnese]:[];if(ex&&ex.length>0){cid=ex[0].id;await atualizarCliente(cid,{nome_mae:newClient.nome_mae,email:newClient.email,cpf_mae:newClient.cpf_mae,filhos,anamnese:newAnamnese,updated_at:new Date().toISOString()});}else{const nc=await criarCliente({nome_mae:newClient.nome_mae,email:newClient.email,telefone:newClient.telefone,cpf_mae:newClient.cpf_mae,atipico:newAnamnese.atipico==="Sim",filhos,anamnese:newAnamnese});cid=nc[0].id;}const svc=SERVICES.find(s=>s.label===newClient.servico);const modLabel=newClient.modalidade||(svc?.modalities[0]?.label)||"";await criarAgendamento({cliente_id:cid,servico:newClient.servico,servico_id:svc?.id||null,modalidade:modLabel,data:newClient.data,hora:newClient.hora,valor:newClient.valor,obs:newClient.obs,cpf_mae:newClient.cpf_mae,pagamento_link:newClient.pagamento_link||null,pagamento_status:"Pendente",status:"Pendente"});setShowNew(false);setNewClient({nome_mae:"",nome_crianca:"",email:"",telefone:"",servico:"",modalidade:"",data:"",hora:"",valor:"",obs:"",cpf_mae:"",pagamento_link:""});setNewAnamnese({});carregar();}catch(e){alert("Erro: "+e.message);}finally{setSalvando(false);}}} style={{flex:2,padding:12,borderRadius:10,background:salvando?"#ccc":"#1a1a1a",color:"#fff",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:salvando?"default":"pointer"}}>{salvando?"Salvando...":"Salvar agendamento"}</button>
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
          {filtered.map(a=>{const st=STATUS_COLORS[a.status]||STATUS_COLORS["Pendente"];const pc=PAG_COLORS[a.pagamento_status]||PAG_COLORS["Pendente"];const cl=a.clientes||{};return(<div key={a.id} onClick={()=>setSelected(a.id)} style={{padding:14,border:"1.5px solid #e8e0d8",borderRadius:12,marginBottom:10,cursor:"pointer",background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><p style={{margin:0,fontWeight:600,fontSize:14,color:"#1a1a1a"}}>{cl.nome_mae||"—"}</p><p style={{margin:"3px 0 0",fontSize:12,color:"#555"}}>{a.servico}{a.modalidade?` — ${a.modalidade}`:""}</p><p style={{margin:"2px 0 0",fontSize:11,color:"#999"}}>{formatDateBR(a.data)} às {a.hora}</p><div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:st.bg,color:st.color}}>{a.status}</span><span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {a.pagamento_status||"Pendente"}</span></div></div><p style={{fontSize:14,fontWeight:700,color:"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif",flexShrink:0,marginLeft:8}}>R$ {Number(a.valor||0).toFixed(2).replace(".",",")}</p></div></div>);})}
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

// ─── PAINEL DO CLIENTE ────────────────────────────────────────────
function ClientePanel() {
  const [email,setEmail]=useState("");
  const [enviado,setEnviado]=useState(false);
  const [logado,setLogado]=useState(null);
  const [agendamentos,setAgendamentos]=useState([]);
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState("agendamentos");

  // Simula magic link — em produção, usar Supabase Auth
  const enviarLink = async () => {
    if(!email) return;
    setLoading(true);
    try {
      // Verifica se cliente existe
      const r = await getClienteByEmail(email);
      if(r&&r.length>0){
        // Em produção: Supabase Auth envia magic link
        // Por enquanto, simula login direto
        const cl = r[0];
        setLogado(cl);
        const ags = await getAgendamentosByCliente(cl.id);
        setAgendamentos(ags||[]);
      } else {
        alert("E-mail não encontrado. Verifique ou fale com a Crescidinhos para cadastro.");
      }
    } catch(e){ console.error(e); }
    setLoading(false);
    setEnviado(true);
  };

  if(!logado) return (
    <div style={{textAlign:"center",padding:"48px 16px"}}>
      <div style={{fontSize:48,marginBottom:16}}>🐘</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:"#1a1a1a",marginBottom:8}}>Minha Área</h2>
      <p style={{fontSize:13,color:"#888",marginBottom:24,lineHeight:1.6}}>Acesse seus agendamentos, contratos e Cofrinho 🌸</p>
      <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:14,padding:20,textAlign:"left",marginBottom:16}}>
        <Field label="Seu e-mail cadastrado">
          <input style={inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
        </Field>
        <button onClick={enviarLink} disabled={loading||!email} style={{width:"100%",padding:13,borderRadius:10,background:email?"#1a1a1a":"#e8e0d8",color:email?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:email?"pointer":"default"}}>
          {loading?"Verificando...":"Acessar minha área →"}
        </button>
      </div>
      <p style={{fontSize:12,color:"#aaa",lineHeight:1.6}}>Não tem cadastro? <br/>Faça um agendamento e a Crescidinhos cria seu perfil 🤍</p>
    </div>
  );

  const cofrinho = logado.cofrinho;
  return (
    <div>
      <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:"14px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:36}}>🐘</div>
        <div>
          <p style={{margin:0,fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:"#1a1a1a"}}>Olá, {logado.nome_mae?.split(" ")[0]}! 🌸</p>
          <p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>{logado.email}</p>
        </div>
        <button onClick={()=>{setLogado(null);setEnviado(false);setEmail("");}} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:8,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:12,color:"#666"}}>Sair</button>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto"}}>
        {[["agendamentos","📅 Ensaios"],["contratos","📄 Contratos"],cofrinho?["cofrinho","💰 Cofrinho"]:null,["perfil","👤 Perfil"]].filter(Boolean).map(([t,l])=>
          <button key={t} onClick={()=>setTab(t)} style={{flex:"0 0 auto",padding:"9px 14px",borderRadius:8,fontSize:11,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
        )}
      </div>

      {tab==="agendamentos"&&(
        <div>
          {agendamentos.length===0&&<div style={{textAlign:"center",padding:"40px 16px"}}><div style={{fontSize:40,marginBottom:12}}>📭</div><p style={{fontSize:14,color:"#bbb"}}>Nenhum ensaio ainda</p><p style={{fontSize:12,color:"#bbb"}}>Que tal agendar o primeiro? 🌸</p></div>}
          {agendamentos.map(a=>{const st=STATUS_COLORS[a.status]||STATUS_COLORS["Pendente"];const pc=PAG_COLORS[a.pagamento_status]||PAG_COLORS["Pendente"];return(
            <div key={a.id} style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div><p style={{margin:0,fontSize:14,fontWeight:700,color:"#1a1a1a"}}>{a.servico}</p><p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>{a.modalidade}</p></div>
                <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.color}}>{a.status}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><p style={{fontSize:10,color:"#aaa",margin:"0 0 2px"}}>Data</p><p style={{fontSize:13,fontWeight:600,margin:0}}>{formatDateBR(a.data)} às {a.hora}</p></div>
                <div><p style={{fontSize:10,color:"#aaa",margin:"0 0 2px"}}>Valor</p><p style={{fontSize:13,fontWeight:600,margin:0}}>R$ {Number(a.valor||0).toFixed(2).replace(".",",")}</p></div>
              </div>
              <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {a.pagamento_status||"Pendente"}</span>
            </div>
          );})}
        </div>
      )}

      {tab==="contratos"&&(
        <div>
          {agendamentos.filter(a=>a.signature||a.status==="Contrato").length===0&&<div style={{textAlign:"center",padding:"40px 16px"}}><div style={{fontSize:40,marginBottom:12}}>📄</div><p style={{fontSize:14,color:"#bbb"}}>Nenhum contrato assinado ainda</p></div>}
          {agendamentos.filter(a=>a.signature||a.status==="Contrato").map(a=>(
            <div key={a.id} style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:10}}>
              <p style={{margin:0,fontSize:14,fontWeight:700}}>{a.servico} — {a.modalidade}</p>
              <p style={{margin:"4px 0 8px",fontSize:12,color:"#888"}}>{formatDateBR(a.data)}</p>
              {a.signature?<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,color:"#2e7d32",fontWeight:600}}>✅ Assinado em {a.signed_at}</span></div>:<span style={{fontSize:12,color:"#f57c00"}}>⏳ Aguardando assinatura</span>}
            </div>
          ))}
        </div>
      )}

      {tab==="cofrinho"&&cofrinho&&(
        <div>
          <div style={{background:"linear-gradient(135deg,#D9A7B4,#698494)",borderRadius:16,padding:20,marginBottom:16,color:"#fff"}}>
            <p style={{fontSize:11,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 4px",opacity:.8}}>Cofrinho de Recordações</p>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:"0 0 4px"}}>{cofrinho.plano}</p>
            <p style={{fontSize:14,margin:"0 0 16px",opacity:.9}}>R$ {cofrinho.saldo?.toLocaleString("pt-BR")} de saldo</p>
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:8,height:8,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(cofrinho.meses_pagos/12)*100)}%`,background:"#fff",borderRadius:8}}/></div>
            <p style={{fontSize:11,margin:"6px 0 0",opacity:.8}}>{cofrinho.meses_pagos} meses pagos · Resgate disponível após 3 meses</p>
          </div>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>Regras do Cofrinho</p>
            {[["Resgate mínimo","3 meses"],["Elegível em","Ensaios e fotos extras"],["Não elegível em","Eventos"],["Cancelamento","Sem reembolso do saldo"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"6px 0",borderBottom:"1px solid #f0e8e0"}}>
                <span style={{color:"#888"}}>{k}</span><span style={{fontWeight:600,color:"#1a1a1a"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="perfil"&&(
        <div>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>Seus dados</p>
            {[["Nome",logado.nome_mae],["E-mail",logado.email],["WhatsApp",logado.telefone],["CPF",logado.cpf_mae||"—"]].map(([k,v])=>(
              <div key={k} style={{marginBottom:8}}><p style={{fontSize:10,color:"#aaa",margin:"0 0 2px"}}>{k}</p><p style={{fontSize:13,fontWeight:600,margin:0}}>{v||"—"}</p></div>
            ))}
          </div>
          {logado.filhos?.length>0&&(
            <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16}}>
              <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>👶 Filhos</p>
              {logado.filhos.map((f,i)=>(
                <div key={i} style={{padding:"10px 0",borderBottom:"1px solid #f0e8e0"}}>
                  <p style={{margin:0,fontSize:13,fontWeight:600}}>{f.nome_crianca} · {f.idade}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>{f.atipico==="Sim"?"🧡 Atípico":"🌿 Típico"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CLIENT BOOKING FLOW ──────────────────────────────────────────
function ClientView() {
  const STEPS = ["Cadastro","Serviço","Data","Confirmar"];
  const [step,setStep]=useState(1);
  const [service,setService]=useState(null);
  const [modality,setModality]=useState(null);
  const [extras,setExtras]=useState([]);
  const [date,setDate]=useState(null);
  const [time,setTime]=useState(null);
  const [submitted,setSubmitted]=useState(false);
  const [loading,setLoading]=useState(false);
  const [clienteExistente,setClienteExistente]=useState(null);
  const [verificando,setVerificando]=useState(false);

  // STEP 1 — Cadastro
  const [cadastro,setCadastro]=useState({ nome_mae:"", email:"", telefone:"", cpf:"", temFilho:"" });
  const [filhos,setFilhos]=useState([{}]); // array de anamneses

  const setCad = (k,v) => setCadastro(p=>({...p,[k]:v}));

  const verificarCliente = async (telefone) => {
    const tel = telefone.replace(/\D/g,"");
    if(tel.length<10) return;
    setVerificando(true);
    try {
      const r = await getClienteByTelefone(tel);
      if(r&&r.length>0){
        const cl=r[0];
        setClienteExistente(cl);
        setCadastro(p=>({...p,nome_mae:cl.nome_mae,email:cl.email,cpf:cl.cpf_mae||""}));
        if(cl.filhos?.length>0){ setCadastro(p=>({...p,temFilho:"Sim"})); setFilhos(cl.filhos); }
      } else { setClienteExistente(null); }
    } catch(e){}
    setVerificando(false);
  };

  const addFilho = () => setFilhos(f=>[...f,{}]);
  const removeFilho = (i) => setFilhos(f=>f.filter((_,idx)=>idx!==i));
  const updateFilho = (i,data) => setFilhos(f=>f.map((x,idx)=>idx===i?data:x));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const tel = cadastro.telefone.replace(/\D/g,"");
      let cid;
      const ex = await getClienteByTelefone(tel);
      const filhosData = cadastro.temFilho==="Sim" ? filhos : [];
      const anamnese = filhosData[0]||{};
      if(ex&&ex.length>0){
        cid=ex[0].id;
        await atualizarCliente(cid,{nome_mae:cadastro.nome_mae,email:cadastro.email,cpf_mae:cadastro.cpf,filhos:filhosData,anamnese,ultimo_ensaio:date,total_ensaios:(ex[0].total_ensaios||0)+1,updated_at:new Date().toISOString()});
      } else {
        const nc=await criarCliente({nome_mae:cadastro.nome_mae,email:cadastro.email,telefone:tel,cpf_mae:cadastro.cpf,atipico:anamnese.atipico==="Sim",filhos:filhosData,anamnese,ultimo_ensaio:date,total_ensaios:1});
        cid=nc[0].id;
      }
      const calc = service?.descontoExtras ? calcularTotal(modality?.price||0,extras,true) : {total:modality?.price||0};
      await criarAgendamento({cliente_id:cid,servico:service?.label,servico_id:service?.id||null,modalidade:modality?.label,modalidade_id:modality?.id||null,data:date,hora:time,valor:calc.total||modality?.price||null,status:"Pendente",pagamento_status:"Pendente"});
      await fetch(WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome_mae:cadastro.nome_mae,email:cadastro.email,phone:cadastro.telefone,servico:service?.label,servico_id:service?.id,modalidade:modality?.label,grupo:service?.grupo,data:date,hora:time,filhos:filhosData,extras:extras.map(e=>e.label),valor:calc.total})}).catch(()=>{});
    } catch(e){ console.error(e); }
    setLoading(false);
    setSubmitted(true);
  };

  const Btn=({disabled,onClick,label})=><button disabled={disabled} onClick={onClick} style={{flex:2,padding:"13px",borderRadius:10,background:!disabled?"#1a1a1a":"#e8e0d8",color:!disabled?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:!disabled?"pointer":"default"}}>{label}</button>;
  const Back=({onClick})=><button onClick={onClick} style={{flex:1,padding:"12px",borderRadius:10,background:"#fff",border:"2px solid #e8e0d8",cursor:"pointer",fontSize:14,color:"#666"}}>← Voltar</button>;

  if(submitted) return(
    <div style={{textAlign:"center",padding:"48px 16px"}}>
      <div style={{fontSize:52,marginBottom:16}}>🌸</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:"#1a1a1a",marginBottom:8}}>Solicitação enviada!</h2>
      <p style={{color:"#888",fontSize:14,lineHeight:1.7,marginBottom:20}}>Em breve a <strong>Crescidinhos</strong> confirmará seu horário pelo WhatsApp. 🤍</p>
      <div style={{padding:16,background:"#faf8f5",borderRadius:12,textAlign:"left"}}>
        {[["Serviço",service?.label],["Modalidade",modality?.label],["Data",formatDateBR(date)],["Horário",time],["Nome",cadastro.nome_mae]].filter(([,v])=>v).map(([k,v])=><p key={k} style={{fontSize:13,color:"#666",margin:"0 0 5px"}}><strong>{k}:</strong> {v}</p>)}
      </div>
    </div>
  );

  const cadastroOk = cadastro.nome_mae&&cadastro.email&&cadastro.telefone&&cadastro.temFilho;

  return(
    <div>
      <StepBar step={step} steps={STEPS}/>

      {/* STEP 1 — Cadastro */}
      {step===1&&(
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a",marginBottom:4}}>Seus dados</h3>
          <p style={{fontSize:13,color:"#999",marginBottom:20,lineHeight:1.6}}>Preenchido uma vez, salvo para sempre 🌸</p>

          <Field label="WhatsApp" required>
            <input style={inp} type="tel" value={cadastro.telefone} onChange={e=>{setCad("telefone",e.target.value);verificarCliente(e.target.value);}} placeholder="(00) 00000-0000"/>
          </Field>
          {verificando&&<p style={{fontSize:11,color:"#b8967e",margin:"-8px 0 8px"}}>Verificando cadastro...</p>}
          {clienteExistente&&(
            <div style={{padding:12,background:"#e6f4ea",borderRadius:8,marginTop:-8,marginBottom:12}}>
              <p style={{fontSize:13,color:"#2e7d32",margin:0,fontWeight:600}}>✅ Olá, {clienteExistente.nome_mae?.split(" ")[0]}! Encontramos seu cadastro. Confirme seus dados abaixo.</p>
            </div>
          )}

          <Field label="Nome completo" required><input style={inp} value={cadastro.nome_mae} onChange={e=>setCad("nome_mae",e.target.value)} placeholder="Seu nome completo"/></Field>
          <Field label="E-mail" required><input style={inp} type="email" value={cadastro.email} onChange={e=>setCad("email",e.target.value)} placeholder="seu@email.com"/></Field>
          <Field label="CPF"><input style={inp} value={cadastro.cpf} onChange={e=>setCad("cpf",e.target.value)} placeholder="000.000.000-00"/></Field>

          <Field label="Este ensaio é para uma criança?" required>
            <Radio options={["Sim","Não"]} value={cadastro.temFilho} onChange={v=>{setCad("temFilho",v);if(v==="Não")setFilhos([{}]);}}/>
          </Field>

          {cadastro.temFilho==="Sim"&&(
            <div>
              {filhos.map((f,i)=>(
                <div key={i} style={{position:"relative"}}>
                  {filhos.length>1&&(
                    <button onClick={()=>removeFilho(i)} style={{position:"absolute",top:12,right:12,background:"#fde8e8",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12,color:"#c62828",zIndex:1}}>✕ Remover</button>
                  )}
                  <AnamneseForm
                    data={f}
                    onChange={data=>updateFilho(i,data)}
                    titulo={filhos.length>1?`👶 Filho ${i+1}`:null}
                  />
                </div>
              ))}
              <button onClick={addFilho} style={{width:"100%",padding:11,borderRadius:10,background:"#faf8f5",border:"1.5px dashed #b8967e",cursor:"pointer",fontSize:13,color:"#b8967e",fontWeight:600,marginBottom:16}}>
                + Adicionar outro filho
              </button>
            </div>
          )}

          <button disabled={!cadastroOk} onClick={()=>setStep(2)} style={{width:"100%",padding:"14px",borderRadius:12,background:cadastroOk?"#1a1a1a":"#e8e0d8",color:cadastroOk?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:17,cursor:cadastroOk?"pointer":"default"}}>
            Continuar →
          </button>
        </div>
      )}

      {/* STEP 2 — Serviço */}
      {step===2&&(
        <div>
          <ServiceSelector onConfirm={(s,m,ex)=>{setService(s);setModality(m);setExtras(ex||[]);setStep(3);}}/>
          <div style={{marginTop:12}}><Back onClick={()=>setStep(1)}/></div>
        </div>
      )}

      {/* STEP 3 — Data e hora */}
      {step===3&&(
        <div>
          <div style={{padding:"10px 12px",background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:10,marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{service?.icon}</span>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{service?.label} — {modality?.label}</p>
              {extras.length>0&&<p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>+ {extras.map(e=>e.label).join(", ")}</p>}
            </div>
          </div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>Escolha a data e horário</h3>
          <p style={{fontSize:12,color:"#999",marginBottom:14}}>Domingos não disponíveis</p>
          <Calendar selectedDate={date} onSelectDate={d=>{setDate(d);setTime(null);}}/>
          {date&&(
            <div style={{marginTop:14}}>
              <p style={{fontSize:12,color:"#999",marginBottom:10}}>Horários disponíveis em <strong>{formatDateBR(date)}</strong>:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {TIMES.map(t=><button key={t} onClick={()=>setTime(t)} style={{padding:"8px 14px",borderRadius:8,fontSize:13,border:time===t?"2px solid #1a1a1a":"2px solid #e8e0d8",background:time===t?"#1a1a1a":"#fff",color:time===t?"#fff":"#1a1a1a",cursor:"pointer"}}>{t}</button>)}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <Back onClick={()=>setStep(2)}/>
            <Btn disabled={!date||!time} onClick={()=>setStep(4)} label="Continuar →"/>
          </div>
        </div>
      )}

      {/* STEP 4 — Confirmar */}
      {step===4&&(
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>Confirmar agendamento</h3>
          <p style={{fontSize:12,color:"#999",marginBottom:16}}>Verifique os dados antes de enviar</p>
          <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:16}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,margin:"0 0 10px",letterSpacing:"1px",textTransform:"uppercase"}}>Resumo</p>
            {[
              ["Serviço",`${service?.icon} ${service?.label}`],
              ["Modalidade",modality?.label],
              ["Data",`${formatDateBR(date)} às ${time}`],
              ["Nome",cadastro.nome_mae],
              ["E-mail",cadastro.email],
              extras.length>0?["Adicionais",extras.map(e=>e.label).join(", ")]:null,
              modality?.price?["Valor estimado",`R$ ${calcularTotal(modality.price,extras,!!service?.descontoExtras).total.toLocaleString("pt-BR")}`]:null,
            ].filter(Boolean).map(([k,v])=>v&&(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0e8e0"}}>
                <span style={{fontSize:12,color:"#999"}}>{k}</span>
                <span style={{fontSize:13,color:"#1a1a1a",fontWeight:600,textAlign:"right",maxWidth:"60%"}}>{v}</span>
              </div>
            ))}
            {filhos.filter(f=>f.nome_crianca).map((f,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0e8e0"}}>
                <span style={{fontSize:12,color:"#999"}}>{filhos.length>1?`Filho ${i+1}`:"Criança"}</span>
                <span style={{fontSize:13,color:"#1a1a1a",fontWeight:600}}>{f.nome_crianca} · {f.idade}</span>
              </div>
            ))}
          </div>
          {extras.length>0&&service?.descontoExtras&&(
            <div style={{padding:10,background:"#e6f4ea",border:"1px solid #C0DD97",borderRadius:10,marginBottom:12,fontSize:12,color:"#27500A",fontWeight:500}}>
              🎉 Desconto de 10% aplicado por incluir adicionais!
            </div>
          )}
          <div style={{padding:12,background:"#fdf8f5",border:"1.5px solid #f0ddd0",borderRadius:10,marginBottom:16}}>
            <p style={{fontSize:12,color:"#b8967e",margin:0,lineHeight:1.6}}>💬 Em breve a <strong>Crescidinhos</strong> entrará em contato pelo WhatsApp para confirmar seu horário.</p>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Back onClick={()=>setStep(3)}/>
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
            {[["agenda","📅 Agenda"],["crm","🗂 CRM"]].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 4px",borderRadius:8,fontSize:12,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{l}</button>)}
          </div>
          {tab==="agenda"&&<AgendaView auth={auth} onVerCliente={(id)=>{setAbrirAgId(id);setTab("crm");}}/>}
          {tab==="crm"&&<CRMView abrirAgendamentoId={abrirAgId} onAgendamentoAberto={()=>setAbrirAgId(null)}/>}
        </>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("client");
  const [auth,setAuth]=useState(null);
  return(
    <div style={{fontFamily:"'Lato',sans-serif",background:"#f5f0eb",minHeight:"100vh",paddingBottom:48}}>
      <div style={{background:"#fff",padding:"20px 24px 14px",borderBottom:"1px solid #e8e0d8",marginBottom:24,textAlign:"center"}}>
        <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,margin:0,color:"#1a1a1a"}}>crescidinhos</h1>
        <p style={{fontSize:10,color:"#b8967e",margin:"2px 0 0",letterSpacing:"3px",textTransform:"uppercase"}}>fotografia</p>
        <div style={{marginTop:14,display:"inline-flex",background:"#f5f0eb",borderRadius:8,padding:3}}>
          <button onClick={()=>setView("client")} style={{padding:"7px 14px",borderRadius:6,fontSize:11,fontWeight:600,background:view==="client"?"#1a1a1a":"transparent",color:view==="client"?"#fff":"#888",border:"none",cursor:"pointer"}}>🌸 Agendar</button>
          <button onClick={()=>setView("minha-area")} style={{padding:"7px 14px",borderRadius:6,fontSize:11,fontWeight:600,background:view==="minha-area"?"#1a1a1a":"transparent",color:view==="minha-area"?"#fff":"#888",border:"none",cursor:"pointer"}}>👤 Minha Área</button>
          <button onClick={()=>setView("photographer")} style={{padding:"7px 14px",borderRadius:6,fontSize:11,fontWeight:600,background:view==="photographer"?"#1a1a1a":"transparent",color:view==="photographer"?"#fff":"#888",border:"none",cursor:"pointer"}}>{auth?"🗂 Painel":"🔐"}</button>
        </div>
      </div>
      <div style={{maxWidth:480,margin:"0 auto",padding:"0 18px"}}>
        {view==="client"&&<ClientView/>}
        {view==="minha-area"&&<ClientePanel/>}
        {view==="photographer"&&!auth&&<PhotographerLogin onLogin={setAuth}/>}
        {view==="photographer"&&auth&&<PhotographerPanel auth={auth} onLogout={()=>{setAuth(null);setView("client");}}/>}
      </div>
    </div>
  );
}
