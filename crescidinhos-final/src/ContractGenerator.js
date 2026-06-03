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
  ${d.parcela2Data ? `
    <div style="margin-top:10px;padding:10px 12px;background:#fff8e1;border-radius:8px;border:1px solid #ffe082">
      <div style="font-size:11px;font-weight:700;color:#856404;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">📆 Parcelamento acordado</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0"><span>1ª parcela</span><span><strong>${fmtMoeda(d.parcela1Valor||d.valorTotal/2)}</strong> — no ato / conforme combinado</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0"><span>2ª parcela</span><span><strong>${fmtMoeda(d.parcela2Valor||d.valorTotal/2)}</strong> — vencimento: <strong>${fmtData(d.parcela2Data)}</strong></span></div>
    </div>` : ""}
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
  const isTrimestral = d.planoId?.includes("trimestral") || d.catKey === "trimestral";
  const sessoes = isTrimestral ? "4" : "11";
  const periodoLabel = isTrimestral ? "4 sessões trimestrais" : "11 sessões mensais, dos 2 aos 12 meses de vida";
  const prazoLabel = isTrimestral ? "12 meses" : "13 meses";
  const precoAvulso = d.catKey === "afeto" ? "R$ 180,00" : "R$ 160,00";
  return `
<div class="block-title">Condições Específicas — Acompanhamento Fotográfico de Crescimento</div>
<div class="clause">
  <h4>Cláusula E1 — Objeto</h4>
  <p>A CONTRATADA prestará serviço de Acompanhamento Fotográfico do Crescimento, plano <strong>${d.catLabel}${d.planoLabel && d.planoLabel !== d.catLabel ? " · " + d.planoLabel : ""}</strong>, contemplando <strong>${sessoes} sessões</strong> (${periodoLabel}), com entrega de <strong>${d.fotos ? d.fotos + " fotografias" : "fotografias conforme pacote"}</strong> editadas em alta resolução por sessão, via link digital disponível por <strong>10 (dez) dias</strong>.</p>
  <p>§1º Cada sessão tem duração de aproximadamente <strong>1 hora</strong>. O prazo de entrega é de até <strong>15 (quinze) dias úteis</strong> após cada sessão. Após 6 meses, os arquivos poderão ser apagados definitivamente.</p>
  <p>§2º Fotos extras além do pacote são cobradas conforme tabela vigente. Produtos físicos (álbum, quadros, pendrive) são opcionais e cobrados à parte.</p>
  <p>§3º O acompanhamento deve ser concluído até o bebê completar <strong>${prazoLabel} de vida</strong>. Sessões não realizadas dentro do prazo serão perdidas, sem reembolso.</p>
</div>
<div class="clause">
  <h4>Cláusula E2 — Agendamento das sessões</h4>
  <p>As sessões são agendadas ${isTrimestral ? "trimestralmente" : "mensalmente"}, preferencialmente no mesmo período do mês, conforme disponibilidade de ambas as partes.</p>
  <p>§1º A CONTRATANTE poderá remarcar cada sessão sem custo adicional, com aviso de até <strong>48 horas de antecedência</strong>. Reagendamentos com menos de 24 horas ou no-show poderão ser cobrados à parte.</p>
  <p>§2º Casos de doença do bebê ou da CONTRATANTE devem ser comunicados imediatamente por WhatsApp, para remarcação sem custo.</p>
  <p>§3º Sessões realizadas de segunda a sexta-feira, das 9h às 12h ou das 14h às 18h, e aos sábados conforme disponibilidade. O local preferencial é o estúdio Crescidinhos; uma sessão por plano pode ser realizada na residência da família ou em local externo em Bauru/SP.</p>
</div>
<div class="clause">
  <h4>Cláusula E3 — Pagamento</h4>
  <p>O valor total do plano contratado é de <strong>${fmtMoeda(d.valorTotal)}</strong>, pago na forma: <strong>${d.formaPagamento || "conforme combinado com a CONTRATADA"}</strong>.</p>
  <p>§1º A reserva do plano é confirmada com o pagamento da primeira parcela ou do valor integral. Chave PIX: crescidinhosfoto@gmail.com.</p>
  <p>§2º O atraso no pagamento implica multa de 10%, juros de 1% ao mês e correção monetária. Em caso de inadimplência por mais de 30 dias, a CONTRATADA poderá suspender as sessões subsequentes até a regularização, sem devolução das sessões já realizadas.</p>
</div>
<div class="clause">
  <h4>Cláusula E4 — Cancelamento pela CONTRATANTE</h4>
  <p>Em caso de cancelamento após o início do plano, serão cobrados os valores das sessões já realizadas pelo preço avulso (<strong>${precoAvulso} por sessão</strong>), descontando-se o que já foi pago e aplicando-se <strong>multa de 20%</strong> sobre o valor restante.</p>
  <p>Parágrafo Único: O contrato poderá ser transferido para terceiros (outro bebê/família), com ciência e concordância da CONTRATADA, sem cobrança de multa.</p>
</div>
<div class="clause">
  <h4>Cláusula E5 — Cancelamento pela CONTRATADA</h4>
  <p>Caso a CONTRATADA cancele o plano sem justificativa após o início, devolverá os valores pagos pelas sessões não realizadas, acrescidos de <strong>10% de multa</strong>. Em caso de doença, emergência ou força maior comprovada, haverá devolução integral sem multa.</p>
</div>
<div class="clause">
  <h4>Cláusula E6 — Prazo de seleção das fotos</h4>
  <p>Após o envio do link com as provas de cada sessão, a CONTRATANTE terá <strong>10 (dez) dias</strong> para realizar a seleção das fotos do pacote. Findo esse prazo sem seleção, a CONTRATADA enviará as fotos de melhor qualidade técnica a seu critério.</p>
  <p>§1º Reabertura da plataforma de seleção após o prazo: <strong>R$ 50,00</strong>. O álbum impresso anual (se contratado) será produzido após a última sessão, com prazo de entrega de 45 dias.</p>
</div>
<div class="clause">
  <h4>Cláusula E7 — Direitos de imagem e propriedade intelectual</h4>
  <p>A CONTRATANTE <strong>${d.autorizaUsoImagem !== false ? "AUTORIZA" : "NÃO AUTORIZA"}</strong> a CONTRATADA a utilizar as imagens do bebê/criança e da família para divulgação em portfólio, site, redes sociais, materiais impressos, exposições e concursos.</p>
  ${d.autorizaUsoImagem === false ? `<p style="color:#B71C1C">§1º Por não autorizar o uso das imagens para divulgação, será acrescido <strong>50%</strong> sobre o valor total do contrato.</p>` : ""}
  <p>§2º Os arquivos RAW originais são propriedade exclusiva da CONTRATADA. É vedada a alteração das imagens sem autorização expressa (Lei nº 9.610/1998, art. 79, §2º).</p>
</div>
<div class="clause">
  <h4>Cláusula E8 — Autorização do menor (ECA Digital)</h4>
  <p>O(a) responsável legal autoriza a participação de <strong>${d.nomeCrianca || "_______________"}</strong> nos termos do <strong>ECA Digital (Lei nº 15.211/2025)</strong> e da LGPD (Lei nº 13.709/2018).</p>
</div>
<div class="clause">
  <h4>Cláusula E9 — LGPD e proteção de dados</h4>
  <div class="lgpd-box">
    <p>Os dados pessoais serão tratados com base na Lei nº 13.709/2018 (LGPD) exclusivamente para execução contratual. O(a) CONTRATANTE poderá solicitar acesso, correção ou exclusão pelo e-mail <strong>${PHOTOGRAPHER.email}</strong>. O tratamento de dados e imagens de crianças observará o ECA Digital (Lei nº 15.211/2025).</p>
  </div>
</div>
<div class="clause">
  <h4>Cláusula E10 — Disposições gerais e Foro</h4>
  <p>Fica pactuada a inexistência de vínculo empregatício entre as partes. A CONTRATADA poderá reajustar os preços dos serviços extras e produtos físicos após 12 meses do início do contrato, com aviso prévio de 30 dias. Fica eleito o Foro da Comarca de <strong>Bauru, Estado de São Paulo</strong>, para dirimir quaisquer litígios.</p>
</div>`;}


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
<div class="block-title">Condições Específicas — Ensaio Newborn (Recém-Nascido)</div>
<div class="clause">
  <h4>Cláusula 1 — Objeto</h4>
  <p>A CONTRATADA prestará serviço de Ensaio Fotográfico Newborn (recém-nascido), a ser realizado preferencialmente entre o <strong>5º e o 15º dia de vida</strong> do bebê, no estúdio Crescidinhos Fotografia.</p>
  <ul>
    <li>Sessão fotográfica de até <strong>4 (quatro) horas</strong>, com poses e cenários combinados previamente;</li>
    <li>Edição e tratamento das imagens selecionadas;</li>
    <li>Entrega em alta resolução via link digital (disponível por <strong>10 dias</strong>).</li>
  </ul>
  <p>§1º O ensaio poderá contar com a participação dos pais e irmãos, conforme acordado no pacote contratado.</p>
  <p>§2º Produtos físicos opcionais (álbum, quadros, pendrive) devem ser solicitados antes do ensaio. O pendrive tem acréscimo de <strong>R$ 120,00</strong> e deverá ser retirado em até 60 dias; após esse prazo, haverá cobrança adicional de R$ 60,00 para nova gravação.</p>
  <p>§3º As fotos editadas serão entregues em até <strong>15 (quinze) dias úteis</strong> contados da data do ensaio. As imagens ficarão arquivadas por <strong>6 (seis) meses</strong> após a entrega; após esse prazo, serão definitivamente apagadas.</p>
