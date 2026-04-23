import { useState, useRef, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { PHOTOGRAPHER, SERVICES, TIMES, WEBHOOK_URL } from "./config";
import { createCalendarEvent, fetchCalendarEvents } from "./googleCalendar";

// ─── HELPERS ─────────────────────────────────────────────────────
const MONTHS   = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m)   { return new Date(y,m,1).getDay(); }
function pad(n)              { return String(n).padStart(2,"0"); }
function formatDate(y,m,d)  { return `${y}-${pad(m+1)}-${pad(d)}`; }
function formatDateBR(iso)  { if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }

// ─── SHARED STYLES ────────────────────────────────────────────────
const inp = { width:"100%", padding:"11px 13px", borderRadius:8, border:"1.5px solid #e0d8d0", fontSize:13, boxSizing:"border-box", outline:"none", background:"#fff", fontFamily:"inherit", color:"#1a1a1a" };
const lbl = { fontSize:12, color:"#555", fontWeight:600, display:"block", marginBottom:5 };
const sec = { fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:"#b8967e", fontWeight:700, margin:"20px 0 10px", borderBottom:"1px solid #f0e8e0", paddingBottom:5 };

// ─── SHARED COMPONENTS ───────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={lbl}>{label}{required && <span style={{color:"#b8967e"}}> *</span>}</label>
      {children}
    </div>
  );
}

