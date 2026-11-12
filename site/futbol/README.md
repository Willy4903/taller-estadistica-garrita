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

`build` genera HTML y recursos versionados dentro de `site/futbol/`. Conserva `flags/`, `icon.svg` y la instantánea de datos existente; no descarga ni reemplaza datos publicados. El servidor de desarrollo sirve esos recursos locales. La distribución se versiona para que GitHub Pages pueda publicarla. El flujo diario también la recompila desde el código fuente. Tipografías de Google Fonts con alternativas locales.

Con Playwright y Chromium instalados, desde la raíz se puede verificar la distribución como en Pages:

```sh
python3 -m http.server 8000 --directory site
node scripts/check_cancha.cjs
python3 -m unittest discover -s scripts -p test_cancha_provider.py -v
```

## Datos publicados y actualización

El colector activo es `scripts/update_cancha.py`: consulta las tablas y los partidos
publicados por ESPN. `willy-stats-data.yml` lo ejecuta cada tres horas y al cambiar
el colector; conserva la última captura válida por competición cuando falla una
fuente. Cada tabla indica temporada, proveedor y fecha de captura. No se publican
valores simulados como respaldo ni se presenta el sitio como marcador en vivo.

La temporada que devuelve la fuente debe coincidir con la solicitada. Las ligas
domésticas europeas cambian de edición en julio; la UEFA Nations League utiliza
ediciones bienales, con inicio en año par y finalización al año siguiente.

`daily-update.yml` compila el frontend y publica el sitio dos veces al día;
el flujo deportivo también publica las nuevas capturas. El colector alternativo
`update_willy_stats.py` usa API-Football y requiere `API_FOOTBALL_KEY`; se conserva
para consultas manuales, pero no participa en el flujo activo de actualización.

Pruebas offline: `python -m unittest discover -s scripts -p test_cancha_provider.py -v`.

## Funciones

Rediseño oscuro. 17 competiciones con filtro por continente; tabla con búsqueda, favoritos persistentes y detalle de club con radar; pestañas Tabla, Rendimiento, Vista integrada y Partidos (por fecha, con navegación entre jornadas); análisis calculado con resultados reales (última fecha en números, tendencia de goles, partidos de alto impacto, rachas); comparador de tres ligas; paridad entre ligas con margen de error; metodología. Código en `apps/willy-stats/src/`.

## Integridad y límites

- Solo se muestran datos publicados, con temporada, proveedor y fecha de captura. No hay modo de demostración ni cifras simuladas: sin captura, la interfaz no muestra tablas ni métricas.
- Una captura de otro año se rotula como archivo; una de más de 36 horas, como posiblemente desactualizada.
- Fechas: se agrupan con los resultados publicados (corte tras más de 36 horas sin partidos o cuando un club vuelve a jugar; los partidos reprogramados se unen a su fecha si caben).
- Análisis: goles por partido y distribución local/empate/visita de la última fecha, tendencia de goles, partidos de la próxima fecha entre los mejor ubicados y rachas de los últimos cinco partidos. Todo sale de las tablas y marcadores publicados.
- El radar usa cinco ejes calculables desde la tabla (ataque, defensa, efectividad, diferencia de gol y forma), normalizados contra la liga. No hay xG, posesión ni presión: la fuente no entrega tiros.
- La ilustración del hero es decorativa. Las fotografías de fondo (Unsplash) no representan a ningún club.
- Paridad entre ligas: diferencia típica de nivel entre clubes en puntos por partido, sin el azar. Se calcula como √(σ² observada − σ² del azar), con σ² del azar = varianza de los puntos de un partido (según la tasa de empates de la liga) ÷ partidos por club. El margen de error usa σ/√(2(n−1)). Solo se calcula en tablas de al menos 10 clubes y 8 partidos por club; los grupos pequeños y las fases de copa se marcan como no comparables. Reemplaza al índice anterior 10 × (1 − 0.4 × σ/μ), que dependía del número de partidos jugados y de un factor arbitrario. Mide paridad dentro de la liga, no calidad entre ligas.
- PJ = G + E + P, PTS = 3G + E, DG = GF − GC.

## Actualizar las capturas de ESPN

```sh
python3 scripts/update_cancha.py
python3 scripts/update_cancha.py --league eng --output /tmp/willy-snapshot.json
```

Requiere HTTPS a `site.web.api.espn.com` y `site.api.espn.com`; sin claves. La interfaz lee `data/snapshot.json`; si falta una captura, muestra un estado vacío. El actualizador conserva la última instantánea por competición si la consulta falla y devuelve código 1. Grupos publicados se seleccionan por separado; las vistas Local/Visitante están desactivadas cuando la fuente no trae desglose. No se asignan zonas oficiales por inferencia. No es tiempo real.

## UEFA Nations League

Enlace directo: `/futbol/#liga=unl`. Se encuentra en Europa y en el comparador.
La tabla utiliza «Selección» y permite elegir liga y grupo con sus nombres
completos para distinguir, por ejemplo, Liga A · Grupo 1 de Liga B · Grupo 1.
Los puntos, el rendimiento y las lecturas se calculan dentro del grupo elegido.
Los partidos y el resumen incluyen a las selecciones de ese grupo, también
cuando juegan una eliminatoria contra un rival de otro grupo. Al cambiar de
grupo se reinicia la navegación entre fechas. Los grupos pequeños no reciben
un índice de paridad que no sería comparable con las ligas domésticas.

Sin una captura válida de Nations League no se muestran tablas ni métricas
inventadas. La prueba `node scripts/check_nations_league.cjs` verifica con una
captura interceptada exclusivamente para tests los grupos, los cruces y la
vista móvil; `PW_ENGINE=webkit` utiliza el motor de Safari.

## Escudos e insignias

Los clubes usan imágenes reales locales indexadas por competición y nombre exacto, no monogramas ni coincidencia aproximada. `crests/manifest.json` conserva la procedencia y SHA-256; `crests/SOURCES.md` detalla las colecciones. Los PNG se optimizan a 128 píxeles conservando aspecto. Un escudo no identificado muestra un indicador neutral, sin atribuirle la imagen de otro club. Las identidades de clubes verificadas comparten imagen cuando aparecen en varias competiciones; las selecciones pueden usar la imagen HTTPS que entregue el proveedor. El actualizador de ESPN se conserva como respaldo para las cuatro identidades que necesitaron fuentes adicionales. Las competiciones UEFA/CONMEBOL tienen ilustraciones SVG propias de trofeos; no son logotipos oficiales.

## iPhone y pantallas táctiles

Viewport con `viewport-fit=cover`, márgenes `safe-area-inset`, controles de 44 px e inputs de 16 px para evitar zoom al enfocar en iOS. Tabla móvil resumida con equipo, PJ y puntos; las columnas adicionales aparecen al disponer de más ancho. Menú táctil, favoritos, detalles y gráficos conservan sus funciones en vertical y horizontal.

Validación táctil local con Chromium:

```sh
node scripts/check_willy_iphone.cjs
```

El workflow `validate-willy-iphone.yml` ejecuta la misma suite con WebKit, motor usado por Safari, en seis tamaños de pantalla (320, 375, 390, 393, 430 y 844 px). Esto es emulación de navegador; no sustituye una prueba física del teléfono.
