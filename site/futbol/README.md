# Willy Stats.

Interfaz independiente de Liga 1, implementada con **React 19, Tailwind CSS 4 y Vite**. Código fuente: `apps/willy-stats/`. Distribución compilada: `site/futbol/`, publicada en `/taller-estadistica-garrita/futbol/`. No modifica el sitio de Liga 1.

## Desarrollo y compilación

```sh
cd apps/willy-stats
npm ci
npm run dev
npm test
npm run build
```

`build` genera HTML y recursos versionados dentro de `site/futbol/`. Conserva `flags/`, `icon.svg` y la instantánea de datos existente; no descarga ni reemplaza datos publicados. El servidor de desarrollo sirve esos recursos locales. La distribución se versiona para que el flujo actual de GitHub Pages pueda publicarla sin agregar Node a los workflows existentes. Tipografías de Google Fonts con alternativas locales.

Desde la raíz, para verificar la distribución como en Pages:

```sh
python3 -m http.server 8000 --directory site
node --require /workspace/.onboarding-garrita/chromium.cjs scripts/check_cancha.cjs
python3 -m unittest discover -s scripts -p test_cancha_provider.py -v
```

## Estado de datos reales (configuración nueva)

La interfaz abre **Datos reales publicados** por defecto. La demostración reproducible
se mantiene como opción explícita, siempre etiquetada como ficticia. No existen
respuestas de respaldo inventadas. Los comparadores y tarjetas calculan sobre
la fuente seleccionada; sin captura válida muestran "—" o "Sin datos".

El colector principal es `scripts/update_willy_stats.py`, que usa
[API-Football](https://www.api-football.com/) mediante una clave almacenada en
**Settings → Secrets and variables → Actions → New repository secret**
con nombre `API_FOOTBALL_KEY` (nunca guardar la clave en git).
El workflow `willy-stats-data.yml` actualiza una vez al día
(presupuesto aproximado: 43 peticiones, siempre sujeto a la API y cobertura).
Se puede activar manualmente con `workflow_dispatch`.
La ejecución diaria de `daily-update.yml` compila el frontend y publica los
archivos bajo `site/futbol/` después de fusionar los cambios.

El colector determina la temporada desde la metadata del proveedor y exige
coincidencia exacta de país/nombre de liga. Si no hay correspondencia inequívoca,
no inventa una. Valida marcadores, puntos y participaciones; conserva la última
captura real con su fecha original cuando falla. El frontend alerta si una
instantánea tiene más de 36 horas. **No es una aplicación de marcadores minuto a minuto.**

El script ESPN preexistente permanece como referencia histórica, pero usa
endpoints no oficiales; no forma parte del workflow nuevo. Si se desea publicar
datos derivados de ESPN, verificar antes autorización de reutilización.
API-Football también señala que sus clientes deben revisar derechos de datos
y marcas según competición: tener clave gratuita no concede automáticamente
licencia para todos los contenidos. Los escudos existentes tienen sus propias
condiciones de uso.

Pruebas offline: `python -m unittest discover -s scripts -p test_willy_stats.py -v`.

## Funciones

14 competiciones; filtro por continente; métricas de goles por partido; tabla General, Local y Visitante; búsqueda; favoritos persistentes; detalle de equipo; efectividad; gráfico de ataque/defensa; calendario y resultados ficticios; formatos; comparador de tres ligas con selección; archivo histórico con fechas de corte y enlaces; metodología desplegable. React mantiene estados reales para todas las interacciones.

## Integridad y límites

Demostración explícitamente ficticia. Los 14 escenarios se calculan desde partidos reproducibles. PJ = G + E + P, PTS = 3G + E, DG = GF − GC, goles globales a favor = goles en contra. Local + Visitante reconstruye General. El ejemplo de Universitario es exactamente 12 PJ, 9 G, 2 E, 1 P, 24 GF, 7 GC, +17 DG, 29 puntos, 80.6% de efectividad y últimos cinco V–V–E–V–V. El escolta tiene 26 puntos.

La efectividad local de ese escenario es **88.9%** (16/18 puntos). El 94.4% solicitado en el boceto no es compatible con los seis partidos locales de ese balance. Se muestra el dato calculado.

ICL = 10 × (1 − 0.4 × σ/μ), limitado a [0,10], sobre puntos por partido. Perú muestra 8.4. Mide paridad en la tabla, no calidad entre ligas.

Proyección de puntos: puntos actuales más restantes por puntos/partido, con horizonte de una vuelta (N−1), o 8 para UEFA. El peso de título ilustrativo normaliza exp(β × puntos/partido). β se calibra para reproducir 68.4% en el ejemplo peruano; no se ajusta con resultados históricos, no es un modelo validado ni una probabilidad del campeonato oficial. Universitario proyecta 41 puntos. Todo está explicado en la interfaz.

**xG no disponible**: faltan eventos de tiros y un modelo calibrado. No se inventa xG desde goles observados. Los formatos con fases tienen advertencias; las tablas de demostración son agregadas y no son grupos oficiales ni tablas de promedios. Zonas orientativas; copas, sanciones y reglamentos pueden cambiar los cupos.

El archivo Libertadores y Champions tiene corte 1 de junio de 2024. No es el palmarés actual.

## Fuente ESPN heredada (manual, no incluida en la actualización automática)

```sh
python3 scripts/update_cancha.py
python3 scripts/update_cancha.py --league eng --output /tmp/willy-snapshot.json
```

Requiere HTTPS a `site.web.api.espn.com` y `site.api.espn.com`; sin claves. Selecciona «Fuente publicada» para leer `data/snapshot.json`. No mezcla datos reales con demostración: si falta una instantánea, muestra un estado vacío. El actualizador conserva la última instantánea por competición si la consulta falla y devuelve código 1. Grupos publicados se seleccionan por separado; las vistas Local/Visitante están desactivadas cuando la fuente no trae desglose. No se asignan zonas oficiales por inferencia. No es tiempo real.

## Escudos e insignias

Los clubes usan imágenes reales locales indexadas por competición y nombre exacto, no monogramas ni coincidencia aproximada. `crests/manifest.json` conserva la procedencia y SHA-256; `crests/SOURCES.md` detalla las colecciones. Los PNG se optimizan a 128 píxeles conservando aspecto. Un escudo no identificado muestra un indicador neutral, sin atribuirle la imagen de otro club. Las 336 identidades de club del catálogo tienen un escudo asociado (los clubes repetidos en distintas competiciones comparten imagen). El actualizador de ESPN se conserva como respaldo para las cuatro identidades que necesitaron fuentes adicionales. Las cuatro copas tienen ilustraciones SVG propias basadas en la silueta de su trofeo; no son logotipos oficiales.