function Radio({ options, value, onChange }) {
  return (
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

function Check({ options, values=[], onChange }) {
  const toggle = o => onChange(values.includes(o) ? values.filter(x=>x!==o) : [...values,o]);
  return (
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

// ─── CALENDAR ────────────────────────────────────────────────────
function Calendar({ selectedDate, onSelectDate, busyDates=[] }) {
  const today = new Date();
  const [vy, setVy] = useState(today.getFullYear());
  const [vm, setVm] = useState(today.getMonth());
  const days = getDaysInMonth(vy,vm);
  const firstDay = getFirstDay(vy,vm);
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=days;d++) cells.push(d);

  return (
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
          return(
            <div key={i} onClick={()=>!isPast&&!isSun&&onSelectDate(ds)} style={{
              textAlign:"center",padding:"7px 0",borderRadius:8,fontSize:13,fontWeight:isSel?700:400,
              background:isSel?"#1a1a1a":isBusy?"#fdf0e8":"transparent",
              color:isSel?"#fff":isPast||isSun?"#ccc":isBusy?"#b8967e":"#1a1a1a",
              cursor:isPast||isSun?"default":"pointer",
            }}>{d}</div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STEP BAR ────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ["Serviço","Data & Hora","Anamnese","Confirmar"];
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

// ─── ANAMNESE FORM ────────────────────────────────────────────────
const ECA = `Em conformidade com o ECA Digital (Lei nº 15.211/2025) e a LGPD: (1) As imagens do menor serão utilizadas apenas para as finalidades autorizadas, zelando pela dignidade da criança. (2) Fica vedada a publicação de fotos que exponham rotina ou localização escolar. (3) Você pode solicitar a remoção de qualquer imagem em até 24 horas.`;

function AnamneseForm({ data, onChange }) {
  const set = (k,v) => onChange({...data,[k]:v});
  const atipico = data.atipico;

  return (
    <div>
      <p style={sec}>📋 Informações de contato</p>
      <Field label="Nome da mãe completo" required><input style={inp} value={data.nome_mae||""} onChange={e=>set("nome_mae",e.target.value)} placeholder="Nome completo" /></Field>
      <Field label="E-mail" required><input style={inp} type="email" value={data.email||""} onChange={e=>set("email",e.target.value)} placeholder="seu@email.com" /></Field>
      <Field label="WhatsApp" required><input style={inp} type="tel" value={data.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="(00) 00000-0000" /></Field>
      <Field label="Nome da criança" required><input style={inp} value={data.nome_crianca||""} onChange={e=>set("nome_crianca",e.target.value)} placeholder="Não precisa ser o nome inteiro" /></Field>
      <Field label="Idade da criança" required><input style={inp} value={data.idade||""} onChange={e=>set("idade",e.target.value)} placeholder="Ex: 2 anos e 3 meses" /></Field>

      <p style={sec}>🌟 Perfil da criança</p>
      <Field label="Seu filho é atípico? (TEA, TDAH, Síndrome de Down, epilepsia...)" required>
        <Radio options={["sim","Não"]} value={data.atipico} onChange={v=>set("atipico",v)} />
      </Field>

      {atipico==="sim" && (
        <div style={{background:"#fdf9f6",border:"1.5px solid #f0ddd0",borderRadius:12,padding:"16px 14px",marginTop:4}}>
          <p style={{...sec,marginTop:0}}>🧡 Crianças atípicas</p>
          <Field label="Qual transtorno seu filho apresenta?" required><input style={inp} value={data.transtorno||""} onChange={e=>set("transtorno",e.target.value)} placeholder="Ex: TEA nível 1, TDAH..." /></Field>
          <Field label="A quanto tempo você descobriu o transtorno?"><Radio options={["a menos de seis meses","a menos de 1 ano","a mais de 1 ano","a mais de 2 anos"]} value={data.tempo_transtorno} onChange={v=>set("tempo_transtorno",v)} /></Field>
          <Field label="Ele faz práticas de terapias?"><Radio options={["sim","não"]} value={data.fazTerapia} onChange={v=>set("fazTerapia",v)} /></Field>
          {data.fazTerapia==="sim" && <Field label="Descreva quais terapias e há quanto tempo"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.desc_terapias||""} onChange={e=>set("desc_terapias",e.target.value)} placeholder="Ex: ABA há 1 ano..." /></Field>}
          <Field label="Medicamentos ou métodos alternativos"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.medicamentos||""} onChange={e=>set("medicamentos",e.target.value)} /></Field>
          <Field label="Ele possui estereotipias? Se sim, descreva."><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.estereotipias||""} onChange={e=>set("estereotipias",e.target.value)} /></Field>
          <Field label="Como podemos prevenir crises?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.prevenir_crises||""} onChange={e=>set("prevenir_crises",e.target.value)} /></Field>
          <Field label="Como você costuma ajudar e contornar esses momentos?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.contornar||""} onChange={e=>set("contornar",e.target.value)} /></Field>
          <Field label="O que incomoda a criança?">
            <Check options={["Luzes fortes / Flashes","Barulhos altos / Música","Toque físico / Texturas","Cheiros fortes"]} values={data.incomoda||[]} onChange={v=>set("incomoda",v)} />
            <input style={{...inp,marginTop:8}} value={data.incomoda_outro||""} onChange={e=>set("incomoda_outro",e.target.value)} placeholder="Outro..." />
          </Field>
          <Field label="Do que ele(a) gosta muito?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.gosta||""} onChange={e=>set("gosta",e.target.value)} placeholder="Personagens, músicas — usamos para criar conexão!" /></Field>
          <Field label="Qual estilo de brinquedo ele gosta?">
            <Check options={["Fidget Spinner","Squishies/Slime","Bolas texturizadas"]} values={data.brinquedos||[]} onChange={v=>set("brinquedos",v)} />
            <input style={{...inp,marginTop:8}} value={data.brinquedos_outro||""} onChange={e=>set("brinquedos_outro",e.target.value)} placeholder="Outro..." />
          </Field>
          <Field label="Como é a interação social dele?"><Radio options={["Tranquilo, se relaciona com todos.","Não gosta de se socializar."]} value={data.social_atip} onChange={v=>set("social_atip",v)} /></Field>
          <Field label="Como seu filho se comunica melhor?">
            <Radio options={["Fala verbalmente","Aponta/Gestos","Usa comunicação alternativa (cartões/tablet)","Não verbal"]} value={data.comunicacao} onChange={v=>set("comunicacao",v)} />
            <input style={{...inp,marginTop:8}} value={data.comunicacao_outro||""} onChange={e=>set("comunicacao_outro",e.target.value)} placeholder="Outro..." />
          </Field>
          <Field label="Ele(a) precisa de tempo para se acostumar com o ambiente?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.tempo_amb_atip||""} onChange={e=>set("tempo_amb_atip",e.target.value)} /></Field>
          <Field label="Vocês já fizeram ensaios fotográficos?"><Radio options={["Sim","Não"]} value={data.ensaio_atip} onChange={v=>set("ensaio_atip",v)} /></Field>
          {data.ensaio_atip==="Sim" && <Field label="Como foi a sessão?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.desc_ensaio_atip||""} onChange={e=>set("desc_ensaio_atip",e.target.value)} /></Field>}
          <Field label="Outros eventos com fotógrafo?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.outros_eventos||""} onChange={e=>set("outros_eventos",e.target.value)} /></Field>
          <Field label="Mais alguma informação importante?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.extra_atip||""} onChange={e=>set("extra_atip",e.target.value)} /></Field>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:10,padding:14,marginTop:10}}>
            <p style={{fontSize:12,fontWeight:700,color:"#1a1a1a",margin:"0 0 8px"}}>🔒 Proteção e Privacidade Digital</p>
            <p style={{fontSize:11,color:"#666",lineHeight:1.6,margin:"0 0 12px"}}>{ECA}</p>
            <Field label="Você está de acordo com o ECA Digital?" required><Radio options={["Sim","Não"]} value={data.eca_atip} onChange={v=>set("eca_atip",v)} /></Field>
            {data.eca_atip==="Sim" && <Field label="Podemos postar sobre o transtorno do seu filho?"><Radio options={["Sim, pode postar e falar sobre as questões dele!","Não, prefiro ficar mais reservada. Pode postar as fotos, sem ressaltar as questões dele."]} value={data.postar_transtorno} onChange={v=>set("postar_transtorno",v)} /></Field>}
          </div>
        </div>
      )}

      {atipico==="Não" && (
        <div style={{background:"#f8fbf9",border:"1.5px solid #d8ece0",borderRadius:12,padding:"16px 14px",marginTop:4}}>
          <p style={{...sec,marginTop:0,color:"#5a9a6a"}}>🌿 Crianças típicas</p>
          <Field label="O que faz ele(a) esquecer do mundo por 10 minutos?" required><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.esquecer_mundo||""} onChange={e=>set("esquecer_mundo",e.target.value)} /></Field>
          <Field label="Algum personagem ou música que é tiro e queda?" required><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.personagem||""} onChange={e=>set("personagem",e.target.value)} /></Field>
          <Field label="Tem alguma mania com roupas?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.mania_roupa||""} onChange={e=>set("mania_roupa",e.target.value)} /></Field>
          <Field label="Como lida com barulhos inesperados?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.barulhos||""} onChange={e=>set("barulhos",e.target.value)} /></Field>
          <Field label="Quando quer muito uma coisa, como costuma reagir?"><textarea style={{...inp,resize:"vertical"}} rows={2} value={data.reacao_querer||""} onChange={e=>set("reacao_querer",e.target.value)} /></Field>
          <Field label="Gosta de abraço e toque ou prefere observar?"><Radio options={["Gosta de abraços quentinhos!","Mais na dele(a)!"]} value={data.toque} onChange={v=>set("toque",v)} /></Field>
          <Field label="Precisa de tempo para se acostumar com o ambiente?" required><Radio options={["Melhor ter um tempo para se adaptar","Ele é tranquilo, vai que vai!"]} value={data.tempo_amb_tip} onChange={v=>set("tempo_amb_tip",v)} /></Field>
          <Field label="Vocês já fizeram ensaios fotográficos?"><Radio options={["Sim","Não"]} value={data.ensaio_tip} onChange={v=>set("ensaio_tip",v)} /></Field>
          {data.ensaio_tip==="Sim" && <Field label="Como foi a sessão?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.desc_ensaio_tip||""} onChange={e=>set("desc_ensaio_tip",e.target.value)} /></Field>}
          <Field label="Mais alguma informação importante?"><textarea style={{...inp,resize:"vertical"}} rows={3} value={data.extra_tip||""} onChange={e=>set("extra_tip",e.target.value)} /></Field>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:10,padding:14,marginTop:10}}>
            <p style={{fontSize:12,fontWeight:700,color:"#1a1a1a",margin:"0 0 8px"}}>🔒 Proteção e Privacidade Digital</p>
            <p style={{fontSize:11,color:"#666",lineHeight:1.6,margin:"0 0 12px"}}>{ECA}</p>
            <Field label="Você está de acordo com o ECA Digital?" required><Radio options={["Sim","Não"]} value={data.eca_tip} onChange={v=>set("eca_tip",v)} /></Field>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIGNATURE PAD ────────────────────────────────────────────────
function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const start = (e) => { e.preventDefault(); drawing.current=true; const c=canvasRef.current; const ctx=c.getContext("2d"); const p=getPos(e,c); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
  const draw  = (e) => { e.preventDefault(); if(!drawing.current) return; const c=canvasRef.current; const ctx=c.getContext("2d"); const p=getPos(e,c); ctx.lineWidth=2; ctx.lineCap="round"; ctx.strokeStyle="#1a1a1a"; ctx.lineTo(p.x,p.y); ctx.stroke(); setHasDrawn(true); };
  const stop  = () => { drawing.current=false; };
  const clear = () => { canvasRef.current.getContext("2d").clearRect(0,0,380,160); setHasDrawn(false); };
  const save  = () => onSave(canvasRef.current.toDataURL("image/png"));

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:420}}>
        <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 4px",color:"#1a1a1a"}}>Assinar contrato</h3>
        <p style={{fontSize:12,color:"#999",margin:"0 0 16px"}}>Assine com o dedo no espaço abaixo</p>
        <canvas ref={canvasRef} width={380} height={160}
          style={{width:"100%",height:160,border:"1.5px solid #e0d8d0",borderRadius:8,touchAction:"none",cursor:"crosshair",background:"#fafaf8"}}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
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
  const s = SERVICES.find(x => x.label === contract.service) || {};

  return (
    <div>
      {showPad && <SignaturePad onSave={(sig) => { setShowPad(false); onSigned({...contract,signature:sig,signedAt:new Date().toLocaleString("pt-BR")}); }} onCancel={() => setShowPad(false)} />}
      <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:20,marginBottom:16}}>
        <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>Contrato de Prestação de Serviços Fotográficos</p>
        <p style={sec}>Partes</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7,margin:"0 0 8px"}}><strong>CONTRATADA:</strong> {PHOTOGRAPHER.name}, {PHOTOGRAPHER.owner}, CPF {PHOTOGRAPHER.cpf}, {PHOTOGRAPHER.email}</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7,margin:0}}><strong>CONTRATANTE:</strong> {contract.nome_mae}, CPF {contract.cpf_mae||"___.___.___-__"}, {contract.email}</p>
        <p style={sec}>Objeto</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>Prestação de serviços fotográficos referente ao ensaio <strong>{contract.service}</strong> da criança <strong>{contract.nome_crianca}</strong>, a realizar-se em <strong>{formatDateBR(contract.date)}</strong> às <strong>{contract.time}</strong>.</p>
        <p style={sec}>Valor e Pagamento</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>O valor total do serviço é de <strong>R$ {Number(contract.valor||s.price||0).toFixed(2).replace(".",",")}</strong>, a ser pago conforme combinado entre as partes.</p>
        <p style={sec}>Cancelamento e Reagendamento</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7,whiteSpace:"pre-line"}}>{"• Cancelamento com mais de 7 dias: reembolso integral do sinal.\n• Cancelamento entre 3 e 7 dias: sinal não reembolsável, pode ser usado para reagendamento.\n• Cancelamento com menos de 48h: sinal perdido, nova data sujeita à disponibilidade.\n• Imprevisto da CONTRATADA: nova data sem custos adicionais."}</p>
        <p style={sec}>Direitos de Imagem</p>
        <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>A CONTRATANTE autoriza o uso das imagens para portfólio e redes sociais conforme selecionado na anamnese. A remoção pode ser solicitada a qualquer momento, atendida em até 24 horas.</p>
        <p style={sec}>🔒 ECA Digital — Lei nº 15.211/2025 e LGPD</p>
        <p style={{fontSize:12,color:"#555",lineHeight:1.7}}>{ECA}</p>
        {contract.obs && <><p style={sec}>Observações</p><p style={{fontSize:13,color:"#444",lineHeight:1.7}}>{contract.obs}</p></>}
        <p style={{fontSize:11,color:"#bbb",marginTop:20}}>Gerado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}.</p>
      </div>
      <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:20,cursor:"pointer"}}>
        <div onClick={() => setAgreed(!agreed)} style={{width:20,height:20,borderRadius:4,border:"2px solid "+(agreed?"#1a1a1a":"#ccc"),background:agreed?"#1a1a1a":"#fff",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {agreed && <span style={{color:"#fff",fontSize:12}}>✓</span>}
        </div>
        <span style={{fontSize:13,color:"#444",lineHeight:1.6}}>Li e concordo com todos os termos deste contrato.</span>
      </label>
      {contract.signature
        ? <div style={{padding:16,background:"#e6f4ea",borderRadius:12,textAlign:"center"}}><p style={{fontSize:14,color:"#2e7d32",fontWeight:600,margin:"0 0 4px"}}>✅ Contrato assinado!</p><p style={{fontSize:12,color:"#555",margin:0}}>Assinado em {contract.signedAt}</p><img src={contract.signature} alt="assinatura" style={{marginTop:8,maxWidth:200,opacity:0.7}} /></div>
        : <button onClick={() => setShowPad(true)} disabled={!agreed} style={{width:"100%",padding:14,borderRadius:10,background:agreed?"#1a1a1a":"#e8e0d8",color:agreed?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:agreed?"pointer":"default"}}>✍️ Assinar contrato</button>
      }
    </div>
  );
}

