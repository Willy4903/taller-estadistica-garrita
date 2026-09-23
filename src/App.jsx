import { useMemo, useState } from "react";
import data from "./data/productos.json";
import FiltersPanel from "./components/FiltersPanel";
import ProductGrid from "./components/ProductGrid";
import CartDrawer from "./components/CartDrawer";
import { useLocalStorage } from "./hooks/useLocalStorage";

const FILTROS_INICIALES = { genero: "", talla: "", categoria: "", color: "" };

export default function App() {
  const productos = data.productos;

  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [orden, setOrden] = useState("relevancia");
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [carrito, setCarrito] = useLocalStorage("catalogo-carrito", []);

  const colores = useMemo(
    () => [...new Set(productos.map((p) => p.color))].sort(),
    [productos]
  );

  const hayFiltrosActivos =
    Boolean(busqueda) ||
    Object.values(filtros).some((valor) => valor !== "");

  const productosFiltrados = useMemo(() => {
    let resultado = productos.filter((p) => {
      const coincideBusqueda = p.nombre
        .toLowerCase()
        .includes(busqueda.trim().toLowerCase());
      const coincideGenero = !filtros.genero || p.genero === filtros.genero;
      const coincideTalla = !filtros.talla || p.talla === filtros.talla;
      const coincideCategoria =
        !filtros.categoria || p.categoria === filtros.categoria;
      const coincideColor = !filtros.color || p.color === filtros.color;

      return (
        coincideBusqueda &&
        coincideGenero &&
        coincideTalla &&
        coincideCategoria &&
        coincideColor
      );
    });

    if (orden === "precio-asc") {
      resultado = [...resultado].sort((a, b) => a.precio - b.precio);
    } else if (orden === "precio-desc") {
      resultado = [...resultado].sort((a, b) => b.precio - a.precio);
    } else if (orden === "nombre-asc") {
      resultado = [...resultado].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return resultado;
  }, [productos, busqueda, filtros, orden]);

  const limpiarFiltros = () => {
    setFiltros(FILTROS_INICIALES);
    setBusqueda("");
  };

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    setCarritoAbierto(true);
  };

  const quitarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const cambiarCantidad = (id, cantidad) => {
    if (cantidad < 1) {
      quitarDelCarrito(id);
      return;
    }
    setCarrito((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cantidad } : item))
    );
  };

  const vaciarCarrito = () => setCarrito([]);

  const totalItemsCarrito = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalCarrito = carrito.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-navy shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <h1 className="text-xl font-extrabold tracking-tight text-gold sm:text-2xl">
            Catálogo Ropa &amp; Calzado
          </h1>
          <button
            type="button"
            onClick={() => setCarritoAbierto(true)}
            className="relative flex items-center gap-2 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-navy hover:bg-gold-dark"
          >
            🛒 Carrito
            {totalItemsCarrito > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-navy text-xs font-bold text-gold">
                {totalItemsCarrito}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 sm:max-w-md"
          />

          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 sm:w-auto"
          >
            <option value="relevancia">Ordenar por: relevancia</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre-asc">Nombre: A-Z</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <FiltersPanel
            filtros={filtros}
            setFiltros={setFiltros}
            colores={colores}
            onClear={limpiarFiltros}
            hayFiltrosActivos={hayFiltrosActivos}
          />

          <div>
            <p className="mb-4 text-sm font-medium text-gray-600">
              {productosFiltrados.length}{" "}
              {productosFiltrados.length === 1
                ? "producto encontrado"
                : "productos encontrados"}
            </p>
            <ProductGrid productos={productosFiltrados} onAgregar={agregarAlCarrito} />
          </div>
        </div>
      </main>

      <CartDrawer
        abierto={carritoAbierto}
        onCerrar={() => setCarritoAbierto(false)}
        items={carrito}
        onQuitar={quitarDelCarrito}
        onCambiarCantidad={cambiarCantidad}
        onVaciar={vaciarCarrito}
        total={totalCarrito}
      />
    </div>
  );
}
