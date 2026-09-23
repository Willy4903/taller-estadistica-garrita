export const GENEROS = ["hombre", "mujer", "niño"];
export const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];
export const CATEGORIAS = ["camisetas", "pantalones", "zapatos", "accesorios", "otro"];

export const ORDENES = {
  relevancia: "Relevancia",
  "precio-asc": "Precio: menor a mayor",
  "precio-desc": "Precio: mayor a menor",
  "nombre-asc": "Nombre: A-Z",
};

export const FILTROS_VACIOS = { genero: [], talla: [], categoria: [], color: [] };

export const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const capitalizar = (texto) =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;

const tallasDe = (producto) =>
  Array.isArray(producto.talla) ? producto.talla : [producto.talla];

function cumple(producto, campo, seleccion) {
  if (seleccion.length === 0) return true;
  if (campo === "talla") return tallasDe(producto).some((t) => seleccion.includes(t));
  return seleccion.includes(producto[campo]);
}

function coincideBusqueda(producto, busqueda) {
  const termino = normalizar(busqueda);
  return !termino || normalizar(producto.nombre).includes(termino);
}

export function filtrarProductos(productos, filtros, busqueda = "") {
  return productos.filter(
    (p) =>
      coincideBusqueda(p, busqueda) &&
      Object.keys(FILTROS_VACIOS).every((campo) => cumple(p, campo, filtros[campo] ?? []))
  );
}

export function ordenarProductos(productos, orden) {
  const copia = [...productos];
  if (orden === "precio-asc") return copia.sort((a, b) => a.precio - b.precio);
  if (orden === "precio-desc") return copia.sort((a, b) => b.precio - a.precio);
  if (orden === "nombre-asc") return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return copia;
}

// Cuenta por opción aplicando los demás filtros, así el número indica cuántos resultados habría al marcarla.
export function contarOpciones(productos, filtros, busqueda, campo, opciones) {
  const base = filtrarProductos(productos, { ...filtros, [campo]: [] }, busqueda);
  return Object.fromEntries(
    opciones.map((opcion) => [opcion, base.filter((p) => cumple(p, campo, [opcion])).length])
  );
}

export function coloresDisponibles(productos) {
  return [...new Set(productos.map((p) => p.color).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

export function contarFiltrosActivos(filtros) {
  return Object.values(filtros).reduce((total, valores) => total + valores.length, 0);
}

const CAMPOS_TEXTO = ["nombre", "categoria", "genero", "color"];

export function validarCatalogo(json) {
  const lista = Array.isArray(json) ? json : json?.productos;
  if (!Array.isArray(lista)) {
    throw new Error('El JSON debe contener un arreglo "productos".');
  }
  const ids = new Set();
  return lista.map((p, i) => {
    const fila = `Producto #${i + 1}`;
    if (!p || typeof p !== "object") throw new Error(`${fila}: no es un objeto.`);
    for (const campo of CAMPOS_TEXTO) {
      if (typeof p[campo] !== "string" || !p[campo].trim()) {
        throw new Error(`${fila}: falta el campo "${campo}".`);
      }
    }
    const precio = Number(p.precio);
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error(`${fila}: "precio" debe ser un número válido.`);
    }
    const id = p.id ?? i + 1;
    if (ids.has(id)) throw new Error(`${fila}: el id ${id} está repetido.`);
    ids.add(id);
    return {
      ...p,
      id,
      precio,
      categoria: p.categoria.toLowerCase(),
      genero: p.genero.toLowerCase(),
      color: p.color.toLowerCase(),
      talla: Array.isArray(p.talla) ? p.talla.map(String) : String(p.talla ?? ""),
      descripcion: p.descripcion ?? "",
      material: p.material ?? "",
      imagen: p.imagen ?? "",
    };
  });
}

const formateador = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
export const formatearPrecio = (valor) => formateador.format(valor);

export function leerEstadoDeUrl(search) {
  const params = new URLSearchParams(search);
  const lista = (clave) => params.get(clave)?.split(",").filter(Boolean) ?? [];
  const orden = params.get("orden");
  return {
    busqueda: params.get("q") ?? "",
    orden: orden && Object.hasOwn(ORDENES, orden) ? orden : "relevancia",
    filtros: {
      genero: lista("genero"),
      talla: lista("talla"),
      categoria: lista("categoria"),
      color: lista("color"),
    },
  };
}

export function escribirEstadoEnUrl({ busqueda, orden, filtros }) {
  const params = new URLSearchParams();
  if (busqueda) params.set("q", busqueda);
  if (orden !== "relevancia") params.set("orden", orden);
  for (const [campo, valores] of Object.entries(filtros)) {
    if (valores.length) params.set(campo, valores.join(","));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
