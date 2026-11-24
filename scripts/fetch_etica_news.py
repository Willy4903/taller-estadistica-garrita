"""Noticias sobre IA, ética y regulación para site/etica-ia (cuatro veces al día).

Lee feeds RSS de medios peruanos y de organismos públicos e internacionales, se queda
solo con lo que trata de inteligencia artificial, datos personales o deepfakes, y escribe
site/etica-ia/data/news.json. Si una fuente falla, se registra el error y se conservan
las noticias que ya estaban publicadas. Solo usa la biblioteca estándar.
"""
import html
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "etica-ia" / "data" / "news.json"
KEEP_DAYS = 21
MAX_ITEMS = 60
LIMA = timezone(timedelta(hours=-5))
SCHEDULE = ["06:00", "12:00", "16:00", "20:00"]


def gnews(query):
    q = urllib.parse.quote(query)
    return f"https://news.google.com/rss/search?q={q}&hl=es-419&gl=PE&ceid=PE:es-419"


# (id, nombre visible, url del feed, región por defecto, tipo, sitio web)
SOURCES = [
    ("gestion", "Gestión", "https://gestion.pe/arc/outboundfeeds/rss/?outputType=xml", "Perú", "Diario de economía y negocios", "https://gestion.pe"),
    ("gestion-tec", "Gestión · Tecnología", "https://gestion.pe/arc/outboundfeeds/rss/category/tecnologia/?outputType=xml", "Perú", "Diario de economía y negocios", "https://gestion.pe/tecnologia/"),
    ("gestion-gn", "Gestión (búsqueda IA)", gnews('"inteligencia artificial" site:gestion.pe'), "Perú", "Diario de economía y negocios", "https://gestion.pe"),
    ("elcomercio", "El Comercio · Tecnología", "https://elcomercio.pe/arc/outboundfeeds/rss/category/tecnologia/?outputType=xml", "Perú", "Diario nacional", "https://elcomercio.pe/tecnologia/"),
    ("andina", "Andina (búsqueda IA)", gnews('"inteligencia artificial" site:andina.pe'), "Perú", "Agencia oficial de noticias", "https://andina.pe"),
    ("elperuano", "El Peruano (búsqueda IA)", gnews('"inteligencia artificial" site:elperuano.pe'), "Perú", "Diario oficial", "https://elperuano.pe"),
    ("gobpe", "Gob.pe: PCM y SGTD (búsqueda IA)", gnews('"inteligencia artificial" site:gob.pe'), "Perú", "Portal del Estado peruano", "https://www.gob.pe"),
    ("infobae", "Infobae Perú (búsqueda IA)", gnews('"inteligencia artificial" Perú site:infobae.com'), "Perú", "Medio digital", "https://www.infobae.com/peru/"),
    ("cepal", "CEPAL (búsqueda IA)", gnews('"inteligencia artificial" site:cepal.org'), "Latam", "Organismo de Naciones Unidas", "https://www.cepal.org"),
    ("unesco", "UNESCO (búsqueda IA)", gnews('"inteligencia artificial" ética site:unesco.org'), "Mundo", "Organismo de Naciones Unidas", "https://www.unesco.org"),
    ("regulacion-pe", "Prensa peruana: regulación de IA", gnews('"inteligencia artificial" Perú (ley OR reglamento OR regulación OR "Ley 31814")'), "Perú", "Búsqueda temática en medios", "https://news.google.com"),
]

AI = re.compile(
    r"inteligencia artificial|\bIA\b|\bI\.A\.|algoritm|chatgpt|openai|anthropic|deepfake|"
    r"aprendizaje autom|machine learning|\bLLM|modelos? de lenguaje|ley 31814|datos personales|automatizaci",
    re.I,
)
REGION_HINTS = [
    ("Europa", re.compile(r"\bUE\b|Unión Europea|europe|AI Act|Bruselas", re.I)),
    ("Latam", re.compile(r"Chile|Brasil|Colombia|México|Argentina|Uruguay|Ecuador|América Latina|Latinoamérica|CEPAL", re.I)),
]


