"""OpenRouter: catálogo de modelos (fecha, contexto, precios, modalidades) y actividad de uso en su plataforma."""
import json
import random
import re
import sys
from datetime import datetime, timedelta, timezone

from common import LIMA, clean, fact, fetch_json, fetch_text, keep_valid

OPENROUTER_URL = "https://openrouter.ai/api/v1/models"
RANKINGS_URL = "https://openrouter.ai/rankings"


def per_million(value):
    """Precio por token (string) -> USD por millón de tokens, o None si no aplica."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return round(v * 1_000_000, 4) if v >= 0 else None


def clean_desc(text, limit=330):
    """Descripción del proveedor: sin enlaces ni formato markdown, en 1 o 2 frases."""
    t = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text or "")
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"[*_`#>]+", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= limit:
        return t
    cut = t[:limit]
    end = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "))
    return (cut[: end + 1] if end > 120 else cut.rsplit(" ", 1)[0] + "…").strip()


def parse_openrouter(raw):
    models = []
    for m in raw.get("data", []):
        pricing = m.get("pricing") or {}
        arch = m.get("architecture") or {}
        mid = m.get("id", "")
        created = m.get("created")
        if not mid or not created:
            continue
        inputs = arch.get("input_modalities") or ["text"]
        models.append({
            "id": mid,
            "name": m.get("name") or mid,
            "provider": mid.split("/")[0],
            "created": datetime.fromtimestamp(created, timezone.utc).strftime("%Y-%m-%d"),
            "context": m.get("context_length") or 0,
            "price_in": per_million(pricing.get("prompt")),
            "price_out": per_million(pricing.get("completion")),
            "inputs": inputs,
            "multimodal": len(set(inputs) - {"text"}) > 0,
            "reasoning": "reasoning" in (m.get("supported_parameters") or []),
            "description": clean_desc(m.get("description")),
        })
    return models


def sample_models(now):
    rnd = random.Random(7)
    providers = ["proveedor-a", "proveedor-b", "proveedor-c", "proveedor-d", "proveedor-e"]
    models = []
    for i in range(80):
        p = providers[i % len(providers)]
        days = rnd.randint(0, 300)
        ctx = rnd.choice([32_000, 128_000, 200_000, 1_000_000])
        pin = round(rnd.uniform(0.1, 6), 3)
        models.append({
            "id": f"{p}/modelo-demo-{i + 1}",
            "name": f"Modelo demo {i + 1}",
            "provider": p,
            "created": (now - timedelta(days=days)).strftime("%Y-%m-%d"),
            "context": ctx,
            "price_in": pin,
            "price_out": round(pin * rnd.uniform(2, 5), 3),
            "inputs": ["text", "image"] if i % 3 == 0 else ["text"],
            "multimodal": i % 3 == 0,
            "reasoning": i % 4 == 0,
        })
    hf = [{
        "id": f"autor-{i % 6}/modelo-abierto-{i + 1}", "author": f"autor-{i % 6}",
        "downloads": rnd.randint(10_000, 4_000_000), "likes": rnd.randint(50, 5000),
        "trending": rnd.randint(10, 400), "created": now.strftime("%Y-%m-%d"),
    } for i in range(20)]
    return models, hf


def fetch_models():
    return parse_openrouter(fetch_json(OPENROUTER_URL))


def fetch_usage():
    """Tokens procesados por modelo en OpenRouter durante la última semana, leídos de su página pública de rankings.
    Mide actividad dentro de OpenRouter, no uso global ni usuarios. Lanza error si la estructura cambió."""
    raw = fetch_text(RANKINGS_URL).replace('\\"', '"')
    rows = []
    for m in re.finditer(r'\{[^{}]*"model_permaslug"[^{}]*\}', raw):
        try:
            rows.append(json.loads(m.group(0)))
        except ValueError:
            continue
    if not rows:
        raise ValueError("la página de rankings no contiene datos de modelos reconocibles")
    days = sorted({r.get("date", "")[:10] for r in rows if r.get("date")})
    recent = set(days[-7:])
    tot = {}
    for r in rows:
        if r.get("date", "")[:10] in recent:
            k = r["model_permaslug"]
            tot[k] = tot.get(k, 0) + float(r.get("total_prompt_tokens", 0) or 0) + float(r.get("total_completion_tokens", 0) or 0)
    top = sorted(tot.items(), key=lambda x: -x[1])[:15]
    if not top:
        raise ValueError("sin filas en los últimos 7 días")
    return [fact(round(v / 1e9, 1), "miles de millones de tokens", "tokens", "OpenRouter Rankings", RANKINGS_URL, provider=k.split("/")[0],
                 published_at=days[-1], confidence="media", methodology_note="Tokens (entrada y salida) procesados en OpenRouter en los últimos 7 días; solo refleja a sus usuarios, no el uso total del mercado.", model=k)
            for k, v in top]
