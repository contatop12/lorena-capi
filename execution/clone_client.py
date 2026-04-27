#!/usr/bin/env python3
"""
Cria um novo projeto de cliente a partir deste piloto (lorena-capi).
Camada 3 — Execução.

Uso:
    python execution/clone_client.py --name "João Silva" --slug joao-adv
    python execution/clone_client.py --name "Maria Adv" --slug maria-adv --output C:/IA/P12/01. Automações Ativas
"""

import os
import re
import sys
import shutil
import argparse

TEMPLATE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

IGNORE = shutil.ignore_patterns(
    ".git", ".wrangler", "node_modules", ".tmp",
    "*.log", "__pycache__", "*.pyc", ".env",
)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text.strip("-")


def replace_in_file(path: str, replacements: list[tuple[str, str]]) -> bool:
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        for old, new in replacements:
            content = re.sub(old, new, content)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    except Exception as exc:
        print(f"  ⚠ Não foi possível editar {path}: {exc}")
        return False


def clone_client(name: str, slug: str, output_dir: str):
    target = os.path.join(output_dir, f"{slug}-capi")

    if os.path.exists(target):
        print(f"✗ Diretório já existe: {target}")
        sys.exit(1)

    print(f"Cliente : {name}")
    print(f"Slug    : {slug}")
    print(f"Destino : {target}\n")

    # Copiar estrutura
    shutil.copytree(TEMPLATE_DIR, target, ignore=IGNORE)
    print("✓ Estrutura copiada")

    # Atualizar wrangler.toml
    wrangler = os.path.join(target, "wrangler.toml")
    if os.path.exists(wrangler):
        replace_in_file(wrangler, [
            (r'name\s*=\s*"[^"]*"',           f'name = "{slug}-capi"'),
            (r'CLIENT_NAME\s*=\s*"[^"]*"',     f'CLIENT_NAME = "CAPI {name}"'),
            (r'PIXEL_ID\s*=\s*"[^"]*"',        'PIXEL_ID = ""'),
            (r'ALLOWED_ORIGINS\s*=\s*"[^"]*"', 'ALLOWED_ORIGINS = ""'),
            (r'WORKER_EVENT_URL\s*=\s*"[^"]*"',f'WORKER_EVENT_URL = "https://{slug}-capi.suporte-922.workers.dev/event"'),
        ])
        print("✓ wrangler.toml atualizado")

    # Criar .env a partir do .env.example
    env_example = os.path.join(target, ".env.example")
    env_file    = os.path.join(target, ".env")
    if os.path.exists(env_example):
        shutil.copy(env_example, env_file)
        replace_in_file(env_file, [
            (r"CLIENT_NAME=.*", f"CLIENT_NAME=CAPI {name}"),
            (r"WORKER_URL=.*",  f"WORKER_URL=https://{slug}-capi.suporte-922.workers.dev"),
        ])
        print("✓ .env criado")

    # Criar diretiva do cliente
    directive_path = os.path.join(target, "directives", f"cliente_{slug}.md")
    directive_content = f"""# Cliente: {name}

## Identificação

| Campo | Valor |
|---|---|
| Nome | {name} |
| Pixel ID | (preencher) |
| Origem CORS | (preencher — ex: https://www.dominio.com.br) |
| Worker | {slug}-capi |
| URL Worker | https://{slug}-capi.suporte-922.workers.dev |
| Dashboard | https://{slug}-capi.suporte-922.workers.dev/dashboard |

## Configuração inicial

1. Editar `wrangler.toml`: `PIXEL_ID`, `ALLOWED_ORIGINS`
2. `npx wrangler secret put META_ACCESS_TOKEN`
3. `npx wrangler secret put MONITOR_TOKEN`
4. `npx wrangler deploy`
5. `python execution/check_health.py`
6. `python execution/validate_env.py`

## Manutenção

Seguir o mesmo padrão do projeto piloto `lorena-capi` e do `AGENTS.md`.
"""
    with open(directive_path, "w", encoding="utf-8") as f:
        f.write(directive_content)
    print(f"✓ Diretiva criada: directives/cliente_{slug}.md")

    print(f"""
✓ Projeto criado em: {target}

Próximos passos:
  cd "{target}"
  # Editar wrangler.toml: PIXEL_ID e ALLOWED_ORIGINS
  npx wrangler secret put META_ACCESS_TOKEN
  npx wrangler secret put MONITOR_TOKEN
  npx wrangler deploy
  python execution/check_health.py
""")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clona o projeto piloto CAPI para um novo cliente")
    parser.add_argument("--name",   required=True, help="Nome do cliente (ex: 'João Silva')")
    parser.add_argument("--slug",   help="Slug (ex: 'joao-adv'). Se omitido, gerado do nome.")
    parser.add_argument("--output", default=os.path.dirname(TEMPLATE_DIR),
                        help="Diretório pai onde criar o projeto. Padrão: pasta acima do piloto.")
    args = parser.parse_args()

    slug = args.slug or slugify(args.name)
    clone_client(args.name, slug, args.output)
