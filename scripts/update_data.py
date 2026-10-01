#!/usr/bin/env python3
"""Descarga datos públicos de modelos de IA y genera los JSON que consume el sitio.

Fuentes (sin API key):
  - OpenRouter: catálogo de modelos con fecha de lanzamiento, contexto y precios.
  - Hugging Face: modelos abiertos en tendencia.
  - RSS/Atom de laboratorios y prensa especializada: noticias del día.

Uso:
  python scripts/update_data.py            # datos reales
  python scripts/update_data.py --sample   # datos sintéticos para probar el sitio
"""
import html
import json
import random
import re
import statistics
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "site" / "data"
LIMA = timezone(timedelta(hours=-5))  # Perú no usa horario de verano
OPENROUTER_URL = "https://openrouter.ai/api/v1/models"
HF_URL = (
    "https://huggingface.co/api/models?sort=trendingScore&direction=-1"
    "&limit=30&filter=text-generation"
)
HISTORY_DAYS = 730
NEWS_KEEP_DAYS = 30
NEWS_MAX_ITEMS = 150
UA = {"User-Agent": "Mozilla/5.0 (compatible; IA-Radar/1.0; +https://github.com/Willy4903/taller-estadistica-garrita)"}

# (clave de proveedor, nombre, url, tipo, filtrar por tema IA)
FEEDS = [
    ("openai", "OpenAI", "https://openai.com/news/rss.xml", "lab", False),
    ("anthropic", "Anthropic", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml", "lab", False),
    ("google", "Google DeepMind", "https://deepmind.google/blog/rss.xml", "lab", False),
    ("google", "Google AI", "https://blog.google/technology/ai/rss/", "lab", True),
    ("meta", "Meta AI", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_meta_ai.xml", "lab", False),
    ("mistralai", "Mistral AI", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_mistral.xml", "lab", False),
    ("xai", "xAI", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_xainews.xml", "lab", False),
    ("microsoft", "Microsoft Research", "https://www.microsoft.com/en-us/research/feed/", "lab", True),
    ("nvidia", "NVIDIA", "https://blogs.nvidia.com/blog/category/generative-ai/feed/", "lab", True),
    ("huggingface", "Hugging Face", "https://huggingface.co/blog/feed.xml", "lab", False),
    ("press", "The Verge", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "press", False),
    ("press", "TechCrunch", "https://techcrunch.com/category/artificial-intelligence/feed/", "press", False),
    ("press", "MIT Technology Review", "https://www.technologyreview.com/topic/artificial-intelligence/feed", "press", False),
]
# Clasificación temática por palabras clave (sobre el texto original en inglés); gana la primera coincidencia.
TOPICS = [
    ("seguridad", r"safety|regulat|lawsuit|sues?\b|court|judge|antitrust|polic(y|ies)|\bban(s|ned)?\b|privacy|copyright|security|alignment|ethic|governance|legislat|\blaw\b|congress|senate|\beu\b|attorney"),
    ("infra", r"\bchips?\b|\bgpus?\b|data ?cent|compute|infrastructure|hardware|semiconductor|energy|nuclear|\bcloud\b|supercomputer|tpu|datacenter"),
    ("negocios", r"funding|raises?|valuation|acquir|acquisition|invest|revenue|\bipo\b|partnership|\bdeal\b|billion|million|startup|layoff|hires?\b|\bceo\b|earnings|stock|shares|merger|customers"),
    ("investigacion", r"research|\bpaper|\bstudy|scientist|discover|benchmark|dataset|algorithm|\bphysics|biology|math|training|\bevals?\b|interpretab"),
    ("modelos", r"\bmodels?\b|\bgpt-?\d|claude (opus|sonnet|haiku|fable)|gemini \d|llama ?\d|qwen ?\d|deepseek|mistral|grok ?\d|open[- ]source|open[- ]weights|\bllms?\b|reasoning"),
    ("productos", r"\bapp\b|feature|assistant|chatgpt|copilot|\bagents?\b|browser|search|tool|plugin|launch|rolls? out|introduc|available|debuts?"),
]
TOPIC_RES = [(k, re.compile(v, re.I)) for k, v in TOPICS]


def classify(text):
    for key, rx in TOPIC_RES:
        if rx.search(text):
            return key
    return "general"


AI_WORDS = re.compile(
    r"\b(ai|a\.i\.|llm|gpt|claude|gemini|gemma|llama|mistral|deepseek|qwen|grok|openai|anthropic|model|models|"
    r"agent|agents|chatbot|transformer|diffusion|reasoning|machine learning|neural|copilot|inference)\b", re.I)


def fetch_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def fetch_text(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def clean(text, limit=240):
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def parse_date(value):
    if not value:
        return None
    value = value.strip()
    try:
        dt = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_feed(raw, key, source, kind, only_ai):
    """Lee RSS 2.0 o Atom y devuelve una lista de noticias normalizadas."""
    root = ET.fromstring(raw)
    strip = lambda tag: tag.rsplit("}", 1)[-1]
    items = []
    for node in root.iter():
        if strip(node.tag) not in ("item", "entry"):
            continue
        f = {}
        for child in node:
            name = strip(child.tag)
            if name == "link":
                f.setdefault("link", child.get("href") or (child.text or "").strip())
            elif name not in f:
                f[name] = "".join(child.itertext())
        title = clean(f.get("title"), 200)
        link = f.get("link", "")
        dt = parse_date(f.get("pubDate") or f.get("published") or f.get("updated") or f.get("date"))
        summary = clean(f.get("description") or f.get("summary") or f.get("encoded") or f.get("content"))
        if not title or not link or not dt:
            continue
        if only_ai and not AI_WORDS.search(title + " " + summary):
            continue
        items.append({
            "title": title, "link": link, "source": source, "provider": key, "kind": kind,
            "published": dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "summary": summary,
            "topic": classify(title + " " + summary),
        })
    return items


# El traductor automático deforma algunos nombres propios; se corrigen después de traducir.
ES_FIXES = [("Antrópico", "Anthropic"), ("Antrópica", "Anthropic"), ("Antropic", "Anthropic"), ("Antropico", "Anthropic")]


def fix_es(text):
    for bad, good in ES_FIXES:
        text = text.replace(bad, good)
    return text


_translate = None


def get_translator():
    """Traductor inglés->español local (argostranslate). Devuelve None si no está disponible."""
    global _translate
    if _translate is not None:
        return _translate or None
    try:
        import argostranslate.package as pkg
        import argostranslate.translate as tr

        def find():
            langs = {l.code: l for l in tr.get_installed_languages()}
            if "en" in langs and "es" in langs:
                t = langs["en"].get_translation(langs["es"])
                if t:
                    return t
            return None

        t = find()
        if t is None:
            pkg.update_package_index()
            cand = next(p for p in pkg.get_available_packages() if p.from_code == "en" and p.to_code == "es")
            pkg.install_from_path(cand.download())
            t = find()
        _translate = t.translate if t else False
    except Exception as e:  # sin traductor se muestra el original
        print(f"Traductor no disponible: {e}", file=sys.stderr)
        _translate = False
    return _translate or None


def translate_items(items, limit=200):
    """Traduce al español título y resumen de las noticias que aún no lo tienen."""
    pending = [i for i in items if not i.get("title_es")][:limit]
    if not pending:
        return 0
    tr = get_translator()
    if not tr:
        return 0
    done = 0
    for i in pending:
        try:
            i["title_es"] = fix_es(tr(i["title"]).strip())
            if i.get("summary"):
                i["summary_es"] = fix_es(tr(i["summary"]).strip())
            done += 1
        except Exception as e:
            print(f"No se pudo traducir '{i['title'][:50]}': {e}", file=sys.stderr)
    return done


def translate_descriptions(models, previous_models, limit=450):
    """Traduce al español las descripciones de los modelos; reutiliza las ya traducidas si no cambiaron."""
    prev = {m["id"]: m for m in previous_models}
    pending = []
    for m in models:
        old = prev.get(m["id"])
        if old and old.get("description") == m.get("description") and old.get("description_es"):
            m["description_es"] = fix_es(old["description_es"])
        elif m.get("description") and not m["id"].startswith("~") and not m["id"].endswith(":batch"):
            pending.append(m)
    if not pending:
        return 0
    tr = get_translator()
    if not tr:
        return 0
    done = 0
    for m in pending[:limit]:
        try:
            m["description_es"] = fix_es(tr(m["description"]).strip())
            done += 1
        except Exception as e:
            print(f"No se pudo traducir la descripción de {m['id']}: {e}", file=sys.stderr)
    return done


# ---------- Interés de búsqueda por país y por departamento (Google Trends) ----------
# Indicador de presencia, no de suscriptores: ninguna empresa publica usuarios por país.
TREND_TERMS = [("ChatGPT", "ChatGPT"), ("Gemini", "Gemini AI"), ("Claude", "Claude AI"), ("Copilot", "Microsoft Copilot"), ("DeepSeek", "DeepSeek")]
LATAM_CODES = {"PE": "Perú", "MX": "México", "CO": "Colombia", "CL": "Chile", "AR": "Argentina", "BR": "Brasil", "EC": "Ecuador", "UY": "Uruguay",
               "BO": "Bolivia", "PY": "Paraguay", "VE": "Venezuela", "CR": "Costa Rica", "PA": "Panamá", "DO": "Rep. Dominicana", "GT": "Guatemala"}


def _shares(row, keys):
    vals = {k: float(row.get(k, 0) or 0) for k in keys}
    tot = sum(vals.values())
    return {k: (round(v / tot * 100, 1) if tot else 0.0) for k, v in vals.items()}


def collect_regional():
    """Cuota de interés de búsqueda entre cinco asistentes de IA: LatAm, departamentos del Perú y serie diaria en Perú."""
    try:
        from pytrends.request import TrendReq
    except Exception as e:
        return {"ok": False, "error": f"pytrends no disponible: {e}"[:200]}
    import time
    kw = [t[1] for t in TREND_TERMS]
    names = [t[0] for t in TREND_TERMS]
    try:
        py = TrendReq(hl="es-PE", tz=300, timeout=(10, 40))  # no usar retries/backoff_factor: fallan con urllib3 2.x

        def attempt(fn, tries=4):
            last = None
            for k in range(tries):
                try:
                    return fn()
                except Exception as e:  # 429 u otros bloqueos temporales de Google
                    last = e
                    time.sleep(6 * (k + 1))
            raise last

        py.build_payload(kw, timeframe="today 3-m", geo="")
        world = attempt(lambda: py.interest_by_region(resolution="COUNTRY", inc_low_vol=True, inc_geo_code=True))
        time.sleep(3)
        countries = {}
        for _, row in world.iterrows():
            code = row.get("geoCode")
            if code in LATAM_CODES:
                countries[code] = {"name": LATAM_CODES[code], "share": _shares({n: row[k] for n, k in zip(names, kw)}, names)}
        time.sleep(3)
        py.build_payload(kw, timeframe="today 3-m", geo="PE")
        reg = attempt(lambda: py.interest_by_region(resolution="REGION", inc_low_vol=True, inc_geo_code=False))
        regions = []
        for name, row in reg.iterrows():
            tot = sum(float(row[k] or 0) for k in kw)
            if tot > 0:
                regions.append({"name": str(name).replace(" Region", "").replace("Provincia de ", ""), "total": round(tot, 1), "share": _shares({n: row[k] for n, k in zip(names, kw)}, names)})
        regions.sort(key=lambda r: r["total"], reverse=True)
        time.sleep(3)
        series = attempt(lambda: py.interest_over_time())
        timeline = [{"date": idx.strftime("%Y-%m-%d"), **{n: int(row[k]) for n, k in zip(names, kw)}} for idx, row in series.iterrows()]
        return {"ok": True, "terms": dict(zip(names, kw)), "window": "últimos 3 meses", "countries": countries, "peru_regions": regions[:24], "peru_timeline": timeline}
    except Exception as e:  # Google puede limitar las consultas desde servidores en la nube
        return {"ok": False, "error": str(e)[:200]}


def collect_news(previous_items, now_utc):
    status, found = {}, []
    for key, source, url, kind, only_ai in FEEDS:
        try:
            items = parse_feed(fetch_text(url), key, source, kind, only_ai)
            status[source] = {"ok": True, "count": len(items)}
            found.extend(items)
        except Exception as e:  # un feed caído no debe tumbar la actualización
            print(f"Feed {source} falló: {e}", file=sys.stderr)
            status[source] = {"ok": False, "count": 0, "error": str(e)[:160]}
    prev = {i["link"]: i for i in previous_items}
    merged = dict(prev)
    for i in found:
        old = prev.get(i["link"])
        if old and old.get("title") == i["title"]:  # conserva la traducción ya hecha
            i["title_es"], i["summary_es"] = old.get("title_es", ""), old.get("summary_es", "")
        merged[i["link"]] = i
    for i in merged.values():
        i.setdefault("topic", classify(i["title"] + " " + i.get("summary", "")))
    limit = (now_utc - timedelta(days=NEWS_KEEP_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    kept = sorted((i for i in merged.values() if i["published"] >= limit), key=lambda i: i["published"], reverse=True)
    kept = kept[:NEWS_MAX_ITEMS]
    status["_traducidas"] = {"ok": True, "count": translate_items(kept)}
    for i in kept:  # corrige también lo traducido en ejecuciones anteriores
        for k in ("title_es", "summary_es"):
            if i.get(k):
                i[k] = fix_es(i[k])
    return kept, status


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
    if not sample:
        prev_models = previous.get("models", []) if not previous.get("meta", {}).get("sample") else []
        n_desc = translate_descriptions(models, prev_models)
        con = sum(1 for m in models if m.get("description"))
        trad = sum(1 for m in models if m.get("description_es"))
        print(f"Descripciones: {con} de {len(models)} modelos con descripción, {trad} en español (traducidas ahora: {n_desc})")

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

    if not sample:
        prev_news = read_json(DATA / "news.json", {}).get("items", [])
        items, feed_status = collect_news(prev_news, datetime.now(timezone.utc))
        trad = feed_status.pop("_traducidas")["count"]
        ok = sum(1 for v in feed_status.values() if v["ok"])
        sin = sum(1 for i in items if not i.get("title_es"))
        print(f"Noticias: {len(items)} items, {ok}/{len(feed_status)} feeds ok, traducidas ahora: {trad}, sin traducir: {sin}")
        for name, v in feed_status.items():
            print(f"  {'OK ' if v['ok'] else 'ERR'} {name}: {v['count']}" + ("" if v["ok"] else " " + v["error"]))
        if items or not prev_news:
            (DATA / "news.json").write_text(json.dumps(
                {"updated_at": now.isoformat(timespec="minutes"), "feeds": feed_status, "items": items},
                ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    if not sample:
        reg = collect_regional()
        old = read_json(DATA / "regional.json", {})
        if reg.get("ok"):
            reg["updated_at"] = now.isoformat(timespec="minutes")
            (DATA / "regional.json").write_text(json.dumps(reg, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            print(f"Interés regional: ok, {len(reg['countries'])} países, {len(reg['peru_regions'])} departamentos")
        else:
            print(f"Interés regional: no disponible ({reg.get('error')}); se conservan los últimos datos válidos", file=sys.stderr)
            if not old.get("ok"):
                (DATA / "regional.json").write_text(json.dumps({"ok": False, "error": reg.get("error"), "updated_at": now.isoformat(timespec="minutes")}, ensure_ascii=False), encoding="utf-8")

    print(f"OK {today}: {len(models)} modelos, {len(hf)} HF, nuevos hoy: {new_today}, sample={sample}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
