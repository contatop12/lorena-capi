#!/usr/bin/env python3
"""Envia um evento Lead de teste ao worker CAPI e valida a resposta. Camada 3 — Execução."""

import os
import sys
import json
import time
import hashlib
import httpx
from dotenv import load_dotenv

load_dotenv()

WORKER_URL = os.getenv("WORKER_URL", "").rstrip("/")
if not WORKER_URL:
    print("✗ WORKER_URL não definido no .env")
    sys.exit(1)


def sha256(val: str) -> str:
    return hashlib.sha256(val.strip().lower().encode()).hexdigest()


def test_event():
    event_id = f"test_{int(time.time() * 1000)}"
    payload = {
        "event_name": "Lead",
        "event_id": event_id,
        "event_time": int(time.time()),
        "user_data": {
            "em": [sha256("test@example.com")],
            "ph": [sha256("11999999999")],
            "client_ip_address": "127.0.0.1",
            "client_user_agent": "Mozilla/5.0 (Test; Python/exec)",
        },
        "custom_data": {"source": "test_capi_event_script"},
    }

    print(f"Enviando evento de teste: {event_id}")
    print(f"Endpoint: {WORKER_URL}/event\n")

    try:
        resp = httpx.post(
            f"{WORKER_URL}/event",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15.0,
        )
        data = resp.json()
        print(f"HTTP {resp.status_code}")
        print(json.dumps(data, indent=2, ensure_ascii=False))

        if resp.status_code == 200 and data.get("ok"):
            print(f"\n✓ Evento enviado com sucesso. event_id={event_id}")
        else:
            print(f"\n✗ Falha: {data.get('error', 'desconhecido')}")
            sys.exit(1)
    except httpx.RequestError as exc:
        print(f"✗ Erro de conexão: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    test_event()
