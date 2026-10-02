"""Lectura de feeds RSS/Atom de laboratorios y prensa, clasificación temática y traducción."""
import html
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

from common import clean, fetch_text, parse_date
from translate import fix_es, translate_items

NEWS_KEEP_DAYS = 30
NEWS_MAX_ITEMS = 150


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
    ("press", "The Rundown AI", "https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml", "press", False),
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



def fetch_feeds(sources):
    """Descarga los feeds cuyo nombre figura en `sources`. Devuelve (items, estado por fuente)."""
    found, status = [], {}
    for key, source, url, kind, only_ai in FEEDS:
        if source not in sources:
            continue
        try:
            items = parse_feed(fetch_text(url), key, source, kind, only_ai)
            status[source] = {"ok": True, "count": len(items)}
            found.extend(items)
        except Exception as e:  # un feed caído no debe tumbar la actualización
            print(f"Feed {source} falló: {e}", file=sys.stderr)
            status[source] = {"ok": False, "count": 0, "error": str(e)[:160]}
    return found, status


def merge_news(found, status, previous_items, now_utc):
    """Combina con lo ya publicado (conserva traducciones), filtra por antigüedad y traduce lo nuevo."""
    prev = {i["link"]: i for i in previous_items}
    merged = dict(prev)
    for i in found:
        old = prev.get(i["link"])
        if old and old.get("title") == i["title"]:
            i["title_es"], i["summary_es"] = old.get("title_es", ""), old.get("summary_es", "")
        merged[i["link"]] = i
    for i in merged.values():
        i.setdefault("topic", classify(i["title"] + " " + i.get("summary", "")))
    limit = (now_utc - timedelta(days=NEWS_KEEP_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    kept = sorted((i for i in merged.values() if i["published"] >= limit), key=lambda i: i["published"], reverse=True)[:NEWS_MAX_ITEMS]
    status["_traducidas"] = {"ok": True, "count": translate_items(kept)}
    for i in kept:
        for k in ("title_es", "summary_es"):
            if i.get(k):
                i[k] = fix_es(i[k])
    return kept, status

