# IA Radar
Observatorio de inteligencia artificial en español y talleres de IA de WG IA Estratégica.

Nota: el repositorio conserva el nombre histórico `taller-estadistica-garrita`, que forma parte de la URL de GitHub Pages. Para renombrarlo, ver "Renombrar el repositorio" más abajo.

## IA Radar

Observatorio de inteligencia artificial en español (`site/`): qué pasó hoy, qué cambió, radar de modelos, uso real, aprendizaje (Academia, Prompt Lab, glosario, quiz), uso responsable, normativa (Perú, UE, estándares) y diagnóstico de nivel. Una automatización de GitHub Actions actualiza los datos cada día (11:00 UTC) y vuelve a publicar el sitio.

### Estructura

```
site/
  index.html, modelos.html, glosario.html, responsable.html, guias/   páginas (las tres últimas y las guías las genera scripts/build_site.py)
  js/ css/                                                         código del frente (un módulo por sección)
  content/                                                         contenido editorial: glosario, academia, casos, normativa, prompts, quiz, SEO
  data/current/                                                    datos vigentes (models, news, trends, usage, arena, research, regulation_checks, facts, status...)
  data/state/                                                      estado interno del pipeline
  history/YYYY-MM-DD/                                              copia diaria; no se sobrescribe lo anterior
scripts/
  update_data.py                                                   orquestador: recuperar, normalizar, validar, comparar, detectar cambios, publicar
  fetch_*.py                                                       una fuente por script (openai, anthropic, google, xai, openrouter, artificial_analysis, trends, huggingface, peru/eu regulation...)
  build_site.py                                                    páginas estáticas, sitemap y robots
```

Cada cifra publicada en `data/current/facts.json` conserva valor, unidad, tipo de métrica, fuente, URL, fechas, proveedor, confianza y nota de metodología. Si una fuente falla se conserva el último dato válido y el estado queda en `data/current/status.json`.

### Fuentes
OpenRouter (catálogo y actividad), Hugging Face, blogs de laboratorios y prensa (RSS/Atom), arXiv cs.AI, LMArena (dataset público), Google Trends, y comprobación de fuentes oficiales de normativa. Artificial Analysis usa su API si existe el secreto `AA_API_KEY`; si no, se conserva una instantánea curada con fecha. El estado legal de cada norma se mantiene a mano en `site/content/regulation.json`.

### Puesta en marcha

1. Fusionar a `main` (los workflows programados solo corren en la rama por defecto).
2. En Settings > Pages, elegir Source: GitHub Actions.
3. Ejecutar manualmente "Actualización diaria y despliegue" la primera vez. Después corre solo.

### Desarrollo local

```
python scripts/update_data.py --sample   # datos sintéticos (escribe en site/data/current)
python scripts/build_site.py
python -m http.server -d site 8000
```

Analítica: sin cookies. Los eventos se cuentan en el navegador; para agregarlos define `CONFIG.endpoint` en `site/js/core.js`.

Chart.js 4 está incluido en `site/vendor/` (licencia MIT), por lo que el sitio no depende de CDNs.

## Talleres, contacto y medición

Los datos comerciales viven en un solo archivo: `site/content/talleres.json`. Los campos vacíos no se muestran en el sitio.

- `contacto.whatsapp` (con código de país, solo dígitos, por ejemplo `51999999999`) y `contacto.email`: habilitan el formulario de inscripción, el botón de WhatsApp y el contacto flotante. Sin ellos, el formulario deriva a la web de WG IA Estratégica.
- `talleres[].datos`: modalidad, duración, fechas, horario, precio y certificado de cada taller.
- `testimonios`: lista de `{ "nombre", "cargo", "texto" }`. Solo se publican testimonios reales y autorizados.
- `analitica.endpoint`: URL del receptor de eventos (ver abajo).

Las páginas `site/talleres.html` y `site/talleres/*.html` las genera `scripts/build_site.py` a partir de ese archivo.

### Medición central

El sitio envía eventos anónimos (clic en talleres, formulario iniciado, inscripción enviada, secciones vistas) sin cookies ni datos personales. Para recibirlos:

1. Sigue las instrucciones de `scripts/analitica/receptor.gs` (Google Apps Script sobre una hoja de cálculo).
2. Pega la URL `/exec` en `analitica.endpoint` de `site/content/talleres.json`.

Los datos personales del formulario (nombre y contacto) nunca se envían al receptor: viajan solo por WhatsApp o correo.

### Renombrar el repositorio

En GitHub: Settings > General > Repository name (por ejemplo `ia-radar`). Después actualiza `BASE` en `scripts/build_site.py`, las URL absolutas de `site/index.html` y `site/about.html`, y vuelve a ejecutar el workflow. GitHub redirige el nombre anterior, pero la URL pública de Pages cambia.
