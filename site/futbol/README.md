# Cancha

Producto independiente en `site/futbol/`, sin imports, navegación, estilos ni cambios en Liga 1. HTML, CSS y JavaScript sin compilación. Fuentes tipográficas externas opcionales con alternativas locales. Los emblemas son monogramas decorativos, no escudos oficiales.

Desde la raíz del repositorio:

```sh
python3 -m http.server 8000 --directory site/futbol --bind 127.0.0.1
```

Las 13 competiciones tienen una demostración explícitamente ficticia: clubes ilustrativos, resultados reproducibles y partidos ilustrativos futuros. No es una lista oficial de participantes de una temporada. La simulación respeta PJ = G + E + P, DG = GF − GC y puntos = 3G + E. No se modelan calendarios oficiales, cupos extra ni desempates específicos. Las zonas son orientativas; no se infiere descenso desde fases de Perú, Argentina, Colombia o Ecuador.

## Datos publicados

```sh
python3 scripts/update_cancha.py
# Una competición, sin escribir en el sitio:
python3 scripts/update_cancha.py --league eng --output /tmp/cancha-snapshot.json
```

Requiere HTTPS hacia `site.web.api.espn.com` (posiciones) y `site.api.espn.com` (próximos 14 días). Sin claves de API. ESPN es un proveedor externo sin garantía de disponibilidad ni estabilidad de esquema. Se conservan grupos separados y la última instantánea válida por competición ante errores. Si cualquier consulta falla, el comando sale con código 1; no publica datos ficticios como reales. El archivo inicial está vacío porque el acceso al proveedor está bloqueado en el entorno de desarrollo.

Después de descargar datos y desplegar el directorio, selecciona «Fuente publicada». El proveedor determina el orden y los puntos, incluidas deducciones. No se infieren zonas oficiales desde los datos de ESPN; las zonas orientativas corresponden solo al modo demostración. Resultados de forma reciente no disponibles aparecen como —. Los horarios se muestran en Lima. No es tiempo real: volver a ejecutar el actualizador refresca la instantánea, y la interfaz muestra cuándo se consultó. No se han modificado los workflows existentes ni se ha desplegado el proyecto.

El archivo histórico tiene cortes explícitos: Libertadores y Champions al 1 de junio de 2024; títulos nacionales al 31 de diciembre de 2024. Los enlaces de origen están en la interfaz. No se presenta como palmarés actual ni como clasificación de todos los trofeos continentales.

Favoritos locales sin cuenta. Búsqueda, filtros, detalles de equipo, fases, calendario y vistas accesibles con teclado. Para validar en un entorno con Playwright y Chromium del sistema:

```sh
node --require /workspace/.onboarding-garrita/chromium.cjs scripts/check_cancha.cjs
python3 -m unittest discover -s scripts -p test_cancha_provider.py -v
```
