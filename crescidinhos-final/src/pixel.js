// =============================================================
// pixel.js — Crescidinhos Fotografia
// Pixel do Meta, para medir o tráfego pago.
//
// Só liga se META_PIXEL_ID estiver preenchido no config.js. Enquanto
// estiver vazio, tudo aqui é silencioso — nenhuma requisição sai.
//
// ⚠️ REGRA: nunca mandar dado pessoal para o Meta. Nada de nome,
// e-mail, telefone ou CPF. Só evento e valor. Foram dois dias de
// trabalho tirando dado pessoal do navegador; não é para devolver
// pela porta do anúncio.
// =============================================================

import { META_PIXEL_ID } from "./config";

let ligado = false;

export function iniciarPixel() {
  if (ligado || !META_PIXEL_ID) return;
  if (typeof window === "undefined") return;

  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
  ligado = true;
}

// Um passo do funil, sem identificar ninguém.
function evento(nome, dados) {
  if (!META_PIXEL_ID || typeof window === "undefined" || !window.fbq) return;
  try { window.fbq("track", nome, dados || {}); } catch { /* nunca quebrar a tela */ }
}

/** Abriu o catálogo — topo do funil. */
export function pixelViuCatalogo() {
  evento("ViewContent", { content_category: "catalogo" });
}

/** Escolheu serviço e foi para a data — meio do funil. */
export function pixelEscolheuServico(servico, valor) {
  evento("InitiateCheckout", {
    content_name: servico || "ensaio",
    value: Number(valor) || 0,
    currency: "BRL",
  });
}

/** Agendou. É esta que mede se o anúncio deu retorno. */
export function pixelAgendou(servico, valor) {
  evento("Schedule", {
    content_name: servico || "ensaio",
    value: Number(valor) || 0,
    currency: "BRL",
  });
}
