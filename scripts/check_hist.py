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
    # Diseño aprobado: la bandera es un recurso local y no un pantallazo con textos incrustados.
    flag = ROOT / "img/hist-bandera.svg"
    assert flag.exists(), "Falta imagen de la bandera en la portada"
    flag_text = flag.read_text(encoding="utf-8")
    assert flag_text.startswith("<svg") and 'data:image/jpeg;base64,' in flag_text, "La bandera no incluye la imagen local"
    assert flag.stat().st_size > 30_000, "La imagen de bandera está vacía"
    assert "hist-approved" in code and "hist-dashboard" in code, "Falta cabecera histórica aprobada"
    assert "hist-stats-band" in code and "hist-feature-nav" in code, "Faltan cifras o navegación"
    for action in ('data-hist-go="hist-datos"', 'data-hist-go="hist-linea"',
                   'data-hist-view="tit"', 'data-hist-view="stats"',
                   'data-hist-go="hist-curiosidades"'):
        assert action in code, f"Falta botón de navegación: {action}"
    assert 'starsFact ? starsFact.big' in code, "Los títulos deben salir del contenido verificado"
    assert 'data-u-view="C"' in html and 'data-u-view="hist"' in html, "Faltan enlaces a Clausura e Historia"
    assert 'body[data-view="hist"] > .hero' in styles, "Falta ocultar portada genérica SOLO en Historia"
    assert 'body[data-view="hist"] > .tabs-bar' in styles, "Falta ocultar menú redundante SOLO en Historia"
    assert 'url("img/hist-bandera.svg")' in styles, "Falta imagen de fondo de la maqueta"
    print("OK historia: navegación, lectura directa y referencias visibles")


if __name__ == "__main__":
    main()