</div>
<div class="clause">
  <h4>Cláusula 2 — Data e agendamento</h4>
  <p>Por se tratar de ensaio de recém-nascido, a data poderá sofrer variação conforme o nascimento, sem penalidades. A CONTRATANTE compromete-se a comunicar o nascimento do bebê à CONTRATADA em até <strong>72 (setenta e duas) horas</strong> após o parto. O ensaio deverá acontecer em até <strong>20 (vinte) dias</strong> após o nascimento, sendo o período ideal entre o 5º e o 15º dia de vida.</p>
</div>
<div class="clause">
  <h4>Cláusula 3 — Chegada e tempo de sessão</h4>
  <p>A CONTRATANTE deverá chegar ao estúdio com <strong>15 (quinze) minutos de antecedência</strong>. A sessão tem duração estimada de 3 a 4 horas, podendo variar conforme o ritmo, sono e necessidades do bebê.</p>
  <p>§1º A CONTRATADA não se compromete com horários fixos de término, pois o bem-estar do bebê é prioridade absoluta. <strong>Não haverá cobrança de hora adicional</strong> dentro de uma sessão normal de newborn.</p>
</div>
<div class="clause">
  <h4>Cláusula 4 — Protocolo de segurança</h4>
  <p>A CONTRATADA adota rigoroso protocolo de segurança no manuseio de recém-nascidos:</p>
  <ul>
    <li>Higienização das mãos com álcool gel antes e durante o ensaio;</li>
    <li>Ausência de adornos (anéis, pulseiras, relógios) durante o manuseio;</li>
    <li>Temperatura do estúdio mantida entre 27°C e 28°C para o conforto do bebê;</li>
    <li>Uso de tecidos macios e higienizados entre o bebê e os props;</li>
    <li>Posicionamento seguro em todas as poses, com supervisão constante.</li>
  </ul>
  <p>§1º A CONTRATADA reserva-se o direito de recusar ou interromper poses que considere arriscadas, sem que isso caracterize descumprimento contratual.</p>
  <p>§2º Caso o bebê apresente desconforto intenso, febre ou condição de saúde que comprometa a sessão, a CONTRATADA poderá suspender o ensaio e reagendar sem cobrança de multa.</p>
  <p>§3º A CONTRATANTE declara-se ciente de que o ensaio é realizado em ambiente monitorado por câmeras de segurança, cujas gravações são sigilosas e mantidas por 30 dias.</p>
