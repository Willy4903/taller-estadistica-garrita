#!/usr/bin/env python3
"""Conserva dos fotografías documentales de Universitario en GitHub Pages.

Las fotos son de Wikimedia Commons y están acreditadas en la vista Historia:
- MicroX, Estadio Monumental (2012), CC BY-SA 3.0.
- Sigloestadio21, estatua de Lolo Fernández (2021), CC BY-SA 4.0.

El descargador solo actúa cuando falta un JPEG válido; no modifica datos deportivos.
"""
from __future__ import annotations

import hashlib
import sys
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "site/liga1/img"

FILES = {
    "monumental-hist.jpg": "Estadio Monumental Club Universitario de Deportes (cropped).JPG",
    "lolo-estatua.jpg": "Estadio Monumental, estatua de Lolo Fernandez.jpg",
}


def source_urls(file_name: str):
    normalized = file_name.replace(" ", "_")
    digest = hashlib.md5(normalized.encode("utf-8")).hexdigest()
    encoded = quote(normalized, safe="(),")
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{encoded}",
        f"https://commons.wikimedia.org/wiki/Special:Redirect/file/{encoded}",
    )


def valid_jpeg(path: Path) -> bool:
    if not path.is_file() or not 30_000 < path.stat().st_size < 6_000_000:
        return False
    with path.open("rb") as f:
        if f.read(3) != b"\xff\xd8\xff":
            return False
        f.seek(-2, 2)
        return f.read(2) == b"\xff\xd9"


def fetch(name: str, source: str) -> None:
    target = DEST / name
    if valid_jpeg(target):
        print(f"OK {name}: fotografía JPEG local reutilizada")
        return
    failures = []
    for url in source_urls(source):
        for attempt in range(2):
            try:
                request = Request(url, headers={
                    "User-Agent": "GarraCremaHistoria/1.0 (Wikimedia Commons, attribution in the page; https://github.com/Willy4903/taller-estadistica-garrita)",
                    "Accept": "image/jpeg,image/*;q=0.8",
                })
                with urlopen(request, timeout=35) as response:
                    if response.status != 200:
                        raise ValueError(f"HTTP {response.status}")
                    content = response.read(6_000_001)
                if len(content) >= 6_000_000 or len(content) < 30_000:
                    raise ValueError(f"Tamaño inesperado: {len(content)}")
                temp = target.with_suffix(".part")
                temp.write_bytes(content)
                if not valid_jpeg(temp):
                    temp.unlink(missing_ok=True)
                    raise ValueError("Archivo recibido no es JPEG íntegro")
                temp.replace(target)
                print(f"OK {name}: {len(content):,} bytes, imagen real verificada")
                return
            except Exception as exc:
                failures.append(str(exc))
                time.sleep(attempt + 1)
    raise RuntimeError(f"No se pudo verificar {source}: {' | '.join(failures[-3:])}")


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    for name, source in FILES.items():
        fetch(name, source)
    assert all(valid_jpeg(DEST / name) for name in FILES)
    print("Fotografías de Historia de la U listas para el despliegue.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR FOTOGRAFÍAS: {exc}", file=sys.stderr)
        sys.exit(1)
