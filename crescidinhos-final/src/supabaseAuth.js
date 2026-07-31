// =============================================================
// supabaseAuth.js — Crescidinhos Fotografia
// Login da fotógrafa e acesso ao banco.
//
// Antes: todo mundo falava com o Supabase usando a chave publicável,
// que vai dentro do site e portanto é pública. Quem tivesse a chave lia
// e apagava tudo. Agora o painel manda um crachá de verdade (JWT), e o
// RLS do banco decide o que cada um pode ver.
//
// A chave publicável continua aqui: ela sozinha não dá mais acesso,
// só identifica o projeto. Quem manda é o crachá.
// =============================================================

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY, PHOTOGRAPHER } from "./config";

// O escopo do Calendar vem junto do login para a agenda continuar
// sincronizando com um clique só, como era antes.
const ESCOPO_CALENDAR = "https://www.googleapis.com/auth/calendar";

// Guardamos o token do Google à parte: o Supabase devolve ele só no
// momento do login e não repõe sozinho depois de recarregar a página.
const CHAVE_TOKEN_GOOGLE = "crescidinhos.google_token";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── Sessão ──────────────────────────────────────────────────────

let sessaoAtual = null;

supabase.auth.onAuthStateChange((evento, sessao) => {
  sessaoAtual = sessao;
  // provider_token só aparece no login; guardamos para o Calendar
  // sobreviver a um F5.
  if (sessao?.provider_token) {
    try {
      sessionStorage.setItem(CHAVE_TOKEN_GOOGLE, sessao.provider_token);
    } catch { /* modo anônimo do navegador bloqueia; segue sem guardar */ }
  }
  if (evento === "SIGNED_OUT") {
    try { sessionStorage.removeItem(CHAVE_TOKEN_GOOGLE); } catch { /* ignora */ }
  }
});

export async function carregarSessao() {
  const { data } = await supabase.auth.getSession();
  sessaoAtual = data.session;
  return sessaoAtual;
}

export function getSessao() {
  return sessaoAtual;
}

// É a fotógrafa mesmo? O banco também confere pelo RLS — isto aqui
// só evita mostrar o painel para quem entrou com outra conta.
export function ehFotografa(sessao = sessaoAtual) {
  return sessao?.user?.email === PHOTOGRAPHER.email;
}

// Token do Google para o Calendar. Pode faltar se a sessão foi
// restaurada de um login antigo — nesse caso a agenda pede novo login.
export function getTokenGoogle() {
  if (sessaoAtual?.provider_token) return sessaoAtual.provider_token;
  try { return sessionStorage.getItem(CHAVE_TOKEN_GOOGLE); } catch { return null; }
}

export async function entrarComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: ESCOPO_CALENDAR,
      redirectTo: window.location.origin,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) throw error;
}

export async function sair() {
  try { sessionStorage.removeItem(CHAVE_TOKEN_GOOGLE); } catch { /* ignora */ }
  await supabase.auth.signOut();
  sessaoAtual = null;
}

// ─── Acesso ao banco ─────────────────────────────────────────────
// Mesma assinatura do sb() que já existia em cada arquivo, para as
// chamadas continuarem iguais. A diferença é o Authorization:
// crachá da fotógrafa quando logada, chave publicável quando não.

export const sb = async (path, options = {}) => {
  const cracha = sessaoAtual?.access_token || SUPABASE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${cracha}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// Versão que não estoura em erro — alguns painéis dependiam disso.
export const sbSilencioso = async (path, options = {}) => {
  try {
    return await sb(path, options);
  } catch {
    return null;
  }
};
