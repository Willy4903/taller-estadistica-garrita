#!/usr/bin/env python3
"""Valida navegación, diseño esencial y programación de IA Radar sin dependencias externas."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


class HomeParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.fragments = []
        self.tags = []
        self.sections = []
        self.main_heads = 0

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        ident = attributes.get("id")
        if ident:
            self.ids.append(ident)
            if tag == "section":
                self.sections.append(ident)
        if tag == "h1":
            self.main_heads += 1
        if tag == "a" and (attributes.get("href") or "").startswith("#"):
            self.fragments.append(attributes["href"][1:])
        if tag in ("nav", "section", "details"):
            self.tags.append((tag, "open"))

    def handle_endtag(self, tag):
        if tag in ("nav", "section", "details"):
            self.tags.append((tag, "close"))


def main():
    html = (ROOT / "site/index.html").read_text(encoding="utf-8")
    core = (ROOT / "site/js/core.js").read_text(encoding="utf-8")
    hoy = (ROOT / "site/js/hoy.js").read_text(encoding="utf-8")
    workflow = (ROOT / ".github/workflows/daily-update.yml").read_text(encoding="utf-8")

    parsed = HomeParser()
    parsed.feed(html)
    if len(parsed.ids) != len(set(parsed.ids)):
        raise AssertionError("Hay identificadores HTML duplicados")
    if parsed.main_heads != 1:
        raise AssertionError("La portada debe tener un único H1")
    required = {"hoy", "ruta", "modelos", "aprende", "responsable", "fuentes"}
    if not required.issubset(parsed.sections):
        raise AssertionError(f"Faltan secciones: {required - set(parsed.sections)}")
    bad_anchors = set(parsed.fragments) - set(parsed.ids)
    if bad_anchors:
        raise AssertionError(f"Enlaces internos sin destino: {bad_anchors}")
    if parsed.sections.index("hoy") > parsed.sections.index("ruta"):
        raise AssertionError("Las noticias deben preceder a la ruta avanzada")

    stack = []
    for tag, action in parsed.tags:
        if action == "open":
            stack.append(tag)
        elif not stack or stack.pop() != tag:
            raise AssertionError("Etiquetas nav, section o details desbalanceadas")
    if stack:
        raise AssertionError(f"Quedaron etiquetas sin cerrar: {stack}")

    for fragment in (
        'class="start simple-start"', 'class="simple-extra iar-ref-extra"',
        'css/simple.css?v=__V__', 'id="st-kpi"',
        'js/core.js?v=__V__', 'js/hoy.js?v=__V__',
    ):
        if fragment not in html:
            raise AssertionError(f"Falta componente de inicio: {fragment}")
    if "class=\"sb-more\"" not in core:
        raise AssertionError("Falta acceso a los recursos avanzados")
    if 'class="simple-topic-filter"' not in hoy:
        raise AssertionError("Falta filtro opcional de noticias")
    if not (ROOT / "site/css/simple.css").is_file():
        raise AssertionError("No existe la hoja de estilos de lectura sencilla")
    if "visual-ai" not in html or "css/visual.css?v=__V__" not in html:
        raise AssertionError("Falta la portada gráfica")
    css = (ROOT / "site/css/visual.css").read_text(encoding="utf-8")
    photos = ("ia-hero.jpg", "ia-news.jpg", "ia-models.jpg", "ia-learn.jpg")
    for name in photos:
        file = ROOT / "site/visual/photos" / name
        if not file.is_file() or not 15000 < file.stat().st_size < 6_000_000:
            raise AssertionError(f"Falta fotografía JPEG válida: {name}")
        with file.open("rb") as img:
            if img.read(3) != b"\xff\xd8\xff":
                raise AssertionError(f"La fotografía no es JPEG: {name}")
            img.seek(-2, 2)
            if img.read(2) != b"\xff\xd9":
                raise AssertionError(f"JPEG incompleto: {name}")
        if f'url("../visual/photos/{name}")' not in css:
            raise AssertionError(f"No se usa la fotografía real: {name}")
    if re.search(r'url\("../visual/ai-(?:hero|news|models|learn)\.svg"\)', css):
        raise AssertionError("El diseño sigue usando ilustraciones SVG")
    # Portada aprobada: cabecera blanca, imagen de robot original y tres tarjetas.
    hero = ROOT / "site/visual/ia-radar-robot-hero.jpg"
    if not hero.is_file() or hero.stat().st_size < 40000:
        raise AssertionError("No se encuentra el fondo gráfico del robot")
    with hero.open("rb") as img:
        if img.read(3) != b"\xff\xd8\xff":
            raise AssertionError("El fondo del robot no es un JPEG")
    reference_css = ROOT / "site/css/ia-reference.css"
    if not reference_css.is_file():
        raise AssertionError("Falta la hoja de estilos de la maqueta")
    sheet = reference_css.read_text(encoding="utf-8")
    for term in ("iar-ref-hd", "iar-ref-topnav", "iar-ref-card", "iar-card-photo",
                 "ia-radar-robot-hero.jpg", "@media(max-width:570px)"):
        if term not in sheet:
            raise AssertionError(f"No aparece en los estilos: {term}")
    for name in ("iar-card-news.jpg", "iar-card-models.jpg", "iar-card-learn.jpg"):
        art = ROOT / "site/visual" / name
        if not art.is_file() or art.stat().st_size < 12000:
            raise AssertionError(f"Falta imagen de tarjeta: {name}")
        with art.open("rb") as raw:
            if raw.read(3) != b"\xff\xd8\xff":
                raise AssertionError(f"Imagen no es JPEG: {name}")
        if f'url("../visual/{name}")' not in sheet:
            raise AssertionError(f"No se utiliza en los estilos la tarjeta: {name}")
    for term in ('css/ia-reference.css?v=__V__', 'class="stage visual-ai iar-reference"',
                 'class="statusbar" id="hero-meta"', 'id="st-kpi"',
                 'id="insight"', 'class="start simple-start"'):
        if term not in html:
            raise AssertionError(f"No aparece en la página: {term}")
    if html.count('class="iar-ref-card ') != 3:
        raise AssertionError("La portada debe mostrar tres tarjetas principales")
    for title in ("Novedades de IA", "¿Qué herramienta usar?", "Aprende paso a paso"):
        if title not in html:
            raise AssertionError(f"Falta la tarjeta: {title}")
    if "iar-ref-topnav" not in core or "iar-search-trigger" not in core:
        raise AssertionError("No se instaló la navegación y búsqueda de la nueva cabecera")
    if "searchTrigger.addEventListener" not in core:
        raise AssertionError("El botón Buscar debe abrir el panel de búsqueda")
    if 'href="#hoy"' not in html or 'href="#modelos"' not in html or 'href="#ruta"' not in html:
        raise AssertionError("Faltan enlaces funcionales de las tarjetas")
    if 'visual-hero-credit' in html or 'visual-photo-credits' in html:
        raise AssertionError("El diseño aprobado no incluye créditos de fotografías anteriores")


    crons = re.findall(r'^\s*- cron:\s*["\']([^"\']+)["\']', workflow, re.M)
    if crons != ["5 13 * * *", "5 1 * * *"]:
        raise AssertionError(f"Frecuencia incorrecta: {crons}")
    for command in ("scripts/update_data.py", "scripts/fetch_liga1.py", "scripts/build_site.py"):
        if command not in workflow:
            raise AssertionError(f"Se perdió una tarea del flujo: {command}")
    print("OK: portada, enlaces, navegación, filtros y dos actualizaciones diarias")


if __name__ == "__main__":
    main()