def clean(text, limit=None):
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    if limit and len(text) > limit:
        text = text[: limit - 1].rsplit(" ", 1)[0] + "…"
    return text


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; etica-ia-news/1.0)"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()


def parse_date(raw):
    if not raw:
        return None
    try:
        dt = parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(raw.strip().replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse(raw, src):
    sid, name, _, region, _, _ = src
    root = ET.fromstring(raw)
    strip = lambda tag: tag.rsplit("}", 1)[-1]
    out = []
    for node in root.iter():
        if strip(node.tag) not in ("item", "entry"):
            continue
        f = {}
        for child in node:
            key = strip(child.tag)
            if key == "link":
                f.setdefault("link", child.get("href") or (child.text or "").strip())
            elif key == "source":
                f["source"] = (child.text or "").strip()
            elif key not in f:
                f[key] = "".join(child.itertext())
        title = clean(f.get("title"), 220)
        link = (f.get("link") or "").strip()
        dt = parse_date(f.get("pubDate") or f.get("published") or f.get("updated"))
        summary = clean(f.get("description") or f.get("summary"), 320)
        outlet = f.get("source") or name.split(" (")[0].split(" · ")[0]
        # Google News añade " - Medio" al final del título.
        if "news.google.com" in src[2] and " - " in title:
            title, _, tail = title.rpartition(" - ")
            outlet = f.get("source") or tail
        if not title or not link or not dt:
            continue
        if not AI.search(f"{title} {summary}"):
            continue
        if summary.lower().startswith(title.lower()[:40]):
            summary = ""
        reg = region
        for label, rx in REGION_HINTS:
            if rx.search(title):
                reg = label
                break
        out.append({"t": title, "u": link, "d": dt.isoformat(), "f": outlet, "r": reg, "s": summary, "src": sid})
    return out


def norm(title):
    return re.sub(r"[^a-z0-9áéíóúñ ]", "", title.lower())[:80]


def main():
    now = datetime.now(timezone.utc)
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
        except ValueError:
            old = {}
    items, status = [], []
    for src in SOURCES:
        sid, name, url, region, kind, site = src
        entry = {"id": sid, "name": name, "kind": kind, "site": site, "feed": url, "region": region}
        try:
            got = parse(fetch(url), src)
            items.extend(got)
            entry.update(ok=True, count=len(got))
        except Exception as exc:  # una fuente caída no detiene a las demás
            entry.update(ok=False, count=0, error=f"{type(exc).__name__}: {str(exc)[:120]}")
            items.extend(i for i in old.get("items", []) if i.get("src") == sid)
        status.append(entry)
        print(f"{name}: {'ok' if entry['ok'] else 'ERROR'} ({entry['count']})", file=sys.stderr)

    cutoff = now - timedelta(days=KEEP_DAYS)
    seen, final = set(), []
    for it in sorted(items, key=lambda x: x["d"], reverse=True):
        if parse_date(it["d"]) < cutoff:
            continue
        key = norm(it["t"])
        if key in seen:
            continue
        seen.add(key)
        final.append(it)
    final = final[:MAX_ITEMS]

    if not any(s["ok"] for s in status) and old.get("items"):
        print("Todas las fuentes fallaron: se conservan los datos anteriores.", file=sys.stderr)
        old["checked"] = now.isoformat()
        old["sources"] = status
        OUT.write_text(json.dumps(old, ensure_ascii=False, indent=1), encoding="utf-8")
        return 0

    data = {
        "updated": now.isoformat(),
        "updated_lima": now.astimezone(LIMA).strftime("%d/%m/%Y %H:%M"),
        "schedule_lima": SCHEDULE,
        "keep_days": KEEP_DAYS,
        "sources": status,
        "items": final,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(final)} noticias guardadas en {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