</div>
<div class="clause">
  <h4>Cláusula 5 — Responsabilidade sobre o bebê</h4>
  <p>Durante toda a sessão, a responsabilidade pelo bebê é compartilhada entre a CONTRATADA (técnica e posicionamento) e a CONTRATANTE (presença e autorização dos procedimentos). A CONTRATADA não se responsabiliza por intercorrências de saúde preexistentes não informadas, nem por acidentes causados por interferência de acompanhantes não autorizados.</p>
</div>
<div class="clause">
  <h4>Cláusula 6 — Pagamento</h4>
  <p>O valor total do presente contrato é de <strong>${fmtMoeda(d.valorTotal)}</strong>, pago na forma: <strong>${d.formaPagamento || "conforme combinado com a CONTRATADA"}</strong>.</p>
  <p>§1º A reserva da data somente será confirmada após o pagamento do sinal. O saldo deverá ser quitado antes do início da sessão.</p>
  <p>§2º Em caso de atraso no pagamento, incidirão multa de 10%, juros de 1% ao mês e correção monetária pelo IGPM. Formas aceitas: PIX (crescidinhosfoto@gmail.com), dinheiro e cartão de crédito.</p>
</div>
<div class="clause">
  <h4>Cláusula 7 — Cancelamento pela CONTRATANTE</h4>
  <ul>
    <li>Cancelamento com mais de <strong>90 dias</strong> de antecedência: multa de <strong>10%</strong>;</li>
    <li>Entre <strong>89 e 30 dias</strong>: multa de <strong>30%</strong>;</li>
    <li>Menos de <strong>30 dias</strong> ou no-show: multa de <strong>40%</strong> (sem devolução do sinal já pago).</li>
  </ul>
  <p>Parágrafo Único: Cancelamento motivado por internação hospitalar do bebê, complicações de saúde da mãe ou caso fortuito devidamente comprovado não gera multa — apenas remarcação.</p>
