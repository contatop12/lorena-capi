#!/usr/bin/env python3
"""Verifica saúde dos 3 endpoints principais do worker CAPI. Camada 3 — Execução."""

import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv()

WORKER_URL    = os.getenv("WORKER_URL", "").rstrip("/")
MONITOR_TOKEN = os.getenv("MONITOR_TOKEN", "").strip()

if not WORKER_URL:
    print("✗ WORKER_URL não definido no .env")
    sys.exit(1)


def check(label: str, ok: bool, detail: str = ""):
    icon = "✓" if ok else "✗"
    line = f"  {icon} {label}"
    if detail:
        line += f" — {detail}"
    print(line)
    return ok


def run():
    errors = []

    # 1. Health endpoint
    print("1. GET /health")
    try:
        r = httpx.get(f"{WORKER_URL}/health", timeout=10)
        d = r.json()
        ok = r.status_code == 200 and bool(d.get("ok"))
        detail = f"worker_env={d.get('worker_env', '?')}" if ok else f"status={r.status_code}"
        if not check("health", ok, detail):
            errors.append("health")
    except Exception as exc:
        check("health", False, str(exc))
        errors.append("health")

    # 2. Dashboard HTML
    print("2. GET /dashboard")
    try:
        r = httpx.get(f"{WORKER_URL}/dashboard", timeout=10, follow_redirects=False)
        ok = r.status_code == 200 and "CAPI" in r.text
        detail = "HTML ok" if ok else f"status={r.status_code}"
        if not check("dashboard", ok, detail):
            errors.append("dashboard")
    except Exception as exc:
        check("dashboard", False, str(exc))
        errors.append("dashboard")

    # 3. Monitor API
    print("3. GET /api/monitor/events")
    if not MONITOR_TOKEN:
        print("   - pulado (MONITOR_TOKEN não definido)")
    else:
        try:
            r = httpx.get(
                f"{WORKER_URL}/api/monitor/events",
                cookies={"meta_monitor_token": MONITOR_TOKEN},
                timeout=10,
            )
            d = r.json()
            ok = r.status_code == 200 and bool(d.get("ok"))
            if ok:
                m = d.get("metrics", {})
                detail = f"eventos={m.get('event_total', 0)}, leads={m.get('lead_total', 0)}"
            else:
                detail = f"status={r.status_code}"
            if not check("monitor_api", ok, detail):
                errors.append("monitor_api")
        except Exception as exc:
            check("monitor_api", False, str(exc))
            errors.append("monitor_api")

    print()
    if errors:
        print(f"✗ {len(errors)} verificação(ões) falharam: {', '.join(errors)}")
        sys.exit(1)
    print("✓ Worker saudável.")


if __name__ == "__main__":
    run()
