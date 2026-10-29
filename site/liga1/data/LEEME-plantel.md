# Datos de plantel (lesionados y tarjetas)

La pestaña "Plantel" de la página aparece sola cuando existe alguno de estos archivos en esta carpeta:

- `injuries.json`: lesionados, en duda y sancionados.
- `cards.json`: tarjetas amarillas y rojas por jugador.

Copia `injuries.example.json` o `cards.example.json`, cámbiale el nombre quitando `.example`, y reemplaza el contenido.

## injuries.json

| Campo | Qué es |
| --- | --- |
| `team` | Código del equipo: UNI, ALI, CRI, MEL, CIE, GAR, CHA, SBO, GRA, ADT, AAT, JPI, CUS, COM, UTC, HUA, MOQ, CAJ |
| `player` | Nombre del jugador |
| `injury` | Tipo de lesión o motivo |
| `status` | `lesionado`, `duda` o `sancionado` |
| `since` | Fecha desde la que está fuera (AAAA-MM-DD), opcional |
| `return` | Regreso estimado (AAAA-MM-DD o texto como "3 semanas"), opcional |
| `note` | Detalle opcional |

## cards.json

Cada elemento lleva `team`, `player`, `yellow` (amarillas) y `red` (rojas). Se ordena por rojas y luego por amarillas.

En ambos archivos, `updated_at` y `source` se muestran al pie de la lista. Las lesiones cambian con frecuencia: actualiza el archivo cuando cambie el parte médico.
