#!/usr/bin/env python3
"""Descarga datos públicos de modelos de IA y genera los JSON que consume el sitio.

Fuentes (sin API key):
  - OpenRouter: catálogo de modelos con fecha de lanzamiento, contexto y precios.
  - Hugging Face: modelos abiertos en tendencia.

Uso:
  python scripts/update_data.py            # datos reales
  python scripts/update_data.py --sample   # datos sintéticos para probar el sitio
"""
import json
import random
import statistics
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "site" / "data"
LIMA = timezone(timedelta(hours=-5))  # Perú no usa horario de verano
OPENROUTER_URL = "https://openrouter.ai/api/v1/models"
HF_URL = (
    "https://huggingface.co/api/models?sort=trendingScore&direction=-1"
    "&limit=30&filter=text-generation"
)
HISTORY_DAYS = 730
UA = {"User-Agent": "ia-radar/1.0 (+github actions)"}


def fetch_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def per_million(value):
    """Precio por token (string) -> USD por millón de tokens, o None si no aplica."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return round(v * 1_000_000, 4) if v >= 0 else None


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
        })
    return models


def parse_hf(raw):
    out = []
    for m in raw:
        mid = m.get("id") or m.get("modelId")
        if not mid:
            continue
        out.append({
            "id": mid,
            "author": mid.split("/")[0],
            "downloads": m.get("downloads", 0),
            "likes": m.get("likes", 0),
            "trending": m.get("trendingScore", 0),
            "created": (m.get("createdAt") or "")[:10],
        })
    return out


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


def main():
    sample = "--sample" in sys.argv
    DATA.mkdir(parents=True, exist_ok=True)
    now = datetime.now(LIMA)
    today = now.strftime("%Y-%m-%d")

    previous = read_json(DATA / "latest.json", {})
    seen = read_json(DATA / "seen.json", {})
    first_run = not seen or previous.get("meta", {}).get("sample", False)
    sources = {}

    if sample:
        models, hf = sample_models(now)
        sources = {"openrouter": {"ok": True, "count": len(models)},
                   "huggingface": {"ok": True, "count": len(hf)}}
    else:
        try:
            models = parse_openrouter(fetch_json(OPENROUTER_URL))
            sources["openrouter"] = {"ok": True, "count": len(models)}
        except Exception as e:  # una fuente caída no debe tumbar la actualización
            print(f"OpenRouter falló: {e}", file=sys.stderr)
            models = previous.get("models", []) if not previous.get("meta", {}).get("sample") else []
            sources["openrouter"] = {"ok": False, "count": len(models), "error": str(e)[:200]}
        try:
            hf = parse_hf(fetch_json(HF_URL))
            sources["huggingface"] = {"ok": True, "count": len(hf)}
        except Exception as e:
            print(f"Hugging Face falló: {e}", file=sys.stderr)
            hf = previous.get("hf", []) if not previous.get("meta", {}).get("sample") else []
            sources["huggingface"] = {"ok": False, "count": len(hf), "error": str(e)[:200]}

    if not models:
        print("Sin datos de modelos; no se modifica nada.", file=sys.stderr)
        return 1

    if first_run and not sample:
        seen = {}
    for m in models:
        if m["id"] not in seen:
            # En la primera ejecución real no hay referencia: se usa la fecha de lanzamiento.
            seen[m["id"]] = m["created"] if first_run else today
        m["first_seen"] = seen[m["id"]]
    new_today = sum(1 for m in models if m["first_seen"] == today) if not first_run else 0

    models.sort(key=lambda m: (m["created"], m["id"]), reverse=True)

    latest = {
        "meta": {
            "updated_at": now.isoformat(timespec="minutes"),
            "updated_date": today,
            "timezone": "America/Lima",
            "sample": sample,
            "sources": sources,
            "new_today": new_today,
        },
        "models": models,
        "hf": hf,
    }
    (DATA / "latest.json").write_text(json.dumps(latest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (DATA / "seen.json").write_text(json.dumps(seen, separators=(",", ":"), sort_keys=True), encoding="utf-8")

    if not sample:
        pin = [m["price_in"] for m in models if m["price_in"]]
        pout = [m["price_out"] for m in models if m["price_out"]]
        ctx = [m["context"] for m in models if m["context"]]
        entry = {
            "date": today,
            "total": len(models),
            "new": new_today,
            "median_price_in": round(statistics.median(pin), 3) if pin else None,
            "median_price_out": round(statistics.median(pout), 3) if pout else None,
            "median_context": int(statistics.median(ctx)) if ctx else None,
        }
        history = [h for h in read_json(DATA / "history.json", []) if h["date"] != today]
        history.append(entry)
        history = history[-HISTORY_DAYS:]
        (DATA / "history.json").write_text(json.dumps(history, separators=(",", ":")), encoding="utf-8")

    print(f"OK {today}: {len(models)} modelos, {len(hf)} HF, nuevos hoy: {new_today}, sample={sample}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
