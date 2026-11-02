#!/usr/bin/env python3
"""Descarga cuatro fotografías auténticas con licencia abierta para IA Radar.

Las imágenes quedan almacenadas localmente en site/visual/photos y se añaden a
main durante el despliegue inicial. En siguientes ejecuciones se reutilizan.
No se utilizan imágenes generadas ni ilustraciones como fotografías.
"""
from __future__ import annotations

import argparse
import hashlib
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ASSETS = {
    "ia-hero.jpg": ("Datacenter Server Racks (22370909788).jpg", 1280),
    "ia-news.jpg": ("Woman reading and working on laptop at home.jpg", 800),
    "ia-models.jpg": ("Technician with laptop working on server rack at NERSC.jpg", 800),
    "ia-learn.jpg": ("Students using a computer laptop.jpg", 800),
}
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DEST = ROOT / "site/visual/photos"


def jpeg_ok(path: Path) -> bool:
    if not path.is_file() or not 15_000 < path.stat().st_size < 6_000_000:
        return False
    with path.open("rb") as stream:
        if stream.read(3) != b"\xff\xd8\xff":
            return False
        stream.seek(-2, 2)
        return stream.read(2) == b"\xff\xd9"


def candidate_urls(filename: str, width: int) -> list[str]:
    canonical = filename.replace(" ", "_")
    digest = hashlib.md5(canonical.encode("utf-8")).hexdigest()
    name = quote(canonical, safe="()")
    path = f"wikipedia/commons/thumb/{digest[0]}/{digest[:2]}/{name}/{width}px-{name}"
    return [
        f"https://upload.wikimedia.org/{path}",
        f"https://thumb.wikimedia.org/{path}",
        f"https://commons.wikimedia.org/wiki/Special:Redirect/file/{name}?width={width}",
    ]


def get_photo(path: Path, filename: str, width: int) -> None:
    errors = []
    for url in candidate_urls(filename, width):
        for attempt in range(2):
            try:
                request = Request(url, headers={
                    "User-Agent": "IARadar/1.0 (Open-licensed photo validation; https://github.com/Willy4903/taller-estadistica-garrita)",
                    "Accept": "image/jpeg,image/*;q=0.9",
                })
                with urlopen(request, timeout=35) as response:
                    if response.status != 200:
                        raise ValueError(f"HTTP {response.status}")
                    data = response.read(6_000_001)
                if not 15_000 < len(data) < 6_000_000:
                    raise ValueError(f"Tamaño no aceptado: {len(data)}")
                if data[:3] != b"\xff\xd8\xff" or data[-2:] != b"\xff\xd9":
                    raise ValueError("La respuesta no es un archivo JPEG completo")
                temp = path.with_suffix(".part")
                temp.write_bytes(data)
                temp.replace(path)
                print(f"OK: {path.name}, {len(data):,} bytes")
                return
            except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
                errors.append(f"{type(exc).__name__}: {exc}")
                time.sleep(attempt + 1)
    raise RuntimeError(f"No se pudo verificar {filename}: {'; '.join(errors[-3:])}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dest", type=Path, default=DEFAULT_DEST)
    args = parser.parse_args()
    args.dest.mkdir(parents=True, exist_ok=True)
    for target, (filename, width) in ASSETS.items():
        path = args.dest / target
        if jpeg_ok(path):
            print(f"OK: {target}, reutilizado (JPEG válido)")
        else:
            get_photo(path, filename, width)
            if not jpeg_ok(path):
                raise RuntimeError(f"Imagen dañada: {target}")
    print("Verificación de cuatro fotografías reales completada.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
