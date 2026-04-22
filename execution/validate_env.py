#!/usr/bin/env python3
"""
Valida variáveis de ambiente para o Worker Meta CAPI (sem chamadas à Meta — sem custo de API).
Uso: na raiz do projeto, com .env preenchido:
  python execution/validate_env.py
  python execution/validate_env.py --strict
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

try:
    from dotenv import load_dotenv
except ImportError:
    print("Instale python-dotenv: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(2)


def load_env() -> None:
    env_path = ROOT / ".env"
    if env_path.is_file():
        load_dotenv(env_path)
    else:
        print("Aviso: .env não encontrado na raiz; usando apenas variáveis já exportadas.", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida env para Meta CAPI Worker.")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exige ALLOWED_ORIGINS explícito (não vazio, não *) quando WORKER_ENV=production",
    )
    args = parser.parse_args()
    load_env()

    pixel = (os.environ.get("PIXEL_ID") or "").strip()
    token = (os.environ.get("META_ACCESS_TOKEN") or "").strip()
    version = (os.environ.get("META_API_VERSION") or "v21.0").strip()
    origins = (os.environ.get("ALLOWED_ORIGINS") or "").strip()
    worker_env = (os.environ.get("WORKER_ENV") or "production").strip().lower()

    errors: list[str] = []

    if not pixel or not re.fullmatch(r"\d{5,20}", pixel):
        errors.append("PIXEL_ID deve ser numérico (IDs de pixel Meta).")

    if not token or len(token) < 20:
        errors.append("META_ACCESS_TOKEN ausente ou suspeito demais curto.")

    if not re.match(r"^v?\d+\.\d+", version):
        errors.append("META_API_VERSION deve parecer v19.0 ou 19.0.")

    if args.strict or worker_env in ("production", "prod"):
        if not origins or origins == "*":
            errors.append(
                "Em produção defina ALLOWED_ORIGINS com origens HTTPS explícitas (não * nem vazio)."
            )

    if errors:
        print("Falha na validação:\n", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print("OK: variáveis mínimas presentes e formato coerente.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
