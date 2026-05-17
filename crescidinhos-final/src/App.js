import { useState, useRef, useCallback, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { PHOTOGRAPHER, SERVICES, TIMES, WEBHOOK_URL } from "./config";
import { createCalendarEvent, fetchCalendarEvents } from "./googleCalendar";

// ─── CONFIGURAÇÃO SUPABASE ───────────────────────────────────────────────
const SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co";
const SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3";

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

const getClienteByTelefone = (tel) =>
  sb(`clientes?telefone=eq.${encodeURIComponent(tel)}&limit=1`);
const criarCliente = (dados) =>
  sb("clientes", { method: "POST", body: JSON.stringify(data) });
const atualizarCliente = (id, dados) =>
  sb(`clientes?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) });
const criarAgendamento = (dados) =>
  sb("agendamentos", { method: "POST", body: JSON.stringify(data) });
const getAgendamentos = () =>
  sb("agendamentos?select=*,clientes(*)&order=data.asc,hora.asc");
const getClientes = () =>
  sb("clientes?select=*,agendamentos(*)&order=created_at.desc");
const atualizarAgendamento = (id, dados) =>
  sb(`agendamentos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) });

const diasDesdeUltimoEnsaio = (ultimoEnsaio) => {
  if (!ultimoEnsaio) retornar 9999;
  const diff = new Date() - new Date(ultimoEnsaio);
  retornar Math.floor(diff / (1000 * 60 * 60 * 24));
};

// ─── AJUDANTES ──────────────────────────────────────────────────────
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sexo","Sáb"];
função obterDiasNoMês(y,m){ retornar novo Date(y,m+1,0).obterData(); }
function getFirstDay(y,m) { return new Date(y,m,1).getDay(); }
function pad(n) { return String(n).padStart(2,"0"); }
function formatDate(y,m,d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function formatDateBR(iso) { if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }
function mesAno(iso) { if(!iso) return "—"; const [y,m]=iso.split("-"); return `${MESES[parseInt(m)-1]}/${y}`; }

// ─── ESTILOS COMPARTILHADOS ─────────────────────────────────────────────────
const inp = { width:"100%", padding:"11px 13px", borderRadius:8, border:"1.5px solid #e0d8d0", fontSize:13, boxSizing:"border-box", outline:"none", background:"#fff", fontFamily:"inherit", color:"#1a1a1a" };
const lbl = { fontSize:12, color:"#555", fontWeight:600, display:"block", marginBottom:5 };
const sec = { fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:"#b8967e", fontWeight:700, margin:"20px 0 10px", borderBottom:"1px solid #f0e8e0", paddingBottom:5 };

função Campo({ rótulo, obrigatório, filhos }) {
  retornar (
    <div style={{ marginBottom:14 }}>
      <label style={lbl}>{label}{obrigatório && <span style={{color:"#b8967e"}}> *</span> xallabel>
      {crianças}
    </div>
  );
}

função Radio({ opções, valor, onChange }) {
  retornar (
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:4 }}>
      {options.map(o => (
        <label key={o} style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer", fontSize:13, color:"#333", lineHeight:1.5 }}>
          <div onClick={() => onChange(o)} style={{ width:18, height:18, borderRadius:"50%", border:"2px solid "+(value===o?"#1a1a1a":"#ccc"), background:value===o?"#1a1a1a":"#fff", flexShrink:0, cursor:"pointer", marginTop:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {value===o && <div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>}
          </div>
          {o}
        </label>
      ))}
    </div>
  );
}

função Verificar({ opções, valores=[], onChange }) {
  const toggle = o => onChange(values.includes(o) ? values.filter(x=>x!==o) : [...values,o]);
  retornar (
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:4 }}>
      {options.map(o => (
        <label key={o} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:13, color:"#333" }}>
          <div onClick={() => toggle(o)} style={{ width:18, height:18, borderRadius:4, border:"2px solid "+(values.includes(o)?"#1a1a1a":"#ccc"), background:values.includes(o)?"#1a1a1a":"#fff", flexShrink:0, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {values.includes(o) && <span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span>}
          </div>
          {o}
        </label>
      ))}
    </div>
  );
}

