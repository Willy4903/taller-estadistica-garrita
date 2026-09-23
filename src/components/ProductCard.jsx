export default function ProductCard({ producto, onAgregar }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={producto.imagen}
          alt={producto.nombre}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src =
              "https://placehold.co/400x400/001F3F/FFD700?text=Sin+imagen";
          }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-navy">{producto.nombre}</h3>

        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-navy/5 px-2 py-1 font-medium text-navy">
            Talla {producto.talla}
          </span>
          <span className="rounded-full bg-navy/5 px-2 py-1 capitalize font-medium text-navy">
            {producto.color}
          </span>
          <span className="rounded-full bg-navy/5 px-2 py-1 capitalize font-medium text-navy">
            {producto.genero}
          </span>
        </div>

        <p className="line-clamp-2 text-sm text-gray-500">{producto.descripcion}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-navy">
            S/ {producto.precio.toFixed(2)}
          </span>
          <button
            type="button"
            onClick={() => onAgregar(producto)}
            className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-navy-light"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
