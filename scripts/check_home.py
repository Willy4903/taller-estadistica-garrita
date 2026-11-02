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
        'class="start simple-start"', 'class="simple-extra"',
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
    if 'visual-hero-credit' not in html or 'visual-photo-credits' not in html:
        raise AssertionError("Faltan atribuciones fotográficas y procedencia")
    for item in ("Datacenter_Server_Racks_", "Woman_reading_and_working_on_laptop_at_home", "Technician_with_laptop_working_on_server_rack_at_NERSC", "Students_using_a_computer_laptop"):
        if item not in html:
            raise AssertionError(f"Falta crédito de fotografía {item}")


    crons = re.findall(r'^\s*- cron:\s*["\']([^"\']+)["\']', workflow, re.M)
    if crons != ["5 13 * * *", "5 1 * * *"]:
        raise AssertionError(f"Frecuencia incorrecta: {crons}")
    for command in ("scripts/update_data.py", "scripts/fetch_liga1.py", "scripts/build_site.py"):
        if command not in workflow:
            raise AssertionError(f"Se perdió una tarea del flujo: {command}")
    print("OK: portada, enlaces, navegación, filtros y dos actualizaciones diarias")


if __name__ == "__main__":
    main()
