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
<link rel="stylesheet" href="{root}css/talleres.css?v=__V__">
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
<p class="muted small">IA Radar es una iniciativa educativa de WG IA Estratégica. Si quieres formación práctica en IA, ChatGPT y Claude, <a href="{WGIA}" target="_blank" rel="noopener">conoce los talleres</a>. Este contenido es educativo; verifica siempre las fuentes oficiales.</p>
</article>'''
        ld = [{"@context": "https://schema.org", "@type": "Article", "headline": p["h1"], "description": p["description"], "inLanguage": "es", "dateModified": date.today().isoformat(),
               "author": {"@type": "Organization", "name": "IA Radar, iniciativa educativa de WG IA Estratégica"}, "mainEntityOfPage": BASE + f"guias/{p['slug']}.html"},
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


def build_about():
    secs = [
        ("Qué es IA Radar", ["IA Radar es un observatorio de inteligencia artificial en español. Reúne noticias, comparaciones de modelos, datos de uso, aprendizaje práctico y criterios de uso responsable en un solo lugar, siempre con la fuente a la vista."]),
        ("Quién lo desarrolla", [f"IA Radar es una iniciativa educativa de WG IA Estratégica, un proyecto de formación práctica en IA, ChatGPT y Claude (WGIA). Puedes conocer más en <a href='{WGIA}' target='_blank' rel='noopener'>la página de formación</a>. El contenido educativo y editorial lo prepara la iniciativa; los datos se obtienen de forma automática de las fuentes que se listan en la sección Fuentes."]),
        ("Cuál es su propósito", ["Que quien entre salga sabiendo más de lo que sabía: entender qué está pasando en IA, aprender cómo funciona y convertirla en una capacidad profesional, usándola con criterio y de forma responsable. No es un sitio de ventas: la formación aparece como una siguiente etapa opcional."]),
        ("A quién está dirigido", ["A personas que no conocen la IA y quieren empezar, a profesionales que ya la usan y quieren hacerlo mejor, a docentes, funcionarios públicos, empresarios y analistas, y a quien necesite comparar herramientas con datos."]),
        ("Cómo se seleccionan las noticias", ["Cada día se descargan los feeds de blogs oficiales de laboratorios (OpenAI, Anthropic, Google, xAI, Meta, Mistral, Microsoft Research, NVIDIA, Hugging Face) y de prensa especializada (MIT Technology Review, The Verge, TechCrunch, The Rundown AI).", "La sección Hoy en IA muestra como máximo cinco puntos. Se ordenan con una puntuación que pondera el origen (se prioriza a los laboratorios), la recencia, el tema (modelos, seguridad y regulación, negocios, productos, infraestructura, investigación) y señales de lanzamiento. Se limita a dos por fuente y se descartan historias de clientes y notas menores.", "Los puntos con lectura editorial tienen una explicación propia. En el resto, \"por qué importa\" y \"a quién afecta\" son una lectura general según el tema y así se indica. Las noticias se traducen automáticamente al español; el original está siempre enlazado."]),
        ("Cómo se actualizan los contenidos", ["Una automatización de GitHub Actions se ejecuta cada día a las 11:00 UTC. Sigue estos pasos: recuperar, normalizar, validar, comparar, detectar cambios y publicar. Cada día guarda una copia en el histórico y no sobrescribe el dato anterior.", "Si una fuente falla, se muestra el último dato válido y la sección Fuentes indica el estado de cada una. Algunas cifras, como los índices de Artificial Analysis y BenchLM, son instantáneas revisadas a mano y llevan su fecha."]),
        ("Qué criterios se usan para comparar modelos", ["Se comparan precio por millón de tokens (con una mezcla 3:1 entre entrada y salida), ventana de contexto, modalidades que acepta, razonamiento declarado y fecha de lanzamiento, a partir del catálogo público de OpenRouter.", "No se declara un ganador universal. Los benchmarks de terceros (Artificial Analysis, BenchLM, LMArena) se muestran por separado porque miden cosas distintas; nunca se promedian ni se mezclan. Las capacidades sin dato comparable se dejan sin dato. El selector por problema es una orientación calculada con precio, contexto y capacidades, no una medida de calidad real."]),
        ("Cómo se verifican las fuentes", ["Cada dato guarda su valor, unidad, tipo de métrica, fuente, URL, fechas, proveedor, nivel de confianza y nota de metodología. Se usa una jerarquía de evidencia: fuentes oficiales, papers originales, benchmarks independientes, prensa especializada confiable y, solo como señal inicial, redes sociales.", "En normativa, el estado legal de cada norma (vigente, proyecto, guía) lo revisa una persona y la automatización comprueba cada día que las fuentes oficiales respondan y avisa si su contenido cambia. Los casos de la sección de uso responsable solo incluyen hechos documentados por tribunales, reguladores, empresas o prensa de alta reputación."]),
        ("Límites y correcciones", ["IA Radar es contenido educativo y no constituye asesoría jurídica ni profesional. Los datos de usuarios de las empresas son cifras reportadas por ellas y pueden estar desactualizadas. Google Trends mide interés de búsqueda, no usuarios.", f"Si detectas un error o una fuente que debería incluirse, puedes comunicarlo a través de <a href='{WGIA}' target='_blank' rel='noopener'>la página de WGIA</a>."]),
        ("Privacidad", ["El sitio no usa cookies ni cuentas. En tu navegador solo se guardan tu tema, tu progreso en la ruta y contadores de uso anónimos de las herramientas."]),
    ]
    body_secs = "".join(f"<section><h2>{e(h)}</h2>{''.join(f'<p>{t}</p>' for t in ps)}</section>" for h, ps in secs)
    body = f'''<article class="wrap narrow page">
