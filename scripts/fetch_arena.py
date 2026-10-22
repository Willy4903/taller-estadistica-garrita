"""LMArena: ranking de preferencia humana desde su dataset público en Hugging Face."""
from common import fetch_json


LMARENA_URL = ("https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset"
               "&config={config}&split=latest&offset=0&length=100")
# Arenas de medios: cada una es una escala Elo distinta; solo se comparan modelos dentro de la misma arena.
MEDIA_ARENAS = {"imagenes": "text_to_image", "video": "text_to_video"}


def collect_arena(config="text"):
    """Intenta leer el ranking de LMArena desde su dataset público; devuelve filas o lanza error."""
    rows = fetch_json(LMARENA_URL.format(config=config)).get("rows", [])
    data = [r["row"] for r in rows if r.get("row", {}).get("category") == "overall"] or [r["row"] for r in rows]
    data = [r for r in data if r.get("model_name") and r.get("rating")]
    data.sort(key=lambda r: -r["rating"])
    return [{"name": r["model_name"], "org": r.get("organization", ""), "rating": round(r["rating"]),
             "votes": r.get("vote_count")} for r in data[:12]]





def collect_media_arenas():
    """Top 8 de las arenas de imagen y video. Una arena que falle no bloquea a la otra; devuelve {clave: filas}."""
    out = {}
    for key, config in MEDIA_ARENAS.items():
        try:
            rows = collect_arena(config)[:8]
        except Exception as e:  # noqa: BLE001 - el dataset puede no tener la configuración
            print(f"  lmarena {config}: {e}")
            continue
        if rows:
            out[key] = rows
    if not out:
        raise RuntimeError("ninguna arena de medios respondió")
    return out