</div>
<div class="clause">
  <h4>Cláusula 8 — Cancelamento pela CONTRATADA</h4>
  <p>Caso a CONTRATADA cancele sem justificativa, devolverá integralmente os valores pagos, acrescidos de <strong>10% de multa</strong>. Cancelamento por doença, emergência ou força maior: devolução integral sem multa, com oferta de nova data.</p>
</div>
<div class="clause">
  <h4>Cláusula 9 — Adiamento e refazimento</h4>
  <p>Adiamentos motivados por fatores relacionados ao próprio bebê (saúde, sono, agitação) não configuram descumprimento contratual e não geram penalidades. O resultado final pode ser impactado sem que isso gere direito a reembolso ou reexecução gratuita.</p>
</div>
<div class="clause">
  <h4>Cláusula 10 — Direitos de imagem e propriedade intelectual</h4>
  <p>A CONTRATANTE <strong>${d.autorizaUsoImagem !== false ? "AUTORIZA" : "NÃO AUTORIZA"}</strong> a CONTRATADA a utilizar as imagens do bebê e da família para divulgação em portfólio, site, redes sociais, materiais impressos, exposições e concursos fotográficos.</p>
  ${d.autorizaUsoImagem === false ? `<p style="color:#B71C1C">§1º Por não autorizar o uso das imagens para divulgação, será acrescido <strong>50%</strong> sobre o valor total do contrato.</p>` : ""}
  <p>§2º A CONTRATANTE poderá divulgar as fotos em suas mídias pessoais, desde que inclua os créditos da fotógrafa e não realize alterações que descaracterizem o trabalho.</p>
  <p>§3º Os arquivos RAW originais são propriedade exclusiva da CONTRATADA e não integram o presente contrato.</p>
</div>
<div class="clause">
  <h4>Cláusula 11 — Autorização do menor (ECA Digital)</h4>
  <p>O(a) responsável legal autoriza a participação do recém-nascido nos termos do <strong>ECA Digital (Lei nº 15.211/2025)</strong> e da LGPD (Lei nº 13.709/2018).</p>
</div>
<div class="clause">
  <h4>Cláusula 12 — Cláusula penal e disposições gerais</h4>
  <p>As partes fixam cláusula penal equivalente ao valor total do contrato como limite máximo de indenização por danos causados por qualquer das partes, salvo dolo comprovado. Fica pactuada a inexistência de vínculo empregatício entre as partes.</p>
</div>
<div class="clause">
  <h4>Cláusula 13 — LGPD e proteção de dados</h4>
  <div class="lgpd-box">
    <p>Os dados pessoais serão tratados com base na Lei nº 13.709/2018 (LGPD) exclusivamente para execução contratual. O(a) CONTRATANTE poderá solicitar acesso, correção ou exclusão pelo e-mail <strong>${PHOTOGRAPHER.email}</strong>. O tratamento de dados e imagens de crianças observará o ECA Digital (Lei nº 15.211/2025).</p>
  </div>
</div>
<div class="clause">
  <h4>Cláusula 14 — Foro</h4>
  <p>Fica eleito o Foro da Comarca de <strong>Bauru, Estado de São Paulo</strong>, para dirimir quaisquer litígios oriundos do presente contrato.</p>
</div>`;}


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
  const nomeAniv = d.nomeAniversariante || d.nomeCrianca || "";
  const localEvento = d.localEvento || d.localEnsaio || "";
  const p1 = extras.length > 0 ? 1 : 0; // offset de parágrafos
  return `
