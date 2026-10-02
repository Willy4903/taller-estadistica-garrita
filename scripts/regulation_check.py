"""Comprobación de fuentes normativas oficiales.
El estado legal (vigente, proyecto, etc.) se mantiene en site/content/regulation.json y lo revisa una persona.
Este módulo solo confirma que la fuente oficial responde, registra cuándo se consultó y detecta si su contenido cambió."""
import hashlib
import re
import urllib.request

from common import UA, CONTENT, DATA, LIMA, read_json
from datetime import datetime


def check_url(url, prev=None):
    prev = prev or {}
    now = datetime.now(LIMA).isoformat(timespec="minutes")
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read(400000)
            title = re.search(rb"<title[^>]*>(.*?)</title>", body, re.I | re.S)
            digest = hashlib.sha256(body).hexdigest()[:16]
            return {"ok": True, "http": r.status, "retrieved_at": now, "title": (title.group(1).decode("utf-8", "ignore").strip()[:140] if title else ""),
                    "content_hash": digest, "changed": bool(prev.get("content_hash") and prev["content_hash"] != digest)}
    except Exception as e:  # sin acceso: se conserva la última comprobación válida
        out = dict(prev) if prev.get("ok") else {}
        out.update({"ok": False, "error": str(e)[:140], "last_attempt": now})
        return out


def run(jurisdiction, scope_label):
    """Devuelve {id: comprobación} para la jurisdicción indicada (PE o EU)."""
    reg = read_json(CONTENT / "regulation.json", {})
    prev = read_json(DATA / "regulation_checks.json", {}).get("checks", {})
    out = {}
    for it in reg.get("jurisdictions", {}).get(jurisdiction, {}).get("items", []):
        out[it["id"]] = check_url(it["source_url"], prev.get(it["id"]))
    ok = sum(1 for v in out.values() if v.get("ok"))
    print(f"Normativa {scope_label}: {ok}/{len(out)} fuentes oficiales respondieron")
    return out