// ─── CALENDÁRIO ──────────────────────────────────────────────────────
function Calendar({ selectedDate, onSelectDate, busyDates=[] }) {
  const hoje = novo Date();
  const [vy, setVy] = useState(today.getFullYear());
  const [vm, setVm] = useState(today.getMonth());
  const dias = obterDiasNoMês(vy,vm);
  const firstDay = getFirstDay(vy,vm);
  const células = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=days;d++) cells.push(d);
  retornar (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
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
          const isBusy=busyDates.includes(ds);
          retornar(
            <div key={i} onClick={()=>!isPast&&!isSun&&onSelectDate(ds)} style={{textAlign:"center",padding:"7px 0",borderRadius:8,fontSize:13,fontWeight:isSel?700:400,background:isSel?"#1a1a1a":isBusy?"#fdf0e8":"transparent",color:isSel?"#fff":isPast||isSun?"#ccc":isBusy?"#b8967e":"#1a1a1a",cursor:isPast||isSun?"default":"pointer"}}>{d}</div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BARRA DE ETAPAS ─────────────────────────────────────────────────────
função StepBar({ passo }) {
  const steps = ["Serviço","Dados & Hora","Anamnese","Confirmar"];
  retornar (
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

// ─── ETIQUETAS DE ANAMNESE ─────────────────────── ───────────────────────
const ANAMNESE_LABELS = {
  transtorno:"Transtorno", tempo_transtorno:"Tempo desde diagnóstico", fazTerapia:"Faz terapia",
  desc_terapias:"Terapias", medicamentos:"Medicamentos", estereotipias:"Estereotipias",
  prevenir_crises:"Como prevenir crises", contornar:"Como contornar momentos difíceis",
  incomoda:"O que incomoda", incomoda_outro:"Incomoda (outro)", gosta:"Do que gosta",
  brinquedos:"Brinquedos favoritos", brinquedos_outro:"Brinquedo (outro)",
  social_atip:"Interação social", comunicacao:"Como se comunica", comunicacao_outro:"Comunicação (outro)",
  tempo_amb_atip:"Adaptação ao ambiente", ensaio_atip:"Já fez ensaio",
  desc_ensaio_atip:"Como foi o ensaio", outros_eventos:"Outros eventos com fotógrafo",
  extra_atip:"Informações extras", eca_atip:"Concordou com ECA",
  postar_transtorno:"Autoriza postar sobre transtorno", esquecer_mundo:"O que faz esquecer o mundo",
  personagem:"Personagem / música favorita", mania_roupa:"Mania com roupas",
  barulhos:"Como lida com barulhos", reacao_querer:"Reação quando quer algo",
  toque:"Gosta de toque", tempo_amb_tip:"Adaptação ao ambiente",
  ensaio_tip:"Já fez ensaio", desc_ensaio_tip:"Como foi o ensaio",
  extra_tip:"Informações extras", eca_tip:"Concordou com ECA",
};

const ECA = `Em conformidade com o ECA Digital (Lei nº 15.211/2025) e a LGPD: (1) As imagens do menor serão utilizadas apenas para as finalidades autorizadas, zelando pela dignidade da criança. (2) Fica vedada a publicação de fotos que expõem rotina ou localização escolar. (3) Você pode solicitar a remoção de qualquer imagem em até 24 horas.`;

// ─── FORMULÁRIO DE ANAMNESE ──────────────────────── ────────────────────────
função AnamneseForm({ dados, onChange }) {
  const set = (k,v) => onChange({...data,[k]:v});
  const atipico = data.atipico;
  retornar (
    <div>
      <p style={sec}>📋 Informações de contato</p>
      <Field label="Nome da mãe completo" obrigatório><input style={inp} value={data.nome_mae||""} onChange={e=>set("nome_mae",e.target.value)} placeholder="Nome completo" /></Field>
      <Field label="E-mail" required><input style={inp} type="email" value={data.email||""} onChange={e=>set("email",e.target.value)} placeholder="seu@email.com" /></Field>
      <Field label="WhatsApp" required><input style={inp} type="tel" value={data.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="(00) 00000-0000" /></Field>
      <Field label="Nome da criança" obrigatório><input style={inp} value={data.nome_crianca||""} onChange={e=>set("nome_crianca",e.target.value)} placeholder="Não precisa ser o nome inteiro" /></Field>
      <Field label="Idade da criança" obrigatório><input style={inp} value={data.idade||""} onChange={e=>set("idade",e.target.value)} placeholder="Ex: 2 anos e 3 meses" /></Field>
      <p style={sec}>🌟 Perfil da criança</p>
      <Field label="Seu filho é atípico? (TEA, TDAH, Síndrome de Down...)" obrigatório>
        <Opções de rádio={["sim","Não"]} value={data.atipico} onChange={v=>set("atipico",v)} />
      </Campo>
      {atipico==="sim" && (
        <div style={{background:"#fdf9f6",border:"1.5px solid #f0ddd0",borderRadius:12,padding:"16px 14px",marginTop:4}}>
          <p style={{...sec,marginTop:0}}>🧡 Crianças atípicas</p>
          <Field label="Qual transtorno?" obrigatório><input style={inp} value={data.transtorno||""} onChange={e=>set("transtorno",e.target.value)} placeholder="Ex: TEA nível 1, TDAH..." /></Field>
          <Field label="Há quanto tempo descobriu?"><Radio options={["a menos de seis meses","a menos de 1 ano","a mais de 1 ano","a mais de 2 anos"]} value={data.tempo_transtorno} onChange={v=>set("tempo_transtorno",v)} /></Field>
          <Field label="Faz terapias?"><Radio options={["sim","não"]} value={data.fazTerapia} onChange={v=>set("fazTerapia",v)} /></Field>
          {data.fazTerapia==="sim" && <Field label="Quais terapias e há quanto tempo?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.desc_terapias||""} onChange={e=>set("desc_terapias",e.target.value)} placeholder="Ex: ABA há 1 ano..." /></Field>}
          <Field label="Medicamentos ou métodos alternativos"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.medicamentos||""} onChange={e=>set("medicamentos",e.target.value)} /></Field>
          <Field label="Possui estereotipias? Se sim, descreva."><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.estereotipias||""} onChange={e=>set("estereotipias",e.target.value)} /></Field>
          <Field label="Como podemos prevenir crises?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.prevenir_crises||""} onChange={e=>set("prevenir_crises",e.target.value)} /></Field>
          <Field label="Como você costuma contornar momentos difíceis?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.contornar||""} onChange={e=>set("contornar",e.target.value)} /></Field>
          <Field label="O que incomoda a criança?">
            <Check options={["Luzes fortes / Flashes","Barulhos altos / Música","Toque físico / Texturas","Cheiros fortes"]} valores={data.incomoda||[]} onChange={v=>set("incomoda",v)} />
            <input style={{...inp,marginTop:8}} value={data.incomoda_outro||""} onChange={e=>set("incomoda_outro",e.target.value)} placeholder="Outro..." />
          </Campo>
          <Field label="Do que gosta muito?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.gosta||""} onChange={e=>set("gosta",e.target.value)} placeholder="Personagens, músicas — uso para criar conexão!" /></Campo>
          <Field label="Estilo de brinquedo favorito?">
            <Check options={["Fidget Spinner","Squishies/Slime","Bolas texturizadas"]} valores={data.brinquedos||[]} onChange={v=>set("brinquedos",v)} />
            <input style={{...inp,marginTop:8}} value={data.brinquedos_outro||""} onChange={e=>set("brinquedos_outro",e.target.value)} placeholder="Outro..." />
          </Campo>
          <Field label="Interação social"><Radio options={["Tranquilo, se relaciona com todos.","Não gosta de se socializar."]} value={data.social_atip} onChange={v=>set("social_atip",v)} /></Field>
          <Field label="Como se comunicar melhor?">
            <Radio options={["Fala verbalmente","Aponta/Gestos","Usa comunicação alternativa (cartões/tablet)","Não verbal"]} value={data.comunicacao} onChange={v=>set("comunicacao",v)} />
            <input style={{...inp,marginTop:8}} value={data.comunicacao_outro||""} onChange={e=>set("comunicacao_outro",e.target.value)} placeholder="Outro..." />
          </Campo>
          <Field label="Precisa de tempo para se acostumar?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.tempo_amb_atip||""} onChange={e=>set("tempo_amb_atip",e.target.value)} /></Field>
          <Field label="Já fez ensaios?"><Radio options={["Sim","Não"]} value={data.ensaio_atip} onChange={v=>set("ensaio_atip",v)} /></Field>
          {data.ensaio_atip==="Sim" && <Field label="Como foi?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.desc_ensaio_atip||""} onChange={e=>set("desc_ensaio_atip",e.target.value)} /></Field>}
          <Field label="Outros eventos com fotógrafo?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.outros_eventos||""} onChange={e=>set("outros_eventos",e.target.value)} /></Field>
          <Field label="Mais alguma informação importante?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.extra_atip||""} onChange={e=>set("extra_atip",e.target.value)} /></Field>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:10,padding:14,marginTop:10}}>
            <p style={{fontSize:12,fontWeight:700,color:"#1a1a1a",margin:"0 0 8px"}}>🔒 ECA Digital e LGPD</p>
            <p style={{fontSize:11,color:"#666",lineHeight:1.6,margin:"0 0 12px"}}>{ECA}</p>
            <Field label="Concorda com o ECA Digital?" obrigatório><Opções de rádio={["Sim","Não"]} valor={data.eca_atip} onChange={v=>set("eca_atip",v)} /></Field>
            {data.eca_atip==="Sim" && <Field label="Podemos postar sobre o transtorno?"><Radio options={["Sim, pode postar e falar sobre as questões dele!","Não, prefiro ficar mais reservado."]} value={data.postar_transtorno} onChange={v=>set("postar_transtorno",v)} /></Field>}
          </div>
        </div>
      )}
      {atipico==="Não" && (
        <div style={{background:"#f8fbf9",border:"1.5px solid #d8ece0",borderRadius:12,padding:"16px 14px",marginTop:4}}>
          <p style={{...sec,marginTop:0,color:"#5a9a6a"}}>🌿 Crianças típicas</p>
          <Field label="O que faz esquecer o mundo por 10 minutos?" obrigatório><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.esquecer_mundo||""} onChange={e=>set("esquecer_mundo",e.target.value)} /></Field>
          <Field label="Personagem ou música favorita?" obrigatório><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.personagem||""} onChange={e=>set("personagem",e.target.value)} /></Field>
          <Field label="Mania com roupas?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.mania_roupa||""} onChange={e=>set("mania_roupa",e.target.value)} /></Field>
          <Field label="Como lida com barulhos inesperados?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.barulhos||""} onChange={e=>set("barulhos",e.target.value)} /></Field>
          <Field label="Reação quando quer muito algo?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.reacao_querer||""} onChange={e=>set("reacao_querer",e.target.value)} /></Field>
          <Field label="Gosta de abraço?"><Radio options={["Gosta de abraços quentinhos!","Mais na dele(a)!"]} value={data.toque} onChange={v=>set("toque",v)} /></Field>
          <Field label="Precisa de tempo para se adaptar?" requerido><Radio options={["Melhor ter um tempo para se adaptar","Ele é tranquilo, vai que vai!"]} value={data.tempo_amb_tip} onChange={v=>set("tempo_amb_tip",v)} /></Field>
          <Field label="Já fez ensaios?"><Radio options={["Sim","Não"]} value={data.ensaio_tip} onChange={v=>set("ensaio_tip",v)} /></Field>
          {data.ensaio_tip==="Sim" && <Field label="Como foi?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.desc_ensaio_tip||""} onChange={e=>set("desc_ensaio_tip",e.target.value)} /></Field>}
          <Field label="Mais alguma informação?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.extra_tip||""} onChange={e=>set("extra_tip",e.target.value)} /></Field>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:10,padding:14,marginTop:10}}>
            <p style={{fontSize:12,fontWeight:700,color:"#1a1a1a",margin:"0 0 8px"}}>🔒 ECA Digital e LGPD</p>
            <p style={{fontSize:11,color:"#666",lineHeight:1.6,margin:"0 0 12px"}}>{ECA}</p>
            <Field label="Concorda com o ECA Digital?" obrigatório><Opções de rádio={["Sim","Não"]} valor={data.eca_tip} onChange={v=>set("eca_tip",v)} /></Field>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BLOCO DE ASSINATURA ──────────────────────────────────────────────────
função SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const getPos=(e,c)=>{ const r=c.getBoundingClientRect(); return{x:(e.touches?e.touches[0].clientX:e.clientX)-r.left,y:(e.touches?e.touches[0].clientY:e.clientY)-r.top}; };
  const start=(e)=>{ e.preventDefault(); drawing.current=true; const c=canvasRef.current; const ctx=c.getContext("2d"); const p=getPos(e,c); ctx.beginPath(); ctx.moveTo(px,py); };
  const draw=(e)=>{ e.preventDefault(); if(!drawing.current)return; const c=canvasRef.current; const ctx=c.getContext("2d"); const p=getPos(e,c); ctx.lineWidth=2; ctx.lineCap="round"; ctx.strokeStyle="#1a1a1a"; ctx.lineTo(px,py); ctx.stroke(); setHasDrawn(true); };
  const stop=()=>{ drawing.current=false; };
  const clear=()=>{ canvasRef.current.getContext("2d").clearRect(0,0,380,160); setHasDrawn(false); };
  const save=()=>onSave(canvasRef.current.toDataURL("image/png"));
  retornar (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:420}}>
        <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 4px"}}>Assinar contrato</h3>
        <p style={{fontSize:12,color:"#999",margin:"0 0 16px"}}>Assine com o dedo no espaço abaixo</p>
        <canvas ref={canvasRef} width={380} height={160} style={{width:"100%",height:160,border:"1.5px solid #e0d8d0",borderRadius:8,touchAction:"none",cursor:"crosshair",background:"#fafaf8"}} onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop} onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={clear} style={{flex:1,padding:"10px",borderRadius:8,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:13,color:"#666"}}>Limpar</button>
          <button onClick={onCancel} style={{flex:1,padding:"10px",borderRadius:8,background:"#fff",border:"1.5px solid #e0d8d0",cursor:"pointer",fontSize:13,color:"#666"}}>Cancelar</button>
          <button onClick={save} disabled={!hasDrawn} style={{flex:2,padding:"10px",borderRadius:8,background:hasDrawn?"#1a1a1a":"#e8e0d8",color:hasDrawn?"#fff":"#aaa",border:"none",cursor:hasDrawn?"pointer":"default",fontFamily:"'Cormorant Garamond',serif",fontSize:15}}>Assinar ✍️</button>
        </div>
      </div>
    </div>
  );
}

// ─── VISUALIZAÇÃO DO CONTRATO ─────────────────────────────────────────────────
função ContractView({ contract, onSigned }) {
  const [showPad, setShowPad] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const s = SERVICES.find(x=>x.label===contract.service)||{};
  retornar (
    <div>
      {showPad && <SignaturePad onSave={(sig)=>{ setShowPad(false); onSigned({...contract,signature:sig,signedAt:new Date().toLocaleString("pt-BR")}); }} onCancel={()=>setShowPad(false)} />}
      <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:20,marginBottom:16}}>
        <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>Contrato de Prestação de Serviços Fotográficos</p>
        <p style={sec}>Partes</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7,margin:"0 0 8px"}}><strong>CONTRATADA:</strong> {PHOTOGRAPHER.name}, {PHOTOGRAPHER.owner}, CPF {PHOTOGRAPHER.cpf}, {PHOTOGRAPHER.email}</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7,margin:0}}><strong>CONTRATANTE:</strong> {contract.nome_mae}, CPF {contract.cpf_mae||"___.___.___-__"}, {contract.email}</p>
        <p style={sec}>Objeto</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>Prestação de serviços fotográficos — ensaio <strong>{contract.service}</strong> de <strong>{contract.nome_crianca}</strong> em <strong>{formatDateBR(contract.date)}</strong> às <strong>{contract.time}</strong>.</p>
        <p style={sec}>Valor e Pagamento</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>Valor total: <strong>R$ {Number(contract.valor||s.price||0).toFixed(2).replace(".",",")}</strong>, a ser pago conforme combinado.</p>
        {contract.pagamento_link && <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>Link de pagamento: <a href={contract.pagamento_link} target="_blank" rel="noreferrer" style={{color:"#b8967e"}}>{contract.pagamento_link}</a></p>}
        <p style={sec}>Cancelamento e Reagendamento</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7,whiteSpace:"pre-line"}}>{"• Cancelamento com mais de 7 dias: reembolso integral do sinal.\n• Cancelamento entre 3 e 7 dias: sinal não reembolsável, pode ser usado para reagendamento.\n• Cancelamento com menos de 48h: sinal perdido, novos dados sujeitos à disponibilidade.\n• Imprevisto da CONTRATADA: novos dados sem custos adicionais."}</p>
        <p style={sec}>Direitos de Imagem</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>A CONTRATANTE autoriza o uso de imagens para portfólio e redes sociais. A remoção pode ser solicitada a qualquer momento, atendida em até 24 horas.</p>
        <p style={sec}>🔒 ECA Digital — Lei nº 15.211/2025 e LGPD</p>
        <p style={{fontSize:12,color:"#555",lineHeight:1.7}}>{ECA}</p>
        {contract.obs && <><p style={sec}>Observações</p><p style={{fontSize:13,color:"#444",lineHeight:1.7}}>{contract.obs}</p></>}
        <p style={{fontSize:11,color:"#bbb",marginTop:20}}>Gerado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}.</p>
      </div>
      <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:20,cursor:"pointer"}}>
        <div onClick={()=>setAgreed(!agreed)} style={{width:20,height:20,borderRadius:4,border:"2px solid "+(agreed?"#1a1a1a":"#ccc"),background:agreed?"#1a1a1a":"#fff",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {concordo && <span style={{color:"#fff",fontSize:12}}>✓</span>}
        </div>
        <span style={{fontSize:13,color:"#444",lineHeight:1.6}}>Li e concordo com todos os termos deste contrato.</span>
      </label>
      {contrato.assinatura}
        <div style={{padding:16,background:"#e6f4ea",borderRadius:12,textAlign:"center"}}><p style={{fontSize:14,color:"#2e7d32",fontWeight:600,margin:"0 0 4px"}}>✅ Contrato assinado!</p><p style={{fontSize:12,color:"#555",margin:0}}>Assinado em {contract.signedAt}</p><img src={contract.signature} alt="assinatura" style={{marginTop:8,maxWidth:200,opacity:0.7}} /></div>
        <button onClick={()=>setShowPad(true)} disabled={!agreed} style={{width:"100%",padding:14,borderRadius:10,background:agreed?"#1a1a1a":"#e8e0d8",color:agreed?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:agreed?"pointer":"default"}}>✍️ Assinar contrato</button>
      }
    </div>
  );
}

