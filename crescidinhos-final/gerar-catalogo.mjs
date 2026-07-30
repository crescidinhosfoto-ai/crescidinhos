/**
 * Gera public/catalogo.json a partir de src/config.js.
 *
 * O config.js é a fonte única de verdade dos preços. Este script publica um
 * resumo em JSON junto com o app, para a Clarice consultar antes de responder.
 * Roda sozinho no build (script "prebuild" do package.json) — então todo deploy
 * republica o catálogo atualizado, sem ninguém precisar lembrar.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = dirname(fileURLToPath(import.meta.url));
const origem = join(raiz, "src", "config.js");
const destino = join(raiz, "public", "catalogo.json");

// Carrega o config.js sem depender de bundler: vira um módulo de dados na memória.
const fonte = readFileSync(origem, "utf8");
const modulo = await import(
  "data:text/javascript;base64," + Buffer.from(fonte).toString("base64")
);
const { SERVICES, REGRAS, PHOTOGRAPHER } = modulo;

const catalogo = {
  atualizado_em: new Date().toISOString(),
  observacao:
    "Gerado automaticamente de src/config.js. Não editar à mão — altere o config.js.",
  estudio: {
    cidade: PHOTOGRAPHER.cidade,
    agendamento: PHOTOGRAPHER.agendamento,
  },
  regras: {
    tolerancia_atraso_min: REGRAS.toleranciaAtrasoMin,
    prazo_cancelamento_horas: REGRAS.prazoCancelamentoHoras,
    prazo_selecao_fotos_dias: REGRAS.prazoSelecaoFotosDias,
    prazo_entrega_dias: REGRAS.prazoEntregaDias,
    foto_extra_valor: REGRAS.fotoExtraValor,
    desconto_extras: REGRAS.descontoExtras,
  },
  servicos: SERVICES.map((s) => ({
    id: s.id,
    nome: s.label,
    grupo: s.grupo,
    categoria: s.categoria || null,
    descricao: s.detail,
    modalidades: (s.modalities || []).map((m) => ({
      nome: m.label,
      preco: m.price,
      preco_texto: m.price == null ? "consultar" : `R$ ${m.price}`,
      detalhe: m.detail,
      fotos: m.fotos ?? null,
      duracao: m.duracao ?? null,
    })),
    extras: (s.extras || []).map((e) => ({ nome: e.label, preco: e.price })),
  })),
};

writeFileSync(destino, JSON.stringify(catalogo, null, 1), "utf8");

const nMod = catalogo.servicos.reduce((a, s) => a + s.modalidades.length, 0);
console.log(
  `catalogo.json gerado — ${catalogo.servicos.length} serviços, ${nMod} modalidades`
);
