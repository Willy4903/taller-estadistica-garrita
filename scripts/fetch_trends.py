"""Google Trends: interés relativo de búsqueda por país y departamento del Perú. No mide usuarios."""
import time

from common import LIMA


# ---------- Interés de búsqueda por país y por departamento (Google Trends) ----------
# Indicador de presencia, no de suscriptores: ninguna empresa publica usuarios por país.
TREND_TERMS = [("ChatGPT", "ChatGPT"), ("Gemini", "Gemini AI"), ("Claude", "Claude AI"), ("Copilot", "Microsoft Copilot"), ("DeepSeek", "DeepSeek")]


LATAM_CODES = {"PE": "Perú", "MX": "México", "CO": "Colombia", "CL": "Chile", "AR": "Argentina", "BR": "Brasil", "EC": "Ecuador", "UY": "Uruguay",
               "BO": "Bolivia", "PY": "Paraguay", "VE": "Venezuela", "CR": "Costa Rica", "PA": "Panamá", "DO": "Rep. Dominicana", "GT": "Guatemala"}


def _shares(row, keys):
    vals = {k: float(row.get(k, 0) or 0) for k in keys}
    tot = sum(vals.values())
    return {k: (round(v / tot * 100, 1) if tot else 0.0) for k, v in vals.items()}


def collect_regional(terms=None):
    """Cuota de interés de búsqueda entre cinco asistentes de IA: LatAm, departamentos del Perú y serie diaria en Perú."""
    try:
        from pytrends.request import TrendReq
    except Exception as e:
        return {"ok": False, "error": f"pytrends no disponible: {e}"[:200]}
    import time
    terms = terms or TREND_TERMS
    kw = [t[1] for t in terms]
    names = [t[0] for t in terms]
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
                regions.append({"name": str(name).replace(" Region", "").replace("Provincia de ", ""), "total": round(tot, 1), "raw": {n: float(row[k] or 0) for n, k in zip(names, kw)}, "share": _shares({n: row[k] for n, k in zip(names, kw)}, names)})
        regions.sort(key=lambda r: r["total"], reverse=True)
        time.sleep(3)
        series = attempt(lambda: py.interest_over_time())
        timeline = [{"date": idx.strftime("%Y-%m-%d"), **{n: int(row[k]) for n, k in zip(names, kw)}} for idx, row in series.iterrows()]
        return {"ok": True, "terms": dict(zip(names, kw)), "window": "últimos 3 meses", "countries": countries, "peru_regions": regions[:24], "peru_timeline": timeline}
    except Exception as e:  # Google puede limitar las consultas desde servidores en la nube
        return {"ok": False, "error": str(e)[:200]}





# Conjunto B: ChatGPT sirve de ancla y Google solo permite cinco términos por consulta.
TREND_TERMS_B = [("ChatGPT", "ChatGPT"), ("Grok", "Grok AI"), ("Perplexity", "Perplexity AI"), ("Meta AI", "Meta AI"), ("Kimi", "Kimi AI")]


def collect_all():
    """Devuelve {"ok", "sets": {"A": ..., "B": ...}}. Cada conjunto es una composición independiente: no se mezclan entre sí."""
    out, err = {}, []
    for key, terms in (("A", TREND_TERMS), ("B", TREND_TERMS_B)):
        r = collect_regional(terms)
        if r.get("ok"):
            out[key] = r
        else:
            err.append(f"{key}: {r.get('error')}")
        time.sleep(8)
    return {"ok": bool(out), "sets": out, "error": "; ".join(err)} if out else {"ok": False, "error": "; ".join(err)}
