// =============================================================
// ContractGenerator.js — Crescidinhos Fotografia
// v3: salva no Supabase + bloqueio por perfil + contrato travado
// =============================================================

import { PHOTOGRAPHER } from "./config";

export function fmtData(iso) {
  if (!iso) return "___/___/______";
  const [y, m, d] = iso.split("-");
  const meses = ["janeiro","fevereiro","março","abril","maio","junho",
                 "julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${d} de ${meses[parseInt(m)-1]} de ${y}`;
}

export function fmtMoeda(v) {
  if (!v && v !== 0) return "R$ ___,__";
  return new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(v);
}

export function gerarNumeroContrato(catKey) {
  const p = {
    chamego:"ACOMP", afeto:"ACOMP", "gestante-estudio":"GEST",
    "gestante-externa":"GEST", newborn:"NB", campanha:"CAMP",
    "adulto-estudio":"ADT", "adulto-externo":"ADT",
    "familia-estudio":"FAM", "familia-externa":"FAM",
    infantil:"INF", aniversario:"ANV", batizado:"BAT",
    "quinze-anos":"Q15", cofrinho:"COF", "vale-presente":"VP",
  };
  const prefix = p[catKey] || "CRES";
  const ano = new Date().getFullYear();
  const seq = String(Math.floor(Math.random()*9000)+1000);
  return `${prefix}-${ano}-${seq}`;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#f8f4f5;color:#2d2d2d;font-size:14px;line-height:1.7}
  .page{max-width:780px;margin:0 auto;background:#fff;padding:48px 52px;min-height:100vh}
  .logo-area{text-align:center;border-bottom:2px solid #D9A7B4;padding-bottom:24px;margin-bottom:32px}
  .logo-name{font-family:'Playfair Display',serif;font-size:30px;color:#72243E;letter-spacing:1px}
  .logo-sub{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#698494;margin-top:4px}
  .contract-title{font-family:'Playfair Display',serif;font-size:17px;color:#72243E;margin-top:14px}
  .contract-num{font-size:11px;color:#aaa;margin-top:4px}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
  .party-box{background:#fdf9f9;border:1px solid #e8dde0;border-radius:10px;padding:14px 16px}
  .party-title{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#698494;margin-bottom:8px}
  .party-field{margin-bottom:4px;font-size:13px}
  .party-field strong{color:#72243E}
  .service-box{background:#FBEAF0;border:1px solid #F4C0D1;border-radius:10px;padding:16px 20px;margin-bottom:28px}
  .service-title{font-weight:600;color:#72243E;font-size:15px;margin-bottom:10px}
  .service-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #F4C0D1}
  .service-row:last-child{border-bottom:none}
  .service-total{display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#72243E;padding:10px 0 0;margin-top:4px}
  .discount-row{display:flex;justify-content:space-between;font-size:13px;color:#27500A;padding:4px 0}
  .clauses{margin-bottom:28px}
  .block-title{font-family:'Playfair Display',serif;font-size:13px;color:#698494;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e8dde0;padding-bottom:5px;margin:26px 0 12px}
  .clause{margin-bottom:14px}
  .clause h4{font-size:13px;font-weight:600;color:#2d2d2d;margin-bottom:5px}
  .clause p{font-size:13px;line-height:1.75;color:#3a3a3a;margin-bottom:6px}
  .clause ul{padding-left:18px;margin:6px 0}
  .clause ul li{font-size:13px;line-height:1.75;color:#3a3a3a;margin-bottom:3px}
  .sig-section{margin-top:36px;border-top:2px solid #e8dde0;padding-top:24px}
  .sig-title{font-family:'Playfair Display',serif;font-size:16px;color:#72243E;margin-bottom:16px;text-align:center}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  .sig-box{text-align:center}
  .sig-date{font-size:11px;color:#aaa}
  .sig-label{font-size:11px;color:#aaa;margin-top:6px}
  canvas{border:1px dashed #D9A7B4;border-radius:8px;cursor:crosshair;display:block;width:100%;touch-action:none;background:#fafaf8}
  canvas.bloqueado{cursor:not-allowed;opacity:0.5;background:#f5f5f5}
  canvas.assinado{cursor:default;border-color:#a5d6a7;border-style:solid}
  .sig-actions{display:flex;gap:8px;margin-top:8px;justify-content:flex-end}
  .btn-clear{font-size:12px;color:#999;background:none;border:1px solid #e8dde0;border-radius:6px;padding:4px 12px;cursor:pointer}
  .btn-confirm{font-size:12px;color:#fff;background:#72243E;border:none;border-radius:6px;padding:5px 14px;cursor:pointer;font-weight:600}
  .perfil-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:16px}
  .perfil-cliente{background:#e3f2fd;color:#1565C0;border:1px solid #90CAF9}
  .perfil-fotografa{background:#f3e5f5;color:#7b1fa2;border:1px solid #CE93D8}
  .sig-bloqueado-msg{font-size:11px;color:#aaa;text-align:center;padding:8px;background:#f9f9f9;border-radius:6px;margin-top:6px}
  .status-bar{text-align:center;padding:14px;border-radius:10px;font-size:13px;font-weight:500;margin:16px 0}
  .status-pending{background:#FFF3CD;color:#856404;border:1px solid #FFE082}
  .status-signed{background:#EAF3DE;color:#27500A;border:1px solid #C0DD97}
  .status-saving{background:#e3f2fd;color:#1565C0;border:1px solid #90CAF9}
  .status-error{background:#FFEBEE;color:#B71C1C;border:1px solid #EF9A9A}
  .footer-doc{text-align:center;font-size:11px;color:#bbb;margin-top:36px;padding-top:16px;border-top:1px solid #f0e8ea;line-height:1.7}
  .lgpd-box{background:#f0f4f8;border:1px solid #b5d4f4;border-radius:8px;padding:12px 14px;margin:8px 0}
  .lgpd-box p{font-size:12px;color:#0c447c;line-height:1.65}
  .extras-list{margin:6px 0;padding-left:0;list-style:none}
  .extras-list li{font-size:13px;padding:3px 0;color:#3a3a3a;display:flex;justify-content:space-between}
  .extras-list li span{font-weight:600;color:#72243E}
  @media print{body{background:#fff}.page{padding:20px}canvas,.sig-actions,.perfil-badge{display:none}}
`;

function blocoPartes(d) {
  return `
<div class="parties">
  <div class="party-box">
    <div class="party-title">Contratada</div>
    <div class="party-field"><strong>${PHOTOGRAPHER.name}</strong></div>
    <div class="party-field">CNPJ: ${PHOTOGRAPHER.cnpj}</div>
    <div class="party-field">Representante: ${PHOTOGRAPHER.owner}</div>
    <div class="party-field">CPF: ${PHOTOGRAPHER.cpf}</div>
    <div class="party-field">${PHOTOGRAPHER.endereco}</div>
    <div class="party-field">E-mail: ${PHOTOGRAPHER.email}</div>
    <div class="party-field">WhatsApp: ${PHOTOGRAPHER.phone}</div>
  </div>
  <div class="party-box">
    <div class="party-title">Contratante</div>
    <div class="party-field"><strong>${d.nomeCliente || "_______________"}</strong></div>
    <div class="party-field">CPF: ${d.cpfCliente || "___.___.___-__"}</div>
    <div class="party-field">E-mail: ${d.emailCliente || "_______________"}</div>
    <div class="party-field">WhatsApp: ${d.whatsappCliente || "_______________"}</div>
    ${d.enderecoCliente ? `<div class="party-field">${d.enderecoCliente}</div>` : ""}
    ${d.temMenor && d.nomeResponsavel ? `<div class="party-field">Responsável legal: <strong>${d.nomeResponsavel}</strong></div>` : ""}
  </div>
</div>`;
}

function blocoServico(d) {
  const extras = d.extras?.filter(e => e.price) || [];
  const desconto = d.desconto || 0;
  return `
<div class="service-box">
  <div class="service-title">Serviço contratado</div>
  <div class="service-row"><span>Tipo</span><span><strong>${d.catLabel}</strong></span></div>
  <div class="service-row"><span>Pacote</span><span><strong>${d.planoLabel}</strong></span></div>
  ${d.fotos ? `<div class="service-row"><span>Fotografias</span><span>${d.fotosLabel || d.fotos + " fotos"}</span></div>` : ""}
  ${d.duracao ? `<div class="service-row"><span>Duração</span><span>${d.duracao}</span></div>` : ""}
  <div class="service-row"><span>Data</span><span><strong>${fmtData(d.dataEnsaio)}</strong></span></div>
  <div class="service-row"><span>Horário</span><span>${d.horaEnsaio || "___:___"}</span></div>
  ${d.localEnsaio ? `<div class="service-row"><span>Local</span><span>${d.localEnsaio}</span></div>` : ""}
  ${d.temMenor && d.nomeCrianca ? `<div class="service-row"><span>Criança</span><span>${d.nomeCrianca}${d.idadeCrianca ? " · " + d.idadeCrianca : ""}</span></div>` : ""}
  ${extras.length > 0 ? `
    <div class="service-row" style="margin-top:6px;font-weight:600;color:#72243E"><span>Adicionais</span><span></span></div>
    <ul class="extras-list">${extras.map(e => `<li>${e.label}<span>${fmtMoeda(e.price)}</span></li>`).join("")}</ul>
  ` : ""}
  ${desconto > 0 ? `<div class="discount-row"><span>Desconto 10% (extras)</span><span>- ${fmtMoeda(desconto)}</span></div>` : ""}
  <div class="service-total"><span>Valor total</span><span>${fmtMoeda(d.valorTotal)}</span></div>
  ${d.formaPagamento ? `<div class="service-row" style="margin-top:8px"><span>Forma de pagamento</span><span>${d.formaPagamento}</span></div>` : ""}
</div>`;
}

function blocoClausulasGerais(d) {
  return `
<div class="block-title">Condições Gerais</div>
<div class="clause">
  <h4>Cláusula 1 — Pontualidade e agendamento</h4>
  <p>A data e o horário serão reservados somente após confirmação do pagamento do sinal ou da entrada. O(a) CONTRATANTE obriga-se a comparecer pontualmente, sendo admitida tolerância de <strong>15 minutos</strong>. Atrasos superiores poderão reduzir o tempo da sessão sem abatimento do valor total.</p>
</div>
<div class="clause">
  <h4>Cláusula 2 — Pagamento</h4>
  <p>O valor total do serviço é de <strong>${fmtMoeda(d.valorTotal)}</strong>, pago na forma: <strong>${d.formaPagamento || "conforme combinado com a CONTRATADA"}</strong>. Em caso de atraso no pagamento, incidirão multa de 2% e juros de 1% ao mês.</p>
</div>
<div class="clause">
  <h4>Cláusula 3 — Cancelamento e remarcação</h4>
  <ul>
    <li>Cancelamento com mais de 7 dias de antecedência: reembolso integral do sinal.</li>
    <li>Cancelamento entre 3 e 7 dias: sinal não reembolsável, pode ser usado para reagendamento.</li>
    <li>Cancelamento com menos de 48 horas: sinal perdido; nova data sujeita à disponibilidade.</li>
    <li>Imprevisto da CONTRATADA: nova data será agendada sem custos adicionais.</li>
  </ul>
</div>
<div class="clause">
  <h4>Cláusula 4 — Entrega das imagens</h4>
  <p>O prazo de entrega das imagens editadas é de até <strong>${d.prazoEntrega || "20 dias úteis"}</strong>, contado da seleção final. O(a) CONTRATANTE deverá selecionar as imagens em até <strong>5 dias</strong> após receber a galeria.</p>
</div>
<div class="clause">
  <h4>Cláusula 5 — Edição e limitações</h4>
  <p>Inclui-se edição padrão de cor, luz, enquadramento e tratamento básico de pele. Retoques avançados ou edições fora do padrão serão cobrados separadamente.</p>
</div>
<div class="clause">
  <h4>Cláusula 6 — Direitos autorais e uso de imagem</h4>
  <p>As imagens pertencem à CONTRATADA como autora. O(a) CONTRATANTE recebe licença de uso pessoal e não exclusivo.</p>
  <p>O(a) CONTRATANTE <strong>${d.autorizaUsoImagem ? "AUTORIZA" : "NÃO AUTORIZA"}</strong> o uso das imagens pela CONTRATADA para portfólio, redes sociais, site e materiais promocionais.</p>
</div>
<div class="clause">
  <h4>Cláusula 7 — Responsabilidade</h4>
  <p>A CONTRATADA não se responsabiliza por interferências de terceiros, mau comportamento de acompanhantes, condições climáticas ou impossibilidade de reprodução exata de referências visuais.</p>
</div>
<div class="clause">
  <h4>Cláusula 8 — LGPD e proteção de dados</h4>
  <div class="lgpd-box">
    <p>Os dados pessoais serão tratados com base na Lei nº 13.709/2018 (LGPD) exclusivamente para execução contratual. O(a) CONTRATANTE poderá solicitar acesso, correção ou exclusão pelo e-mail <strong>${PHOTOGRAPHER.email}</strong>.${d.temMenor ? " O tratamento de dados e imagens de crianças observará o ECA Digital (Lei nº 15.211/2025)." : ""}</p>
  </div>
</div>
<div class="clause">
  <h4>Cláusula 9 — Foro</h4>
  <p>Fica eleito o foro da comarca de <strong>Bauru/SP</strong> para dirimir eventuais controvérsias.</p>
</div>`;
}

function blocoAcompanhamento(d) {
  const isAnual = d.planoId?.includes("anual");
  return `
<div class="block-title">Condições Específicas — Pacote de Acompanhamento</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>A CONTRATADA prestará serviços fotográficos de acompanhamento <strong>${d.catLabel} · ${d.planoLabel}</strong>, entregando <strong>${d.fotos ? d.fotos + " fotografias" : "fotografias conforme pacote"}</strong> por sessão.</p></div>
<div class="clause"><h4>Cláusula E2 — Periodicidade</h4><p>Sessões nos marcos de <strong>${isAnual ? "1 a 12 meses (mensalmente)" : "3, 6, 9 e 12 meses"}</strong> de vida da criança.</p></div>
<div class="clause"><h4>Cláusula E3 — Vigência e sessões vencidas</h4><p>Validade de <strong>12 meses</strong>. Sessões não realizadas na vigência serão consideradas perdidas, sem direito a crédito.</p></div>
<div class="clause"><h4>Cláusula E4 — Cenários</h4><p>Cada sessão inclui <strong>${d.catLabel?.includes("Afeto") ? "1 cenário temático + 1 cenário família + cenário Mascote" : "1 cenário temático + cenário Mascote"}</strong>.</p></div>`;
}

function blocoGestante(d) {
  const externa = d.catKey?.includes("externa");
  return `
<div class="block-title">Condições Específicas — Ensaio Gestante / Revelação</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Ensaio fotográfico <strong>${d.planoLabel}</strong>, com entrega de <strong>${d.fotos ? d.fotos + " fotografias" : "fotografias conforme pacote"}</strong>${d.duracao ? `, duração de <strong>${d.duracao}</strong>` : ""}. Inclui 1 cenário clean e 1 cenário família.</p></div>
<div class="clause"><h4>Cláusula E2 — Período recomendado</h4><p>Recomendado entre a descoberta e a <strong>38ª semana</strong>. Remarcação por saúde será avaliada com prioridade.</p></div>
${externa ? `<div class="clause"><h4>Cláusula E3 — Ensaio externo</h4><p>Realizado em local externo dentro de Bauru/SP. Em caso de inviabilidade climática, a sessão poderá ser remarcada.</p></div>` : ""}`;
}

function blocoNewborn(d) {
  return `
<div class="block-title">Condições Específicas — Ensaio Newborn</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Ensaio de recém-nascido com entrega de <strong>${d.fotos || 20} fotografias</strong>, preferencialmente até <strong>10 dias de vida</strong>.</p></div>
<div class="clause"><h4>Cláusula E2 — Segurança do bebê</h4><p>A sessão terá pausas para alimentação e conforto. <strong>A segurança do bebê prevalece sobre preferências estéticas.</strong></p></div>
<div class="clause"><h4>Cláusula E3 — Presença obrigatória</h4><p>Presença de pelo menos um responsável legal é obrigatória durante toda a sessão.</p></div>
<div class="clause"><h4>Cláusula E4 — Autorização do menor</h4><p>O(a) responsável legal autoriza a participação do recém-nascido nos termos do <strong>ECA Digital (Lei nº 15.211/2025)</strong> e da LGPD.</p></div>`;
}

function blocoInfantil(d) {
  const isSmash = d.planoId?.includes("smash");
  return `
<div class="block-title">Condições Específicas — Ensaio Infantil</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Ensaio infantil <strong>${d.planoLabel}</strong>, entregando <strong>${d.fotos ? (d.fotos === 70 ? "a partir de 70" : d.fotos) + " fotografias" : "fotografias conforme pacote"}</strong>${d.duracao ? `, duração de <strong>${d.duracao}</strong>` : ""}.</p></div>
<div class="clause"><h4>Cláusula E2 — Responsabilidade</h4><p>Presença de responsável legal obrigatória. A CONTRATADA não se responsabiliza por crises, cansaço ou recusa de figurino da criança.</p></div>
${isSmash ? `<div class="clause"><h4>Cláusula E3 — Smash the Cake</h4><p>Restrições alimentares devem ser informadas previamente.</p></div>` : ""}
<div class="clause"><h4>Cláusula E${isSmash ? "4" : "3"} — Autorização do menor</h4><p>O(a) responsável legal autoriza a participação de <strong>${d.nomeCrianca || "_______________"}</strong> (${d.idadeCrianca || "___"}) nos termos do <strong>ECA Digital (Lei nº 15.211/2025)</strong> e da LGPD.</p></div>`;
}

function blocoAdulto(d) {
  const externa = d.catKey?.includes("externo");
  return `
<div class="block-title">Condições Específicas — Ensaio Adulto / Corporativo</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Ensaio <strong>${d.planoLabel}</strong>, entregando <strong>${d.fotos ? d.fotos + " fotografias" : "fotografias conforme pacote"}</strong>${d.duracao ? `, duração de <strong>${d.duracao}</strong>` : ""}. Inclui 2 cenários: 1 conforme perfil + 1 clean.</p></div>
${externa ? `<div class="clause"><h4>Cláusula E2 — Ensaio externo</h4><p>Realizado em local externo dentro de Bauru/SP. Custos de deslocamento são de responsabilidade do(a) CONTRATANTE.</p></div>` : ""}`;
}

function blocoFamilia(d) {
  const externa = d.catKey?.includes("externa");
  return `
<div class="block-title">Condições Específicas — Ensaio Família</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Ensaio familiar <strong>${d.planoLabel}</strong>, entregando <strong>${d.fotos ? d.fotos + " fotografias" : "fotografias conforme pacote"}</strong>${d.duracao ? `, duração de <strong>${d.duracao}</strong>` : ""}.</p></div>
<div class="clause"><h4>Cláusula E2 — Participantes e menores</h4><p>Acréscimo de participantes não informados poderá implicar ajuste de valor. Imagens de menores observarão o <strong>ECA Digital (Lei nº 15.211/2025)</strong>.</p></div>
${externa ? `<div class="clause"><h4>Cláusula E3 — Ensaio externo</h4><p>Realizado em local externo dentro de Bauru/SP. Em caso de inviabilidade climática, a sessão poderá ser remarcada.</p></div>` : ""}`;
}

function blocoCampanha(d) {
  return `
<div class="block-title">Condições Específicas — Campanha Sazonal</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Ensaio temático da campanha <strong>${d.nomeCampanha || "sazonal vigente"}</strong>, com entrega de <strong>${d.fotos ? d.fotos + " fotografias" : "fotografias conforme pacote"}</strong>.</p></div>
<div class="clause"><h4>Cláusula E2 — Cancelamento especial</h4><p>Por se tratar de campanha com agenda fechada, cancelamentos implicam em perda integral do valor pago.</p></div>`;
}

function blocoEvento(d) {
  const extras = d.extras?.filter(e => e.price) || [];
  return `
<div class="block-title">Condições Específicas — Cobertura de Evento</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Cobertura fotográfica de <strong>${d.catLabel} — ${d.planoLabel}</strong>, duração de <strong>${d.duracao}</strong>. Entrega em até <strong>10 dias corridos</strong>.</p></div>
<div class="clause"><h4>Cláusula E2 — Hora extra</h4><p>Prorrogação cobrada a <strong>R$ 275,00/hora</strong> adicional, mediante aceite no ato.</p></div>
${extras.length > 0 ? `<div class="clause"><h4>Cláusula E3 — Adicionais contratados</h4><p>Adicionais: <strong>${extras.map(e => e.label).join(", ")}</strong>.${d.desconto > 0 ? ` Desconto de <strong>10%</strong> aplicado.` : ""}</p></div>` : ""}
<div class="clause"><h4>Cláusula E${extras.length > 0 ? "4" : "3"} — Logística</h4><p>Valor válido para eventos dentro de Bauru/SP.</p></div>`;
}

function blocoQuinzeAnos(d) {
  const extras = d.extras?.filter(e => e.price) || [];
  return `
<div class="block-title">Condições Específicas — Quinze Anos</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Cobertura fotográfica com <strong>6 horas</strong>${extras.length > 0 ? `, adicionais: <strong>${extras.map(e => e.label).join(", ")}</strong>` : ""}. Entrega em até <strong>10 dias corridos</strong>.</p></div>
<div class="clause"><h4>Cláusula E2 — Hora extra</h4><p>Prorrogação cobrada a <strong>R$ 275,00/hora</strong> adicional.</p></div>`;
}

function blocoCofrinho(d) {
  return `
<div class="block-title">Condições Específicas — Cofrinho de Recordações</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Adesão ao plano <strong>${d.planoLabel}</strong>, mensalidade de <strong>${fmtMoeda(d.valorMensal || d.valorTotal)}/mês</strong>.</p></div>
<div class="clause"><h4>Cláusula E2 — Resgate</h4><ul><li>Resgate a partir do <strong>3º mês</strong>.</li><li>Elegível em: ensaios avulsos e fotos extras.</li><li>Não elegível em: eventos.</li></ul></div>
<div class="clause"><h4>Cláusula E3 — Cancelamento</h4><p>Cancelamento sem multa. Saldo permanece disponível por <strong>6 meses</strong> após o cancelamento.</p></div>`;
}

function blocoValePresente(d) {
  return `
<div class="block-title">Condições Específicas — Vale Presente</div>
<div class="clause"><h4>Cláusula E1 — Objeto</h4><p>Vale Presente no valor de <strong>${fmtMoeda(d.valorTotal)}</strong>, emitido por <strong>${d.nomeCliente}</strong> em favor de <strong>${d.nomePresenteado || "_______________"}</strong>.</p></div>
<div class="clause"><h4>Cláusula E2 — Utilização e validade</h4><ul><li>Utilizável em qualquer ensaio fotográfico do catálogo.</li><li>Não elegível para eventos.</li><li>Validade de <strong>12 meses</strong>.</li><li>Não transferível a terceiros.</li></ul></div>`;
}

// ══════════════════════════════════════════════════════════════════
// BLOCO D — ASSINATURA COM CONTROLE DE PERFIL
// perfil: 'cliente' | 'fotografa' | 'todos' (padrão = todos, legado)
// ══════════════════════════════════════════════════════════════════
function blocoAssinatura(d) {
  return `
<div class="sig-section">
  <div class="sig-title">Assinaturas Digitais</div>

  <!-- Badge de perfil — preenchido pelo JS -->
  <div id="perfil-badge-area" style="text-align:center;margin-bottom:12px"></div>

  <div id="sig-status" class="status-bar status-pending">✏️ Carregando contrato...</div>

  <!-- ASSINATURA DO CLIENTE -->
  <div style="margin-bottom:24px">
    <p style="font-size:11px;font-weight:700;color:#698494;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px">1. Assinatura do(a) Contratante</p>
    <div class="sig-grid">
      <div class="sig-box">
        <div style="font-size:12px;font-weight:500;color:#2d2d2d;margin-bottom:8px">CONTRATANTE</div>
        <canvas id="sig-canvas" width="300" height="110"></canvas>
        <div id="sig-actions-cliente" class="sig-actions">
          <button class="btn-clear" onclick="clearSig()">Limpar</button>
          <button class="btn-confirm" onclick="confirmSig()">Assinar ✍️</button>
        </div>
        <div class="sig-label">${d.nomeCliente || "Cliente"}</div>
        <div class="sig-date" id="sig-date-label"></div>
      </div>
      <div class="sig-box" style="display:flex;flex-direction:column;justify-content:flex-end">
        <div style="background:#faf8f5;border:1px solid #e8dde0;border-radius:8px;padding:12px;font-size:12px;color:#555;line-height:1.6">
          Ao assinar, declara ter lido e concordado com todos os termos.<br/><br/>
          <strong>CPF:</strong> ${d.cpfCliente || "___.___.___-__"}<br/>
          <strong>E-mail:</strong> ${d.emailCliente || "___"}
        </div>
      </div>
    </div>
  </div>

  ${d.temMenor ? `
  <!-- ASSINATURA DO RESPONSÁVEL LEGAL -->
  <div style="margin-bottom:24px">
    <p style="font-size:11px;font-weight:700;color:#698494;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px">2. Assinatura do Responsável Legal (menor)</p>
    <div class="sig-grid">
      <div class="sig-box">
        <div style="font-size:12px;font-weight:500;color:#2d2d2d;margin-bottom:8px">RESPONSÁVEL LEGAL</div>
        <canvas id="sig-canvas-resp" width="300" height="110"></canvas>
        <div id="sig-actions-resp" class="sig-actions">
          <button class="btn-clear" onclick="clearSigResp()">Limpar</button>
          <button class="btn-confirm" onclick="confirmSigResp()">Assinar ✍️</button>
        </div>
        <div class="sig-label">${d.nomeResponsavel || d.nomeCliente || "Responsável legal"}</div>
        <div class="sig-date" id="sig-date-resp"></div>
      </div>
      <div class="sig-box" style="display:flex;align-items:center;justify-content:center">
        <div style="padding:14px;background:#FBEAF0;border-radius:10px;font-size:12px;color:#72243E;line-height:1.6">
          <strong>ECA Digital — Lei nº 15.211/2025</strong><br/>
          As imagens do menor serão utilizadas apenas para as finalidades autorizadas.
        </div>
      </div>
    </div>
  </div>` : ""}

  <!-- ASSINATURA DA CONTRATADA -->
  <div style="margin-bottom:16px">
    <p style="font-size:11px;font-weight:700;color:#698494;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px">${d.temMenor ? "3" : "2"}. Assinatura da Contratada</p>
    <div class="sig-grid">
      <div class="sig-box">
        <div style="font-size:12px;font-weight:500;color:#2d2d2d;margin-bottom:8px">CONTRATADA</div>
        <canvas id="sig-canvas-contratada" width="300" height="110"></canvas>
        <div id="sig-actions-contratada" class="sig-actions">
          <button class="btn-clear" onclick="clearSigContratada()">Limpar</button>
          <button class="btn-confirm" onclick="confirmSigContratada()">Assinar ✍️</button>
        </div>
        <div class="sig-label">${PHOTOGRAPHER.owner}</div>
        <div class="sig-date" id="sig-date-contratada"></div>
      </div>
      <div class="sig-box" style="display:flex;flex-direction:column;justify-content:flex-end">
        <div style="background:#faf8f5;border:1px solid #e8dde0;border-radius:8px;padding:12px;font-size:12px;color:#555;line-height:1.6">
          <strong>${PHOTOGRAPHER.name}</strong><br/>
          CNPJ: ${PHOTOGRAPHER.cnpj}<br/>
          ${PHOTOGRAPHER.endereco}
        </div>
      </div>
    </div>
  </div>

  <div style="font-size:11px;color:#bbb;text-align:center;margin-top:20px;line-height:1.6">
    Assinaturas válidas nos termos da Lei nº 14.063/2020 (Assinaturas Eletrônicas).
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════
// SCRIPT — controle de perfil + save Supabase + bloqueio pós-assinatura
// ══════════════════════════════════════════════════════════════════
function scriptAssinatura(d) {
  return `
<script>
// ── Configuração ──────────────────────────────────────────────────
const SUPA_URL = 'https://uuorxycrxadhjbrebrlg.supabase.co';
const SUPA_KEY = 'sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3';
const AGENDAMENTO_ID = '${d.agendamentoId}';
const CONTRATO_ID    = '${d.numeroContrato}';
const TEM_MENOR      = ${d.temMenor ? "true" : "false"};

// ── Detecta perfil pela URL ───────────────────────────────────────
// /contrato/ID          → cliente
// /contrato/ID?p=fotografa → fotografa
const urlParams = new URLSearchParams(window.location.search);
const PERFIL = urlParams.get('p') === 'fotografa' ? 'fotografa' : 'cliente';

// ── Estado ───────────────────────────────────────────────────────
let sigCliente = null;
let sigContratada = null;
let sigResp = null;
let contratoJaSalvo = false;

// ── Setup canvas ─────────────────────────────────────────────────
function setupCanvas(id) {
  const canvas = document.getElementById(id);
  if(!canvas) return null;
  const ctx = canvas.getContext('2d');
  let drawing = false, lastX = 0, lastY = 0;
  ctx.strokeStyle = '#72243E'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width, sy = canvas.height / r.height;
    return e.touches
      ? {x:(e.touches[0].clientX-r.left)*sx, y:(e.touches[0].clientY-r.top)*sy}
      : {x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sy};
  }
  canvas.addEventListener('mousedown', e=>{drawing=true;const p=getPos(e);lastX=p.x;lastY=p.y;});
  canvas.addEventListener('mousemove', e=>{if(!drawing)return;const p=getPos(e);ctx.beginPath();ctx.moveTo(lastX,lastY);ctx.lineTo(p.x,p.y);ctx.stroke();lastX=p.x;lastY=p.y;});
  canvas.addEventListener('mouseup', ()=>drawing=false);
  canvas.addEventListener('mouseleave', ()=>drawing=false);
  canvas.addEventListener('touchstart', e=>{e.preventDefault();drawing=true;const p=getPos(e);lastX=p.x;lastY=p.y;},{passive:false});
  canvas.addEventListener('touchmove', e=>{e.preventDefault();if(!drawing)return;const p=getPos(e);ctx.beginPath();ctx.moveTo(lastX,lastY);ctx.lineTo(p.x,p.y);ctx.stroke();lastX=p.x;lastY=p.y;},{passive:false});
  canvas.addEventListener('touchend', ()=>drawing=false);
  return {
    canvas, ctx,
    clear: ()=>ctx.clearRect(0,0,canvas.width,canvas.height),
    getData: ()=>canvas.toDataURL('image/png'),
    isEmpty: ()=>!ctx.getImageData(0,0,canvas.width,canvas.height).data.some(v=>v!==0),
    bloquear: (msg) => {
      canvas.classList.add('bloqueado');
      canvas.style.pointerEvents = 'none';
      if(msg) {
        const el = document.createElement('div');
        el.className = 'sig-bloqueado-msg';
        el.textContent = msg;
        canvas.parentNode.insertBefore(el, canvas.nextSibling);
      }
    },
    mostrarAssinado: (dataStr) => {
      canvas.classList.remove('bloqueado');
      canvas.classList.add('assinado');
      canvas.style.pointerEvents = 'none';
      canvas.style.opacity = '0.9';
    }
  };
}

const canvasCliente    = setupCanvas('sig-canvas');
const canvasContratada = setupCanvas('sig-canvas-contratada');
const canvasResp       = TEM_MENOR ? setupCanvas('sig-canvas-resp') : null;

// ── Inicializa perfil e bloqueios ─────────────────────────────────
function inicializar() {
  const badge = document.getElementById('perfil-badge-area');

  if(PERFIL === 'fotografa') {
    badge.innerHTML = '<span class="perfil-badge perfil-fotografa">📷 Você está assinando como Contratada</span>';
    // Bloqueia campos do cliente
    canvasCliente?.bloquear('Este campo é para assinatura do cliente');
    document.getElementById('sig-actions-cliente').innerHTML =
      '<span class="sig-bloqueado-msg">🔒 Disponível apenas para o cliente</span>';
    if(canvasResp) {
      canvasResp.bloquear('Este campo é para assinatura do responsável legal');
      document.getElementById('sig-actions-resp').innerHTML =
        '<span class="sig-bloqueado-msg">🔒 Disponível apenas para o responsável</span>';
    }
    document.getElementById('sig-status').textContent = '✍️ Assine no campo "Contratada" abaixo';
  } else {
    badge.innerHTML = '<span class="perfil-badge perfil-cliente">🌸 Você está assinando como Contratante</span>';
    // Bloqueia campo da fotógrafa
    canvasContratada?.bloquear('Este campo será assinado pela fotógrafa');
    document.getElementById('sig-actions-contratada').innerHTML =
      '<span class="sig-bloqueado-msg">🔒 Disponível apenas para a fotógrafa</span>';
    document.getElementById('sig-status').textContent = '✍️ Leia o contrato e assine abaixo para confirmar';
  }
}

// ── Carrega assinaturas já salvas no Supabase ─────────────────────
async function carregarAssinaturas() {
  try {
    const res = await fetch(
      SUPA_URL + '/rest/v1/agendamentos?id=eq.' + AGENDAMENTO_ID + '&select=signature,signature_contratada,signature_responsavel,signed_at',
      { headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY } }
    );
    const data = await res.json();
    if(!data || !data[0]) return;
    const ag = data[0];

    if(ag.signature) {
      sigCliente = ag.signature;
      restaurarAssinatura('sig-canvas', ag.signature);
      document.getElementById('sig-actions-cliente').innerHTML =
        '<span style="font-size:12px;color:#27500A;font-weight:500">✅ Assinado</span>';
      document.getElementById('sig-date-label').textContent = ag.signed_at || '';
      canvasCliente?.mostrarAssinado();
    }
    if(ag.signature_contratada) {
      sigContratada = ag.signature_contratada;
      restaurarAssinatura('sig-canvas-contratada', ag.signature_contratada);
      document.getElementById('sig-actions-contratada').innerHTML =
        '<span style="font-size:12px;color:#27500A;font-weight:500">✅ Assinado</span>';
      document.getElementById('sig-date-contratada').textContent = ag.signed_at || '';
      canvasContratada?.mostrarAssinado();
    }
    if(TEM_MENOR && ag.signature_responsavel) {
      sigResp = ag.signature_responsavel;
      restaurarAssinatura('sig-canvas-resp', ag.signature_responsavel);
      document.getElementById('sig-actions-resp').innerHTML =
        '<span style="font-size:12px;color:#27500A;font-weight:500">✅ Assinado</span>';
      canvasResp?.mostrarAssinado();
    }

    // Se ambos já assinaram — trava tudo
    const ambos = ag.signature && ag.signature_contratada && (!TEM_MENOR || ag.signature_responsavel);
    if(ambos) {
      contratoJaSalvo = true;
      document.getElementById('sig-status').className = 'status-bar status-signed';
      document.getElementById('sig-status').textContent = '✅ Contrato assinado por ambas as partes em ' + (ag.signed_at || '');
      travarTudo();
    } else {
      inicializar();
      if(ag.signature && PERFIL === 'cliente') {
        document.getElementById('sig-status').textContent = '✅ Sua assinatura foi salva! Aguardando assinatura da fotógrafa.';
      }
      if(ag.signature_contratada && PERFIL === 'fotografa') {
        document.getElementById('sig-status').textContent = '✅ Sua assinatura foi salva! Aguardando assinatura do cliente.';
      }
    }
  } catch(e) {
    console.error('Erro ao carregar assinaturas:', e);
    inicializar();
  }
}

// ── Restaura assinatura salva no canvas ───────────────────────────
function restaurarAssinatura(canvasId, dataUrl) {
  const canvas = document.getElementById(canvasId);
  if(!canvas || !dataUrl) return;
  const img = new Image();
  img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  img.src = dataUrl;
}

// ── Trava todos os campos após assinatura completa ────────────────
function travarTudo() {
  ['sig-canvas','sig-canvas-contratada','sig-canvas-resp'].forEach(id => {
    const c = document.getElementById(id);
    if(c) { c.style.pointerEvents = 'none'; c.classList.add('assinado'); }
  });
  ['sig-actions-cliente','sig-actions-contratada','sig-actions-resp'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });
}

// ── Salva no Supabase ─────────────────────────────────────────────
async function salvarNoSupabase() {
  if(contratoJaSalvo) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

  const ambos = sigCliente && sigContratada && (!TEM_MENOR || sigResp);

  const payload = {};
  if(PERFIL === 'cliente') {
    payload.signature = sigCliente;
    if(TEM_MENOR) payload.signature_responsavel = sigResp;
  } else {
    payload.signature_contratada = sigContratada;
  }
  if(ambos) {
    payload.signed_at = dateStr;
    payload.status = 'Contrato';
  }

  document.getElementById('sig-status').className = 'status-bar status-saving';
  document.getElementById('sig-status').textContent = '⏳ Salvando assinatura...';

  try {
    const res = await fetch(SUPA_URL + '/rest/v1/agendamentos?id=eq.' + AGENDAMENTO_ID, {
      method: 'PATCH',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);

    if(ambos) {
      contratoJaSalvo = true;
      document.getElementById('sig-status').className = 'status-bar status-signed';
      document.getElementById('sig-status').textContent = '✅ Contrato assinado e salvo em ' + dateStr;
      travarTudo();
      // Dispara n8n para notificações
      fetch('https://ribbitingboar-n8n.cloudfy.live/webhook/contrato-assinado', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          agendamento_id: AGENDAMENTO_ID,
          contrato_id: CONTRATO_ID,
          signed_at: now.toISOString(),
          cliente_email: '${d.emailCliente}',
          cliente_nome: '${d.nomeCliente}',
          cliente_whatsapp: '${d.whatsappCliente}',
        })
      }).catch(()=>{});
    } else {
      document.getElementById('sig-status').className = 'status-bar status-signed';
      if(PERFIL === 'cliente') {
        document.getElementById('sig-status').textContent = '✅ Sua assinatura foi salva! A fotógrafa será notificada para assinar.';
      } else {
        document.getElementById('sig-status').textContent = '✅ Sua assinatura foi salva! Aguardando assinatura do cliente.';
      }
    }
  } catch(err) {
    console.error('Erro ao salvar:', err);
    document.getElementById('sig-status').className = 'status-bar status-error';
    document.getElementById('sig-status').textContent = '❌ Erro ao salvar. Tente novamente ou entre em contato com a Crescidinhos.';
  }
}

// ── Ações do cliente ──────────────────────────────────────────────
function clearSig() {
  if(PERFIL !== 'cliente') return;
  canvasCliente?.clear(); sigCliente = null;
}
function confirmSig() {
  if(PERFIL !== 'cliente') return;
  if(!canvasCliente || canvasCliente.isEmpty()) { alert('Por favor, assine antes de confirmar.'); return; }
  sigCliente = canvasCliente.getData();
  const now = new Date();
  document.getElementById('sig-date-label').textContent = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('sig-actions-cliente').innerHTML = '<span style="font-size:12px;color:#27500A;font-weight:500">✅ Assinado</span>';
  canvasCliente.canvas.style.pointerEvents = 'none';
  canvasCliente.canvas.style.opacity = '0.85';
  salvarNoSupabase();
}

// ── Ações do responsável (menor) ──────────────────────────────────
function clearSigResp() {
  if(PERFIL !== 'cliente') return;
  canvasResp?.clear(); sigResp = null;
}
function confirmSigResp() {
  if(PERFIL !== 'cliente') return;
  if(!canvasResp || canvasResp.isEmpty()) { alert('Por favor, assine antes de confirmar.'); return; }
  sigResp = canvasResp.getData();
  const now = new Date();
  document.getElementById('sig-date-resp').textContent = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('sig-actions-resp').innerHTML = '<span style="font-size:12px;color:#27500A;font-weight:500">✅ Assinado</span>';
  canvasResp.canvas.style.pointerEvents = 'none';
  canvasResp.canvas.style.opacity = '0.85';
  salvarNoSupabase();
}

// ── Ações da contratada (Thais) ───────────────────────────────────
function clearSigContratada() {
  if(PERFIL !== 'fotografa') return;
  canvasContratada?.clear(); sigContratada = null;
}
function confirmSigContratada() {
  if(PERFIL !== 'fotografa') return;
  if(!canvasContratada || canvasContratada.isEmpty()) { alert('Por favor, assine antes de confirmar.'); return; }
  sigContratada = canvasContratada.getData();
  const now = new Date();
  document.getElementById('sig-date-contratada').textContent = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('sig-actions-contratada').innerHTML = '<span style="font-size:12px;color:#27500A;font-weight:500">✅ Assinado</span>';
  canvasContratada.canvas.style.pointerEvents = 'none';
  canvasContratada.canvas.style.opacity = '0.85';
  salvarNoSupabase();
}

// ── Inicia ────────────────────────────────────────────────────────
carregarAssinaturas();
</script>`;
}

// ══════════════════════════════════════════════════════════════════
// GERADOR PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export function gerarContratoHTML(dados) {
  const d = dados;

  const blocoEspecifico = {
    chamego: blocoAcompanhamento, afeto: blocoAcompanhamento,
    "gestante-estudio": blocoGestante, "gestante-externa": blocoGestante,
    newborn: blocoNewborn, campanha: blocoCampanha,
    "adulto-estudio": blocoAdulto, "adulto-externo": blocoAdulto,
    "familia-estudio": blocoFamilia, "familia-externa": blocoFamilia,
    infantil: blocoInfantil, aniversario: blocoEvento, batizado: blocoEvento,
    "quinze-anos": blocoQuinzeAnos, cofrinho: blocoCofrinho,
    "vale-presente": blocoValePresente,
  }[d.catKey] || ((d) => `<div class="clause"><h4>Objeto</h4><p>${d.catLabel} — ${d.planoLabel}</p></div>`);

  const nomeContrato = {
    chamego: "Pacote de Acompanhamento Fotográfico",
    afeto: "Pacote de Acompanhamento Fotográfico",
    "gestante-estudio": "Ensaio Fotográfico — Gestante / Revelação",
    "gestante-externa": "Ensaio Fotográfico — Gestante / Revelação Externa",
    newborn: "Ensaio Fotográfico — Recém-Nascido (Newborn)",
    campanha: "Ensaio Fotográfico — Campanha Sazonal",
    "adulto-estudio": "Ensaio Fotográfico — Adulto / Corporativo",
    "adulto-externo": "Ensaio Fotográfico — Adulto / Corporativo Externo",
    "familia-estudio": "Ensaio Fotográfico — Família",
    "familia-externa": "Ensaio Fotográfico — Família Externa",
    infantil: "Ensaio Fotográfico — Infantil Avulso",
    aniversario: "Cobertura Fotográfica — Evento de Aniversário",
    batizado: "Cobertura Fotográfica — Batizado / Confraternização / Chá Revelação",
    "quinze-anos": "Cobertura Fotográfica — Quinze Anos",
    cofrinho: "Adesão — Cofrinho de Recordações",
    "vale-presente": "Vale Presente Fotográfico",
  }[d.catKey] || "Prestação de Serviços Fotográficos";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Contrato — ${nomeContrato} — Crescidinhos Fotografia</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">
  <div class="logo-area">
    <div class="logo-name">Crescidinhos</div>
    <div class="logo-sub">Fotografia</div>
    <div class="contract-title">${nomeContrato}</div>
    <div class="contract-num">Contrato nº ${d.numeroContrato || "____"} · Emitido em ${fmtData(d.dataContrato)}</div>
  </div>
  ${blocoPartes(d)}
  ${blocoServico(d)}
  <div class="clauses">
    ${blocoEspecifico(d)}
    ${blocoClausulasGerais(d)}
  </div>
  ${blocoAssinatura(d)}
  <div class="footer-doc">
    ${PHOTOGRAPHER.name} · CNPJ ${PHOTOGRAPHER.cnpj}<br/>
    ${PHOTOGRAPHER.endereco}<br/>
    ${PHOTOGRAPHER.email} · ${PHOTOGRAPHER.phone}
  </div>
</div>
${scriptAssinatura(d)}
</body>
</html>`;
}
