# taller-estadistica-garrita
Taller de Estadística Aplicada para la Recolección e Interpretación de Datos - INEI

## Catálogo de ecommerce (ropa/calzado)

Catálogo dinámico construido con React + Vite + Tailwind CSS.

### Funciones

- Filtros de selección múltiple por género, talla, categoría y color, con el número de resultados de cada opción.
- Búsqueda por nombre que ignora tildes y mayúsculas ("nino" encuentra "Niño").
- Chips de filtros activos, contador de resultados y "Limpiar filtros".
- Ordenamiento por precio (ascendente/descendente) y nombre A-Z.
- Filtros, búsqueda y orden guardados en la URL, para compartir una vista filtrada.
- Detalle del producto en ventana modal (incluye material).
- Carrito persistente en localStorage con cantidades y total.
- Carga de un JSON propio desde el botón "Cargar JSON", con validación y mensajes de error.
- Diseño mobile-first: en celular los filtros se abren en un panel lateral.
- Si una imagen no carga, se muestra una ilustración de la categoría.

### Formato del JSON

```json
{
  "productos": [
    {
      "id": 1,
      "nombre": "Polo Lacoste Classic",
      "categoria": "camisetas",
      "genero": "hombre",
      "talla": "M",
      "color": "blanco",
      "material": "algodón",
      "precio": 89.99,
      "imagen": "url_o_ruta_imagen",
      "descripcion": "Polo clásico de algodón puro"
    }
  ]
}
```

Campos obligatorios: `nombre`, `categoria`, `genero`, `color` y `precio`. `talla` acepta un texto (`"M"`) o una lista (`["S", "M"]`). El catálogo de ejemplo está en `public/productos.json`.

### Uso

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # pruebas unitarias
npm run build    # build de producción
```
