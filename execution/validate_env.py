#!/usr/bin/env python3
"""Valida variáveis de ambiente obrigatórias do worker CAPI. Camada 3 — Execução."""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

REQUIRED = [
    "PIXEL_ID",
    "META_ACCESS_TOKEN",
    "META_API_VERSION",
    "ALLOWED_ORIGINS",
    "WORKER_ENV",
]

OPTIONAL = [
    "CLIENT_NAME",
    "WORKER_URL",
    "MONITOR_TOKEN",
    "WEBHOOK_TOKEN",
    "EXPOSE_META_ERRORS",
    "TEST_EVENT_CODE",
]

SECRETS = {"META_ACCESS_TOKEN", "MONITOR_TOKEN", "WEBHOOK_TOKEN"}


def mask(key, val):
    return "***" if key in SECRETS else val


def validate():
    errors = []
    warnings = []

    print("=== Variáveis obrigatórias ===")
    for key in REQUIRED:
        val = os.getenv(key, "").strip()
        if not val:
            errors.append(f"FALTANDO: {key}")
            print(f"  ✗ {key}")
        elif key == "META_API_VERSION" and not val.startswith("v"):
            errors.append(f"FORMATO: {key} deve começar com 'v' (ex: v25.0), atual: {val}")
            print(f"  ✗ {key} = {val}")
        elif key == "ALLOWED_ORIGINS" and ("*" in val or not val.startswith("https")):
            warnings.append(f"{key} deve ser HTTPS explícito em produção (atual: {val})")
            print(f"  ~ {key} = {val}")
        else:
            print(f"  ✓ {key} = {mask(key, val)}")

    print("\n=== Variáveis opcionais ===")
    for key in OPTIONAL:
        val = os.getenv(key, "").strip()
        if val:
            print(f"  ~ {key} = {mask(key, val)}")
        else:
            warnings.append(f"Opcional não definido: {key}")
            print(f"  - {key} (não definido)")

    if warnings:
        print("\n⚠ Avisos:")
        for w in warnings:
            print(f"  {w}")

    if errors:
        print("\n✗ Erros:")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)

    print("\n✓ Todas as variáveis obrigatórias estão configuradas.")


if __name__ == "__main__":
    validate()
