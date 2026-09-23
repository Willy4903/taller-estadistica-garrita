import ProductCard from "./ProductCard";

const GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4";

export function ProductGridSkeleton() {
  return (
    <div className={GRID} aria-busy="true" aria-label="Cargando productos">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="aspect-square bg-gray-200" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-6 w-1/3 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductGrid({ productos, onAgregar, onVer, onLimpiar }) {
  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 px-4 py-20 text-center">
        <p className="text-lg font-semibold text-navy">No se encontraron productos</p>
        <p className="mt-1 text-sm text-gray-500">Prueba con otros términos o quita algunos filtros.</p>
        <button
          type="button"
          onClick={onLimpiar}
          className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-gold hover:bg-navy-light"
        >
          Limpiar filtros
        </button>
      </div>
    );
  }

  return (
    <div className={GRID}>
      {productos.map((producto) => (
        <ProductCard key={producto.id} producto={producto} onAgregar={onAgregar} onVer={onVer} />
      ))}
    </div>
  );
}