// ─── STATUS / PAGAMENTO ───────────────────── ──────────────────────
const STATUS_COLORS = {
  "Pendente": { bg:"#fff8e1", color:"#f57c00" },
  "Confirmado": { bg:"#e3f2fd", color:"#1565C0" },
  "Contrato": { bg:"#f3e5f5", color:"#7b1fa2" },
  "Concluído": { bg:"#e6f4ea", color:"#2e7d32" },
  "Cancelado": { bg:"#fde8e8", color:"#c62828" },
};
const PAG_COLORS = {
  "Pendente": { bg:"#fff8e1", color:"#f57c00" },
  "Parcial": { bg:"#e3f2fd", cor:"#1565C0" },
  "Pago": { bg:"#e6f4ea", color:"#2e7d32" },
  "Cancelado": { bg:"#fde8e8", color:"#c62828" },
};

// ─── FICHA RÁPIDA (sobreposição da agenda) ────────────────────────────
function FichaRapida({ agendamento, onVerMais, onFechar }) {
  const cl = agendamento?.clientes || {};
  const anamnese = cl.anamnese || {};
  const atipico = cl.atipico;
  const camposPrio = atipico ? [
    ["transtorno","Transtorno"],["prevenir_crises","Como prevenir crises"],
    ["contornar","Como contornar"],["incomoda","O que incomoda"],
    ["gosta","Do que gosta"],["comunicacao","Como se comunica"],["tempo_amb_atip","Adaptação"],
  ] : [
    ["esquecer_mundo","O que faz esquecer o mundo"],["personagem","Personagem / música favorita"],
    ["toque","Gosta de toque"],["tempo_amb_tip","Adaptação"],["barulhos","Como lida com barulhos"],
  ];
  retornar (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",padding:20,paddingBottom:36}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <p style={{fontSize:10,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 4px"}}>📸 {agendamento.servico} — {formatDateBR(agendamento.data)} às {agendamento.hora}</p>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,margin:"0 0 2px"}}>{cl.nome_mae}</h2>
            <p style={{fontSize:13,color:"#888",margin:0}}>👶 {cl.nome_crianca} · {cl.idade}{atipico?" · 🧡 Atípico":" · 🌿 Típico"}</p>
          </div>
          <button onClick={onFechar} style={{background:"#f5f0eb",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:18,color:"#999",lineHeight:1}}>✕</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <a href={`https://wa.me/55${(cl.telefone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{flex:1,padding:"9px",borderRadius:10,background:"#25D366",color:"#fff",textDecoration:"none",fontSize:12,fontWeight:600,textAlign:"center"}}>💬 WhatsApp</a>
          <a href={`mailto:${cl.email}`} style={{flex:1,padding:"9px",borderRadius:10,background:"#e3f2fd",color:"#1565C0",textDecoration:"none",fontSize:12,fontWeight:600,textAlign:"center"}}>✉️ E-mail</a>
        </div>
        {Object.keys(anamnese).length > 0 ? (
          <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>📋 Anamnese — {atipico?"🧡 Atípica":"🌿 Típica"}</p>
            {camposPrio.map(([k,label]) => {
              const v = anamnese[k];
              se (!v || v==="") retornar nulo;
              retornar (
                <div key={k} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #f0e8e0"}}>
                  <span style={{fontSize:10,color:"#b8967e",display:"block",fontWeight:700,marginBottom:3}}>{label}</span>
                  <span style={{fontSize:13,color:"#333",lineHeight:1.5}}>{Array.isArray(v)?v.join(", "):String(v)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{background:"#faf8f5",border:"1.5px dashed #e8e0d8",borderRadius:12,padding:14,marginBottom:12,textAlign:"center"}}>
            <p style={{fontSize:13,color:"#bbb",margin:0}}>Anamnese não preenchida</p>
          </div>
        )}
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div><p style={{fontSize:11,color:"#aaa",margin:"0 0 2px"}}>Valor</p><p style={{fontSize:16,fontWeight:700,color:"#1a1a1a",fontFamily:"'Cormorant Garamond',serif",margin:0}}>R$ {Number(agendamento.valor||0).toFixed(2).replace(".",",")}</p></div>
            <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:(PAG_COLORS[agendamento.pagamento_status]||PAG_COLORS["Pendente"]).bg,color:(PAG_COLORS[agendamento.pagamento_status]||PAG_COLORS["Pendente"]).color}}>💳 {agendamento.pagamento_status||"Pendente"}</span>
          </div>
          {agendamento.pagamento_link && (
            <a href={agendamento.pagamento_link} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",borderRadius:8,background:"#f0f7ff",color:"#1565C0",textDecoration:"none",fontSize:13,fontWeight:600}}>🔗 Link InfinityPay</a>
          )}
        </div>
        <button onClick={onVerMais} style={{width:"100%",padding:13,borderRadius:10,background:"#1a1a1a",color:"#fff",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:"pointer"}}>Ver ficha completa →</button>
      </div>
    </div>
  );
}

// ─── VISUALIZAÇÃO DA AGENDA (Google Calendar sincronizado) ───────────────────
function AgendaView({ auth, onVerCliente }) {
  const [calEvents, setCalEvents] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fichaSelecionada, setFichaSelecionada] = useState(null);

  const carregando = useCallback(async () => {
    definirCarregando(verdadeiro);
    tentar {
      const [eventos, ags] = await Promise.all([
        buscarEventosCalendar(auth.token.access_token),
        obterAgendamentos(),
      ]);
      setCalEvents(eventos || []);
      setAgendamentos(ags || []);
    } catch(e) { console.error(e); }
    finalmente {setLoading(falso); }
  }, [auth]);

  useEffect(() => { carregar(); }, [carregar]);

  const cruzarEvento = (evento) => {
    const dt = evento.start?.dateTime || evento.start?.date;
    se (!dt) retornar nulo;
    const dataEvento = dt.substring(0,10);
    const horaEvento = dt.length > 10 ? new Date(dt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : null;
    return agendamentos.find(a => {
      Se (a.data !== dataEvento) retorne falso;
      se (!horaEvento) retornar verdadeiro;
      return a.hora && a.hora.startsWith(horaEvento.substring(0,5));
    }) || nulo;
  };

  const hoje = new Date().toISOString().substring(0,10);
  const upcoming = calEvents
    .filter(e => { const dt=e.start?.dateTime||e.start?.date; return dt && dt.substring(0,10) >= hoje; })
    .sort((a,b) => ((a.start?.dateTime||a.start?.date||"")).localeCompare(b.start?.dateTime||b.start?.date||""))
    .slice(0,30);

  const porDia = {};
  próximo.forEach(e => {
    const dt = e.start?.dateTime||e.start?.date||"";
    const dia = dt.substring(0,10);
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(e);
  });
  const dias = Object.keys(porDia).sort();

  retornar (
    <div>
      {fichaSelecionada && (
        <FichaRápida
          agendamento={fichaSelecionada}
          onFechar={() => setFichaSelecionada(null)}
          onVerMais={() => { setFichaSelecionada(null); onVerCliente(fichaSelecionada.id); }}
        />
      )}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,margin:0}}>📅 Próximos ensaios</h3>
        <button onClick={carregar} style={{padding:"6px 12px",borderRadius:7,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:12,color:"#666"}}>🔄 Atualizar</button>
      </div>
      {loading && <p style={{textAlign:"center",color:"#bbb",fontSize:13,padding:"30px 0"}}>Sincronizando com o Google Agenda...</p>}
      {!loading && dias.length===0 && (
        <div style={{textAlign:"center",padding:"48px 16px"}}>
          <div style={{fontSize:40,marginBottom:12}}>📭</div>
          <p style={{fontSize:14,color:"#bbb"}}>Nenhum evento nos próximos dias</p>
        </div>
      )}
      {!carregando && dias.map(dia => {
        const isHoje = dia===hoje;
        const d = new Date(dia+"T12:00:00");
        const diaLabel = isHoje ? "Hoje" : d.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
        retornar (
          <div key={dia} style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:12,fontWeight:700,color:isHoje?"#b8967e":"#888",textTransform:"capitalize"}}>{diaLabel}</span>
              {isHoje && <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:"#fdf0e8",color:"#b8967e"}}>HOJE</span>}
              <div style={{flex:1,height:1,background:"#f0e8e0"}}/>
            </div>
            {porDia[dia].map(evento => {
              const ag = cruzarEvento(evento);
              const cl = ag?.clientes||{};
              const dt = evento.start?.dateTime||evento.start?.date;
              const hora = dt&&dt.length>10 ? new Date(dt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "";
              const st = ag ? STATUS_COLORS[ag.status]||STATUS_COLORS["Pendente"] : null;
              const pc = ag? PAG_COLORS[ag.pagamento_status]||PAG_COLORS["Pendente"] : null;
              retornar (
                <div key={evento.id} onClick={()=>ag&&setFichaSelecionada(ag)}
                  style={{padding:14,border:"1.5px sólido "+(isHoje?"#f0ddd0":"#e8e0d8"),borderRadius:12,marginBottom:8,cursor:ag?"pointer":"default",background:isHoje?"#fffbf8":"#fff",borderLeft:`4px sólido ${isHoje?"#b8967e":"#e8e0d8"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        {hora && <span style={{fontSize:13,fontWeight:700,color:"#b8967e",fontFamily:"'Cormorant Garamond',serif"}}>{hora}</span>}
                        <span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{evento.summary?.replace("📸 ","")}</span>
                      </div>
                      {ag && (
                        <div>
                          <p style={{margin:"0 0 4px",fontSize:12,color:"#888"}}>👶 {cl.nome_crianca} · {cl.atipico?"🧡 Atípico":"🌿 Típico"} · {cl.idade}</p>
                          <p style={{margin:"0 0 6px",fontSize:12,color:"#999"}}>📞 {cl.telefone}</p>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:st.bg,color:st.color}}>{ag.status}</span>
                            <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {ag.pagamento_status||"Pendente"}</span>
                            {cl.anamnese&&<span style={{padding:"2px 8px",borderRadius:10,fontSize:10,background:"#f5f0eb",color:"#888"}}>📋 Anamnese</span>}
                          </div>
                        </div>
                      )}
                      {!ag && evento.description && <p style={{margin:"4px 0 0",fontSize:11,color:"#aaa",lineHeight:1.5}}>{evento.description.substring(0,80)}</p>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8}}>
                      {ag && <p style={{fontSize:13,fontWeight:700,color:"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {Number(ag.valor||0).toFixed(2).replace(".",",")}</p>}
                      {ag && <span style={{fontSize:10,color:"#b8967e",fontWeight:700}}>Ver ficha →</span>}
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

// ─── VISUALIZAÇÃO CRM ──────────────────────────────────────────────────────
function CRMView({ abrirAgendamentoId, onAgendamentoAberto }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [tab, setTab] = useState("agendamentos");
  const [filter, setFilter] = useState("Todos");
  const [mesFiltro, setMesFiltro] = useState("todos");
  const [showContract, setShowContract] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newClient, setNewClient] = useState({nome_mae:"",nome_crianca:"",email:"",telefone:"",servico:"",data:"",hora:"",valor:"",obs:"",cpf_mae:"",pagamento_link:""});
  const [newAnamnese, setNewAnamnese] = useState({});
  const [salvando, setSalvando] = useState(false);

  const carregando = useCallback(async () => {
    definirCarregando(verdadeiro);
    tentar {
      const [ags, cls] = await Promise.all([getAgendamentos(), getClientes()]);
      setAgendamentos(ags||[]); setClientes(cls||[]);
    } catch(e){ console.error(e); }
    finalmente{ definirCarregamento(falso); }
  }, []);

  useEffect(()=>{ carregar(); },[carregar]);

  useEffect(()=>{
    if (abrirAgendamentoId && agendamentos.length>0) {
      setSelected(abrirAgendamentoId);
      setTab("agendamentos");
      onAgendamentoAberto&&onAgendamentoAberto();
    }
  },[abrirAgendamentoId,agendamentos]);

  const update = async(id,patch)=>{
    try{ await atualizarAgendamento(id,patch); setAgendamentos(as=>as.map(a=>a.id===id?{...a,...patch}:a)); }
    catch(e){ alert("Erro: "+e.message); }
  };

  const agendamento = selecionado ? agendamentos.find(a=>a.id===selected) : null;
  const cliente=selecionadoCliente? clientes.find(c=>c.id===selectedCliente) : null;
  const mesesDisp = [...new Set(agendamentos.map(a=>a.data?.substring(0,7)).filter(Boolean))].sort().reverse();
  const filtrado = agendamentos.filter(a=>{
    const statusOk = filter==="Todos"||a.status===filter;
    const mesOk = mesFiltro==="todos"||(a.data&&a.data.startsWith(mesFiltro));
    status de retorno Ok&&mesOk;
  });

  // ── Resumo Financeiro ───────────────────── ─────────────────────
  se (!carregando && tab==="stats") {
    const porMes={};
    agendamentos.filter(a=>a.status!=="Cancelado").forEach(a=>{
      se(!a.dados)retorne;
      const m=a.data.substring(0,7);
      if(!porMes[m])porMes[m]={recebido:0,pendente:0,total:0,qtd:0};
      const val=Number(a.valor||0);
      porMes[m].total+=val; porMes[m].qtd+=1;
      if(a.pagamento_status==="Pago") porMes[m].recebido+=val;
      senão porMes[m].pendente+=val;
    });
    const mesesOrd=Object.keys(porMes).sort().reverse();
    const totalRecebido=agendamentos.reduce((acc,a)=>a.pagamento_status==="Pago"?acc+Number(a.valor||0):acc,0);
    const totalPendente=agendamentos.filter(a=>a.status!=="Cancelado").reduce((acc,a)=>a.pagamento_status!=="Pago"?acc+Number(a.valor||0):acc,0);
    retornar (
      <div>
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {[["agendamentos","📅 Agenda"],["clientes","👥 Clientes"],["stats","📊 Resumo"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px 4px",borderRadius:8,fontSize:11,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div style={{padding:16,background:"#e6f4ea",border:"1.5px solid #a5d6a7",borderRadius:12,textAlign:"center"}}>
            <p style={{fontSize:11,color:"#2e7d32",fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"1px"}}>💰 Recebido</p>
            <p style={{fontSize:22,fontWeight:700,color:"#2e7d32",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {totalRecebido.toFixed(2).replace(".",",")}</p>
          </div>
          <div style={{padding:16,background:"#fff8e1",border:"1.5px solid #ffe082",borderRadius:12,textAlign:"center"}}>
            <p style={{fontSize:11,color:"#f57c00",fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"1px"}}>⏳ A receber</p>
            <p style={{fontSize:22,fontWeight:700,color:"#f57c00",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {totalPendente.toFixed(2).replace(".",",")}</p>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          {[["Agendamentos",agendamentos.length,"#1a1a1a"],["Clientes",clientes.length,"#b8967e"],["Concluídos",agendamentos.filter(a=>a.status==="Concluído").length,"#2e7d32"]].map(([l,n,cor])=>(
            <div key={l} style={{padding:12,background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,textAlign:"center"}}>
              <p style={{fontSize:22,fontWeight:700,color:cor,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{n}</p>
              <p style={{fontSize:10,color:"#999",margin:"3px 0 0"}}>{l}</p>
            </div>
          ))}
        </div>
        <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Receita por mês</p>
        {mesesOrd.map(m=>{
          const d=porMes[m];
          const pct=d.total>0?Math.round((d.recebido/d.total)*100):0;
          retornar(
            <div key={m} style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{mesAno(m+"-01")}</span>
                <span style={{fontSize:11,color:"#999"}}>{d.qtd} ensaio{d.qtd!==1?"s":""} · Total: R$ {d.total.toFixed(2).replace(".",",")}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><p style={{fontSize:10,color:"#2e7d32",fontWeight:700,margin:"0 0 2px"}}>✅ Recebido</p><p style={{fontSize:14,fontWeight:700,color:"#2e7d32",margin:0}}>R$ {d.recebido.toFixed(2).replace(".",",")}</p></div>
                <div><p style={{fontSize:10,color:"#f57c00",fontWeight:700,margin:"0 0 2px"}}>⏳ A receber</p><p style={{fontSize:14,fontWeight:700,color:"#f57c00",margin:0}}>R$ {d.pendente.toFixed(2).replace(".",",")}</p></div>
              </div>
              <div style={{height:6,background:"#f0e8e0",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:"#2e7d32",borderRadius:4}}/>
              </div>
              <p style={{fontSize:10,color:"#999",margin:"4px 0 0",textAlign:"right"}}>{pct}% recebido</p>
            </div>
          );
        })}
        <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"16px 0 10px"}}>Por status de pagamento</p>
        {Object.keys(PAG_COLORS).map(s=>{
          const lista=agendamentos.filter(a=>(a.pagamento_status||"Pendente")===s);
          const total=lista.reduce((acc,a)=>acc+Number(a.valor||0),0);
          const pc=PAG_COLORS[s];
          retornar(
            <div key={s} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:10,marginBottom:6,alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:700,background:pc.bg,color:pc.color}}>{s}</span>
                <span style={{fontSize:12,color:"#999"}}>{lista.length} ensaio{lista.length!==1?"s":""}</span>
              </div>
              <span style={{fontSize:14,fontWeight:700,color:"#1a1a1a",fontFamily:"'Cormorant Garamond',serif"}}>R$ {total.toFixed(2).replace(".",",")}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (showContrato && agendamento) return (
    <ContractView
      contrato={{...agendamento,nome_mae:agendamento.clientes?.nome_mae,nome_crianca:agendamento.clientes?.nome_crianca,email:agendamento.clientes?.email,serviço:agendamento.servico,data:agendamento.data,hora:agendamento.hora}}
      onSigned={async(sc)=>{ await update(agendamento.id,{signature:sc.signature,signed_at:sc.signedAt,status:"Contrato"}); setShowContract(false); }}
    />
  );

  // ── Detalhe do agendamento ──
  se (agenda) {
    const st=STATUS_COLORS[agendamento.status]||STATUS_COLORS["Pendente"];
    const pc=PAG_COLORS[agendamento.pagamento_status]||PAG_COLORS["Pendente"];
    const cl=agendamento.clientes||{};
    const camposAnamnese=Object.entries(cl.anamnese||{}).filter(([k,v])=>v&&v!==""&&!["nome_mae","email","phone","nome_crianca","idade","atipico"].includes(k));
    retornar (
      <div>
        <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#999",fontSize:13,marginBottom:16,padding:0}}>← Voltar</button>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div><h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 2px"}}>{cl.nome_mae}</h3><p style={{fontSize:12,color:"#999",margin:0}}>👶 {cl.nome_crianca} · {cl.atipico?"🧡 Atípico":"🌿 Típico"}</p></div>
            <span style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.color}}>{agendamento.status}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["Serviço",agendamento.servico],["Data",formatDateBR(agendamento.data)],["Horário",agendamento.hora],["Valor",`R$ ${Number(agendamento.valor||0).toFixed(2).replace(".",")}`],["E-mail",cl.email],["WhatsApp",cl.telefone]].map(([k,v])=>(
              <div key={k}><span style={{fontSize:10,color:"#aaa",display:"block"}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{v||"—"}</span></div>
            ))}
          </div>
        </div>
        {camposAnamnese.length>0 ? (
          <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>📋 Anamnese — {cl.atipico?"🧡 Atípica":"🌿 Típica"}</p>
            {camposAnamnese.map(([k,v])=>(
              <div key={k} style={{marginBottom:8,paddingBottom:8,borderBottom:"1px solid #f0e8e0"}}>
                <span style={{fontSize:10,color:"#b8967e",display:"block",fontWeight:600,marginBottom:2}}>{ANAMNESE_LABELS[k]||k.replace(/_/g," ")}</span>
                <span style={{fontSize:13,color:"#444",lineHeight:1.5}}>{Array.isArray(v)?v.join(", "):String(v)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{background:"#faf8f5",border:"1.5px dashed #e8e0d8",borderRadius:12,padding:14,marginBottom:12,textAlign:"center"}}><p style={{fontSize:13,color:"#bbb",margin:0}}>Anamnese não preenchido</p></div>
        )}
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
          <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Status do agendamento</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {Object.keys(STATUS_COLORS).map(s=>(
              <button key={s} onClick={()=>update(agendamento.id,{status:s})} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,border:"2px solid "+(agendamento.status===s?"#1a1a1a":"#e8e0d8"),background:agendamento.status===s?"#1a1a1a":"#fff",color:agendamento.status===s?"#fff":"#666",cursor:"pointer"}}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
          <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>💳 Pagamento InfinityPay</p>
          <Field label="Status do ">
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
              {Object.keys(PAG_COLORS).map(s=>(
                <button key={s} onClick={()=>update(agendamento.id,{pagamento_status:s})} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,border:"2px solid "+((agendamento.pagamento_status||"Pendente")===s?"#1a1a1a":"#e8e0d8"),background:(agendamento.pagamento_status||"Pendente ")===s?"#1a1a1a":"#fff",color:(agendamento.pagamento_status||"Pendente")===s?"#fff":"#666",cursor:"pointer"}}>{s}</button>
              ))}
            </div>
          </Campo>
          <Field label="Link de pagamento (InfinityPay)">
            <input style={inp} type="url" placeholder="Cole aqui o link gerado no app InfinityPay" value={agendamento.pagamento_link||""} onChange={e=>update(agendamento.id,{pagamento_link:e.target.value})} />
          </Campo>
          {agendamento.pagamento_link && (
            <a href={agendamento.pagamento_link} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px",borderRadius:8,background:"#e3f2fd",color:"#1565C0",textDecoration:"none",fontSize:13,fontWeight:600}}>🔗 Abrir link de pagamento</a>
          )}
        </div>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
          <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Contrato</p>
          {agendamento.assinatura}
            ? <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:"#2e7d32"}}>✅ Assinado em {agendamento.signed_at}</span></div>
            : <div>
                <p style={{fontSize:12,color:"#888",margin:"0 0 10px"}}>Contrato ainda não assinado.</p>
                <Field label="CPF do cliente"><input style={inp} placeholder="000.000.000-00" value={agendamento.cpf_mae||""} onChange={e=>update(agendamento.id,{cpf_mae:e.target.value})} /></Field>
                <Field label="Valor do ensaio (R$)"><input style={inp} type="number" value={agendamento.valor||""} onChange={e=>update(agendamento.id,{valor:e.target.value})} /></Field>
                <Field label="Observações"><textarea style={{...inp,resize:"vertical"}} rows={2} value={agendamento.obs||""} onChange={e=>update(agendamento.id,{obs:e.target.value})} /></Field>
                <button onClick={()=>setShowContract(true)} style={{width:"100%",padding:12,borderRadius:10,background:"#7b1fa2",color:"#fff",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:15,cursor:"pointer"}}>📄 Gerar e assinar contrato</button>
              </div>
          }
        </div>
        <a href={`https://wa.me/55${(cl.telefone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:13,borderRadius:10,background:"#25D366",color:"#fff",textDecoration:"none",fontSize:14,fontWeight:600,boxSizing:"border-box"}}>💬 Abrir WhatsApp</a>
      </div>
    );
  }

  // ── Detalhe do cliente ──
  se (cliente) {
    const ensaiosCliente=agendamentos.filter(a=>a.cliente_id===cliente.id);
    const camposAnamnese=Object.entries(cliente.anamnese||{}).filter(([k,v])=>v&&v!==""&&!["nome_mae","email","phone","nome_crianca","idade","atipico"].includes(k));
    retornar (
      <div>
        <button onClick={()=>setSelectedCliente(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#999",fontSize:13,marginBottom:16,padding:0}}>← Voltar</button>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 4px"}}>{cliente.nome_mae}</h3>
          <p style={{fontSize:12,color:"#999",margin:"0 0 12px"}}>👶 {cliente.nome_crianca} · {cliente.atipico?"🧡 Atípico":"🌿 Típico"} · {cliente.idade}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["E-mail",cliente.email],["WhatsApp",cliente.telefone],["Total de ensaios",cliente.total_ensaios||ensaiosCliente.length],["Último ensaio",formatDateBR(cliente.ultimo_ensaio)]].map(([k,v])=>(
              <div key={k}><span style={{fontSize:10,color:"#aaa",display:"block"}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{v||"—"}</span></div>
            ))}
          </div>
        </div>
        {camposAnamnese.length>0 ? (
          <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>📋 Anamnese — {cliente.atipico?"🧡 Atípica":"🌿 Típica"}</p>
            {camposAnamnese.map(([k,v])=>(
              <div key={k} style={{marginBottom:8,paddingBottom:8,borderBottom:"1px solid #f0e8e0"}}>
                <span style={{fontSize:10,color:"#b8967e",display:"block",fontWeight:600,marginBottom:2}}>{ANAMNESE_LABELS[k]||k.replace(/_/g," ")}</span>
                <span style={{fontSize:13,color:"#444",lineHeight:1.5}}>{Array.isArray(v)?v.join(", "):String(v)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{background:"#faf8f5",border:"1.5px dashed #e8e0d8",borderRadius:12,padding:14,marginBottom:12,textAlign:"center"}}><p style={{fontSize:13,color:"#bbb",margin:0}}>Anamnese não preenchido</p></div>
        )}
        <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"16px 0 10px"}}>Histórico de ensaios</p>
        {ensaiosCliente.length===0&&<p style={{fontSize:13,color:"#bbb",textAlign:"center",padding:"20px 0"}}>Nenhum ensaio registrado</p>}
        {ensaiosCliente.map(a=>{
          const st=STATUS_COLORS[a.status]||STATUS_COLORS["Pendente"];
          const pc=PAG_COLORS[a.pagamento_status]||PAG_COLORS["Pendente"];
          retornar(
            <div key={a.id} onClick={()=>{ setSelectedCliente(null); setSelected(a.id); }} style={{padding:12,border:"1.5px solid #e8e0d8",borderRadius:10,marginBottom:8,cursor:"pointer",background:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:600}}>{a.servico}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:"#999"}}>{formatDateBR(a.data)} às {a.hora}</p>
                  <div style={{display:"flex",gap:5,marginTop:4}}>
                    <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:st.bg,color:st.color}}>{a.status}</span>
                    <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {a.pagamento_status||"Pendente"}</span>
                  </div>
                </div>
                <p style={{fontSize:13,fontWeight:700,color:"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif"}}>R$ {Number(a.valor||0).toFixed(2).replace(".",",")}</p>
              </div>
            </div>
          );
        })}
        <a href={`https://wa.me/55${(cliente.telefone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:13,borderRadius:10,background:"#25D366",color:"#fff",textDecoration:"none",fontSize:14,fontWeight:600,boxSizing:"border-box",marginTop:12}}>💬 Abrir WhatsApp</a>
      </div>
    );
  }

  retornar (
    <div>
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,overflowY:"auto",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:20,maxWidth:480,margin:"0 auto",paddingBottom:40}}>
            <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,margin:"0 0 4px"}}>Novo agendamento</h3>
            <p style={{fontSize:12,color:"#999",margin:"0 0 16px"}}>Dados do ensaio + anamnese da criança</p>
            <p style={sec}>📅 Dados do agendamento</p>
            {[["nome_mae","Nome da mãe","text"],["nome_crianca","Nome da criança","text"],["cpf_mae","CPF da mãe","text"],["email","E-mail","email"],["telefone","WhatsApp","tel"],["dados","Dados do ensaio","data"],["hora","Horário","hora"],["valor","Valor (R$)","número"]].map(([k,l,t])=>(
              <Field key={k} label={l}><input style={inp} type={t} value={newClient[k]||""} onChange={e=>setNewClient(n=>({...n,[k]:e.target.value}))} /></Field>
            ))}
            <Field label="Serviço">
              <select style={inp} value={newClient.servico} onChange={e=>setNewClient(n=>({...n,servico:e.target.value}))}>
                <option value="">Selecione...</option>
                {SERVICES.map(s=><option key={s.id} value={s.label}>{s.label}</option>)}
              </select>
            </Campo>
            <Field label="Observações"><textarea style={{...inp,resize:"vertical"}} rows={2} value={newClient.obs||""} onChange={e=>setNewClient(n=>({...n,obs:e.target.value}))} /></Field>
            <Field label="Link de despach InfinityPay">
              <input style={inp} type="url" placeholder="Cole o link gerado no app InfinityPay" value={newClient.pagamento_link||""} onChange={e=>setNewClient(n=>({...n,pagamento_link:e.target.value}))} />
            </Campo>
            <p style={sec}>📋 Anamnese da criança</p>
            <AnamneseForm data={newAnamnese} onChange={setNewAnamnese} />
            <div style={{display:"flex",gap:10,marginTop:24}}>
              <botão onClick={()=>{ setShowNew(false); setNewClient({nome_mae:"",nome_crianca:"",email:"",telefone:"",servico:"",data:"",hora:"",valor:"",obs:"",cpf_mae:"",pagamento_link:""}); setNewAnamnese({}); }} style={{flex:1,padding:12,borderRadius:10,background:"#fff",border:"1.5px sólido #e8e0d8",cursor:"pointer",color:"#666"}}>Cancelar</button>
              <button disabled={salvando} onClick={async()=>{
                definirSalvando(verdadeiro);
                tentar{
                  const ex=await getClienteByTelefone(newClient.telefone);
                  deixe cid;
                  if(ex&&ex.length>0){ cid=ex[0].id; await atualizarCliente(cid,{nome_mae:newClient.nome_mae,nome_crianca:newClient.nome_crianca,email:newClient.email,atipico:newAnamnese.atipico==="sim",anamnese:newAnamnese,updated_at:new Date().toISOString()}); }
                  else{ const nc=await criarCliente({nome_mae:newClient.nome_mae,nome_crianca:newClient.nome_crianca,email:newClient.email,telefone:newClient.telefone,atipico:newAnamnese.atipico==="sim",anamnese:newAnamnese}); cid=nc[0].id; }
                  await criarAgendamento({cliente_id:cid,servico:newClient.servico,data:newClient.data,hora:newClient.hora,valor:newClient.valor,obs:newClient.obs,cpf_mae:newClient.cpf_mae,pagamento_link:newClient.pagamento_link||null,pagamento_status:"Pendente",status:"Pendente"});
                  setShowNew(falso); setNewClient({nome_mae:"",nome_crianca:"",email:"",telefone:"",servico:"",data:"",hora:"",valor:"",obs:"",cpf_mae:"",pagamento_link:""}); setNewAnamnese({}); carregar();
                }catch(e){ alert("Erro: "+e.message); }
                finalmente{ definirSalvando(falso); }
              }} style={{flex:2,padding:12,borderRadius:10,background:salvando?"#ccc":"#1a1a1a",color:"#fff",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:salvando?"default":"pointer"}}>
                {salvando?"Salvando...":"Salvar agendamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["agendamentos","📅 Agenda"],["clientes","👥 Clientes"],["stats","📊 Resumo"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px 4px",borderRadius:8,fontSize:11,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {loading&&<p style={{textAlign:"center",color:"#bbb",fontSize:13,padding:"30px 0"}}>Carregando...</p>}

      {!loading&&tab==="agendamentos"&&(
        <>
          <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
            <div style={{flex:1,overflowX:"auto"}}><div style={{display:"flex",gap:5}}>{["Todos",...Object.keys(STATUS_COLORS)].map(s=><button key={s} onClick={()=>setFilter(s)} style={{padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap",background:filter===s?"#1a1a1a":"#fff",color:filter===s?"#fff":"#666",border:"1.5px solid "+(filter===s?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{s}</button>)}</div></div>
            <button onClick={()=>setShowNew(true)} style={{padding:"8px 14px",borderRadius:8,background:"#b8967e",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,flexShrink:0}}>+ Novo</button>
          </div>
          {mesesDisp.length>1&&(
            <div style={{overflowX:"auto",marginBottom:12}}><div style={{display:"flex",gap:5}}>
              {[["todos","Todos"],...mesesDisp.map(m=>[m,mesAno(m+"-01")])].map(([v,l])=>(
                <button key={v} onClick={()=>setMesFiltro(v)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap",background:mesFiltro===v?"#b8967e":"#fff",color:mesFiltro===v?"#fff":"#888",border:"1.5px solid "+(mesFiltro===v?"#b8967e":"#e8e0d8"),cursor:"pointer"}}>{l}</button>
              ))}
            </div></div>
          )}
          {filtered.length===0&&<p style={{textAlign:"center",color:"#bbb",fontSize:14,marginTop:40}}>Nenhum agendamento</p>}
          {filtered.map(a=>{
            const st=STATUS_COLORS[a.status]||STATUS_COLORS["Pendente"];
            const pc=PAG_COLORS[a.pagamento_status]||PAG_COLORS["Pendente"];
            const cl=a.clientes||{};
            retornar(
              <div key={a.id} onClick={()=>setSelected(a.id)} style={{padding:14,border:"1.5px solid #e8e0d8",borderRadius:12,marginBottom:10,cursor:"pointer",background:"#fff"}}>
                <div style={ {display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontWeight:600,fontSize:14,color:"#1a1a1a"}}>{cl.nome_mae||"—"}</p>
                    <p style={{margin:"3px 0 0",fontSize:12,color:"#999"}}>{a.servico} · {formatDateBR(a.data)} {a.hora}</p>
                    <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                      <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:st.bg,color:st.color}}>{a.status}</span>
                      <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:pc.bg,color:pc.color}}>💳 {a.pagamento_status||"Pendente"}</span>
                      {cl.atipico?<span style={{padding:"2px 8px",borderRadius:10,fontSize:10,background:"#fdf0e8",color:"#b8967e"}}>🧡 Atípico</span>:<span style={{padding:"2px 8px",borderRadius:10,fontSize:10,background:"#f0f9f4",color:"#5a9a6a"}}>🌿 Típico</span>}
                      {cl.anamnese&&<span style={{padding:"2px 8px",borderRadius:10,fontSize:10,background:"#f5f0eb",color:"#888"}}>📋</span>}
                    </div>
                  </div>
                  <p style={{fontSize:14,fontWeight:700,color:"#1a1a1a",margin:0,fontFamily:"'Cormorant Garamond',serif",flexShrink:0,marginLeft:8}}>R$ {Number(a.valor||0).toFixed(2).replace(".",",")}</p>
                </div>
              </div>
            );
          })}
        </>
      )}

      {!loading&&tab==="clientes"&&(
        <>
          <p style={{fontSize:12,color:"#999",marginBottom:12}}>{clientes.length} cliente{clientes.length!==1?"s":""} cadastrada{clientes.length!==1?"s":""}</p>
          {clientes.length===0&&<p style={{textAlign:"center",color:"#bbb",fontSize:14,marginTop:40}}>Nenhuma cliente ainda</p>}
          {clientes.map(c=>{
            const dias=diasDesdeUltimoEnsaio(c.ultimo_ensaio);
            const badge=dias<90?{label:"Frequente 🌟",bg:"#e6f4ea",color:"#2e7d32"}:dias<180?{label:"Regular",bg:"#e3f2fd",color:"#1565C0"}:c.ultimo_ ensaio?{label:"Retorno",bg:"#fff8e1",color:"#f57c00"}:{label:"Nova",bg:"#f3e5f5",color:"#7b1fa2"};
            retornar(
              <div key={c.id} onClick={()=>setSelectedCliente(c.id)} style={{padding:14,border:"1.5px solid #e8e0d8",borderRadius:12,marginBottom:10,cursor:"pointer",background:"#fff"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <p style={{margin:0,fontWeight:600,fontSize:14}}>{c.nome_mae}</p>
                    <p style={{margin:"3px 0 0",fontSize:12,color:"#999"}}>👶 {c.nome_crianca} · {c.atipico?"🧡 Atípico":"🌿 Típico"}</p>
                    <p style={{margin:"3px 0 0",fontSize:11,color:"#b8967e"}}>{c.total_ensaios||0} ensaio{(c.total_ensaios||0)!==1?"s":""} · último: {formatDateBR(c.ultimo_ensaio)}{c.anamnese?" · 📋":""}</p>
                  </div>
                  <span style={{padding:"3px 8px",borderRadius:12,fontSize:10,fontWeight:700,background:badge.bg,color:badge.color,flexShrink:0}}>{badge.label}</span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── FLUXO DE AGENDAMENTO DE CLIENTES ───────────────────────────────────────────
função ClientView() {
  const [step,setStep]=useState(1);
  const [serviceId,setServiceId]=useState(null);
  const [date,setDate]=useState(null);
  const [hora,setTime]=useState(null);
  const [anamnese,setAnamnese]=useState({});
  const [submitted,setSubmitted]=useState(false);
  const [carregando,setLoading]=useState(false);
  const [clienteExistente,setClienteExistente]=useState(null);
  const [verificandoCliente,setVerificandoCliente]=useState(false);
  const service=SERVICES.find(s=>s.id===serviceId);

  const verificarCliente=async(telefone)=>{
    const tel=telefone.replace(/\D/g,"");
    se (tel.length < 10) retorne;
    setVerificandoCliente(true);
    tentar{
      const r=await getClienteByTelefone(tel);
      if(r&&r.length>0){ const cl=r[0]; setClienteExistente(cl); setAnamnese(p=>({...p,nome_mae:cl.nome_mae,nome_crianca:cl.nome_crianca,email:cl.email,idade:cl.idade,atipico:cl.atipico?"sim":"Não",...(cl.anamnese||{})})); }
      senão setClienteExistente(null);
    }catch(e){}
    finalmente{setVerificandoCliente(false);}
  };
  const precisaAnamnese=()=>!clienteExistente||diasDesdeUltimoEnsaio(clienteExistente.ultimo_ensaio)>180;

  const handleSubmit=async()=>{
    definirCarregando(verdadeiro);
    tentar{
      const telefone=(anamnese.phone||"").replace(/\D/g,"");
      deixe cid;
      const ex=aguardar getClienteByTelefone(telefone);
      if(ex&&ex.length>0){ cid=ex[0].id; await atualizarCliente(cid,{anamnese,ultimo_ensaio:date,total_ensaios:(ex[0].total_ensaios||0)+1,updated_at:new Date().toISOString()}); }
      else{ const nc=await criarCliente({nome_mae:anamnese.nome_mae,nome_crianca:anamnese.nome_crianca,email:anamnese.email,telefone,idade:anamnese.idade,atipico:anamnese.atipico==="sim",anamnese,ultimo_ensaio:date,total_ensaios:1}); cid=nc[0].id; }
      await criarAgendamento({cliente_id:cid,servico:service?.label,data:date,hora:time,status:"Pendente",pagamento_status:"Pendente"});
      espere fetch(WEBHOOK_URL,{método:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome_mae:anamnese.nome_mae,nome_crianca:anamnese.nome_cr ianca,email:anamnese.email,phone:anamnese.phone,servico:service?.label,data:date,hora:time,atipico:anamnese.atipico,idade:anamnese.idade})}).catch(()=>{});
    }catch(e){console.error(e);}
    setLoading(false); setSubmitted(true);
  };

  se(enviado) retornar(
    <div style={{textAlign:"center",padding:"48px 16px"}}>
      <div style={{fontSize:52,marginBottom:16}}>🌸</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:"#1a1a1a",marginBottom:8}}>Solicitação enviada!</h2>
      <p style={{color:"#888",fontSize:14,lineHeight:1.7,marginBottom:20}}>Em breve a <strong>Crescidinhos</strong> confirmará seu horário pelo WhatsApp. 🤍</p>
      <div style={{padding:16,background:"#faf8f5",borderRadius:12,textAlign:"left"}}>
        {[["Serviço",service?.label],["Data",formatDateBR(date)],["Horário",time],["Mãe",anamnese.nome_mae],["Criança",anamnese.nome_crianca]].map(([k,v])=>(
          <p key={k} style={{fontSize:13,color:"#666",margin:"0 0 5px"}}><strong>{k}:</strong> {v||"—"}</p>
        ))}
      </div>
    </div>
  );

  const Btn=({disabled,onClick,label})=><button disabled={disabled} onClick={onClick} style={{flex:2,padding:"13px",borderRadius:10,background:!disabled?"#1a1a1a":"#e8e0d8",color:!disabled?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:!disabled?"pointer":"default"}}>{label}</button>;
  const Voltar=({onClick})=><button onClick={onClick} style={{flex:1,padding:"12px",borderRadius:10,background:"#fff",border:"2px solid #e8e0d8",cursor:"pointer",fontSize:14,color:"#666"}}>← Voltar</button>;

  retornar(
    <div>
      <StepBar step={step}/>
      {passo===1&&(
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>Escolha o tipo de ensaio</h3>
          <p style={{fontSize:12,color:"#999",marginBottom:16}}>Toque no serviço para ver os pacotes</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {SERVICES.map(s=>{
              const isOpen=serviceId===s.id;
              retornar(
                <div key={s.id} style={{borderRadius:12,border:isOpen?"2px solid #1a1a1a":"2px solid #e8e0d8",background:isOpen?"#faf8f5":"#fff",overflow:"hidden"}}>
                  <div onClick={()=>setServiceId(isOpen?null:s.id)} style={{padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:22}}>{s.icon}</span>
                      <div>
                        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:600,color:"#1a1a1a",margin:0}}>{s.label}</p>
                        <p style={{fontSize:11,color:"#999",margin:"2px 0 0"}}>{s.duration} · a partir de R$ {s.price.toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                    <span style={{fontSize:14,color:"#b8967e",fontWeight:700}}>{isOpen?"▲":"▼"}</span>
                  </div>
                  {isOpen&&(
                    <div style={{padding:"0 16px 16px",borderTop:"1px solid #f0e8e0"}}>
                      <p style={{fontSize:12,color:"#666",margin:"10px 0 10px",lineHeight:1.5}}>{s.desc}</p>
                      {s.highlight&&<p style={{fontSize:11,color:"#b8967e",margin:"0 0 12px"}}>✨ {s.highlight}</p>}
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {s.packages.map((pk,i)=>(
                          <div key={i} style={{padding:"10px 12px",borderRadius:8,background:"#fff",border:"1.5px solid #e8e0d8"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                              <span style={{fontSize:13,fontWeight:700}}>{pk.name}</span>
                              <span style={{fontSize:14,fontWeight:700,color:"#b8967e",fontFamily:"'Cormorant Garamond',serif"}}>R$ {pk.price.toLocaleString("pt-BR")}</span>
                            </div>
                            <p style={{fontSize:11,color:"#888",margin:0,lineHeight:1.5}}>{pk.desc}</p>
                          </div>
                        ))}
                      </div>
                      {s.obs&&<p style={{fontSize:11,color:"#aaa",margin:"10px 0 0",lineHeight:1.5,fontStyle:"italic"}}>* {s.obs}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button disabled={!serviceId} onClick={()=>setStep(2)} style={{marginTop:20,width:"100%",padding:"14px",borderRadius:10,background:serviceId?"#1a1a1a":"#e8e0d8",color:serviceId?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:serviceId?"pointer":"default"}}>
            {serviceId?`Continuar com ${SERVICES.find(s=>s.id===serviceId)?.label} →`:"Selecione um serviço"}
          </button>
        </div>
      )}
      {passo===2&&(
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>Escolha dados e horário</h3>
          <p style={{fontSize:12,color:"#999",marginBottom:14}}>Domingos não disponíveis</p>
          <Calendar selectedDate={date} onSelectDate={d=>{setDate(d);setTime(null);}}/>
          {data&&(
            <div style={{marginTop:14}}>
              <p style={{fontSize:12,color:"#999",marginBottom:10}}>Horários em <strong>{formatDateBR(date)}</strong>:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {TIMES.map(t=><button key={t} onClick={()=>setTime(t)} style={{padding:"8px 14px",borderRadius:8,fontSize:13,border:time===t?"2px solid #1a1a1a":"2px solid #e8e0d8",background:time===t?"#1a1a1a":"#fff",color:time===t?"#fff":"#1a1a1a",cursor:"pointer"}}>{t}</button>)}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,marginTop:20}}><Voltar onClick={()=>setStep(1)}/><Btn disabled={!date||!time} onClick={()=>setStep(3)} label="Continuar →"/></div>
        </div>
      )}
      {passo===3&&(
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>{precisaAnamnese()?"Ficha de anamnese":"Confirme seus dados"}</h3>
          <div style={{marginBottom:16}}>
            <Field label="WhatsApp" required>
              <input style={inp} type="tel" value={anamnese.phone||""} onChange={e=>{ setAnamnese(a=>({...a,phone:e.target.value})); verificarCliente(e.target.value); }} placeholder="(00) 00000-0000"/>
            </Campo>
            {verificandoCliente&&<p style={{fontSize:11,color:"#b8967e",margin:"-8px 0 8px"}}>Verificando cadastro...</p>}
            {clienteExistente&&(
              <div style={{padding:12,background:"#e6f4ea",borderRadius:8,marginTop:-8,marginBottom:8}}>
                <p style={{fontSize:13,color:"#2e7d32",margin:0,fontWeight:600}}>✅ Olá, {clienteExistente.nome_mae}! Descubra seu cadastro.</p>
                {!precisaAnamnese()&&<p style={{fontSize:11,color:"#555",margin:"4px 0 0"}}>Como você veio recentemente, não precisa preencher a anamnese novamente! 🌸</p>}
                {precisaAnamnese()&&<p style={{fontSize:11,color:"#555",margin:"4px 0 0"}}>Faz um tempo que não nos vemos! Por favor, atualize seus dados. 🌸</p>}
              </div>
            )}
          </div>
          {precisaAnamnese()
            ? <AnamneseForm data={anamnese} onChange={setAnamnese}/>
            : (
              <div>
                <p style={{fontSize:12,color:"#999",marginBottom:16}}>Confirme seus dados para o agendamento 🤍</p>
                <Field label="Nome da mãe" obrigatório><input style={inp} value={anamnese.nome_mae||""} onChange={e=>setAnamnese(a=>({...a,nome_mae:e.target.value}))}/></Field>
                <Field label="Nome da criança" obrigatório><input style={inp} value={anamnese.nome_crianca||""} onChange={e=>setAnamnese(a=>({...a,nome_crianca:e.target.value}))}/></Field>
                <Field label="E-mail" required><input style={inp} value={anamnese.email||""} onChange={e=>setAnamnese(a=>({...a,email:e.target.value}))}/></Field>
                <Field label="Idade atual da criança" obrigatório><input style={inp} value={anamnese.idade||""} onChange={e=>setAnamnese(a=>({...a,idade:e.target.value}))} placeholder="Ex: 8 meses"/></Field>
              </div>
            )
          }
          <div style={{display:"flex",gap:10,marginTop:24}}><Voltar onClick={()=>setStep(2)}/><Btn disabled={false} onClick={()=>setStep(4)} label="Revisar →"/></div>
        </div>
      )}
      {passo===4&&(
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>Confirmar agendamento</h3>
          <p style={{fontSize:12,color:"#999",marginBottom:16}}>Verifique os dados antes de enviar</p>
          <div style={{background:"#faf8f5",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:16}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,margin:"0 0 10px",letterSpacing:"1px",textTransform:"uppercase"}}>Resumo</p>
            {[["Serviço",service?.label],["Data",formatDateBR(date)],["Horário",time],["Mãe / responsável",anamnese.nome_mae],["Criança",anamnese.nome_crianca],["E-mail",anamnese.email],["Perfil",anamnese.atipico==="sim"?"🧡 Criança atípica":anamnese.atipico==="Não"?"🌿 Criança típica":"—"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0e8e0"}}>
                <span style={{fontSize:12,color:"#999"}}>{k}</span>
                <span style={{fontSize:13,color:"#1a1a1a",fontWeight:600,textAlign:"right",maxWidth:"58%"}}>{v||"—"}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}><Back onClick={()=>setStep(3)}/><Btn disabled={loading} onClick={handleSubmit} label={loading?"Enviando...":"Enviar solicitação 🌸"}/></div>
        </div>
      )}
    </div>
  );
}

// ─── LOGIN DO FOTÓGRAFO ────────────────────────────────────────────
função PhotographerLogin({ onLogin }) {
  const login=useGoogleLogin({
    onSuccess:async(t)=>{
      tentar{
        const r=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:`Bearer ${t.access_token}`}});
        const info=await r.json();
        onLogin({token:t,email:info.email});
      }catch{ alert("Não foi possível verificar o usuário."); }
    },
    onError:()=>alert("Erro ao fazer login."),
    escopo:"https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
  });
  retornar(
    <div style={{textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:40,marginBottom:16}}>📷</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:"#1a1a1a",marginBottom:8}}>Área Restrita</h2>
      <p style={{fontSize:13,color:"#888",marginBottom:32,lineHeight:1.6}}>Acesse com sua conta Google para entrar no painel.</p>
      <button onClick={()=>login()} style={{display:"inline-flex",alignItems:"center",gap:12,padding:"14px 28px",borderRadius:10,background:"#fff",border:"2px solid #e8e0d8",cursor:"pointer",fontSize:14,fontWeight:600,color:"#1a1a1a",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
          <path fill="#FF3D00" d="M6,3 14,7l6,6 4,8C14,7 16,1 19 13 24 13c3,1 0 5,8 1,1 7,9 3l5,7-5,7C34,5 6,5 29,5 4 24 4 16,3 4 9,7 8,3 6,3 14,7z"/>
          <path fill="#4CAF50" d="M24 44c5,2 0 9,9-2 13,4-5,2l-6,2-5,2C29,3 35,5 26,8 36 24 36c-5,2 0-9,6-3,3-11,3-8H6.1C9,5 35,7 16,3 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2C43 35 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"/>
        </svg>
        Entrar com o Google
      </button>
    </div>
  );
}

// ─── PAINEL DO FOTÓGRAFO ────────────────────────────────────────────
function PhotographerPanel({ auth, onLogout }) {
  const [tab,setTab]=useState("agenda");
  const [abrirAgId,setAbrirAgId]=useState(null);

  retornar(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,padding:"10px 14px",background:"#fff",borderRadius:12,border:"1.5px solid #e8e0d8"}}>
        <div><p style={{margin:0,fontSize:13,fontWeight:600,color:"#1a1a1a"}}>Painel da fotógrafa 📷</p><p style={{margin:"2px 0 0",fontSize:11,color:"#999"}}>{auth.email}</p></div>
        <button onClick={onLogout} style={{padding:"6px 12px",borderRadius:8,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:12,color:"#666"}}>Sair</button>
      </div>
      {auth.email!==PHOTOGRAPHER.email&&(
        <div style={{padding:16,background:"#fde8e8",borderRadius:12,marginBottom:16,textAlign:"center"}}>
          <p style={{fontSize:13,color:"#c62828",margin:0}}>🚫 Acesso restrito à fotografia.</p>
        </div>
      )}
      {auth.email===PHOTOGRAPHER.email&&(
        <>
          <div style={{display:"flex",gap:6,marginBottom:20}}>
            {[["agenda","📅 Agenda"],["crm","🗂 CRM"]].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 4px",borderRadius:8,fontSize:12,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          {tab==="agenda"&&<AgendaView auth={auth} onVerCliente={(id)=>{ setAbrirAgId(id); setTab("crm"); }}/>}
          {tab==="crm"&&<CRMView abrirAgendamentoId={abrirAgId} onAgendamentoAberto={()=>setAbrirAgId(null)}/>}
        </>
      )}
    </div>
  );
}

// ─── RAIZ DO APLICATIVO ──────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("client");
  const [auth,setAuth]=useState(null);
  retornar(
    <div style={{fontFamily:"'Lato',sans-serif",background:"#f5f0eb",minHeight:"100vh",paddingBottom:48}}>
      <div style={{background:"#fff",padding:"20px 24px 14px",borderBottom:"1px solid #e8e0d8",marginBottom:24,textAlign:"center"}}>
        <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,margin:0,color:"#1a1a1a"}}>crescidinhos</h1>
        <p style={{fontSize:10,color:"#b8967e",margin:"2px 0 0",letterSpacing:"3px",textTransform:"uppercase"}}>fotografia</p>
        <div style={{marginTop:14,display:"inline-flex",background:"#f5f0eb",borderRadius:8,padding:3}}>
          <button onClick={()=>setView("client")} style={{padding:"7px 16px",borderRadius:6,fontSize:11,fontWeight:600,background:view==="client"?"#1a1a1a":"transparent",color:view==="client"?"#fff":"#888",border:"none",cursor:"pointer"}}>🌸 Agendamento</button>
          <button onClick={()=>setView("photographer")} style={{padding:"7px 16px",borderRadius:6,fontSize:11,fontWeight:600,background:view==="photographer"?"#1a1a1a":"transparent",color:view==="photographer"?"#fff":"#888",border:"none",cursor:"pointer"}}>{auth?"🗂 Painel":"🔐"}</button>
        </div>
      </div>
      <div style={{maxWidth:480,margin:"0 auto",padding:"0 18px"}}>
        {view==="client"&&<ClientView/>}
        {view==="photographer"&&!auth&&<PhotographerLogin onLogin={setAuth}/>}
        {view==="photographer"&&auth&&<PhotographerPanel auth={auth} onLogout={()=>{ setAuth(null); setView("client"); }}/>}
      </div>
    </div>
  );
}
