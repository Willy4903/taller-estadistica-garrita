#!/usr/bin/env python3
"""Genera las páginas estáticas indexables de IA Radar: glosario, guías, catálogo, IA responsable, sitemap y robots.
El contenido sale de site/content/*.json; no depende de JavaScript para ser leído por buscadores."""
import html
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BASE = "https://willy4903.github.io/taller-estadistica-garrita/"
WGIA = "https://wgia.luisito4903.chatgpt.site/"
e = html.escape


def load(name):
    return json.loads((SITE / "content" / name).read_text(encoding="utf-8"))


def shell(path, title, desc, body, root="", scripts=(), need="", ld=None, page="page"):
    """Estructura común. `path` es la ruta relativa de la página dentro de site/."""
    url = BASE + path
    scripts_html = "\n".join(f'<script src="{root}js/{s}.js?v=__V__"></script>' for s in scripts)
    ld_html = "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>\n' for x in (ld or []))
    return f'''<!doctype html>
<html lang="es" class="js-off">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} | IA Radar</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="es_PE">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2313151c'/%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23fff' stroke-width='2'/%3E%3Cpath d='M16 16 L24 10' stroke='%238da0ff' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E">
<script>document.documentElement.classList.remove("js-off");</script>
{ld_html}<link rel="stylesheet" href="{root}css/radar.css?v=__V__">
<link rel="stylesheet" href="{root}css/sections.css?v=__V__">
<link rel="stylesheet" href="{root}css/learn.css?v=__V__">
<link rel="stylesheet" href="{root}css/pages.css?v=__V__">
<link rel="stylesheet" href="{root}css/futuro.css?v=__V__">
</head>
<body data-page="{page}" data-root="{root}" data-v="__V__"{f' data-need="{need}"' if need else ""}>
<a class="skip" href="#main">Saltar al contenido</a>
<div id="site-header"></div>
<main id="main">
{body}
</main>
<div id="site-footer"></div>
<script src="{root}vendor/chart.umd.js"></script>
<script src="{root}js/core.js?v=__V__"></script>
<script src="{root}js/fx.js?v=__V__"></script>
{scripts_html}
</body>
</html>
'''


def crumbs(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u} for i, (n, u) in enumerate(items)]}


def write(path, content):
    p = SITE / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def build_guides():
    seo = load("seo.json")["pages"]
    by = {p["slug"]: p for p in seo}
    for p in seo:
        secs = "".join(f"<section><h2>{e(s['h'])}</h2>{''.join(f'<p>{e(t)}</p>' for t in s['p'])}</section>" for s in p["sections"])
        faq = "".join(f"<details class='les'><summary><span class='les-t'>{e(f['q'])}</span></summary><div class='les-b'><p>{e(f['a'])}</p></div></details>" for f in p["faq"])
        rel = "".join(f"<li><a href='{r}.html'>{e(by[r]['short'])}</a></li>" for r in p["related"] if r in by)
        cta_href = "../" + p["cta"]["href"]
        body = f'''<article class="wrap narrow page">
<p class="crumb"><a href="../index.html">IA Radar</a> / Guías</p>
<h1 class="pg-h1">{e(p["h1"])}</h1>
<div class="answer"><span class="pl-k">Respuesta en 20 segundos</span><p>{e(p["answer"])}</p></div>
{secs}
<h2>Preguntas frecuentes</h2>{faq}
<div class="callout"><p><b>Practica lo que leíste.</b> <a href="{cta_href}">{e(p["cta"]["text"])}</a></p></div>
<h2>Sigue explorando</h2><ul class="rel">{rel}<li><a href="../glosario.html">Glosario de IA</a></li><li><a href="../index.html#aprende">Ruta de aprendizaje de 5 niveles</a></li></ul>
<p class="muted small">IA Radar es una iniciativa educativa de WGIA. Si quieres formación práctica en IA, ChatGPT y Claude, <a href="{WGIA}" target="_blank" rel="noopener">conoce los talleres</a>. Este contenido es educativo; verifica siempre las fuentes oficiales.</p>
</article>'''
        ld = [{"@context": "https://schema.org", "@type": "Article", "headline": p["h1"], "description": p["description"], "inLanguage": "es", "dateModified": date.today().isoformat(),
               "author": {"@type": "Organization", "name": "IA Radar, iniciativa educativa de WGIA"}, "mainEntityOfPage": BASE + f"guias/{p['slug']}.html"},
              {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in p["faq"]]},
              crumbs([("IA Radar", ""), (p["short"], f"guias/{p['slug']}.html")])]
        write(f"guias/{p['slug']}.html", shell(f"guias/{p['slug']}.html", p["title"], p["description"], body, root="../", ld=ld))
    return [f"guias/{p['slug']}.html" for p in seo]


