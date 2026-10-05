"""Utilidades compartidas: rutas, descarga, lectura/escritura de JSON y esquema de datos con procedencia."""
import gzip
import html
import json
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DATA = SITE / "data" / "current"      # datos vigentes que consume el sitio
STATE = SITE / "data" / "state"       # estado interno del pipeline
HISTORY = SITE / "history"            # una carpeta por día: YYYY-MM-DD/
CONTENT = SITE / "content"            # contenido editorial (glosario, academia, casos, normativa)
LIMA = timezone(timedelta(hours=-5))  # Perú no usa horario de verano
UA = {"User-Agent": "Mozilla/5.0 (compatible; IA-Radar/1.0; +https://github.com/Willy4903/taller-estadistica-garrita)"}


def fetch_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def fetch_text(url):
    """Descarga el cuerpo como bytes. Pide gzip explícitamente y lo descomprime, porque algunos servidores lo envían comprimido."""
    req = urllib.request.Request(url, headers={**UA, "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5", "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        if r.headers.get("Content-Encoding", "").lower() == "gzip" or raw[:2] == b"\x1f\x8b":
            raw = gzip.decompress(raw)
        return raw


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


def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default



def write_json(path, obj, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    kw = {"indent": 1} if pretty else {"separators": (",", ":")}
    path.write_text(json.dumps(obj, ensure_ascii=False, **kw), encoding="utf-8")


# ---------- esquema de datos con procedencia ----------
# Cada dato publicado conserva de dónde viene, qué mide y con qué confianza.
FACT_FIELDS = ("value", "unit", "metric_type", "source_name", "source_url", "published_at", "retrieved_at", "provider", "confidence", "methodology_note")
METRIC_TYPES = {"users", "traffic", "search", "tokens", "api_usage", "benchmark", "price", "context", "release", "regulation"}
CONFIDENCE = {"alta", "media", "baja"}


def fact(value, unit, metric_type, source_name, source_url, provider="", published_at="", confidence="media", methodology_note="", retrieved_at=None, **extra):
    """Crea un dato con todos los campos de procedencia. Nunca se inventan valores: sin valor, no se crea el dato."""
    f = {"value": value, "unit": unit, "metric_type": metric_type, "source_name": source_name, "source_url": source_url,
         "published_at": published_at, "retrieved_at": retrieved_at or datetime.now(LIMA).isoformat(timespec="minutes"),
         "provider": provider, "confidence": confidence, "methodology_note": methodology_note}
    f.update(extra)
    return f


def validate_fact(f):
    """Devuelve la lista de problemas de un dato (vacía si es válido)."""
    bad = [k for k in FACT_FIELDS if k not in f]
    if f.get("value") in (None, ""):
        bad.append("value vacío")
    if f.get("metric_type") not in METRIC_TYPES:
        bad.append("metric_type desconocido")
    if f.get("confidence") not in CONFIDENCE:
        bad.append("confidence inválida")
    if not str(f.get("source_url", "")).startswith("https://"):
        bad.append("source_url no es https")
    return bad


def keep_valid(facts, label=""):
    ok = []
    for f in facts:
        p = validate_fact(f)
        if p:
            print(f"Dato descartado ({label}): {p}", file=sys.stderr)
        else:
            ok.append(f)
    return ok

