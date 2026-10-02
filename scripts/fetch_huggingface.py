"""Hugging Face: modelos abiertos en tendencia (ecosistema open source y open weights)."""
from common import fetch_json

HF_URL = (
    "https://huggingface.co/api/models?sort=trendingScore&direction=-1"
    "&limit=30&filter=text-generation"
)


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


def fetch_trending():
    return parse_hf(fetch_json(HF_URL))
