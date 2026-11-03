#!/usr/bin/env python3
"""Chequeo estático de la vista histórica y sus fuentes."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "site/liga1"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.refs = []
        self.css = []
        self.js = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.append(a["id"])
        if tag == "link" and a.get("rel") == "stylesheet":
            self.css.append(a.get("href", "").split("?")[0])
        if tag == "script" and a.get("src"):
            self.js.append(a["src"].split("?")[0])


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    code = (ROOT / "app.js").read_text(encoding="utf-8")
    content = (ROOT / "content.js").read_text(encoding="utf-8")
    p = Page()
    p.feed(html)
    assert len(p.ids) == len(set(p.ids)), "IDs repetidos"
    assert all(x in p.ids for x in ("v-hist", "histBox", "t-hist")), "No existe la vista #hist"
    assert "hist-simple.css" in p.css, "Falta CSS de lectura"
    assert "app.js" in p.js and "content.js" in p.js, "Faltan scripts de historia"
    for s in (
        'function renderHist()', "hist-simple", "hist-fact",
        "hist-milestone", "hist-curiosidades", "data-hist-view",
        "hist-timeline", "CT.timeline", "CT.facts",
    ):
        assert s in code, f"Se perdió un elemento histórico: {s}"
    assert not re.search(r"function renderHist\(\)[\s\S]*?function bindHover", code) is None, "Render histórico no encontrado"
    block = code.split("function renderHist()", 1)[1].split("/* Efecto de tarjetas:", 1)[0]
    assert "flipCard(" not in block, "Las fuentes deben ser legibles sin girar tarjetas"
    assert "srcLink(f)" in block and "srcLink(t)" in block and "srcLink(c)" in block
    assert "universitario.pe" in content, "Falta la procedencia oficial"
    assert (ROOT / "hist-simple.css").stat().st_size > 1000
    styles = (ROOT / "hist-simple.css").read_text(encoding="utf-8")
    assert "hist-showcase" in styles and "img/monumental-hist.jpg" in styles
    assert "hist-stadium" in code and "img/lolo-estatua.jpg" in code
    assert "hist-photo-credit" in code and "MicroX" in code and "Sigloestadio21" in code
    assert "hist-linea" in code and "srcLink(t)" in code
    for name in ("monumental-hist.jpg", "lolo-estatua.jpg"):
        img = ROOT / "img" / name
        assert img.exists() and 30_000 < img.stat().st_size < 6_000_000, f"Falta fotografía: {name}"
        with img.open("rb") as stream:
            assert stream.read(3) == b"\xff\xd8\xff", f"No es JPEG: {name}"
            stream.seek(-2, 2)
            assert stream.read(2) == b"\xff\xd9", f"JPEG incompleto: {name}"
    # Diseño aprobado: bandera local, datos históricos y cinco accesos funcionales.
    assert (ROOT / "img/bandera-u-historia.svg").exists(), "Falta bandera local"
    banner = (ROOT / "img/bandera-u-historia.svg").read_text(encoding="utf-8")
    assert 'viewBox="0 0 1000 710"' in banner and '<svg' in banner, "Bandera SVG inválida"
    assert "hist-reference-panel" in code and "hist-overview" in code
    assert "hist-reference-nav" in code and "hist-showcase" in styles
    assert "bandera-u-historia.svg" in styles
    for item in ("Resumen", "Línea de tiempo", "Títulos", "Estadísticas", "Curiosidades"):
        assert item in code, f"Falta navegación: {item}"
    assert "hist-estadisticas" in code
    assert 'data-hist-view="C"' in code, "Se perdió el acceso al Clausura"
    assert 'class="hist-reference-tab' in code
    assert 'var titleCount = titles ? esc(titles.big)' in code, "Los títulos deben salir de los datos"
    assert 'stat(\'Títulos nacionales\',titleCount' in code, "Se perdió la métrica documentada"
    assert "hist-photo-credit" in code, "No se preservaron atribuciones"
    new_photo = ROOT / "img/historia-hero-fondo.jpg"
    assert new_photo.exists() and new_photo.stat().st_size > 50_000, "No se reconstruyó el fondo aprobado"
    with new_photo.open("rb") as fh:
        assert fh.read(3) == b"\xff\xd8\xff", "Imagen de fondo no es JPEG"
    assert 'url("img/historia-hero-fondo.jpg")' in styles, "CSS no utiliza fondo aprobado"
    assert 'body[data-view="hist"] > .hero' in styles, "Portada genérica no se oculta en Historia"
    assert 'body[data-view="hist"] > .tabs-bar' in styles, "Pestañas genéricas no se ocultan en Historia"
    assert 'hist-site-nav' in html and 'data-u-view="C"' in html, "Falta navegación hacia Clausura"
    assert 'document.querySelectorAll(".hist-site-nav [data-u-view]")' in code, "Navegación superior no vinculada"
    print("OK historia: navegación, lectura directa y referencias visibles")


if __name__ == "__main__":
    main()
