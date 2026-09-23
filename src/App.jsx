import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import CartDrawer from "./components/CartDrawer";
import Drawer from "./components/Drawer";
import FiltersPanel from "./components/FiltersPanel";
import ProductGrid, { ProductGridSkeleton } from "./components/ProductGrid";
import ProductModal from "./components/ProductModal";
import Toast from "./components/Toast";
import { IconoBuscar, IconoCarrito, IconoCerrar, IconoFiltro, IconoSubir } from "./components/icons";
import { useCatalogo } from "./hooks/useCatalogo";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  CATEGORIAS,
  FILTROS_VACIOS,
  GENEROS,
  ORDENES,
  TALLAS,
  capitalizar,
  coloresDisponibles,
  contarFiltrosActivos,
  contarOpciones,
  escribirEstadoEnUrl,
  filtrarProductos,
  formatearPrecio,
  leerEstadoDeUrl,
  ordenarProductos,
} from "./lib/catalogo";

const estadoInicial = leerEstadoDeUrl(window.location.search);

export default function App() {
  const { productos, cargando, error, origen, recargar, importarArchivo } = useCatalogo(
    `${import.meta.env.BASE_URL}productos.json`
  );

  const [busqueda, setBusqueda] = useState(estadoInicial.busqueda);
  const [filtros, setFiltros] = useState(estadoInicial.filtros);
  const [orden, setOrden] = useState(estadoInicial.orden);
  const [carrito, setCarrito] = useLocalStorage("catalogo-carrito", []);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [aviso, setAviso] = useState(null);
  const inputArchivo = useRef(null);

  const busquedaDiferida = useDeferredValue(busqueda);

  useEffect(() => {
    const query = escribirEstadoEnUrl({ busqueda, orden, filtros });
    try {
      window.history.replaceState(null, "", `${window.location.pathname}${query}`);
    } catch {
      // Algunos entornos embebidos no permiten modificar el historial
    }
  }, [busqueda, orden, filtros]);

  const grupos = useMemo(
    () => [
      { titulo: "Género", campo: "genero", opciones: GENEROS },
      { titulo: "Talla", campo: "talla", opciones: TALLAS, etiqueta: (t) => t },
      { titulo: "Categoría", campo: "categoria", opciones: CATEGORIAS },
      { titulo: "Color", campo: "color", opciones: coloresDisponibles(productos), muestras: true },
    ],
    [productos]
  );

  const conteos = useMemo(
    () =>
      Object.fromEntries(
        grupos.map(({ campo, opciones }) => [
          campo,
          contarOpciones(productos, filtros, busquedaDiferida, campo, opciones),
        ])
      ),
    [grupos, productos, filtros, busquedaDiferida]
  );

  const resultados = useMemo(
    () => ordenarProductos(filtrarProductos(productos, filtros, busquedaDiferida), orden),
    [productos, filtros, busquedaDiferida, orden]
  );

  const filtrosActivos = contarFiltrosActivos(filtros);
  const hayCriterios = filtrosActivos > 0 || busqueda.trim() !== "";

  const alternarFiltro = (campo, valor) =>
    setFiltros((prev) => ({
      ...prev,
      [campo]: prev[campo].includes(valor) ? prev[campo].filter((v) => v !== valor) : [...prev[campo], valor],
    }));

  const limpiarTodo = () => {
    setFiltros(FILTROS_VACIOS);
    setBusqueda("");
  };

  const avisar = (texto, extra = {}) => setAviso({ id: Date.now(), texto, ...extra });
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const cerrarCarrito = useCallback(() => setCarritoAbierto(false), []);
  const cerrarFiltros = useCallback(() => setFiltrosAbiertos(false), []);
  const cerrarDetalle = useCallback(() => setDetalle(null), []);

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) =>
      prev.some((item) => item.id === producto.id)
        ? prev.map((item) => (item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item))
        : [...prev, { ...producto, cantidad: 1 }]
    );
    avisar(`${producto.nombre} se agregó al carrito`, {
      accion: {
        texto: "Ver carrito",
        onClick: () => {
          setAviso(null);
          setCarritoAbierto(true);
        },
      },
    });
  };

  const quitarDelCarrito = (id) => setCarrito((prev) => prev.filter((item) => item.id !== id));

  const cambiarCantidad = (id, cantidad) => {
    if (cantidad < 1) return quitarDelCarrito(id);
    setCarrito((prev) => prev.map((item) => (item.id === id ? { ...item, cantidad } : item)));
  };

  const alImportar = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      const total = await importarArchivo(archivo);
      limpiarTodo();
      avisar(`Se cargaron ${total} productos desde ${archivo.name}`);
    } catch (err) {
      avisar(err.message, { tipo: "error" });
    }
  };

  const cantidadCarrito = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const totalCarrito = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);

  const chips = Object.entries(filtros).flatMap(([campo, valores]) =>
    valores.map((valor) => ({ campo, valor, texto: campo === "talla" ? `Talla ${valor}` : capitalizar(valor) }))
  );

  const panelFiltros = (conTitulo) => (
    <FiltersPanel
      conTitulo={conTitulo}
      grupos={grupos}
      filtros={filtros}
      conteos={conteos}
      onToggle={alternarFiltro}
      onLimpiar={limpiarTodo}
      filtrosActivos={filtrosActivos}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-navy shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-gold sm:text-2xl">Ropa &amp; Calzado</h1>
            <p className="hidden text-xs text-white/60 sm:block">Catálogo dinámico</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputArchivo.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-gold/40 px-3 py-2 text-sm font-medium text-gold hover:bg-white/10"
              title="Cargar un archivo JSON con tus productos"
            >
              <IconoSubir className="h-4 w-4" />
              <span className="hidden sm:inline">Cargar JSON</span>
            </button>
            <input ref={inputArchivo} type="file" accept="application/json,.json" className="hidden" onChange={alImportar} />
            <button
              type="button"
              onClick={() => setCarritoAbierto(true)}
              className="relative flex items-center gap-2 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-navy hover:bg-gold-dark"
              aria-label={`Abrir carrito, ${cantidadCarrito} artículos`}
            >
              <IconoCarrito className="h-5 w-5" />
              <span className="hidden sm:inline">{formatearPrecio(totalCarrito)}</span>
              {cantidadCarrito > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-navy ring-2 ring-navy">
                  {cantidadCarrito}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1 sm:max-w-md">
            <span className="sr-only">Buscar producto por nombre</span>
            <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-navy"
                aria-label="Borrar búsqueda"
              >
                <IconoCerrar className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="flex gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={() => setFiltrosAbiertos(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-navy lg:hidden"
            >
              <IconoFiltro className="h-4 w-4" />
              Filtros
              {filtrosActivos > 0 && (
                <span className="rounded-full bg-navy px-1.5 text-xs text-gold">{filtrosActivos}</span>
              )}
            </button>
            <label className="flex-1 sm:flex-none">
              <span className="sr-only">Ordenar productos</span>
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                {Object.entries(ORDENES).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              {panelFiltros(true)}
            </div>
          </aside>

          <section aria-label="Resultados">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <p className="mr-2 text-sm font-medium text-gray-600" aria-live="polite">
                {cargando
                  ? "Cargando productos..."
                  : `${resultados.length} ${resultados.length === 1 ? "producto encontrado" : "productos encontrados"}`}
                {!cargando && origen && <span className="text-gray-400"> · {origen}</span>}
              </p>
              {chips.map(({ campo, valor, texto }) => (
                <button
                  key={`${campo}-${valor}`}
                  type="button"
                  onClick={() => alternarFiltro(campo, valor)}
                  className="flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-xs font-medium text-gold hover:bg-navy-light"
                  aria-label={`Quitar filtro ${texto}`}
                >
                  {texto}
                  <IconoCerrar className="h-3 w-3" />
                </button>
              ))}
              {hayCriterios && (
                <button
                  type="button"
                  onClick={limpiarTodo}
                  className="text-xs font-medium text-navy/70 underline decoration-gold decoration-2 underline-offset-4 hover:text-navy"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="font-semibold text-red-800">{error}</p>
                <button
                  type="button"
                  onClick={recargar}
                  className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-gold hover:bg-navy-light"
                >
                  Reintentar
                </button>
              </div>
            ) : cargando ? (
              <ProductGridSkeleton />
            ) : (
              <ProductGrid productos={resultados} onAgregar={agregarAlCarrito} onVer={setDetalle} onLimpiar={limpiarTodo} />
            )}
          </section>
        </div>
      </main>

      <Drawer
        abierto={filtrosAbiertos}
        onCerrar={cerrarFiltros}
        titulo="Filtros"
        lado="izquierda"
        pie={
          <button
            type="button"
            onClick={cerrarFiltros}
            className="w-full rounded-lg bg-navy py-3 text-sm font-semibold text-gold hover:bg-navy-light"
          >
            Ver {resultados.length} {resultados.length === 1 ? "producto" : "productos"}
          </button>
        }
      >
        {panelFiltros(false)}
      </Drawer>

      <CartDrawer
        abierto={carritoAbierto}
        onCerrar={cerrarCarrito}
        items={carrito}
        onQuitar={quitarDelCarrito}
        onCambiarCantidad={cambiarCantidad}
        onVaciar={() => setCarrito([])}
        total={totalCarrito}
        cantidadTotal={cantidadCarrito}
      />

      <ProductModal producto={detalle} onCerrar={cerrarDetalle} onAgregar={agregarAlCarrito} />

      <Toast aviso={aviso} onCerrar={cerrarAviso} />
    </div>
  );
}
