#!/usr/bin/env python3
"""Orquestador de IA Radar.

Proceso: RECUPERAR -> NORMALIZAR -> VALIDAR -> COMPARAR -> DETECTAR CAMBIOS -> PUBLICAR.
Cada fuente vive en su propio script (scripts/fetch_*.py). Si una falla se conserva el último dato válido
y el estado queda registrado en data/current/status.json. Cada día se guarda además una copia en history/YYYY-MM-DD/.

Uso:
  python scripts/update_data.py            # datos reales
  python scripts/update_data.py --sample   # datos sintéticos para probar el sitio
"""
import statistics
import sys
from datetime import datetime, timezone

import fetch_anthropic
import fetch_arena
import fetch_artificial_analysis
import fetch_eu_regulation
import fetch_google
import fetch_huggingface
import fetch_openai
import fetch_openrouter
import fetch_peru_regulation
import fetch_press
import fetch_research
import fetch_standards
import fetch_trends
import fetch_xai
from common import DATA, HISTORY, LIMA, STATE, fact, keep_valid, read_json, write_json
from feeds import merge_news
from translate import translate_descriptions

HISTORY_DAYS = 730
CHANGES_KEEP_DAYS = 60


def step(status, name, fn, fallback=None, good=None):
    """Ejecuta una fuente. Si falla devuelve `fallback` y deja el error registrado.
    `good(resultado)` decide si el resultado cuenta como exitoso (por ejemplo, si al menos una subfuente respondió)."""
    now = datetime.now(LIMA).isoformat(timespec="minutes")
    try:
        out = fn()
        n = len(out[0]) if isinstance(out, tuple) else (len(out) if hasattr(out, "__len__") else 1)
        if good and not good(out):
            raise RuntimeError("ninguna subfuente respondió")
        status[name] = {"ok": True, "count": n, "retrieved_at": now}
        print(f"  OK  {name}: {n}")
        return out
    except Exception as e:
        status[name] = {"ok": False, "count": 0, "error": str(e)[:200], "last_attempt": now}
        print(f"  ERR {name}: {e}", file=sys.stderr)
        return fallback


def detect_changes(prev_models, models, today, first_run):
    """Compara el catálogo de hoy con el de ayer: modelos nuevos y cambios de precio o contexto."""
    if first_run:
        return []
    before = {m["id"]: m for m in prev_models}
    out = []
    for m in models:
        o = before.get(m["id"])
        base = {"date": today, "model": m["name"], "id": m["id"], "provider": m["provider"], "source_name": "OpenRouter", "source_url": "https://openrouter.ai/" + m["id"]}
        if not o:
            out.append({**base, "kind": "nuevo", "after": {"price_in": m["price_in"], "price_out": m["price_out"], "context": m["context"]}})
            continue
        for key, kind in (("price_in", "precio_entrada"), ("price_out", "precio_salida"), ("context", "contexto")):
            if o.get(key) != m.get(key) and (o.get(key) or m.get(key)):
                out.append({**base, "kind": kind, "before": o.get(key), "after": m.get(key)})
    return out


def build_facts(models, usage, arena, users, frontier):
    """Capa de auditoría: cada cifra publicada con su fuente, fecha, qué mide y confianza."""
    facts = []
    for u in (users or {}).get("items", []):
        facts.append(fact(u["value"], "millones de usuarios", "users", u.get("source", "Empresa"), u.get("url") or "https://openai.com/", provider=u.get("prov", ""),
                          published_at=u["asof"], confidence="media", methodology_note=f"Cifra reportada por la propia empresa ({u['what']}). No es auditada ni comparable de forma estricta.", name=u["name"]))
    for r in frontier.get("rankings", []):
        for i in r["items"]:
            facts.append(fact(i["v"], "puntos (índice)", "benchmark", r["title"], r["url"], provider=i["prov"], published_at=r["date"], confidence="media",
                              methodology_note="Instantánea curada. Solo comparable dentro de la misma tabla.", model=i["name"]))
    for a in arena:
        facts.append(fact(a["rating"], "puntos Elo", "benchmark", "LMArena", "https://lmarena.ai/leaderboard", provider=a.get("org", ""), confidence="media",
                          methodology_note="Preferencia humana en comparaciones a ciegas; mide gusto de los votantes de LMArena, no precisión.", model=a["name"], votes=a.get("votes")))
    facts.extend(usage or [])
    return keep_valid(facts, "facts")