def build_glossary():
    g = load("glossary.json")
    cats = g["categories"]
    items = "".join(f'''<article class="gl" id="t-{e(t["term"].lower().replace(" ", "-").replace("/", "-"))}" data-cat="{e(t["cat"])}" data-q="{e((t["term"] + " " + t["es"] + " " + t["short"]).lower())}">
<header><h2>{e(t["term"])}</h2><span class="tag">{e(t["cat"])}</span></header><p class="gl-es">{e(t["es"])}</p>
<dl><div><dt>En 20 segundos</dt><dd>{e(t["short"])}</dd></div><div><dt>Definición técnica</dt><dd>{e(t["tech"])}</dd></div><div><dt>Ejemplo</dt><dd>{e(t["example"])}</dd></div><div><dt>Por qué importa</dt><dd>{e(t["why"])}</dd></div></dl></article>''' for t in g["terms"])
    body = f'''<div class="wrap page">
<p class="crumb"><a href="index.html">IA Radar</a> / Glosario</p>
<h1 class="pg-h1">Glosario de inteligencia artificial</h1>
<p class="lead">{len(g["terms"])} conceptos explicados en 20 segundos, con definición técnica, ejemplo y por qué importan.</p>
<div class="gl-bar"><label class="f" for="gl-q">Buscar un término<input type="search" id="gl-q" placeholder="Por ejemplo: token, RAG, MCP"></label>
<div class="chips" id="gl-cats" role="group" aria-label="Categoría"><button type="button" class="chip-btn" data-c="" aria-pressed="true">Todas</button>{"".join(f'<button type="button" class="chip-btn" data-c="{e(c)}" aria-pressed="false">{e(c)}</button>' for c in cats)}</div>
<p class="muted" id="gl-n" role="status"></p></div>
<div class="gl-list" id="gl-list">{items}</div>
</div>'''
    ld = [{"@context": "https://schema.org", "@type": "DefinedTermSet", "name": "Glosario de inteligencia artificial", "inLanguage": "es",
           "hasDefinedTerm": [{"@type": "DefinedTerm", "name": t["term"], "description": t["short"]} for t in g["terms"]]}, crumbs([("IA Radar", ""), ("Glosario", "glosario.html")])]
    write("glosario.html", shell("glosario.html", "Glosario de inteligencia artificial en español", f"{len(g['terms'])} términos de IA explicados: LLM, token, ventana de contexto, RAG, MCP, agentes, system prompt, benchmarks y más.", body, scripts=["glosario"], ld=ld))


def build_catalog():
    body = '''<div class="wrap page"><p class="crumb"><a href="index.html">IA Radar</a> / Modelos</p>
<h1 class="pg-h1">Catálogo de modelos de IA</h1>
<p class="lead">Todos los modelos del catálogo público de OpenRouter, con fecha, contexto, precio, modalidades y detalle. Cada benchmark se muestra por separado y nunca se mezcla con otro.</p>
<noscript><p>Esta página necesita JavaScript para mostrar el catálogo.</p></noscript>
<div id="catalog-root"></div></div>'''
    write("modelos.html", shell("modelos.html", "Catálogo de modelos de IA: precios, contexto y capacidades", "Catálogo actualizado a diario de modelos de IA con fecha de lanzamiento, ventana de contexto, precio por millón de tokens, modalidades y comparador.", body,
          scripts=["models-lib", "data", "modelos"], need="models,frontier,arena,recommender", ld=[crumbs([("IA Radar", ""), ("Modelos", "modelos.html")])]))


def build_responsible():
    src = load("sources.json")
    lv = "".join(f"<li><b>{l['n']}</b><div><strong>{e(l['name'])}</strong><span>{e(l['desc'])}</span></div></li>" for l in src["levels"])
    body = f'''<div class="wrap page"><p class="crumb"><a href="index.html">IA Radar</a> / IA responsable</p>
<h1 class="pg-h1">IA responsable, ética y normativa</h1>
<p class="lead">Casos documentados, marcos legales y estándares para usar IA con criterio. Contenido educativo, no asesoría jurídica.</p>
<section id="casos"><h2>Casos reales. Lecciones reales.</h2><div id="cases-root"></div></section>
<section id="regulacion"><h2>IA, ética y regulación</h2><div id="reg-root"></div></section>
<section id="evidencia"><h2>Jerarquía de evidencia</h2><p class="muted">No todas las fuentes pesan igual. Un tuit nunca es evidencia definitiva.</p><ol class="lvl">{lv}</ol></section>
<p><a class="btn" href="index.html#responsable">Volver a las herramientas de uso responsable</a></p></div>'''
    write("responsable.html", shell("responsable.html", "IA responsable: casos reales, ética y normativa en Perú, UE y estándares", "Casos documentados de errores con IA, marco normativo de Perú (Ley 31814, D.S. 115-2025-PCM), AI Act de la UE y estándares UNESCO y NIST.", body,
          scripts=["data", "responsable"], need="cases,regulation,regchecks", ld=[crumbs([("IA Radar", ""), ("IA responsable", "responsable.html")])]))


def build_sitemap(urls):
    today = date.today().isoformat()
    allu = ["", "modelos.html", "glosario.html", "responsable.html"] + urls
    items = "".join(f"<url><loc>{BASE}{u}</loc><lastmod>{today}</lastmod></url>" for u in allu)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>\n')
    write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n")


def main():
    urls = build_guides()
    build_glossary()
    build_catalog()
    build_responsible()
    build_sitemap(urls)
    print(f"Páginas generadas: {len(urls)} guías, glosario, catálogo, IA responsable, sitemap y robots")


if __name__ == "__main__":
    main()