<p class="crumb"><a href="index.html">IA Radar</a> / Acerca de</p>
<h1 class="pg-h1">Acerca de IA Radar</h1>
<p class="lead">Quién lo hace, para quién, con qué criterios y cómo se verifica lo que ves.</p>
{body_secs}
<p><a class="btn" href="index.html#fuentes">Ver el estado de las fuentes</a></p>
</article>'''
    ld = [{"@context": "https://schema.org", "@type": "AboutPage", "name": "Acerca de IA Radar", "inLanguage": "es", "url": BASE + "about.html"}, crumbs([("IA Radar", ""), ("Acerca de", "about.html")])]
    write("about.html", shell("about.html", "Acerca de IA Radar: quién, cómo y con qué criterios", "Quién desarrolla IA Radar, a quién va dirigido, cómo se seleccionan las noticias, cómo se actualizan los datos, qué criterios se usan para comparar modelos y cómo se verifican las fuentes.", body, ld=ld))


DATOS = [("modalidad", "Modalidad"), ("duracion", "Duración"), ("fechas", "Fechas"), ("horario", "Horario"), ("precio", "Inversión"), ("certificado", "Certificado")]


def _datos_html(t):
    rows = [(lbl, t["datos"].get(k, "").strip()) for k, lbl in DATOS if t["datos"].get(k, "").strip()]
    if not rows:
        return '<p class="muted">Escríbenos y te enviamos fechas, modalidad e inversión de la próxima edición.</p>'
    return '<dl class="tl-datos">' + "".join(f"<div><dt>{e(l)}</dt><dd>{e(v)}</dd></div>" for l, v in rows) + "</dl>"


def _testimonios_html(cfg):
    ts = [t for t in cfg.get("testimonios", []) if t.get("texto") and t.get("nombre")]
    if not ts:
        return ""
    items = "".join(
        f'<figure class="tl-quote"><blockquote>{e(t["texto"])}</blockquote>'
        f'<figcaption>{e(t["nombre"])}{", " + e(t["cargo"]) if t.get("cargo") else ""}</figcaption></figure>' for t in ts)
    return f'<section id="testimonios"><h2>Lo que dicen quienes participaron</h2><div class="tl-quotes">{items}</div></section>'


def _faq_html(cfg):
    items = "".join(
        f"<details class='les'><summary><span class='les-t'>{e(f['q'])}</span></summary><div class='les-b'><p>{e(f['a'])}</p></div></details>"
        for f in cfg["faq"])
    return f'<section id="faq"><h2>Preguntas frecuentes</h2>{items}</section>'


def _form_html(cfg, selected=""):
    opts = "".join(
        f'<option value="{e(t["slug"])}"{" selected" if t["slug"] == selected else ""}>{e(t["nombre"])}</option>' for t in cfg["talleres"])
    web = e(cfg["marca"]["web"])
    return f"""<section id="inscripcion" class="tl-form-sec"><h2>Inscríbete o pide información</h2>
<p class="muted">Déjanos tus datos y te respondemos con fechas, modalidad e inversión de la próxima edición.</p>
<form class="enroll" id="enroll" novalidate>
<label class="f">Tu nombre<input name="nombre" autocomplete="name" required></label>
<label class="f">Tu correo o WhatsApp<input name="medio" autocomplete="email" required></label>
<label class="f">Taller de interés<select name="taller">{opts}</select></label>
<label class="f">¿Algo que quieras contarnos? (opcional)<textarea name="msg" rows="3"></textarea></label>
<label class="chk"><input type="checkbox" name="ok" required> Acepto que me contacten sobre este taller. Usaremos estos datos solo para responderte.</label>
<button class="btn big" type="submit">Quiero información e inscripción</button>
<p class="enroll-st muted" id="enroll-st" role="status"></p>
</form>
<noscript><p>El formulario necesita JavaScript. Puedes inscribirte en <a href="{web}">{web}</a>.</p></noscript></section>"""


def _instructor_html(cfg):
    ins = cfg["marca"]["instructor"]
    return (f'<section id="instructor"><h2>Quién dicta el taller</h2><p><b>{e(ins["nombre"])}</b>, {e(cfg["marca"]["nombre"])}. {e(ins["perfil"])} '
            f'<a href="{e(ins["web"])}" target="_blank" rel="noopener" data-track="clic_instructor">Conoce al instructor</a>.</p></section>')


def build_workshops():
    """Páginas propias de cada taller y su índice, con formulario de inscripción. Los datos salen de site/content/talleres.json."""
    cfg = load("talleres.json")
    ts = cfg["talleres"]
    marca = cfg["marca"]["nombre"]
    for t in ts:
        mods = "".join(f'<li><span class="n">{i + 1}</span><div><h3>{e(m["t"])}</h3><p>{e(m["d"])}</p></div></li>' for i, m in enumerate(t["modulos"]))
        para = "".join(f"<li>{e(x)}</li>" for x in t["para_quien"])
        res = "".join(f"<li>{e(x)}</li>" for x in t["resultados"])
        otros = "".join(f'<li><a href="{o["slug"]}.html">{e(o["nombre"])}</a></li>' for o in ts if o["slug"] != t["slug"])
        slug = e(t["slug"])
        body = f'''<article class="wrap narrow page tl">
