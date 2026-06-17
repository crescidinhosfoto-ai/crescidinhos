"""
webhook.py — Agente WhatsApp Crescidinhos Fotografia
Recebe mensagens da Evolution API, chama Claude e responde automaticamente.

Variáveis de ambiente necessárias:
  ANTHROPIC_API_KEY  — chave da API do Claude
  WEBHOOK_SECRET     — token para validar requisições da Evolution API (opcional)

Início:
  pip install -r requirements.txt
  ANTHROPIC_API_KEY=sk-ant-... uvicorn webhook:app --host 0.0.0.0 --port 8000

Configure na Evolution API:
  URL do webhook: https://SEU_DOMINIO/webhook
  Eventos: messages.upsert
"""

import os
import re
import json
import logging
from datetime import datetime
from typing import Optional

import anthropic
import requests
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = FastAPI(title="Agente WhatsApp Crescidinhos")

# ── Configurações ────────────────────────────────────────────────────
SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co"
SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3"
EVOLUTION_URL = "https://ribbitingboar-evolution.cloudfy.live"
EVOLUTION_KEY = "gNnhqK2sv964EPigBYm1WJkBc91gu1t4"
EVOLUTION_INSTANCE = "crescidinhos"
PHOTOGRAPHER_PHONE = "5514996845521"
APP_URL = "https://app.crescidinhosfoto.com.br"
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

SERVICES_CONTEXT = """
SERVIÇOS E PREÇOS (Crescidinhos Fotografia):

ACOMPANHAMENTO:
• Chamego 🥰 — a cada 3 meses R$230 (35 fotos, 1h) | anual R$160/mês (20 fotos, 1h)
• Afeto 💛 — a cada 3 meses R$280 (55 fotos, 1h) | anual R$180/mês (40 fotos, 1h)

ENSAIOS:
• Gestante/Revelação 🤰 — Estúdio Life R$380 (20f,2h) | Plus R$480 (30f,2h) | Externa R$580 (50f,2h)
• Newborn 🍼 — R$480 (20f, 3h com pausas, bebê preferencialmente até 10 dias)
• Adulto/Corporativo 💼 — Life R$380 (20f,2h) | Plus R$480 (30f,2h) | Externa R$420 (40f,2h)
• Família 👨‍👩‍👧 — Life R$380 (20f,2h) | Plus R$480 (30f,2h) | Externa R$420 (40f,2h)
• Infantil Avulso 👶 — Duo R$280 (60f) | One R$180 (40f) | Smash Básico R$380 | Smash Completo a partir de R$620 | Clean R$280 | Externo R$320
• Campanha Sazonal 🌸 — consultar disponibilidade

EVENTOS:
• Aniversário 🎉 — Básico 3h R$450 | Completo 4h R$580
• Batizado/Confraternização/Chá ✝️ — 1h30 R$280 | 2h R$360
• 15 Anos 👑 — Cobertura 6h R$1.650 (+ extras)

ESPECIAIS:
• Cofrinho 🪙 — Sementinha R$50/mês | Broto R$100/mês | Florido R$150/mês | Crescido R$200/mês
• Vale Presente 🎁 — valor à escolha

EXTRAS: Álbum R$750 | Quadros R$280 | +1 Fotógrafo R$450 | Hora extra R$275 | Balões R$160 | Making off R$400

REGRAS:
• Prazo entrega: até 10 dias | Cancelamento: 48h antes | Tolerância atraso: 15min
• Localização: Bauru e Região (SP) | Instagram: @crescidinhosfotografia
"""

ESCALATION_TRIGGERS = [
    "reclamação", "reclamar", "problema", "errado", "decepcionada",
    "raiva", "insatisfeita", "reembolso", "devolução", "cancelar contrato",
    "advogado", "procon", "desconto especial", "negociar preço",
    "parcelamento diferente", "fora de bauru", "outra cidade",
]


# ── Supabase helpers ─────────────────────────────────────────────────

def sb_get(path, params=None):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=SB_HEADERS, params=params)
    return r.json() if r.ok else []


def sb_post(path, data):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{path}", headers=SB_HEADERS, json=data)
    return r.json() if r.ok else None


def sb_patch(path, data):
    requests.patch(f"{SUPABASE_URL}/rest/v1/{path}", headers=SB_HEADERS, json=data)


def get_agent_profile():
    rows = sb_get("perfil_agente", {"ativo": "eq.true", "order": "criado_em.desc", "limit": "1"})
    return rows[0] if rows else None


def is_agent_active():
    profile = get_agent_profile()
    return profile and profile.get("agente_ligado", False)


def get_history(phone, limit=10):
    rows = sb_get(
        "conversas_whatsapp",
        {"numero_telefone": f"eq.{phone}", "order": "created_at.desc", "limit": str(limit)},
    )
    return list(reversed(rows))


def get_client(phone):
    clean = re.sub(r"\D", "", phone)
    for p in [clean, clean[-11:] if len(clean) > 11 else clean]:
        rows = sb_get("clientes", {"telefone": f"eq.{p}", "limit": "1"})
        if rows:
            return rows[0]
    return None


def save_message(phone, text, sender, needs_attention=False):
    sb_post("conversas_whatsapp", {
        "numero_telefone": phone,
        "mensagem": text,
        "remetente": sender,
        "precisa_atencao": needs_attention,
    })


# ── Evolution API ────────────────────────────────────────────────────

