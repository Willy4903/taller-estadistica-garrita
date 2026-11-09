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
El workflow `willy-stats-data.yml` descarga la temporada **2024** porque la
clave gratuita ha respondido expresamente que solo permite temporadas
**2022–2024**, aunque el panel comercial liste todas las ligas. El archivo
2024 se presenta como histórico; **no es una clasificación 2026**.
La captura se ejecuta al fusionar cambios en su workflow o script, o
manualmente con `workflow_dispatch`. No se consultan diariamente los mismos
datos históricos para evitar consumir innecesariamente la cuota.
La ejecución diaria de `daily-update.yml` compila el frontend y publica los
archivos bajo `site/futbol/` después de fusionar los cambios.

El colector puede determinar la temporada desde la metadata del proveedor
cuando el plan lo permite; en el flujo Free fija explícitamente 2024 y exige
coincidencia exacta de país/nombre de liga. Si no hay correspondencia inequívoca,
no inventa una. Valida marcadores, puntos y participaciones; conserva la última
captura real con su fecha original cuando falla. El frontend identifica las capturas históricas por su año y advierte cuando
una captura no histórica tiene más de 36 horas. **No es una aplicación de
marcadores minuto a minuto.**

El script ESPN preexistente permanece como referencia histórica, pero usa
endpoints no oficiales; no forma parte del workflow nuevo. Si se desea publicar
datos derivados de ESPN, verificar antes autorización de reutilización.
API-Football también señala que sus clientes deben revisar derechos de datos
y marcas según competición: tener clave gratuita no concede automáticamente
licencia para todos los contenidos. Los escudos existentes tienen sus propias
condiciones de uso.

Pruebas offline: `python -m unittest discover -s scripts -p test_willy_stats.py -v`.

## Funciones

Rediseño oscuro (estadio nocturno). 16 competiciones con filtro por continente; tabla con búsqueda, favoritos persistentes y detalle de club con radar; pestañas Tabla, Rendimiento, Vista integrada y Partidos; comparador de tres ligas; índice de competitividad calculado; metodología. Código en `apps/willy-stats/src/` (`components/` por sección, `lib.js` para el cálculo desde los datos publicados).

## Integridad y límites

- Por defecto se muestran los datos publicados con temporada, proveedor y fecha de captura. Una captura de otro año se rotula como archivo; una de más de 36 horas, como posiblemente desactualizada.
- La demostración es ficticia, sale de un generador con semilla fija y solo se activa a petición del visitante.
- El radar usa cinco ejes calculables desde la tabla (ataque, defensa, efectividad, diferencia de gol y forma), normalizados contra la liga. No hay xG, posesión ni presión: la fuente no entrega tiros.
- Las ondas de dominio y la cronología xG de la barra lateral son ilustraciones sintéticas y se rotulan como tales. Las fotografías (Unsplash) son ilustrativas y no corresponden a los clubes.
- ICL = 10 × (1 − 0.4 × σ/μ), limitado a [0,10], sobre puntos por partido. Mide paridad en la tabla, no calidad entre ligas.
- PJ = G + E + P, PTS = 3G + E, DG = GF − GC.

## Fuente ESPN heredada (manual, no incluida en la actualización automática)

```sh
python3 scripts/update_cancha.py
python3 scripts/update_cancha.py --league eng --output /tmp/willy-snapshot.json
```

Requiere HTTPS a `site.web.api.espn.com` y `site.api.espn.com`; sin claves. Selecciona «Fuente publicada» para leer `data/snapshot.json`. No mezcla datos reales con demostración: si falta una instantánea, muestra un estado vacío. El actualizador conserva la última instantánea por competición si la consulta falla y devuelve código 1. Grupos publicados se seleccionan por separado; las vistas Local/Visitante están desactivadas cuando la fuente no trae desglose. No se asignan zonas oficiales por inferencia. No es tiempo real.

## Escudos e insignias

Los clubes usan imágenes reales locales indexadas por competición y nombre exacto, no monogramas ni coincidencia aproximada. `crests/manifest.json` conserva la procedencia y SHA-256; `crests/SOURCES.md` detalla las colecciones. Los PNG se optimizan a 128 píxeles conservando aspecto. Un escudo no identificado muestra un indicador neutral, sin atribuirle la imagen de otro club. Las 336 identidades de club del catálogo tienen un escudo asociado (los clubes repetidos en distintas competiciones comparten imagen). El actualizador de ESPN se conserva como respaldo para las cuatro identidades que necesitaron fuentes adicionales. Las cuatro copas tienen ilustraciones SVG propias basadas en la silueta de su trofeo; no son logotipos oficiales.

## iPhone y pantallas táctiles

Viewport con `viewport-fit=cover`, márgenes `safe-area-inset`, controles de 44 px e inputs de 16 px para evitar zoom al enfocar en iOS. Tabla móvil resumida con club, PJ, puntos y efectividad; botón «Todas las estadísticas» para acceder a las demás columnas con desplazamiento horizontal. Menú táctil, favoritos, detalles y gráficos conservan sus funciones en vertical y horizontal.

Validación táctil local con Chromium:

```sh
node --require /workspace/.onboarding-garrita/chromium.cjs scripts/check_willy_iphone.cjs
```

El workflow `validate-willy-iphone.yml` ejecuta la misma suite con WebKit, motor usado por Safari, en seis tamaños de pantalla (320, 375, 390, 393, 430 y 844 px). Esto es emulación de navegador; no sustituye una prueba física del teléfono.