<p class="crumb"><a href="../index.html">IA Radar</a> / <a href="../talleres.html">Talleres</a> / {e(t["nombre"])}</p>
<h1 class="pg-h1">{e(t["nombre"])}</h1>
<div class="answer"><p>{e(t["gancho"])}</p></div>
<p class="lead">{e(t["resumen"])}</p>
<p class="tl-cta"><a class="btn big" href="#inscripcion" data-track="clic_inscribirme_{slug}">Quiero inscribirme</a> <a class="btn big ghost" href="#" data-contact data-track="clic_contacto_{slug}" hidden>Consultar por mensaje</a></p>
<section id="para-quien"><h2>Es para ti si</h2><ul class="tl-list">{para}</ul></section>
<section id="temario"><h2>Temario</h2><ol class="tl-mods">{mods}</ol></section>
<section id="resultados"><h2>Qué te llevas</h2><ul class="tl-list">{res}</ul></section>
<section id="datos"><h2>Fechas, modalidad e inversión</h2>{_datos_html(t)}</section>
{_testimonios_html(cfg)}
{_instructor_html(cfg)}
{_form_html(cfg, t["slug"])}
{_faq_html(cfg)}
<section id="otros"><h2>Otros talleres</h2><ul class="rel">{otros}<li><a href="../talleres.html">Ver todos los talleres</a></li><li><a href="../index.html#nivel">Medir mi nivel en 60 segundos</a></li></ul></section>
</article>'''
        ld = [{"@context": "https://schema.org", "@type": "Course", "name": t["nombre"], "description": t["resumen"], "inLanguage": "es",
               "provider": {"@type": "Organization", "name": marca, "sameAs": cfg["marca"]["web"]}, "url": BASE + f"talleres/{t['slug']}.html"},
              crumbs([("IA Radar", ""), ("Talleres", "talleres.html"), (t["nombre"], f"talleres/{t['slug']}.html")])]
        write(f"talleres/{t['slug']}.html", shell(f"talleres/{t['slug']}.html", t["nombre"], t["gancho"], body, root="../", scripts=["talleres"], ld=ld, page="taller"))

    cards = "".join(
        f'''<article class="card tl-card"><span class="tag acc">{e(t.get("ruta", "").replace("r", "Ruta 0"))}</span><h3>{e(t["nombre"])}</h3><p>{e(t["gancho"])}</p>
