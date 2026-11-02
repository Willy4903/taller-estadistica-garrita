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
    print("OK historia: navegación, lectura directa y referencias visibles")


if __name__ == "__main__":
    main()