def main():
    sample = "--sample" in sys.argv
    for d in (DATA, STATE, HISTORY):
        d.mkdir(parents=True, exist_ok=True)
    now = datetime.now(LIMA)
    today = now.strftime("%Y-%m-%d")
    status = {}

    previous = read_json(DATA / "models.json", {})
    prev_sample = previous.get("meta", {}).get("sample", False)
    prev_models = [] if prev_sample else previous.get("models", [])
    seen = read_json(STATE / "seen.json", {})
    first_run = not seen or prev_sample

    print("RECUPERAR")
    if sample:
        models, hf = fetch_openrouter.sample_models(now)
        status["openrouter"] = {"ok": True, "count": len(models)}
        status["huggingface"] = {"ok": True, "count": len(hf)}
    else:
        models = step(status, "openrouter", fetch_openrouter.fetch_models, prev_models)
        hf = step(status, "huggingface", fetch_huggingface.fetch_trending, previous.get("hf", [])) or []
    if not models:
        print("Sin datos de modelos; no se modifica nada.", file=sys.stderr)
        return 1

    print("NORMALIZAR")
    if first_run and not sample:
        seen = {}
    for m in models:
        if m["id"] not in seen:
            seen[m["id"]] = m["created"] if first_run else today
        m["first_seen"] = seen[m["id"]]
    new_today = sum(1 for m in models if m["first_seen"] == today) if not first_run else 0
    models.sort(key=lambda m: (m["created"], m["id"]), reverse=True)
    if not sample:
        n_desc = translate_descriptions(models, prev_models)
        print(f"  descripciones traducidas ahora: {n_desc}")

    print("COMPARAR Y DETECTAR CAMBIOS")
    changes_prev = read_json(DATA / "changes.json", {}).get("items", [])
    new_changes = detect_changes(prev_models, models, today, first_run)
    keep_from = (now.date().toordinal() - CHANGES_KEEP_DAYS)
    changes = [c for c in changes_prev if datetime.strptime(c["date"], "%Y-%m-%d").toordinal() >= keep_from and c["date"] != today] + new_changes
    print(f"  cambios detectados hoy: {len(new_changes)}")

    latest = {"meta": {"updated_at": now.isoformat(timespec="minutes"), "updated_date": today, "timezone": "America/Lima", "sample": sample,
                       "sources": {k: v for k, v in status.items() if k in ("openrouter", "huggingface")}, "new_today": new_today},
              "models": models, "hf": hf}
    write_json(DATA / "models.json", latest)
    write_json(STATE / "seen.json", dict(sorted(seen.items())))
    write_json(DATA / "changes.json", {"updated_at": latest["meta"]["updated_at"], "items": changes})

    if not sample:
        pin = [m["price_in"] for m in models if m["price_in"]]
        pout = [m["price_out"] for m in models if m["price_out"]]
        ctx = [m["context"] for m in models if m["context"]]
        entry = {"date": today, "total": len(models), "new": new_today,
                 "median_price_in": round(statistics.median(pin), 3) if pin else None,
                 "median_price_out": round(statistics.median(pout), 3) if pout else None,
                 "median_context": int(statistics.median(ctx)) if ctx else None}
        hist = [h for h in read_json(HISTORY / "catalog.json", []) if h["date"] != today] + [entry]
        write_json(HISTORY / "catalog.json", hist[-HISTORY_DAYS:])

        # ---- noticias: laboratorios (nivel 1) y prensa ----
        prev_news = read_json(DATA / "news.json", {})
        found, nstatus = [], {}
        for key, mod in (("openai", fetch_openai), ("anthropic", fetch_anthropic), ("google", fetch_google), ("xai", fetch_xai), ("press", fetch_press)):
            r = step(status, "feed_" + key, mod.fetch, ([], {}), good=lambda o: any(v["ok"] for v in o[1].values()))
            found += r[0]
            nstatus.update(r[1])
        items, nstatus = merge_news(found, nstatus, prev_news.get("items", []), datetime.now(timezone.utc))
        trad = nstatus.pop("_traducidas")["count"]
        print(f"  noticias: {len(items)} ítems, traducidas ahora: {trad}")
        if items or not prev_news.get("items"):
            write_json(DATA / "news.json", {"updated_at": now.isoformat(timespec="minutes"), "feeds": nstatus, "items": items})

        # ---- investigación y preferencia ----
        papers = step(status, "arxiv", fetch_research.collect_papers, None)
        old_r = read_json(DATA / "research.json", {})
        if papers:
            from translate import translate_items
            old = {p["link"]: p for p in old_r.get("papers", [])}
            for p in papers:
                o = old.get(p["link"], {})
                p["title_es"], p["summary_es"] = o.get("title_es", ""), o.get("summary_es", "")
            translate_items(papers, limit=25)
            write_json(DATA / "research.json", {"updated_at": now.isoformat(timespec="minutes"), "papers": papers})
        arena = step(status, "lmarena", fetch_arena.collect_arena, None)
        old_a = read_json(DATA / "arena.json", {})
        if arena:
            write_json(DATA / "arena.json", {"updated_at": now.isoformat(timespec="minutes"), "rows": arena})
        arena = arena or old_a.get("rows", [])

        # ---- uso en OpenRouter y Artificial Analysis ----
        usage = step(status, "openrouter_usage", fetch_openrouter.fetch_usage, None)
        old_u = read_json(DATA / "usage.json", {})
        if usage:
            write_json(DATA / "usage.json", {"updated_at": now.isoformat(timespec="minutes"), "items": usage})
        usage = usage or old_u.get("items", [])
        aa = step(status, "artificial_analysis", fetch_artificial_analysis.fetch, None)
        if aa:
            write_json(DATA / "aa.json", {"updated_at": now.isoformat(timespec="minutes"), "items": aa})

        # ---- Google Trends ----
        reg = step(status, "google_trends", fetch_trends.collect_all, None, good=lambda o: o.get("ok"))
        if reg:
            reg["updated_at"] = now.isoformat(timespec="minutes")
            write_json(DATA / "trends.json", reg)

        # ---- normativa ----
        checks = {}
        for key, mod in (("pe", fetch_peru_regulation), ("eu", fetch_eu_regulation), ("int", fetch_standards)):
            res = step(status, "normativa_" + key, mod.fetch, {}) or {}
            checks.update(res)
            status["normativa_" + key]["ok"] = any(v.get("ok") for v in res.values())
        write_json(DATA / "regulation_checks.json", {"retrieved_at": now.isoformat(timespec="minutes"), "checks": checks})

        # ---- capa de procedencia y estado ----
        facts = build_facts(models, usage, arena, read_json(DATA / "users.json", {}), read_json(DATA / "frontier.json", {}))
        write_json(DATA / "facts.json", {"updated_at": now.isoformat(timespec="minutes"), "count": len(facts), "items": facts})
        write_json(DATA / "status.json", {"updated_at": now.isoformat(timespec="minutes"), "sources": status, "feeds": nstatus})

        # ---- histórico diario (no se sobrescribe lo anterior) ----
        day = HISTORY / today
        write_json(day / "models.json", [{k: m[k] for k in ("id", "name", "provider", "price_in", "price_out", "context")} for m in models])
        write_json(day / "facts.json", facts)
        write_json(day / "status.json", status)
        write_json(day / "changes.json", new_changes)
        write_json(day / "news_index.json", [{"title": i["title"], "source": i["source"], "link": i["link"], "published": i["published"]} for i in items])
        write_json(HISTORY / "index.json", sorted({p.name for p in HISTORY.iterdir() if p.is_dir()}))

    print(f"OK {today}: {len(models)} modelos, {len(hf)} HF, nuevos hoy: {new_today}, sample={sample}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