<ul class="tl-list sm">{"".join(f"<li>{e(x)}</li>" for x in t["para_quien"][:3])}</ul>
<a class="btn" href="talleres/{t["slug"]}.html" data-track="clic_taller_{e(t["slug"])}">Ver temario e inscripción</a></article>'''
        for t in sorted(ts, key=lambda x: x.get("ruta", "")))
    body = f'''<div class="wrap page tl">
<p class="crumb"><a href="index.html">IA Radar</a> / Talleres</p>
<h1 class="pg-h1">Aprende a usar la IA en tu trabajo</h1>
<p class="lead">Talleres prácticos de {e(marca)}: de entender la IA a trabajar con Claude y ChatGPT en tus procesos reales.</p>
<p class="tl-cta"><a class="btn big" href="#inscripcion" data-track="clic_inscribirme_indice">Quiero inscribirme</a> <a class="btn big ghost" href="index.html#nivel" data-track="clic_nivel_talleres">No sé cuál elegir: medir mi nivel</a></p>
<section id="talleres"><h2>Elige tu ruta</h2><div class="tl-grid">{cards}</div></section>
{_testimonios_html(cfg)}
<div class="narrow">{_instructor_html(cfg)}</div>
<div class="narrow">{_form_html(cfg)}</div>
<div class="narrow">{_faq_html(cfg)}</div>
</div>'''
    ld = [{"@context": "https://schema.org", "@type": "ItemList", "name": "Talleres de IA de " + marca,
           "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": BASE + f"talleres/{t['slug']}.html", "name": t["nombre"]} for i, t in enumerate(ts)]},
          crumbs([("IA Radar", ""), ("Talleres", "talleres.html")])]
    write("talleres.html", shell("talleres.html", "Talleres de IA: Claude, ChatGPT y fundamentos",
                                 "Talleres prácticos de IA: especialización en Claude (Chat, Cowork y Claude Code), en ChatGPT y fundamentos desde cero. Temario e inscripción.",
                                 body, scripts=["talleres"], ld=ld, page="talleres"))
    return ["talleres.html"] + [f"talleres/{t['slug']}.html" for t in ts]


def build_sitemap(urls):
    today = date.today().isoformat()
    allu = ["", "modelos.html", "glosario.html", "responsable.html", "about.html"] + urls
    items = "".join(f"<url><loc>{BASE}{u}</loc><lastmod>{today}</lastmod></url>" for u in allu)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>\n')
    write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n")


def main():
    urls = build_guides()
    build_glossary()
    build_catalog()
    build_responsible()
    build_about()
    workshops = build_workshops()
    build_sitemap(urls + workshops)
    print(f"Páginas generadas: {len(urls)} guías, {len(workshops)} de talleres, glosario, catálogo, IA responsable, sitemap y robots")


if __name__ == "__main__":
    main()