// ─── CRM ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  "Pendente":   { bg:"#fff8e1", color:"#f57c00" },
  "Confirmado": { bg:"#e3f2fd", color:"#1565C0" },
  "Contrato":   { bg:"#f3e5f5", color:"#7b1fa2" },
  "Concluído":  { bg:"#e6f4ea", color:"#2e7d32" },
  "Cancelado":  { bg:"#fde8e8", color:"#c62828" },
};

function CRMView() {
  const [clients, setClients] = useState([
    { id:1, nome_mae:"Juliana Mendes", nome_crianca:"Pedro", service:"Newborn", date:"2026-04-12", time:"08:00", status:"Confirmado", email:"ju@email.com", phone:"11999991234", atipico:true, valor:550, obs:"", cpf_mae:"", signature:null },
    { id:2, nome_mae:"Camila Rocha",   nome_crianca:"Sofia",  service:"Gestante", date:"2026-05-03", time:"14:30", status:"Contrato",  email:"ca@email.com", phone:"11988885678", atipico:false, valor:350, obs:"Prefere tarde.", cpf_mae:"", signature:null },
    { id:3, nome_mae:"Fernanda Lima",  nome_crianca:"Lucas",  service:"Infantil Avulso", date:"2026-05-20", time:"10:00", status:"Pendente", email:"fe@email.com", phone:"11977779012", atipico:false, valor:280, obs:"", cpf_mae:"", signature:null },
  ]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("clientes");
  const [filter, setFilter] = useState("Todos");
  const [showContract, setShowContract] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newClient, setNewClient] = useState({ nome_mae:"", nome_crianca:"", email:"", phone:"", service:"", date:"", time:"", valor:"", atipico:"Típica", obs:"", cpf_mae:"" });

  const update = (id, patch) => setClients(cs => cs.map(c => c.id===id ? {...c,...patch} : c));
  const client = selected ? clients.find(c=>c.id===selected) : null;
  const filtered = clients.filter(c => filter==="Todos" || c.status===filter);

  if (showContract && client) return <ContractView contract={client} onSigned={(sc) => { update(sc.id,{signature:sc.signature,signedAt:sc.signedAt,status:"Contrato"}); setShowContract(false); }} />;

  if (client) {
    const st = STATUS_COLORS[client.status]||STATUS_COLORS["Pendente"];
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#999",fontSize:13,marginBottom:16,padding:0}}>← Voltar</button>
        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div><h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 2px"}}>{client.nome_mae}</h3><p style={{fontSize:12,color:"#999",margin:0}}>👶 {client.nome_crianca} · {client.atipico?"🧡 Atípico":"🌿 Típico"}</p></div>
            <span style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.color}}>{client.status}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["Serviço",client.service],["Data",formatDateBR(client.date)],["Horário",client.time],["Valor",`R$ ${Number(client.valor||0).toFixed(2).replace(".",",")}`],["E-mail",client.email],["WhatsApp",client.phone]].map(([k,v])=>(
              <div key={k}><span style={{fontSize:10,color:"#aaa",display:"block"}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{v}</span></div>
            ))}
          </div>
        </div>

        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
          <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Status</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {Object.keys(STATUS_COLORS).map(s=>(
              <button key={s} onClick={()=>update(client.id,{status:s})} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,border:"2px solid "+(client.status===s?"#1a1a1a":"#e8e0d8"),background:client.status===s?"#1a1a1a":"#fff",color:client.status===s?"#fff":"#666",cursor:"pointer"}}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:14,marginBottom:12}}>
          <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 10px"}}>Contrato</p>
          {client.signature
            ? <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:"#2e7d32"}}>✅ Assinado em {client.signedAt}</span><img src={client.signature} alt="ass" style={{height:32,opacity:0.6}} /></div>
            : <div>
                <p style={{fontSize:12,color:"#888",margin:"0 0 10px"}}>Contrato ainda não assinado.</p>
                <Field label="CPF da cliente"><input style={inp} placeholder="000.000.000-00" value={client.cpf_mae||""} onChange={e=>update(client.id,{cpf_mae:e.target.value})} /></Field>
                <Field label="Valor do ensaio (R$)"><input style={inp} type="number" value={client.valor||""} onChange={e=>update(client.id,{valor:e.target.value})} /></Field>
                <Field label="Observações"><textarea style={{...inp,resize:"vertical"}} rows={2} value={client.obs||""} onChange={e=>update(client.id,{obs:e.target.value})} /></Field>
                <button onClick={()=>setShowContract(true)} style={{width:"100%",padding:12,borderRadius:10,background:"#7b1fa2",color:"#fff",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:15,cursor:"pointer"}}>📄 Gerar e assinar contrato</button>
              </div>
          }
        </div>

        <a href={`https://wa.me/55${client.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:13,borderRadius:10,background:"#25D366",color:"#fff",textDecoration:"none",fontSize:14,fontWeight:600,boxSizing:"border-box"}}>💬 Abrir WhatsApp</a>
      </div>
    );
  }

  return (
    <div>
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,overflowY:"auto",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:20,maxWidth:480,margin:"0 auto"}}>
            <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,margin:"0 0 16px"}}>Novo cliente</h3>
            {[["nome_mae","Nome da mãe","text"],["nome_crianca","Nome da criança","text"],["cpf_mae","CPF da mãe","text"],["email","E-mail","email"],["phone","WhatsApp","tel"],["date","Data do ensaio","date"],["time","Horário","time"],["valor","Valor (R$)","number"]].map(([k,l,t])=>(
              <Field key={k} label={l}><input style={inp} type={t} value={newClient[k]||""} onChange={e=>setNewClient(n=>({...n,[k]:e.target.value}))} /></Field>
            ))}
            <Field label="Serviço">
              <select style={inp} value={newClient.service} onChange={e=>setNewClient(n=>({...n,service:e.target.value}))}>
                <option value="">Selecione...</option>
                {SERVICES.map(s=><option key={s.id} value={s.label}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Perfil da criança"><Radio options={["Típica","Atípica"]} value={newClient.atipico} onChange={v=>setNewClient(n=>({...n,atipico:v}))} /></Field>
            <Field label="Observações"><textarea style={{...inp,resize:"vertical"}} rows={2} value={newClient.obs||""} onChange={e=>setNewClient(n=>({...n,obs:e.target.value}))} /></Field>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={()=>setShowNew(false)} style={{flex:1,padding:12,borderRadius:10,background:"#fff",border:"1.5px solid #e8e0d8",cursor:"pointer",color:"#666"}}>Cancelar</button>
              <button onClick={()=>{ setClients(cs=>[{...newClient,id:Date.now(),status:"Pendente",signature:null,atipico:newClient.atipico==="Atípica"},...cs]); setShowNew(false); setNewClient({nome_mae:"",nome_crianca:"",email:"",phone:"",service:"",date:"",time:"",valor:"",atipico:"Típica",obs:"",cpf_mae:""}); }} style={{flex:2,padding:12,borderRadius:10,background:"#1a1a1a",color:"#fff",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:"pointer"}}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["clientes","👥 Clientes"],["stats","📊 Resumo"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px 4px",borderRadius:8,fontSize:12,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {tab==="clientes" && (
        <>
          <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
            <div style={{flex:1,overflowX:"auto"}}><div style={{display:"flex",gap:5}}>{["Todos",...Object.keys(STATUS_COLORS)].map(s=><button key={s} onClick={()=>setFilter(s)} style={{padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap",background:filter===s?"#1a1a1a":"#fff",color:filter===s?"#fff":"#666",border:"1.5px solid "+(filter===s?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{s}</button>)}</div></div>
            <button onClick={()=>setShowNew(true)} style={{padding:"8px 14px",borderRadius:8,background:"#b8967e",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,flexShrink:0}}>+ Novo</button>
          </div>
          {filtered.length===0 && <p style={{textAlign:"center",color:"#bbb",fontSize:14,marginTop:40}}>Nenhum cliente aqui</p>}
          {filtered.map(c=>{
            const st=STATUS_COLORS[c.status]||STATUS_COLORS["Pendente"];
            return(
              <div key={c.id} onClick={()=>setSelected(c.id)} style={{padding:14,border:"1.5px solid #e8e0d8",borderRadius:12,marginBottom:10,cursor:"pointer",background:"#fff"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontWeight:600,fontSize:14,color:"#1a1a1a"}}>{c.nome_mae}</p>
                    <p style={{margin:"3px 0 0",fontSize:12,color:"#999"}}>{c.service} · {formatDateBR(c.date)} {c.time}</p>
                    <p style={{margin:"3px 0 0",fontSize:11,color:"#b8967e"}}>{c.atipico?"🧡 Atípico":"🌿 Típico"} · R$ {Number(c.valor||0).toFixed(2).replace(".",",")} {c.signature?"· ✍️ Assinado":""}</p>
                  </div>
                  <span style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:st.bg,color:st.color,flexShrink:0}}>{c.status}</span>
                </div>
              </div>
            );
          })}
        </>
      )}

      {tab==="stats" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[["Total",clients.length,"#1a1a1a"],["Pendentes",clients.filter(c=>c.status==="Pendente").length,"#f57c00"],["Com Contrato",clients.filter(c=>c.status==="Contrato").length,"#7b1fa2"],["Concluídos",clients.filter(c=>c.status==="Concluído").length,"#2e7d32"]].map(([l,n,cor])=>(
              <div key={l} style={{padding:16,background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,textAlign:"center"}}>
                <p style={{fontSize:28,fontWeight:700,color:cor,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{n}</p>
                <p style={{fontSize:11,color:"#999",margin:"4px 0 0"}}>{l}</p>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",border:"1.5px solid #e8e0d8",borderRadius:12,padding:16}}>
            <p style={{fontSize:11,color:"#b8967e",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",margin:"0 0 12px"}}>Receita prevista</p>
            {Object.keys(STATUS_COLORS).map(s=>{
              const total=clients.filter(c=>c.status===s).reduce((a,c)=>a+Number(c.valor||0),0);
              const st=STATUS_COLORS[s];
              return(<div key={s} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f0e8e0"}}><span style={{fontSize:13,color:"#555"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:11,background:st.bg,color:st.color,marginRight:6}}>{s}</span></span><span style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>R$ {total.toFixed(2).replace(".",",")}</span></div>);
            })}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>Total geral</span>
              <span style={{fontSize:15,fontWeight:700,color:"#b8967e",fontFamily:"'Cormorant Garamond',serif"}}>R$ {clients.filter(c=>c.status!=="Cancelado").reduce((a,c)=>a+Number(c.valor||0),0).toFixed(2).replace(".",",")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CLIENT BOOKING FLOW ──────────────────────────────────────────
function ClientView() {
  const [step, setStep]       = useState(1);
  const [serviceId, setServiceId] = useState(null);
  const [date, setDate]       = useState(null);
  const [time, setTime]       = useState(null);
  const [anamnese, setAnamnese] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const service = SERVICES.find(s=>s.id===serviceId);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch(WEBHOOK_URL, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          nome_mae: anamnese.nome_mae,
          nome_crianca: anamnese.nome_crianca,
          email: anamnese.email,
          phone: anamnese.phone,
          servico: service?.label,
          data: date,
          hora: time,
          atipico: anamnese.atipico,
          idade: anamnese.idade,
        })
      });
    } catch(e) { /* silently continue even if webhook fails */ }
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{textAlign:"center",padding:"48px 16px"}}>
      <div style={{fontSize:52,marginBottom:16}}>🌸</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:"#1a1a1a",marginBottom:8}}>Solicitação enviada!</h2>
      <p style={{color:"#888",fontSize:14,lineHeight:1.7,marginBottom:20}}>Em breve a <strong>Crescidinhos</strong> confirmará seu horário e entrará em contato pelo WhatsApp para alinhar todos os detalhes do ensaio. 🤍</p>
      <div style={{padding:16,background:"#faf8f5",borderRadius:12,textAlign:"left"}}>
        {[["Serviço",service?.label],["Data",formatDateBR(date)],["Horário",time],["Mãe",anamnese.nome_mae],["Criança",anamnese.nome_crianca]].map(([k,v])=>(
          <p key={k} style={{fontSize:13,color:"#666",margin:"0 0 5px"}}><strong>{k}:</strong> {v||"—"}</p>
        ))}
      </div>
    </div>
  );

  const Btn = ({disabled,onClick,label}) => <button disabled={disabled} onClick={onClick} style={{flex:2,padding:"13px",borderRadius:10,background:!disabled?"#1a1a1a":"#e8e0d8",color:!disabled?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:!disabled?"pointer":"default"}}>{label}</button>;
  const Back = ({onClick}) => <button onClick={onClick} style={{flex:1,padding:"12px",borderRadius:10,background:"#fff",border:"2px solid #e8e0d8",cursor:"pointer",fontSize:14,color:"#666"}}>← Voltar</button>;

  return (
    <div>
      <StepBar step={step} />
      {step===1 && (
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>Escolha o tipo de ensaio</h3>
          <p style={{fontSize:12,color:"#999",marginBottom:16}}>Toque no serviço para ver os pacotes</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {SERVICES.map(s=>{
              const isOpen = serviceId===s.id;
              return (
                <div key={s.id} style={{borderRadius:12,border:isOpen?"2px solid #1a1a1a":"2px solid #e8e0d8",background:isOpen?"#faf8f5":"#fff",overflow:"hidden",transition:"all 0.2s"}}>
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
                  {isOpen && (
                    <div style={{padding:"0 16px 16px",borderTop:"1px solid #f0e8e0"}}>
                      <p style={{fontSize:12,color:"#666",margin:"10px 0 10px",lineHeight:1.5}}>{s.desc}</p>
                      {s.highlight && <p style={{fontSize:11,color:"#b8967e",margin:"0 0 12px"}}>✨ {s.highlight}</p>}
                      <p style={{fontSize:11,color:"#999",fontWeight:700,margin:"0 0 8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Pacotes disponíveis:</p>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {s.packages.map((pk,i)=>(
                          <div key={i} style={{padding:"10px 12px",borderRadius:8,background:"#fff",border:"1.5px solid #e8e0d8"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                              <span style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{pk.name}</span>
                              <span style={{fontSize:14,fontWeight:700,color:"#b8967e",fontFamily:"'Cormorant Garamond',serif"}}>R$ {pk.price.toLocaleString("pt-BR")}</span>
                            </div>
                            <p style={{fontSize:11,color:"#888",margin:0,lineHeight:1.5}}>{pk.desc}</p>
                          </div>
                        ))}
                      </div>
                      {s.obs && <p style={{fontSize:11,color:"#aaa",margin:"10px 0 0",lineHeight:1.5,fontStyle:"italic"}}>* {s.obs}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button disabled={!serviceId} onClick={()=>setStep(2)} style={{marginTop:20,width:"100%",padding:"14px",borderRadius:10,background:serviceId?"#1a1a1a":"#e8e0d8",color:serviceId?"#fff":"#aaa",border:"none",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:serviceId?"pointer":"default"}}>
            {serviceId ? `Continuar com ${SERVICES.find(s=>s.id===serviceId)?.label} →` : "Selecione um serviço"}
          </button>
        </div>
      )}
      {step===2 && (
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>Escolha a data e horário</h3>
          <p style={{fontSize:12,color:"#999",marginBottom:14}}>Domingos não disponíveis</p>
          <Calendar selectedDate={date} onSelectDate={d=>{setDate(d);setTime(null);}} />
          {date && (
            <div style={{marginTop:14}}>
              <p style={{fontSize:12,color:"#999",marginBottom:10}}>Horários em <strong>{formatDateBR(date)}</strong>:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {TIMES.map(t=><button key={t} onClick={()=>setTime(t)} style={{padding:"8px 14px",borderRadius:8,fontSize:13,border:time===t?"2px solid #1a1a1a":"2px solid #e8e0d8",background:time===t?"#1a1a1a":"#fff",color:time===t?"#fff":"#1a1a1a",cursor:"pointer"}}>{t}</button>)}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <Back onClick={()=>setStep(1)}/><Btn disabled={!date||!time} onClick={()=>setStep(3)} label="Continuar →"/>
          </div>
        </div>
      )}
      {step===3 && (
        <div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",marginBottom:4}}>Ficha de anamnese</h3>
          <p style={{fontSize:12,color:"#999",marginBottom:16}}>Essas informações nos ajudam a personalizar seu ensaio com muito amor 🤍</p>
          <AnamneseForm data={anamnese} onChange={setAnamnese} />
          <div style={{display:"flex",gap:10,marginTop:24}}>
            <Back onClick={()=>setStep(2)}/><Btn disabled={false} onClick={()=>setStep(4)} label="Revisar →"/>
          </div>
        </div>
      )}
      {step===4 && (
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
          <div style={{display:"flex",gap:10}}>
            <Back onClick={()=>setStep(3)}/><Btn disabled={loading} onClick={handleSubmit} label={loading?"Enviando...":"Enviar solicitação 🌸"}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PHOTOGRAPHER LOGIN ───────────────────────────────────────────
function PhotographerLogin({ onLogin }) {
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const info = await res.json();
        onLogin({ token: tokenResponse, email: info.email });
      } catch { alert("Não foi possível verificar o usuário."); }
    },
    onError: () => alert("Erro ao fazer login. Tente novamente."),
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
  });

  return (
    <div style={{textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:40,marginBottom:16}}>📷</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:"#1a1a1a",marginBottom:8}}>Área Restrita</h2>
      <p style={{fontSize:13,color:"#888",marginBottom:32,lineHeight:1.6}}>Acesse com sua conta Google para entrar no painel e gerenciar clientes, contratos e agendamentos.</p>
      <button onClick={() => login()} style={{display:"inline-flex",alignItems:"center",gap:12,padding:"14px 28px",borderRadius:10,background:"#fff",border:"2px solid #e8e0d8",cursor:"pointer",fontSize:14,fontWeight:600,color:"#1a1a1a",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 35.7 16.3 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2C43 35 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"/>
        </svg>
        Entrar com Google
      </button>
    </div>
  );
}

// ─── PHOTOGRAPHER PANEL ───────────────────────────────────────────
function PhotographerPanel({ auth, onLogout }) {
  const [tab, setTab] = useState("crm");
  const [calEvents, setCalEvents] = useState([]);
  const [loadingCal, setLoadingCal] = useState(false);

  const loadCalendar = useCallback(async () => {
    setLoadingCal(true);
    try { setCalEvents(await fetchCalendarEvents(auth.token.access_token)); }
    catch(e) { console.error(e); }
    finally { setLoadingCal(false); }
  }, [auth]);

  const upcoming = calEvents.filter(e=>e.summary?.includes("📸")).slice(0,10);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,padding:"10px 14px",background:"#fff",borderRadius:12,border:"1.5px solid #e8e0d8"}}>
        <div><p style={{margin:0,fontSize:13,fontWeight:600,color:"#1a1a1a"}}>Painel da fotógrafa 📷</p><p style={{margin:"2px 0 0",fontSize:11,color:"#999"}}>{auth.email}</p></div>
        <button onClick={onLogout} style={{padding:"6px 12px",borderRadius:8,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:12,color:"#666"}}>Sair</button>
      </div>

      {auth.email !== PHOTOGRAPHER.email && (
        <div style={{padding:16,background:"#fde8e8",borderRadius:12,marginBottom:16,textAlign:"center"}}>
          <p style={{fontSize:13,color:"#c62828",margin:0}}>🚫 Acesso restrito. Esta área é exclusiva da fotógrafa.</p>
        </div>
      )}

      {auth.email === PHOTOGRAPHER.email && (
        <>
          <div style={{display:"flex",gap:6,marginBottom:20}}>
            {[["crm","👥 CRM"],["agenda","📅 Agenda"]].map(([t,l])=>(
              <button key={t} onClick={()=>{setTab(t);if(t==="agenda")loadCalendar();}} style={{flex:1,padding:"10px 4px",borderRadius:8,fontSize:12,fontWeight:600,background:tab===t?"#1a1a1a":"#fff",color:tab===t?"#fff":"#666",border:"2px solid "+(tab===t?"#1a1a1a":"#e8e0d8"),cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          {tab==="crm" && <CRMView />}
          {tab==="agenda" && (
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,margin:0}}>Próximos ensaios</h3>
                <button onClick={loadCalendar} style={{padding:"6px 12px",borderRadius:7,background:"#f5f0eb",border:"none",cursor:"pointer",fontSize:12,color:"#666"}}>🔄 Atualizar</button>
              </div>
              {loadingCal && <p style={{textAlign:"center",color:"#bbb",fontSize:13,padding:"30px 0"}}>Carregando agenda...</p>}
              {!loadingCal && upcoming.length===0 && <p style={{textAlign:"center",color:"#bbb",fontSize:13,padding:"30px 0"}}>Nenhum ensaio nos próximos 3 meses</p>}
              {upcoming.map(e=>{
                const d=new Date(e.start?.dateTime||e.start?.date);
                return(
                  <div key={e.id} style={{padding:14,border:"2px solid #e8e0d8",borderRadius:12,marginBottom:10,background:"#fff"}}>
                    <p style={{margin:0,fontWeight:600,fontSize:14,color:"#1a1a1a"}}>{e.summary?.replace("📸 ","")}</p>
                    <p style={{margin:"4px 0 0",fontSize:12,color:"#999"}}>{d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"})} às {d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p>
                    {e.description && <p style={{margin:"6px 0 0",fontSize:11,color:"#888",lineHeight:1.5,whiteSpace:"pre-line"}}>{e.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("client");
  const [auth, setAuth] = useState(null);

  return (
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
        {view==="client" && <ClientView />}
        {view==="photographer" && !auth && <PhotographerLogin onLogin={setAuth} />}
        {view==="photographer" && auth && <PhotographerPanel auth={auth} onLogout={()=>{setAuth(null);setView("client");}} />}
      </div>
    </div>
  );
}
