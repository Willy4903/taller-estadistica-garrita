import ProductCard from "./ProductCard";

export default function ProductGrid({ productos, onAgregar }) {
  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 py-20 text-center">
        <p className="text-lg font-semibold text-navy">
          No se encontraron productos
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Prueba ajustando o limpiando los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {productos.map((producto) => (
        <ProductCard key={producto.id} producto={producto} onAgregar={onAgregar} />
      ))}
    </div>
  );
}