def send_whatsapp(number, text):
    clean = re.sub(r"\D", "", number)
    if not clean.startswith("55"):
        clean = "55" + clean
    try:
        r = requests.post(
            f"{EVOLUTION_URL}/message/sendText/{EVOLUTION_INSTANCE}",
            headers={"Content-Type": "application/json", "apikey": EVOLUTION_KEY},
            json={"number": clean, "text": text},
            timeout=10,
        )
        return r.ok
    except Exception as e:
        log.error(f"Evolution API error: {e}")
        return False


def notify_photographer(phone, client_name, message_text, reason="precisa atenção"):
    msg = (
        f"⚠️ *Agente WhatsApp — {reason}*\n\n"
        f"Cliente: {client_name}\n"
        f"Telefone: {phone}\n\n"
        f"Última mensagem:\n_{message_text}_\n\n"
        f"Responda diretamente pelo WhatsApp ou acesse o painel."
    )
    send_whatsapp(PHOTOGRAPHER_PHONE, msg)


# ── Claude API ───────────────────────────────────────────────────────

def build_system_prompt(profile, client):
    base = profile["system_prompt"] if profile else (
        "Você é Thais, fotógrafa da Crescidinhos Fotografia em Bauru/SP. "
        "Responda de forma calorosa, afetuosa e profissional."
    )

    client_ctx = ""
    if client:
        client_ctx = (
            f"\nCLIENTE ATUAL: {client.get('nome_mae', 'sem nome')} "
            f"— já cadastrada no sistema ✅"
        )
    else:
        client_ctx = (
            f"\nCLIENTE ATUAL: não cadastrada ainda. "
            f"Para agendar, precisará se cadastrar no app: {APP_URL}"
        )

    return f"""{base}

{SERVICES_CONTEXT}

REGRA FUNDAMENTAL — AGENDAMENTOS:
TODOS os agendamentos são feitos EXCLUSIVAMENTE pelo app: {APP_URL}
Jamais marque sessão diretamente pelo WhatsApp. Sempre direcione para o app.
Se o cliente perguntar como agendar, envie o link: {APP_URL}
{client_ctx}

Se perceber que a situação é complexa (reclamação, negociação especial, pedidos fora do padrão),
finalize com: [ESCALAR_PARA_THAIS] — essa tag aciona uma notificação para a fotógrafa.
Não mencione essa tag para o cliente."""


def call_claude(system_prompt, history, current_message):
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    messages = []
    for msg in history[-8:]:
        role = "user" if msg["remetente"] == "cliente" else "assistant"
        messages.append({"role": role, "content": msg["mensagem"]})
    messages.append({"role": "user", "content": current_message})

    # Ensure we don't start with assistant
    if messages and messages[0]["role"] == "assistant":
        messages = messages[1:]

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text


def needs_escalation(text, response_text):
    text_lower = text.lower()
    if any(t in text_lower for t in ESCALATION_TRIGGERS):
        return True
    if "[ESCALAR_PARA_THAIS]" in response_text:
        return True
    return False


# ── Webhook endpoint ─────────────────────────────────────────────────

@app.post("/webhook")
async def receive_message(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    event = body.get("event", "")
    if event != "messages.upsert":
        return JSONResponse({"status": "ignored", "event": event})

    data = body.get("data", {})
    key = data.get("key", {})

    # Skip messages sent by the bot itself
    if key.get("fromMe"):
        return JSONResponse({"status": "own_message_skipped"})

    # Extract sender phone
    remote_jid = key.get("remoteJid", "")
    if "@g.us" in remote_jid:
        return JSONResponse({"status": "group_message_skipped"})

    phone = remote_jid.replace("@s.whatsapp.net", "").replace("@c.us", "")

    # Extract message text
    msg_obj = data.get("message", {})
    text = (
        msg_obj.get("conversation")
        or msg_obj.get("extendedTextMessage", {}).get("text")
        or msg_obj.get("imageMessage", {}).get("caption")
        or ""
    ).strip()

    if not text:
        return JSONResponse({"status": "no_text"})

    client_name = data.get("pushName", phone)
    log.info(f"Message from {phone} ({client_name}): {text[:80]}")

    # Check if agent is active
    if not is_agent_active():
        log.info("Agent is off, skipping")
        return JSONResponse({"status": "agent_off"})

    # Save incoming message
    save_message(phone, text, "cliente")

    # Build context
    profile = get_agent_profile()
    client = get_client(phone)
    history = get_history(phone)
    system_prompt = build_system_prompt(profile, client)

    # Generate response
    try:
        response_text = call_claude(system_prompt, history, text)
    except Exception as e:
        log.error(f"Claude error: {e}")
        return JSONResponse({"status": "claude_error", "error": str(e)})

    # Check if needs escalation
    should_escalate = needs_escalation(text, response_text)
    clean_response = response_text.replace("[ESCALAR_PARA_THAIS]", "").strip()

    # Save outgoing message
    save_message(phone, clean_response, "agente", needs_attention=should_escalate)

    # Send response
    send_whatsapp(phone, clean_response)

    if should_escalate:
        notify_photographer(phone, client_name, text, "situação especial")
        log.info(f"Escalated to photographer: {phone}")

    log.info(f"Responded to {phone}: {clean_response[:80]}")
    return JSONResponse({"status": "ok", "escalated": should_escalate})


@app.get("/health")
def health():
    profile = get_agent_profile()
    return {
        "status": "ok",
        "agent_active": bool(profile and profile.get("agente_ligado")),
        "profile_exists": bool(profile),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/")
def root():
    return {"service": "Agente WhatsApp Crescidinhos", "docs": "/docs"}