<div class="block-title">Condições Específicas — Cobertura Fotográfica de Evento</div>
<div class="clause">
  <h4>Cláusula E1 — Objeto</h4>
  <p>A CONTRATADA prestará serviço de cobertura fotográfica de <strong>${d.catLabel}</strong>${nomeAniv ? ` de <strong>${nomeAniv}</strong>` : ""}, com duração de <strong>${d.duracao || "conforme pacote contratado"}</strong>.</p>
  ${localEvento ? `<p>§1º Local do evento: <strong>${localEvento}</strong>. Data: <strong>${fmtData(d.dataEnsaio)}</strong>${d.horaEnsaio ? ` às <strong>${d.horaEnsaio}</strong>` : ""}.</p>` : ""}
  ${extras.length > 0 ? `<p>§${localEvento ? "2" : "1"}º Adicionais contratados: <strong>${extras.map(e => e.label).join(", ")}</strong>.${d.desconto > 0 ? ` Desconto de <strong>10%</strong> aplicado.` : ""}</p>` : ""}
  ${d.ensaioVinculado ? `<p>§${(localEvento ? 1 : 0) + (extras.length > 0 ? 1 : 0) + 1}º Inclui também: <strong>${d.ensaioVinculado}</strong>, realizado no estúdio Crescidinhos Fotografia — Padre Anchieta 775, Bauru/SP.</p>` : ""}
  <p>§${(localEvento ? 1 : 0) + (extras.length > 0 ? 1 : 0) + (d.ensaioVinculado ? 1 : 0) + 1}º As fotos editadas serão entregues em até <strong>15 (quinze) dias úteis</strong> após o evento, via link digital disponível por 10 dias. Eventuais vídeos: até <strong>120 (cento e vinte) dias</strong>.</p>
  <p>§${(localEvento ? 1 : 0) + (extras.length > 0 ? 1 : 0) + (d.ensaioVinculado ? 1 : 0) + 2}º Pendrive com acréscimo de <strong>R$ 120,00</strong>, com retirada em até 60 dias (após esse prazo: R$ 60,00 para nova gravação). Após 6 meses do evento, envio exclusivamente via pendrive (R$ 200,00).</p>
</div>
<div class="clause">
  <h4>Cláusula E2 — Permanência no evento</h4>
  <p>A CONTRATADA apresentar-se-á com no mínimo <strong>10 (dez) minutos de antecedência</strong> ao início do evento e permanecerá até no máximo 10 minutos após o horário previsto para encerramento.</p>
  <p>§1º Caso o evento exceda o horário contratado, aplica-se o <strong>Adicional de Permanência</strong>:</p>
  <ul>
    <li><strong>10%</strong> do valor total para os primeiros 30 minutos excedentes;</li>
    <li><strong>15%</strong> para até 60 minutos excedentes;</li>
    <li><strong>20%</strong> para até 120 minutos excedentes;</li>
    <li><strong>10% adicional</strong> por hora ou fração subsequente.</li>
  </ul>
  <p>§2º A permanência além do horário contratado deverá ser acordada previamente com a CONTRATADA.</p>
</div>
<div class="clause">
  <h4>Cláusula E3 — Pagamento</h4>
  <p>O valor total do presente contrato é de <strong>${fmtMoeda(d.valorTotal)}</strong>, pago na forma: <strong>${d.formaPagamento || "conforme combinado com a CONTRATADA"}</strong>.</p>
  <p>§1º A reserva da data somente será confirmada após a compensação do pagamento do sinal. Formas aceitas: PIX (crescidinhosfoto@gmail.com), dinheiro e cartão de crédito.</p>
  <p>§2º Em caso de inadimplência, incidirão multa de 10%, juros de mora de 1% ao mês e correção monetária pelo IGPM/FGV.</p>
</div>
<div class="clause">
  <h4>Cláusula E4 — Rescisão pelo CONTRATANTE</h4>
  <ul>
    <li>Rescisão com mais de <strong>60 dias</strong> de antecedência: multa de <strong>50%</strong> do valor total;</li>
    <li>Entre <strong>30 e 60 dias</strong>: multa de <strong>75%</strong>;</li>
    <li>Menos de <strong>30 dias</strong>: multa de <strong>100%</strong>.</li>
  </ul>
  <p>§1º Eventuais valores já pagos serão abatidos da multa. Caso o CONTRATANTE já tenha pago valor superior ao percentual de multa, a CONTRATADA devolverá a diferença. O CONTRATANTE poderá ceder o contrato a terceiros, mantendo as condições originais, com ciência e concordância da CONTRATADA.</p>
</div>
<div class="clause">
  <h4>Cláusula E5 — Rescisão pela CONTRATADA</h4>
  <p>Caso a CONTRATADA requeira a rescisão imotivada, devolverá integralmente os valores pagos, acrescidos de <strong>10% de multa</strong> sobre o valor total. Em caso de força maior devidamente comprovada (doença grave, emergência, desastre natural), devolução integral sem multa, sem geração de direito a indenização.</p>
