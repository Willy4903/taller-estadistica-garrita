# taller-estadistica-garrita
Taller de Estadística Aplicada para la Recolección e Interpretación de Datos - INEI

## IA Radar

Página web (`site/`) con los últimos modelos de IA, comparaciones de precio y contexto, y gráficas de tendencias. Un workflow de GitHub Actions actualiza los datos todos los días a las 6:00 am hora de Lima (11:00 UTC) y vuelve a publicar el sitio.

Fuentes públicas, sin API key: OpenRouter (catálogo, precios, contexto) y Hugging Face (modelos abiertos en tendencia).

### Puesta en marcha

1. Fusionar esta rama a `main` (los workflows programados solo corren en la rama por defecto).
2. En Settings > Pages, elegir Source: GitHub Actions.
3. En la pestaña Actions, ejecutar manualmente "Actualización diaria y despliegue" (Run workflow) para reemplazar los datos de ejemplo por datos reales. Desde entonces corre solo cada día.

### Desarrollo local

```
python scripts/update_data.py --sample   # datos sintéticos
python -m http.server -d site 8000
```

Chart.js 4 está incluido en `site/vendor/` (licencia MIT), por lo que el sitio no depende de CDNs.
