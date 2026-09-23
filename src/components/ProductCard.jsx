import { capitalizar, formatearPrecio } from "../lib/catalogo";
import ProductImage from "./ProductImage";

export default function ProductCard({ producto, onAgregar, onVer }) {
  const tallas = Array.isArray(producto.talla) ? producto.talla.join(" · ") : producto.talla;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg">
      <button
        type="button"
        onClick={() => onVer(producto)}
        className="relative aspect-square w-full overflow-hidden bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
        aria-label={`Ver detalle de ${producto.nombre}`}
      >
        <ProductImage
          producto={producto}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-full bg-navy/85 px-2 py-0.5 text-[11px] font-medium text-gold">
          {capitalizar(producto.categoria)}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="text-sm font-semibold leading-snug text-navy sm:text-base">{producto.nombre}</h3>

        <div className="flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
          <span className="rounded-full bg-navy/5 px-2 py-0.5 font-medium text-navy">Talla {tallas}</span>
          <span className="rounded-full bg-navy/5 px-2 py-0.5 font-medium text-navy">{capitalizar(producto.color)}</span>
          <span className="hidden rounded-full bg-navy/5 px-2 py-0.5 font-medium text-navy sm:inline">
            {capitalizar(producto.genero)}
          </span>
        </div>

        <p className="line-clamp-2 text-xs text-gray-500 sm:text-sm">{producto.descripcion}</p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <span className="text-base font-bold text-navy sm:text-lg">{formatearPrecio(producto.precio)}</span>
          <button
            type="button"
            onClick={() => onAgregar(producto)}
            className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:text-sm"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