</div>
<div class="clause">
  <h4>Cláusula E6 — Remarcação</h4>
  <p>O CONTRATANTE poderá solicitar alteração da data com no mínimo <strong>60 (sessenta) dias de antecedência</strong>, sendo o pagamento já realizado válido por até 6 meses a contar da data original, desde que a nova data não conflite com agenda já comprometida pela CONTRATADA.</p>
</div>
<div class="clause">
  <h4>Cláusula E7 — Obrigações do CONTRATANTE</h4>
  <p>O CONTRATANTE deverá garantir: (a) livre acesso da equipe ao local do evento; (b) disponibilidade de pontos de energia para equipamentos; (c) mesa reservada para a equipe; (d) alimentação para todos os membros da equipe em horário que não prejudique a execução do serviço.</p>
  <p>§1º O CONTRATANTE deverá fornecer os nomes e identificar as pessoas de destaque no evento, bem como informar todos os momentos especiais a serem registrados.</p>
  <p>§2º O CONTRATANTE é responsável pelos danos físicos causados aos equipamentos ou membros da equipe por seus convidados, devendo ressarcir integralmente os prejuízos causados à CONTRATADA.</p>
</div>
<div class="clause">
  <h4>Cláusula E8 — Obrigações da CONTRATADA</h4>
  <p>A CONTRATADA verificará o perfeito estado de seus equipamentos antes de cada evento e disporá de equipamentos reserva para garantir a execução do serviço.</p>
  <p>§1º A CONTRATADA exige <strong>exclusividade na prestação dos serviços fotográficos</strong> durante o evento, não sendo permitida a interferência de outros fotógrafos não autorizados.</p>
  <p>§2º Em caso de falha técnica que resulte em perda total ou parcial do material, a CONTRATADA devolverá ao CONTRATANTE o valor proporcional à perda, até o limite do valor total contratado.</p>
</div>
<div class="clause">
  <h4>Cláusula E9 — Direitos de imagem e propriedade intelectual</h4>
  <p>O CONTRATANTE <strong>${d.autorizaUsoImagem !== false ? "AUTORIZA" : "NÃO AUTORIZA"}</strong> a CONTRATADA a utilizar as imagens para divulgação em portfólio, site e redes sociais, respeitando a integridade do CONTRATANTE e de seus convidados.</p>
  ${d.autorizaUsoImagem === false ? `<p style="color:#B71C1C">§1º Por não autorizar o uso das imagens para divulgação, será acrescido <strong>50%</strong> sobre o valor total do contrato.</p>` : ""}
  <p>§2º As imagens ficarão arquivadas pela CONTRATADA pelo prazo mínimo de <strong>12 (doze) meses</strong> após a data do evento. Os arquivos RAW originais são propriedade exclusiva da CONTRATADA. Após 12 meses sem contato, ficará configurado o desinteresse do CONTRATANTE.</p>
</div>
<div class="clause">
  <h4>Cláusula E10 — LGPD e proteção de dados</h4>
  <div class="lgpd-box">
    <p>Os dados pessoais serão tratados com base na Lei nº 13.709/2018 (LGPD) exclusivamente para execução contratual. O(a) CONTRATANTE poderá solicitar acesso, correção ou exclusão pelo e-mail <strong>${PHOTOGRAPHER.email}</strong>.</p>
  </div>
</div>
<div class="clause">
  <h4>Cláusula E11 — Disposições gerais e Foro</h4>
  <p>Fica pactuada a inexistência de vínculo empregatício entre as partes. Despesas de deslocamento (evento acima de 20 km da sede em Bauru/SP), hospedagem e taxas do local não descritas no objeto são de responsabilidade do CONTRATANTE. Fica eleito o Foro da Comarca de <strong>Bauru, Estado de São Paulo</strong>, para dirimir quaisquer litígios.</p>
</div>`;}


function blocoQuinzeAnos(d) {
  // Quinze anos usa o mesmo template de eventos
  return blocoEvento(d);
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

  // Tipos com contrato completo (já incluem pagamento, cancelamento, LGPD e foro)
  const TIPOS_COMPLETOS = ["newborn", "chamego", "afeto", "aniversario", "batizado", "quinze-anos"];
  const isContratoCompleto = TIPOS_COMPLETOS.includes(d.catKey);

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
    ${isContratoCompleto ? "" : blocoClausulasGerais(d)}
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
