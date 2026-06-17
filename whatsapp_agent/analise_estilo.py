"""
analise_estilo.py — Crescidinhos Fotografia
Analisa conversas exportadas do WhatsApp e gera o system prompt do agente.

Uso:
  python analise_estilo.py <arquivo.zip> <ANTHROPIC_API_KEY>

Exemplo:
  python analise_estilo.py conversa_cliente.zip sk-ant-api03-...

Exporte conversas pelo WhatsApp: Conversa → ⋮ → Exportar conversa → Sem mídia
"""

import zipfile
import re
import json
import sys
import os
import requests
from datetime import datetime

SUPABASE_URL = "https://uuorxycrxadhjbrebrlg.supabase.co"
SUPABASE_KEY = "sb_publishable_AxWQH9wnxrygp3NfiOVxvA_8dqvTzZ3"

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

SKIPPED_PATTERNS = [
    "Mensagens e chamadas são criptografadas",
    "<Mídia omitida>",
    "image omitted",
    "audio omitted",
    "video omitted",
    "sticker omitted",
    "document omitted",
    "GIF omitted",
]


def parse_whatsapp_zip(zip_path):
    with zipfile.ZipFile(zip_path, "r") as z:
        chat_files = [f for f in z.namelist() if "_chat.txt" in f or f == "_chat.txt"]
        if not chat_files:
            chat_files = [f for f in z.namelist() if f.endswith(".txt")]
        if not chat_files:
            raise ValueError("Arquivo _chat.txt não encontrado no ZIP.")
        with z.open(chat_files[0]) as f:
            content = f.read().decode("utf-8", errors="ignore")
    return parse_chat_text(content)


def parse_chat_text(content):
    messages = []
    current = None

    # Matches both [DD/MM/YYYY, HH:MM:SS] and DD/MM/YYYY HH:MM -
    header_re = re.compile(
        r"(?:\[(\d{2}/\d{2}/\d{4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)\]\s+|"
        r"(\d{2}/\d{2}/\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+-\s+)"
        r"([^:]+):\s+(.*)"
    )

    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue
        m = header_re.match(line)
        if m:
            if current:
                messages.append(current)
            g = m.groups()
            date = g[0] or g[2]
            time_ = g[1] or g[3]
            sender = (g[4] or "").strip()
            text = (g[5] or "").strip()
            current = {"date": date, "time": time_, "sender": sender, "text": text}
        elif current:
            current["text"] += "\n" + line

    if current:
        messages.append(current)

    return messages


def identify_photographer(messages):
    senders = {}
    for msg in messages:
        s = msg["sender"]
        senders[s] = senders.get(s, 0) + 1

    for name in senders:
        if "thais" in name.lower() or "crescidinhos" in name.lower():
            return name

    # Fallback: most frequent sender is usually the photographer
    return max(senders, key=lambda k: senders[k])


def should_skip(text):
    return any(p in text for p in SKIPPED_PATTERNS)


def format_conversation(messages, photographer_sender):
    lines = []
    for msg in messages:
        if should_skip(msg["text"]):
            continue
        role = "THAIS" if msg["sender"] == photographer_sender else "CLIENTE"
        lines.append(f"[{role}]: {msg['text']}")
    return "\n".join(lines)


def analyze_with_claude(conversation_text, api_key):
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""Você vai analisar conversas reais de atendimento de uma fotógrafa chamada Thais \
(Crescidinhos Fotografia, Bauru/SP) com seus clientes no WhatsApp.

CONVERSAS PARA ANÁLISE:
{conversation_text[:60000]}

---

Analise cuidadosamente e gere:

1. ANÁLISE DO ESTILO: tom de voz, emojis usados, saudações, despedidas, linguagem típica, \
como apresenta preços, como responde a dúvidas, frases características.

2. SYSTEM PROMPT COMPLETO para um agente de IA responder exatamente como Thais, incluindo:
   - Tom e personalidade detalhados
   - Exemplos concretos de frases que ela usa
   - Como lidar com cada tipo de pergunta (preço, agendamento, dúvidas, objeções)
   - O que o agente NUNCA deve fazer

CONTEXTO FIXO QUE O AGENTE JÁ TEM (não precisa repetir no system prompt):
- Lista completa de serviços e preços
- Regra: TODOS agendamentos são feitos EXCLUSIVAMENTE pelo app app.crescidinhosfoto.com.br
- Link do app e dados de contato da fotógrafa

Formate a resposta exatamente assim:

---ANÁLISE---
[análise detalhada do estilo]

---SYSTEM PROMPT---
[system prompt completo, em primeira pessoa, como se fosse instruções para o agente]"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def save_profile(system_prompt, analysis):
    # Deactivate existing profiles
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/perfil_agente?ativo=eq.true",
        headers=SUPABASE_HEADERS,
        json={"ativo": False},
    )

    # Save new profile
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/perfil_agente",
        headers=SUPABASE_HEADERS,
        json={
            "system_prompt": system_prompt,
            "analise": analysis,
            "ativo": True,
            "agente_ligado": False,
            "criado_em": datetime.now().isoformat(),
        },
    )
    if r.status_code not in [200, 201]:
        raise Exception(f"Supabase error: {r.text}")
    return r.json()


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    zip_path, api_key = sys.argv[1], sys.argv[2]

    if not os.path.exists(zip_path):
        print(f"Arquivo não encontrado: {zip_path}")
        sys.exit(1)

    print(f"📂 Lendo {zip_path}...")
    messages = parse_whatsapp_zip(zip_path)
    print(f"   → {len(messages)} mensagens encontradas")

    photographer = identify_photographer(messages)
    print(f"   → Fotógrafa: {photographer}")

    conversation = format_conversation(messages, photographer)
    print(f"   → {len(conversation)} caracteres de conversa")

    print("🤖 Analisando estilo com Claude...")
    result = analyze_with_claude(conversation, api_key)

    if "---SYSTEM PROMPT---" in result:
        parts = result.split("---SYSTEM PROMPT---")
        analysis = parts[0].replace("---ANÁLISE---", "").strip()
        system_prompt = parts[1].strip()
    else:
        analysis = ""
        system_prompt = result.strip()

    print("\n" + "=" * 60)
    print("SYSTEM PROMPT GERADO:")
    print("=" * 60)
    print(system_prompt[:2000] + ("..." if len(system_prompt) > 2000 else ""))
    print("=" * 60)

    # Save backup locally
    out = "perfil_agente_gerado.txt"
    with open(out, "w", encoding="utf-8") as f:
        f.write(f"ANÁLISE:\n{analysis}\n\n{'='*60}\nSYSTEM PROMPT:\n{system_prompt}")
    print(f"\n💾 Backup salvo em: {out}")

    print("💾 Salvando no Supabase...")
    try:
        save_profile(system_prompt, analysis)
        print("✅ Perfil salvo! Agora vá ao painel do app para ativar o agente.")
    except Exception as e:
        print(f"⚠️ Erro ao salvar no Supabase: {e}")
        print(f"   O system prompt está salvo em {out} — cole-o manualmente no painel.")

    # Also accept multiple ZIPs: re-run appending more conversations
    if len(sys.argv) > 3:
        print("\nDica: para adicionar mais conversas, rode o script novamente com outro ZIP.")


if __name__ == "__main__":
    main()
