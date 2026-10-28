# taller-estadistica-garrita
Taller de Estadística Aplicada para la Recolección e Interpretación de Datos - INEI

## IA Radar

Observatorio de inteligencia artificial en español (`site/`): qué pasó hoy, qué cambió, radar de modelos, uso real, aprendizaje (Academia, Prompt Lab, glosario, quiz), uso responsable, normativa (Perú, UE, estándares) y diagnóstico de nivel. Una automatización de GitHub Actions actualiza los datos cada día (meta: 8:00 a. m. de Lima; se programa a las 6:47 y 7:37 a. m. porque GitHub retrasa las ejecuciones) y vuelve a publicar el sitio.

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

## Calculadora Liga 1 2026

Página independiente en `site/liga1/` (tema Universitario): tablas de Apertura, Clausura y acumulado con columna de puntos acumulados, calculadora de resultados, evolución de puntos por fecha y pronósticos por simulación. Los datos están en `site/liga1/data.js` y por ahora son de demostración; reemplaza `fixtures` con los resultados oficiales (`hg`/`ag` en cada partido jugado, `null` en los pendientes) y pon `demo: false`.
