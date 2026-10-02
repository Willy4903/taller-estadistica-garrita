"""Artificial Analysis: índice de inteligencia, precio y velocidad.
Con AA_API_KEY usa su API oficial; sin clave conserva la última instantánea curada de content/frontier.json (con su fecha)."""
import os

from common import fact, fetch_json, read_json, CONTENT
import urllib.request
import json

API = "https://artificialanalysis.ai/api/v2/data/llms/models"
PAGE = "https://artificialanalysis.ai/"


def fetch():
    key = os.environ.get("AA_API_KEY", "").strip()
    if not key:
        raise RuntimeError("sin AA_API_KEY: se conserva la instantánea curada")
    req = urllib.request.Request(API, headers={"x-api-key": key, "User-Agent": "IA-Radar/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        rows = json.load(r).get("data", [])
    out = []
    for m in rows:
        idx = (m.get("evaluations") or {}).get("artificial_analysis_intelligence_index")
        if idx is None:
            continue
        out.append(fact(round(float(idx), 1), "puntos (índice)", "benchmark", "Artificial Analysis", PAGE,
                        provider=(m.get("model_creator") or {}).get("slug", ""), confidence="alta",
                        methodology_note="Índice de inteligencia compuesto de Artificial Analysis; solo comparable con otros valores del mismo índice y versión.",
                        model=m.get("name", ""),
                        price_blended=(m.get("pricing") or {}).get("price_1m_blended_3_to_1"),
                        speed_tps=m.get("median_output_tokens_per_second")))
    out.sort(key=lambda f: -f["value"])
    return out[:25]
