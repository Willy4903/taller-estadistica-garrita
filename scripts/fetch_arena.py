"""LMArena: ranking de preferencia humana desde su dataset público en Hugging Face."""
from common import fetch_json


LMARENA_URL = ("https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset"
               "&config=text&split=latest&offset=0&length=100")


def collect_arena():
    """Intenta leer el ranking de LMArena desde su dataset público; devuelve filas o lanza error."""
    rows = fetch_json(LMARENA_URL).get("rows", [])
    data = [r["row"] for r in rows if r.get("row", {}).get("category") == "overall"] or [r["row"] for r in rows]
    data = [r for r in data if r.get("model_name") and r.get("rating")]
    data.sort(key=lambda r: -r["rating"])
    return [{"name": r["model_name"], "org": r.get("organization", ""), "rating": round(r["rating"]),
             "votes": r.get("vote_count")} for r in data[:12]]



